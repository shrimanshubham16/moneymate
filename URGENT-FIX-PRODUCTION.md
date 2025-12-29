# 🚨 URGENT: Fix Production API URL

## Problem
Production is trying to connect to `localhost:12022` instead of your Railway backend.

**Error:**
```
Access to fetch at 'http://localhost:12022/auth/signup' from origin 'https://freefinflow.vercel.app' 
has been blocked by CORS policy
```

## Quick Fix (5 minutes)

### Step 1: Get Your Railway Backend URL
1. Go to **Railway**: https://railway.app/
2. Select your **backend service**
3. Go to **Settings** → **Networking**
4. Copy your **Public Domain** 
   - Example: `https://moneymate-backend-production.up.railway.app`
   - OR check **Deployments** tab for the URL

### Step 2: Set VITE_API_URL in Vercel
1. Go to **Vercel**: https://vercel.com/
2. Select your **FinFlow** project
3. Go to **Settings** → **Environment Variables**
4. Click **"Add New"**
5. Fill in:
   - **Key**: `VITE_API_URL`
   - **Value**: `https://your-railway-url.up.railway.app` (paste your Railway URL)
   - **Environment**: Check all (Production, Preview, Development)
6. Click **"Save"**

### Step 3: Redeploy Vercel
1. Go to **Deployments** tab
2. Click **three dots** (⋯) on latest deployment
3. Click **"Redeploy"**
4. Wait 2-3 minutes

### Step 4: Verify CORS in Railway
1. Go back to **Railway**
2. **Settings** → **Variables**
3. Check `ALLOWED_ORIGINS` includes:
   ```
   https://freefinflow.vercel.app,http://localhost:5173
   ```
4. If missing, add it and **Redeploy** Railway

## Verify It Works
1. Visit: `https://freefinflow.vercel.app/`
2. Open browser console (F12)
3. Try to sign up
4. Check Network tab - should see requests to Railway URL (not localhost)
5. Should work! ✅

---

## Performance Issue (Load Time)

The app bundle is **1.1MB** which is large. This is causing slow load times.

### Immediate Fixes (Already Done)
- ✅ ErrorBoundary added
- ✅ Code is optimized

### Future Optimizations (v1.3)
- Lazy load routes
- Code splitting
- Image optimization
- Bundle size reduction

**For now, the app will work but may load slowly on mobile/slow connections.**

---

## Still Not Working?

1. **Clear browser cache** (Cmd+Shift+R or Ctrl+Shift+R)
2. **Check Railway logs** for backend errors
3. **Check Vercel logs** for build errors
4. **Verify** environment variable is set correctly

