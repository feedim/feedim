import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

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

    // 5a. ATOMIC CLAIM: pending → completed (double-spend önleme)
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
      // Başka bir işlem zaten tamamladı — taze bakiyeyi döndür
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

    // 5b. ATOMIC COIN ADD: Bakiye + transaction tek seferde
    const { data: newBalance, error: rpcError } = await adminClient.rpc('add_coins_atomic', {
      p_user_id: user.id,
      p_amount: totalCoins,
      p_payment_id: payment.id,
      p_description: `${packageName} satın alındı`,
    });

    if (rpcError) {
      console.error('[Verify] add_coins_atomic failed:', rpcError.message);
      // Rollback: status'u pending'e geri al
      await adminClient
        .from('coin_payments')
        .update({ status: 'pending', completed_at: null })
        .eq('id', payment.id);
      return NextResponse.json({ status: 'error' }, { status: 500 });
    }

    // 5c. REFERRAL COMMISSION (kritik değil)
    try {
      const { error: commissionError } = await adminClient.rpc('process_coin_referral_commission', {
        p_buyer_user_id: user.id,
        p_coin_payment_id: payment.id,
        p_purchase_amount: totalCoins,
      });
      if (commissionError) {
        console.warn('[Verify] Commission RPC error:', commissionError.message);
      }
    } catch (e: any) {
      console.warn('[Verify] Commission exception:', e?.message);
    }

    // 5d. Taze bakiyeyi DB'den oku
    const { data: freshProfile } = await adminClient
      .from('profiles')
      .select('coin_balance')
      .eq('user_id', user.id)
      .single();

    return NextResponse.json({
      status: 'completed',
      coin_balance: freshProfile?.coin_balance ?? newBalance ?? 0,
      coins_added: totalCoins,
    });

  } catch {
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}
