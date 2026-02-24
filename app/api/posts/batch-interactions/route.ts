import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ interactions: {} });
  }

  const idsParam = req.nextUrl.searchParams.get("ids") || "";
  const ids = idsParam
    .split(",")
    .map(Number)
    .filter(n => n > 0)
    .slice(0, 50); // max 50 posts per request

  if (ids.length === 0) {
    return NextResponse.json({ interactions: {} });
  }

  const admin = createAdminClient();
  const [{ data: likes }, { data: bookmarks }] = await Promise.all([
    admin.from("likes").select("post_id").eq("user_id", user.id).in("post_id", ids),
    admin.from("bookmarks").select("post_id").eq("user_id", user.id).in("post_id", ids),
  ]);

  const likedSet = new Set((likes || []).map(l => l.post_id));
  const savedSet = new Set((bookmarks || []).map(b => b.post_id));

  const interactions: Record<number, { liked: boolean; saved: boolean }> = {};
  for (const id of ids) {
    interactions[id] = { liked: likedSet.has(id), saved: savedSet.has(id) };
  }

  return NextResponse.json({ interactions }, {
    headers: { "Cache-Control": "private, max-age=10" },
  });
}
