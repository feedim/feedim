CREATE TABLE IF NOT EXISTS promo_code_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  promo_link_id UUID NOT NULL REFERENCES promo_links(id) ON DELETE CASCADE,
  old_code TEXT NOT NULL,
  new_code TEXT NOT NULL,
  changed_by UUID NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_promo_code_history_promo_link_id ON promo_code_history(promo_link_id);
CREATE INDEX IF NOT EXISTS idx_promo_code_history_old_code ON promo_code_history(old_code);
