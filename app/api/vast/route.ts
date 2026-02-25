import { NextRequest, NextResponse } from "next/server";
import { VAST_TAG_URL } from "@/lib/adProviders";

/**
 * Resolve VAST wrapper chain server-side.
 * Wrappers contain <VASTAdTagURI> pointing to another VAST endpoint.
 * Following these client-side fails due to CORS, so we resolve here.
 */
async function resolveVastChain(
  url: string,
  headers: Record<string, string>,
  depth = 0,
): Promise<string | null> {
  if (depth > 5) return null;

  const res = await fetch(url, { cache: "no-store", headers, redirect: "follow" });
  if (!res.ok) return null;

  const xml = await res.text();
  if (!xml.trim()) return null;

  // Check for Wrapper → follow VASTAdTagURI server-side
  const uriMatch = xml.match(
    /<VASTAdTagURI[^>]*>\s*(?:<!\[CDATA\[\s*)?(https?:\/\/[^\s<\]]+)/i,
  );
  if (uriMatch) {
    return resolveVastChain(uriMatch[1].trim(), headers, depth + 1);
  }

  return xml;
}

/**
 * VAST proxy — fetches VAST XML server-side to avoid CORS issues.
 * Resolves wrapper chains and forwards real client context so ad networks return fill.
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

    const xml = await resolveVastChain(VAST_TAG_URL, headers);

    if (!xml) {
      return new NextResponse("", {
        status: 204,
        headers: { "Content-Type": "application/xml" },
      });
    }

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
