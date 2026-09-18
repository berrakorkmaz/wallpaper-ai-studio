import { NextResponse } from "next/server";
import { getServerRenderConfig, publicRenderConfig } from "../../../../lib/server/render-provider.ts";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const config = getServerRenderConfig();
  return NextResponse.json({ ...publicRenderConfig(config), configured: config.provider === "mock" || config.productionReady }, { headers: { "cache-control": "no-store, max-age=0" } });
}
