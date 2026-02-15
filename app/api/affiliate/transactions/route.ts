import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function verifyAffiliate(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (profile?.role !== "affiliate" && profile?.role !== "admin") return null;
  return { ...user, role: profile?.role };
}

const PAGE_SIZE = 20;

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await verifyAffiliate(supabase);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const period = searchParams.get("period") || "last3m";

    // Calculate date filter
    const now = new Date();
    let startDate: Date;
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - 86400000);

    switch (period) {
      case "today":
        startDate = todayStart;
        break;
      case "yesterday":
        startDate = yesterdayStart;
        break;
      case "last7d":
        startDate = new Date(now.getTime() - 7 * 86400000);
        break;
      case "last14d":
        startDate = new Date(now.getTime() - 14 * 86400000);
        break;
      case "thisMonth":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "last3m":
      default:
        startDate = new Date(now.getTime() - 90 * 86400000);
        break;
    }

    const startIso = startDate.toISOString();
    const admin = createAdminClient();

    // Fetch approved payouts
    const { data: payouts } = await admin
      .from("affiliate_payouts")
      .select("id, amount, status, requested_at, processed_at")
      .eq("affiliate_user_id", user.id)
      .eq("status", "approved")
      .gte("requested_at", startIso)
      .order("requested_at", { ascending: false });

    // Fetch referral earnings
    const { data: referralEarnings } = await admin
      .from("affiliate_referral_earnings")
      .select("id, referred_id, earning_amount, created_at")
      .eq("referrer_id", user.id)
      .gte("created_at", startIso)
      .order("created_at", { ascending: false });

    // Get referred profiles for masking
    const referredIds = [...new Set((referralEarnings || []).map(e => e.referred_id))];
    let profileMap = new Map<string, { name: string; surname: string }>();
    if (referredIds.length > 0) {
      const { data: profiles } = await admin
        .from("profiles")
        .select("user_id, name, surname")
        .in("user_id", referredIds);
      profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
    }

    // Build combined transaction list
    const transactions: { id: string; type: string; amount: number; date: string; detail: string }[] = [];

    for (const p of (payouts || [])) {
      transactions.push({
        id: `payout_${p.id}`,
        type: "payout",
        amount: -Number(p.amount),
        date: p.processed_at || p.requested_at,
        detail: "Ödeme çekimi",
      });
    }

    for (const e of (referralEarnings || [])) {
      const prof = profileMap.get(e.referred_id);
      const n = prof?.name || "?";
      const s = prof?.surname || "";
      const maskedName = (n.length > 1 ? n.charAt(0) + "***" : n) + " " + (s.length > 1 ? s.charAt(0) + "***" : s);
      transactions.push({
        id: `ref_${e.id}`,
        type: "referral",
        amount: Number(e.earning_amount),
        date: e.created_at,
        detail: `Referans kazancı (${maskedName.trim()})`,
      });
    }

    // Sort by date descending
    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Paginate
    const totalItems = transactions.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    const offset = (page - 1) * PAGE_SIZE;
    const paginatedTransactions = transactions.slice(offset, offset + PAGE_SIZE);

    return NextResponse.json({
      transactions: paginatedTransactions,
      pagination: {
        page,
        totalPages,
        totalItems,
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error("Affiliate transactions GET error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
