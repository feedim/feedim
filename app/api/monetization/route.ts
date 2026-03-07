import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildPrivateCacheControl, FRESHNESS_WINDOWS } from "@/lib/freshnessPolicy";
import { getTranslations } from "next-intl/server";
import { getUserPlan, isAdminPlan } from "@/lib/limits";

type AdminClient = ReturnType<typeof createAdminClient>;

interface MonetizationBaseProfile {
  account_type?: string | null;
  profile_score?: number | null;
  email_verified?: boolean | null;
  spam_score?: number | null;
  created_at?: string | null;
}

interface MonetizationFields {
  monetization_enabled?: boolean | null;
  monetization_status?: string | null;
  monetization_applied_at?: string | null;
  monetization_approved_at?: string | null;
}

interface IdRow {
  id: number;
}

interface FollowerIdRow {
  follower_id: string;
}

interface CountResult {
  count: number | null;
}

function getAccountAgeDays(createdAt?: string | null): number {
  if (!createdAt) return 0;
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
}

async function getMonetizationProfile(admin: AdminClient, userId: string): Promise<(MonetizationBaseProfile & MonetizationFields) | null> {
  const { data: baseProfile } = await admin
    .from("profiles")
    .select("account_type, profile_score, email_verified, spam_score, created_at")
    .eq("user_id", userId)
    .single();

  if (!baseProfile) return null;

  let monetizationData: MonetizationFields = {};
  try {
    const { data: monData } = await admin
      .from("profiles")
      .select("monetization_enabled, monetization_status, monetization_applied_at, monetization_approved_at")
      .eq("user_id", userId)
      .single();
    monetizationData = (monData as MonetizationFields | null) || {};
  } catch {}

  return {
    ...(baseProfile as MonetizationBaseProfile),
    ...monetizationData,
  };
}

async function getEligibilityCounts(admin: AdminClient, userId: string, thirtyDaysAgo: string) {
  const { data: userPosts } = await admin
    .from("posts")
    .select("id")
    .eq("author_id", userId)
    .eq("status", "published");

  const postIds = ((userPosts as IdRow[] | null) || []).map((post) => post.id);

  const { data: followerData } = await admin
    .from("follows")
    .select("follower_id")
    .eq("following_id", userId)
    .eq("status", "accepted");

  const followerIds = ((followerData as FollowerIdRow[] | null) || []).map((follower) => follower.follower_id);
  const zeroCount: CountResult = { count: 0 };

  const [premiumFollowersResult, recentViewsResult] = await Promise.all([
    followerIds.length > 0
      ? admin.from("profiles").select("user_id", { count: "exact", head: true })
          .in("user_id", followerIds)
          .eq("is_premium", true)
      : Promise.resolve(zeroCount),
    postIds.length > 0
      ? admin.from("post_views").select("id", { count: "exact", head: true })
          .in("post_id", postIds)
          .gte("created_at", thirtyDaysAgo)
      : Promise.resolve(zeroCount),
  ]);

  return {
    premiumFollowerCount: premiumFollowersResult.count || 0,
    recentViewCount: recentViewsResult.count || 0,
  };
}

// GET: Check monetization status and requirements
export async function GET() {
  try {
    const supabase = await createClient();
    const tErrors = await getTranslations("apiErrors");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: tErrors("unauthorized") }, { status: 401 });
    }

    const admin = createAdminClient();
    const plan = await getUserPlan(admin, user.id);
    const isAdminUser = isAdminPlan(plan);
    const profile = await getMonetizationProfile(admin, user.id);
    if (!profile) {
      return NextResponse.json({ error: tErrors("profileNotFound") }, { status: 404 });
    }

    // Check requirements
    const now = new Date();
    const accountAge = getAccountAgeDays(profile.created_at);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { premiumFollowerCount, recentViewCount } = await getEligibilityCounts(admin, user.id, thirtyDaysAgo);

    const requirements = {
      business: isAdminUser || profile.account_type === "creator" || profile.account_type === "business",
      score: isAdminUser || (profile.profile_score || 0) >= 40,
      followers: isAdminUser || (premiumFollowerCount || 0) >= 100,
      views: isAdminUser || (recentViewCount || 0) >= 5000,
      accountAge: isAdminUser || accountAge >= 7,
      spam: isAdminUser || (profile.spam_score || 0) < 30,
      email: isAdminUser || profile.email_verified === true,
    };

    const allMet = Object.values(requirements).every(Boolean);

    const currentValues = {
      profileScore: profile.profile_score || 0,
      premiumFollowers: premiumFollowerCount || 0,
      recentViews: recentViewCount || 0,
      accountAgeDays: accountAge,
      spamScore: profile.spam_score || 0,
    };

    const response = NextResponse.json({
      monetization_enabled: profile.monetization_enabled || false,
      monetization_status: profile.monetization_status || null,
      monetization_applied_at: profile.monetization_applied_at || null,
      monetization_approved_at: profile.monetization_approved_at || null,
      requirements,
      currentValues,
      allRequirementsMet: allMet,
    });
    response.headers.set("Cache-Control", buildPrivateCacheControl(FRESHNESS_WINDOWS.settingsDerivedPanel));
    return response;
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

// POST: Apply for monetization
export async function POST() {
  try {
    const tErrors = await getTranslations("apiErrors");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: tErrors("unauthorized") }, { status: 401 });
    }

    const admin = createAdminClient();
    const plan = await getUserPlan(admin, user.id);
    const isAdminUser = isAdminPlan(plan);
    const profile = await getMonetizationProfile(admin, user.id);
    if (!profile) {
      return NextResponse.json({ error: tErrors("profileNotFound") }, { status: 404 });
    }

    if (profile.monetization_enabled) {
      return NextResponse.json({ error: tErrors("monetizationAlreadyActive") }, { status: 400 });
    }

    if (profile.monetization_status === "pending") {
      return NextResponse.json({ error: tErrors("applicationAlreadyPending") }, { status: 400 });
    }

    // Validate requirements
    const now = new Date();
    const accountAge = getAccountAgeDays(profile.created_at);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { premiumFollowerCount, recentViewCount } = await getEligibilityCounts(admin, user.id, thirtyDaysAgo);

    const failed: string[] = [];
    if (!isAdminUser) {
      if (profile.account_type !== "creator" && profile.account_type !== "business") failed.push("business");
      if ((profile.profile_score || 0) < 40) failed.push("score");
      if ((premiumFollowerCount || 0) < 100) failed.push("followers");
      if ((recentViewCount || 0) < 5000) failed.push("views");
      if (accountAge < 7) failed.push("accountAge");
      if ((profile.spam_score || 0) >= 30) failed.push("spam");
      if (!profile.email_verified) failed.push("email");
    }

    if (failed.length > 0) {
      return NextResponse.json({ error: tErrors("requirementsNotMet"), failed }, { status: 400 });
    }

    // Create application
    await admin
      .from("profiles")
      .update({
        monetization_status: "pending",
        monetization_applied_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
