import { NextResponse } from "next/server";
import { getMockupJobService } from "../../../../../lib/server/mockup-jobs.ts";

export async function GET(_request: Request, context: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await context.params; const job = await getMockupJobService().get(jobId);
  if (!job) return NextResponse.json({ error: { code: "JOB_NOT_FOUND", message: "Mockup job was not found.", retryable: false } }, { status: 404 });
  return NextResponse.json(job);
}
