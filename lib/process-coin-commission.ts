import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Coin satın alımında referans komisyonu işle.
 * RPC'ye bağımlı DEĞİL — direkt DB sorguları ile çalışır.
 * Hata fırlatmaz, sadece sonuç döndürür.
 */
export async function processCoinCommission(
  supabase: SupabaseClient,
  buyerUserId: string,
  coinPaymentId: string,
  purchaseAmount: number
): Promise<{ success: boolean; reason: string; commission?: number }> {
  try {
    // 1. Referans ilişkisini bul
    const { data: referral, error: refError } = await supabase
      .from('referrals')
      .select('referrer_id')
      .eq('referred_id', buyerUserId)
      .limit(1)
      .maybeSingle();

    if (refError) {
      console.warn('[Commission] Referral lookup error:', refError.message);
      return { success: false, reason: `referral_lookup_error: ${refError.message}` };
    }

    if (!referral?.referrer_id) {
      return { success: false, reason: 'no_referrer' };
    }

    const referrerId = referral.referrer_id;

    // 2. Duplikasyon kontrolü
    const { data: existing, error: dupError } = await supabase
      .from('coin_transactions')
      .select('id')
      .eq('reference_id', coinPaymentId)
      .eq('reference_type', 'coin_referral_commission')
      .maybeSingle();

    if (dupError) {
      console.warn('[Commission] Duplication check error:', dupError.message);
      return { success: false, reason: `dup_check_error: ${dupError.message}` };
    }

    if (existing) {
      return { success: false, reason: 'already_processed' };
    }

    // 3. %5 komisyon hesapla (minimum 5 FL)
    const commission = Math.max(Math.floor(purchaseAmount * 0.05), 5);

    // 4. Referrer bakiyesini atomic olarak güncelle
    const { data: newBalance, error: updateError } = await supabase.rpc('increment_coin_balance', {
      p_user_id: referrerId,
      p_amount: commission,
    });

    if (updateError || newBalance === null) {
      console.warn('[Commission] Balance update error:', updateError?.message);
      return { success: false, reason: `balance_update_error: ${updateError?.message}` };
    }

    // 5. Komisyon işlemini kaydet
    const { error: txnError } = await supabase
      .from('coin_transactions')
      .insert({
        user_id: referrerId,
        amount: commission,
        transaction_type: 'referral_commission',
        description: 'Referans komisyonu (coin satın alma)',
        reference_id: String(coinPaymentId),
        reference_type: 'coin_referral_commission',
      });

    if (txnError) {
      console.warn('[Commission] Transaction insert error:', txnError.message);
      return { success: false, reason: `txn_insert_error: ${txnError.message}` };
    }

    return { success: true, reason: 'ok', commission };

  } catch (e: any) {
    console.error('[Commission] Exception:', e?.message);
    return { success: false, reason: `exception: ${e?.message}` };
  }
}
