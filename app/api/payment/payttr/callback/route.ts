import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

/**
 * PayTR Callback (IPN) endpoint
 * PayTR ödeme sonucunu buraya POST eder
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const merchant_oid = formData.get('merchant_oid') as string;
    const status = formData.get('status') as string;
    const total_amount = formData.get('total_amount') as string;
    const hash = formData.get('hash') as string;

    const merchant_salt = process.env.PAYTTR_MERCHANT_SALT || '';

    if (!merchant_salt) {
      return new NextResponse('OK', { status: 200 }); // PayTR'ye OK döndür ama işleme
    }

    // Hash doğrulama (timing-safe comparison)
    const hashSTR = `${merchant_oid}${merchant_salt}${status}${total_amount}`;
    const calculatedHash = crypto.createHmac('sha256', merchant_salt).update(hashSTR).digest('base64');

    const hashBuffer = Buffer.from(hash || '', 'utf8');
    const calculatedBuffer = Buffer.from(calculatedHash, 'utf8');
    if (hashBuffer.length !== calculatedBuffer.length || !crypto.timingSafeEqual(hashBuffer, calculatedBuffer)) {
      return new NextResponse('OK', { status: 200 });
    }

    const supabase = await createClient();

    // Ödeme kaydını bul
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*, coin_packages(*)')
      .eq('merchant_oid', merchant_oid)
      .single();

    if (paymentError || !payment) {
      return new NextResponse('OK', { status: 200 });
    }

    // Zaten işlenmiş mi kontrol et
    if (payment.status === 'completed') {
      return new NextResponse('OK', { status: 200 });
    }

    // Tutar çapraz kontrolü: PayTR total_amount (kuruş) vs DB amount_try (TL)
    const expectedAmountKurus = Math.round(payment.amount_try * 100);
    const receivedAmountKurus = parseInt(total_amount, 10);
    if (expectedAmountKurus !== receivedAmountKurus) {
      await supabase
        .from('payments')
        .update({
          status: 'failed',
          error_message: `Tutar uyuşmazlığı: beklenen ${expectedAmountKurus}, gelen ${receivedAmountKurus}`,
          completed_at: new Date().toISOString(),
        })
        .eq('id', payment.id);
      return new NextResponse('OK', { status: 200 });
    }

    // Ödeme başarılı mı?
    if (status === 'success') {
      // Atomic coin ekleme
      const totalCoins = payment.coins + payment.bonus_coins;

      const { error: coinsError } = await supabase.rpc('add_coins_to_user', {
        p_user_id: payment.user_id,
        p_amount: totalCoins,
        p_type: 'purchase',
        p_description: `${payment.coin_packages.name} satın alındı`,
        p_reference_id: payment.id,
        p_reference_type: 'payment'
      });

      if (coinsError) {
        // Ödeme durumunu failed olarak işaretle
        await supabase
          .from('payments')
          .update({
            status: 'failed',
            error_message: 'Coin eklenemedi',
            completed_at: new Date().toISOString(),
          })
          .eq('id', payment.id);

        return new NextResponse('OK', { status: 200 });
      }

      // Ödemeyi completed olarak işaretle
      await supabase
        .from('payments')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', payment.id);

    } else {
      // Ödeme başarısız
      await supabase
        .from('payments')
        .update({
          status: 'failed',
          error_message: 'Ödeme başarısız',
          completed_at: new Date().toISOString(),
        })
        .eq('id', payment.id);

    }

    return new NextResponse('OK', { status: 200 });
  } catch {
    return new NextResponse('OK', { status: 200 }); // Hata olsa bile PayTR'ye OK döndür
  }
}
