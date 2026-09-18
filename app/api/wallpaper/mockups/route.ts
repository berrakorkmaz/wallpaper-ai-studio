import { NextResponse } from "next/server";
import type { CreateMockupBatchRequest, MockupApiError } from "../../../../lib/core/mockup-api.ts";
import { getMockupJobService } from "../../../../lib/server/mockup-jobs.ts";
import { createFalMockupService, getServerRenderConfig } from "../../../../lib/server/render-provider.ts";

const errors: Record<string, { status: number; message: string; retryable: boolean }> = {
  SOURCE_ASSET_NOT_PERSISTED: { status: 422, message: "Source wallpaper must be stored privately before production rendering.", retryable: false },
  SIX_DISTINCT_SCENES_REQUIRED: { status: 400, message: "Exactly six distinct scene slots are required.", retryable: false },
  INVALID_SCENE_PLAN: { status: 400, message: "Every scene requires a prompt and one shared category.", retryable: false },
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
  SINGLE_MOCKUP_TEST_REQUIRED: { status: 400, message: "Fal test mode accepts exactly one mockup.", retryable: false },
};

export async function POST(request: Request) {
  const config = getServerRenderConfig();
  if (!config.productionReady) return NextResponse.json<MockupApiError>({ error: { code: "RENDER_PROVIDER_NOT_CONFIGURED", message: `Production rendering is unavailable. Missing: ${config.missing.join(", ") || "production provider"}.`, retryable: false } }, { status: 503 });
  try {
    const input = await request.json() as CreateMockupBatchRequest;
    if (config.provider === "fal") {
      if (!input.source.sourceDataUrl) throw new Error("SOURCE_IMAGE_REQUIRED");
      if (config.falSingleMockupTest && input.scenes.length !== 1) throw new Error("SINGLE_MOCKUP_TEST_REQUIRED");
      if ((!config.falSingleMockupTest && ![1, 6].includes(input.scenes.length)) || input.scenes.some((scene) => !scene.prompt.trim())) throw new Error("INVALID_SCENE_PLAN");
      console.info("[render-api] provider selected", { provider: config.provider, model: config.falModel, sceneIds: input.scenes.map((scene) => scene.sceneId) });
      const createdAt = new Date().toISOString();
      const jobId = `fal-batch-${crypto.randomUUID()}`;
      const mockupService = createFalMockupService(config);
      const outputs = await Promise.all(input.scenes.map(async (scene) => {
        const generated = await mockupService.generateMockup({ scene, wallpaperDataUrl: input.source.sourceDataUrl!, productType: input.productType, patternScale: input.patternScale });
        console.info("[render-api] final AI-edited mockup completed", { provider: config.provider, sceneId: scene.sceneId, interiorProviderJobId: generated.interiorProviderJobId, providerJobId: generated.providerJobId });
        return { id: `fal-output-${generated.providerJobId}`, jobId, sceneId: scene.sceneId, slotId: scene.slotId, category: scene.category, status: "completed", prompt: scene.prompt, provider: "fal", providerJobId: generated.providerJobId, outputUrl: generated.imageUrl, thumbnailUrl: generated.imageUrl, storageKey: null, width: generated.width, height: generated.height, createdAt, error: null };
      }));
      return NextResponse.json({ jobId, projectId: input.projectId, provider: "fal", status: "completed", createdAt, updatedAt: new Date().toISOString(), outputs }, { status: 201 });
    }
    const job = await getMockupJobService().create(input, config.provider);
    return NextResponse.json(job, { status: 202 });
  } catch (error) {
    const code = error instanceof Error ? error.message : "INVALID_REQUEST"; const detail = errors[code] ?? { status: 400, message: "The mockup request is invalid.", retryable: false };
    return NextResponse.json<MockupApiError>({ error: { code, message: detail.message, retryable: detail.retryable } }, { status: detail.status });
  }
}
