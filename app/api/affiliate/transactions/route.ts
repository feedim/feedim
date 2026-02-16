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

function maskName(name?: string, surname?: string): string {
  const n = name || "?";
  const s = surname || "";
  const maskedN = n.length > 1 ? n.charAt(0) + "***" : n;
  const maskedS = s.length > 1 ? s.charAt(0) + "***" : s;
  return `${maskedN} ${maskedS}`.trim();
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

    // 1. Satış komisyonları (affiliate_commissions — kendi satışları)
    const { data: commissions } = await admin
      .from("affiliate_commissions")
      .select("id, sale_amount, commission_rate, commission_amount, created_at")
      .eq("affiliate_user_id", user.id)
      .gte("created_at", startIso)
      .order("created_at", { ascending: false });

    // 2. Referans kazançları (affiliate_commissions — referrer olarak)
    const { data: refCommissions } = await admin
      .from("affiliate_commissions")
      .select("id, affiliate_user_id, referrer_earning, created_at")
      .eq("referrer_id", user.id)
      .gt("referrer_earning", 0)
      .gte("created_at", startIso)
      .order("created_at", { ascending: false });

    // 3. Onaylanmış ödeme çekimleri
    const { data: payouts } = await admin
      .from("affiliate_payouts")
      .select("id, amount, status, requested_at, processed_at")
      .eq("affiliate_user_id", user.id)
      .eq("status", "approved")
      .gte("requested_at", startIso)
      .order("requested_at", { ascending: false });

    // Get profiles for referral commission masking
    const refAffiliateIds = [...new Set((refCommissions || []).map(e => e.affiliate_user_id))];
    let profileMap = new Map<string, { name: string; surname: string }>();
    if (refAffiliateIds.length > 0) {
      const { data: profiles } = await admin
        .from("profiles")
        .select("user_id, name, surname")
        .in("user_id", refAffiliateIds);
      profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
    }

    // Build combined transaction list
    const transactions: { id: string; type: string; amount: number; date: string; detail: string }[] = [];

    // Satış komisyonları
    for (const c of (commissions || [])) {
      transactions.push({
        id: `comm_${c.id}`,
        type: "commission",
        amount: Number(c.commission_amount),
        date: c.created_at,
        detail: `Satış komisyonu (%${c.commission_rate}) — ${Number(c.sale_amount).toFixed(2)} TL satış`,
      });
    }

    // Referans kazançları
    for (const rc of (refCommissions || [])) {
      const prof = profileMap.get(rc.affiliate_user_id);
      transactions.push({
        id: `refcomm_${rc.id}`,
        type: "referral",
        amount: Number(rc.referrer_earning),
        date: rc.created_at,
        detail: `Referans kazancı (${maskName(prof?.name, prof?.surname)})`,
      });
    }

    // Ödeme çekimleri
    for (const p of (payouts || [])) {
      transactions.push({
        id: `payout_${p.id}`,
        type: "payout",
        amount: -Number(p.amount),
        date: p.processed_at || p.requested_at,
        detail: "Ödeme çekimi",
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
