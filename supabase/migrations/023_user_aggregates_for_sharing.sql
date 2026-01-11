-- Migration: Create user_aggregates table for privacy-preserving combined view
-- This stores pre-computed totals that shared users can see (instead of individual encrypted items)

-- 1. Create the aggregates table
CREATE TABLE IF NOT EXISTS user_aggregates (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  total_income_monthly DECIMAL(15,2) DEFAULT 0,
  total_fixed_monthly DECIMAL(15,2) DEFAULT 0,
  total_investments_monthly DECIMAL(15,2) DEFAULT 0,
  total_variable_planned DECIMAL(15,2) DEFAULT 0,
  total_variable_actual DECIMAL(15,2) DEFAULT 0,
  total_credit_card_dues DECIMAL(15,2) DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_aggregates_updated ON user_aggregates(updated_at);

-- 3. Create function to recalculate user aggregates
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
  -- Calculate monthly income total
  SELECT COALESCE(SUM(
    CASE frequency 
      WHEN 'monthly' THEN amount 
      WHEN 'quarterly' THEN amount / 3 
      WHEN 'yearly' THEN amount / 12
      ELSE amount 
    END
  ), 0) INTO v_income_total
  FROM incomes WHERE user_id = p_user_id;
  
  -- Calculate monthly fixed expenses total
  SELECT COALESCE(SUM(
    CASE frequency 
      WHEN 'monthly' THEN amount 
      WHEN 'quarterly' THEN amount / 3 
      WHEN 'yearly' THEN amount / 12
      ELSE amount 
    END
  ), 0) INTO v_fixed_total
  FROM fixed_expenses WHERE user_id = p_user_id;
  
  -- Calculate monthly investments total (active only)
  SELECT COALESCE(SUM(monthly_amount), 0) INTO v_investments_total
  FROM investments WHERE user_id = p_user_id AND status = 'active';
  
  -- Calculate variable expenses planned total (current month)
  SELECT COALESCE(SUM(planned), 0) INTO v_variable_planned
  FROM variable_expense_plans 
  WHERE user_id = p_user_id 
    AND (end_date IS NULL OR end_date >= CURRENT_DATE);
  
  -- Calculate variable expenses actual total (current month)
  SELECT COALESCE(SUM(a.amount), 0) INTO v_variable_actual
  FROM variable_expense_actuals a
  JOIN variable_expense_plans p ON a.plan_id = p.id
  WHERE p.user_id = p_user_id
    AND DATE_TRUNC('month', a.incurred_at) = DATE_TRUNC('month', CURRENT_DATE);
  
  -- Calculate credit card dues total
  SELECT COALESCE(SUM(GREATEST(0, bill_amount - COALESCE(paid_amount, 0))), 0) INTO v_credit_card_dues
  FROM credit_cards WHERE user_id = p_user_id;
  
  -- Upsert the aggregates
  INSERT INTO user_aggregates (
    user_id, 
    total_income_monthly, 
    total_fixed_monthly, 
    total_investments_monthly,
    total_variable_planned,
    total_variable_actual,
    total_credit_card_dues,
    updated_at
  ) VALUES (
    p_user_id,
    v_income_total,
    v_fixed_total,
    v_investments_total,
    v_variable_planned,
    v_variable_actual,
    v_credit_card_dues,
    NOW()
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

-- 4. Create trigger function that calls recalculate on data changes
CREATE OR REPLACE FUNCTION trigger_update_aggregates()
RETURNS TRIGGER AS $$
BEGIN
  -- Determine the user_id from the affected row
  PERFORM recalculate_user_aggregates(COALESCE(NEW.user_id, OLD.user_id));
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 5. Create triggers for each financial table

-- Income triggers
DROP TRIGGER IF EXISTS trg_income_aggregates ON incomes;
CREATE TRIGGER trg_income_aggregates
  AFTER INSERT OR UPDATE OR DELETE ON incomes
  FOR EACH ROW EXECUTE FUNCTION trigger_update_aggregates();

-- Fixed expenses triggers  
DROP TRIGGER IF EXISTS trg_fixed_aggregates ON fixed_expenses;
CREATE TRIGGER trg_fixed_aggregates
  AFTER INSERT OR UPDATE OR DELETE ON fixed_expenses
  FOR EACH ROW EXECUTE FUNCTION trigger_update_aggregates();

-- Investments triggers
DROP TRIGGER IF EXISTS trg_investments_aggregates ON investments;
CREATE TRIGGER trg_investments_aggregates
  AFTER INSERT OR UPDATE OR DELETE ON investments
  FOR EACH ROW EXECUTE FUNCTION trigger_update_aggregates();

-- Variable expense plans triggers
DROP TRIGGER IF EXISTS trg_variable_plans_aggregates ON variable_expense_plans;
CREATE TRIGGER trg_variable_plans_aggregates
  AFTER INSERT OR UPDATE OR DELETE ON variable_expense_plans
  FOR EACH ROW EXECUTE FUNCTION trigger_update_aggregates();

-- Variable expense actuals triggers (need to get user_id via plan)
CREATE OR REPLACE FUNCTION trigger_update_aggregates_via_plan()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get user_id from the plan
  SELECT user_id INTO v_user_id 
  FROM variable_expense_plans 
  WHERE id = COALESCE(NEW.plan_id, OLD.plan_id);
  
  IF v_user_id IS NOT NULL THEN
    PERFORM recalculate_user_aggregates(v_user_id);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_variable_actuals_aggregates ON variable_expense_actuals;
CREATE TRIGGER trg_variable_actuals_aggregates
  AFTER INSERT OR UPDATE OR DELETE ON variable_expense_actuals
  FOR EACH ROW EXECUTE FUNCTION trigger_update_aggregates_via_plan();

-- Credit cards triggers
DROP TRIGGER IF EXISTS trg_credit_cards_aggregates ON credit_cards;
CREATE TRIGGER trg_credit_cards_aggregates
  AFTER INSERT OR UPDATE OR DELETE ON credit_cards
  FOR EACH ROW EXECUTE FUNCTION trigger_update_aggregates();

-- 6. Initialize aggregates for existing users
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT DISTINCT id FROM users LOOP
    PERFORM recalculate_user_aggregates(r.id);
  END LOOP;
END $$;

-- Add comment explaining the table's purpose
COMMENT ON TABLE user_aggregates IS 'Pre-computed financial totals for privacy-preserving shared views. Individual items remain encrypted (E2E), only aggregates are visible to shared users.';
