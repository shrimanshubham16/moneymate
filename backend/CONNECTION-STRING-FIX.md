# 🔧 Connection String Fix

## Issue
The connection string format might be incorrect. Supabase provides different connection strings for:
1. **Connection Pooling** (port 6543) - for serverless/server applications
2. **Direct Connection** (port 5432) - for migrations and direct access

## Solution

### Option 1: Use Direct Connection String

1. Go to **Supabase Dashboard** → **Settings** → **Database**
2. Find **Connection String** section
3. Select **URI** tab
4. Copy the **Direct connection** string (port 5432, not 6543)
5. It should look like:
   ```
   postgresql://postgres.lvwpurwrktdblctzwctr:[PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:5432/postgres
   ```
   OR
   ```
   postgresql://postgres:[PASSWORD]@db.lvwpurwrktdblctzwctr.supabase.co:5432/postgres
   ```

### Option 2: Fix Current Connection String

If using connection pooling (port 6543), the format should be:
```
postgresql://postgres.lvwpurwrktdblctzwctr:[ENCODED-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

Note: Add `?pgbouncer=true` parameter for connection pooling.

### Option 3: Use Transaction Mode

For connection pooling, you might need transaction mode:
```
postgresql://postgres.lvwpurwrktdblctzwctr:[ENCODED-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require
```

---

## Update .env File

After getting the correct connection string, update `backend/.env`:

```bash
SUPABASE_CONNECTION_STRING=postgresql://postgres.lvwpurwrktdblctzwctr:[ENCODED-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:5432/postgres
```

Replace `[ENCODED-PASSWORD]` with your URL-encoded password.


