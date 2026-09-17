import type { DesignAsset, OutputAsset, Project, RenderJob, RenderProvider } from "../../lib/core/types.ts";
import { DEFAULT_OUTPUT_PROFILE } from "../../lib/core/output-profiles.ts";

export type RenderRequest = { userId: string; project: Project; job: RenderJob; master: DesignAsset };
export type RenderResult = Omit<OutputAsset, "id" | "projectId" | "userId" | "masterVersionId" | "slotId" | "role" | "sceneTemplateId" | "createdAt"> & { bytes?: Blob };

export interface RenderAdapter { readonly provider: RenderProvider; readonly label: string; render(input: RenderRequest): Promise<RenderResult>; }

export class MockRenderAdapter implements RenderAdapter {
  readonly provider = "mock" as const; readonly label = "Development mock renderer";
  async render(input: RenderRequest): Promise<RenderResult> {
    if (input.userId !== input.project.userId || input.master.userId !== input.userId) throw new Error("RESOURCE_NOT_FOUND");
    const payload = new Blob([`Development placeholder for ${input.job.slotRole}. Not production ready.`], { type: "text/plain" });
    return { fileUrl: `mock://${input.project.id}/${input.job.slotId}/${input.job.jobId}`, fileName: `${input.job.slotId}.jpg`, width: 1600, height: 1200, format: "jpg", fileSize: payload.size, productionReady: false, renderProvider: "mock", approved: false, rejected: false, bytes: payload };
  }
}

export class RealRenderAdapter implements RenderAdapter {
  readonly provider = "real" as const; readonly label = "Production compositing service";
  private readonly endpoint: string; private readonly serviceToken: string;
  constructor(endpoint: string, serviceToken: string) { this.endpoint = endpoint; this.serviceToken = serviceToken; }
  async render(input: RenderRequest): Promise<RenderResult> {
    if (input.userId !== input.project.userId || input.master.userId !== input.userId) throw new Error("RESOURCE_NOT_FOUND");
    if (!this.endpoint || !this.serviceToken) throw new Error("REAL_RENDER_NOT_CONFIGURED");
    const response = await fetch(`${this.endpoint.replace(/\/$/, "")}/v1/render`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${this.serviceToken}`, "idempotency-key": input.job.idempotencyKey }, body: JSON.stringify({ job: input.job, master: { assetId: input.master.id, hash: input.master.fileHash }, artDirection: input.project.artDirection, placement: { mode: input.project.artworkPlacementMode, focalPoint: input.project.focalPoint }, output: DEFAULT_OUTPUT_PROFILE, sceneVariation: { room: input.job.slotRole, vary: ["room_category", "lighting", "camera_angle", "composition"] }, sourcePolicy: "fal-scene-generation-then-mask-perspective-displacement-composite-source-asset" }) });
    if (!response.ok) throw new Error(`RENDER_PROVIDER_${response.status}`);
    const result = await response.json() as { url: string; fileName: string; width: number; height: number; format: "jpg" | "png"; fileSize: number };
    if (!result.url || result.width !== DEFAULT_OUTPUT_PROFILE.width || result.height !== DEFAULT_OUTPUT_PROFILE.height || result.format !== DEFAULT_OUTPUT_PROFILE.format) throw new Error("INVALID_RENDER_OUTPUT");
    return { fileUrl: result.url, fileName: result.fileName, width: result.width, height: result.height, format: result.format, fileSize: result.fileSize, productionReady: true, renderProvider: "real", approved: false, rejected: false };
  }
}

export function configuredRenderProvider(value = "mock") { return value === "real" ? "real" : "mock"; }
