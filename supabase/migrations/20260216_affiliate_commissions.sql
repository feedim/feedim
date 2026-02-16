CREATE TABLE IF NOT EXISTS affiliate_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_user_id UUID NOT NULL,
  buyer_user_id UUID NOT NULL,
  payment_id UUID NOT NULL UNIQUE,
  promo_link_id UUID NOT NULL,
  sale_amount NUMERIC(12,2) NOT NULL,
  commission_rate INTEGER NOT NULL,
  commission_amount NUMERIC(12,2) NOT NULL,
  referrer_id UUID,
  referrer_earning NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_aff_comm_affiliate ON affiliate_commissions(affiliate_user_id);
CREATE INDEX IF NOT EXISTS idx_aff_comm_referrer ON affiliate_commissions(referrer_id);
CREATE INDEX IF NOT EXISTS idx_aff_comm_created ON affiliate_commissions(created_at);
