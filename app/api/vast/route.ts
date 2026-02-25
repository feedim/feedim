import { NextResponse } from "next/server";
import { VAST_TAG_URL } from "@/lib/adProviders";

/**
 * VAST proxy — fetches VAST XML server-side to avoid CORS issues.
 * Client calls /api/vast → server fetches from HilltopAds → returns XML to client.
 */
export async function GET() {
  try {
    const res = await fetch(VAST_TAG_URL, {
      cache: "no-store",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Feedim/1.0)",
      },
      redirect: "follow",
    });

    if (!res.ok) {
      return new NextResponse("", {
        status: 204,
        headers: { "Content-Type": "application/xml" },
      });
    }

    const xml = await res.text();

    return new NextResponse(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch {
    return new NextResponse("", {
      status: 204,
      headers: { "Content-Type": "application/xml" },
    });
  }
}
