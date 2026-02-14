import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createRateLimiter } from '@/lib/utils/ai';
import crypto from 'crypto';

// Rate limit: 5 payment attempts per minute per user
const checkPaymentLimit = createRateLimiter(5);

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Yetkisiz erişim' },
        { status: 401 }
      );
    }

    if (!checkPaymentLimit(user.id)) {
      return NextResponse.json(
        { success: false, error: 'Çok fazla ödeme denemesi. Lütfen bir dakika bekleyin.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { package_id } = body;

    if (!package_id) {
      return NextResponse.json(
        { success: false, error: 'Paket ID gerekli' },
        { status: 400 }
      );
    }

    // UUID format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (typeof package_id !== 'string' || !uuidRegex.test(package_id)) {
      return NextResponse.json(
        { success: false, error: 'Geçersiz paket ID formatı' },
        { status: 400 }
      );
    }

    // Paketi veritabanından al
    const { data: pkg, error: pkgError } = await supabase
      .from('coin_packages')
      .select('id, name, coins, price_try, bonus_coins')
      .eq('id', package_id)
      .single();

    if (pkgError || !pkg) {
      return NextResponse.json(
        { success: false, error: 'Paket bulunamadı' },
        { status: 404 }
      );
    }

    // Kullanıcı bilgilerini al
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('user_id', user.id)
      .single();

    // PayTR merchant bilgileri — .trim() ile olası whitespace/newline temizliği
    const merchant_id = (process.env.PAYTTR_MERCHANT_ID || '').trim();
    const merchant_key = (process.env.PAYTTR_MERCHANT_KEY || '').trim();
    const merchant_salt = (process.env.PAYTTR_MERCHANT_SALT || '').trim();

    if (!merchant_id || !merchant_key || !merchant_salt) {
      return NextResponse.json(
        { success: false, error: 'Ödeme sistemi şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.' },
        { status: 500 }
      );
    }

    // Benzersiz sipariş ID oluştur
    const merchant_oid = `FL${Date.now()}${user.id.replace(/-/g, '').substring(0, 8)}`;

    // Kullanıcı IP — x-forwarded-for ilk IP veya x-real-ip fallback
    const forwardedFor = request.headers.get('x-forwarded-for');
    const user_ip = forwardedFor
      ? forwardedFor.split(',')[0].trim()
      : request.headers.get('x-real-ip') || '127.0.0.1';

    // Kullanıcı sepeti (PayTR formatı — base64 encoded JSON)
    const user_basket = Buffer.from(JSON.stringify([
      [pkg.name, String(pkg.price_try), 1]
    ])).toString('base64');

    // PayTR parametreleri
    const email = user.email || 'noreply@forilove.com';
    const payment_amount = Math.round(pkg.price_try * 100).toString();
    const user_name = profile?.full_name || 'Forilove Kullanıcısı';
    const user_address = 'Dijital Urun - Forilove';
    const user_phone = '8508400000';
    const no_installment = '1';
    const max_installment = '0';
    const currency = 'TL';
    const test_mode = (process.env.PAYTTR_TEST_MODE || '').trim() === 'true' ? '1' : '0';

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || '').trim();
    if (!appUrl) {
      return NextResponse.json(
        { success: false, error: 'Ödeme sistemi yapılandırması eksik. Lütfen daha sonra tekrar deneyin.' },
        { status: 500 }
      );
    }

    const merchant_ok_url = `${appUrl}/payment/success`;
    const merchant_fail_url = `${appUrl}/payment/failed`;
    const merchant_notify_url = `${appUrl}/api/payment/payttr/callback`;

    // PayTR iFrame API token oluşturma
    const hashSTR = `${merchant_id}${user_ip}${merchant_oid}${email}${payment_amount}${user_basket}${no_installment}${max_installment}${currency}${test_mode}`;
    const paytr_token = crypto.createHmac('sha256', merchant_key).update(hashSTR + merchant_salt).digest('base64');

    // Admin client — RLS bypass (ödeme kayıtları için gerekli)
    const adminDb = createAdminClient();

    // Pending ödeme kaydı oluştur
    const { data: payment, error: paymentError } = await adminDb
      .from('coin_payments')
      .insert({
        user_id: user.id,
        payment_id: merchant_oid,
        package_id: pkg.id,
        price_paid: pkg.price_try,
        coins_purchased: pkg.coins + (pkg.bonus_coins || 0),
        status: 'pending',
        payment_provider: 'payttr',
        currency: 'TRY',
        metadata: {
          package_name: pkg.name,
          bonus_coins: pkg.bonus_coins || 0,
        },
      })
      .select()
      .single();

    if (paymentError) {
      if (process.env.NODE_ENV === "development") console.error('[PayTR] Payment insert failed:', paymentError.message, paymentError.details);
      return NextResponse.json(
        { success: false, error: 'Ödeme kaydı oluşturulamadı' },
        { status: 500 }
      );
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

    // PayTR API — iFrame token al (timeout + sağlam parse)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    let payttrResult: any;
    try {
      const getTokenUrl = (process.env.PAYTR_PROXY_URL || '').trim() || 'https://www.paytr.com/odeme/api/get-token';
      const payttrResponse = await fetch(getTokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json,text/plain,*/*',
          'User-Agent': 'forilove/1.0 (+https://www.forilove.com)'
        },
        body: params.toString(),
        signal: controller.signal,
      });
      const text = await payttrResponse.text();
      try {
        payttrResult = JSON.parse(text);
      } catch {
        if (process.env.NODE_ENV === "development") console.error('[PayTR Initiate] Non-JSON response from PayTR:', text.substring(0, 500));
        // IP kısıtı/erişim hatası ihtimali — kullanıcıya daha açıklayıcı mesaj
        const hint = /ip|sunucu|erifim|yetki|yasak/gi.test(text) ? ' (muhtemel IP yetkisi/erişim kısıtı)' : '';
        // Bazı hatalarda düz metin gelebilir
        return NextResponse.json(
          { success: false, error: `PayTR yanıt hatası${hint}: ${text.substring(0, 200)}` },
          { status: 502 }
        );
      }
    } catch (e: any) {
      // Timeout veya ağ kesintisi
      try {
        await adminDb
          .from('coin_payments')
          .update({
            status: 'failed',
            metadata: {
              package_name: pkg.name,
              bonus_coins: pkg.bonus_coins || 0,
              error: `PayTR bağlantı hatası: ${e?.name === 'AbortError' ? 'timeout' : (e?.message || 'unknown')}`,
            },
            completed_at: new Date().toISOString(),
          })
          .eq('payment_id', merchant_oid);
      } catch {}
      return NextResponse.json(
        { success: false, error: 'PayTR bağlantı hatası. Lütfen tekrar deneyin.' },
        { status: 504 }
      );
    } finally {
      clearTimeout(timeout);
    }

    if (payttrResult.status === 'success') {
      return NextResponse.json({
        success: true,
        token: payttrResult.token,
        merchant_oid,
      });
    } else {
      // PayTR token alınamadı — pending kaydı 'failed' olarak işaretle
      try {
        await adminDb
          .from('coin_payments')
          .update({
            status: 'failed',
            metadata: {
              package_name: pkg.name,
              bonus_coins: pkg.bonus_coins || 0,
              error: payttrResult.reason || 'Token alınamadı',
            },
            completed_at: new Date().toISOString(),
          })
          .eq('payment_id', merchant_oid);
      } catch (e) {
        // sessiz geç — kullanıcıya hata zaten dönecek
      }
      return NextResponse.json(
        { success: false, error: payttrResult.reason || 'Ödeme başlatılamadı. Lütfen tekrar deneyin.' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Sunucu hatası' },
      { status: 500 }
    );
  }
}
