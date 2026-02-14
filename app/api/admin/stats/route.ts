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

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Use admin client (service_role) to bypass RLS
    const admin = createAdminClient();

    const [usersRes, paymentsRes, todayPaymentsRes, projectsRes, recentUsersRes] = await Promise.all([
      admin.from("profiles").select("*", { count: "exact", head: true }),
      admin.from("coin_payments").select("price_paid, coins_purchased", { count: "exact" }).eq("status", "completed"),
      admin.from("coin_payments").select("price_paid, coins_purchased").eq("status", "completed").gte("completed_at", new Date().toISOString().split("T")[0]),
      admin.from("projects").select("*", { count: "exact", head: true }).eq("is_published", true),
      admin.from("profiles").select("name, surname, full_name, coin_balance, created_at").order("created_at", { ascending: false }).limit(10),
    ]);

    return NextResponse.json({
      totalUsers: usersRes.count || 0,
      totalPayments: paymentsRes.count || 0,
      totalRevenueTRY: paymentsRes.data?.reduce((s: number, p: any) => s + (p.price_paid || 0), 0) || 0,
      totalCoins: paymentsRes.data?.reduce((s: number, p: any) => s + (p.coins_purchased || 0), 0) || 0,
      todayRevenueTRY: todayPaymentsRes.data?.reduce((s: number, p: any) => s + (p.price_paid || 0), 0) || 0,
      todayPayments: todayPaymentsRes.data?.length || 0,
      publishedPages: projectsRes.count || 0,
      recentUsers: recentUsersRes.data || [],
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error("Admin stats error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
