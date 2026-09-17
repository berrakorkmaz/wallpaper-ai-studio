import type { OutputAsset, Project, RenderJob, RenderProvider, RenderSlot } from "./types.ts";
import { canRender } from "./project.ts";

const sceneSlug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export function sceneTemplateFor(project: Project, slot: RenderSlot) {
  const room = slot.role === "Alternate room" ? (project.artDirection.secondaryTargetRoom || "Editorial Room") : project.artDirection.primaryTargetRoom;
  return `${sceneSlug(project.artDirection.collection)}--${sceneSlug(project.artDirection.mood)}--${sceneSlug(room)}--${sceneSlug(slot.role)}`;
}

export function requestRenderJobs(project: Project, userId: string, slotIds: string[], provider: RenderProvider, correlationId = crypto.randomUUID()) {
  if (project.userId !== userId) throw new Error("RESOURCE_NOT_FOUND");
  if (!canRender(project) || !project.activeMasterVersionId) throw new Error("MASTER_NOT_RENDERABLE");
  const selected = project.slots.filter((slot) => slotIds.includes(slot.id));
  const jobs: RenderJob[] = []; let slots = project.slots;
  for (const slot of selected) {
    const nextVersion = slot.version + 1; const idempotencyKey = `${project.id}:${project.activeMasterVersionId}:${slot.id}:v${nextVersion}`;
    const existing = project.renderJobs.find((job) => job.idempotencyKey === idempotencyKey && !["FAILED", "CANCELLED"].includes(job.status));
    if (existing) { jobs.push(existing); continue; }
    const jobId = `render-${crypto.randomUUID()}`;
    const job: RenderJob = { jobId, projectId: project.id, userId, masterVersionId: project.activeMasterVersionId, slotId: slot.id, slotRole: slot.role, sceneTemplateId: sceneTemplateFor(project, slot), renderProvider: provider, status: "QUEUED", progress: 0, correlationId, idempotencyKey, outputAssetId: null, errorCode: null, retryCount: 0, createdAt: new Date().toISOString(), completedAt: null };
    jobs.push(job); slots = slots.map((item) => item.id === slot.id ? { ...item, status: "queued", activeJobId: jobId } : item);
  }
  return { project: { ...project, slots, renderJobs: [...project.renderJobs, ...jobs.filter((job) => !project.renderJobs.some((item) => item.jobId === job.jobId))] }, jobs };
}

export function completeRenderJob(project: Project, jobId: string, output: OutputAsset) {
  const job = project.renderJobs.find((item) => item.jobId === jobId); if (!job) throw new Error("JOB_NOT_FOUND");
  if (job.userId !== project.userId || output.userId !== project.userId) throw new Error("RESOURCE_NOT_FOUND");
  return { ...project,
    renderJobs: project.renderJobs.map((item) => item.jobId === jobId ? { ...item, status: "READY" as const, progress: 100, outputAssetId: output.id, completedAt: new Date().toISOString() } : item),
    slots: project.slots.map((slot) => slot.id === job.slotId ? { ...slot, status: "ready" as const, version: slot.version + 1, outputAssetId: output.id, activeJobId: jobId } : slot),
    outputAssets: [...project.outputAssets, output],
  };
}

export function approveOutput(project: Project, assetId: string, approved: boolean) { return { ...project, outputAssets: project.outputAssets.map((asset) => asset.id === assetId ? { ...asset, approved, rejected: !approved } : asset) }; }
