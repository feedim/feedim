import { NextResponse } from "next/server";
import { getAdsEnabled } from "@/lib/siteSettings";

export async function GET() {
  const enabled = await getAdsEnabled();
  return NextResponse.json({ enabled });
}
