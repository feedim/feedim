-- Atomic coin balance update with transaction logging
-- Run this in Supabase SQL Editor or via migrations

CREATE OR REPLACE FUNCTION add_coins_atomic(
  p_user_id UUID,
  p_amount INT,
  p_payment_id UUID,
  p_description TEXT
) RETURNS INT AS $$
DECLARE
  v_new_balance INT;
BEGIN
  -- Atomically increment coin_balance
  UPDATE profiles
  SET coin_balance = coin_balance + p_amount
  WHERE user_id = p_user_id
  RETURNING coin_balance INTO v_new_balance;

  IF v_new_balance IS NULL THEN
    RAISE EXCEPTION 'Profile not found for user_id: %', p_user_id;
  END IF;

  -- Insert transaction record
  INSERT INTO coin_transactions (user_id, amount, type, description, reference_id, reference_type)
  VALUES (p_user_id, p_amount, 'purchase', p_description, p_payment_id, 'payment');

  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
