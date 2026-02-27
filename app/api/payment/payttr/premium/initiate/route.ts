import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import crypto from 'crypto';

// Simple in-memory rate limiter: 5 attempts per minute per user
const attempts = new Map<string, number[]>();
function checkPaymentLimit(userId: string): boolean {
  const now = Date.now();
  const userAttempts = (attempts.get(userId) || []).filter(t => now - t < 60000);
  if (userAttempts.length >= 5) return false;
  userAttempts.push(now);
  attempts.set(userId, userAttempts);
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: 'Yetkisiz erişim' }, { status: 401 });
    }

    if (!checkPaymentLimit(user.id)) {
      return NextResponse.json({ success: false, error: 'Topluluğumuzu korumak adına ödeme denemeleri sınırlandırıldı, lütfen bir dakika bekleyin' }, { status: 429 });
    }

    const body = await request.json();
    const { plan_id, billing } = body;

    if (!plan_id || !['basic', 'pro', 'max', 'business'].includes(plan_id)) {
      return NextResponse.json({ success: false, error: 'Geçersiz plan' }, { status: 400 });
    }

    const admin = createAdminClient();

    // Planı veritabanından al
    const { data: plan, error: planError } = await admin
      .from('premium_plans')
      .select('id, name, price, yearly_price, period')
      .eq('id', plan_id)
      .single();

    if (planError || !plan) {
      return NextResponse.json({ success: false, error: 'Plan bulunamadı' }, { status: 404 });
    }

    // Fiyat hesapla (aylık vs yıllık)
    const isYearly = billing === 'yearly';
    const basePrice = isYearly && plan.yearly_price ? Number(plan.yearly_price) : Number(plan.price);

    // Proration: Mevcut aktif abonelik varsa kalan günlerin kredisini hesapla
    let credit = 0;
    const { data: activeSub } = await admin
      .from('premium_subscriptions')
      .select('*, plan:premium_plans(price)')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (activeSub) {
      const now = Date.now();
      const expiresMs = new Date(activeSub.expires_at).getTime();
      const startedMs = new Date(activeSub.started_at).getTime();
      const totalDays = Math.max(1, Math.ceil((expiresMs - startedMs) / (1000 * 60 * 60 * 24)));
      const remainingDays = Math.max(0, Math.ceil((expiresMs - now) / (1000 * 60 * 60 * 24)));
      const oldPrice = Number(activeSub.amount_paid) || 0;
      credit = Math.round((oldPrice * remainingDays / totalDays) * 100) / 100;
    }

    const finalPrice = Math.max(0, Math.round((basePrice - credit) * 100) / 100);

    // Kullanıcı bilgilerini al
    const { data: profile } = await admin
      .from('profiles')
      .select('full_name, email')
      .eq('user_id', user.id)
      .single();

    // PayTR merchant bilgileri
    const merchant_id = (process.env.PAYTTR_MERCHANT_ID || '').trim();
    const merchant_key = (process.env.PAYTTR_MERCHANT_KEY || '').trim();
    const merchant_salt = (process.env.PAYTTR_MERCHANT_SALT || '').trim();

    if (!merchant_id || !merchant_key || !merchant_salt) {
      return NextResponse.json({ success: false, error: 'Ödeme sistemi şu anda kullanılamıyor.' }, { status: 500 });
    }

    // Benzersiz sipariş ID (FDMPM = monthly, FDMPY = yearly)
    const billingPrefix = isYearly ? 'FDMPY' : 'FDMPM';
    const merchant_oid = `${billingPrefix}${Date.now()}${user.id.replace(/-/g, '').substring(0, 8)}`;

    // Kullanıcı IP
    const forwardedFor = request.headers.get('x-forwarded-for');
    const user_ip = forwardedFor
      ? forwardedFor.split(',')[0].trim()
      : request.headers.get('x-real-ip') || '127.0.0.1';

    // Sepet (PayTR formatı)
    const user_basket = Buffer.from(JSON.stringify([
      [`Feedim Premium ${plan.name}${isYearly ? ' (Yıllık)' : ''}`, String(finalPrice), 1]
    ])).toString('base64');

    // PayTR parametreleri
    const email = user.email || 'noreply@feedim.com';
    const payment_amount = Math.round(finalPrice * 100).toString();
    const user_name = profile?.full_name || 'Feedim Kullanıcısı';
    const user_address = 'Dijital Urun - Feedim Premium';
    const user_phone = '8508400000';
    const no_installment = '1';
    const max_installment = '0';
    const currency = 'TL';
    const test_mode = (process.env.PAYTTR_TEST_MODE || '').trim() === 'true' ? '1' : '0';

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || '').trim();
    if (!appUrl) {
      return NextResponse.json({ success: false, error: 'Ödeme sistemi yapılandırması eksik.' }, { status: 500 });
    }

    const merchant_ok_url = `${appUrl}/payment/success`;
    const merchant_fail_url = `${appUrl}/payment/failed`;
    const merchant_notify_url = `${appUrl}/api/payment/payttr/premium/callback`;

    // PayTR iFrame API token
    const hashSTR = `${merchant_id}${user_ip}${merchant_oid}${email}${payment_amount}${user_basket}${no_installment}${max_installment}${currency}${test_mode}`;
    const paytr_token = crypto.createHmac('sha256', merchant_key).update(hashSTR + merchant_salt).digest('base64');

    // Pending ödeme kaydı
    const { error: paymentError } = await admin
      .from('premium_payments')
      .insert({
        user_id: user.id,
        merchant_oid: merchant_oid,
        plan_id: plan_id,
        amount_paid: finalPrice,
        status: 'pending',
        payment_method: 'payttr',
        payment_ref: merchant_oid,
      });

    if (paymentError) {
      if (process.env.NODE_ENV === "development") console.error('[PayTR Premium] Payment insert failed:', paymentError.message);
      return NextResponse.json({ success: false, error: 'Ödeme kaydı oluşturulamadı' }, { status: 500 });
    }

    // PayTR API — iFrame token al
    const params = new URLSearchParams({
      merchant_id,
      user_ip,
      merchant_oid,
      email,
      payment_amount,
      paytr_token,
      user_basket,
      debug_on: test_mode === '1' ? '1' : '0',
      no_installment,
      max_installment,
      user_name,
      user_address,
      user_phone,
      merchant_ok_url,
      merchant_fail_url,
      merchant_notify_url,
      timeout_limit: '30',
      currency,
      test_mode,
      lang: 'tr',
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    let payttrResult: any;

    try {
      const payttrResponse = await fetch('https://www.paytr.com/odeme/api/get-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json,text/plain,*/*',
          'User-Agent': 'feedim/1.0 (+https://feedim.com)'
        },
        body: params.toString(),
        signal: controller.signal,
      });
      const text = await payttrResponse.text();
      try {
        payttrResult = JSON.parse(text);
      } catch {
        return NextResponse.json({ success: false, error: `PayTR yanıt hatası: ${text.substring(0, 200)}` }, { status: 502 });
      }
    } catch (e: any) {
      try {
        await admin
          .from('premium_payments')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
          })
          .eq('merchant_oid', merchant_oid);
      } catch {}
      return NextResponse.json({ success: false, error: 'PayTR bağlantı hatası. Lütfen tekrar deneyin.' }, { status: 504 });
    } finally {
      clearTimeout(timeout);
    }

    if (payttrResult.status === 'success') {
      return NextResponse.json({ success: true, token: payttrResult.token, merchant_oid });
    } else {
      try {
        await admin
          .from('premium_payments')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
          })
          .eq('merchant_oid', merchant_oid);
      } catch {}
      return NextResponse.json({ success: false, error: payttrResult.reason || 'Ödeme başlatılamadı. Lütfen tekrar deneyin.' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ success: false, error: 'Sunucu hatası' }, { status: 500 });
  }
}
