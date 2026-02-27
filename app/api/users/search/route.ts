import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Sanitize input for PostgREST filter strings to prevent filter injection
function sanitizeForFilter(input: string): string {
  return input.replace(/[,.()"'\\]/g, "");
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const q = sanitizeForFilter((searchParams.get("q") || "").trim().toLowerCase());

  if (!q || q.length < 1) {
    return NextResponse.json({ users: [] });
  }

  const { data: { user } } = await supabase.auth.getUser();

  // Get blocked user IDs
  const excludeIds: string[] = user ? [user.id] : [];
  if (user) {
    const admin = createAdminClient();
    const { data: blocks } = await admin
      .from("blocks")
      .select("blocked_id, blocker_id")
      .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`);
    if (blocks) {
      blocks.forEach(b => {
        excludeIds.push(b.blocker_id === user.id ? b.blocked_id : b.blocker_id);
      });
    }
  }

  // Mention mode: only show followers + following
  const isMention = searchParams.get("mention") === "1";
  if (isMention && user) {
    const admin = createAdminClient();

    // Get people I follow + people who follow me
    const [{ data: following }, { data: followers }] = await Promise.all([
      admin.from("follows").select("following_id").eq("follower_id", user.id),
      admin.from("follows").select("follower_id").eq("following_id", user.id),
    ]);

    const connectedIds = new Set<string>();
    for (const f of following || []) connectedIds.add(f.following_id);
    for (const f of followers || []) connectedIds.add(f.follower_id);
    // Remove self + blocked
    for (const id of excludeIds) connectedIds.delete(id);

    if (connectedIds.size === 0) {
      return NextResponse.json({ users: [] });
    }

    const ids = Array.from(connectedIds);

    // Search by username
    const { data: byUsername } = await admin
      .from("profiles")
      .select("user_id, username, full_name, avatar_url, is_verified, premium_plan, role")
      .eq("status", "active")
      .in("user_id", ids)
      .ilike("username", `%${q}%`)
      .limit(5);

    // Search by full_name
    const { data: byName } = await admin
      .from("profiles")
      .select("user_id, username, full_name, avatar_url, is_verified, premium_plan, role")
      .eq("status", "active")
      .in("user_id", ids)
      .ilike("full_name", `%${q}%`)
      .limit(5);

    // Merge & deduplicate
    const seen = new Set<string>();
    const merged = [];
    for (const u of [...(byUsername || []), ...(byName || [])]) {
      if (!seen.has(u.user_id)) { seen.add(u.user_id); merged.push(u); }
    }

    return NextResponse.json({ users: merged.slice(0, 5) });
  }

  let query = supabase
    .from("profiles")
    .select("user_id, username, full_name, avatar_url, is_verified, premium_plan, role")
    .eq("status", "active")
    .or(`username.ilike.%${q}%,full_name.ilike.%${q}%`)
    .limit(5);

  // Exclude self + blocked users
  for (const id of excludeIds) {
    query = query.neq("user_id", id);
  }

  const { data: users } = await query;

  return NextResponse.json({ users: users || [] });
}
