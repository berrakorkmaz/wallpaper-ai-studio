import type { CreateMockupBatchRequest, CreateMockupBatchResponse, MockupApiError, MockupBatchStatus, RetryMockupSlotsRequest } from "../../lib/core/mockup-api.ts";

async function json<T>(response: Response): Promise<T> {
  const body = await response.json() as T | MockupApiError;
  if (!response.ok) throw new Error("error" in (body as MockupApiError) ? (body as MockupApiError).error.message : `MOCKUP_API_${response.status}`);
  return body as T;
}

export async function getPublicRenderConfig() { return json<{ mode: "demo" | "production"; provider: "mock" | "fal" | "custom"; configured: boolean; productionReady: boolean; falConfiguration: "ready" | "missing" | "not-selected"; falSingleMockupTest: boolean; missingConfiguration: string[] }>(await fetch("/api/render/health", { cache: "no-store" })); }
export async function createMockupBatch(input: CreateMockupBatchRequest) { return json<CreateMockupBatchResponse>(await fetch("/api/wallpaper/mockups", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) })); }
export async function getMockupBatch(jobId: string) { return json<MockupBatchStatus>(await fetch(`/api/wallpaper/mockups/${encodeURIComponent(jobId)}`, { cache: "no-store" })); }
export async function retryMockupSlots(jobId: string, input: RetryMockupSlotsRequest) { return json<MockupBatchStatus>(await fetch(`/api/wallpaper/mockups/${encodeURIComponent(jobId)}/retry`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) })); }
