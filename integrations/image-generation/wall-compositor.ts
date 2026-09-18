import { decode, encode } from "fast-png";
import type { PatternScale, ProductType } from "../../lib/core/types.ts";

type Point = { x: number; y: number };
type WallPlane = { corners: [Point, Point, Point, Point]; mask: Uint8Array; strategy: "semantic-mask" };

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
  if (image.depth !== 8 || ![1, 2, 3, 4].includes(image.channels) || image.width * image.height > 25_000_000) throw new Error("SOURCE_IMAGE_INVALID");
  const output = new Uint8Array(image.width * image.height * 4);
  for (let pixel = 0; pixel < image.width * image.height; pixel++) {
    const source = pixel * image.channels; const target = pixel * 4;
    if (image.channels <= 2) output[target] = output[target + 1] = output[target + 2] = image.data[source];
    else { output[target] = image.data[source]; output[target + 1] = image.data[source + 1]; output[target + 2] = image.data[source + 2]; }
    output[target + 3] = image.channels === 2 || image.channels === 4 ? image.data[source + image.channels - 1] : 255;
  }
  return output;
}

function median(values: number[]) { const ordered = [...values].sort((a, b) => a - b); return ordered[Math.floor(ordered.length / 2)]; }

function wallPlane(maskBytes: Buffer, width: number, height: number): WallPlane {
  const decoded = decode(maskBytes); const pixels = rgba(decoded); const mask = new Uint8Array(width * height);
  const rows: { y: number; left: number; right: number }[] = []; let selected = 0;
  for (let y = 0; y < height; y++) {
    let left = width; let right = -1;
    for (let x = 0; x < width; x++) {
      const mx = Math.min(decoded.width - 1, Math.floor(x * decoded.width / width));
      const my = Math.min(decoded.height - 1, Math.floor(y * decoded.height / height));
      const offset = (my * decoded.width + mx) * 4;
      const value = Math.round(((pixels[offset] + pixels[offset + 1] + pixels[offset + 2]) / 3) * pixels[offset + 3] / 255);
      const alpha = value >= 128 ? value : 0; mask[y * width + x] = alpha;
      if (alpha) { selected++; left = Math.min(left, x); right = Math.max(right, x); }
    }
    if (right - left >= width * .08) rows.push({ y, left, right });
  }
  const coverage = selected / (width * height);
  if (coverage < .04 || coverage > .9 || rows.length < height * .08) throw new Error("WALL_MASK_UNUSABLE");
  const topY = rows[0].y; const bottomY = rows[rows.length - 1].y; const span = Math.max(1, bottomY - topY);
  const topRows = rows.filter((row) => row.y <= topY + span * .18);
  const bottomRows = rows.filter((row) => row.y >= topY + span * .68);
  if (!topRows.length || !bottomRows.length) throw new Error("WALL_MASK_UNUSABLE");
  const corners: [Point, Point, Point, Point] = [
    { x: median(topRows.map((row) => row.left)), y: topY },
    { x: median(topRows.map((row) => row.right)), y: topY },
    { x: median(bottomRows.map((row) => row.right)), y: bottomY },
    { x: median(bottomRows.map((row) => row.left)), y: bottomY },
  ];
  return { corners, mask, strategy: "semantic-mask" };
}

function patternRepeats(scale: PatternScale | null) { return scale === "small" ? 6 : scale === "large" ? 2 : 4; }

export type CompositeInput = { sceneImage: Buffer; wallMask: Buffer; sourceDataUrl: string; productType: ProductType; patternScale: PatternScale | null };
export type CompositeResult = { bytes: Buffer; width: number; height: number; wallStrategy: "semantic-mask" };

export class SourcePreservingWallpaperCompositor {
  async composite(input: CompositeInput): Promise<CompositeResult> {
    const sceneDecoded = decode(input.sceneImage); const wallpaperDecoded = decode(parseSourceDataUrl(input.sourceDataUrl));
    if (sceneDecoded.width * sceneDecoded.height > 4_500_000) throw new Error("SCENE_IMAGE_INVALID");
    const scenePixels = rgba(sceneDecoded); const wallpaperPixels = rgba(wallpaperDecoded);
    const { width, height } = sceneDecoded; const sourceWidth = wallpaperDecoded.width; const sourceHeight = wallpaperDecoded.height;
    const output = new Uint8Array(scenePixels); const plane = wallPlane(input.wallMask, width, height); const transform = inversePerspective(plane.corners);
    let luminanceTotal = 0; let luminanceCount = 0;
    for (let pixel = 0; pixel < plane.mask.length; pixel++) if (plane.mask[pixel]) { const offset = pixel * 4; luminanceTotal += scenePixels[offset] * .2126 + scenePixels[offset + 1] * .7152 + scenePixels[offset + 2] * .0722; luminanceCount++; }
    const meanLuminance = Math.max(1, luminanceTotal / Math.max(1, luminanceCount)); const repeats = patternRepeats(input.patternScale);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const maskAlpha = plane.mask[y * width + x] / 255; if (!maskAlpha) continue;
      const denominator = transform[6] * x + transform[7] * y + 1;
      const u = (transform[0] * x + transform[1] * y + transform[2]) / denominator;
      const v = (transform[3] * x + transform[4] * y + transform[5]) / denominator;
      if (u < 0 || u > 1 || v < 0 || v > 1) continue;
      const sourceU = input.productType === "seamless" ? (u * repeats) % 1 : u; const sourceV = input.productType === "seamless" ? (v * repeats) % 1 : v;
      const sx = Math.min(sourceWidth - 1, Math.floor(sourceU * sourceWidth)); const sy = Math.min(sourceHeight - 1, Math.floor(sourceV * sourceHeight));
      const sourceOffset = (sy * sourceWidth + sx) * 4; const outputOffset = (y * width + x) * 4; if (!wallpaperPixels[sourceOffset + 3]) continue;
      const wallLuminance = scenePixels[outputOffset] * .2126 + scenePixels[outputOffset + 1] * .7152 + scenePixels[outputOffset + 2] * .0722;
      const illumination = Math.max(.62, Math.min(1.28, wallLuminance / meanLuminance)); const alpha = maskAlpha * .97;
      for (let channel = 0; channel < 3; channel++) { const lit = Math.max(0, Math.min(255, wallpaperPixels[sourceOffset + channel] * illumination)); output[outputOffset + channel] = Math.round(lit * alpha + scenePixels[outputOffset + channel] * (1 - alpha)); }
      output[outputOffset + 3] = 255;
    }
    return { bytes: Buffer.from(encode({ width, height, data: output, channels: 4, depth: 8 }, { zlib: { level: 6 } })), width, height, wallStrategy: plane.strategy };
  }
}
