import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cache } from "@/lib/cache";
import { safeError } from "@/lib/apiError";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
  const { username } = await params;
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: target } = await admin
    .from("profiles")
    .select("user_id, role")
    .eq("username", username)
    .single();

  if (!target) return NextResponse.json({ error: "Kullanici bulunamadi" }, { status: 404 });
  if (target.user_id === user.id) return NextResponse.json({ error: "Kendini engelleyemezsin" }, { status: 400 });
  if (target.role === "admin" || target.role === "moderator") return NextResponse.json({ error: "Bu kullanıcı engellenemez" }, { status: 403 });

  // Check if already blocked
  const { data: existing } = await admin
    .from("blocks")
    .select("id")
    .eq("blocker_id", user.id)
    .eq("blocked_id", target.user_id)
    .single();

  if (existing) {
    // Unblock
    await admin.from("blocks").delete().eq("id", existing.id);
    cache.delete(`user:${user.id}:blocks`);
    return NextResponse.json({ blocked: false });
  } else {
    // Block — also remove follow relationships
    await admin.from("blocks").insert({ blocker_id: user.id, blocked_id: target.user_id });
    await admin.from("follows").delete().eq("follower_id", user.id).eq("following_id", target.user_id);
    await admin.from("follows").delete().eq("follower_id", target.user_id).eq("following_id", user.id);
    // Update follow counts
    const { count: targetFollowers } = await admin.from("follows").select("id", { count: "exact", head: true }).eq("following_id", target.user_id);
    const { count: targetFollowing } = await admin.from("follows").select("id", { count: "exact", head: true }).eq("follower_id", target.user_id);
    const { count: myFollowers } = await admin.from("follows").select("id", { count: "exact", head: true }).eq("following_id", user.id);
    const { count: myFollowing } = await admin.from("follows").select("id", { count: "exact", head: true }).eq("follower_id", user.id);
    await admin.from("profiles").update({ follower_count: targetFollowers || 0, following_count: targetFollowing || 0 }).eq("user_id", target.user_id);
    await admin.from("profiles").update({ follower_count: myFollowers || 0, following_count: myFollowing || 0 }).eq("user_id", user.id);
    cache.delete(`user:${user.id}:blocks`);
    cache.delete(`user:${user.id}:follows`);
    return NextResponse.json({ blocked: true });
  }
  } catch (err) {
    return safeError(err);
  }
}
