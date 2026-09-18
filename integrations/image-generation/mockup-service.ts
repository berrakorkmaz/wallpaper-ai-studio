import type { MockupSceneInput } from "../../lib/core/mockup-api.ts";
import type { PatternScale, ProductType, WallpaperScalePolicy } from "../../lib/core/types.ts";
import { FalRenderAdapter } from "./fal.ts";

export function buildWallpaperEditPrompt(productType: ProductType, patternScale: PatternScale | null, wallpaperScale: WallpaperScalePolicy) {
  const repeat = productType === "seamless"
    ? `Treat Image 2 as a manufactured repeating wallpaper material with one source tile measuring exactly ${wallpaperScale.repeatWidthCm} cm wide by ${wallpaperScale.repeatHeightCm} cm high in the physical room. Repeat that fixed-size source tile seamlessly across every visible wall. This ${patternScale ?? "medium"} project scale is LOCKED and identical in every mockup: never enlarge, shrink, crop, stretch, re-space, recompose, or vary the repeat density.`
    : "Apply the wallpaper as one continuous mural composition without repeating or cropping away its essential artwork.";
  return `Use Image 1 as the base interior scene. Use Image 2 ONLY as the wallpaper design reference and source artwork. Apply the exact, unmodified wallpaper artwork from Image 2 to the visible wall surfaces of Image 1. Preserve the source artwork geometry exactly: original colors, linework, motifs, characters, shapes, motif proportions, spacing, density, orientation, relative sizes, and visual identity must remain unchanged. Do not redraw, regenerate, reinterpret, simplify, embellish, replace, resize individual motifs, invent details, or use the artwork merely as inspiration. Do not treat it as a mural crop, painting, decal, or loose style reference. ${repeat} Only adapt the installed material to the wall's geometric perspective and existing light, shadow, tone, and occlusion. Perspective may change with the wall plane; the physical artwork scale and repeat density may not. The wallpaper must follow the wall perspective, room geometry, corners, edges, architectural boundaries, lighting, shadows, and depth. Furniture and foreground objects must remain in front of the wallpaper. The wallpaper must remain behind beds, cribs, sofas, shelves, lamps, desks, chairs, decorations, and every foreground object. Do not cover furniture with wallpaper. Do not create rectangular wallpaper panels floating over the scene. Do not place wallpaper outside actual wall surfaces. Preserve the original room architecture, furniture, camera, composition, and lighting. The final result must look like professional interior photography and a premium wallpaper product mockup, not an AI collage.`;
}

export class FalMockupService {
  private readonly adapter: FalRenderAdapter;
  constructor(adapter: FalRenderAdapter) { this.adapter = adapter; }

  async generateMockup(input: { scene: MockupSceneInput; wallpaperDataUrl: string; productType: ProductType; patternScale: PatternScale | null; wallpaperScale: WallpaperScalePolicy }, onStage?: (stage: "applying_wallpaper") => void) {
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
      prompt: buildWallpaperEditPrompt(input.productType, input.patternScale, input.wallpaperScale),
    });
    return { interiorProviderJobId: interior.providerJobId, ...final };
  }

  regenerateMockup(input: { scene: MockupSceneInput; wallpaperDataUrl: string; productType: ProductType; patternScale: PatternScale | null; wallpaperScale: WallpaperScalePolicy }) {
    return this.generateMockup(input);
  }
}
