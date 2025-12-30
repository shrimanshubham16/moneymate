-- Calculation helper functions for health computation

-- Monthly equivalent calculation
CREATE OR REPLACE FUNCTION monthly_equivalent(amount DECIMAL, freq VARCHAR)
RETURNS DECIMAL AS $$
BEGIN
  RETURN CASE freq
    WHEN 'monthly' THEN amount
    WHEN 'quarterly' THEN amount / 3
    WHEN 'yearly' THEN amount / 12
    ELSE amount
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Total monthly income for user
CREATE OR REPLACE FUNCTION get_user_monthly_income(uid UUID)
RETURNS DECIMAL AS $$
  SELECT COALESCE(SUM(monthly_equivalent(amount, frequency)), 0)
  FROM incomes WHERE user_id = uid;
$$ LANGUAGE sql STABLE;

-- Total monthly fixed expenses for user
CREATE OR REPLACE FUNCTION get_user_monthly_fixed(uid UUID)
RETURNS DECIMAL AS $$
  SELECT COALESCE(SUM(monthly_equivalent(amount, frequency)), 0)
  FROM fixed_expenses WHERE user_id = uid;
$$ LANGUAGE sql STABLE;

-- Calculate health snapshot in a single call
CREATE OR REPLACE FUNCTION calculate_user_health(uid UUID)
RETURNS TABLE(available_funds DECIMAL, health_category VARCHAR) AS $$
DECLARE
  income DECIMAL;
  fixed DECIMAL;
  funds DECIMAL;
BEGIN
  income := get_user_monthly_income(uid);
  fixed := get_user_monthly_fixed(uid);
  funds := income - fixed;
  
  RETURN QUERY SELECT 
    funds,
    CASE 
      WHEN funds >= 10000 THEN 'good'
      WHEN funds >= 1 THEN 'ok'
      WHEN funds >= -3000 THEN 'not_well'
      ELSE 'worrisome'
    END::VARCHAR;
END;
$$ LANGUAGE plpgsql STABLE;

