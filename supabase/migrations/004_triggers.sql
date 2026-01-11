-- Mark health cache as stale whenever financial data changes

CREATE OR REPLACE FUNCTION invalidate_health_cache()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE health_cache 
  SET is_stale = TRUE, computed_at = NOW()
  WHERE user_id = COALESCE(NEW.user_id, OLD.user_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply to all financial tables
CREATE TRIGGER trg_incomes_invalidate AFTER INSERT OR UPDATE OR DELETE ON incomes
FOR EACH ROW EXECUTE FUNCTION invalidate_health_cache();

CREATE TRIGGER trg_fixed_invalidate AFTER INSERT OR UPDATE OR DELETE ON fixed_expenses
FOR EACH ROW EXECUTE FUNCTION invalidate_health_cache();

CREATE TRIGGER trg_variable_plans_invalidate AFTER INSERT OR UPDATE OR DELETE ON variable_expense_plans
FOR EACH ROW EXECUTE FUNCTION invalidate_health_cache();

CREATE TRIGGER trg_variable_actuals_invalidate AFTER INSERT OR UPDATE OR DELETE ON variable_expense_actuals
FOR EACH ROW EXECUTE FUNCTION invalidate_health_cache();

CREATE TRIGGER trg_investments_invalidate AFTER INSERT OR UPDATE OR DELETE ON investments
FOR EACH ROW EXECUTE FUNCTION invalidate_health_cache();

CREATE TRIGGER trg_future_bombs_invalidate AFTER INSERT OR UPDATE OR DELETE ON future_bombs
FOR EACH ROW EXECUTE FUNCTION invalidate_health_cache();

CREATE TRIGGER trg_loans_invalidate AFTER INSERT OR UPDATE OR DELETE ON loans
FOR EACH ROW EXECUTE FUNCTION invalidate_health_cache();


