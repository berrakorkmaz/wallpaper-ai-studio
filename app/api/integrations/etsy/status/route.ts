import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ enabled: Boolean(process.env.ETSY_API_KEY && process.env.ETSY_SHARED_SECRET), connected: false, mode: process.env.DEMO_MODE === "false" ? "production" : "demo" });
}
