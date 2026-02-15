import { NextResponse } from "next/server";
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

// GET: Referral stats for the affiliate dashboard
export async function GET() {
  try {
    const supabase = await createClient();
    const user = await verifyAffiliate(supabase);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const admin = createAdminClient();

    // Get affiliate's promo code (used as referral code)
    const { data: promo } = await admin
      .from("promo_links")
      .select("code")
      .eq("created_by", user.id)
      .limit(1)
      .maybeSingle();

    const referralCode = promo?.code || null;

    // Get affiliates referred by this user
    const { data: referrals } = await admin
      .from("affiliate_referrals")
      .select("referred_id, referral_code, created_at")
      .eq("referrer_id", user.id)
      .order("created_at", { ascending: false });

    const referralList = referrals || [];
    const referredIds = referralList.map(r => r.referred_id);

    // Get referred affiliates' profiles (masked)
    let referredAffiliates: { name: string; joinedAt: string; totalEarnings: number }[] = [];
    if (referredIds.length > 0) {
      const { data: profiles } = await admin
        .from("profiles")
        .select("user_id, name, surname")
        .in("user_id", referredIds);

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

      // Get referral earnings grouped by referred_id
      const { data: earnings } = await admin
        .from("affiliate_referral_earnings")
        .select("referred_id, earning_amount")
        .eq("referrer_id", user.id);

      const earningsByReferred = new Map<string, number>();
      for (const e of (earnings || [])) {
        earningsByReferred.set(
          e.referred_id,
          (earningsByReferred.get(e.referred_id) || 0) + Number(e.earning_amount)
        );
      }

      referredAffiliates = referralList.map(ref => {
        const p = profileMap.get(ref.referred_id);
        const n = p?.name || "?";
        const s = p?.surname || "";
        const maskedName = (n.length > 1 ? n.charAt(0) + "***" : n) + " " + (s.length > 1 ? s.charAt(0) + "***" : s);
        return {
          name: maskedName.trim(),
          joinedAt: ref.created_at,
          totalEarnings: Math.round((earningsByReferred.get(ref.referred_id) || 0) * 100) / 100,
        };
      });
    }

    // Total referral earnings
    const { data: allEarnings } = await admin
      .from("affiliate_referral_earnings")
      .select("earning_amount")
      .eq("referrer_id", user.id);

    const totalReferralEarnings = Math.round(
      (allEarnings || []).reduce((sum, e) => sum + Number(e.earning_amount), 0) * 100
    ) / 100;

    // Check if this user was referred by someone
    const { data: myReferral } = await admin
      .from("affiliate_referrals")
      .select("referrer_id")
      .eq("referred_id", user.id)
      .maybeSingle();

    return NextResponse.json({
      referralCode,
      referralLink: referralCode ? `https://forilove.com/affiliate?ref=${referralCode}` : null,
      referredCount: referralList.length,
      referredAffiliates,
      totalReferralEarnings,
      wasReferred: !!myReferral,
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error("Affiliate referral GET error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
