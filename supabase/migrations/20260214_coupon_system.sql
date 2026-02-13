-- =============================================
-- Kupon Kod Sistemi - Migration
-- =============================================

-- 1. Coupons table
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  discount_percent INTEGER NOT NULL CHECK (discount_percent >= 1 AND discount_percent <= 100),
  max_uses INTEGER DEFAULT 1,
  current_uses INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ DEFAULT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  coupon_type TEXT NOT NULL DEFAULT 'general' CHECK (coupon_type IN ('general', 'welcome')),
  target_user_id UUID REFERENCES auth.users(id) DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Case-insensitive unique index on code
CREATE UNIQUE INDEX IF NOT EXISTS idx_coupons_code_upper ON public.coupons (UPPER(code));

-- 2. Coupon usages table
CREATE TABLE IF NOT EXISTS public.coupon_usages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.coupons(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  used_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Each user can use a coupon only once
CREATE UNIQUE INDEX IF NOT EXISTS idx_coupon_usage_unique ON public.coupon_usages (coupon_id, user_id);

-- 3. RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_usages ENABLE ROW LEVEL SECURITY;

-- Coupons: authenticated users can read active coupons
CREATE POLICY "Users can read active coupons" ON public.coupons
  FOR SELECT TO authenticated
  USING (is_active = true);

-- Coupons: admins can do everything
CREATE POLICY "Admins can manage coupons" ON public.coupons
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Coupon usages: users can read their own usages
CREATE POLICY "Users can read own usages" ON public.coupon_usages
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Coupon usages: users can insert their own usage
CREATE POLICY "Users can insert own usage" ON public.coupon_usages
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- =============================================
-- 4. RPC: validate_coupon
-- =============================================
CREATE OR REPLACE FUNCTION public.validate_coupon(p_code TEXT, p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_coupon RECORD;
  v_already_used BOOLEAN;
BEGIN
  -- Find coupon by code (case-insensitive)
  SELECT * INTO v_coupon
  FROM public.coupons
  WHERE UPPER(code) = UPPER(p_code)
    AND is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('valid', false, 'error', 'Geçersiz kupon kodu');
  END IF;

  -- Check if coupon is targeted to another user
  IF v_coupon.target_user_id IS NOT NULL AND v_coupon.target_user_id != p_user_id THEN
    RETURN json_build_object('valid', false, 'error', 'Bu kupon sizin için geçerli değil');
  END IF;

  -- Check expiry
  IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < now() THEN
    RETURN json_build_object('valid', false, 'error', 'Kupon kodunun süresi dolmuş');
  END IF;

  -- Check max uses
  IF v_coupon.max_uses IS NOT NULL AND v_coupon.current_uses >= v_coupon.max_uses THEN
    RETURN json_build_object('valid', false, 'error', 'Kupon kullanım limiti dolmuş');
  END IF;

  -- Check if user already used this coupon
  SELECT EXISTS(
    SELECT 1 FROM public.coupon_usages
    WHERE coupon_id = v_coupon.id AND user_id = p_user_id
  ) INTO v_already_used;

  IF v_already_used THEN
    RETURN json_build_object('valid', false, 'error', 'Bu kuponu zaten kullandınız');
  END IF;

  RETURN json_build_object(
    'valid', true,
    'coupon_id', v_coupon.id,
    'discount_percent', v_coupon.discount_percent,
    'error', NULL
  );
END;
$$;

-- =============================================
-- 5. RPC: record_coupon_usage
-- =============================================
CREATE OR REPLACE FUNCTION public.record_coupon_usage(p_coupon_id UUID, p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert usage (UNIQUE constraint prevents duplicates)
  INSERT INTO public.coupon_usages (coupon_id, user_id)
  VALUES (p_coupon_id, p_user_id);

  -- Increment current_uses
  UPDATE public.coupons
  SET current_uses = current_uses + 1
  WHERE id = p_coupon_id;

  RETURN json_build_object('success', true);
EXCEPTION
  WHEN unique_violation THEN
    RETURN json_build_object('success', false, 'error', 'Bu kuponu zaten kullandınız');
END;
$$;

-- =============================================
-- 6. RPC: get_welcome_coupon
-- =============================================
CREATE OR REPLACE FUNCTION public.get_welcome_coupon(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_coupon RECORD;
BEGIN
  SELECT * INTO v_coupon
  FROM public.coupons
  WHERE coupon_type = 'welcome'
    AND target_user_id = p_user_id
    AND is_active = true
    AND current_uses = 0
    AND (expires_at IS NULL OR expires_at > now())
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('found', false);
  END IF;

  RETURN json_build_object(
    'found', true,
    'code', v_coupon.code,
    'discount_percent', v_coupon.discount_percent,
    'expires_at', v_coupon.expires_at
  );
END;
$$;

-- =============================================
-- 7. Update handle_new_user trigger to create welcome coupon
-- =============================================
-- NOTE: This replaces the existing handle_new_user function.
-- If you have custom logic in handle_new_user, merge accordingly.
-- The function below assumes the current trigger inserts into profiles.
-- We ADD the welcome coupon creation after profile insert.

-- Create a separate function for welcome coupon to avoid breaking existing trigger
CREATE OR REPLACE FUNCTION public.create_welcome_coupon()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.coupons (code, discount_percent, max_uses, coupon_type, target_user_id, expires_at, is_active, created_by)
  VALUES (
    'HOSGELDIN-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 6)),
    15,
    1,
    'welcome',
    NEW.user_id,
    now() + INTERVAL '30 days',
    true,
    NEW.user_id
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Don't block profile creation if coupon creation fails
    RETURN NEW;
END;
$$;

-- Trigger: create welcome coupon after profile is inserted
DROP TRIGGER IF EXISTS on_profile_created_welcome_coupon ON public.profiles;
CREATE TRIGGER on_profile_created_welcome_coupon
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_welcome_coupon();
