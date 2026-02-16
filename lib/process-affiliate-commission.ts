import { SupabaseClient } from '@supabase/supabase-js';

const TOTAL_ALLOCATION = 35;
const REFERRAL_COMMISSION_RATE = 0.05; // 5%

/**
 * Ödeme tamamlandığında promo kodu sahibine komisyon kaydı oluşturur.
 * Referrer varsa %5 referans kazancı da hesaplanır.
 * Idempotent: aynı payment_id ile tekrar çağrılırsa upsert yapar.
 */
export async function processAffiliateCommission(
  supabase: SupabaseClient,
  buyerUserId: string,
  paymentId: string,
  pricePaid: number
): Promise<void> {
  try {
    // 1. Buyer promo kodu ile mi kaydoldu?
    const { data: signup } = await supabase
      .from('promo_signups')
      .select('promo_link_id')
      .eq('user_id', buyerUserId)
      .limit(1)
      .maybeSingle();

    if (!signup?.promo_link_id) return;

    // 2. Promo detayları
    const { data: promo } = await supabase
      .from('promo_links')
      .select('id, created_by, discount_percent')
      .eq('id', signup.promo_link_id)
      .single();

    if (!promo) return;

    // Kendi alışverişinden komisyon almaz
    if (promo.created_by === buyerUserId) return;

    // 3. Komisyon hesapla
    const commissionRate = TOTAL_ALLOCATION - promo.discount_percent;
    const commissionAmount = Math.round(pricePaid * commissionRate) / 100;

    if (commissionAmount <= 0) return;

    // 4. Promo sahibini davet eden affiliate var mı?
    const { data: referral } = await supabase
      .from('affiliate_referrals')
      .select('referrer_id')
      .eq('referred_id', promo.created_by)
      .maybeSingle();

    const referrerId = referral?.referrer_id || null;
    const referrerEarning = referrerId
      ? Math.round(commissionAmount * REFERRAL_COMMISSION_RATE * 100) / 100
      : 0;

    // 5. Komisyon kaydı (idempotent — UNIQUE payment_id)
    await supabase
      .from('affiliate_commissions')
      .upsert({
        affiliate_user_id: promo.created_by,
        buyer_user_id: buyerUserId,
        payment_id: paymentId,
        promo_link_id: promo.id,
        sale_amount: pricePaid,
        commission_rate: commissionRate,
        commission_amount: commissionAmount,
        referrer_id: referrerId,
        referrer_earning: referrerEarning,
      }, { onConflict: 'payment_id' });

  } catch (e: any) {
    console.error('[AffiliateCommission] Error:', e?.message);
  }
}
