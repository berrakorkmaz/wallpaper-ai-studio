import { calculateAspectRatio, calculateRequiredPixels } from "../core/ratio.ts";
import type { MeasurementUnit } from "../core/types.ts";

/**
 * Physical print-production sizing is intentionally outside the active
 * mockup workflow. It can be enabled later without returning wall dimensions
 * or Etsy variation fields to the Project screen.
 */
export const PRINT_PRODUCTION_ENABLED = false;

export function createPrintProductionProfile(input: {
  width: number;
  height: number;
  unit: MeasurementUnit;
  ppi: number;
}) {
  if (!PRINT_PRODUCTION_ENABLED) throw new Error("PRINT_PRODUCTION_DISABLED");
  return {
    ...input,
    aspectRatio: calculateAspectRatio(input.width, input.height),
    requiredPixelWidth: calculateRequiredPixels(input.width, input.unit, input.ppi),
    requiredPixelHeight: calculateRequiredPixels(input.height, input.unit, input.ppi),
  };
}
