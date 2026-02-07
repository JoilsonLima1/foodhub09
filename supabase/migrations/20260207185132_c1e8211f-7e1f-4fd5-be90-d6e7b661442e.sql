-- Phase 10.1: Add upsert_partner_settlement_config RPC
-- This RPC allows partners to update their settlement configuration

CREATE OR REPLACE FUNCTION public.upsert_partner_settlement_config(
  p_partner_id UUID,
  p_settlement_mode TEXT DEFAULT 'manual',
  p_payout_schedule TEXT DEFAULT 'manual',
  p_payout_min_amount NUMERIC DEFAULT 100,
  p_payout_day_of_week INT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config_id UUID;
BEGIN
  -- Validate settlement_mode
  IF p_settlement_mode NOT IN ('split', 'invoice', 'manual') THEN
    RAISE EXCEPTION 'Invalid settlement_mode: %', p_settlement_mode;
  END IF;

  -- Validate payout_schedule
  IF p_payout_schedule NOT IN ('daily', 'weekly', 'manual') THEN
    RAISE EXCEPTION 'Invalid payout_schedule: %', p_payout_schedule;
  END IF;

  -- Validate payout_min_amount
  IF p_payout_min_amount < 0 THEN
    RAISE EXCEPTION 'payout_min_amount cannot be negative';
  END IF;

  -- Upsert the config
  INSERT INTO partner_settlement_configs (
    partner_id,
    settlement_mode,
    payout_schedule,
    payout_min_amount,
    payout_day_of_week,
    updated_at
  )
  VALUES (
    p_partner_id,
    p_settlement_mode,
    p_payout_schedule,
    p_payout_min_amount,
    p_payout_day_of_week,
    NOW()
  )
  ON CONFLICT (partner_id) DO UPDATE SET
    settlement_mode = EXCLUDED.settlement_mode,
    payout_schedule = EXCLUDED.payout_schedule,
    payout_min_amount = EXCLUDED.payout_min_amount,
    payout_day_of_week = EXCLUDED.payout_day_of_week,
    updated_at = NOW()
  RETURNING id INTO v_config_id;

  RETURN v_config_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.upsert_partner_settlement_config TO authenticated;