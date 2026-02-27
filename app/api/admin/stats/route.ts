import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    // Auth check: verify caller is admin
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use admin client (service_role) to bypass RLS
    const admin = createAdminClient();

    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [usersRes, paymentsRes, todayPaymentsRes, projectsRes, recentUsersRes, platformViewsRes, contentTypeRes, recentViewsRes] = await Promise.all([
      admin.from("profiles").select("*", { count: "exact", head: true }),
      admin.from("coin_payments").select("price_paid, coins_purchased", { count: "exact" }).eq("status", "completed"),
      admin.from("coin_payments").select("price_paid, coins_purchased").eq("status", "completed").gte("completed_at", new Date().toISOString().split("T")[0]),
      admin.from("projects").select("*", { count: "exact", head: true }).eq("is_published", true),
      admin.from("profiles").select("name, surname, full_name, coin_balance, created_at").order("created_at", { ascending: false }).limit(10),
      admin.from("post_views").select("id", { count: "exact", head: true }),
      admin.from("posts").select("content_type").eq("status", "published"),
      admin.from("post_views").select("id", { count: "exact", head: true }).gte("created_at", thirtyDaysAgo),
    ]);

    // Content type distribution
    const contentByType: Record<string, number> = {};
    for (const p of contentTypeRes.data || []) {
      const ct = p.content_type || "post";
      contentByType[ct] = (contentByType[ct] || 0) + 1;
    }

    return NextResponse.json({
      totalUsers: usersRes.count || 0,
      totalPayments: paymentsRes.count || 0,
      totalRevenueTRY: paymentsRes.data?.reduce((s: number, p: any) => s + (p.price_paid || 0), 0) || 0,
      totalCoins: paymentsRes.data?.reduce((s: number, p: any) => s + (p.coins_purchased || 0), 0) || 0,
      todayRevenueTRY: todayPaymentsRes.data?.reduce((s: number, p: any) => s + (p.price_paid || 0), 0) || 0,
      todayPayments: todayPaymentsRes.data?.length || 0,
      publishedPages: projectsRes.count || 0,
      recentUsers: recentUsersRes.data || [],
      totalPlatformViews: platformViewsRes.count || 0,
      contentByType,
      viewsLast30d: recentViewsRes.count || 0,
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error("Admin stats error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
