import { fal } from "@fal-ai/client";

export const DEFAULT_FAL_WALL_SEGMENTATION_MODEL = "fal-ai/evf-sam";

type FalSegmentationClient = {
  config(input: { credentials: string }): void;
  subscribe(model: string, options: { input: Record<string, unknown>; logs: boolean }): Promise<{ data: unknown; requestId: string }>;
};

export type WallSegmentationResult = { maskUrl: string; providerJobId: string };

export class FalWallSegmentationAdapter {
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly client: FalSegmentationClient;

  constructor(
    apiKey: string,
    model = DEFAULT_FAL_WALL_SEGMENTATION_MODEL,
    timeoutMs = 120_000,
    client: FalSegmentationClient = fal as unknown as FalSegmentationClient,
  ) {
    if (!apiKey.trim()) throw new Error("FAL_MISSING_KEY");
    this.model = model;
    this.timeoutMs = timeoutMs;
    this.client = client;
    this.client.config({ credentials: apiKey });
  }

  async detectWall(imageUrl: string, sceneId: string): Promise<WallSegmentationResult> {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      console.info("[wall-mask] request started", { model: this.model, sceneId });
      const request = this.client.subscribe(this.model, {
        input: {
          image_url: imageUrl,
          prompt: "the visible surface of the large blank plain feature wall intended for wallpaper",
          negative_prompt: "ceiling, floor, baseboard, crown molding, windows, doors, frames, artwork, furniture, bed, crib, shelves, lamps, plants, people, toys, fixtures, mirrors, decor and every foreground object",
          semantic_type: true,
          mask_only: true,
          use_grounding_dino: true,
          fill_holes: false,
          blur_mask: 1,
        },
        logs: false,
      });
      const result = await Promise.race([
        request,
        new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error("WALL_SEGMENTATION_TIMEOUT")), this.timeoutMs); }),
      ]);
      const image = (result.data as { image?: { url?: unknown } }).image;
      if (!image || typeof image.url !== "string" || !image.url.startsWith("http")) throw new Error("WALL_SEGMENTATION_INVALID_RESPONSE");
      console.info("[wall-mask] request completed", { model: this.model, sceneId, providerJobId: result.requestId });
      return { maskUrl: image.url, providerJobId: result.requestId };
    } catch (error) {
      const known = error instanceof Error && error.message.startsWith("WALL_") ? error.message : "WALL_SEGMENTATION_FAILED";
      console.error("[wall-mask] request failed", { model: this.model, sceneId, errorCode: known });
      throw new Error(known);
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }
}
