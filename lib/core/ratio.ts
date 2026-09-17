export function greatestCommonDivisor(a: number, b: number): number {
  let left = Math.abs(Math.round(a));
  let right = Math.abs(Math.round(b));
  while (right) [left, right] = [right, left % right];
  return left || 1;
}

export function calculateAspectRatio(width: number | null, height: number | null): string {
  if (!width || !height || width <= 0 || height <= 0) return "";
  const precision = 100;
  const scaledWidth = Math.round(width * precision);
  const scaledHeight = Math.round(height * precision);
  const divisor = greatestCommonDivisor(scaledWidth, scaledHeight);
  return `${scaledWidth / divisor}:${scaledHeight / divisor}`;
}

export function calculateRequiredPixels(value: number | null, unit: "cm" | "inch" | null, ppi: number): number {
  if (!value || !unit) return 0;
  return Math.ceil((unit === "cm" ? value / 2.54 : value) * ppi);
}
