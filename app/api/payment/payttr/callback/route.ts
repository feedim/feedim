import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import crypto from 'crypto';

/**
 * PayTR Callback (IPN) endpoint
 * PayTR ödeme sonucunu buraya POST eder
 */
export async function POST(request: NextRequest) {
  const supabase = createAdminClient();
  const debugLog: string[] = [];

  try {
    const formData = await request.formData();

    const merchant_oid = formData.get('merchant_oid') as string;
    const status = formData.get('status') as string;
    const total_amount = formData.get('total_amount') as string;
    const hash = formData.get('hash') as string;

    debugLog.push(`received: oid=${merchant_oid}, status=${status}, amount=${total_amount}`);

    const merchant_key = (process.env.PAYTTR_MERCHANT_KEY || '').trim();
    const merchant_salt = (process.env.PAYTTR_MERCHANT_SALT || '').trim();

    if (!merchant_key || !merchant_salt) {
      debugLog.push('FAIL: env vars missing');
      await writeDebugLog(supabase, merchant_oid, debugLog);
      return new NextResponse('OK', { status: 200 });
    }

    debugLog.push(`env ok: key=${merchant_key.substring(0, 4)}..., salt=${merchant_salt.substring(0, 4)}...`);

    // Hash doğrulama
    const hashSTR = `${merchant_oid}${merchant_salt}${status}${total_amount}`;
    const calculatedHash = crypto.createHmac('sha256', merchant_key).update(hashSTR).digest('base64');

    debugLog.push(`hash: received=${hash}, calculated=${calculatedHash}`);

    const hashBuffer = Buffer.from(hash || '', 'utf8');
    const calculatedBuffer = Buffer.from(calculatedHash, 'utf8');
    if (hashBuffer.length !== calculatedBuffer.length || !crypto.timingSafeEqual(hashBuffer, calculatedBuffer)) {
      debugLog.push('FAIL: hash mismatch');
      await writeDebugLog(supabase, merchant_oid, debugLog);
      return new NextResponse('OK', { status: 200 });
    }

    debugLog.push('hash OK');

    // Ödeme kaydını bul
    const { data: payment, error: paymentError } = await supabase
      .from('coin_payments')
      .select('*, coin_packages(*)')
      .eq('payment_id', merchant_oid)
      .single();

    if (paymentError || !payment) {
      debugLog.push(`FAIL: payment not found — ${paymentError?.message}`);
      await writeDebugLog(supabase, merchant_oid, debugLog);
      return new NextResponse('OK', { status: 200 });
    }

    debugLog.push(`payment found: id=${payment.id}, status=${payment.status}, price=${payment.price_paid}, coins=${payment.coins_purchased}`);

    // Zaten işlenmiş mi kontrol et
    if (payment.status === 'completed') {
      debugLog.push('SKIP: already completed');
      await writeDebugLog(supabase, merchant_oid, debugLog);
      return new NextResponse('OK', { status: 200 });
    }

    // Tutar çapraz kontrolü
    const expectedAmountKurus = Math.round(payment.price_paid * 100);
    const receivedAmountKurus = parseInt(total_amount, 10);
    if (expectedAmountKurus !== receivedAmountKurus) {
      debugLog.push(`FAIL: amount mismatch — expected=${expectedAmountKurus}, received=${receivedAmountKurus}`);
      await supabase
        .from('coin_payments')
        .update({
          status: 'failed',
          metadata: { ...payment.metadata, error: `Tutar uyuşmazlığı: beklenen ${expectedAmountKurus}, gelen ${receivedAmountKurus}`, debug: debugLog },
          completed_at: new Date().toISOString(),
        })
        .eq('id', payment.id);
      return new NextResponse('OK', { status: 200 });
    }

    debugLog.push('amount OK');

    // Ödeme başarılı mı?
    if (status === 'success') {
      const totalCoins = payment.coins_purchased;
      debugLog.push(`adding ${totalCoins} coins to user ${payment.user_id}`);

      const { error: coinsError } = await supabase.rpc('add_coins_to_user', {
        p_user_id: payment.user_id,
        p_amount: totalCoins,
        p_type: 'purchase',
        p_description: `${payment.coin_packages?.name || 'Paket'} satın alındı`,
        p_reference_id: payment.id,
        p_reference_type: 'payment'
      });

      if (coinsError) {
        debugLog.push(`FAIL: coin add error — ${coinsError.message} | ${coinsError.details} | ${coinsError.hint}`);
        await supabase
          .from('coin_payments')
          .update({
            status: 'failed',
            metadata: { ...payment.metadata, error: `Coin eklenemedi: ${coinsError.message}`, debug: debugLog },
            completed_at: new Date().toISOString(),
          })
          .eq('id', payment.id);
        return new NextResponse('OK', { status: 200 });
      }

      debugLog.push('coins added, marking completed');

      await supabase
        .from('coin_payments')
        .update({
          status: 'completed',
          metadata: { ...payment.metadata, debug: debugLog },
          completed_at: new Date().toISOString(),
        })
        .eq('id', payment.id);

      debugLog.push('DONE');

    } else {
      debugLog.push(`payment failed by PayTR: status=${status}`);
      await supabase
        .from('coin_payments')
        .update({
          status: 'failed',
          metadata: { ...payment.metadata, error: 'Ödeme başarısız', debug: debugLog },
          completed_at: new Date().toISOString(),
        })
        .eq('id', payment.id);
    }

    return new NextResponse('OK', { status: 200 });
  } catch (error: any) {
    debugLog.push(`EXCEPTION: ${error?.message}`);
    await writeDebugLog(supabase, 'unknown', debugLog);
    return new NextResponse('OK', { status: 200 });
  }
}

async function writeDebugLog(supabase: any, oid: string, log: string[]) {
  try {
    // Ödeme kaydı varsa metadata'ya yaz, yoksa log tablosuna yaz (fallback)
    if (oid && oid !== 'unknown') {
      await supabase
        .from('coin_payments')
        .update({ metadata: { debug: log } })
        .eq('payment_id', oid);
    }
  } catch {
    // ignore — best effort
  }
}
