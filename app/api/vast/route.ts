import { NextRequest, NextResponse } from "next/server";
import { VAST_TAG_URL } from "@/lib/adProviders";

/**
 * VAST proxy — fetches VAST XML server-side to avoid CORS issues.
 * Forwards real client context (UA, IP, Referer) so ad networks return fill.
 */
export async function GET(request: NextRequest) {
  try {
    const ua = request.headers.get("user-agent") || "Mozilla/5.0 (compatible; Feedim/1.0)";
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "";
    const referer = request.headers.get("referer") || "https://feedim.com";

    const headers: Record<string, string> = {
      "User-Agent": ua,
      "Referer": referer,
    };
    if (ip) headers["X-Forwarded-For"] = ip;

    const res = await fetch(VAST_TAG_URL, {
      cache: "no-store",
      headers,
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
