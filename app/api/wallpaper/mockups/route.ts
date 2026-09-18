import { NextResponse } from "next/server";
import type { CreateMockupBatchRequest, MockupApiError, MockupBatchStatus, MockupJobStage, MockupOutputRecord, MockupSceneInput } from "../../../../lib/core/mockup-api.ts";
import { getMockupJobService } from "../../../../lib/server/mockup-jobs.ts";
import { createFalMockupService, getServerRenderConfig, type ServerRenderConfig } from "../../../../lib/server/render-provider.ts";
import type { FalMockupService } from "../../../../integrations/image-generation/mockup-service.ts";

const errors: Record<string, { status: number; message: string; retryable: boolean }> = {
  SOURCE_ASSET_NOT_PERSISTED: { status: 422, message: "Source wallpaper must be stored privately before production rendering.", retryable: false },
  SIX_DISTINCT_SCENES_REQUIRED: { status: 400, message: "Exactly six distinct scene slots are required.", retryable: false },
  INVALID_SCENE_PLAN: { status: 400, message: "Every scene requires a prompt, seed, and one shared category.", retryable: false },
  FAL_MISSING_KEY: { status: 503, message: "Fal configuration is missing FAL_KEY.", retryable: false },
  FAL_INVALID_CREDENTIALS: { status: 401, message: "Fal credentials were rejected. Check the server-side FAL_KEY.", retryable: false },
  FAL_INSUFFICIENT_CREDITS: { status: 402, message: "Fal account has insufficient credits.", retryable: false },
  FAL_INVALID_MODEL: { status: 422, message: "The configured Fal model is invalid or unavailable.", retryable: false },
  FAL_TIMEOUT: { status: 504, message: "Fal generation timed out. Try again.", retryable: true },
  FAL_MALFORMED_RESPONSE: { status: 502, message: "Fal returned an invalid image response.", retryable: true },
  FAL_REQUEST_FAILED: { status: 502, message: "Fal generation failed. Try again or check the provider status.", retryable: true },
  SOURCE_IMAGE_REQUIRED: { status: 422, message: "The original uploaded wallpaper is required for Fal image editing.", retryable: false },
  SOURCE_IMAGE_INVALID: { status: 422, message: "The uploaded wallpaper source is invalid or unsupported.", retryable: false },
  SOURCE_IMAGE_SIZE_INVALID: { status: 413, message: "The uploaded wallpaper source exceeds the 20 MB image-editing limit.", retryable: false },
};

function errorDetail(error: unknown) {
  const code = error instanceof Error ? error.message : "FAL_REQUEST_FAILED";
  return { code, ...(errors[code] ?? { status: 502, message: "Fal generation failed. Try again or check the provider status.", retryable: true }) };
}

function validateFalInput(input: CreateMockupBatchRequest, config: ServerRenderConfig, streaming: boolean) {
  if (!input.source?.sourceDataUrl) throw new Error("SOURCE_IMAGE_REQUIRED");
  if (!Array.isArray(input.scenes) || !input.scenes.length || input.scenes.length > 6) throw new Error("INVALID_SCENE_PLAN");
  if (streaming && input.scenes.length !== 1) throw new Error("INVALID_SCENE_PLAN");
  if (input.scenes.some((scene) => !scene.prompt?.trim() || !Number.isInteger(scene.generationSeed) || scene.generationSeed <= 0 || scene.category !== input.scenes[0].category)) throw new Error("INVALID_SCENE_PLAN");
}

async function renderFalScene(input: CreateMockupBatchRequest, scene: MockupSceneInput, service: FalMockupService, jobId: string, createdAt: string, onStage?: (stage: MockupJobStage) => void): Promise<MockupOutputRecord> {
  onStage?.("generating_scene");
  try {
    const generated = await service.generateMockup({ scene, wallpaperDataUrl: input.source.sourceDataUrl!, productType: input.productType, patternScale: input.patternScale }, (stage) => onStage?.(stage));
    console.info("[render-api] final AI-edited mockup completed", { provider: "fal", sceneId: scene.sceneId, interiorProviderJobId: generated.interiorProviderJobId, providerJobId: generated.providerJobId });
    return { id: `fal-output-${generated.providerJobId}`, jobId, sceneId: scene.sceneId, slotId: scene.slotId, category: scene.category, status: "completed", prompt: scene.prompt, provider: "fal", providerJobId: generated.providerJobId, outputUrl: generated.imageUrl, thumbnailUrl: generated.imageUrl, storageKey: null, width: generated.width, height: generated.height, createdAt, error: null };
  } catch (error) {
    const detail = errorDetail(error);
    console.error("[render-api] mockup failed", { provider: "fal", sceneId: scene.sceneId, errorCode: detail.code });
    return { id: `fal-output-failed-${crypto.randomUUID()}`, jobId, sceneId: scene.sceneId, slotId: scene.slotId, category: scene.category, status: "failed", prompt: scene.prompt, provider: "fal", providerJobId: null, outputUrl: null, thumbnailUrl: null, storageKey: null, width: input.output.width, height: input.output.height, createdAt, error: { code: detail.code, message: detail.message, retryable: detail.retryable } };
  }
}

function falBatch(input: CreateMockupBatchRequest, jobId: string, createdAt: string, outputs: MockupOutputRecord[]): MockupBatchStatus {
  const status = outputs.some((output) => output.status === "completed") ? "completed" : "failed";
  return { jobId, projectId: input.projectId, provider: "fal", status, createdAt, updatedAt: new Date().toISOString(), outputs };
}

function streamFalMockup(input: CreateMockupBatchRequest, config: ServerRenderConfig) {
  const encoder = new TextEncoder();
  const createdAt = new Date().toISOString();
  const jobId = `fal-slot-${crypto.randomUUID()}`;
  const scene = input.scenes[0];
  const service = createFalMockupService(config);
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: unknown) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      void (async () => {
        try {
          send({ type: "stage", slotId: scene.slotId, stage: "queued" });
          const output = await renderFalScene(input, scene, service, jobId, createdAt, (stage) => send({ type: "stage", slotId: scene.slotId, stage }));
          if (output.status === "failed") send({ type: "stage", slotId: scene.slotId, stage: "failed", error: output.error });
          else send({ type: "stage", slotId: scene.slotId, stage: "completed" });
          send({ type: "result", batch: falBatch(input, jobId, createdAt, [output]) });
        } finally { controller.close(); }
      })();
    },
  });
  return new Response(body, { status: 200, headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store, no-transform" } });
}

export async function POST(request: Request) {
  const config = getServerRenderConfig();
  if (!config.productionReady) return NextResponse.json<MockupApiError>({ error: { code: "RENDER_PROVIDER_NOT_CONFIGURED", message: `Production rendering is unavailable. Missing: ${config.missing.join(", ") || "production provider"}.`, retryable: false } }, { status: 503 });
  try {
    const input = await request.json() as CreateMockupBatchRequest;
    if (config.provider === "fal") {
      const streaming = new URL(request.url).searchParams.get("stream") === "1";
      validateFalInput(input, config, streaming);
      console.info("[render-api] provider selected", { provider: config.provider, sceneModel: config.falModel, editModel: config.falEditModel, sceneIds: input.scenes.map((scene) => scene.sceneId) });
      if (streaming) return streamFalMockup(input, config);
      const createdAt = new Date().toISOString();
      const jobId = `fal-batch-${crypto.randomUUID()}`;
      const service = createFalMockupService(config);
      const outputs = await Promise.all(input.scenes.map((scene) => renderFalScene(input, scene, service, jobId, createdAt)));
      return NextResponse.json(falBatch(input, jobId, createdAt, outputs), { status: 201 });
    }
    const job = await getMockupJobService().create(input, config.provider);
    return NextResponse.json(job, { status: 202 });
  } catch (error) {
    const detail = errorDetail(error);
    return NextResponse.json<MockupApiError>({ error: { code: detail.code, message: detail.message, retryable: detail.retryable } }, { status: detail.status });
  }
}
