# Railway Environment Variables Setup

## Critical: SUPABASE_CONNECTION_STRING Missing

The backend requires `SUPABASE_CONNECTION_STRING` to connect to Supabase PostgreSQL.

## How to Set Environment Variables in Railway

### Step 1: Use the Direct Connection String

**For Railway, use the Direct connection (port 5432):**

```
postgresql://postgres:H4suXkPFKQ1O6jA9@db.lvwpurwrktdblctzwctr.supabase.co:5432/postgres
```

**Note:** The transactional connection (port 6543) is for serverless/connection pooling. Railway runs a persistent server, so direct connection is better.

### Step 2: Set in Railway

1. Go to **Railway Dashboard**: https://railway.app
2. Select your backend project
3. Click on your service
4. Go to **Variables** tab
5. Click **+ New Variable**
6. Add:
   - **Name**: `SUPABASE_CONNECTION_STRING`
   - **Value**: `postgresql://postgres:H4suXkPFKQ1O6jA9@db.lvwpurwrktdblctzwctr.supabase.co:5432/postgres`
7. Click **Add**
8. **Redeploy** your service (Railway should auto-redeploy, but you can trigger manually)

### Step 3: Verify

After setting the variable and redeploying, check the Railway logs:
- Should see: `🚀 FinFlow backend listening on port...`
- Should NOT see: `SUPABASE_CONNECTION_STRING not found in .env file`

## Required Environment Variables

Make sure these are set in Railway:

1. ✅ `SUPABASE_CONNECTION_STRING` - **CRITICAL - Currently Missing**
2. ✅ `JWT_SECRET` - For authentication
3. ✅ `PORT` - Server port (usually 12022 or Railway auto-assigns)
4. ✅ `NODE_ENV` - Set to `production`
5. ✅ `ALLOWED_ORIGINS` - Your frontend URL (e.g., `https://freefinflow.vercel.app`)

## Quick Fix Command

If you have Railway CLI:

```bash
railway variables set SUPABASE_CONNECTION_STRING="postgresql://postgres:H4suXkPFKQ1O6jA9@db.lvwpurwrktdblctzwctr.supabase.co:5432/postgres"
```

## After Setting Variables

1. Railway will auto-redeploy
2. Wait 1-2 minutes for deployment
3. Test the backend: `curl https://your-railway-url.railway.app/health`
4. Should return: `{"status":"ok"}`

---

**Connection String to Use:**
```
postgresql://postgres:H4suXkPFKQ1O6jA9@db.lvwpurwrktdblctzwctr.supabase.co:5432/postgres
```

This is the **Direct connection** (port 5432), which is best for Railway's persistent server setup.

