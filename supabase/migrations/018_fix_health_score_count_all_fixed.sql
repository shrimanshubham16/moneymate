-- P0 FIX: Health score should count ALL fixed expenses, not just unpaid
-- When you pay a fixed expense (with cash/UPI), your available fund decreases
-- So the obligation should include ALL fixed expenses to reflect the total monthly commitment
-- 
-- Current behavior: Paying something removes it from obligations → health increases artificially
-- Expected behavior: Paying doesn't change health (you had the money, now it's gone to expenses)

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
  
  -- Calculate billing period dates based on user's month start day
  IF EXTRACT(DAY FROM p_today) >= v_month_start_day THEN
    v_month_start := DATE_TRUNC('month', p_today) + (v_month_start_day - 1) * INTERVAL '1 day';
    v_month_end := DATE_TRUNC('month', p_today + INTERVAL '1 month') + (v_month_start_day - 1) * INTERVAL '1 day';
  ELSE
    v_month_start := DATE_TRUNC('month', p_today - INTERVAL '1 month') + (v_month_start_day - 1) * INTERVAL '1 day';
    v_month_end := DATE_TRUNC('month', p_today) + (v_month_start_day - 1) * INTERVAL '1 day';
  END IF;
  
  v_billing_period := TO_CHAR(v_month_start, 'YYYY-MM');
  v_billing_month := TO_CHAR(v_month_start, 'YYYY-MM');
  
  -- Calculate remaining days ratio for prorated variable
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
  
  -- P0 FIX: Total monthly fixed expenses - COUNT ALL (not just unpaid)
  -- This includes periodic SIPs monthly share (amount/3 for quarterly, amount/12 for yearly)
  SELECT COALESCE(SUM(
    CASE fe.frequency
      WHEN 'monthly' THEN fe.amount
      WHEN 'quarterly' THEN fe.amount / 3
      WHEN 'yearly' THEN fe.amount / 12
      ELSE fe.amount
    END
  ), 0) INTO v_total_fixed
  FROM fixed_expenses fe
  WHERE fe.user_id = p_user_id;
  
  -- Total variable expenses - planned amount and actual spent this billing period
  SELECT 
    COALESCE(SUM(vp.planned), 0)
  INTO v_total_variable_planned
  FROM variable_expense_plans vp
  WHERE vp.user_id = p_user_id;
  
  -- Get actual variable spending in this billing period
  SELECT COALESCE(SUM(va.amount), 0) INTO v_total_variable_actual
  FROM variable_expense_actuals va
  JOIN variable_expense_plans vp ON va.plan_id = vp.id
  WHERE vp.user_id = p_user_id
    AND va.incurred_at >= v_month_start
    AND va.incurred_at < v_month_end;
  
  -- Total monthly investments (active only) - UNPAID only
  -- Because paid investments go to savings, not expenses
  SELECT COALESCE(SUM(inv.monthly_amount), 0) INTO v_total_investments
  FROM investments inv
  WHERE inv.user_id = p_user_id
    AND inv.status = 'active'
    AND NOT EXISTS (
      SELECT 1 FROM payments p
      WHERE p.user_id = inv.user_id
        AND p.entity_type = 'investment'
        AND p.entity_id = inv.id
        AND p.month = v_billing_month
    );
  
  -- Credit card bills - UNPAID only
  SELECT COALESCE(SUM(bill_amount - paid_amount), 0) INTO v_credit_card_bills
  FROM credit_cards
  WHERE user_id = p_user_id
    AND bill_amount > paid_amount;
  
  -- Calculate health
  v_available_funds := v_total_income;
  
  -- For variable, use MAX of (actual spent, prorated remaining planned)
  v_total_obligations := v_total_fixed 
                       + GREATEST(v_total_variable_actual, v_total_variable_planned * v_remaining_days_ratio)
                       + v_total_investments 
                       + v_credit_card_bills;
  
  v_remaining := v_available_funds - v_total_obligations;
  
  -- Round to integer
  v_remaining := ROUND(v_remaining);
  
  -- Determine category (matching Railway thresholds)
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
        'unpaidProratedVariable', GREATEST(v_total_variable_actual, v_total_variable_planned * v_remaining_days_ratio),
        'variableActual', v_total_variable_actual,
        'variablePlanned', v_total_variable_planned,
        'unpaidInvestments', v_total_investments,
        'unpaidCreditCards', v_credit_card_bills
      ),
      'totalObligations', v_total_obligations,
      'monthStartDay', v_month_start_day,
      'monthProgress', 1 - v_remaining_days_ratio,
      'billingPeriod', v_billing_period,
      'remainingDaysRatio', v_remaining_days_ratio
    ),
    'formula', 'Income - (All Fixed + MAX(Variable Actual, Variable Planned × Remaining Days) + Unpaid Investments + Unpaid Credit Cards)',
    'calculation', v_available_funds || ' - (' || v_total_fixed || ' + ' || 
                   GREATEST(v_total_variable_actual, v_total_variable_planned * v_remaining_days_ratio) || ' + ' ||
                   v_total_investments || ' + ' || v_credit_card_bills || ') = ' || v_remaining
  );
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION calculate_full_health(UUID, TIMESTAMP) TO postgres, anon, authenticated;


