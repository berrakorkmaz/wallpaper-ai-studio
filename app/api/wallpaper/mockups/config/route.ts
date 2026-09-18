import { NextResponse } from "next/server";
import { publicRenderConfig } from "../../../../../lib/server/render-provider.ts";

export async function GET() { return NextResponse.json(publicRenderConfig()); }
