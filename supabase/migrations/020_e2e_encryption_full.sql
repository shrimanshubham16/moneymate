-- ============================================================================
-- E2E ENCRYPTION: FULL IMPLEMENTATION
-- Migration: 020_e2e_encryption_full.sql
-- Date: 2025-01-31
-- 
-- This migration adds:
-- 1. Email fields to users table (email, verification, forgot password)
-- 2. Encrypted columns to all data tables (*_enc, *_iv)
-- ============================================================================

-- ============================================================================
-- PART 1: USER EMAIL & VERIFICATION
-- ============================================================================

-- Add email and verification columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_verification_code TEXT,
ADD COLUMN IF NOT EXISTS email_verification_expires TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS password_reset_code TEXT,
ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMPTZ;

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================================================
-- PART 2: ENCRYPTED COLUMNS FOR INCOMES
-- ============================================================================

ALTER TABLE incomes
ADD COLUMN IF NOT EXISTS source_enc TEXT,
ADD COLUMN IF NOT EXISTS source_iv TEXT,
ADD COLUMN IF NOT EXISTS amount_enc TEXT,
ADD COLUMN IF NOT EXISTS amount_iv TEXT;

-- ============================================================================
-- PART 3: ENCRYPTED COLUMNS FOR FIXED EXPENSES
-- ============================================================================

ALTER TABLE fixed_expenses
ADD COLUMN IF NOT EXISTS name_enc TEXT,
ADD COLUMN IF NOT EXISTS name_iv TEXT,
ADD COLUMN IF NOT EXISTS amount_enc TEXT,
ADD COLUMN IF NOT EXISTS amount_iv TEXT,
ADD COLUMN IF NOT EXISTS accumulated_funds_enc TEXT,
ADD COLUMN IF NOT EXISTS accumulated_funds_iv TEXT;

-- ============================================================================
-- PART 4: ENCRYPTED COLUMNS FOR VARIABLE EXPENSE PLANS
-- ============================================================================

ALTER TABLE variable_expense_plans
ADD COLUMN IF NOT EXISTS name_enc TEXT,
ADD COLUMN IF NOT EXISTS name_iv TEXT,
ADD COLUMN IF NOT EXISTS planned_enc TEXT,
ADD COLUMN IF NOT EXISTS planned_iv TEXT;

-- ============================================================================
-- PART 5: ENCRYPTED COLUMNS FOR VARIABLE EXPENSE ACTUALS
-- ============================================================================

ALTER TABLE variable_expense_actuals
ADD COLUMN IF NOT EXISTS amount_enc TEXT,
ADD COLUMN IF NOT EXISTS amount_iv TEXT,
ADD COLUMN IF NOT EXISTS justification_enc TEXT,
ADD COLUMN IF NOT EXISTS justification_iv TEXT;

-- ============================================================================
-- PART 6: ENCRYPTED COLUMNS FOR INVESTMENTS
-- ============================================================================

ALTER TABLE investments
ADD COLUMN IF NOT EXISTS name_enc TEXT,
ADD COLUMN IF NOT EXISTS name_iv TEXT,
ADD COLUMN IF NOT EXISTS goal_enc TEXT,
ADD COLUMN IF NOT EXISTS goal_iv TEXT,
ADD COLUMN IF NOT EXISTS monthly_amount_enc TEXT,
ADD COLUMN IF NOT EXISTS monthly_amount_iv TEXT,
ADD COLUMN IF NOT EXISTS accumulated_funds_enc TEXT,
ADD COLUMN IF NOT EXISTS accumulated_funds_iv TEXT;

-- ============================================================================
-- PART 7: ENCRYPTED COLUMNS FOR CREDIT CARDS
-- ============================================================================

ALTER TABLE credit_cards
ADD COLUMN IF NOT EXISTS name_enc TEXT,
ADD COLUMN IF NOT EXISTS name_iv TEXT,
ADD COLUMN IF NOT EXISTS bill_amount_enc TEXT,
ADD COLUMN IF NOT EXISTS bill_amount_iv TEXT,
ADD COLUMN IF NOT EXISTS paid_amount_enc TEXT,
ADD COLUMN IF NOT EXISTS paid_amount_iv TEXT,
ADD COLUMN IF NOT EXISTS current_expenses_enc TEXT,
ADD COLUMN IF NOT EXISTS current_expenses_iv TEXT;

-- ============================================================================
-- PART 8: ENCRYPTED COLUMNS FOR LOANS
-- ============================================================================

ALTER TABLE loans
ADD COLUMN IF NOT EXISTS name_enc TEXT,
ADD COLUMN IF NOT EXISTS name_iv TEXT,
ADD COLUMN IF NOT EXISTS principal_enc TEXT,
ADD COLUMN IF NOT EXISTS principal_iv TEXT,
ADD COLUMN IF NOT EXISTS emi_enc TEXT,
ADD COLUMN IF NOT EXISTS emi_iv TEXT;

-- ============================================================================
-- PART 9: ENCRYPTED COLUMNS FOR FUTURE BOMBS
-- ============================================================================

ALTER TABLE future_bombs
ADD COLUMN IF NOT EXISTS name_enc TEXT,
ADD COLUMN IF NOT EXISTS name_iv TEXT,
ADD COLUMN IF NOT EXISTS total_amount_enc TEXT,
ADD COLUMN IF NOT EXISTS total_amount_iv TEXT,
ADD COLUMN IF NOT EXISTS saved_amount_enc TEXT,
ADD COLUMN IF NOT EXISTS saved_amount_iv TEXT;

-- ============================================================================
-- PART 10: ENCRYPTED COLUMNS FOR ACTIVITIES (payload)
-- ============================================================================

ALTER TABLE activities
ADD COLUMN IF NOT EXISTS payload_enc TEXT,
ADD COLUMN IF NOT EXISTS payload_iv TEXT;

-- ============================================================================
-- PART 11: UPDATE get_dashboard_data TO RETURN ENCRYPTED FIELDS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_dashboard_data(p_user_id UUID, p_billing_period_id TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  group_user_ids UUID[];
BEGIN
  -- Get all users in the same sharing group
  SELECT ARRAY_AGG(DISTINCT user_id) INTO group_user_ids
  FROM (
    SELECT p_user_id AS user_id
    UNION
    SELECT member_id FROM sharing_members WHERE owner_id = p_user_id
    UNION
    SELECT owner_id FROM sharing_members WHERE member_id = p_user_id
  ) t;

  -- If no group found, just use the user's own ID
  IF group_user_ids IS NULL THEN
    group_user_ids := ARRAY[p_user_id];
  END IF;

  SELECT jsonb_build_object(
    'groupUserIds', to_jsonb(group_user_ids),
    'incomes', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', i.id,
        'userId', i.user_id,
        'source', i.source,
        'source_enc', i.source_enc,
        'source_iv', i.source_iv,
        'amount', i.amount,
        'amount_enc', i.amount_enc,
        'amount_iv', i.amount_iv,
        'frequency', i.frequency,
        'category', i.category,
        'startDate', i.start_date,
        'endDate', i.end_date
      ))
      FROM incomes i
      WHERE i.user_id = ANY(group_user_ids)
    ), '[]'::jsonb),
    'fixedExpenses', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', fe.id,
        'userId', fe.user_id,
        'name', fe.name,
        'name_enc', fe.name_enc,
        'name_iv', fe.name_iv,
        'amount', fe.amount,
        'amount_enc', fe.amount_enc,
        'amount_iv', fe.amount_iv,
        'frequency', fe.frequency,
        'category', fe.category,
        'startDate', fe.start_date,
        'endDate', fe.end_date,
        'is_sip_flag', COALESCE(fe.is_sip_flag, false),
        'accumulated_funds', COALESCE(fe.accumulated_funds, 0),
        'accumulated_funds_enc', fe.accumulated_funds_enc,
        'accumulated_funds_iv', fe.accumulated_funds_iv
      ))
      FROM fixed_expenses fe
      WHERE fe.user_id = ANY(group_user_ids)
    ), '[]'::jsonb),
    'variablePlans', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', vp.id,
        'userId', vp.user_id,
        'name', vp.name,
        'name_enc', vp.name_enc,
        'name_iv', vp.name_iv,
        'planned', vp.planned,
        'planned_enc', vp.planned_enc,
        'planned_iv', vp.planned_iv,
        'category', vp.category,
        'startDate', vp.start_date,
        'endDate', vp.end_date
      ))
      FROM variable_expense_plans vp
      WHERE vp.user_id = ANY(group_user_ids)
    ), '[]'::jsonb),
    'variableActuals', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', va.id,
        'planId', va.plan_id,
        'userId', va.user_id,
        'amount', va.amount,
        'amount_enc', va.amount_enc,
        'amount_iv', va.amount_iv,
        'incurredAt', va.incurred_at,
        'justification', va.justification,
        'justification_enc', va.justification_enc,
        'justification_iv', va.justification_iv,
        'subcategory', va.subcategory,
        'paymentMode', va.payment_mode,
        'creditCardId', va.credit_card_id
      ))
      FROM variable_expense_actuals va
      JOIN variable_expense_plans vp ON va.plan_id = vp.id
      WHERE vp.user_id = ANY(group_user_ids)
    ), '[]'::jsonb),
    'investments', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', inv.id,
        'userId', inv.user_id,
        'name', inv.name,
        'name_enc', inv.name_enc,
        'name_iv', inv.name_iv,
        'goal', inv.goal,
        'goal_enc', inv.goal_enc,
        'goal_iv', inv.goal_iv,
        'monthlyAmount', inv.monthly_amount,
        'monthly_amount_enc', inv.monthly_amount_enc,
        'monthly_amount_iv', inv.monthly_amount_iv,
        'status', inv.status,
        'accumulated_funds', COALESCE(inv.accumulated_funds, 0),
        'accumulated_funds_enc', inv.accumulated_funds_enc,
        'accumulated_funds_iv', inv.accumulated_funds_iv,
        'startDate', inv.start_date
      ))
      FROM investments inv
      WHERE inv.user_id = ANY(group_user_ids)
    ), '[]'::jsonb),
    'futureBombs', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', fb.id,
        'userId', fb.user_id,
        'name', fb.name,
        'name_enc', fb.name_enc,
        'name_iv', fb.name_iv,
        'totalAmount', fb.total_amount,
        'total_amount_enc', fb.total_amount_enc,
        'total_amount_iv', fb.total_amount_iv,
        'savedAmount', fb.saved_amount,
        'saved_amount_enc', fb.saved_amount_enc,
        'saved_amount_iv', fb.saved_amount_iv,
        'targetDate', fb.target_date,
        'status', fb.status
      ))
      FROM future_bombs fb
      WHERE fb.user_id = ANY(group_user_ids)
    ), '[]'::jsonb),
    'creditCards', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', cc.id,
        'userId', cc.user_id,
        'name', cc.name,
        'name_enc', cc.name_enc,
        'name_iv', cc.name_iv,
        'billAmount', cc.bill_amount,
        'bill_amount_enc', cc.bill_amount_enc,
        'bill_amount_iv', cc.bill_amount_iv,
        'paidAmount', cc.paid_amount,
        'paid_amount_enc', cc.paid_amount_enc,
        'paid_amount_iv', cc.paid_amount_iv,
        'dueDate', cc.due_date,
        'billingDate', cc.billing_date,
        'currentExpenses', cc.current_expenses,
        'current_expenses_enc', cc.current_expenses_enc,
        'current_expenses_iv', cc.current_expenses_iv
      ))
      FROM credit_cards cc
      WHERE cc.user_id = ANY(group_user_ids)
    ), '[]'::jsonb),
    'loans', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', l.id,
        'userId', l.user_id,
        'name', l.name,
        'name_enc', l.name_enc,
        'name_iv', l.name_iv,
        'principal', l.principal,
        'principal_enc', l.principal_enc,
        'principal_iv', l.principal_iv,
        'interestRate', l.interest_rate,
        'emi', l.emi,
        'emi_enc', l.emi_enc,
        'emi_iv', l.emi_iv,
        'remainingTenureMonths', l.remaining_tenure_months,
        'startDate', l.start_date
      ))
      FROM loans l
      WHERE l.user_id = ANY(group_user_ids)
    ), '[]'::jsonb),
    'preferences', (
      SELECT jsonb_build_object(
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
      SELECT jsonb_build_object(
        'userId', cs.user_id,
        'score', cs.score,
        'tier', cs.tier,
        'recentOverspends', cs.recent_overspends,
        'decayAppliedAt', cs.decay_applied_at,
        'updatedAt', cs.updated_at
      )
      FROM constraint_scores cs
      WHERE cs.user_id = p_user_id
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_dashboard_data(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_data(UUID, TEXT) TO anon;

