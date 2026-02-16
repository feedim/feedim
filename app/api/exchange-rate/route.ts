import { NextResponse } from "next/server";

let cachedRate: { usdTry: number; updatedAt: string; source: string } | null = null;
let cacheTime = 0;
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

export async function GET() {
  const now = Date.now();

  // Return cached rate if still fresh
  if (cachedRate && now - cacheTime < CACHE_DURATION) {
    return NextResponse.json(cachedRate, {
      headers: { "Cache-Control": "public, max-age=900, s-maxage=900" },
    });
  }

  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      next: { revalidate: 900 },
    });

    if (!res.ok) throw new Error(`API responded ${res.status}`);

    const data = await res.json();
    const tryRate = data?.rates?.TRY;

    if (!tryRate || typeof tryRate !== "number") {
      throw new Error("TRY rate not found in response");
    }

    cachedRate = {
      usdTry: Math.round(tryRate * 10000) / 10000,
      updatedAt: new Date().toISOString(),
      source: "open.er-api.com",
    };
    cacheTime = now;

    return NextResponse.json(cachedRate, {
      headers: { "Cache-Control": "public, max-age=900, s-maxage=900" },
    });
  } catch (error) {
    // Return last known rate if available
    if (cachedRate) {
      return NextResponse.json(
        { ...cachedRate, stale: true },
        { headers: { "Cache-Control": "public, max-age=300" } }
      );
    }

    if (process.env.NODE_ENV === "development") console.error("Exchange rate error:", error);
    return NextResponse.json({ error: "Döviz kuru alınamadı" }, { status: 502 });
  }
}
