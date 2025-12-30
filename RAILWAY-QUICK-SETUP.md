# 🚀 Quick Railway Setup - Copy & Paste

## Set This Environment Variable in Railway

**Variable Name:** `SUPABASE_CONNECTION_STRING`

**Variable Value:**
```
postgresql://postgres:H4suXkPFKQ1O6jA9@db.lvwpurwrktdblctzwctr.supabase.co:5432/postgres
```

## Steps

1. Go to **Railway Dashboard**: https://railway.app
2. Select your **backend project**
3. Click on your **service**
4. Go to **Variables** tab
5. Click **+ New Variable**
6. Paste:
   - **Name**: `SUPABASE_CONNECTION_STRING`
   - **Value**: `postgresql://postgres:H4suXkPFKQ1O6jA9@db.lvwpurwrktdblctzwctr.supabase.co:5432/postgres`
7. Click **Add**
8. Railway will **auto-redeploy** (wait 1-2 minutes)

## Verify

After deployment, check Railway logs:
- ✅ Should see: `🚀 FinFlow backend listening on port...`
- ❌ Should NOT see: `SUPABASE_CONNECTION_STRING not found`

Test the backend:
```bash
curl https://your-railway-url.railway.app/health
```
Should return: `{"status":"ok"}`

---

**That's it!** Your backend should now connect to Supabase successfully.

