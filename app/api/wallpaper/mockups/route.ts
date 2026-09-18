import { NextResponse } from "next/server";
import type { CreateMockupBatchRequest, MockupApiError } from "../../../../lib/core/mockup-api.ts";
import { getMockupJobService } from "../../../../lib/server/mockup-jobs.ts";
import { createFalRenderAdapter, createFalWallSegmentationAdapter, getServerRenderConfig } from "../../../../lib/server/render-provider.ts";
import { SourcePreservingWallpaperCompositor } from "../../../../integrations/image-generation/wall-compositor.ts";

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
  SOURCE_IMAGE_REQUIRED: { status: 422, message: "The original uploaded wallpaper bytes are required for Fal compositing.", retryable: false },
  SOURCE_IMAGE_INVALID: { status: 422, message: "The uploaded wallpaper source is invalid or unsupported.", retryable: false },
  SOURCE_IMAGE_SIZE_INVALID: { status: 413, message: "The uploaded wallpaper source exceeds the 20 MB local compositing limit.", retryable: false },
  SCENE_IMAGE_DOWNLOAD_FAILED: { status: 502, message: "The generated Fal scene could not be downloaded for compositing.", retryable: true },
  SCENE_IMAGE_INVALID: { status: 502, message: "The generated Fal scene image is invalid or too large.", retryable: true },
  WALL_PERSPECTIVE_INVALID: { status: 422, message: "The temporary wall bounds could not be transformed safely.", retryable: true },
  WALL_SEGMENTATION_TIMEOUT: { status: 504, message: "Wall detection timed out. Try this scene again.", retryable: true },
  WALL_SEGMENTATION_INVALID_RESPONSE: { status: 502, message: "Wall detection returned an invalid response.", retryable: true },
  WALL_SEGMENTATION_FAILED: { status: 502, message: "The generated room wall could not be segmented.", retryable: true },
  WALL_MASK_DOWNLOAD_FAILED: { status: 502, message: "The detected wall mask could not be downloaded.", retryable: true },
  WALL_MASK_UNUSABLE: { status: 422, message: "No safe, usable wall surface was found. Regenerate this scene.", retryable: true },
  SINGLE_MOCKUP_TEST_REQUIRED: { status: 400, message: "Wall-mask test mode accepts exactly one scene.", retryable: false },
  WALL_COMPOSITING_FAILED: { status: 502, message: "The original wallpaper could not be composited onto the generated wall.", retryable: true },
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
      const falAdapter = createFalRenderAdapter(config); const wallSegmenter = createFalWallSegmentationAdapter(config); const compositor = new SourcePreservingWallpaperCompositor();
      const outputs = await Promise.all(input.scenes.map(async (scene) => {
        const generated = await falAdapter.renderScene(scene);
        const sceneResponse = await fetch(generated.imageUrl).catch(() => { throw new Error("SCENE_IMAGE_DOWNLOAD_FAILED"); });
        if (!sceneResponse.ok) throw new Error("SCENE_IMAGE_DOWNLOAD_FAILED");
        const segmented = await wallSegmenter.detectWall(generated.imageUrl, scene.sceneId);
        const maskResponse = await fetch(segmented.maskUrl).catch(() => { throw new Error("WALL_MASK_DOWNLOAD_FAILED"); });
        if (!maskResponse.ok) throw new Error("WALL_MASK_DOWNLOAD_FAILED");
        console.info("[render-api] applying original wallpaper", { provider: config.provider, sceneId: scene.sceneId, providerJobId: generated.providerJobId });
        let composited;
        try { composited = await compositor.composite({ sceneImage: Buffer.from(await sceneResponse.arrayBuffer()), wallMask: Buffer.from(await maskResponse.arrayBuffer()), sourceDataUrl: input.source.sourceDataUrl!, productType: input.productType, patternScale: input.patternScale }); }
        catch (error) { if (error instanceof Error && ["SOURCE_IMAGE_INVALID", "SOURCE_IMAGE_SIZE_INVALID", "SCENE_IMAGE_INVALID", "WALL_PERSPECTIVE_INVALID", "WALL_MASK_UNUSABLE"].includes(error.message)) throw error; throw new Error("WALL_COMPOSITING_FAILED"); }
        console.info("[render-api] quality check completed", { provider: config.provider, sceneId: scene.sceneId, wallStrategy: composited.wallStrategy });
        const outputUrl = `data:image/png;base64,${composited.bytes.toString("base64")}`;
        return { id: `fal-output-${generated.providerJobId}`, jobId, sceneId: scene.sceneId, slotId: scene.slotId, category: scene.category, status: "completed", prompt: scene.prompt, provider: "fal", providerJobId: generated.providerJobId, outputUrl, thumbnailUrl: outputUrl, storageKey: null, width: composited.width, height: composited.height, createdAt, error: null };
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
