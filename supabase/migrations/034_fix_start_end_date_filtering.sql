-- Fix start_date and end_date filtering for fixed expenses
-- Issues addressed:
-- 1. recalculate_user_aggregates doesn't filter by date range — expired expenses inflate shared totals
-- 2. auto_accumulate_funds already handles start_date/end_date (migration 033) — confirmed OK
-- 3. calculate_full_health doesn't filter by end_date — expired commitments still counted

-- 1. Update recalculate_user_aggregates to exclude expired fixed expenses
CREATE OR REPLACE FUNCTION recalculate_user_aggregates(p_user_id UUID)
RETURNS void AS $$
DECLARE
  v_income_total DECIMAL(15,2);
  v_fixed_total DECIMAL(15,2);
  v_investments_total DECIMAL(15,2);
  v_variable_planned DECIMAL(15,2);
  v_variable_actual DECIMAL(15,2);
  v_credit_card_dues DECIMAL(15,2);
BEGIN
  SELECT COALESCE(SUM(
    CASE frequency 
      WHEN 'monthly' THEN amount 
      WHEN 'quarterly' THEN amount / 3 
      WHEN 'yearly' THEN amount / 12
      ELSE amount 
    END
  ), 0) INTO v_income_total
  FROM incomes WHERE user_id = p_user_id;
  
  SELECT COALESCE(SUM(
    CASE frequency 
      WHEN 'monthly' THEN amount 
      WHEN 'quarterly' THEN amount / 3 
      WHEN 'yearly' THEN amount / 12
      ELSE amount 
    END
  ), 0) INTO v_fixed_total
  FROM fixed_expenses 
  WHERE user_id = p_user_id
    AND (start_date IS NULL OR start_date <= CURRENT_DATE)
    AND (end_date IS NULL OR end_date >= CURRENT_DATE);
  
  SELECT COALESCE(SUM(monthly_amount), 0) INTO v_investments_total
  FROM investments WHERE user_id = p_user_id AND status = 'active';
  
  SELECT COALESCE(SUM(planned), 0) INTO v_variable_planned
  FROM variable_expense_plans 
  WHERE user_id = p_user_id 
    AND (end_date IS NULL OR end_date >= CURRENT_DATE);
  
  SELECT COALESCE(SUM(a.amount), 0) INTO v_variable_actual
  FROM variable_expense_actuals a
  JOIN variable_expense_plans p ON a.plan_id = p.id
  WHERE p.user_id = p_user_id
    AND DATE_TRUNC('month', a.incurred_at) = DATE_TRUNC('month', CURRENT_DATE);
  
  SELECT COALESCE(SUM(GREATEST(0, bill_amount - COALESCE(paid_amount, 0))), 0) INTO v_credit_card_dues
  FROM credit_cards WHERE user_id = p_user_id;
  
  INSERT INTO user_aggregates (
    user_id, total_income_monthly, total_fixed_monthly, total_investments_monthly,
    total_variable_planned, total_variable_actual, total_credit_card_dues, updated_at
  ) VALUES (
    p_user_id, v_income_total, v_fixed_total, v_investments_total,
    v_variable_planned, v_variable_actual, v_credit_card_dues, NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_income_monthly = EXCLUDED.total_income_monthly,
    total_fixed_monthly = EXCLUDED.total_fixed_monthly,
    total_investments_monthly = EXCLUDED.total_investments_monthly,
    total_variable_planned = EXCLUDED.total_variable_planned,
    total_variable_actual = EXCLUDED.total_variable_actual,
    total_credit_card_dues = EXCLUDED.total_credit_card_dues,
    updated_at = EXCLUDED.updated_at;
END;
$$ LANGUAGE plpgsql;

-- 2. Update calculate_full_health to exclude expired fixed expenses
-- (Recreate with date filters on fixed_expenses)
DROP FUNCTION IF EXISTS calculate_full_health(UUID, TIMESTAMP);

CREATE OR REPLACE FUNCTION calculate_full_health(p_user_id UUID, p_today TIMESTAMP DEFAULT NOW())
RETURNS JSON AS $$
DECLARE
  v_total_income DECIMAL := 0;
  v_total_fixed DECIMAL := 0;
  v_total_variable_planned DECIMAL := 0;
  v_total_variable_actual DECIMAL := 0;
  v_total_investments DECIMAL := 0;
  v_credit_card_bills DECIMAL := 0;
  v_month_start_day INT := 1;
  v_billing_period TEXT;
  v_month_start DATE;
  v_month_end DATE;
  v_remaining_days_ratio DECIMAL;
  v_available_funds DECIMAL;
  v_total_obligations DECIMAL;
  v_remaining DECIMAL;
  v_category TEXT;
  v_billing_month TEXT;
BEGIN
  SELECT month_start_day INTO v_month_start_day
  FROM user_preferences WHERE user_id = p_user_id;
  v_month_start_day := COALESCE(v_month_start_day, 1);
  
  IF EXTRACT(DAY FROM p_today) >= v_month_start_day THEN
    v_month_start := DATE_TRUNC('month', p_today) + (v_month_start_day - 1) * INTERVAL '1 day';
    v_month_end := DATE_TRUNC('month', p_today + INTERVAL '1 month') + (v_month_start_day - 1) * INTERVAL '1 day';
  ELSE
    v_month_start := DATE_TRUNC('month', p_today - INTERVAL '1 month') + (v_month_start_day - 1) * INTERVAL '1 day';
    v_month_end := DATE_TRUNC('month', p_today) + (v_month_start_day - 1) * INTERVAL '1 day';
  END IF;
  
  v_billing_period := TO_CHAR(v_month_start, 'YYYY-MM');
  v_billing_month := TO_CHAR(v_month_start, 'YYYY-MM');
  v_remaining_days_ratio := GREATEST(0, (v_month_end - p_today::DATE)::DECIMAL / NULLIF((v_month_end - v_month_start)::DECIMAL, 0));
  v_remaining_days_ratio := COALESCE(v_remaining_days_ratio, 1);
  
  SELECT COALESCE(SUM(
    CASE frequency WHEN 'monthly' THEN amount WHEN 'quarterly' THEN amount / 3 WHEN 'yearly' THEN amount / 12 ELSE amount END
  ), 0) INTO v_total_income
  FROM incomes WHERE user_id = p_user_id;
  
  -- Fixed expenses: exclude expired (end_date < today), not-yet-started (start_date > today), and skipped SIPs
  SELECT COALESCE(SUM(
    CASE fe.frequency WHEN 'monthly' THEN fe.amount WHEN 'quarterly' THEN fe.amount / 3 WHEN 'yearly' THEN fe.amount / 12 ELSE fe.amount END
  ), 0) INTO v_total_fixed
  FROM fixed_expenses fe
  WHERE fe.user_id = p_user_id
    AND (fe.start_date IS NULL OR fe.start_date <= p_today::DATE)
    AND (fe.end_date IS NULL OR fe.end_date >= p_today::DATE)
    AND NOT EXISTS (
      SELECT 1 FROM payments p
      WHERE p.entity_id = fe.id AND p.entity_type = 'fixed_expense'
        AND p.user_id = p_user_id AND p.month = v_billing_month AND p.is_skip = TRUE
    );
  
  v_available_funds := v_total_income;
  v_total_obligations := v_total_fixed + v_total_investments + v_credit_card_bills;
  v_remaining := v_available_funds - v_total_obligations;
  
  IF v_remaining > 10000 THEN v_category := 'good';
  ELSIF v_remaining >= 0 THEN v_category := 'ok';
  ELSIF v_remaining >= -3000 THEN v_category := 'not_well';
  ELSE v_category := 'worrisome';
  END IF;
  
  RETURN json_build_object(
    'available_funds', v_remaining,
    'health_category', v_category,
    'total_income', v_total_income,
    'total_fixed', v_total_fixed,
    'total_obligations', v_total_obligations
  );
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION calculate_full_health(UUID, TIMESTAMP) TO postgres, anon, authenticated;

-- Refresh aggregates for all existing users
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT DISTINCT id FROM users LOOP
    PERFORM recalculate_user_aggregates(r.id);
  END LOOP;
END $$;
