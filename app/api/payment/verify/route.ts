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

    // 3. Son coin ödemesini kontrol et
    const { data: coinPayment } = await adminClient
      .from('coin_payments')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['pending', 'completed'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // 4. Son premium ödemesini kontrol et
    const { data: premiumPayment } = await adminClient
      .from('premium_payments')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['pending', 'completed'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // En son ödemeyi bul (coin vs premium)
    const coinTime = coinPayment ? new Date(coinPayment.created_at).getTime() : 0;
    const premiumTime = premiumPayment ? new Date(premiumPayment.created_at).getTime() : 0;

    // Premium ödeme daha yeniyse onu kullan
    if (premiumTime > coinTime && premiumPayment) {
      if (premiumPayment.status === 'completed') {
        const { data: profile } = await adminClient
          .from('profiles')
          .select('premium_plan, premium_until')
          .eq('user_id', user.id)
          .single();

        return NextResponse.json({
          status: 'completed',
          type: 'premium',
          plan_name: premiumPayment.metadata?.plan_name || premiumPayment.plan_id,
          premium_plan: profile?.premium_plan,
          premium_until: profile?.premium_until,
        });
      }
      return NextResponse.json({ status: 'pending' });
    }

    // Coin ödeme
    if (coinPayment) {
      if (coinPayment.status === 'completed') {
        const { data: profile } = await adminClient
          .from('profiles')
          .select('coin_balance')
          .eq('user_id', user.id)
          .single();

        return NextResponse.json({
          status: 'completed',
          type: 'coin',
          coin_balance: profile?.coin_balance ?? 0,
          coins_added: coinPayment.coins_purchased,
        });
      }
      return NextResponse.json({ status: 'pending' });
    }

    return NextResponse.json({ status: 'no_payment' });

  } catch {
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}
