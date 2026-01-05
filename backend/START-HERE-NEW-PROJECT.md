# 🚀 START HERE: New Supabase Project Setup

Since this is a **NEW** Supabase project, follow these steps in order:

## ✅ Step 1: Wait for Project to Initialize (2-3 minutes)

New Supabase projects take 2-3 minutes to fully initialize. The "schema cache" error is normal during this time.

**Just wait 2-3 minutes**, then proceed to Step 2.

## ✅ Step 2: Create Database Schema (CRITICAL!)

**This is the most important step!** Without the schema, nothing will work.

### In Supabase Dashboard:

1. **Go to SQL Editor** (left sidebar, icon looks like `</>`)
2. **Click "New query"** button
3. **Open** `backend/supabase/schema.sql` in your code editor
4. **Copy ALL** the SQL content (Ctrl+A, Ctrl+C)
5. **Paste** into Supabase SQL Editor
6. **Click "Run"** button (or press Ctrl+Enter)
7. **Wait** for "Success. No rows returned" message

### Verify Schema Was Created:

1. Go to **Table Editor** (left sidebar, grid icon)
2. You should see **17 tables**:
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

## ✅ Step 3: Verify Everything Works

After creating the schema, run:

```bash
cd backend
npm run check-schema
```

You should see:
```
✅ All tables exist! Schema is complete.
```

Then test connection:
```bash
npm run verify-config
```

You should see:
```
✅ API is reachable
✅ Database connection successful!
```

## ✅ Step 4: Test the Backend

Once schema is created and verified:

```bash
# Create a test user
npm run create-test-user

# Test login
npm run test-existing-user testuser Test123!@#
```

## Common Issues

### "Schema cache" error
**Fix**: Wait 2-3 minutes for project to initialize, then try again

### "relation does not exist"
**Fix**: Schema not created - go back to Step 2

### "503 Service Unavailable"
**Fix**: 
- Wait 2-3 minutes (project still initializing)
- Check Supabase status: https://status.supabase.com

### Tables don't appear in Table Editor
**Fix**: 
- Refresh the page
- Check SQL Editor for any error messages
- Re-run the schema SQL

## Quick Checklist

- [ ] Waited 2-3 minutes for project initialization
- [ ] Created schema in SQL Editor (Step 2)
- [ ] Verified 17 tables exist in Table Editor
- [ ] `npm run check-schema` shows all tables exist
- [ ] `npm run verify-config` shows API is reachable
- [ ] Created test user successfully
- [ ] Tested login successfully

---

**Most Important**: Create the schema in SQL Editor! Without it, nothing will work.



