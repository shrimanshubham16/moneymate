# 🚀 Quick Start: Supabase Setup

## ✅ What's Done

- ✅ Supabase project created
- ✅ Environment variables configured (`.env` file)
- ✅ Supabase client installed
- ✅ Database schema SQL file ready

## 📋 Next Steps

### Step 1: Create Database Schema

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard/project/lvwpurwrktdblctzwctr
2. **Click "SQL Editor"** in left sidebar
3. **Click "New query"**
4. **Open** `backend/supabase/schema.sql` in your editor
5. **Copy ALL content** (Ctrl+A, Ctrl+C)
6. **Paste into SQL Editor**
7. **Click "Run"** (or Ctrl+Enter)

### Step 2: Verify Schema Created

1. Go to **Table Editor** in Supabase Dashboard
2. You should see **16 tables** created

### Step 3: Test Connection (Optional)

```bash
cd backend
npm run test-supabase
```

---

## 🔑 Your Credentials (Already Set)

- **Project URL**: `https://lvwpurwrktdblctzwctr.supabase.co`
- **Service Role Key**: Set in `.env` file
- **Publishable Key**: `sb_publishable_3hWt-5b9yLGptaBmzWtnzg_1WbRjVDl`

---

## 📝 Connection String (Optional)

If you need the connection string later:
1. Go to **Settings** → **Database**
2. Copy **Connection String** (URI)
3. Replace `[YOUR-PASSWORD]` with your database password

---

## ✅ After Schema is Created

Once you've run the schema SQL:
1. ✅ Tables will be created
2. ✅ Ready for data migration
3. ✅ Can start updating backend code

**Let me know when the schema is created, and we'll proceed with the migration!**

