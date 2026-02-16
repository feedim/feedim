-- Unique, immutable referral ID for each affiliate (system-generated)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS affiliate_ref_id TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_profiles_affiliate_ref_id ON profiles(affiliate_ref_id);
