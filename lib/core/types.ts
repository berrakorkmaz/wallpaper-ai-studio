export type ProductType = "seamless" | "mural";
export type PatternScale = "small" | "medium" | "large";
export type MeasurementUnit = "cm" | "inch";

export type User = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
};

export type PromptSpec = {
  id: string;
  projectId: string;
  theme: string;
  style: string;
  palette: string;
  motifs: string;
  exclusions: string;
  density: "airy" | "balanced" | "dense";
  aspectRatio: string;
  promptText: string;
  parameters: { stylize: number; chaos: number; seed: number };
  createdAt: string;
};

export type DesignAsset = {
  id: string;
  projectId: string;
  userId: string;
  role: "production_master" | "marketing_mockup" | "listing_image";
  fileUrl: string;
  fileName: string;
  width: number;
  height: number;
  fileHash: string;
  version: number;
  createdAt: string;
};

export type MockupSlot = {
  id: string;
  role: "Hero" | "Lifestyle" | "Alternate Angle" | "Secondary Setting" | "Close-up" | "Wide Shot";
  status: "idle" | "ready";
  version: number;
};

export type EtsyConnection = {
  id: string;
  userId: string;
  shopId: string;
  encryptedAccessToken: string;
  encryptedRefreshToken: string;
  expiresAt: string;
};

export type ListingDraft = {
  id: string;
  projectId: string;
  userId: string;
  shopId: string | null;
  title: string;
  description: string;
  tags: string[];
  price: string;
  status: "editing" | "ready" | "drafted";
  etsyListingId?: string;
  idempotencyKey?: string;
  useProjectNameAsTitleSuggestion: boolean;
  createdAt: string;
};

export type Project = {
  id: string;
  userId: string;
  projectName: string;
  projectSequenceNumber: number;
  isProjectNameManuallyEdited: boolean;
  projectNameGeneratedAt: string;
  productType: ProductType;
  primaryTargetRoom: string;
  secondaryTargetRoom: string;
  patternScale: PatternScale | null;
  physicalWidth: number | null;
  physicalHeight: number | null;
  measurementUnit: MeasurementUnit | null;
  calculatedAspectRatio: string;
  targetPrintPpi: number;
  requiredPixelWidth: number;
  requiredPixelHeight: number;
  status: "idea" | "prompt_ready" | "master_ready" | "mockups_ready" | "listing_ready";
  createdAt: string;
  updatedAt: string;
  prompt: PromptSpec;
  productionMaster: DesignAsset | null;
  qa: { status: "not_run" | "pass" | "warn"; score: number; notes: string[] };
  collection: string;
  mood: string;
  slots: MockupSlot[];
  listing: ListingDraft;
};
