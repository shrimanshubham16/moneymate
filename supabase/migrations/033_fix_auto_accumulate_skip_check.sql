-- Fix auto_accumulate_funds:
-- 1. Exclude SIPs that have been skipped for the current period
-- 2. NULL out encrypted columns (_enc/_iv) when updating plaintext accumulated_funds.
--    Without this, the frontend E2E decryption finds stale _enc/_iv values, decrypts them,
--    and overwrites the correct server-updated plaintext with the old encrypted value (often 0).

DROP FUNCTION IF EXISTS auto_accumulate_funds(UUID, DATE);

CREATE OR REPLACE FUNCTION auto_accumulate_funds(p_user_id UUID, p_today DATE DEFAULT CURRENT_DATE)
RETURNS VOID AS $$
DECLARE
  v_month_start_day INT := 1;
  v_billing_start DATE;
  v_last_accumulation DATE;
  v_billing_period TEXT;
BEGIN
  SELECT COALESCE(month_start_day, 1), last_accumulation_date 
  INTO v_month_start_day, v_last_accumulation
  FROM user_preferences
  WHERE user_id = p_user_id;
  
  IF EXTRACT(DAY FROM p_today) >= v_month_start_day THEN
    v_billing_start := DATE_TRUNC('month', p_today) + (v_month_start_day - 1) * INTERVAL '1 day';
  ELSE
    v_billing_start := DATE_TRUNC('month', p_today - INTERVAL '1 month') + (v_month_start_day - 1) * INTERVAL '1 day';
  END IF;
  
  v_billing_period := TO_CHAR(v_billing_start, 'YYYY-MM');
  
  IF v_last_accumulation IS NOT NULL AND v_last_accumulation >= v_billing_start THEN
    RETURN;
  END IF;
  
  -- Auto-accumulate for SIPs (excluding skipped ones).
  -- Clear _enc/_iv so frontend decryption uses the updated plaintext instead of stale encrypted values.
  UPDATE fixed_expenses fe
  SET accumulated_funds = COALESCE(accumulated_funds, 0) + 
    CASE fe.frequency
      WHEN 'monthly' THEN fe.amount
      WHEN 'quarterly' THEN fe.amount / 3
      WHEN 'yearly' THEN fe.amount / 12
      ELSE fe.amount
    END,
    accumulated_funds_enc = NULL,
    accumulated_funds_iv = NULL
  WHERE fe.user_id = p_user_id
    AND fe.is_sip = TRUE
    AND fe.frequency != 'monthly'
    AND (fe.start_date IS NULL OR fe.start_date <= p_today)
    AND (fe.end_date IS NULL OR fe.end_date >= p_today)
    AND NOT EXISTS (
      SELECT 1 FROM payments p
      WHERE p.user_id = fe.user_id
        AND p.entity_type = 'fixed_expense'
        AND p.entity_id = fe.id
        AND p.month = v_billing_period
        AND p.is_skip = TRUE
    );
  
  -- Auto-accumulate for investments (ONLY unpaid ones for this billing period).
  -- Same: clear _enc/_iv to avoid stale decryption.
  UPDATE investments inv
  SET accumulated_funds = COALESCE(accumulated_funds, 0) + inv.monthly_amount,
    accumulated_funds_enc = NULL,
    accumulated_funds_iv = NULL
  WHERE inv.user_id = p_user_id
    AND inv.status = 'active'
    AND NOT EXISTS (
      SELECT 1 FROM payments p
      WHERE p.user_id = inv.user_id
        AND p.entity_type = 'investment'
        AND p.entity_id = inv.id
        AND p.month = v_billing_period
    );
  
  UPDATE user_preferences
  SET last_accumulation_date = p_today
  WHERE user_id = p_user_id;
  
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION auto_accumulate_funds(UUID, DATE) TO postgres, anon, authenticated;

-- One-time data cleanup: clear stale _enc/_iv for accumulated_funds so
-- existing users see the correct values immediately after this migration.
UPDATE fixed_expenses
SET accumulated_funds_enc = NULL, accumulated_funds_iv = NULL
WHERE accumulated_funds_enc IS NOT NULL;

UPDATE investments
SET accumulated_funds_enc = NULL, accumulated_funds_iv = NULL
WHERE accumulated_funds_enc IS NOT NULL;
