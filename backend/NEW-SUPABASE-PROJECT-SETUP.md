# 🆕 New Supabase Project Setup Checklist

Since this is a **NEW** Supabase project, here's what needs to be configured:

## ✅ Step 1: Verify Project is Active

1. Go to Supabase Dashboard
2. Check **Project Status** - should show **green circle** (Active)
3. If not active, wait 2-3 minutes for project to fully initialize

## ✅ Step 2: Create Database Schema

**CRITICAL**: The schema must be created before the API will work!

1. Go to **SQL Editor** in Supabase Dashboard
2. Click **New query**
3. Open `backend/supabase/schema.sql` in your code editor
4. Copy **ALL** SQL content
5. Paste into Supabase SQL Editor
6. Click **Run** (or press Ctrl+Enter)
7. Wait for "Success. No rows returned" message

**Verify schema was created:**
- Go to **Table Editor**
- You should see **16 tables**:
  - users
  - constraint_scores
  - incomes
  - fixed_expenses
  - variable_expense_plans
  - variable_expense_actuals
  - investments
  - future_bombs
  - credit_cards
  - loans
  - activities
  - user_preferences
  - theme_states
  - shared_accounts
  - shared_members
  - sharing_requests
  - payments

## ✅ Step 3: Disable Row Level Security (RLS)

**IMPORTANT**: Since we're using Service Role Key (bypasses RLS), we should either:
- **Option A**: Disable RLS on all tables (easier for now)
- **Option B**: Keep RLS enabled but use Service Role Key (current setup)

For **Option A** (Disable RLS):

Run this in SQL Editor:
```sql
-- Disable RLS on all tables
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE constraint_scores DISABLE ROW LEVEL SECURITY;
ALTER TABLE incomes DISABLE ROW LEVEL SECURITY;
ALTER TABLE fixed_expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE variable_expense_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE variable_expense_actuals DISABLE ROW LEVEL SECURITY;
ALTER TABLE investments DISABLE ROW LEVEL SECURITY;
ALTER TABLE future_bombs DISABLE ROW LEVEL SECURITY;
ALTER TABLE credit_cards DISABLE ROW LEVEL SECURITY;
ALTER TABLE loans DISABLE ROW LEVEL SECURITY;
ALTER TABLE activities DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences DISABLE ROW LEVEL SECURITY;
ALTER TABLE theme_states DISABLE ROW LEVEL SECURITY;
ALTER TABLE shared_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE shared_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE sharing_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
```

**OR** keep RLS enabled (current setup should work with Service Role Key).

## ✅ Step 4: Verify API Settings

1. Go to **Settings** → **API**
2. Check:
   - **Project URL**: Should match your `.env` file
   - **Project API keys**: Should show `anon` and `service_role` keys
   - **Service Role Key**: Copy this to `.env` as `SUPABASE_SERVICE_ROLE_KEY`

## ✅ Step 5: Check Database Connection

1. Go to **Settings** → **Database**
2. Verify:
   - **Connection string** is available
   - **Connection pooling** is enabled
   - **Direct connection** shows connection string

## ✅ Step 6: Test Connection

After completing steps 1-5:

```bash
cd backend
npm run verify-config
```

Should see:
```
✅ API is reachable
✅ Database connection successful!
```

## Common Issues with New Projects

### Issue: "503 Service Unavailable"
**Cause**: Project still initializing or schema not created
**Fix**: 
- Wait 2-3 minutes after project creation
- Ensure schema is created (Step 2)

### Issue: "relation does not exist"
**Cause**: Schema not created yet
**Fix**: Run `schema.sql` in SQL Editor (Step 2)

### Issue: "permission denied"
**Cause**: RLS blocking access
**Fix**: Disable RLS (Step 3) or ensure Service Role Key is used

### Issue: "invalid API key"
**Cause**: Wrong service role key
**Fix**: Get correct key from Settings → API → service_role

## Quick Test After Setup

```bash
# 1. Verify config
npm run verify-config

# 2. Test connection
npm run check-supabase

# 3. Create test user
npm run create-test-user

# 4. Test login
npm run test-existing-user testuser Test123!@#
```

---

**Most Common Issue**: Schema not created! Make sure you run `schema.sql` in SQL Editor first!

