import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { processCoinCommission } from '@/lib/process-coin-commission';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const supabase = createAdminClient();

  try {
    const formData = await request.formData();

    const merchant_oid = formData.get('merchant_oid') as string;
    const status = formData.get('status') as string;
    const total_amount = formData.get('total_amount') as string;
    const hash = formData.get('hash') as string;

    if (!merchant_oid || !status || !total_amount || !hash) {
      console.error('[PayTR Callback] Missing required fields');
      return new NextResponse('FAIL', { status: 500 });
    }

    const merchant_key = (process.env.PAYTTR_MERCHANT_KEY || '').trim();
    const merchant_salt = (process.env.PAYTTR_MERCHANT_SALT || '').trim();

    if (!merchant_key || !merchant_salt) {
      console.error('[PayTR Callback] Missing env vars');
      return new NextResponse('FAIL', { status: 500 });
    }

    // Hash doğrulama
    const hashSTR = `${merchant_oid}${merchant_salt}${status}${total_amount}`;
    const calculatedHash = crypto.createHmac('sha256', merchant_key).update(hashSTR).digest('base64');

    const hashBuffer = Buffer.from(hash, 'utf8');
    const calculatedBuffer = Buffer.from(calculatedHash, 'utf8');
    if (hashBuffer.length !== calculatedBuffer.length || !crypto.timingSafeEqual(hashBuffer, calculatedBuffer)) {
      console.error('[PayTR Callback] Hash mismatch for', merchant_oid);
      return new NextResponse('OK', { status: 200 });
    }

    // Ödeme kaydını bul
    const { data: payment, error: paymentError } = await supabase
      .from('coin_payments')
      .select('*')
      .eq('payment_id', merchant_oid)
      .single();

    if (paymentError || !payment) {
      console.error('[PayTR Callback] Payment not found:', merchant_oid, paymentError?.message);
      return new NextResponse('FAIL', { status: 500 });
    }

    // Idempotency — zaten tamamlanmış
    if (payment.status === 'completed') {
      return new NextResponse('OK', { status: 200 });
    }

    // Tutar kontrolü
    const expectedAmountKurus = Math.round(payment.price_paid * 100);
    const receivedAmountKurus = parseInt(total_amount, 10);
    if (expectedAmountKurus !== receivedAmountKurus) {
      console.error('[PayTR Callback] Amount mismatch:', merchant_oid);
      await supabase
        .from('coin_payments')
        .update({
          status: 'failed',
          metadata: { ...payment.metadata, error: `Tutar uyuşmazlığı: beklenen ${expectedAmountKurus}, gelen ${receivedAmountKurus}` },
          completed_at: new Date().toISOString(),
        })
        .eq('id', payment.id);
      return new NextResponse('OK', { status: 200 });
    }

    if (status === 'success') {
      const totalCoins = payment.coins_purchased;
      const packageName = payment.metadata?.package_name || 'Paket';

      // 1. ATOMIC CLAIM: pending → completed (sadece bir işlem alabilir)
      const { data: claimed, error: claimError } = await supabase
        .from('coin_payments')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', payment.id)
        .eq('status', 'pending')
        .select('id');

      if (claimError || !claimed || claimed.length === 0) {
        return new NextResponse('OK', { status: 200 });
      }

      // 2. Bakiyeyi atomic olarak güncelle
      const { data: newBalance, error: updateError } = await supabase.rpc('increment_coin_balance', {
        p_user_id: payment.user_id,
        p_amount: totalCoins,
      });

      if (updateError || newBalance === null) {
        console.error('[PayTR Callback] Balance update failed:', updateError?.message);
        await supabase.from('coin_payments').update({ status: 'pending', completed_at: null }).eq('id', payment.id);
        return new NextResponse('FAIL', { status: 500 });
      }

      // 3. Transaction kaydı
      const { error: txnError } = await supabase
        .from('coin_transactions')
        .insert({
          user_id: payment.user_id,
          amount: totalCoins,
          transaction_type: 'purchase',
          description: `${packageName} satın alındı`,
          reference_id: String(payment.id),
          reference_type: 'payment',
        });

      if (txnError) {
        console.error('[PayTR Callback] Transaction insert failed:', txnError.message);
      }

      // 4. Referans komisyonu (kritik değil — direkt DB sorguları ile)
      await processCoinCommission(supabase, payment.user_id, payment.id, totalCoins);

      console.warn('[PayTR Callback] ✓', merchant_oid);

    } else {
      await supabase
        .from('coin_payments')
        .update({
          status: 'failed',
          metadata: { ...payment.metadata, error: 'Ödeme başarısız' },
          completed_at: new Date().toISOString(),
        })
        .eq('id', payment.id);
    }

    return new NextResponse('OK', { status: 200 });
  } catch (error: any) {
    console.error('[PayTR Callback] Exception:', error?.message);
    return new NextResponse('FAIL', { status: 500 });
  }
}
