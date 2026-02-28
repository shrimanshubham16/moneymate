-- Fix: Don't auto-recalculate aggregates for E2E encrypted users
-- Their amounts in DB are 0/null (actual values are in _enc fields).
-- Client pushes correct decrypted aggregates via updateUserAggregates.

CREATE OR REPLACE FUNCTION trigger_update_aggregates()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_has_encryption BOOLEAN;
BEGIN
  v_user_id := COALESCE(NEW.user_id, OLD.user_id);
  
  -- Check if user has E2E encryption enabled
  SELECT encryption_salt IS NOT NULL INTO v_has_encryption
  FROM users WHERE id = v_user_id;
  
  -- Skip server-side recalc for encrypted users; client pushes correct values
  IF v_has_encryption THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  PERFORM recalculate_user_aggregates(v_user_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Same fix for the via_plan trigger (variable expense actuals)
CREATE OR REPLACE FUNCTION trigger_update_aggregates_via_plan()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_has_encryption BOOLEAN;
BEGIN
  SELECT user_id INTO v_user_id 
  FROM variable_expense_plans 
  WHERE id = COALESCE(NEW.plan_id, OLD.plan_id);
  
  IF v_user_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  SELECT encryption_salt IS NOT NULL INTO v_has_encryption
  FROM users WHERE id = v_user_id;
  
  IF v_has_encryption THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  PERFORM recalculate_user_aggregates(v_user_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
