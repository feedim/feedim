import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET: Check monetization status and requirements
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    const { data: baseProfile } = await admin
      .from("profiles")
      .select("account_type, profile_score, email_verified, spam_score, created_at")
      .eq("user_id", user.id)
      .single();

    if (!baseProfile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Monetization columns may not exist yet — fetch separately
    let monetizationData: any = {};
    try {
      const { data: monData } = await admin
        .from("profiles")
        .select("monetization_enabled, monetization_status, monetization_applied_at, monetization_approved_at")
        .eq("user_id", user.id)
        .single();
      monetizationData = monData || {};
    } catch {}

    const profile = { ...baseProfile, ...monetizationData };

    // Check requirements
    const now = new Date();
    const accountAge = Math.floor((now.getTime() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24));
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Get user's published post IDs for view count
    const { data: userPosts } = await admin
      .from("posts")
      .select("id")
      .eq("author_id", user.id)
      .eq("status", "published");

    const postIds = (userPosts || []).map((p: any) => p.id);

    const [
      { count: premiumFollowerCount },
      { count: recentViewCount },
    ] = await Promise.all([
      admin.from("followers").select("id", { count: "exact", head: true })
        .eq("following_id", user.id)
        .eq("status", "accepted")
        .eq("is_premium", true),
      postIds.length > 0
        ? admin.from("post_views").select("id", { count: "exact", head: true })
            .in("post_id", postIds)
            .gte("created_at", thirtyDaysAgo)
        : Promise.resolve({ count: 0 } as any),
    ]);

    const requirements = {
      business: profile.account_type === "creator" || profile.account_type === "business",
      score: (profile.profile_score || 0) >= 40,
      followers: (premiumFollowerCount || 0) >= 100,
      views: (recentViewCount || 0) >= 5000,
      accountAge: accountAge >= 7,
      spam: (profile.spam_score || 0) < 30,
      email: profile.email_verified === true,
    };

    const allMet = Object.values(requirements).every(Boolean);

    const currentValues = {
      profileScore: profile.profile_score || 0,
      premiumFollowers: premiumFollowerCount || 0,
      recentViews: recentViewCount || 0,
      accountAgeDays: accountAge,
      spamScore: profile.spam_score || 0,
    };

    return NextResponse.json({
      monetization_enabled: profile.monetization_enabled || false,
      monetization_status: profile.monetization_status || null,
      monetization_applied_at: profile.monetization_applied_at || null,
      monetization_approved_at: profile.monetization_approved_at || null,
      requirements,
      currentValues,
      allRequirementsMet: allMet,
    });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// POST: Apply for monetization
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Fetch current status
    const { data: baseProfile } = await admin
      .from("profiles")
      .select("account_type, profile_score, email_verified, spam_score, created_at")
      .eq("user_id", user.id)
      .single();

    if (!baseProfile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Monetization columns may not exist yet
    let monData: any = {};
    try {
      const { data } = await admin
        .from("profiles")
        .select("monetization_enabled, monetization_status")
        .eq("user_id", user.id)
        .single();
      monData = data || {};
    } catch {}

    const profile = { ...baseProfile, ...monData };

    if (profile.monetization_enabled) {
      return NextResponse.json({ error: "Monetization already active" }, { status: 400 });
    }

    if (profile.monetization_status === "pending") {
      return NextResponse.json({ error: "Application already pending" }, { status: 400 });
    }

    // Validate requirements
    const now = new Date();
    const accountAge = Math.floor((now.getTime() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24));
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: userPosts } = await admin
      .from("posts")
      .select("id")
      .eq("author_id", user.id)
      .eq("status", "published");

    const postIds = (userPosts || []).map((p: any) => p.id);

    const [
      { count: premiumFollowerCount },
      { count: recentViewCount },
    ] = await Promise.all([
      admin.from("followers").select("id", { count: "exact", head: true })
        .eq("following_id", user.id)
        .eq("status", "accepted")
        .eq("is_premium", true),
      postIds.length > 0
        ? admin.from("post_views").select("id", { count: "exact", head: true })
            .in("post_id", postIds)
            .gte("created_at", thirtyDaysAgo)
        : Promise.resolve({ count: 0 } as any),
    ]);

    const failed: string[] = [];
    if (profile.account_type !== "creator" && profile.account_type !== "business") failed.push("business");
    if ((profile.profile_score || 0) < 40) failed.push("score");
    if ((premiumFollowerCount || 0) < 100) failed.push("followers");
    if ((recentViewCount || 0) < 5000) failed.push("views");
    if (accountAge < 7) failed.push("accountAge");
    if ((profile.spam_score || 0) >= 30) failed.push("spam");
    if (!profile.email_verified) failed.push("email");

    if (failed.length > 0) {
      return NextResponse.json({ error: "Requirements not met", failed }, { status: 400 });
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
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
