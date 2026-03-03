-- Phase 2A: Skip auto_accumulate_funds for E2E-encrypted users
-- E2E users have plaintext amounts = 0 in DB, so server-side accumulation 
-- would add 0 each month. Client handles accumulation instead.

DROP FUNCTION IF EXISTS auto_accumulate_funds(UUID, DATE);

CREATE OR REPLACE FUNCTION auto_accumulate_funds(p_user_id UUID, p_today DATE DEFAULT CURRENT_DATE)
RETURNS VOID AS $$
DECLARE
  v_has_encryption BOOLEAN;
  v_month_start_day INT := 1;
  v_billing_start DATE;
  v_last_accumulation DATE;
  v_billing_period TEXT;
BEGIN
  -- E2E check: skip entirely if user has encryption enabled
  SELECT encryption_salt IS NOT NULL INTO v_has_encryption
  FROM users WHERE id = p_user_id;
  IF v_has_encryption THEN RETURN; END IF;

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
