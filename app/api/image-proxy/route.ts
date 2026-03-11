import { NextRequest, NextResponse } from "next/server";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

function isPrivateHost(host: string): boolean {
  return (
    host === "localhost"
    || host === "127.0.0.1"
    || host === "[::1]"
    || host === "0.0.0.0"
    || host.startsWith("10.")
    || host.startsWith("192.168.")
    || host.startsWith("172.")
    || host.endsWith(".local")
    || host.endsWith(".internal")
    || /^169\.254\./.test(host)
    || /^fc00:/i.test(host)
    || /^fe80:/i.test(host)
  );
}

export async function GET(request: NextRequest) {
  const src = request.nextUrl.searchParams.get("url");
  if (!src || !/^https?:\/\//i.test(src)) {
    return new NextResponse("Invalid image url", { status: 400 });
  }

  try {
    const parsed = new URL(src);
    if (isPrivateHost(parsed.hostname.toLowerCase()) || /\.svg(\?|$)/i.test(parsed.pathname)) {
      return new NextResponse("Blocked image url", { status: 400 });
    }

    const res = await fetch(src, {
      signal: AbortSignal.timeout(10_000),
      redirect: "follow",
      cache: "force-cache",
    });
    if (!res.ok) {
      return new NextResponse("Upstream image fetch failed", { status: 400 });
    }

    const contentType = res.headers.get("content-type") || "";
    if (!ALLOWED_TYPES.some(type => contentType.includes(type.split("/")[1]))) {
      return new NextResponse("Unsupported image type", { status: 400 });
    }

    const arrayBuffer = await res.arrayBuffer();
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    });
  } catch {
    return new NextResponse("Image proxy failed", { status: 400 });
  }
}
