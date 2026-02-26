-- Add is_skip column to payments table for SIP skip functionality
-- When a user skips a periodic SIP payment, a payment record is created with
-- amount = 0 and is_skip = true. This prevents auto-accumulation and the
-- unpaid dues penalty, while also removing the obligation from health calculation.

ALTER TABLE payments ADD COLUMN IF NOT EXISTS is_skip BOOLEAN DEFAULT FALSE;

-- Update calculate_full_health to exclude skipped periodic SIPs from obligations
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
  -- Get user preferences
  SELECT month_start_day INTO v_month_start_day
  FROM user_preferences
  WHERE user_id = p_user_id;
  
  v_month_start_day := COALESCE(v_month_start_day, 1);
  
  -- Calculate billing period dates
  IF EXTRACT(DAY FROM p_today) >= v_month_start_day THEN
    v_month_start := DATE_TRUNC('month', p_today) + (v_month_start_day - 1) * INTERVAL '1 day';
    v_month_end := DATE_TRUNC('month', p_today + INTERVAL '1 month') + (v_month_start_day - 1) * INTERVAL '1 day';
  ELSE
    v_month_start := DATE_TRUNC('month', p_today - INTERVAL '1 month') + (v_month_start_day - 1) * INTERVAL '1 day';
    v_month_end := DATE_TRUNC('month', p_today) + (v_month_start_day - 1) * INTERVAL '1 day';
  END IF;
  
  v_billing_period := TO_CHAR(v_month_start, 'YYYY-MM');
  v_billing_month := TO_CHAR(v_month_start, 'YYYY-MM');
  
  -- Calculate remaining days ratio
  v_remaining_days_ratio := GREATEST(0, (v_month_end - p_today::DATE)::DECIMAL / NULLIF((v_month_end - v_month_start)::DECIMAL, 0));
  v_remaining_days_ratio := COALESCE(v_remaining_days_ratio, 1);
  
  -- Total monthly income
  SELECT COALESCE(SUM(
    CASE frequency
      WHEN 'monthly' THEN amount
      WHEN 'quarterly' THEN amount / 3
      WHEN 'yearly' THEN amount / 12
      ELSE amount
    END
  ), 0) INTO v_total_income
  FROM incomes
  WHERE user_id = p_user_id;
  
  -- Total monthly fixed expenses — exclude skipped periodic SIPs
  SELECT COALESCE(SUM(
    CASE fe.frequency
      WHEN 'monthly' THEN fe.amount
      WHEN 'quarterly' THEN fe.amount / 3
      WHEN 'yearly' THEN fe.amount / 12
      ELSE fe.amount
    END
  ), 0) INTO v_total_fixed
  FROM fixed_expenses fe
  WHERE fe.user_id = p_user_id
    AND NOT EXISTS (
      SELECT 1 FROM payments p
      WHERE p.entity_id = fe.id
        AND p.entity_type = 'fixed_expense'
        AND p.user_id = p_user_id
        AND p.month = v_billing_month
        AND p.is_skip = TRUE
    );
  
  -- Total variable expenses
  SELECT COALESCE(SUM(vp.planned), 0) INTO v_total_variable_planned
  FROM variable_expense_plans vp
  WHERE vp.user_id = p_user_id;
  
  -- Get actual variable spending in this billing period
  SELECT COALESCE(SUM(va.amount), 0) INTO v_total_variable_actual
  FROM variable_expense_actuals va
  JOIN variable_expense_plans vp ON va.plan_id = vp.id
  WHERE vp.user_id = p_user_id
    AND va.incurred_at >= v_month_start
    AND va.incurred_at < v_month_end;
  
  -- Total monthly investments — count ALL active
  SELECT COALESCE(SUM(inv.monthly_amount), 0) INTO v_total_investments
  FROM investments inv
  WHERE inv.user_id = p_user_id
    AND inv.status = 'active';
  
  -- Credit card bills — UNPAID only
  SELECT COALESCE(SUM(bill_amount - paid_amount), 0) INTO v_credit_card_bills
  FROM credit_cards
  WHERE user_id = p_user_id
    AND bill_amount > paid_amount;
  
  -- Calculate health
  v_available_funds := v_total_income;
  v_total_obligations := v_total_fixed 
                       + GREATEST(v_total_variable_actual, v_total_variable_planned * v_remaining_days_ratio)
                       + v_total_investments 
                       + v_credit_card_bills;
  
  v_remaining := v_available_funds - v_total_obligations;
  v_remaining := ROUND(v_remaining);
  
  -- Determine category
  IF v_remaining > 10000 THEN
    v_category := 'good';
  ELSIF v_remaining >= 0 THEN
    v_category := 'ok';
  ELSIF v_remaining >= -3000 THEN
    v_category := 'not_well';
  ELSE
    v_category := 'worrisome';
  END IF;
  
  -- Return as JSON
  RETURN json_build_object(
    'health', json_build_object(
      'remaining', v_remaining,
      'category', v_category
    ),
    'breakdown', json_build_object(
      'totalIncome', v_total_income,
      'availableFunds', v_available_funds,
      'obligations', json_build_object(
        'totalFixed', v_total_fixed,
        'unpaidVariable', GREATEST(v_total_variable_actual, v_total_variable_planned * v_remaining_days_ratio),
        'variableActual', v_total_variable_actual,
        'variablePlanned', v_total_variable_planned,
        'totalInvestments', v_total_investments,
        'unpaidCreditCards', v_credit_card_bills
      ),
      'totalObligations', v_total_obligations,
      'monthStartDay', v_month_start_day,
      'monthProgress', 1 - v_remaining_days_ratio,
      'billingPeriod', v_billing_period,
      'remainingDaysRatio', v_remaining_days_ratio
    ),
    'formula', 'Income - (All Fixed + MAX(Variable Actual, Variable Planned x Remaining Days) + All Investments + Unpaid Credit Cards)',
    'calculation', v_available_funds || ' - (' || v_total_fixed || ' + ' || 
                   GREATEST(v_total_variable_actual, v_total_variable_planned * v_remaining_days_ratio) || ' + ' ||
                   v_total_investments || ' + ' || v_credit_card_bills || ') = ' || v_remaining
  );
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION calculate_full_health(UUID, TIMESTAMP) TO postgres, anon, authenticated;
