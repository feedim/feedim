import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
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
      if (process.env.NODE_ENV === "development") console.error('[PayTR Premium Callback] Missing required fields');
      return new NextResponse('FAIL', { status: 500 });
    }

    const merchant_key = (process.env.PAYTTR_MERCHANT_KEY || '').trim();
    const merchant_salt = (process.env.PAYTTR_MERCHANT_SALT || '').trim();

    if (!merchant_key || !merchant_salt) {
      if (process.env.NODE_ENV === "development") console.error('[PayTR Premium Callback] Missing env vars');
      return new NextResponse('FAIL', { status: 500 });
    }

    // Hash doğrulama (timing-safe)
    const hashSTR = `${merchant_oid}${merchant_salt}${status}${total_amount}`;
    const calculatedHash = crypto.createHmac('sha256', merchant_key).update(hashSTR).digest('base64');

    const hashBuffer = Buffer.from(hash, 'utf8');
    const calculatedBuffer = Buffer.from(calculatedHash, 'utf8');
    if (hashBuffer.length !== calculatedBuffer.length || !crypto.timingSafeEqual(hashBuffer, calculatedBuffer)) {
      if (process.env.NODE_ENV === "development") console.error('[PayTR Premium Callback] Hash mismatch for', merchant_oid);
      return new NextResponse('FAIL', { status: 400 });
    }

    // Ödeme kaydını bul
    const { data: payment, error: paymentError } = await supabase
      .from('premium_payments')
      .select('*')
      .eq('merchant_oid', merchant_oid)
      .single();

    if (paymentError || !payment) {
      if (process.env.NODE_ENV === "development") console.error('[PayTR Premium Callback] Payment not found:', merchant_oid);
      return new NextResponse('FAIL', { status: 500 });
    }

    // Idempotency — zaten tamamlanmış
    if (payment.status === 'completed') {
      return new NextResponse('OK', { status: 200 });
    }

    // Tutar kontrolü
    const expectedAmountKurus = Math.round(payment.amount_paid * 100);
    const receivedAmountKurus = parseInt(total_amount, 10);
    if (expectedAmountKurus !== receivedAmountKurus) {
      if (process.env.NODE_ENV === "development") console.error('[PayTR Premium Callback] Amount mismatch:', merchant_oid);
      await supabase
        .from('premium_payments')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', payment.id);
      return new NextResponse('OK', { status: 200 });
    }

    if (status === 'success') {
      const planId = payment.plan_id;
      // Billing type encoded in merchant_oid: FDMPY = yearly, FDMPM = monthly
      const isYearly = merchant_oid.startsWith('FDMPY');

      // 1. ATOMIC CLAIM: pending → completed
      const { data: claimed, error: claimError } = await supabase
        .from('premium_payments')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', payment.id)
        .eq('status', 'pending')
        .select('id');

      if (claimError || !claimed || claimed.length === 0) {
        return new NextResponse('OK', { status: 200 });
      }

      // 2. Mevcut aktif aboneliği bul ve iptal et
      const { data: activeSub } = await supabase
        .from('premium_subscriptions')
        .select('id')
        .eq('user_id', payment.user_id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (activeSub) {
        await supabase
          .from('premium_subscriptions')
          .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
          .eq('id', activeSub.id);
      }

      // 3. Yeni abonelik oluştur
      const expiresAt = new Date();
      if (isYearly) {
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      } else {
        expiresAt.setDate(expiresAt.getDate() + 30);
      }

      const { data: sub, error: subError } = await supabase.from('premium_subscriptions').insert({
        user_id: payment.user_id,
        plan_id: planId,
        status: 'active',
        expires_at: expiresAt.toISOString(),
        payment_method: 'payttr',
        amount_paid: payment.amount_paid,
        auto_renew: false,
      }).select('id').single();

      if (subError) {
        if (process.env.NODE_ENV === "development") console.error('[PayTR Premium Callback] Subscription create failed:', subError.message);
        await supabase.from('premium_payments').update({ status: 'pending', completed_at: null }).eq('id', payment.id);
        return new NextResponse('FAIL', { status: 500 });
      }

      // 4. Ödeme kaydına subscription_id ekle
      await supabase
        .from('premium_payments')
        .update({ subscription_id: sub.id })
        .eq('id', payment.id);

      // 5. Profili güncelle
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          is_premium: true,
          premium_plan: planId,
          premium_until: expiresAt.toISOString(),
          role: 'premium',
          is_verified: true,
        })
        .eq('user_id', payment.user_id);

      if (profileError) {
        if (process.env.NODE_ENV === "development") console.error('[PayTR Premium Callback] Profile update failed:', profileError.message);
      }

      if (process.env.NODE_ENV === "development") console.warn('[PayTR Premium Callback] ✓', merchant_oid, planId);
    } else {
      await supabase
        .from('premium_payments')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', payment.id);
    }

    return new NextResponse('OK', { status: 200 });
  } catch (error: any) {
    if (process.env.NODE_ENV === "development") console.error('[PayTR Premium Callback] Exception:', error?.message);
    return new NextResponse('FAIL', { status: 500 });
  }
}
