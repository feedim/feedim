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
