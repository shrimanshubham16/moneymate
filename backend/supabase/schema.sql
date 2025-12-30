-- FinFlow Database Schema for Supabase
-- Created: December 30, 2025

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  failed_login_attempts INTEGER DEFAULT 0,
  account_locked_until TIMESTAMP
);

CREATE INDEX idx_users_username ON users(username);

-- 2. Constraint scores (global, single row)
CREATE TABLE constraint_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  tier VARCHAR(20) CHECK (tier IN ('green', 'amber', 'red')) NOT NULL,
  recent_overspends INTEGER DEFAULT 0,
  decay_applied_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert initial constraint score
INSERT INTO constraint_scores (score, tier, recent_overspends) 
VALUES (100, 'green', 0);

-- 3. Incomes table
CREATE TABLE incomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT,
  amount DECIMAL(12, 2),
  category VARCHAR(100),
  frequency VARCHAR(20) CHECK (frequency IN ('monthly', 'quarterly', 'yearly')),
  start_date DATE,
  end_date DATE,
  name_encrypted TEXT,
  name_iv TEXT,
  amount_encrypted TEXT,
  amount_iv TEXT,
  description TEXT,
  description_encrypted TEXT,
  description_iv TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_incomes_user_id ON incomes(user_id);

-- 4. Fixed expenses table
CREATE TABLE fixed_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  frequency VARCHAR(20) CHECK (frequency IN ('monthly', 'quarterly', 'yearly')),
  category VARCHAR(100),
  is_sip BOOLEAN DEFAULT FALSE,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_fixed_expenses_user_id ON fixed_expenses(user_id);

-- 5. Variable expense plans table
CREATE TABLE variable_expense_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  planned DECIMAL(12, 2) NOT NULL,
  category VARCHAR(100),
  start_date DATE NOT NULL,
  end_date DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_variable_plans_user_id ON variable_expense_plans(user_id);

-- 6. Variable expense actuals table
CREATE TABLE variable_expense_actuals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES variable_expense_plans(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  incurred_at TIMESTAMP NOT NULL,
  justification TEXT,
  subcategory VARCHAR(100) DEFAULT 'Unspecified',
  payment_mode VARCHAR(20) CHECK (payment_mode IN ('UPI', 'Cash', 'ExtraCash', 'CreditCard')),
  credit_card_id UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_variable_actuals_user_id ON variable_expense_actuals(user_id);
CREATE INDEX idx_variable_actuals_plan_id ON variable_expense_actuals(plan_id);

-- 7. Investments table
CREATE TABLE investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  goal TEXT,
  monthly_amount DECIMAL(12, 2) NOT NULL,
  status VARCHAR(20) CHECK (status IN ('active', 'paused')) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_investments_user_id ON investments(user_id);

-- 8. Future bombs table
CREATE TABLE future_bombs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  due_date DATE NOT NULL,
  total_amount DECIMAL(12, 2) NOT NULL,
  saved_amount DECIMAL(12, 2) DEFAULT 0,
  monthly_equivalent DECIMAL(12, 2),
  preparedness_ratio DECIMAL(5, 4) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_future_bombs_user_id ON future_bombs(user_id);

-- 9. Credit cards table
CREATE TABLE credit_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  statement_date DATE NOT NULL,
  due_date DATE NOT NULL,
  bill_amount DECIMAL(12, 2) DEFAULT 0,
  paid_amount DECIMAL(12, 2) DEFAULT 0,
  current_expenses DECIMAL(12, 2) DEFAULT 0,
  billing_date INTEGER CHECK (billing_date BETWEEN 1 AND 31),
  needs_bill_update BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_credit_cards_user_id ON credit_cards(user_id);

-- 10. Loans table
CREATE TABLE loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  principal DECIMAL(12, 2) NOT NULL,
  remaining_tenure_months INTEGER NOT NULL,
  emi DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_loans_user_id ON loans(user_id);

-- 11. Activities table
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity VARCHAR(100) NOT NULL,
  action VARCHAR(100) NOT NULL,
  payload JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_activities_actor_id ON activities(actor_id);
CREATE INDEX idx_activities_created_at ON activities(created_at);

-- 12. User preferences table
CREATE TABLE user_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  month_start_day INTEGER CHECK (month_start_day BETWEEN 1 AND 28) DEFAULT 1,
  currency VARCHAR(10) DEFAULT 'INR',
  timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
  use_prorated BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 13. Theme states table
CREATE TABLE theme_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_ref UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mode VARCHAR(20) CHECK (mode IN ('health_auto', 'manual')) DEFAULT 'health_auto',
  selected_theme VARCHAR(50) CHECK (selected_theme IN ('thunderstorms', 'reddish_dark_knight', 'green_zone')),
  constraint_tier_effect BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_theme_states_owner_ref ON theme_states(owner_ref);

-- 14. Shared accounts table
CREATE TABLE shared_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 15. Shared members table
CREATE TABLE shared_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shared_account_id UUID NOT NULL REFERENCES shared_accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) CHECK (role IN ('owner', 'editor', 'viewer')) NOT NULL,
  merge_finances BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(shared_account_id, user_id)
);

CREATE INDEX idx_shared_members_user_id ON shared_members(user_id);
CREATE INDEX idx_shared_members_account_id ON shared_members(shared_account_id);

-- 16. Sharing requests table
CREATE TABLE sharing_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invitee_email VARCHAR(255),
  invitee_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) CHECK (role IN ('editor', 'viewer')) NOT NULL,
  merge_finances BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sharing_requests_inviter ON sharing_requests(inviter_id);
CREATE INDEX idx_sharing_requests_invitee ON sharing_requests(invitee_id);

-- Add foreign key for credit_card_id in variable_expense_actuals
ALTER TABLE variable_expense_actuals 
ADD CONSTRAINT fk_variable_actuals_credit_card 
FOREIGN KEY (credit_card_id) REFERENCES credit_cards(id) ON DELETE SET NULL;

