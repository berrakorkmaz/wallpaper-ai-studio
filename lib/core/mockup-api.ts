import type { ArtworkPlacementMode, PatternScale, ProductType } from "./types.ts";
import type { MockupCategoryId, SceneBlueprint } from "./mockup-scenes.ts";

export type MockupProviderId = "mock" | "fal" | "custom";
export type MockupJobStage = "queued" | "generating_scene" | "detecting_wall" | "compositing_wallpaper" | "quality_check" | "completed" | "failed";

export type SourceWallpaperAsset = {
  assetId: string;
  storageKey: string;
  signedSourceUrl: string;
  fileHash: string;
  mimeType: string;
  width: number;
  height: number;
  sourceDataUrl?: string;
};

export type MockupSceneInput = {
  slotId: string;
  sceneId: string;
  category: MockupCategoryId;
  prompt: string;
  blueprint: SceneBlueprint;
};

export type CreateMockupBatchRequest = {
  projectId: string;
  userId: string;
  masterVersionId: string;
  source: SourceWallpaperAsset;
  productType: ProductType;
  patternScale: PatternScale | null;
  placement: { mode: ArtworkPlacementMode; focalPoint: { x: number; y: number } };
  scenes: MockupSceneInput[];
  output: { width: number; height: number; aspectRatio: string; format: "jpg"; quality: number };
  idempotencyKey: string;
};

export type MockupOutputRecord = {
  id: string;
  jobId: string;
  sceneId: string;
  slotId: string;
  category: MockupCategoryId;
  status: MockupJobStage;
  prompt: string;
  provider: MockupProviderId;
  providerJobId: string | null;
  outputUrl: string | null;
  thumbnailUrl: string | null;
  storageKey: string | null;
  width: number;
  height: number;
  createdAt: string;
  error: { code: string; message: string; retryable: boolean } | null;
};

export type MockupBatchStatus = {
  jobId: string;
  projectId: string;
  provider: MockupProviderId;
  status: MockupJobStage;
  createdAt: string;
  updatedAt: string;
  outputs: MockupOutputRecord[];
};

export type CreateMockupBatchResponse = MockupBatchStatus;
export type RetryMockupSlotsRequest = { slotIds: string[]; rejectedSlotIds?: string[]; idempotencyKey: string };

export type MockupApiError = {
  error: { code: string; message: string; retryable: boolean };
};

export const MOCKUP_JOB_STAGES: MockupJobStage[] = ["queued", "generating_scene", "detecting_wall", "compositing_wallpaper", "quality_check", "completed", "failed"];

export function isProductionSourceAsset(source: Partial<SourceWallpaperAsset> | null | undefined): source is SourceWallpaperAsset {
  return Boolean(source?.assetId && source.storageKey && source.signedSourceUrl && source.fileHash && source.mimeType && source.width && source.height);
}
