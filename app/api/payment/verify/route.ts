import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/** GET /api/payment/verify — diagnostic endpoint */
export async function GET() {
  try {
    const adminClient = createAdminClient();
    const { count, error } = await adminClient
      .from('coin_payments')
      .select('*', { count: 'exact', head: true });

    const { error: rpcError } = await adminClient.rpc('add_coins_atomic', {
      p_user_id: '00000000-0000-0000-0000-000000000000',
      p_amount: 0,
      p_payment_id: '00000000-0000-0000-0000-000000000000',
      p_description: 'diagnostic test',
    });

    const { data: lastPending } = await adminClient
      .from('coin_payments')
      .select('id, status, user_id, coins_purchased, created_at')
      .in('status', ['pending', 'completed'])
      .order('created_at', { ascending: false })
      .limit(3);

    return NextResponse.json({
      ok: !error,
      timestamp: new Date().toISOString(),
      commit: '4774cd8',
      env: {
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      },
      db: error ? { error: error.message } : { payments_count: count },
      rpc_test: rpcError ? { error: rpcError.message, code: rpcError.code } : { ok: true },
      recent_payments: lastPending,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 });
  }
}

/**
 * POST /api/payment/verify
 * Auth: Authorization: Bearer <token>
 * Her adımda detaylı hata döndürür (debug mode)
 */
export async function POST(request: NextRequest) {
  const steps: string[] = [];
  const adminClient = createAdminClient();

  try {
    // Step 1: Token
    steps.push('token_check');
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Missing token', steps }, { status: 401 });
    }

    // Step 2: Auth
    steps.push('auth');
    const { data: { user }, error: authError } = await adminClient.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized', detail: authError?.message, steps }, { status: 401 });
    }
    steps.push('auth_ok:' + user.id.slice(0, 8));

    // Step 3: Payment query
    steps.push('payment_query');
    const { data: payment, error: paymentError } = await adminClient
      .from('coin_payments')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['pending', 'completed'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (paymentError) {
      return NextResponse.json({ status: 'error', message: 'Payment query failed', detail: paymentError.message, steps }, { status: 500 });
    }
    if (!payment) {
      return NextResponse.json({ status: 'no_payment', message: 'Bekleyen ödeme bulunamadı', steps });
    }
    steps.push('found:' + payment.status + ':' + payment.id.slice(0, 8));

    // Step 4: Already completed
    if (payment.status === 'completed') {
      steps.push('already_completed');
      const { data: profile } = await adminClient
        .from('profiles')
        .select('coin_balance')
        .eq('user_id', user.id)
        .single();

      return NextResponse.json({
        status: 'completed',
        coin_balance: profile?.coin_balance ?? 0,
        coins_added: payment.coins_purchased,
        steps,
      });
    }

    // Step 5: Pending → coin ekle (RPC yerine direkt update — daha güvenilir)
    steps.push('crediting');
    const totalCoins = payment.coins_purchased;
    const packageName = payment.metadata?.package_name || 'Paket';

    // 5a: Mevcut bakiyeyi al
    steps.push('get_balance');
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('coin_balance')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ status: 'error', message: 'Profile not found', detail: profileError?.message, steps }, { status: 500 });
    }

    const oldBalance = profile.coin_balance || 0;
    const newBalance = oldBalance + totalCoins;
    steps.push('balance:' + oldBalance + '+' + totalCoins + '=' + newBalance);

    // 5b: Bakiyeyi güncelle
    steps.push('update_balance');
    const { error: updateError } = await adminClient
      .from('profiles')
      .update({ coin_balance: newBalance })
      .eq('user_id', user.id);

    if (updateError) {
      return NextResponse.json({ status: 'error', message: 'Balance update failed', detail: updateError.message, steps }, { status: 500 });
    }

    // 5c: Transaction kaydı
    steps.push('insert_tx');
    await adminClient
      .from('coin_transactions')
      .insert({
        user_id: user.id,
        amount: totalCoins,
        type: 'purchase',
        description: `${packageName} satın alındı (verify fallback)`,
        reference_id: payment.id,
        reference_type: 'payment',
      });

    // 5d: Ödemeyi completed yap
    steps.push('mark_completed');
    await adminClient
      .from('coin_payments')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        metadata: { ...payment.metadata, completed_via: 'verify_fallback' },
      })
      .eq('id', payment.id);

    steps.push('done');
    return NextResponse.json({
      status: 'completed',
      coin_balance: newBalance,
      coins_added: totalCoins,
      fallback: true,
      steps,
    });

  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      message: error?.message || 'Unknown error',
      steps,
    }, { status: 500 });
  }
}
