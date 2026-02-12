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
    const { package_id, card } = body;

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

    // Validate card details
    if (!card || !card.number || !card.expiry_month || !card.expiry_year || !card.cvv || !card.owner) {
      return NextResponse.json(
        { success: false, error: 'Kart bilgileri eksik' },
        { status: 400 }
      );
    }

    // Sanitize card inputs
    const cardNumber = card.number.replace(/\D/g, '');
    const expiryMonth = card.expiry_month.replace(/\D/g, '').slice(0, 2);
    const expiryYear = card.expiry_year.replace(/\D/g, '').slice(0, 2);
    const cvv = card.cvv.replace(/\D/g, '').slice(0, 4);
    const cardOwner = card.owner.replace(/[^a-zA-ZçğıöşüÇĞİÖŞÜ\s]/g, '').slice(0, 50);

    if (cardNumber.length < 15 || expiryMonth.length !== 2 || expiryYear.length !== 2 || cvv.length < 3) {
      return NextResponse.json(
        { success: false, error: 'Kart bilgileri geçersiz' },
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

    // PayTR merchant bilgileri
    const merchant_id = process.env.PAYTTR_MERCHANT_ID || '';
    const merchant_key = process.env.PAYTTR_MERCHANT_KEY || '';
    const merchant_salt = process.env.PAYTTR_MERCHANT_SALT || '';

    if (!merchant_id || !merchant_key || !merchant_salt) {
      return NextResponse.json(
        { success: false, error: 'Ödeme sistemi şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.' },
        { status: 500 }
      );
    }

    // Benzersiz sipariş ID oluştur
    const merchant_oid = `FL${Date.now()}${user.id.replace(/-/g, '').substring(0, 8)}`;

    // Kullanıcı sepeti (PayTR formatı)
    const user_basket = JSON.stringify([
      [pkg.name, `${pkg.price_try}00`, 1]
    ]);

    // PayTR parametreleri
    const email = user.email || 'noreply@forilove.com';
    const payment_amount = (pkg.price_try * 100).toString();
    const user_name = profile?.full_name || cardOwner || 'Forilove Kullanıcısı';
    const user_address = 'Dijital Urun - Forilove';
    const user_phone = '8508400000';

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      return NextResponse.json(
        { success: false, error: 'Ödeme sistemi yapılandırması eksik. Lütfen daha sonra tekrar deneyin.' },
        { status: 500 }
      );
    }

    const merchant_ok_url = `${appUrl}/payment/success`;
    const merchant_fail_url = `${appUrl}/payment/failed`;

    // PayTR token oluşturma
    const hashSTR = `${merchant_id}${user.id.substring(0, 20)}${merchant_oid}${email}${payment_amount}${user_basket}no_installment0${merchant_ok_url}${merchant_fail_url}${merchant_salt}`;
    const paytr_token = crypto.createHmac('sha256', merchant_key).update(hashSTR).digest('base64');

    // PayTR'ye gönderilecek parametreler (kart bilgileri dahil)
    const params = new URLSearchParams({
      merchant_id,
      user_ip: request.headers.get('x-forwarded-for') || '127.0.0.1',
      merchant_oid,
      email,
      payment_amount,
      paytr_token,
      user_basket,
      debug_on: process.env.NODE_ENV === 'development' ? '1' : '0',
      no_installment: '0',
      max_installment: '0',
      user_name,
      user_address,
      user_phone,
      merchant_ok_url,
      merchant_fail_url,
      timeout_limit: '30',
      currency: 'TL',
      test_mode: process.env.PAYTTR_TEST_MODE === 'true' ? '1' : '0',
      lang: 'tr',
      // Kart bilgileri — PayTR'ye iletilir, sunucuda saklanmaz
      cc_owner: cardOwner,
      card_number: cardNumber,
      expiry_month: expiryMonth,
      expiry_year: expiryYear,
      cvv,
    });

    // Admin client — RLS bypass (ödeme kayıtları için gerekli)
    const adminDb = createAdminClient();

    // Pending ödeme kaydı oluştur (kart bilgisi SAKLANMAZ)
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
      console.error('[PayTR] Payment insert failed:', paymentError.message, paymentError.details);
      return NextResponse.json(
        { success: false, error: 'Ödeme kaydı oluşturulamadı' },
        { status: 500 }
      );
    }

    // PayTR API — token al
    const payttrResponse = await fetch('https://www.paytr.com/odeme/api/get-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const payttrResult = await payttrResponse.json();

    if (payttrResult.status === 'success') {
      return NextResponse.json({
        success: true,
        payment_url: `https://www.paytr.com/odeme/guvenli/${payttrResult.token}`,
        merchant_oid,
      });
    } else {
      return NextResponse.json(
        { success: false, error: payttrResult.reason || 'Ödeme başlatılamadı. Kart bilgilerinizi kontrol edin.' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('[PayTR] Unhandled error:', error?.message, error?.stack);
    return NextResponse.json(
      { success: false, error: `Sunucu hatası: ${error?.message || 'Bilinmeyen hata'}` },
      { status: 500 }
    );
  }
}
