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
        .select("user_id, name, surname, coin_balance, created_at")
        .in("user_id", last10Ids);

      if (profiles) {
        const profileMap = new Map(profiles.map((p: any) => [p.user_id, p]));
        recentUsers = last10Ids
          .map((uid: string) => profileMap.get(uid))
          .filter(Boolean)
          .map((p: any) => ({
            name: maskName(p.name, p.surname),
            coin_balance: p.coin_balance || 0,
            created_at: p.created_at,
          }));
      }
    }

    // Calculate earnings from affiliate's referred users' payments
    let totalRevenue = 0;
    let totalEarnings = 0;
    let totalPurchases = 0;

    if (allSignupUserIds.length > 0) {
      const { data: payments } = await admin
        .from("coin_payments")
        .select("price_paid")
        .in("user_id", allSignupUserIds)
        .eq("status", "completed");

      if (payments) {
        totalPurchases = payments.length;
        totalRevenue = payments.reduce((sum: number, p: any) => sum + (p.price_paid || 0), 0);
      }
    }

    // Calculate commission for each promo based on its discount
    const promos = (data || []).map((p: any) => {
      const commissionRate = TOTAL_ALLOCATION - p.discount_percent;
      return {
        ...p,
        signups: signupsByPromo[p.id] || [],
        commission_rate: commissionRate,
      };
    });

    // Use first promo's discount for overall commission calculation
    if (data && data.length > 0) {
      const commissionRate = TOTAL_ALLOCATION - data[0].discount_percent;
      totalEarnings = Math.round((totalRevenue * commissionRate / 100) * 100) / 100;
    }

    // Get affiliate payment info
    const { data: paymentInfo } = await admin
      .from("profiles")
      .select("affiliate_iban, affiliate_holder_name")
      .eq("user_id", user.id)
      .single();

    return NextResponse.json({
      promos,
      analytics: {
        totalSignups,
        totalPurchases,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalEarnings,
        commissionRate: data && data.length > 0 ? TOTAL_ALLOCATION - data[0].discount_percent : 0,
      },
      recentUsers,
      paymentInfo: paymentInfo ? {
        iban: paymentInfo.affiliate_iban || null,
        holderName: paymentInfo.affiliate_holder_name || null,
      } : null,
    });
  } catch (error) {
    console.error("Affiliate promos GET error:", error);
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

    // Affiliates: min 5%, max 20% discount
    const MIN_AFFILIATE_DISCOUNT = 5;
    const effectiveDiscount = Math.min(discountPercent || MIN_AFFILIATE_DISCOUNT, user.role === "admin" ? 100 : MAX_AFFILIATE_DISCOUNT);
    if (user.role === "affiliate" && effectiveDiscount < MIN_AFFILIATE_DISCOUNT) {
      return NextResponse.json({ error: "İndirim en az %5 olmalı" }, { status: 400 });
    }
    if (effectiveDiscount < 1) {
      return NextResponse.json({ error: "İndirim en az %1 olmalı" }, { status: 400 });
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

    const expiresAt = expiryHours
      ? new Date(Date.now() + expiryHours * 60 * 60 * 1000).toISOString()
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
    console.error("Affiliate promos POST error:", error);
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

    if (!iban || !holderName) {
      return NextResponse.json({ error: "IBAN ve ad soyad gerekli" }, { status: 400 });
    }

    // Clean IBAN
    const cleanIban = iban.replace(/\s/g, '').toUpperCase();
    if (cleanIban.length < 15 || cleanIban.length > 34) {
      return NextResponse.json({ error: "Geçersiz IBAN" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from("profiles")
      .update({
        affiliate_iban: cleanIban,
        affiliate_holder_name: holderName.trim(),
      })
      .eq("user_id", user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Affiliate payment info PUT error:", error);
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

    await admin.from("promo_signups").delete().eq("promo_link_id", promoId);
    await admin.from("coupons").delete().eq("promo_link_id", promoId);
    const { error } = await admin.from("promo_links").delete().eq("id", promoId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Affiliate promos DELETE error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
