import { MockRenderAdapter, RealRenderAdapter, type RenderAdapter } from "../../integrations/image-generation/index.ts";
import type { MockupProviderId } from "../core/mockup-api.ts";

export type ServerRenderConfig = {
  provider: MockupProviderId;
  demoMode: boolean;
  serviceUrl: string;
  serviceToken: string;
  falModel: string;
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
  const falModel = env.FAL_MODEL?.trim() ?? "";
  const missing = provider === "mock" ? [] : [!serviceUrl && "RENDER_SERVICE_URL", !serviceToken && "RENDER_SERVICE_TOKEN", provider === "fal" && !env.FAL_KEY?.trim() && "FAL_KEY", provider === "fal" && !falModel && "FAL_MODEL"].filter(Boolean) as string[];
  return { provider, demoMode, serviceUrl, serviceToken, falModel, falConfigured: provider === "fal" && !missing.length, productionReady: !demoMode && provider !== "mock" && !missing.length, missing };
}

export function createServerRenderAdapter(config = getServerRenderConfig()): RenderAdapter {
  if (config.provider === "mock") return new MockRenderAdapter();
  if (!config.productionReady) throw new Error(`RENDER_PROVIDER_NOT_CONFIGURED:${config.missing.join(",")}`);
  // Fal credentials stay behind the render-service boundary. The web app never imports a Fal SDK or exposes FAL_KEY.
  return new RealRenderAdapter(config.serviceUrl, config.serviceToken);
}

export function publicRenderConfig(config = getServerRenderConfig()) {
  const mode = !config.demoMode && config.provider !== "mock" ? "production" as const : "demo" as const;
  return { mode, provider: config.provider, productionReady: config.productionReady, missingConfiguration: config.missing };
}
