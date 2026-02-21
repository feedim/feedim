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
      return NextResponse.json({ success: false, error: 'Çok fazla ödeme denemesi. Lütfen bir dakika bekleyin.' }, { status: 429 });
    }

    const body = await request.json();
    const { package_id } = body;

    if (!package_id) {
      return NextResponse.json({ success: false, error: 'Paket ID gerekli' }, { status: 400 });
    }

    // Paketi veritabanından al
    const admin = createAdminClient();
    const { data: pkg, error: pkgError } = await admin
      .from('coin_packages')
      .select('id, name, coins, price_try, bonus_coins')
      .eq('id', package_id)
      .single();

    if (pkgError || !pkg) {
      return NextResponse.json({ success: false, error: 'Paket bulunamadı' }, { status: 404 });
    }

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

    // Benzersiz sipariş ID
    const merchant_oid = `FDM${Date.now()}${user.id.replace(/-/g, '').substring(0, 8)}`;

    // Kullanıcı IP
    const forwardedFor = request.headers.get('x-forwarded-for');
    const user_ip = forwardedFor
      ? forwardedFor.split(',')[0].trim()
      : request.headers.get('x-real-ip') || '127.0.0.1';

    // Sepet (PayTR formatı — base64 encoded JSON)
    const user_basket = Buffer.from(JSON.stringify([
      [pkg.name, String(pkg.price_try), 1]
    ])).toString('base64');

    // PayTR parametreleri
    const email = user.email || 'noreply@feedim.com';
    const payment_amount = Math.round(pkg.price_try * 100).toString();
    const user_name = profile?.full_name || 'Feedim Kullanıcısı';
    const user_address = 'Dijital Urun - Feedim';
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
    const merchant_notify_url = `${appUrl}/api/payment/payttr/callback`;

    // PayTR iFrame API token
    const hashSTR = `${merchant_id}${user_ip}${merchant_oid}${email}${payment_amount}${user_basket}${no_installment}${max_installment}${currency}${test_mode}`;
    const paytr_token = crypto.createHmac('sha256', merchant_key).update(hashSTR + merchant_salt).digest('base64');

    // Pending ödeme kaydı
    const { error: paymentError } = await admin
      .from('coin_payments')
      .insert({
        user_id: user.id,
        merchant_oid: merchant_oid,
        package_id: pkg.id,
        price_paid: pkg.price_try,
        coins_purchased: pkg.coins + (pkg.bonus_coins || 0),
        status: 'pending',
        payment_method: 'payttr',
        payment_ref: merchant_oid,
      });

    if (paymentError) {
      console.error('[PayTR] Payment insert failed:', paymentError.message);
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
          .from('coin_payments')
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
          .from('coin_payments')
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
