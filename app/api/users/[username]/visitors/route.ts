import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserPlan } from "@/lib/limits";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only own profile visitors
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("username", username)
    .single();

  if (!profile || profile.user_id !== user.id) {
    return NextResponse.json({ error: "Erisim engellendi" }, { status: 403 });
  }

  // Max-only feature
  const admin = createAdminClient();
  const plan = await getUserPlan(admin, user.id);
  if (plan !== "max") {
    return NextResponse.json({ error: "Bu özellik sadece Max abonelere özeldir" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 15;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // Last 30 days, grouped by visitor
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: visits } = await supabase
    .from("profile_visits")
    .select("visitor_id, created_at")
    .eq("visited_id", user.id)
    .neq("visitor_id", user.id)
    .gte("created_at", thirtyDaysAgo)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (!visits || visits.length === 0) {
    return NextResponse.json({ visitors: [], hasMore: false });
  }

  // Get unique visitor IDs (most recent first)
  const seen = new Set<string>();
  const uniqueVisitorIds: string[] = [];
  for (const v of visits) {
    if (!seen.has(v.visitor_id)) {
      seen.add(v.visitor_id);
      uniqueVisitorIds.push(v.visitor_id);
    }
  }

  const { data: visitors } = await supabase
    .from("profiles")
    .select("user_id, name, surname, full_name, username, avatar_url, is_verified, premium_plan, bio")
    .in("user_id", uniqueVisitorIds)
    .eq("status", "active");

  return NextResponse.json({
    visitors: visitors || [],
    hasMore: visits.length >= limit,
  });
}
