import { DEFAULT_OUTPUT_PROFILE } from "./output-profiles.ts";
import { buildMockupPrompt, getCategoryDirection, sceneBlueprintFor } from "./mockup-scenes.ts";
import type { CreateMockupBatchRequest } from "./mockup-api.ts";
import type { Project } from "./types.ts";

export function buildMockupBatchRequest(project: Project, slotIds = project.slots.map((slot) => slot.id), sourceDataUrl?: string): CreateMockupBatchRequest {
  const master = project.productionMaster; if (!master) throw new Error("SOURCE_ASSET_REQUIRED");
  const slots = project.slots.filter((slot) => slotIds.includes(slot.id));
  const blueprints = slots.map((slot) => sceneBlueprintFor(project, slot));
  const category = getCategoryDirection(project.primaryTargetRoom).id;
  return {
    projectId: project.id, userId: project.userId, masterVersionId: master.id,
    source: { assetId: master.id, storageKey: master.storageKey ?? "", signedSourceUrl: master.signedSourceUrl ?? "", fileHash: master.fileHash, mimeType: master.mimeType, width: master.width, height: master.height, sourceDataUrl },
    productType: project.productType, patternScale: project.patternScale,
    placement: { mode: project.artworkPlacementMode, focalPoint: project.focalPoint },
    scenes: slots.map((slot, index) => ({ slotId: slot.id, sceneId: blueprints[index].id, category, blueprint: blueprints[index], prompt: buildMockupPrompt({ project, sceneBlueprint: blueprints[index], previousScenes: blueprints.slice(0, index) }) })),
    output: { width: DEFAULT_OUTPUT_PROFILE.width, height: DEFAULT_OUTPUT_PROFILE.height, aspectRatio: `${DEFAULT_OUTPUT_PROFILE.width}:${DEFAULT_OUTPUT_PROFILE.height}`, format: "jpg", quality: DEFAULT_OUTPUT_PROFILE.quality },
    idempotencyKey: `${project.id}:${master.id}:batch:${Math.max(...slots.map((slot) => slot.version), 0) + 1}`,
  };
}
