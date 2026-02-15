import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_AFFILIATE_DISCOUNT = 20;
// Commission formula: affiliate earns (35 - discount)% of each sale
// e.g. 5% discount → 30% commission, 20% discount → 15% commission
const TOTAL_ALLOCATION = 35;

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

export async function GET() {
  try {
    const supabase = await createClient();
    const user = await verifyAffiliate(supabase);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const admin = createAdminClient();

    // Get affiliate's promo links
    const { data, error } = await admin
      .from("promo_links")
      .select("*")
      .eq("created_by", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    const promoIds = (data || []).map((p: any) => p.id);

    // Get all signup user IDs from affiliate's promos
    let allSignupUserIds: string[] = [];
    let signupsByPromo: Record<string, any[]> = {};
    let totalSignups = 0;

    if (promoIds.length > 0) {
      const { data: signups } = await admin
        .from("promo_signups")
        .select("promo_link_id, user_id, signed_up_at")
        .in("promo_link_id", promoIds)
        .order("signed_up_at", { ascending: false });

      if (signups) {
        totalSignups = signups.length;
        allSignupUserIds = signups.map((s: any) => s.user_id).filter(Boolean);
        for (const s of signups) {
          if (!signupsByPromo[s.promo_link_id]) signupsByPromo[s.promo_link_id] = [];
          signupsByPromo[s.promo_link_id].push(s);
        }
      }
    }

    // Get last 10 users who signed up via affiliate's links (masked info)
    let recentUsers: any[] = [];
    if (allSignupUserIds.length > 0) {
      const last10Ids = allSignupUserIds.slice(0, 10);
      const { data: profiles } = await admin
        .from("profiles")
        .select("user_id, name, surname, created_at")
        .in("user_id", last10Ids);

      // Check which users made purchases (boolean only, no balance exposure)
      const { data: purchasedUsers } = await admin
        .from("coin_payments")
        .select("user_id")
        .in("user_id", last10Ids)
        .eq("status", "completed");

      const purchasedSet = new Set((purchasedUsers || []).map((p: any) => p.user_id));

      if (profiles) {
        const profileMap = new Map(profiles.map((p: any) => [p.user_id, p]));
        recentUsers = last10Ids
          .map((uid: string) => {
            const p = profileMap.get(uid);
            if (!p) return null;
            return {
              name: maskName(p.name, p.surname),
              hasPurchased: purchasedSet.has(uid),
              created_at: p.created_at,
            };
          })
          .filter(Boolean);
      }
    }

    // Calculate earnings per-promo (correct per-promo commission rates)
    let allPaymentsByPromo: { promo_id: string; price_paid: number; created_at: string }[] = [];
    let totalEarnings = 0;

    const promoList = data || [];
    const commissionRate = promoList.length > 0 ? TOTAL_ALLOCATION - promoList[0].discount_percent : 0;

    if (promoList.length > 0 && allSignupUserIds.length > 0) {
      for (const promo of promoList) {
        const promoUserIds = (signupsByPromo[promo.id] || [])
          .map((s: any) => s.user_id)
          .filter(Boolean);

        if (promoUserIds.length === 0) continue;

        const { data: payments } = await admin
          .from("coin_payments")
          .select("price_paid, created_at")
          .in("user_id", promoUserIds)
          .eq("status", "completed");

        if (payments) {
          const rate = TOTAL_ALLOCATION - promo.discount_percent;
          for (const p of payments) {
            allPaymentsByPromo.push({ promo_id: promo.id, price_paid: p.price_paid || 0, created_at: p.created_at });
            totalEarnings += (p.price_paid || 0) * rate / 100;
          }
        }
      }
    }
    totalEarnings = Math.round(totalEarnings * 100) / 100;

    // For period analytics, use per-promo commission rates
    const allPayments = allPaymentsByPromo;

    // Period-based analytics
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - 86400000);
    const last7d = new Date(now.getTime() - 7 * 86400000);
    const last14d = new Date(now.getTime() - 14 * 86400000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Build promo rate lookup for per-promo period calculation
    const promoRateMap = new Map(promoList.map((p: any) => [p.id, TOTAL_ALLOCATION - p.discount_percent]));

    const calcPeriod = (start: Date, end?: Date) => {
      const filtered = allPayments.filter(p => {
        const d = new Date(p.created_at);
        return d >= start && (!end || d < end);
      });
      const revenue = filtered.reduce((sum: number, p) => sum + (p.price_paid || 0), 0);
      // Per-promo earnings calculation
      const earnings = filtered.reduce((sum: number, p) => {
        const rate = promoRateMap.get(p.promo_id) || commissionRate;
        return sum + (p.price_paid || 0) * rate / 100;
      }, 0);
      return {
        purchases: filtered.length,
        revenue: Math.round(revenue * 100) / 100,
        earnings: Math.round(earnings * 100) / 100,
      };
    };

    const totalRevenue = allPayments.reduce((sum: number, p) => sum + (p.price_paid || 0), 0);

    // Signup counts per period
    const allSignupDates = Object.values(signupsByPromo).flat();
    const countSignups = (start: Date, end?: Date) => {
      return allSignupDates.filter(s => {
        const d = new Date(s.signed_up_at);
        return d >= start && (!end || d < end);
      }).length;
    };

    const periodAnalytics = {
      today: { ...calcPeriod(todayStart), signups: countSignups(todayStart) },
      yesterday: { ...calcPeriod(yesterdayStart, todayStart), signups: countSignups(yesterdayStart, todayStart) },
      last7d: { ...calcPeriod(last7d), signups: countSignups(last7d) },
      last14d: { ...calcPeriod(last14d), signups: countSignups(last14d) },
      thisMonth: { ...calcPeriod(monthStart), signups: countSignups(monthStart) },
    };

    // Calculate commission for each promo based on its discount
    const promos = (data || []).map((p: any) => {
      const cr = TOTAL_ALLOCATION - p.discount_percent;
      return {
        ...p,
        signups: signupsByPromo[p.id] || [],
        commission_rate: cr,
      };
    });

    // Get affiliate payment info + payout data + referral earnings
    const [paymentInfoRes, payoutsRes, referralEarningsRes] = await Promise.all([
      admin.from("profiles").select("affiliate_iban, affiliate_holder_name").eq("user_id", user.id).single(),
      admin.from("affiliate_payouts").select("amount, status").eq("affiliate_user_id", user.id),
      admin.from("affiliate_referral_earnings").select("earning_amount").eq("referrer_id", user.id),
    ]);

    const paymentInfo = paymentInfoRes.data;
    const payoutsList = payoutsRes.data || [];
    const totalPaidOut = payoutsList.filter((p: any) => p.status === "approved").reduce((sum: number, p: any) => sum + Number(p.amount), 0);
    const totalPending = payoutsList.filter((p: any) => p.status === "pending").reduce((sum: number, p: any) => sum + Number(p.amount), 0);

    // Add referral earnings to total
    const referralEarnings = (referralEarningsRes.data || []).reduce((sum: number, e: any) => sum + Number(e.earning_amount), 0);
    const combinedEarnings = Math.round((totalEarnings + referralEarnings) * 100) / 100;
    const availableBalance = Math.round((combinedEarnings - totalPaidOut - totalPending) * 100) / 100;

    return NextResponse.json({
      promos,
      analytics: {
        totalSignups,
        totalPurchases: allPayments.length,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalEarnings: combinedEarnings,
        commissionRate,
        periods: periodAnalytics,
        referralEarnings: Math.round(referralEarnings * 100) / 100,
      },
      balance: {
        totalEarnings: combinedEarnings,
        totalPaidOut: Math.round(totalPaidOut * 100) / 100,
        totalPending: Math.round(totalPending * 100) / 100,
        available: Math.max(0, availableBalance),
        canRequestPayout: availableBalance >= 100 && !payoutsList.some((p: any) => p.status === "pending"),
        hasPendingPayout: payoutsList.some((p: any) => p.status === "pending"),
      },
      recentUsers,
      paymentInfo: paymentInfo ? {
        iban: paymentInfo.affiliate_iban || null,
        holderName: paymentInfo.affiliate_holder_name || null,
      } : null,
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error("Affiliate promos GET error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

function maskName(name?: string, surname?: string): string {
  const n = name || "?";
  const s = surname || "";
  const maskedName = n.length > 1 ? n.charAt(0) + "***" : n;
  const maskedSurname = s.length > 1 ? s.charAt(0) + "***" : s;
  return `${maskedName} ${maskedSurname}`.trim();
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await verifyAffiliate(supabase);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { code, discountPercent, maxSignups, expiryHours } = body;

    if (!code || typeof code !== "string" || code.trim().length < 3 || code.trim().length > 10) {
      return NextResponse.json({ error: "Promo kodu 3-10 karakter olmalı" }, { status: 400 });
    }

    // Validate discount is a finite integer
    const parsedDiscount = Number(discountPercent);
    if (!Number.isFinite(parsedDiscount) || !Number.isInteger(parsedDiscount) || parsedDiscount < 1) {
      return NextResponse.json({ error: "Geçersiz indirim yüzdesi" }, { status: 400 });
    }

    // Affiliates: min 5%, max 20% discount
    const MIN_AFFILIATE_DISCOUNT = 5;
    const effectiveDiscount = Math.min(parsedDiscount, user.role === "admin" ? 100 : MAX_AFFILIATE_DISCOUNT);
    if (user.role === "affiliate" && effectiveDiscount < MIN_AFFILIATE_DISCOUNT) {
      return NextResponse.json({ error: "İndirim en az %5 olmalı" }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (cleanCode.length < 3) {
      return NextResponse.json({ error: "Promo kodu en az 3 harf/rakam olmalı" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Affiliates can only create 1 promo code
    if (user.role === "affiliate") {
      const { data: existingOwn } = await admin
        .from("promo_links")
        .select("id")
        .eq("created_by", user.id)
        .limit(1);

      if (existingOwn && existingOwn.length > 0) {
        return NextResponse.json({ error: "Sadece 1 promo kodu oluşturabilirsiniz" }, { status: 400 });
      }
    }

    // Check duplicate code
    const { data: existing } = await admin
      .from("promo_links")
      .select("id")
      .ilike("code", cleanCode)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "Bu promo kodu zaten mevcut" }, { status: 400 });
    }

    // Validate optional fields
    if (maxSignups !== undefined && maxSignups !== null) {
      const parsed = Number(maxSignups);
      if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 1) {
        return NextResponse.json({ error: "Geçersiz kayıt limiti" }, { status: 400 });
      }
    }
    if (expiryHours !== undefined && expiryHours !== null) {
      const parsed = Number(expiryHours);
      if (!Number.isFinite(parsed) || parsed < 1) {
        return NextResponse.json({ error: "Geçersiz süre" }, { status: 400 });
      }
    }

    const expiresAt = expiryHours
      ? new Date(Date.now() + Number(expiryHours) * 60 * 60 * 1000).toISOString()
      : null;

    const { data, error } = await admin
      .from("promo_links")
      .insert({
        code: cleanCode,
        discount_percent: effectiveDiscount,
        max_signups: maxSignups || null,
        expires_at: expiresAt,
        is_active: true,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ promo: data });
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error("Affiliate promos POST error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await verifyAffiliate(supabase);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { iban, holderName } = body;

    if (!iban || typeof iban !== "string" || !holderName || typeof holderName !== "string") {
      return NextResponse.json({ error: "IBAN ve ad soyad gerekli" }, { status: 400 });
    }

    // Validate holder name length
    const cleanHolder = holderName.trim();
    if (cleanHolder.length < 3 || cleanHolder.length > 100) {
      return NextResponse.json({ error: "Ad soyad 3-100 karakter olmalı" }, { status: 400 });
    }

    // Clean and validate IBAN format
    const cleanIban = iban.replace(/\s/g, '').toUpperCase();
    // Must be alphanumeric, 15-34 chars
    if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/.test(cleanIban)) {
      return NextResponse.json({ error: "Geçersiz IBAN formatı" }, { status: 400 });
    }
    // Turkish IBAN: must start with TR, exactly 26 chars
    if (cleanIban.startsWith('TR') && cleanIban.length !== 26) {
      return NextResponse.json({ error: "Türk IBAN'ı 26 karakter olmalıdır" }, { status: 400 });
    }
    // IBAN mod-97 checksum validation
    const rearranged = cleanIban.slice(4) + cleanIban.slice(0, 4);
    const numericStr = rearranged.replace(/[A-Z]/g, (ch) => String(ch.charCodeAt(0) - 55));
    let remainder = 0;
    for (let i = 0; i < numericStr.length; i++) {
      remainder = (remainder * 10 + parseInt(numericStr[i])) % 97;
    }
    if (remainder !== 1) {
      return NextResponse.json({ error: "Geçersiz IBAN kontrol hanesi" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from("profiles")
      .update({
        affiliate_iban: cleanIban,
        affiliate_holder_name: cleanHolder,
      })
      .eq("user_id", user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error("Affiliate payment info PUT error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await verifyAffiliate(supabase);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { promoId } = await request.json();
    if (!promoId) {
      return NextResponse.json({ error: "Missing promoId" }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: promo } = await admin
      .from("promo_links")
      .select("id, created_by")
      .eq("id", promoId)
      .single();

    if (!promo || (promo.created_by !== user.id && user.role !== "admin")) {
      return NextResponse.json({ error: "Bu promo size ait değil" }, { status: 403 });
    }

    // Guard: cannot delete promo if it has signups with completed payments (audit trail)
    const { data: promoSignups } = await admin
      .from("promo_signups")
      .select("user_id")
      .eq("promo_link_id", promoId);

    if (promoSignups && promoSignups.length > 0) {
      const signupUserIds = promoSignups.map(s => s.user_id).filter(Boolean);
      if (signupUserIds.length > 0) {
        const { count } = await admin
          .from("coin_payments")
          .select("id", { count: "exact", head: true })
          .in("user_id", signupUserIds)
          .eq("status", "completed");

        if (count && count > 0) {
          return NextResponse.json({
            error: "Bu promo ile ilişkili ödemeler var, silinemez. Devre dışı bırakabilirsiniz.",
          }, { status: 400 });
        }
      }
    }

    // Safe to delete — no revenue associated
    await admin.from("promo_signups").delete().eq("promo_link_id", promoId);
    await admin.from("coupons").delete().eq("promo_link_id", promoId);
    const { error } = await admin.from("promo_links").delete().eq("id", promoId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error("Affiliate promos DELETE error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
