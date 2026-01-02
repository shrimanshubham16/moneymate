-- P0 FIX: Filter variable actuals by billing period in dashboard function
-- This ensures only current month's actuals are shown, matching health calculation logic

-- Drop and recreate the function with billing period filtering
DROP FUNCTION IF EXISTS get_dashboard_data(UUID, TEXT);

CREATE OR REPLACE FUNCTION get_dashboard_data(
  p_user_id UUID,
  p_billing_period_id TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_group_user_ids UUID[];
  v_result JSON;
  v_month_start_day INT := 1;
  v_month_start DATE;
  v_month_end DATE;
BEGIN
  -- Get user's month start day for billing period calculation
  SELECT COALESCE(month_start_day, 1) INTO v_month_start_day
  FROM user_preferences
  WHERE user_id = p_user_id;
  
  -- Calculate current billing period dates (same logic as health calculation)
  IF EXTRACT(DAY FROM NOW()) >= v_month_start_day THEN
    v_month_start := DATE_TRUNC('month', NOW()) + (v_month_start_day - 1) * INTERVAL '1 day';
    v_month_end := DATE_TRUNC('month', NOW() + INTERVAL '1 month') + (v_month_start_day - 1) * INTERVAL '1 day';
  ELSE
    v_month_start := DATE_TRUNC('month', NOW() - INTERVAL '1 month') + (v_month_start_day - 1) * INTERVAL '1 day';
    v_month_end := DATE_TRUNC('month', NOW()) + (v_month_start_day - 1) * INTERVAL '1 day';
  END IF;

  -- Get merged finance group (user + any shared account members where finances are merged)
  SELECT ARRAY_AGG(DISTINCT uid) INTO v_group_user_ids
  FROM (
    SELECT p_user_id AS uid
    UNION
    SELECT sm2.user_id AS uid
    FROM shared_members sm
    JOIN shared_members sm2 ON sm2.shared_account_id = sm.shared_account_id
    WHERE sm.user_id = p_user_id
      AND sm2.user_id != p_user_id
      AND (sm.merge_finances = TRUE OR sm2.merge_finances = TRUE)
  ) AS all_users;

  IF v_group_user_ids IS NULL THEN
    v_group_user_ids := ARRAY[p_user_id];
  END IF;

  -- Build the complete dashboard response in one query
  SELECT json_build_object(
    'groupUserIds', v_group_user_ids,
    
    'incomes', COALESCE((
      SELECT json_agg(json_build_object(
        'id', i.id,
        'userId', i.user_id,
        'name', i.name,
        'amount', i.amount,
        'category', i.category,
        'frequency', i.frequency,
        'startDate', i.start_date,
        'endDate', i.end_date
      ))
      FROM incomes i
      WHERE i.user_id = ANY(v_group_user_ids)
    ), '[]'::json),
    
    'fixedExpenses', COALESCE((
      SELECT json_agg(json_build_object(
        'id', fe.id,
        'userId', fe.user_id,
        'name', fe.name,
        'amount', fe.amount,
        'category', fe.category,
        'frequency', fe.frequency,
        'startDate', fe.start_date,
        'endDate', fe.end_date,
        'isSipFlag', fe.is_sip
      ))
      FROM fixed_expenses fe
      WHERE fe.user_id = ANY(v_group_user_ids)
    ), '[]'::json),
    
    'variablePlans', COALESCE((
      SELECT json_agg(json_build_object(
        'id', vp.id,
        'userId', vp.user_id,
        'name', vp.name,
        'planned', vp.planned,
        'category', vp.category,
        'startDate', vp.start_date,
        'endDate', vp.end_date
      ))
      FROM variable_expense_plans vp
      WHERE vp.user_id = ANY(v_group_user_ids)
    ), '[]'::json),
    
    'variableActuals', COALESCE((
      SELECT json_agg(json_build_object(
        'id', va.id,
        'planId', va.plan_id,
        'userId', va.user_id,
        'amount', va.amount,
        'incurredAt', va.incurred_at,
        'justification', va.justification,
        'subcategory', va.subcategory,
        'paymentMode', va.payment_mode,
        'creditCardId', va.credit_card_id
      ))
      FROM variable_expense_actuals va
      WHERE va.user_id = ANY(v_group_user_ids)
        -- P0 FIX: Filter by current billing period (same logic as health calculation)
        -- For each user, filter by their own billing period
        AND (
          -- If user is p_user_id, use calculated billing period
          (va.user_id = p_user_id AND va.incurred_at >= v_month_start AND va.incurred_at < v_month_end)
          OR
          -- For other users in group, calculate their billing period
          (va.user_id != p_user_id AND EXISTS (
            SELECT 1 FROM user_preferences up
            WHERE up.user_id = va.user_id
              AND va.incurred_at >= (
                CASE 
                  WHEN EXTRACT(DAY FROM NOW()) >= COALESCE(up.month_start_day, 1) THEN
                    DATE_TRUNC('month', NOW()) + (COALESCE(up.month_start_day, 1) - 1) * INTERVAL '1 day'
                  ELSE
                    DATE_TRUNC('month', NOW() - INTERVAL '1 month') + (COALESCE(up.month_start_day, 1) - 1) * INTERVAL '1 day'
                END
              )
              AND va.incurred_at < (
                CASE 
                  WHEN EXTRACT(DAY FROM NOW()) >= COALESCE(up.month_start_day, 1) THEN
                    DATE_TRUNC('month', NOW() + INTERVAL '1 month') + (COALESCE(up.month_start_day, 1) - 1) * INTERVAL '1 day'
                  ELSE
                    DATE_TRUNC('month', NOW()) + (COALESCE(up.month_start_day, 1) - 1) * INTERVAL '1 day'
                END
              )
          ))
        )
    ), '[]'::json),
    
    'investments', COALESCE((
      SELECT json_agg(json_build_object(
        'id', inv.id,
        'userId', inv.user_id,
        'name', inv.name,
        'monthlyAmount', inv.monthly_amount,
        'goal', inv.goal,
        'status', inv.status
      ))
      FROM investments inv
      WHERE inv.user_id = ANY(v_group_user_ids)
    ), '[]'::json),
    
    'futureBombs', COALESCE((
      SELECT json_agg(json_build_object(
        'id', fb.id,
        'userId', fb.user_id,
        'name', fb.name,
        'dueDate', fb.due_date,
        'totalAmount', fb.total_amount,
        'savedAmount', fb.saved_amount,
        'monthlyEquivalent', fb.monthly_equivalent,
        'preparednessRatio', fb.preparedness_ratio
      ))
      FROM future_bombs fb
      WHERE fb.user_id = ANY(v_group_user_ids)
    ), '[]'::json),
    
    'loans', COALESCE((
      SELECT json_agg(json_build_object(
        'id', l.id,
        'userId', l.user_id,
        'name', l.name,
        'principal', l.principal,
        'remainingTenureMonths', l.remaining_tenure_months,
        'emi', l.emi
      ))
      FROM loans l
      WHERE l.user_id = ANY(v_group_user_ids)
    ), '[]'::json),
    
    'creditCards', COALESCE((
      SELECT json_agg(json_build_object(
        'id', cc.id,
        'userId', cc.user_id,
        'name', cc.name,
        'statementDate', cc.statement_date,
        'dueDate', cc.due_date,
        'billAmount', cc.bill_amount,
        'paidAmount', cc.paid_amount,
        'currentExpenses', cc.current_expenses,
        'billingDate', cc.billing_date,
        'needsBillUpdate', cc.needs_bill_update
      ))
      FROM credit_cards cc
      WHERE cc.user_id = ANY(v_group_user_ids)
    ), '[]'::json),
    
    'preferences', (
      SELECT json_build_object(
        'userId', up.user_id,
        'monthStartDay', up.month_start_day,
        'currency', up.currency,
        'timezone', up.timezone,
        'useProrated', up.use_prorated
      )
      FROM user_preferences up
      WHERE up.user_id = p_user_id
    ),
    
    'constraintScore', (
      SELECT json_build_object(
        'userId', cs.user_id,
        'score', cs.score,
        'tier', cs.tier,
        'recentOverspends', cs.recent_overspends,
        'decayAppliedAt', cs.decay_applied_at,
        'updatedAt', cs.updated_at
      )
      FROM constraint_scores cs
      WHERE cs.user_id = p_user_id
    ),
    
    'healthCache', (
      SELECT json_build_object(
        'availableFunds', hc.available_funds,
        'healthCategory', hc.health_category,
        'healthPercentage', hc.health_percentage,
        'constraintScore', hc.constraint_score,
        'constraintTier', hc.constraint_tier,
        'computedAt', hc.computed_at,
        'isStale', hc.is_stale
      )
      FROM health_cache hc
      WHERE hc.user_id = p_user_id
        AND (p_billing_period_id IS NULL OR hc.billing_period_id = p_billing_period_id)
      ORDER BY hc.computed_at DESC
      LIMIT 1
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION get_dashboard_data(UUID, TEXT) TO postgres, anon, authenticated;

