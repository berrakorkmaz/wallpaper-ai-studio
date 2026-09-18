import { NextResponse } from "next/server";
import { publicRenderConfig } from "../../../../../lib/server/render-provider.ts";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() { return NextResponse.json(publicRenderConfig(), { headers: { "cache-control": "no-store, max-age=0" } }); }
