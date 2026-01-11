# 🔧 Supabase Setup Instructions

## ✅ What You Have

- **Project URL**: `https://lvwpurwrktdblctzwctr.supabase.co`
- **Publishable API Key**: `sb_publishable_3hWt-5b9yLGptaBmzWtnzg_1WbRjVDl`

## 🔑 What You Need to Get

### 1. Service Role Key (for backend/migrations)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **API**
4. Find **Service Role Key** (under "Project API keys")
5. **⚠️ Keep this secret!** This key bypasses Row Level Security
6. Copy the key

### 2. Connection String (for direct Postgres access)

1. Go to **Settings** → **Database**
2. Find **Connection String** section
3. Select **URI** tab
4. Copy the connection string
5. It will look like: `postgresql://postgres.[ref]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres`
6. Replace `[YOUR-PASSWORD]` with your database password (set during project creation)

**OR** use the **Connection Pooling** string (recommended for production)

---

## 📝 Environment Variables

Create a `.env` file in `backend/` directory:

```bash
# Supabase Configuration
SUPABASE_URL=https://lvwpurwrktdblctzwctr.supabase.co
SUPABASE_ANON_KEY=sb_publishable_3hWt-5b9yLGptaBmzWtnzg_1WbRjVDl
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
SUPABASE_CONNECTION_STRING=postgresql://postgres:[PASSWORD]@db.lvwpurwrktdblctzwctr.supabase.co:5432/postgres

# JWT Secret (keep existing)
JWT_SECRET=finflow-secret-key-change-in-production-2024

# Server Port
PORT=12022
```

---

## 🗄️ Next Steps

1. ✅ Get Service Role Key from Supabase Dashboard
2. ✅ Get Connection String from Supabase Dashboard
3. ✅ Create `.env` file with all variables
4. ✅ Run database schema creation (see below)

---

## 🚀 Creating Database Schema

### Option 1: Using Supabase Dashboard (Easiest)

1. Go to **SQL Editor** in Supabase Dashboard
2. Open `backend/supabase/schema.sql`
3. Copy all SQL content
4. Paste into SQL Editor
5. Click **Run**

### Option 2: Using psql (Command Line)

```bash
psql "your-connection-string" -f backend/supabase/schema.sql
```

---

## ✅ Verification

After running the schema, verify tables were created:

1. Go to **Table Editor** in Supabase Dashboard
2. You should see 16 tables:
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

---

## 🔒 Security Note

- **Service Role Key**: Never commit to git, never expose to frontend
- **Connection String**: Contains password, keep it secret
- Add `.env` to `.gitignore` if not already there


