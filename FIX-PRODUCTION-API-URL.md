# 🚨 Fix Production API URL Issue

## Problem
Production frontend (`https://freefinflow.vercel.app`) is trying to connect to `http://localhost:12022` instead of your Railway backend.

**Error:**
```
Access to fetch at 'http://localhost:12022/auth/signup' from origin 'https://freefinflow.vercel.app' 
has been blocked by CORS policy
```

## Root Cause
The `VITE_API_URL` environment variable is not set in Vercel, so it's defaulting to `localhost:12022`.

## Solution

### Step 1: Get Your Railway Backend URL
1. Go to Railway: https://railway.app/
2. Select your backend service
3. Go to **Settings** → **Networking**
4. Copy your **Public Domain** (e.g., `https://moneymate-backend-production.up.railway.app`)
5. **OR** check the **Deployments** tab for the latest deployment URL

### Step 2: Set VITE_API_URL in Vercel
1. Go to Vercel: https://vercel.com/
2. Select your **FinFlow** project
3. Go to **Settings** → **Environment Variables**
4. Click **Add New**
5. Add:
   - **Key**: `VITE_API_URL`
   - **Value**: `https://your-railway-backend-url.up.railway.app` (your actual Railway URL)
   - **Environment**: Select all (Production, Preview, Development)
6. Click **Save**

### Step 3: Redeploy Vercel
1. Go to **Deployments** tab
2. Click the **three dots** (⋯) on the latest deployment
3. Click **Redeploy**
4. Wait for deployment to complete (~2-3 minutes)

### Step 4: Verify CORS in Railway
1. Go back to Railway
2. Go to **Settings** → **Variables**
3. Verify `ALLOWED_ORIGINS` includes:
   ```
   https://freefinflow.vercel.app,http://localhost:5173
   ```
4. If not, update it and **Redeploy** Railway

## Quick Fix Commands

If you have Railway CLI:
```bash
# Get your Railway URL
railway status

# Update Vercel via CLI (if you have it)
vercel env add VITE_API_URL production
# Then enter your Railway URL when prompted
```

## Verification

After redeploy:
1. Visit `https://freefinflow.vercel.app/`
2. Open browser console (F12)
3. Try to sign up
4. Check Network tab - should see requests to your Railway URL (not localhost)
5. Should work without CORS errors

## Performance Issue

The load time issue might be due to:
1. **Large bundle size** (1.1MB JavaScript)
2. **No code splitting**
3. **All dependencies loaded upfront**

**Quick fixes:**
- Already implemented: ErrorBoundary
- Consider: Lazy loading routes (future optimization)

---

## Still Having Issues?

1. **Check Railway logs** for backend errors
2. **Check Vercel logs** for build errors
3. **Verify environment variables** are set correctly
4. **Clear browser cache** and hard refresh (Cmd+Shift+R)

