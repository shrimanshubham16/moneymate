# 🔄 Migration Plan: JSON File → Supabase

**Date**: December 30, 2025  
**From**: Railway JSON file (`data/finflow-data.json`)  
**To**: Supabase PostgreSQL  
**Goal**: Zero data loss migration

---

## 📋 Migration Overview

### Current State
- **Storage**: Single JSON file on Railway volume
- **Location**: `data/finflow-data.json`
- **Structure**: All user data in one `Store` object
- **Format**: Plain JSON

### Target State
- **Storage**: Supabase PostgreSQL database
- **Structure**: Normalized relational tables
- **Format**: PostgreSQL with proper relationships

---

## 🗄️ Database Schema Design

### Tables Needed

#### 1. `users`
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  failed_login_attempts INTEGER DEFAULT 0,
  account_locked_until TIMESTAMP
);
```

#### 2. `incomes`
```sql
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
```

#### 3. `fixed_expenses`
```sql
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
```

#### 4. `variable_expense_plans`
```sql
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
```

#### 5. `variable_expense_actuals`
```sql
CREATE TABLE variable_expense_actuals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES variable_expense_plans(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  incurred_at TIMESTAMP NOT NULL,
  justification TEXT,
  subcategory VARCHAR(100) DEFAULT 'Unspecified',
  payment_mode VARCHAR(20) CHECK (payment_mode IN ('UPI', 'Cash', 'ExtraCash', 'CreditCard')),
  credit_card_id UUID REFERENCES credit_cards(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_variable_actuals_user_id ON variable_expense_actuals(user_id);
CREATE INDEX idx_variable_actuals_plan_id ON variable_expense_actuals(plan_id);
```

#### 6. `investments`
```sql
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
```

#### 7. `future_bombs`
```sql
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
```

#### 8. `credit_cards`
```sql
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
```

#### 9. `loans`
```sql
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
```

#### 10. `activities`
```sql
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
```

#### 11. `user_preferences`
```sql
CREATE TABLE user_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  month_start_day INTEGER CHECK (month_start_day BETWEEN 1 AND 28) DEFAULT 1,
  currency VARCHAR(10) DEFAULT 'INR',
  timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
  use_prorated BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 12. `theme_states`
```sql
CREATE TABLE theme_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_ref UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mode VARCHAR(20) CHECK (mode IN ('health_auto', 'manual')) DEFAULT 'health_auto',
  selected_theme VARCHAR(50) CHECK (selected_theme IN ('thunderstorms', 'reddish_dark_knight', 'green_zone')),
  constraint_tier_effect BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_theme_states_owner_ref ON theme_states(owner_ref);
```

#### 13. `shared_accounts`
```sql
CREATE TABLE shared_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 14. `shared_members`
```sql
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
```

#### 15. `sharing_requests`
```sql
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
```

#### 16. `constraint_scores` (Global, not per-user)
```sql
CREATE TABLE constraint_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  tier VARCHAR(20) CHECK (tier IN ('green', 'amber', 'red')) NOT NULL,
  recent_overspends INTEGER DEFAULT 0,
  decay_applied_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Single row constraint (enforced by application)
INSERT INTO constraint_scores (score, tier, recent_overspends) 
VALUES (100, 'green', 0);
```

---

## 📥 Step 1: Export Current Data

### Option A: Download from Railway
1. SSH into Railway instance (if available)
2. Copy `data/finflow-data.json` to local machine
3. Or use Railway CLI to download file

### Option B: Create Export Endpoint
Add a temporary admin endpoint to export data:

```typescript
// backend/src/server.ts (temporary, remove after migration)
app.get("/admin/export", requireAuth, (req, res) => {
  const user = (req as any).user;
  // Only allow admin user
  if (user.username !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  const store = getStore();
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="finflow-export.json"');
  res.json(store);
});
```

### Option C: Direct File Access
If you have Railway volume access, download directly from Railway dashboard.

---

## 🔧 Step 2: Create Migration Script

### Migration Script Structure

```typescript
// backend/scripts/migrate-to-supabase.ts

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Use service role for migration
const supabase = createClient(supabaseUrl, supabaseKey);

interface Store {
  users: any[];
  incomes: any[];
  fixedExpenses: any[];
  variablePlans: any[];
  variableActuals: any[];
  investments: any[];
  futureBombs: any[];
  creditCards: any[];
  loans: any[];
  activities: any[];
  preferences: any[];
  themeStates: any[];
  sharedAccounts: any[];
  sharedMembers: any[];
  sharingRequests: any[];
  constraint: any;
}

async function migrate() {
  console.log('🚀 Starting migration to Supabase...');
  
  // Step 1: Load JSON data
  const dataPath = path.join(__dirname, '../../data/finflow-data.json');
  const jsonData = fs.readFileSync(dataPath, 'utf-8');
  const store: Store = JSON.parse(jsonData);
  
  console.log(`📊 Loaded data: ${store.users.length} users`);
  
  // Step 2: Migrate users
  console.log('👥 Migrating users...');
  const userMap = new Map<string, string>(); // old_id -> new_id
  
  for (const user of store.users) {
    const { data, error } = await supabase
      .from('users')
      .insert({
        id: user.id, // Keep same UUID
        username: user.username,
        password_hash: user.passwordHash,
        created_at: user.createdAt || new Date().toISOString(),
        failed_login_attempts: user.failedLoginAttempts || 0,
        account_locked_until: user.accountLockedUntil || null
      })
      .select()
      .single();
    
    if (error) {
      console.error(`❌ Error migrating user ${user.username}:`, error);
      continue;
    }
    
    userMap.set(user.id, data.id);
    console.log(`✅ Migrated user: ${user.username}`);
  }
  
  // Step 3: Migrate constraint (single row)
  console.log('📊 Migrating constraint...');
  await supabase
    .from('constraint_scores')
    .upsert({
      id: '00000000-0000-0000-0000-000000000001',
      score: store.constraint?.score || 100,
      tier: store.constraint?.tier || 'green',
      recent_overspends: store.constraint?.recentOverspends || 0,
      decay_applied_at: store.constraint?.decayAppliedAt || new Date().toISOString()
    });
  
  // Step 4: Migrate incomes
  console.log('💰 Migrating incomes...');
  for (const income of store.incomes) {
    await supabase.from('incomes').insert({
      id: income.id,
      user_id: income.userId,
      name: income.name,
      amount: income.amount,
      category: income.category,
      frequency: income.frequency,
      start_date: income.startDate,
      end_date: income.endDate,
      name_encrypted: income.name_encrypted,
      name_iv: income.name_iv,
      amount_encrypted: income.amount_encrypted,
      amount_iv: income.amount_iv,
      description: income.description,
      description_encrypted: income.description_encrypted,
      description_iv: income.description_iv
    });
  }
  console.log(`✅ Migrated ${store.incomes.length} incomes`);
  
  // Step 5: Migrate fixed expenses
  console.log('💳 Migrating fixed expenses...');
  for (const expense of store.fixedExpenses) {
    await supabase.from('fixed_expenses').insert({
      id: expense.id,
      user_id: expense.userId,
      name: expense.name,
      amount: expense.amount,
      frequency: expense.frequency,
      category: expense.category,
      is_sip: expense.isSip || false,
      start_date: expense.startDate,
      end_date: expense.endDate
    });
  }
  console.log(`✅ Migrated ${store.fixedExpenses.length} fixed expenses`);
  
  // Step 6: Migrate variable plans
  console.log('📋 Migrating variable plans...');
  for (const plan of store.variablePlans) {
    await supabase.from('variable_expense_plans').insert({
      id: plan.id,
      user_id: plan.userId,
      name: plan.name,
      planned: plan.planned,
      category: plan.category,
      start_date: plan.startDate,
      end_date: plan.endDate
    });
  }
  console.log(`✅ Migrated ${store.variablePlans.length} variable plans`);
  
  // Step 7: Migrate variable actuals
  console.log('📝 Migrating variable actuals...');
  for (const actual of store.variableActuals) {
    await supabase.from('variable_expense_actuals').insert({
      id: actual.id,
      user_id: actual.userId,
      plan_id: actual.planId,
      amount: actual.amount,
      incurred_at: actual.incurredAt,
      justification: actual.justification,
      subcategory: actual.subcategory || 'Unspecified',
      payment_mode: actual.paymentMode || 'Cash',
      credit_card_id: actual.creditCardId || null
    });
  }
  console.log(`✅ Migrated ${store.variableActuals.length} variable actuals`);
  
  // Step 8: Migrate investments
  console.log('📈 Migrating investments...');
  for (const investment of store.investments) {
    await supabase.from('investments').insert({
      id: investment.id,
      user_id: investment.userId,
      name: investment.name,
      goal: investment.goal,
      monthly_amount: investment.monthlyAmount,
      status: investment.status || 'active'
    });
  }
  console.log(`✅ Migrated ${store.investments.length} investments`);
  
  // Step 9: Migrate future bombs
  console.log('💣 Migrating future bombs...');
  for (const bomb of store.futureBombs) {
    await supabase.from('future_bombs').insert({
      id: bomb.id,
      user_id: bomb.userId,
      name: bomb.name,
      due_date: bomb.dueDate,
      total_amount: bomb.totalAmount,
      saved_amount: bomb.savedAmount,
      monthly_equivalent: bomb.monthlyEquivalent,
      preparedness_ratio: bomb.preparednessRatio
    });
  }
  console.log(`✅ Migrated ${store.futureBombs.length} future bombs`);
  
  // Step 10: Migrate credit cards
  console.log('💳 Migrating credit cards...');
  for (const card of store.creditCards) {
    await supabase.from('credit_cards').insert({
      id: card.id,
      user_id: card.userId,
      name: card.name,
      statement_date: card.statementDate,
      due_date: card.dueDate,
      bill_amount: card.billAmount,
      paid_amount: card.paidAmount,
      current_expenses: card.currentExpenses || 0,
      billing_date: card.billingDate,
      needs_bill_update: card.needsBillUpdate || false
    });
  }
  console.log(`✅ Migrated ${store.creditCards.length} credit cards`);
  
  // Step 11: Migrate loans
  console.log('🏦 Migrating loans...');
  for (const loan of store.loans) {
    await supabase.from('loans').insert({
      id: loan.id,
      user_id: loan.userId,
      name: loan.name,
      principal: loan.principal,
      remaining_tenure_months: loan.remainingTenureMonths,
      emi: loan.emi
    });
  }
  console.log(`✅ Migrated ${store.loans.length} loans`);
  
  // Step 12: Migrate activities
  console.log('📜 Migrating activities...');
  for (const activity of store.activities) {
    await supabase.from('activities').insert({
      id: activity.id,
      actor_id: activity.actorId,
      entity: activity.entity,
      action: activity.action,
      payload: activity.payload,
      created_at: activity.createdAt
    });
  }
  console.log(`✅ Migrated ${store.activities.length} activities`);
  
  // Step 13: Migrate preferences
  console.log('⚙️ Migrating preferences...');
  for (const pref of store.preferences || []) {
    await supabase.from('user_preferences').insert({
      user_id: pref.userId,
      month_start_day: pref.monthStartDay || 1,
      currency: pref.currency || 'INR',
      timezone: pref.timezone || 'Asia/Kolkata',
      use_prorated: pref.useProrated || false
    });
  }
  console.log(`✅ Migrated ${store.preferences?.length || 0} preferences`);
  
  // Step 14: Migrate theme states
  console.log('🎨 Migrating theme states...');
  for (const theme of store.themeStates || []) {
    await supabase.from('theme_states').insert({
      id: theme.id,
      owner_ref: theme.ownerRef,
      mode: theme.mode || 'health_auto',
      selected_theme: theme.selectedTheme,
      constraint_tier_effect: theme.constraintTierEffect !== false
    });
  }
  console.log(`✅ Migrated ${store.themeStates?.length || 0} theme states`);
  
  // Step 15: Migrate shared accounts
  console.log('👥 Migrating shared accounts...');
  for (const account of store.sharedAccounts || []) {
    await supabase.from('shared_accounts').insert({
      id: account.id,
      name: account.name
    });
  }
  console.log(`✅ Migrated ${store.sharedAccounts?.length || 0} shared accounts`);
  
  // Step 16: Migrate shared members
  console.log('👥 Migrating shared members...');
  for (const member of store.sharedMembers || []) {
    await supabase.from('shared_members').insert({
      id: member.id,
      shared_account_id: member.sharedAccountId,
      user_id: member.userId,
      role: member.role,
      merge_finances: member.mergeFinances || false
    });
  }
  console.log(`✅ Migrated ${store.sharedMembers?.length || 0} shared members`);
  
  // Step 17: Migrate sharing requests
  console.log('📨 Migrating sharing requests...');
  for (const request of store.sharingRequests || []) {
    await supabase.from('sharing_requests').insert({
      id: request.id,
      inviter_id: request.inviterId,
      invitee_email: request.inviteeEmail,
      invitee_id: request.inviteeId,
      role: request.role,
      merge_finances: request.mergeFinances || false,
      status: request.status || 'pending'
    });
  }
  console.log(`✅ Migrated ${store.sharingRequests?.length || 0} sharing requests`);
  
  console.log('✅ Migration completed successfully!');
}

// Run migration
migrate().catch(console.error);
```

---

## 🔄 Step 3: Update Backend Code

### Install Supabase Client

```bash
cd backend
npm install @supabase/supabase-js
```

### Create Supabase Service

```typescript
// backend/src/supabase.ts

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);
```

### Update Store Functions

Replace file I/O with Supabase queries:

```typescript
// Example: backend/src/store.ts (updated)

import { supabase } from './supabase';

export async function getUserById(userId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (error) throw error;
  return data;
}

export async function addIncome(userId: string, data: Omit<Income, "id" | "userId">): Promise<Income> {
  const { data: income, error } = await supabase
    .from('incomes')
    .insert({
      user_id: userId,
      ...data
    })
    .select()
    .single();
  
  if (error) throw error;
  return income;
}

// ... update all other functions similarly
```

---

## ✅ Step 4: Verification

### Data Integrity Checks

```typescript
// backend/scripts/verify-migration.ts

async function verifyMigration() {
  // Count records
  const { count: userCount } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });
  
  const { count: incomeCount } = await supabase
    .from('incomes')
    .select('*', { count: 'exact', head: true });
  
  // Compare with original JSON
  console.log(`Users: ${userCount} (expected: ${originalStore.users.length})`);
  console.log(`Incomes: ${incomeCount} (expected: ${originalStore.incomes.length})`);
  
  // Verify relationships
  const { data: orphanedIncomes } = await supabase
    .from('incomes')
    .select('user_id')
    .not('user_id', 'in', 
      supabase.from('users').select('id')
    );
  
  if (orphanedIncomes?.length) {
    console.error('❌ Found orphaned incomes!');
  }
}
```

---

## 🚀 Step 5: Deployment Strategy

### Option A: Zero-Downtime Migration

1. **Deploy new code** with Supabase support (feature flag)
2. **Run migration** in background
3. **Verify data** matches
4. **Switch feature flag** to use Supabase
5. **Monitor** for 24 hours
6. **Remove old code** and JSON file

### Option B: Maintenance Window

1. **Put app in maintenance mode**
2. **Export JSON data**
3. **Run migration**
4. **Verify data**
5. **Deploy new code**
6. **Remove maintenance mode**

---

## 🔙 Rollback Plan

### If Migration Fails

1. **Keep JSON file** as backup
2. **Revert code** to use JSON file
3. **Restore from backup** if needed
4. **Fix issues** and retry migration

### Backup Strategy

```bash
# Before migration
cp data/finflow-data.json data/finflow-data-backup-$(date +%Y%m%d).json

# Export Supabase data after migration
# (Create export script using Supabase API)
```

---

## 📝 Migration Checklist

- [ ] Create Supabase project
- [ ] Design database schema
- [ ] Create all tables in Supabase
- [ ] Export current JSON data
- [ ] Write migration script
- [ ] Test migration on local copy
- [ ] Verify data integrity
- [ ] Update backend code
- [ ] Test all endpoints
- [ ] Deploy to staging
- [ ] Run production migration
- [ ] Verify production data
- [ ] Switch to Supabase
- [ ] Monitor for 24 hours
- [ ] Remove old JSON code
- [ ] Update documentation

---

## ⏱️ Estimated Time

- **Schema Design**: 2-3 hours
- **Migration Script**: 4-6 hours
- **Backend Updates**: 6-8 hours
- **Testing**: 4-6 hours
- **Deployment**: 2-3 hours

**Total**: 18-26 hours (2-3 days)

---

## 🎯 Next Steps

1. Create Supabase project (free)
2. Run SQL schema creation
3. Export current data from Railway
4. Test migration script locally
5. Update backend code
6. Deploy and migrate

---

**This migration ensures zero data loss and maintains all existing user data!**


