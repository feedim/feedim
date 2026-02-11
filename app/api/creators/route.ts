import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// Rate limit: 30 requests per minute per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 30) return false;
  entry.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { userIds } = await request.json();

    if (!Array.isArray(userIds) || userIds.length === 0 || userIds.length > 50) {
      return NextResponse.json({}, { status: 200 });
    }

    // Validate UUIDs
    const validIds = userIds.filter(
      (id: string) => typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id)
    );
    if (validIds.length === 0) return NextResponse.json({});

    const supabase = await createClient();

    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, name, surname, full_name")
      .in("user_id", validIds);

    const map: Record<string, string> = {};
    validIds.forEach((uid: string) => {
      const p = profiles?.find((pr) => pr.user_id === uid);
      const name = p
        ? [p.name, p.surname].filter(Boolean).join(" ") || p.full_name || "Anonim"
        : "Anonim";
      map[uid] = name;
    });

    return NextResponse.json(map, {
      headers: { "Cache-Control": "public, max-age=60, s-maxage=300" },
    });
  } catch {
    return NextResponse.json({}, { status: 200 });
  }
}
