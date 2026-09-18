import type { CreateMockupBatchRequest, MockupBatchStatus, MockupJobStage, MockupOutputRecord, MockupProviderId, RetryMockupSlotsRequest } from "../core/mockup-api.ts";
import { isProductionSourceAsset } from "../core/mockup-api.ts";

export interface MockupJobRepository {
  create(input: CreateMockupBatchRequest, provider: MockupProviderId): Promise<MockupBatchStatus>;
  get(jobId: string): Promise<MockupBatchStatus | null>;
  save(job: MockupBatchStatus): Promise<void>;
  findByIdempotencyKey(key: string): Promise<MockupBatchStatus | null>;
}

export interface MockupJobQueue {
  enqueue(input: { jobId: string; slotIds: string[] }): Promise<void>;
}

export class DevelopmentMockupJobRepository implements MockupJobRepository {
  private readonly jobs = new Map<string, MockupBatchStatus>();
  private readonly idempotency = new Map<string, string>();
  async create(input: CreateMockupBatchRequest, provider: MockupProviderId) {
    const now = new Date().toISOString(); const jobId = `mockup-batch-${crypto.randomUUID()}`;
    const outputs: MockupOutputRecord[] = input.scenes.map((scene) => ({ id: `mockup-output-${crypto.randomUUID()}`, jobId, sceneId: scene.sceneId, slotId: scene.slotId, category: scene.category, status: "queued", prompt: scene.prompt, provider, providerJobId: null, outputUrl: null, thumbnailUrl: null, storageKey: null, width: input.output.width, height: input.output.height, createdAt: now, error: null }));
    const job: MockupBatchStatus = { jobId, projectId: input.projectId, provider, status: "queued", createdAt: now, updatedAt: now, outputs };
    this.jobs.set(jobId, job); this.idempotency.set(input.idempotencyKey, jobId); return job;
  }
  async get(jobId: string) { return this.jobs.get(jobId) ?? null; }
  async save(job: MockupBatchStatus) { this.jobs.set(job.jobId, job); }
  async findByIdempotencyKey(key: string) { const id = this.idempotency.get(key); return id ? this.jobs.get(id) ?? null : null; }
}

export class DevelopmentMockupJobQueue implements MockupJobQueue {
  async enqueue() {
    // Intentionally no worker side effect. A production queue consumer must execute the documented pipeline stages.
  }
}

export class MockupJobService {
  private readonly repository: MockupJobRepository; private readonly queue: MockupJobQueue;
  constructor(repository: MockupJobRepository, queue: MockupJobQueue) { this.repository = repository; this.queue = queue; }
  async create(input: CreateMockupBatchRequest, provider: MockupProviderId) {
    if (!isProductionSourceAsset(input.source)) throw new Error("SOURCE_ASSET_NOT_PERSISTED");
    if (input.scenes.length !== 6 || new Set(input.scenes.map((scene) => scene.slotId)).size !== 6) throw new Error("SIX_DISTINCT_SCENES_REQUIRED");
    if (input.scenes.some((scene) => !scene.prompt.trim() || scene.category !== input.scenes[0].category)) throw new Error("INVALID_SCENE_PLAN");
    const existing = await this.repository.findByIdempotencyKey(input.idempotencyKey); if (existing) return existing;
    const job = await this.repository.create(input, provider); await this.queue.enqueue({ jobId: job.jobId, slotIds: job.outputs.map((output) => output.slotId) }); return job;
  }
  async get(jobId: string) { return this.repository.get(jobId); }
  async retry(jobId: string, input: RetryMockupSlotsRequest) {
    const job = await this.repository.get(jobId); if (!job) throw new Error("JOB_NOT_FOUND");
    const rejected = new Set(input.rejectedSlotIds ?? []);
    const retryable = job.outputs.filter((output) => input.slotIds.includes(output.slotId) && ((output.status === "failed" && output.error?.retryable) || (output.status === "completed" && rejected.has(output.slotId))));
    if (!retryable.length || retryable.length !== input.slotIds.length) throw new Error("SLOT_NOT_RETRYABLE");
    const now = new Date().toISOString(); const outputs = job.outputs.map((output) => retryable.some((item) => item.id === output.id) ? { ...output, status: "queued" as MockupJobStage, providerJobId: null, outputUrl: null, thumbnailUrl: null, storageKey: null, error: null } : output);
    const next = { ...job, status: "queued" as MockupJobStage, updatedAt: now, outputs }; await this.repository.save(next); await this.queue.enqueue({ jobId, slotIds: input.slotIds }); return next;
  }
}

type GlobalJobs = typeof globalThis & { __wallpaperMockupJobService?: MockupJobService };
export function getMockupJobService() {
  const globalJobs = globalThis as GlobalJobs;
  return globalJobs.__wallpaperMockupJobService ??= new MockupJobService(new DevelopmentMockupJobRepository(), new DevelopmentMockupJobQueue());
}
