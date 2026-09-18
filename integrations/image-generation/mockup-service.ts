import type { MockupSceneInput } from "../../lib/core/mockup-api.ts";
import type { PatternScale, ProductType } from "../../lib/core/types.ts";
import { FalRenderAdapter } from "./fal.ts";

export function buildWallpaperEditPrompt(productType: ProductType, patternScale: PatternScale | null) {
  const repeat = productType === "seamless"
    ? `Repeat and tile the wallpaper naturally across the wall at a ${patternScale ?? "medium"} realistic pattern scale.`
    : "Apply the wallpaper as one continuous mural composition without repeating or cropping away its essential artwork.";
  return `Use Image 1 as the base interior scene. Use Image 2 ONLY as the wallpaper design reference. Apply the exact wallpaper design from Image 2 to the visible wall surfaces of Image 1. Preserve the wallpaper's original colors, artwork, motifs, characters, shapes, proportions, and visual identity. Do not invent a new wallpaper design. Do not reinterpret the artwork. Do not replace characters or motifs. Do not turn the wallpaper into a painting or a newly invented mural. ${repeat} Maintain realistic wallpaper scale. The wallpaper must follow the wall perspective, room geometry, corners, edges, architectural boundaries, lighting, shadows, and depth. Furniture and foreground objects must remain in front of the wallpaper. The wallpaper must remain behind beds, cribs, sofas, shelves, lamps, desks, chairs, decorations, and every foreground object. Do not cover furniture with wallpaper. Do not create rectangular wallpaper panels floating over the scene. Do not place wallpaper outside actual wall surfaces. Preserve the original room architecture, furniture, camera, composition, and lighting. The final result must look like professional interior photography and a premium wallpaper product mockup, not an AI collage.`;
}

export class FalMockupService {
  private readonly adapter: FalRenderAdapter;
  constructor(adapter: FalRenderAdapter) { this.adapter = adapter; }

  async generateMockup(input: { scene: MockupSceneInput; wallpaperDataUrl: string; productType: ProductType; patternScale: PatternScale | null }, onStage?: (stage: "applying_wallpaper") => void) {
    const encoded = input.wallpaperDataUrl.match(/^data:image\/(?:png|jpeg|jpg|webp);base64,([A-Za-z0-9+/]+={0,2})$/i)?.[1];
    if (!encoded) throw new Error("SOURCE_IMAGE_INVALID");
    const padding = encoded.endsWith("==") ? 2 : encoded.endsWith("=") ? 1 : 0;
    if (Math.floor(encoded.length * 3 / 4) - padding > 20 * 1024 * 1024) throw new Error("SOURCE_IMAGE_SIZE_INVALID");
    const interior = await this.adapter.generateInteriorScene(input.scene);
    onStage?.("applying_wallpaper");
    const final = await this.adapter.applyWallpaperWithFal({
      scene: input.scene,
      sceneImageUrl: interior.imageUrl,
      wallpaperDataUrl: input.wallpaperDataUrl,
      prompt: buildWallpaperEditPrompt(input.productType, input.patternScale),
    });
    return { interiorProviderJobId: interior.providerJobId, ...final };
  }

  regenerateMockup(input: { scene: MockupSceneInput; wallpaperDataUrl: string; productType: ProductType; patternScale: PatternScale | null }) {
    return this.generateMockup(input);
  }
}
