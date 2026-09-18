import { fal } from "@fal-ai/client";
import type { MockupSceneInput } from "../../lib/core/mockup-api.ts";

export const DEFAULT_FAL_SMOKE_MODEL = "fal-ai/flux-2";

export type FalSceneResult = {
  imageUrl: string;
  providerJobId: string;
  width: number;
  height: number;
  contentType: string;
  fileName: string;
  fileSize: number;
};

type FalImage = { url?: unknown; width?: unknown; height?: unknown; content_type?: unknown; file_name?: unknown; file_size?: unknown };

export class FalRenderAdapter {
  readonly provider = "fal" as const;
  readonly label = "Fal AI real scene smoke test";
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor(apiKey: string, model = DEFAULT_FAL_SMOKE_MODEL, timeoutMs = 120_000) {
    if (!apiKey.trim()) throw new Error("FAL_MISSING_KEY");
    this.model = model;
    this.timeoutMs = timeoutMs;
    fal.config({ credentials: apiKey });
  }

  async renderScene(scene: MockupSceneInput): Promise<FalSceneResult> {
    if (!scene.prompt.trim()) throw new Error("FAL_INVALID_PROMPT");
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const generation = fal.subscribe(this.model, {
        input: { prompt: scene.prompt, image_size: "square_hd", num_images: 1, output_format: "jpeg", enable_safety_checker: true },
        logs: false,
      });
      const result = await Promise.race([
        generation,
        new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error("FAL_TIMEOUT")), this.timeoutMs); }),
      ]);
      const data = result.data as { images?: FalImage[] };
      const image = data.images?.[0];
      if (!image || typeof image.url !== "string" || !image.url.startsWith("http")) throw new Error("FAL_MALFORMED_RESPONSE");
      return {
        imageUrl: image.url,
        providerJobId: result.requestId,
        width: typeof image.width === "number" ? image.width : 1024,
        height: typeof image.height === "number" ? image.height : 1024,
        contentType: typeof image.content_type === "string" ? image.content_type : "image/jpeg",
        fileName: typeof image.file_name === "string" ? image.file_name : `${scene.sceneId}.jpg`,
        fileSize: typeof image.file_size === "number" ? image.file_size : 0,
      };
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("FAL_")) throw error;
      const message = error instanceof Error ? error.message.toLowerCase() : "";
      if (/401|403|unauthorized|forbidden|credential|api key/.test(message)) throw new Error("FAL_INVALID_CREDENTIALS");
      if (/402|credit|balance|quota|payment/.test(message)) throw new Error("FAL_INSUFFICIENT_CREDITS");
      if (/404|model|endpoint/.test(message)) throw new Error("FAL_INVALID_MODEL");
      if (/timeout|timed out|abort/.test(message)) throw new Error("FAL_TIMEOUT");
      throw new Error("FAL_REQUEST_FAILED");
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }
}
