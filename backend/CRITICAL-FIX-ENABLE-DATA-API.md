# 🚨 CRITICAL FIX: Enable Data API in Supabase

## The Problem

When creating the Supabase project, "Only Connection String" was selected, which **DISABLED the Data API (PostgREST)**.

This is why we're getting 503 errors - the REST API is not available!

## The Fix

### Option 1: Enable Data API in Supabase (Recommended)

1. Go to **Supabase Dashboard**: https://supabase.com/dashboard/project/lvwpurwrktdblctzwctr
2. Go to **Settings** → **API**
3. Look for **"Data API"** or **"PostgREST"** settings
4. **Enable the Data API** / Enable PostgREST
5. Select **"public"** schema for the API
6. Save changes
7. Wait 1-2 minutes for changes to take effect

### Option 2: Project Settings

1. Go to **Settings** → **General** or **Database**
2. Look for **API Configuration** section
3. Enable **"Data API"** or **"REST API"**
4. Make sure `public` schema is exposed

### Option 3: Recreate Project with Data API Enabled

If you can't find the setting:
1. Create a new Supabase project
2. This time select **"Data API + Connection String"** (NOT "Only Connection String")
3. Migrate data again using the migration script

## After Enabling Data API

Once Data API is enabled:

```bash
cd backend
npm run verify-config
# Should show: ✅ API is reachable

npm run check-schema
# Should show all tables exist

npm run test-existing-user shubham c0nsT@nt
# Should work!
```

## Why This Happened

When creating the project, you were asked:
- **Data API + Connection String** - Enables REST API (PostgREST) + direct connection
- **Only Connection String** - DISABLES REST API, only direct PostgreSQL connection

The Supabase JS client uses the REST API, so it doesn't work when Data API is disabled.

## Alternative: Use Direct PostgreSQL

If Data API can't be enabled, we would need to rewrite the backend to use direct PostgreSQL connection (pg library) instead of the Supabase client.

The data migration worked because it used direct PostgreSQL connection, not the REST API.

---

**Action Required**: Enable Data API in Supabase Dashboard → Settings


