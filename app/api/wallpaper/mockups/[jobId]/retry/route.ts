import { NextResponse } from "next/server";
import type { RetryMockupSlotsRequest } from "../../../../../../lib/core/mockup-api.ts";
import { getMockupJobService } from "../../../../../../lib/server/mockup-jobs.ts";

export async function POST(request: Request, context: { params: Promise<{ jobId: string }> }) {
  try { const { jobId } = await context.params; const input = await request.json() as RetryMockupSlotsRequest; const job = await getMockupJobService().retry(jobId, input); return NextResponse.json(job, { status: 202 }); }
  catch (error) { const code = error instanceof Error ? error.message : "INVALID_REQUEST"; const status = code === "JOB_NOT_FOUND" ? 404 : 409; return NextResponse.json({ error: { code, message: code === "SLOT_NOT_RETRYABLE" ? "Only failed, retryable slots can be retried." : "Mockup job was not found.", retryable: false } }, { status }); }
}
