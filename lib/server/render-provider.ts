import { MockRenderAdapter, RealRenderAdapter, type RenderAdapter } from "../../integrations/image-generation/index.ts";
import { DEFAULT_FAL_SMOKE_MODEL, FalRenderAdapter } from "../../integrations/image-generation/fal.ts";
import { DEFAULT_FAL_WALL_SEGMENTATION_MODEL, FalWallSegmentationAdapter } from "../../integrations/image-generation/wall-segmentation.ts";
import type { MockupProviderId } from "../core/mockup-api.ts";

export type ServerRenderConfig = {
  provider: MockupProviderId;
  demoMode: boolean;
  serviceUrl: string;
  serviceToken: string;
  falModel: string;
  falWallSegmentationModel: string;
  falSingleMockupTest: boolean;
  falConfigured: boolean;
  productionReady: boolean;
  missing: string[];
};

export function getServerRenderConfig(env: NodeJS.ProcessEnv = process.env): ServerRenderConfig {
  const requested = env.RENDER_PROVIDER?.toLowerCase();
  const provider: MockupProviderId = requested === "fal" ? "fal" : requested === "custom" || requested === "real" ? "custom" : "mock";
  const demoMode = env.DEMO_MODE !== "false";
  const serviceUrl = env.RENDER_SERVICE_URL?.trim() ?? "";
  const serviceToken = env.RENDER_SERVICE_TOKEN?.trim() ?? "";
  const falModel = env.FAL_MODEL?.trim() || DEFAULT_FAL_SMOKE_MODEL;
  const falWallSegmentationModel = env.FAL_WALL_SEGMENTATION_MODEL?.trim() || DEFAULT_FAL_WALL_SEGMENTATION_MODEL;
  const falSingleMockupTest = env.FAL_SINGLE_MOCKUP_TEST !== "false";
  const missing = provider === "mock" ? [] : provider === "fal" ? [!env.FAL_KEY?.trim() && "FAL_KEY"].filter(Boolean) as string[] : [!serviceUrl && "RENDER_SERVICE_URL", !serviceToken && "RENDER_SERVICE_TOKEN"].filter(Boolean) as string[];
  return { provider, demoMode: provider === "fal" ? false : demoMode, serviceUrl, serviceToken, falModel, falWallSegmentationModel, falSingleMockupTest, falConfigured: provider === "fal" && !missing.length, productionReady: provider === "fal" ? !missing.length : !demoMode && provider !== "mock" && !missing.length, missing };
}

export function createFalRenderAdapter(config = getServerRenderConfig(), env: NodeJS.ProcessEnv = process.env) {
  if (config.provider !== "fal") throw new Error("FAL_PROVIDER_NOT_SELECTED");
  if (!config.falConfigured) throw new Error("FAL_MISSING_KEY");
  return new FalRenderAdapter(env.FAL_KEY ?? "", config.falModel);
}

export function createFalWallSegmentationAdapter(config = getServerRenderConfig(), env: NodeJS.ProcessEnv = process.env) {
  if (config.provider !== "fal") throw new Error("FAL_PROVIDER_NOT_SELECTED");
  if (!config.falConfigured) throw new Error("FAL_MISSING_KEY");
  return new FalWallSegmentationAdapter(env.FAL_KEY ?? "", config.falWallSegmentationModel);
}

export function createServerRenderAdapter(config = getServerRenderConfig()): RenderAdapter {
  if (config.provider === "mock") return new MockRenderAdapter();
  if (!config.productionReady) throw new Error(`RENDER_PROVIDER_NOT_CONFIGURED:${config.missing.join(",")}`);
  if (config.provider === "fal") throw new Error("FAL_SMOKE_TEST_USES_SCENE_ADAPTER");
  return new RealRenderAdapter(config.serviceUrl, config.serviceToken);
}

export function publicRenderConfig(config = getServerRenderConfig()) {
  const mode = !config.demoMode && config.provider !== "mock" ? "production" as const : "demo" as const;
  return { mode, provider: config.provider, productionReady: config.productionReady, falConfiguration: config.provider === "fal" ? config.falConfigured ? "ready" as const : "missing" as const : "not-selected" as const, falSingleMockupTest: config.provider === "fal" && config.falSingleMockupTest, missingConfiguration: config.missing };
}
