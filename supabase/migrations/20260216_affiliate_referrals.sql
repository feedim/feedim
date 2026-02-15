-- Affiliate Referral System: Affiliates can invite other affiliates
-- The inviting affiliate earns 5% of the invited affiliate's approved payouts (paid by platform)

-- 1. Add referral_code column to affiliate_applications
ALTER TABLE affiliate_applications ADD COLUMN IF NOT EXISTS referral_code TEXT;

-- 2. Affiliate referral relationships
CREATE TABLE IF NOT EXISTS affiliate_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id),
  referred_id UUID NOT NULL REFERENCES auth.users(id),
  referral_code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_referred UNIQUE(referred_id)
);

CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_referrer ON affiliate_referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_referred ON affiliate_referrals(referred_id);

-- 3. Affiliate referral earnings (5% of invited affiliate's approved payouts)
CREATE TABLE IF NOT EXISTS affiliate_referral_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id),
  referred_id UUID NOT NULL REFERENCES auth.users(id),
  payout_id UUID NOT NULL REFERENCES affiliate_payouts(id),
  payout_amount NUMERIC(12,2) NOT NULL,
  earning_amount NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_earning_per_payout UNIQUE(payout_id)
);

CREATE INDEX IF NOT EXISTS idx_affiliate_referral_earnings_referrer ON affiliate_referral_earnings(referrer_id);

-- 4. RLS - only service role can access
ALTER TABLE affiliate_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_referral_earnings ENABLE ROW LEVEL SECURITY;
