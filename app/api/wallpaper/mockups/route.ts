import { NextResponse } from "next/server";
import type { CreateMockupBatchRequest, MockupApiError } from "../../../../lib/core/mockup-api.ts";
import { getMockupJobService } from "../../../../lib/server/mockup-jobs.ts";
import { getServerRenderConfig } from "../../../../lib/server/render-provider.ts";

const errors: Record<string, { status: number; message: string; retryable: boolean }> = {
  SOURCE_ASSET_NOT_PERSISTED: { status: 422, message: "Source wallpaper must be stored privately before production rendering.", retryable: false },
  SIX_DISTINCT_SCENES_REQUIRED: { status: 400, message: "Exactly six distinct scene slots are required.", retryable: false },
  INVALID_SCENE_PLAN: { status: 400, message: "Every scene requires a prompt and one shared category.", retryable: false },
};

export async function POST(request: Request) {
  const config = getServerRenderConfig();
  if (!config.productionReady) return NextResponse.json<MockupApiError>({ error: { code: "RENDER_PROVIDER_NOT_CONFIGURED", message: `Production rendering is unavailable. Missing: ${config.missing.join(", ") || "production provider"}.`, retryable: false } }, { status: 503 });
  try {
    const input = await request.json() as CreateMockupBatchRequest;
    const job = await getMockupJobService().create(input, config.provider);
    return NextResponse.json(job, { status: 202 });
  } catch (error) {
    const code = error instanceof Error ? error.message : "INVALID_REQUEST"; const detail = errors[code] ?? { status: 400, message: "The mockup request is invalid.", retryable: false };
    return NextResponse.json<MockupApiError>({ error: { code, message: detail.message, retryable: detail.retryable } }, { status: detail.status });
  }
}
