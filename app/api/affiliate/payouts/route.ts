import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const MIN_PAYOUT = 100;
const TOTAL_ALLOCATION = 35;
const AUTO_PAYOUT_INTERVAL_DAYS = 7;

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

// Calculate affiliate earnings per-promo (correct calculation) + referral earnings
async function calculateEarnings(admin: ReturnType<typeof createAdminClient>, userId: string) {
  const { data: promos } = await admin
    .from("promo_links")
    .select("id, discount_percent")
    .eq("created_by", userId);

  if (!promos || promos.length === 0) {
    return { totalEarnings: 0, commissionRate: 0 };
  }

  const promoIds = promos.map(p => p.id);

  const { data: signups } = await admin
    .from("promo_signups")
    .select("user_id, promo_link_id")
    .in("promo_link_id", promoIds);

  if (!signups || signups.length === 0) {
    return { totalEarnings: 0, commissionRate: TOTAL_ALLOCATION - promos[0].discount_percent };
  }

  // Calculate per-promo earnings for correct commission rates
  let totalEarnings = 0;
  for (const promo of promos) {
    const promoUserIds = signups
      .filter(s => s.promo_link_id === promo.id)
      .map(s => s.user_id)
      .filter(Boolean);

    if (promoUserIds.length === 0) continue;

    const { data: payments } = await admin
      .from("coin_payments")
      .select("price_paid")
      .in("user_id", promoUserIds)
      .eq("status", "completed");

    const revenue = payments?.reduce((sum, p) => sum + (p.price_paid || 0), 0) || 0;
    const rate = TOTAL_ALLOCATION - promo.discount_percent;
    totalEarnings += revenue * rate / 100;
  }

  totalEarnings = Math.round(totalEarnings * 100) / 100;
  const commissionRate = TOTAL_ALLOCATION - promos[0].discount_percent;

  // Add referral earnings (5% of invited affiliates' payouts)
  const { data: referralEarnings } = await admin
    .from("affiliate_referral_earnings")
    .select("earning_amount")
    .eq("referrer_id", userId);

  const totalReferralEarnings = (referralEarnings || []).reduce(
    (sum, e) => sum + Number(e.earning_amount), 0
  );

  return {
    totalEarnings: Math.round((totalEarnings + totalReferralEarnings) * 100) / 100,
    commissionRate,
  };
}

export async function GET() {
  try {
    const supabase = await createClient();
    const user = await verifyAffiliate(supabase);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const admin = createAdminClient();

    const { totalEarnings, commissionRate } = await calculateEarnings(admin, user.id);

    // Get all payouts (read-only, no side effects)
    const { data: payouts } = await admin
      .from("affiliate_payouts")
      .select("*")
      .eq("affiliate_user_id", user.id)
      .order("requested_at", { ascending: false });

    const allPayouts = payouts || [];
    const totalPaidOut = allPayouts
      .filter(p => p.status === "approved")
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const totalPending = allPayouts
      .filter(p => p.status === "pending")
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const availableBalance = Math.round((totalEarnings - totalPaidOut - totalPending) * 100) / 100;
    const hasPending = allPayouts.some(p => p.status === "pending");

    // Calculate next auto-payout date (info only, no write)
    const lastRequest = allPayouts[0];
    const nextAutoDate = lastRequest
      ? new Date(new Date(lastRequest.requested_at).getTime() + AUTO_PAYOUT_INTERVAL_DAYS * 86400000).toISOString()
      : null;

    // Check if auto-payout should be triggered (client will call POST)
    let autoPayoutReady = false;
    if (availableBalance >= MIN_PAYOUT && !hasPending) {
      const { data: profile } = await admin
        .from("profiles")
        .select("affiliate_iban, affiliate_holder_name")
        .eq("user_id", user.id)
        .single();

      if (profile?.affiliate_iban && profile?.affiliate_holder_name) {
        if (!lastRequest) {
          autoPayoutReady = true;
        } else {
          const daysSince = (Date.now() - new Date(lastRequest.requested_at).getTime()) / (1000 * 60 * 60 * 24);
          autoPayoutReady = daysSince >= AUTO_PAYOUT_INTERVAL_DAYS;
        }
      }
    }

    return NextResponse.json({
      balance: {
        totalEarnings,
        totalPaidOut: Math.round(totalPaidOut * 100) / 100,
        totalPending: Math.round(totalPending * 100) / 100,
        available: Math.max(0, availableBalance),
        commissionRate,
        canRequestPayout: availableBalance >= MIN_PAYOUT && !hasPending,
        minPayout: MIN_PAYOUT,
        nextAutoDate,
        autoPayoutDays: AUTO_PAYOUT_INTERVAL_DAYS,
        autoPayoutReady,
      },
      payouts: allPayouts,
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error("Affiliate payouts GET error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await verifyAffiliate(supabase);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const admin = createAdminClient();
    const body = await request.json().catch(() => ({}));
    const isAuto = body?.auto === true;

    // Check for existing pending payout
    const { data: existingPending } = await admin
      .from("affiliate_payouts")
      .select("id")
      .eq("affiliate_user_id", user.id)
      .eq("status", "pending")
      .limit(1);

    if (existingPending && existingPending.length > 0) {
      return NextResponse.json({ error: "Zaten bekleyen bir ödeme talebiniz var" }, { status: 400 });
    }

    // Calculate available balance
    const { totalEarnings } = await calculateEarnings(admin, user.id);

    const { data: payouts } = await admin
      .from("affiliate_payouts")
      .select("amount, status")
      .eq("affiliate_user_id", user.id);

    const totalPaidOut = (payouts || [])
      .filter(p => p.status === "approved")
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const totalPending = (payouts || [])
      .filter(p => p.status === "pending")
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const available = Math.round((totalEarnings - totalPaidOut - totalPending) * 100) / 100;

    if (available < MIN_PAYOUT) {
      return NextResponse.json({ error: `Minimum ödeme tutarı ${MIN_PAYOUT} TRY'dir. Mevcut bakiye: ${available.toFixed(2)} TRY` }, { status: 400 });
    }

    // Check IBAN exists
    const { data: profile } = await admin
      .from("profiles")
      .select("affiliate_iban, affiliate_holder_name")
      .eq("user_id", user.id)
      .single();

    if (!profile?.affiliate_iban || !profile?.affiliate_holder_name) {
      return NextResponse.json({ error: "Önce ödeme bilgilerinizi (IBAN) kaydedin" }, { status: 400 });
    }

    // Create payout request (unique index prevents duplicates at DB level)
    const { data: payout, error } = await admin
      .from("affiliate_payouts")
      .insert({
        affiliate_user_id: user.id,
        amount: available,
        status: "pending",
        admin_note: isAuto ? "Otomatik talep (7 gün)" : null,
      })
      .select()
      .single();

    if (error) {
      // Unique index violation = already has pending payout
      if (error.code === "23505") {
        return NextResponse.json({ error: "Zaten bekleyen bir ödeme talebiniz var" }, { status: 400 });
      }
      throw error;
    }

    return NextResponse.json({ payout });
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error("Affiliate payouts POST error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
