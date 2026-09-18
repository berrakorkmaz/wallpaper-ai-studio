import { fal } from "@fal-ai/client";
import type { MockupSceneInput } from "../../lib/core/mockup-api.ts";

export const DEFAULT_FAL_SCENE_MODEL = "fal-ai/flux-2";
export const DEFAULT_FAL_EDIT_MODEL = "fal-ai/flux-2-pro/edit";

export type FalImageResult = {
  imageUrl: string;
  providerJobId: string;
  width: number;
  height: number;
  contentType: string;
  fileName: string;
  fileSize: number;
};

type FalImage = { url?: unknown; width?: unknown; height?: unknown; content_type?: unknown; file_name?: unknown; file_size?: unknown };
export type FalClient = {
  config(input: { credentials: string }): void;
  subscribe(model: string, options: { input: Record<string, unknown>; logs: boolean }): Promise<{ data: unknown; requestId: string }>;
};

export class FalRenderAdapter {
  readonly provider = "fal" as const;
  readonly label = "Fal AI scene generation and multi-reference editing";
  private readonly sceneModel: string;
  private readonly editModel: string;
  private readonly timeoutMs: number;
  private readonly client: FalClient;

  constructor(apiKey: string, sceneModel = DEFAULT_FAL_SCENE_MODEL, editModel = DEFAULT_FAL_EDIT_MODEL, timeoutMs = 180_000, client: FalClient = fal as unknown as FalClient) {
    if (!apiKey.trim()) throw new Error("FAL_MISSING_KEY");
    this.sceneModel = sceneModel; this.editModel = editModel; this.timeoutMs = timeoutMs; this.client = client;
    this.client.config({ credentials: apiKey });
  }

  private async request(model: string, input: Record<string, unknown>, sceneId: string, operation: "scene" | "wallpaper-edit") {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      console.info("[fal-render] request started", { provider: this.provider, model, sceneId, operation });
      const result = await Promise.race([
        this.client.subscribe(model, { input, logs: false }),
        new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error("FAL_TIMEOUT")), this.timeoutMs); }),
      ]);
      const image = (result.data as { images?: FalImage[] }).images?.[0];
      if (!image || typeof image.url !== "string" || !/^https:\/\//i.test(image.url)) throw new Error("FAL_MALFORMED_RESPONSE");
      console.info("[fal-render] request completed", { provider: this.provider, model, sceneId, operation, providerJobId: result.requestId });
      return {
        imageUrl: image.url, providerJobId: result.requestId,
        width: typeof image.width === "number" ? image.width : 1024,
        height: typeof image.height === "number" ? image.height : 1024,
        contentType: typeof image.content_type === "string" ? image.content_type : "image/jpeg",
        fileName: typeof image.file_name === "string" ? image.file_name : `${sceneId}.jpg`,
        fileSize: typeof image.file_size === "number" ? image.file_size : 0,
      } satisfies FalImageResult;
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("FAL_")) throw error;
      const message = error instanceof Error ? error.message.toLowerCase() : "";
      const code = /401|403|unauthorized|forbidden|credential|api key/.test(message) ? "FAL_INVALID_CREDENTIALS"
        : /402|credit|balance|quota|payment/.test(message) ? "FAL_INSUFFICIENT_CREDITS"
        : /404|model|endpoint/.test(message) ? "FAL_INVALID_MODEL"
        : /timeout|timed out|abort/.test(message) ? "FAL_TIMEOUT" : "FAL_REQUEST_FAILED";
      console.error("[fal-render] request failed", { provider: this.provider, model, sceneId, operation, errorCode: code });
      throw new Error(code);
    } finally { if (timeout) clearTimeout(timeout); }
  }

  generateInteriorScene(scene: MockupSceneInput) {
    if (!scene.prompt.trim()) throw new Error("FAL_INVALID_PROMPT");
    return this.request(this.sceneModel, { prompt: scene.prompt, image_size: "square_hd", output_format: "jpeg", enable_safety_checker: true }, scene.sceneId, "scene");
  }

  applyWallpaperWithFal(input: { scene: MockupSceneInput; sceneImageUrl: string; wallpaperDataUrl: string; prompt: string }) {
    if (!/^https:\/\//i.test(input.sceneImageUrl) || !/^data:image\/(png|jpeg|jpg|webp);base64,/i.test(input.wallpaperDataUrl)) throw new Error("SOURCE_IMAGE_INVALID");
    return this.request(this.editModel, {
      prompt: input.prompt,
      image_urls: [input.sceneImageUrl, input.wallpaperDataUrl],
      image_size: "auto",
      safety_tolerance: "2",
      enable_safety_checker: true,
      output_format: "jpeg",
    }, input.scene.sceneId, "wallpaper-edit");
  }
}
