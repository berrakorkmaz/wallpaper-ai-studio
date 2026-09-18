import type { CreateMockupBatchRequest, CreateMockupBatchResponse, MockupApiError, MockupBatchStatus, MockupJobStage, RetryMockupSlotsRequest } from "../../lib/core/mockup-api.ts";

async function json<T>(response: Response): Promise<T> {
  const body = await response.json() as T | MockupApiError;
  if (!response.ok) throw new Error("error" in (body as MockupApiError) ? (body as MockupApiError).error.message : `MOCKUP_API_${response.status}`);
  return body as T;
}

export async function getPublicRenderConfig() { return json<{ mode: "demo" | "production"; provider: "mock" | "fal" | "custom"; configured: boolean; productionReady: boolean; falConfiguration: "ready" | "missing" | "not-selected"; missingConfiguration: string[] }>(await fetch("/api/render/health", { cache: "no-store" })); }
export async function createMockupBatch(input: CreateMockupBatchRequest) { return json<CreateMockupBatchResponse>(await fetch("/api/wallpaper/mockups", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) })); }
export type FalMockupStreamEvent = { type: "stage"; slotId: string; stage: MockupJobStage; error?: MockupApiError["error"] } | { type: "result"; batch: MockupBatchStatus };
export async function createFalMockupStream(input: CreateMockupBatchRequest, onEvent: (event: FalMockupStreamEvent) => void) {
  const response = await fetch("/api/wallpaper/mockups?stream=1", { method: "POST", headers: { "content-type": "application/json", accept: "application/x-ndjson" }, body: JSON.stringify(input) });
  if (!response.ok) return json<MockupBatchStatus>(response);
  if (!response.body) throw new Error("Fal progress stream could not be opened.");
  const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = ""; let batch: MockupBatchStatus | null = null;
  while (true) {
    const { done, value } = await reader.read(); buffer += decoder.decode(value, { stream: !done });
    const lines = buffer.split("\n"); buffer = lines.pop() ?? "";
    for (const line of lines) { if (!line.trim()) continue; const event = JSON.parse(line) as FalMockupStreamEvent; onEvent(event); if (event.type === "result") batch = event.batch; }
    if (done) break;
  }
  if (buffer.trim()) { const event = JSON.parse(buffer) as FalMockupStreamEvent; onEvent(event); if (event.type === "result") batch = event.batch; }
  if (!batch) throw new Error("Fal progress stream ended before returning a result.");
  return batch;
}
export async function getMockupBatch(jobId: string) { return json<MockupBatchStatus>(await fetch(`/api/wallpaper/mockups/${encodeURIComponent(jobId)}`, { cache: "no-store" })); }
export async function retryMockupSlots(jobId: string, input: RetryMockupSlotsRequest) { return json<MockupBatchStatus>(await fetch(`/api/wallpaper/mockups/${encodeURIComponent(jobId)}/retry`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) })); }
