export type ProductType = "seamless" | "mural";
export type PatternScale = "small" | "medium" | "large";
export type MeasurementUnit = "cm" | "inch";
export type ArtworkSource = "generated_prompt" | "user_upload" | "imported" | "other";
export type ArtworkPlacementMode = "smart_fit" | "show_full" | "fill_wall" | "focal_point";
export type MasterStatus = "AWAITING_UPLOAD" | "UPLOADED" | "QA_RUNNING" | "QA_FAILED" | "QA_PASSED" | "APPROVED";
export type RenderProvider = "mock" | "real";
export type RenderJobStatus = "QUEUED" | "PREPARING" | "RENDERING" | "READY" | "FAILED" | "RETRYING" | "CANCELLED";
export type ExportJobStatus = "QUEUED" | "COLLECTING_FILES" | "CREATING_ARCHIVE" | "READY" | "FAILED" | "EXPIRED";
export type MockupRole = "Hero room" | "Alternate room" | "Close-up detail" | "Wide room view" | "Styled room view" | "Clean wall presentation";
export type GuideRole = "Clean Design" | "Repeat Map" | "Mural Map" | "Size Information" | "Order Guide";
export type SlotRole = MockupRole | GuideRole;
export type SlotKind = "mockup" | "guide";

export type User = { id: string; name: string; email: string; createdAt: string };

export type PromptSpec = {
  id: string; projectId: string; theme: string; style: string; palette: string; motifs: string; exclusions: string;
  density: "airy" | "balanced" | "dense"; aspectRatio: string; promptText: string;
  parameters: { stylize: number; chaos: number; seed: number }; selectedAt: string | null; createdAt: string;
};

export type QaCheck = { key: string; label: string; status: "pass" | "warn" | "fail"; detail: string };
export type MasterQa = {
  status: MasterStatus; score: number; checks: QaCheck[]; requiredWidth: number; requiredHeight: number;
  missingWidth: number; missingHeight: number; upscaleRequired: boolean; repeatPreviewUrl?: string; cropPreviewUrl?: string;
};

export type DesignAsset = {
  id: string; projectId: string; userId: string; role: "production_master" | "marketing_mockup" | "listing_image";
  fileUrl: string; fileName: string; width: number; height: number; fileHash: string; version: number; createdAt: string;
  previewUrl?: string;
  mimeType: string; fileSize: number; aspectRatio: number; colorProfile: string; hasTransparency: boolean;
  immutable: boolean; approvedAt: string | null;
};

export type OutputAsset = {
  id: string; projectId: string; userId: string; masterVersionId: string; slotId: string; role: SlotRole;
  fileUrl: string; fileName: string; width: number; height: number; format: "jpg" | "png"; fileSize: number;
  productionReady: boolean; renderProvider: RenderProvider; sceneTemplateId: string; approved: boolean; rejected: boolean; createdAt: string;
};

export type RenderSlot = {
  id: string; role: SlotRole; kind: SlotKind; status: "idle" | "queued" | "ready" | "failed" | "stale";
  version: number; activeJobId: string | null; outputAssetId: string | null; required: boolean;
};

export type RenderJob = {
  jobId: string; projectId: string; userId: string; masterVersionId: string; slotId: string; slotRole: SlotRole;
  sceneTemplateId: string; renderProvider: RenderProvider; status: RenderJobStatus; progress: number; correlationId: string;
  idempotencyKey: string; outputAssetId: string | null; errorCode: string | null; retryCount: number; createdAt: string; completedAt: string | null;
};

export type ExportJob = {
  id: string; projectId: string; userId: string; packageType: "production" | "mockups" | "listing-images" | "prompts" | "listing-content" | "complete";
  status: ExportJobStatus; idempotencyKey: string; storageKey: string | null; signedDownloadUrl: string | null;
  expiresAt: string | null; createdAt: string; completedAt: string | null; errorCode: string | null;
};

export type EtsyConnection = { id: string; userId: string; shopId: string; encryptedAccessToken: string; encryptedRefreshToken: string; expiresAt: string };

export type ListingDraft = {
  id: string; projectId: string; userId: string; shopId: string | null; title: string; description: string; tags: string[];
  price: string; quantity: number; productionPartner: string; variations: string; shippingProfileId: string;
  status: "editing" | "ready" | "exported" | "drafted"; etsyListingId?: string; idempotencyKey?: string;
  useProjectNameAsTitleSuggestion: boolean; createdAt: string;
};

export type ArtDirection = {
  collection: string; mood: string; patternScale: PatternScale | null; primaryTargetRoom: string; secondaryTargetRoom: string;
  colorPalette: string[];
  recommendation: { collection: string; mood: string; patternScale: PatternScale | null; colorPalette: string[]; suggestedRooms: string[]; reason: string }; userOverridden: boolean; savedAt: string | null;
};

export type ArtworkAnalysis = { dominantColors: string[]; averageLuminance: number; averageSaturation: number; analyzedAt: string; source: "browser" | "service"; edgeMetrics?: { horizontal: number; vertical: number; motifCutRisk: boolean } };

export type Project = {
  id: string; userId: string; projectName: string; projectSequenceNumber: number; isProjectNameManuallyEdited: boolean; projectNameGeneratedAt: string;
  productType: ProductType; artworkSource: ArtworkSource; primaryTargetRoom: string; secondaryTargetRoom: string; patternScale: PatternScale | null;
  artworkPlacementMode: ArtworkPlacementMode; focalPoint: { x: number; y: number };
  physicalWidth: number | null; physicalHeight: number | null; measurementUnit: MeasurementUnit | null; calculatedAspectRatio: string;
  targetPrintPpi: number; requiredPixelWidth: number; requiredPixelHeight: number; createdAt: string; updatedAt: string;
  prompt: PromptSpec; masterStatus: MasterStatus; masterVersions: DesignAsset[]; activeMasterVersionId: string | null;
  productionMaster: DesignAsset | null; qa: MasterQa; artworkAnalysis: ArtworkAnalysis | null; artDirection: ArtDirection; collection: string; mood: string;
  slots: RenderSlot[]; renderJobs: RenderJob[]; outputAssets: OutputAsset[]; exportJobs: ExportJob[]; listing: ListingDraft;
};

export type WorkflowState = { complete: boolean; skipped: boolean; label: string; detail: string };
