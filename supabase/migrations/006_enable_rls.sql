-- Enable Row Level Security on all tables
-- This ensures users can only access their own data when using the Data API

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixed_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE variable_expense_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE variable_expense_actuals ENABLE ROW LEVEL SECURITY;
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE future_bombs ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE constraint_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE sharing_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE theme_states ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CREATE POLICIES FOR EACH TABLE
-- Users can only see/modify their own data
-- ============================================================================

-- USERS: Users can read/update their own profile
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- INCOMES: Users can CRUD their own incomes
CREATE POLICY "Users can view own incomes" ON incomes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own incomes" ON incomes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own incomes" ON incomes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own incomes" ON incomes
  FOR DELETE USING (auth.uid() = user_id);

-- FIXED_EXPENSES: Users can CRUD their own fixed expenses
CREATE POLICY "Users can view own fixed_expenses" ON fixed_expenses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own fixed_expenses" ON fixed_expenses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own fixed_expenses" ON fixed_expenses
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own fixed_expenses" ON fixed_expenses
  FOR DELETE USING (auth.uid() = user_id);

-- VARIABLE_EXPENSE_PLANS: Users can CRUD their own variable plans
CREATE POLICY "Users can view own variable_plans" ON variable_expense_plans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own variable_plans" ON variable_expense_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own variable_plans" ON variable_expense_plans
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own variable_plans" ON variable_expense_plans
  FOR DELETE USING (auth.uid() = user_id);

-- VARIABLE_EXPENSE_ACTUALS: Users can CRUD their own actuals
CREATE POLICY "Users can view own variable_actuals" ON variable_expense_actuals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own variable_actuals" ON variable_expense_actuals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own variable_actuals" ON variable_expense_actuals
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own variable_actuals" ON variable_expense_actuals
  FOR DELETE USING (auth.uid() = user_id);

-- INVESTMENTS: Users can CRUD their own investments
CREATE POLICY "Users can view own investments" ON investments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own investments" ON investments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own investments" ON investments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own investments" ON investments
  FOR DELETE USING (auth.uid() = user_id);

-- FUTURE_BOMBS: Users can CRUD their own future bombs
CREATE POLICY "Users can view own future_bombs" ON future_bombs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own future_bombs" ON future_bombs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own future_bombs" ON future_bombs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own future_bombs" ON future_bombs
  FOR DELETE USING (auth.uid() = user_id);

-- CREDIT_CARDS: Users can CRUD their own credit cards
CREATE POLICY "Users can view own credit_cards" ON credit_cards
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own credit_cards" ON credit_cards
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own credit_cards" ON credit_cards
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own credit_cards" ON credit_cards
  FOR DELETE USING (auth.uid() = user_id);

-- LOANS: Users can CRUD their own loans
CREATE POLICY "Users can view own loans" ON loans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own loans" ON loans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own loans" ON loans
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own loans" ON loans
  FOR DELETE USING (auth.uid() = user_id);

-- ACTIVITIES: Users can view their own activities
CREATE POLICY "Users can view own activities" ON activities
  FOR SELECT USING (auth.uid() = actor_id);

CREATE POLICY "Users can insert own activities" ON activities
  FOR INSERT WITH CHECK (auth.uid() = actor_id);

-- USER_PREFERENCES: Users can CRUD their own preferences
CREATE POLICY "Users can view own preferences" ON user_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" ON user_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON user_preferences
  FOR UPDATE USING (auth.uid() = user_id);

-- CONSTRAINT_SCORES: Users can view/update their own constraint score
CREATE POLICY "Users can view own constraint_score" ON constraint_scores
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own constraint_score" ON constraint_scores
  FOR UPDATE USING (auth.uid() = user_id);

-- HEALTH_CACHE: Users can CRUD their own health cache
CREATE POLICY "Users can view own health_cache" ON health_cache
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own health_cache" ON health_cache
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own health_cache" ON health_cache
  FOR UPDATE USING (auth.uid() = user_id);

-- SHARED_ACCOUNTS: Users can view accounts they're members of
CREATE POLICY "Users can view shared_accounts they belong to" ON shared_accounts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM shared_members 
      WHERE shared_members.shared_account_id = shared_accounts.id 
      AND shared_members.user_id = auth.uid()
    )
  );

-- SHARED_MEMBERS: Users can view members of accounts they belong to
CREATE POLICY "Users can view shared_members of their accounts" ON shared_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM shared_members sm
      WHERE sm.shared_account_id = shared_members.shared_account_id
      AND sm.user_id = auth.uid()
    )
  );

-- SHARING_REQUESTS: Users can view requests they sent or received
CREATE POLICY "Users can view own sharing_requests" ON sharing_requests
  FOR SELECT USING (auth.uid() = inviter_id OR auth.uid() = invitee_id);

CREATE POLICY "Users can insert sharing_requests" ON sharing_requests
  FOR INSERT WITH CHECK (auth.uid() = inviter_id);

CREATE POLICY "Users can update sharing_requests they received" ON sharing_requests
  FOR UPDATE USING (auth.uid() = invitee_id);

-- THEME_STATES: Users can CRUD their own theme state
CREATE POLICY "Users can view own theme_state" ON theme_states
  FOR SELECT USING (auth.uid() = owner_ref);

CREATE POLICY "Users can insert own theme_state" ON theme_states
  FOR INSERT WITH CHECK (auth.uid() = owner_ref);

CREATE POLICY "Users can update own theme_state" ON theme_states
  FOR UPDATE USING (auth.uid() = owner_ref);

-- ============================================================================
-- SERVICE ROLE BYPASS
-- Allow backend/edge functions to bypass RLS when needed
-- ============================================================================

-- Note: Service role key automatically bypasses RLS
-- For Edge Functions, use supabase.auth.admin or service role client

