import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * Verify payment & fallback coin crediting
 * Success sayfası bu endpoint'i çağırarak:
 * 1. Ödeme durumunu doğrular
 * 2. Callback çalışmadıysa coin'leri ekler (fallback)
 */
export async function POST() {
  try {
    // Auth: kullanıcıyı doğrula
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // Kullanıcının son pending ödemesini bul
    const { data: payment, error: paymentError } = await adminClient
      .from('coin_payments')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['pending', 'completed'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (paymentError || !payment) {
      return NextResponse.json({
        status: 'no_payment',
        message: 'Bekleyen ödeme bulunamadı',
      });
    }

    // Zaten completed → sadece bakiyeyi döndür
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

    // Ödeme pending → callback henüz çalışmamış, fallback olarak coin ekle
    console.warn('[Verify Payment] Fallback coin crediting for user:', user.id, 'payment:', payment.id);

    const packageName = payment.metadata?.package_name || 'Paket';
    const totalCoins = payment.coins_purchased;

    // Atomik bakiye güncelleme
    const { data: newBalance, error: rpcError } = await adminClient.rpc('add_coins_atomic', {
      p_user_id: user.id,
      p_amount: totalCoins,
      p_payment_id: payment.id,
      p_description: `${packageName} satın alındı (verify fallback)`,
    });

    if (rpcError) {
      console.error('[Verify Payment] RPC failed:', rpcError.message);
      return NextResponse.json({
        status: 'error',
        message: 'Coin ekleme başarısız, lütfen destek ile iletişime geçin',
      }, { status: 500 });
    }

    // Ödemeyi completed olarak işaretle
    await adminClient
      .from('coin_payments')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        metadata: { ...payment.metadata, completed_via: 'verify_fallback' },
      })
      .eq('id', payment.id);

    console.warn('[Verify Payment] ✓ Fallback completed for user:', user.id, 'coins:', totalCoins, 'new_balance:', newBalance);

    return NextResponse.json({
      status: 'completed',
      coin_balance: newBalance,
      coins_added: totalCoins,
      fallback: true,
    });

  } catch (error: any) {
    console.error('[Verify Payment] Exception:', error?.message);
    return NextResponse.json({
      status: 'error',
      message: 'Doğrulama sırasında hata oluştu',
    }, { status: 500 });
  }
}
