import { NextResponse } from "next/server";
import { getServerRenderConfig } from "../../../../lib/server/render-provider.ts";

export async function GET() {
  const config = getServerRenderConfig();
  return NextResponse.json({ provider: config.provider, configured: config.provider === "mock" || config.productionReady });
}
