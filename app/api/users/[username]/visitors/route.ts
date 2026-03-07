import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildPrivateCacheControl, FRESHNESS_WINDOWS } from "@/lib/freshnessPolicy";
import { canUseProfileVisitors, getUserPlan } from "@/lib/limits";
import { safeError } from "@/lib/apiError";
import { getTranslations } from "next-intl/server";
import { safePage } from "@/lib/utils";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const tErrors = await getTranslations("apiErrors");
    const { username } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: tErrors("unauthorized") }, { status: 401 });

    // Only own profile visitors
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("username", username)
      .single();

    if (!profile || profile.user_id !== user.id) {
      return NextResponse.json({ error: tErrors("accessDenied") }, { status: 403 });
    }

    // Max-only feature
    const admin = createAdminClient();
    const plan = await getUserPlan(admin, user.id);
    if (!canUseProfileVisitors(plan)) {
      return NextResponse.json({ error: tErrors("maxFeatureOnly") }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = safePage(searchParams.get("page"));
    const limit = 10;
    const from = (page - 1) * limit;
    const to = from + limit;

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
      const response = NextResponse.json({ visitors: [], hasMore: false });
      response.headers.set("Cache-Control", buildPrivateCacheControl(FRESHNESS_WINDOWS.profileVisitors));
      return response;
    }

    const hasMore = visits.length > limit;
    const sliced = visits.slice(0, limit);

    // Get unique visitor IDs (most recent first)
    const seen = new Set<string>();
    const uniqueVisitorIds: string[] = [];
    for (const v of sliced) {
      if (!seen.has(v.visitor_id)) {
        seen.add(v.visitor_id);
        uniqueVisitorIds.push(v.visitor_id);
      }
    }

    const { data: visitors } = await supabase
      .from("profiles")
      .select("user_id, name, surname, full_name, username, avatar_url, is_verified, premium_plan, role, bio")
      .in("user_id", uniqueVisitorIds)
      .eq("status", "active");

    // Preserve original visit order (newest first)
    const visitorMap = new Map((visitors || []).map(v => [v.user_id, v]));
    const orderedVisitors = uniqueVisitorIds
      .map(id => visitorMap.get(id))
      .filter(Boolean);

    const response = NextResponse.json({
      visitors: orderedVisitors,
      hasMore,
    });
    response.headers.set("Cache-Control", buildPrivateCacheControl(FRESHNESS_WINDOWS.profileVisitors));
    return response;
  } catch (err) {
    return safeError(err);
  }
}
