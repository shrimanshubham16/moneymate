# Railway Environment Variables Setup

## Critical: SUPABASE_CONNECTION_STRING Missing

The backend requires `SUPABASE_CONNECTION_STRING` to connect to Supabase PostgreSQL.

## How to Set Environment Variables in Railway

### Step 1: Get Your Connection String

1. Go to **Supabase Dashboard**: https://supabase.com/dashboard/project/lvwpurwrktdblctzwctr
2. Navigate to **Settings** → **Database**
3. Find **Connection String** section
4. Select **URI** tab (NOT Connection Pooling)
5. Copy the connection string
6. Replace `[YOUR-PASSWORD]` with your actual password
7. URL-encode the password if it contains special characters:
   - Space → `%20`
   - `&` → `%26`
   - Example: `b0rn & BroughT UP in` → `b0rn%20%26%20BroughT%20UP%20in`

### Step 2: Set in Railway

1. Go to **Railway Dashboard**: https://railway.app
2. Select your backend project
3. Click on your service
4. Go to **Variables** tab
5. Click **+ New Variable**
6. Add:
   - **Name**: `SUPABASE_CONNECTION_STRING`
   - **Value**: Your full connection string (e.g., `postgresql://postgres:[ENCODED-PASSWORD]@db.lvwpurwrktdblctzwctr.supabase.co:5432/postgres`)
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
railway variables set SUPABASE_CONNECTION_STRING="postgresql://postgres:[PASSWORD]@db.lvwpurwrktdblctzwctr.supabase.co:5432/postgres"
```

## After Setting Variables

1. Railway will auto-redeploy
2. Wait 1-2 minutes for deployment
3. Test the backend: `curl https://your-railway-url.railway.app/health`
4. Should return: `{"status":"ok"}`

---

**Note**: The connection string format should be:
```
postgresql://postgres:[PASSWORD]@db.lvwpurwrktdblctzwctr.supabase.co:5432/postgres
```

NOT the connection pooling format (port 6543).

