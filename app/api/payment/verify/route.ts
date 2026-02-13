import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { processCoinCommission } from '@/lib/process-coin-commission';

export const dynamic = 'force-dynamic';

// Rate limit: kullanıcı başına son istek zamanı
const lastRequestMap = new Map<string, number>();
const RATE_LIMIT_MS = 2000; // 2 saniye

export async function POST(request: NextRequest) {
  const adminClient = createAdminClient();

  try {
    // 1. Auth: Bearer token
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: { user }, error: authError } = await adminClient.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Rate limit
    const now = Date.now();
    const lastReq = lastRequestMap.get(user.id) || 0;
    if (now - lastReq < RATE_LIMIT_MS) {
      return NextResponse.json({ status: 'rate_limited' }, { status: 429 });
    }
    lastRequestMap.set(user.id, now);

    // 3. Son pending/completed ödemeyi bul
    const { data: payment, error: paymentError } = await adminClient
      .from('coin_payments')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['pending', 'completed'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (paymentError || !payment) {
      return NextResponse.json({ status: 'no_payment' });
    }

    // 4. Zaten completed → bakiyeyi döndür
    if (payment.status === 'completed') {
      const { data: profile } = await adminClient
        .from('profiles')
        .select('coin_balance')
        .eq('user_id', user.id)
        .single();

      return NextResponse.json({
        status: 'completed',
        coin_balance: profile?.coin_balance ?? 0,
        coins_added: payment.coins_purchased,
      });
    }

    // 5. Pending → fallback coin ekleme
    const totalCoins = payment.coins_purchased;
    const packageName = payment.metadata?.package_name || 'Paket';

    // 5a. ATOMIC CLAIM: pending → completed (sadece bir işlem alabilir)
    const { data: claimed, error: claimError } = await adminClient
      .from('coin_payments')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        metadata: { ...payment.metadata, completed_via: 'verify_fallback' },
      })
      .eq('id', payment.id)
      .eq('status', 'pending')
      .select('id');

    if (claimError || !claimed || claimed.length === 0) {
      // Başka bir işlem tamamladı — taze bakiyeyi döndür
      const { data: profile } = await adminClient
        .from('profiles')
        .select('coin_balance')
        .eq('user_id', user.id)
        .single();

      return NextResponse.json({
        status: 'completed',
        coin_balance: profile?.coin_balance ?? 0,
        coins_added: payment.coins_purchased,
      });
    }

    // 5b. Bakiyeyi oku ve güncelle (claim sayesinde sadece 1 işlem buraya ulaşır)
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('coin_balance')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      // Rollback
      await adminClient.from('coin_payments').update({ status: 'pending', completed_at: null }).eq('id', payment.id);
      return NextResponse.json({ status: 'error' }, { status: 500 });
    }

    const newBalance = (profile.coin_balance || 0) + totalCoins;

    const { error: updateError } = await adminClient
      .from('profiles')
      .update({ coin_balance: newBalance })
      .eq('user_id', user.id);

    if (updateError) {
      await adminClient.from('coin_payments').update({ status: 'pending', completed_at: null }).eq('id', payment.id);
      return NextResponse.json({ status: 'error' }, { status: 500 });
    }

    // 5c. Transaction kaydı
    const { error: txnError } = await adminClient
      .from('coin_transactions')
      .insert({
        user_id: user.id,
        amount: totalCoins,
        transaction_type: 'purchase',
        description: `${packageName} satın alındı`,
        reference_id: String(payment.id),
        reference_type: 'payment',
      });

    if (txnError) {
      console.error('[Verify] Transaction insert failed:', txnError.message);
    }

    // 5d. Referans komisyonu (kritik değil — direkt DB sorguları ile)
    const commResult = await processCoinCommission(adminClient, user.id, payment.id, totalCoins);
    console.warn('[Verify] Commission result:', JSON.stringify(commResult));

    return NextResponse.json({
      status: 'completed',
      coin_balance: newBalance,
      coins_added: totalCoins,
    });

  } catch {
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}
