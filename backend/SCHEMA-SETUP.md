# 🗄️ Database Schema Setup

## ✅ Step 1: Create Schema in Supabase

The easiest way is to use Supabase SQL Editor:

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard
2. **Select your project**: `lvwpurwrktdblctzwctr`
3. **Click "SQL Editor"** in the left sidebar
4. **Click "New query"**
5. **Open** `backend/supabase/schema.sql` in your code editor
6. **Copy ALL the SQL content** (Ctrl+A, Ctrl+C)
7. **Paste into Supabase SQL Editor**
8. **Click "Run"** (or press Ctrl+Enter)

## ✅ Step 2: Verify Tables Created

After running the schema:

1. Go to **Table Editor** in Supabase Dashboard
2. You should see **16 tables**:
   - ✅ users
   - ✅ constraint_scores
   - ✅ incomes
   - ✅ fixed_expenses
   - ✅ variable_expense_plans
   - ✅ variable_expense_actuals
   - ✅ investments
   - ✅ future_bombs
   - ✅ credit_cards
   - ✅ loans
   - ✅ activities
   - ✅ user_preferences
   - ✅ theme_states
   - ✅ shared_accounts
   - ✅ shared_members
   - ✅ sharing_requests

## ✅ Step 3: Test Connection

After schema is created, test the connection:

```bash
cd backend
npm run test-supabase
```

You should see: `✅ Supabase connection successful!`

---

## 🚀 Next Steps

Once schema is created and connection tested:
1. ✅ Export current data from Railway
2. ✅ Run migration script
3. ✅ Update backend code
4. ✅ Deploy

---

**Note**: The schema file is at `backend/supabase/schema.sql`

