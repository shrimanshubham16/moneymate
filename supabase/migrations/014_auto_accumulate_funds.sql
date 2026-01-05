-- Function to auto-accumulate funds for SIPs and investments monthly
-- This should be called on dashboard load or via a scheduled job

CREATE OR REPLACE FUNCTION auto_accumulate_funds(p_user_id UUID, p_today DATE DEFAULT CURRENT_DATE)
RETURNS VOID AS $$
DECLARE
  v_month_start_day INT := 1;
  v_billing_start DATE;
  v_billing_end DATE;
  v_last_accumulation DATE;
BEGIN
  -- Get user's month start day
  SELECT COALESCE(month_start_day, 1) INTO v_month_start_day
  FROM user_preferences
  WHERE user_id = p_user_id;
  
  -- Calculate current billing period
  IF EXTRACT(DAY FROM p_today) >= v_month_start_day THEN
    v_billing_start := DATE_TRUNC('month', p_today) + (v_month_start_day - 1) * INTERVAL '1 day';
    v_billing_end := DATE_TRUNC('month', p_today + INTERVAL '1 month') + (v_month_start_day - 1) * INTERVAL '1 day';
  ELSE
    v_billing_start := DATE_TRUNC('month', p_today - INTERVAL '1 month') + (v_month_start_day - 1) * INTERVAL '1 day';
    v_billing_end := DATE_TRUNC('month', p_today) + (v_month_start_day - 1) * INTERVAL '1 day';
  END IF;
  
  -- Auto-accumulate for SIPs (fixed expenses with is_sip = true and frequency != monthly)
  -- Add monthly equivalent to accumulated_funds if not paid this month
  UPDATE fixed_expenses fe
  SET accumulated_funds = COALESCE(accumulated_funds, 0) + 
    CASE fe.frequency
      WHEN 'monthly' THEN fe.amount
      WHEN 'quarterly' THEN fe.amount / 3
      WHEN 'yearly' THEN fe.amount / 12
      ELSE fe.amount
    END
  WHERE fe.user_id = p_user_id
    AND fe.is_sip = TRUE
    AND fe.frequency != 'monthly'
    AND NOT EXISTS (
      SELECT 1 FROM payments p
      WHERE p.user_id = fe.user_id
        AND p.entity_type = 'fixed_expense'
        AND p.entity_id = fe.id
        AND p.month = TO_CHAR(v_billing_start, 'YYYY-MM')
    )
    AND (fe.start_date IS NULL OR fe.start_date <= p_today)
    AND (fe.end_date IS NULL OR fe.end_date >= p_today);
  
  -- Auto-accumulate for investments
  -- Add monthly_amount to accumulated_funds if not paid this month
  UPDATE investments inv
  SET accumulated_funds = COALESCE(accumulated_funds, 0) + inv.monthly_amount
  WHERE inv.user_id = p_user_id
    AND inv.status = 'active'
    AND NOT EXISTS (
      SELECT 1 FROM payments p
      WHERE p.user_id = inv.user_id
        AND p.entity_type = 'investment'
        AND p.entity_id = inv.id
        AND p.month = TO_CHAR(v_billing_start, 'YYYY-MM')
    );
  
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION auto_accumulate_funds(UUID, DATE) TO postgres, anon, authenticated;



