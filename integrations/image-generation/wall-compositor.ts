import { decode, encode } from "fast-png";
import type { PatternScale, ProductType } from "../../lib/core/types.ts";
import type { MockupSceneInput } from "../../lib/core/mockup-api.ts";

type Point = { x: number; y: number };
export type WallRegion = { corners: [Point, Point, Point, Point]; strategy: "blueprint-bounds" | "automatic" };

export interface WallDetectionAdapter {
  detect(input: { scene: MockupSceneInput; width: number; height: number }): Promise<WallRegion>;
}

const roleBounds: Record<MockupSceneInput["blueprint"]["role"], [Point, Point, Point, Point]> = {
  hero: [{ x: .03, y: .03 }, { x: .97, y: .04 }, { x: .94, y: .67 }, { x: .05, y: .73 }],
  creative: [{ x: .16, y: .03 }, { x: .98, y: .04 }, { x: .94, y: .68 }, { x: .1, y: .62 }],
  closeup: [{ x: .02, y: .02 }, { x: .98, y: .02 }, { x: .97, y: .9 }, { x: .03, y: .9 }],
  wide: [{ x: .02, y: .03 }, { x: .98, y: .04 }, { x: .96, y: .65 }, { x: .04, y: .71 }],
  editorial: [{ x: .04, y: .03 }, { x: .97, y: .03 }, { x: .92, y: .7 }, { x: .08, y: .67 }],
  perspective: [{ x: .02, y: .03 }, { x: .76, y: .14 }, { x: .72, y: .76 }, { x: .03, y: .85 }],
};

export class BlueprintWallRegionAdapter implements WallDetectionAdapter {
  async detect({ scene, width, height }: { scene: MockupSceneInput; width: number; height: number }): Promise<WallRegion> {
    const corners = roleBounds[scene.blueprint.role].map((point) => ({ x: point.x * width, y: point.y * height })) as [Point, Point, Point, Point];
    return { corners, strategy: "blueprint-bounds" };
  }
}

function solve(matrix: number[][]) {
  const size = matrix.length;
  for (let column = 0; column < size; column++) {
    let pivot = column;
    for (let row = column + 1; row < size; row++) if (Math.abs(matrix[row][column]) > Math.abs(matrix[pivot][column])) pivot = row;
    [matrix[column], matrix[pivot]] = [matrix[pivot], matrix[column]];
    const divisor = matrix[column][column];
    if (Math.abs(divisor) < 1e-10) throw new Error("WALL_PERSPECTIVE_INVALID");
    for (let item = column; item <= size; item++) matrix[column][item] /= divisor;
    for (let row = 0; row < size; row++) if (row !== column) {
      const factor = matrix[row][column];
      for (let item = column; item <= size; item++) matrix[row][item] -= factor * matrix[column][item];
    }
  }
  return matrix.map((row) => row[size]);
}

function inversePerspective(corners: [Point, Point, Point, Point]) {
  const source: Point[] = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }];
  const equations: number[][] = [];
  corners.forEach((destination, index) => {
    const target = source[index]; const { x, y } = destination;
    equations.push([x, y, 1, 0, 0, 0, -target.x * x, -target.x * y, target.x]);
    equations.push([0, 0, 0, x, y, 1, -target.y * x, -target.y * y, target.y]);
  });
  return solve(equations);
}

function parseSourceDataUrl(value: string) {
  const match = /^data:image\/png;base64,([a-z0-9+/=]+)$/i.exec(value);
  if (!match) throw new Error("SOURCE_IMAGE_INVALID");
  const bytes = Buffer.from(match[1], "base64");
  if (!bytes.length || bytes.length > 20 * 1024 * 1024) throw new Error("SOURCE_IMAGE_SIZE_INVALID");
  return bytes;
}

function rgba(image: ReturnType<typeof decode>) {
  if (image.depth !== 8 || ![3, 4].includes(image.channels) || image.width * image.height > 25_000_000) throw new Error("SOURCE_IMAGE_INVALID");
  if (image.channels === 4) return new Uint8Array(image.data.buffer, image.data.byteOffset, image.data.byteLength);
  const output = new Uint8Array(image.width * image.height * 4);
  for (let source = 0, target = 0; source < image.data.length; source += 3, target += 4) { output[target] = image.data[source]; output[target + 1] = image.data[source + 1]; output[target + 2] = image.data[source + 2]; output[target + 3] = 255; }
  return output;
}

function patternRepeats(scale: PatternScale | null) { return scale === "small" ? 6 : scale === "large" ? 2 : 4; }

export type CompositeInput = {
  sceneImage: Buffer;
  sourceDataUrl: string;
  scene: MockupSceneInput;
  productType: ProductType;
  patternScale: PatternScale | null;
};

export type CompositeResult = { bytes: Buffer; width: number; height: number; wallStrategy: WallRegion["strategy"] };

export class SourcePreservingWallpaperCompositor {
  private readonly wallDetector: WallDetectionAdapter;
  constructor(wallDetector: WallDetectionAdapter = new BlueprintWallRegionAdapter()) { this.wallDetector = wallDetector; }

  async composite(input: CompositeInput): Promise<CompositeResult> {
    const sceneDecoded = decode(input.sceneImage); const wallpaperDecoded = decode(parseSourceDataUrl(input.sourceDataUrl));
    if (sceneDecoded.width * sceneDecoded.height > 4_500_000) throw new Error("SCENE_IMAGE_INVALID");
    const scenePixels = rgba(sceneDecoded); const wallpaperPixels = rgba(wallpaperDecoded);
    const { width, height } = sceneDecoded;
    const sourceWidth = wallpaperDecoded.width; const sourceHeight = wallpaperDecoded.height;
    const output = new Uint8Array(scenePixels);
    const region = await this.wallDetector.detect({ scene: input.scene, width, height });
    const transform = inversePerspective(region.corners);
    const minX = Math.max(0, Math.floor(Math.min(...region.corners.map((point) => point.x))));
    const maxX = Math.min(width - 1, Math.ceil(Math.max(...region.corners.map((point) => point.x))));
    const minY = Math.max(0, Math.floor(Math.min(...region.corners.map((point) => point.y))));
    const maxY = Math.min(height - 1, Math.ceil(Math.max(...region.corners.map((point) => point.y))));
    const repeats = patternRepeats(input.patternScale);
    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
      const denominator = transform[6] * x + transform[7] * y + 1;
      const u = (transform[0] * x + transform[1] * y + transform[2]) / denominator;
      const v = (transform[3] * x + transform[4] * y + transform[5]) / denominator;
      if (u < 0 || u > 1 || v < 0 || v > 1) continue;
      const sourceU = input.productType === "seamless" ? (u * repeats) % 1 : u;
      const sourceV = input.productType === "seamless" ? (v * repeats) % 1 : v;
      const sx = Math.min(sourceWidth - 1, Math.floor(sourceU * sourceWidth));
      const sy = Math.min(sourceHeight - 1, Math.floor(sourceV * sourceHeight));
      const sourceOffset = (sy * sourceWidth + sx) * 4; const outputOffset = (y * width + x) * 4;
      if (wallpaperPixels[sourceOffset + 3] === 0) continue;
      const luminance = (scenePixels[outputOffset] * .2126 + scenePixels[outputOffset + 1] * .7152 + scenePixels[outputOffset + 2] * .0722) / 255;
      const light = Math.max(.72, Math.min(1.16, .72 + luminance * .44));
      const alpha = .96;
      for (let channel = 0; channel < 3; channel++) {
        const illuminated = Math.max(0, Math.min(255, wallpaperPixels[sourceOffset + channel] * light));
        output[outputOffset + channel] = Math.round(illuminated * alpha + scenePixels[outputOffset + channel] * (1 - alpha));
      }
      output[outputOffset + 3] = 255;
    }
    const bytes = Buffer.from(encode({ width, height, data: output, channels: 4, depth: 8 }, { zlib: { level: 6 } }));
    return { bytes, width, height, wallStrategy: region.strategy };
  }
}
