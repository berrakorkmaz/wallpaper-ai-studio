export const OUTPUT_PROFILES = {
  ETSY_MOCKUP_SQUARE: {
    id: "ETSY_MOCKUP_SQUARE",
    width: 3000,
    height: 3000,
    format: "jpg" as const,
    colorProfile: "sRGB",
    quality: 92,
    watermark: false,
    locale: "en-US",
  },
} as const;

export type OutputProfile = typeof OUTPUT_PROFILES[keyof typeof OUTPUT_PROFILES];
export const DEFAULT_OUTPUT_PROFILE = OUTPUT_PROFILES.ETSY_MOCKUP_SQUARE;
