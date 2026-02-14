import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const TOTAL_ALLOCATION = 35;

async function verifyAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (profile?.role !== "admin") return null;
  return user;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const user = await verifyAdmin(supabase);
    if (!user) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const admin = createAdminClient();

    // Get all payouts with affiliate info
    const { data: payouts, error } = await admin
      .from("affiliate_payouts")
      .select("*")
      .order("requested_at", { ascending: false });

    if (error) throw error;

    // Enrich with affiliate details
    const enriched = await Promise.all(
      (payouts || []).map(async (payout) => {
        const { data: profile } = await admin
          .from("profiles")
          .select("name, surname, affiliate_iban, affiliate_holder_name")
          .eq("user_id", payout.affiliate_user_id)
          .single();

        // Get email
        const { data: authUser } = await admin.auth.admin.getUserById(payout.affiliate_user_id);

        return {
          ...payout,
          affiliate_name: profile ? `${profile.name || ""} ${profile.surname || ""}`.trim() : "—",
          affiliate_email: authUser?.user?.email || "—",
          affiliate_iban: profile?.affiliate_iban || null,
          affiliate_holder_name: profile?.affiliate_holder_name || null,
        };
      })
    );

    // Summary
    const pending = enriched.filter(p => p.status === "pending");
    const approved = enriched.filter(p => p.status === "approved");
    const rejected = enriched.filter(p => p.status === "rejected");

    return NextResponse.json({
      payouts: enriched,
      summary: {
        pendingCount: pending.length,
        pendingTotal: pending.reduce((sum, p) => sum + Number(p.amount), 0),
        approvedCount: approved.length,
        approvedTotal: approved.reduce((sum, p) => sum + Number(p.amount), 0),
        rejectedCount: rejected.length,
      },
    });
  } catch (error) {
    console.error("Admin affiliate payouts GET error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await verifyAdmin(supabase);
    if (!user) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { payoutId, action, adminNote } = await request.json();

    if (!payoutId || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Verify payout exists and is pending
    const { data: payout } = await admin
      .from("affiliate_payouts")
      .select("*")
      .eq("id", payoutId)
      .eq("status", "pending")
      .single();

    if (!payout) {
      return NextResponse.json({ error: "Ödeme talebi bulunamadı veya zaten işlenmiş" }, { status: 404 });
    }

    const newStatus = action === "approve" ? "approved" : "rejected";

    // Re-verify balance before approval to prevent over-payment
    if (action === "approve") {
      const affiliateId = payout.affiliate_user_id;

      // Calculate total earnings per-promo
      const { data: promos } = await admin
        .from("promo_links")
        .select("id, discount_percent")
        .eq("created_by", affiliateId);

      let totalEarnings = 0;
      if (promos && promos.length > 0) {
        const promoIds = promos.map(p => p.id);
        const { data: signups } = await admin
          .from("promo_signups")
          .select("user_id, promo_link_id")
          .in("promo_link_id", promoIds);

        if (signups && signups.length > 0) {
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
        }
      }
      totalEarnings = Math.round(totalEarnings * 100) / 100;

      // Get all approved/pending payouts EXCEPT this one
      const { data: otherPayouts } = await admin
        .from("affiliate_payouts")
        .select("amount, status")
        .eq("affiliate_user_id", affiliateId)
        .neq("id", payoutId);

      const totalPaidOut = (otherPayouts || [])
        .filter(p => p.status === "approved")
        .reduce((sum, p) => sum + Number(p.amount), 0);
      const totalOtherPending = (otherPayouts || [])
        .filter(p => p.status === "pending")
        .reduce((sum, p) => sum + Number(p.amount), 0);

      const availableBalance = Math.round((totalEarnings - totalPaidOut - totalOtherPending) * 100) / 100;

      if (Number(payout.amount) > availableBalance) {
        return NextResponse.json({
          error: `Yetersiz bakiye. Talep: ${payout.amount} TRY, Mevcut: ${availableBalance.toFixed(2)} TRY`,
        }, { status: 400 });
      }
    }

    // Idempotent update: only update if status is still "pending"
    const { data: updated, error } = await admin
      .from("affiliate_payouts")
      .update({
        status: newStatus,
        processed_at: new Date().toISOString(),
        processed_by: user.id,
        admin_note: adminNote || null,
      })
      .eq("id", payoutId)
      .eq("status", "pending")
      .select()
      .single();

    if (error || !updated) {
      return NextResponse.json({ error: "Ödeme talebi zaten işlenmiş" }, { status: 409 });
    }

    return NextResponse.json({ success: true, status: newStatus });
  } catch (error) {
    console.error("Admin affiliate payouts PUT error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
