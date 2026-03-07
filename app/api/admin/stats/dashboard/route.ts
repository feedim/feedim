import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTranslations } from "next-intl/server";
import { safeError } from "@/lib/apiError";

export async function GET(request: NextRequest) {
  try {
    const tErrors = await getTranslations("apiErrors");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: tErrors("unauthorized") }, { status: 401 });
    }

    const admin = createAdminClient();

    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: tErrors("accessDenied") }, { status: 403 });
    }

    const metrics = request.nextUrl.searchParams.get("metrics");
    const requestedMetrics = metrics ? metrics.split(",").filter(Boolean) : [];

    // Fixed stats — always returned
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const [activeRes, premiumCountRes, premiumPlansRes, coinRevenueRes] = await Promise.all([
      admin.from("profiles").select("*", { count: "exact", head: true }).gte("last_active_at", fiveMinAgo),
      admin.from("profiles").select("*", { count: "exact", head: true }).eq("is_premium", true),
      admin.from("profiles").select("premium_plan").eq("is_premium", true),
      admin.from("coin_payments").select("price_paid").eq("status", "completed"),
    ]);

    const premiumByPlan: Record<string, number> = {};
    for (const p of premiumPlansRes.data || []) {
      const plan = p.premium_plan || "unknown";
      premiumByPlan[plan] = (premiumByPlan[plan] || 0) + 1;
    }

    const coinRevenue = (coinRevenueRes.data || []).reduce((s: number, p: any) => s + (p.price_paid || 0), 0);

    const result: Record<string, any> = {
      activeUsers: activeRes.count || 0,
      premiumTotal: premiumCountRes.count || 0,
      premiumByPlan,
      coinRevenue,
    };

    // Queryable metrics
    if (requestedMetrics.length > 0) {
      const today = new Date().toISOString().split("T")[0];
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const queries: Record<string, any> = {};

      const m = new Set(requestedMetrics);

      // Users
      if (m.has("totalUsers")) queries.totalUsers = admin.from("profiles").select("*", { count: "exact", head: true });
      if (m.has("usersByStatus")) queries.usersByStatus = admin.from("profiles").select("status");
      if (m.has("todayNewUsers")) queries.todayNewUsers = admin.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", today);
      if (m.has("verifiedUsers")) queries.verifiedUsers = admin.from("profiles").select("*", { count: "exact", head: true }).eq("is_verified", true);

      // Content
      if (m.has("totalPosts")) queries.totalPosts = admin.from("posts").select("*", { count: "exact", head: true }).eq("status", "published");
      if (m.has("postsByType")) queries.postsByType = admin.from("posts").select("content_type").eq("status", "published");
      if (m.has("totalViews")) queries.totalViews = admin.from("post_views").select("*", { count: "exact", head: true });
      if (m.has("views30d")) queries.views30d = admin.from("post_views").select("*", { count: "exact", head: true }).gte("created_at", thirtyDaysAgo);
      if (m.has("totalComments")) queries.totalComments = admin.from("comments").select("*", { count: "exact", head: true }).eq("status", "approved");
      if (m.has("todayComments")) queries.todayComments = admin.from("comments").select("*", { count: "exact", head: true }).eq("status", "approved").gte("created_at", today);
      if (m.has("flaggedComments")) queries.flaggedComments = admin.from("comments").select("*", { count: "exact", head: true }).eq("is_nsfw", true).eq("status", "approved");
      if (m.has("removedComments")) queries.removedComments = admin.from("comments").select("*", { count: "exact", head: true }).eq("status", "removed");

      // Moderation
      if (m.has("moderatedPosts")) queries.moderatedPosts = admin.from("posts").select("*", { count: "exact", head: true }).eq("status", "moderation");
      if (m.has("removedPosts")) queries.removedPosts = admin.from("moderation_decisions").select("*", { count: "exact", head: true }).eq("target_type", "post").eq("decision", "removed");
      if (m.has("approvedPosts")) queries.approvedPosts = admin.from("moderation_decisions").select("*", { count: "exact", head: true }).eq("target_type", "post").eq("decision", "approved");
      if (m.has("moderatedAccounts")) queries.moderatedAccounts = admin.from("moderation_decisions").select("*", { count: "exact", head: true }).eq("target_type", "user").eq("decision", "moderation");
      if (m.has("blockedAccounts")) queries.blockedAccounts = admin.from("moderation_decisions").select("*", { count: "exact", head: true }).eq("target_type", "user").eq("decision", "blocked");
      if (m.has("deletedAccounts")) queries.deletedAccounts = admin.from("profiles").select("*", { count: "exact", head: true }).eq("status", "deleted");

      // Finance
      if (m.has("premiumRevenue")) queries.premiumRevenue = admin.from("premium_payments").select("price_paid").eq("status", "completed");
      if (m.has("coinRevenue")) queries.coinRevenue = admin.from("coin_payments").select("price_paid").eq("status", "completed");
      if (m.has("todayCoinRevenue")) queries.todayCoinRevenue = admin.from("coin_payments").select("price_paid").eq("status", "completed").gte("completed_at", today);
      if (m.has("todayPurchasedCoins")) queries.todayPurchasedCoins = admin.from("coin_transactions").select("amount").eq("type", "purchase").gte("created_at", today);
      if (m.has("totalSpentCoins")) queries.totalSpentCoins = admin.from("coin_transactions").select("amount").eq("type", "gift_sent");
      if (m.has("todaySpentCoins")) queries.todaySpentCoins = admin.from("coin_transactions").select("amount").eq("type", "gift_sent").gte("created_at", today);
      if (m.has("last30dPurchasedCoins")) queries.last30dPurchasedCoins = admin.from("coin_transactions").select("amount").eq("type", "purchase").gte("created_at", thirtyDaysAgo);
      if (m.has("last30dSpentCoins")) queries.last30dSpentCoins = admin.from("coin_transactions").select("amount").eq("type", "gift_sent").gte("created_at", thirtyDaysAgo);
      if (m.has("totalEarnedCoins")) queries.totalEarnedCoins = admin.from("coin_transactions").select("amount").eq("type", "read_earning");
      if (m.has("totalWithdrawnCoins")) queries.totalWithdrawnCoins = admin.from("coin_transactions").select("amount").eq("type", "withdrawal");
      if (m.has("totalWithdrawals")) queries.totalWithdrawals = admin.from("withdrawal_requests").select("*", { count: "exact", head: true });
      if (m.has("pendingWithdrawals")) queries.pendingWithdrawals = admin.from("withdrawal_requests").select("*", { count: "exact", head: true }).eq("status", "pending");

      // Reports
      if (m.has("totalReports")) queries.totalReports = admin.from("reports").select("*", { count: "exact", head: true });
      if (m.has("pendingReports")) queries.pendingReports = admin.from("reports").select("*", { count: "exact", head: true }).eq("status", "pending");
      if (m.has("copyrightStrikes")) queries.copyrightStrikes = admin.from("profiles").select("*", { count: "exact", head: true }).gt("copyright_strike_count", 0);

      const keys = Object.keys(queries);
      const results = await Promise.all(Object.values(queries));

      const queryResults: Record<string, any> = {};
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const res = results[i];

        if (key === "usersByStatus") {
          const grouped: Record<string, number> = {};
          for (const row of res.data || []) {
            const s = row.status || "unknown";
            grouped[s] = (grouped[s] || 0) + 1;
          }
          queryResults[key] = grouped;
        } else if (key === "postsByType") {
          const grouped: Record<string, number> = {};
          for (const row of res.data || []) {
            const ct = row.content_type || "post";
            grouped[ct] = (grouped[ct] || 0) + 1;
          }
          queryResults[key] = grouped;
        } else if (key === "premiumRevenue" || key === "coinRevenue" || key === "todayCoinRevenue") {
          queryResults[key] = (res.data || []).reduce((s: number, r: any) => s + (r.price_paid || 0), 0);
        } else if (["todayPurchasedCoins", "totalSpentCoins", "todaySpentCoins", "last30dPurchasedCoins", "last30dSpentCoins", "totalEarnedCoins", "totalWithdrawnCoins"].includes(key)) {
          queryResults[key] = (res.data || []).reduce((s: number, r: any) => s + Math.abs(r.amount || 0), 0);
        } else {
          queryResults[key] = res.count ?? (res.data?.length || 0);
        }
      }

      result.queryResults = queryResults;
    }

    return NextResponse.json(result);
  } catch (error) {
    return safeError(error);
  }
}
