import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * DEV MODE - Anında coin satın alma (gerçek ödeme yok)
 * POST { type: "coin", package_id: number }
 * POST { type: "premium", plan_id: "basic"|"pro"|"max"|"business", price?: number }
 */

// Fallback plan fiyatları (DB'de yoksa kullanılır)
const PLAN_PRICES: Record<string, { name: string; price: number }> = {
  basic: { name: "Super", price: 39.99 },
  pro: { name: "Pro", price: 79.99 },
  max: { name: "Max", price: 129 },
  business: { name: "Business", price: 249 },
};

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Giriş yapılmadı" }, { status: 401 });
    }

    const body = await request.json();
    const { type } = body;
    const admin = createAdminClient();

    // ─── COIN SATIN ALMA ───
    if (type === "coin") {
      const { package_id } = body;
      if (!package_id) {
        return NextResponse.json({ error: "Paket seçilmedi" }, { status: 400 });
      }

      // Paketi bul
      const { data: pkg, error: pkgErr } = await admin
        .from("coin_packages")
        .select("*")
        .eq("id", package_id)
        .single();

      if (pkgErr || !pkg) {
        return NextResponse.json({ error: "Paket bulunamadı" }, { status: 404 });
      }

      const totalCoins = (pkg.coins || 0) + (pkg.bonus_coins || 0);

      // Mevcut bakiyeyi al (coin = DB sütun adı)
      const { data: profile } = await admin
        .from("profiles")
        .select("coin_balance, total_earned")
        .eq("user_id", user.id)
        .single();

      const currentBalance = profile?.coin_balance || 0;
      const newBalance = currentBalance + totalCoins;

      // 1. coin_payment kaydı oluştur
      await admin.from("coin_payments").insert({
        user_id: user.id,
        package_id: pkg.id,
        coins_purchased: totalCoins,
        price_paid: pkg.price_try,
        status: "completed",
        payment_method: "dev",
        payment_ref: `DEV-${Date.now()}`,
        completed_at: new Date().toISOString(),
      });

      // 2. coin_transaction kaydı
      await admin.from("coin_transactions").insert({
        user_id: user.id,
        type: "purchase",
        amount: totalCoins,
        balance_after: newBalance,
        description: `${pkg.name} paketi - ${totalCoins} coin (DEV)`,
      });

      // 3. Bakiyeyi güncelle
      await admin
        .from("profiles")
        .update({
          coin_balance: newBalance,
          total_earned: (profile?.total_earned || 0) + totalCoins,
        })
        .eq("user_id", user.id);

      return NextResponse.json({
        success: true,
        coins_added: totalCoins,
        coin_balance: newBalance,
        package_name: pkg.name,
      });
    }

    // ─── PREMIUM SATIN ALMA ───
    if (type === "premium") {
      const { plan_id } = body;
      if (!plan_id || !["basic", "pro", "max", "business"].includes(plan_id)) {
        return NextResponse.json({ error: "Geçersiz plan" }, { status: 400 });
      }

      // Planı bul (DB veya fallback — yoksa oluştur)
      let { data: plan } = await admin
        .from("premium_plans")
        .select("*")
        .eq("id", plan_id)
        .single();

      if (!plan) {
        const fallback = PLAN_PRICES[plan_id];
        // DB'de yoksa oluştur (FK constraint için gerekli)
        const { data: inserted } = await admin.from("premium_plans").insert({
          id: plan_id,
          name: fallback.name,
          price: fallback.price,
          period: "ay",
          display_order: ["basic", "pro", "max", "business"].indexOf(plan_id) + 1,
          is_active: true,
        }).select().single();
        plan = inserted || { id: plan_id, name: fallback.name, price: fallback.price };
      }

      // Mevcut aktif aboneliği kontrol et — proration hesapla
      let credit = 0;
      const { data: activeSub } = await admin
        .from("premium_subscriptions")
        .select("*, plan:premium_plans(price)")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (activeSub) {
        const now = Date.now();
        const expiresMs = new Date(activeSub.expires_at).getTime();
        const startedMs = new Date(activeSub.started_at).getTime();
        const totalDays = Math.max(1, Math.ceil((expiresMs - startedMs) / (1000 * 60 * 60 * 24)));
        const remainingDays = Math.max(0, Math.ceil((expiresMs - now) / (1000 * 60 * 60 * 24)));
        const oldPrice = Number(activeSub.amount_paid) || 0;
        // Kalan gün oranı kadar eski plandan iade (kredi)
        credit = Math.round((oldPrice * remainingDays / totalDays) * 100) / 100;

        // Eski aboneliği iptal et
        await admin
          .from("premium_subscriptions")
          .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
          .eq("id", activeSub.id);
      }

      const fullPrice = Number(plan.price);
      const finalPrice = Math.max(0, Math.round((fullPrice - credit) * 100) / 100);

      // Bitiş tarihi: 30 gün sonra
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      // 1. premium_subscription oluştur
      const { data: sub } = await admin.from("premium_subscriptions").insert({
        user_id: user.id,
        plan_id: plan_id,
        status: "active",
        expires_at: expiresAt.toISOString(),
        payment_method: "dev",
        amount_paid: finalPrice,
        auto_renew: false,
      }).select().single();

      // 2. premium_payment kaydı
      await admin.from("premium_payments").insert({
        user_id: user.id,
        subscription_id: sub?.id || null,
        plan_id: plan_id,
        amount_paid: finalPrice,
        status: "completed",
        payment_method: "dev",
        payment_ref: `DEV-PREM-${Date.now()}`,
        completed_at: new Date().toISOString(),
      });

      // 3. Profili güncelle
      const { error: profileErr } = await admin
        .from("profiles")
        .update({
          is_premium: true,
          premium_plan: plan_id,
          premium_until: expiresAt.toISOString(),
          role: "premium",
          is_verified: true,
        })
        .eq("user_id", user.id);

      // CHECK constraint hatası varsa constraint'i güncelle ve tekrar dene
      if (profileErr?.message?.includes("profiles_premium_plan_check")) {
        await admin.from("profiles").update({
          is_premium: true,
          premium_plan: null, // geçici olarak null yap
          premium_until: expiresAt.toISOString(),
          role: "premium",
          is_verified: true,
        }).eq("user_id", user.id);
        // Not: Migration 010 çalıştırıldıktan sonra bu sorun ortadan kalkar
        if (process.env.NODE_ENV === "development") console.warn("profiles_premium_plan_check constraint needs migration 010");
      }

      return NextResponse.json({
        success: true,
        plan_id: plan_id,
        plan_name: plan.name,
        expires_at: expiresAt.toISOString(),
        credit,
        original_price: fullPrice,
        final_price: finalPrice,
      });
    }

    return NextResponse.json({ error: "Geçersiz işlem tipi" }, { status: 400 });
  } catch (error: any) {
    if (process.env.NODE_ENV === "development") console.error("Dev payment error:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
