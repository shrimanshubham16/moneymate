# 🔧 Fix Production Issues - MoneyMate

## Problem
Everything works locally but is missing/broken in production at https://moneymate-phi.vercel.app/

## Most Common Issue: Missing Environment Variables

### Step 1: Check Vercel Environment Variables

1. **Go to Vercel Dashboard**: https://vercel.com/
2. **Select your MoneyMate project**
3. **Go to Settings → Environment Variables**
4. **Verify `VITE_API_URL` is set:**
   - Should be your Railway backend URL
   - Example: `https://moneymate-backend-production.up.railway.app`
   - **NOT** `http://localhost:12022`

### Step 2: Get Your Railway Backend URL

1. **Go to Railway Dashboard**: https://railway.app/
2. **Select your backend service**
3. **Copy the URL** from:
   - Settings → Domains
   - OR from the deployment logs
   - Format: `https://your-service-name.up.railway.app`

### Step 3: Set Environment Variable in Vercel

1. **In Vercel → Settings → Environment Variables**
2. **Add/Update:**
   ```
   Name: VITE_API_URL
   Value: https://your-railway-backend-url.up.railway.app
   Environment: Production, Preview, Development (select all)
   ```
3. **Click "Save"**

### Step 4: Redeploy Frontend

1. **Go to Vercel → Deployments**
2. **Click "Redeploy"** on the latest deployment
3. **Wait for build to complete** (~2-3 minutes)

---

## Other Common Issues

### Issue 2: CORS Not Configured

**Symptoms:** API calls fail with CORS errors in browser console

**Fix:**
1. **Go to Railway Dashboard**
2. **Select your backend service**
3. **Go to Settings → Variables**
4. **Update `ALLOWED_ORIGINS`:**
   ```
   https://moneymate-phi.vercel.app,http://localhost:5173
   ```
5. **Redeploy backend**

### Issue 3: Backend Not Running

**Symptoms:** All API calls fail with connection errors

**Fix:**
1. **Check Railway deployment status**
2. **View logs** for errors
3. **Verify environment variables** are set:
   - `PORT=12022` (or Railway's assigned port)
   - `NODE_ENV=production`
   - `JWT_SECRET=<your-secret>`
   - `ALLOWED_ORIGINS=<your-vercel-url>`

### Issue 4: Build Errors

**Symptoms:** Frontend doesn't build or shows errors

**Fix:**
1. **Check Vercel build logs**
2. **Verify all dependencies** are in `package.json`
3. **Check for TypeScript errors:**
   ```bash
   cd web
   npm run build
   ```

### Issue 5: Missing Features/Pages

**Symptoms:** Some pages or features don't appear

**Possible Causes:**
1. **Build didn't include latest code** → Redeploy
2. **Browser cache** → Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
3. **Code not merged to main** → Verify GitHub branch

---

## Quick Diagnostic Checklist

### ✅ Check These in Order:

1. **Vercel Environment Variables**
   - [ ] `VITE_API_URL` is set
   - [ ] Value is your Railway backend URL (not localhost)
   - [ ] Applied to Production environment

2. **Railway Backend**
   - [ ] Service is running
   - [ ] No errors in logs
   - [ ] `ALLOWED_ORIGINS` includes Vercel URL
   - [ ] Environment variables are set

3. **Vercel Deployment**
   - [ ] Latest code is deployed (check commit hash)
   - [ ] Build completed successfully
   - [ ] No build errors in logs

4. **Browser**
   - [ ] Hard refresh (clear cache)
   - [ ] Check browser console (F12) for errors
   - [ ] Check Network tab for failed API calls

---

## Debug Steps

### Step 1: Check Browser Console

1. **Open production site**: https://moneymate-phi.vercel.app/
2. **Press F12** to open DevTools
3. **Check Console tab** for errors
4. **Check Network tab** for failed requests

### Step 2: Verify API Connection

1. **In browser console, run:**
   ```javascript
   console.log('API URL:', import.meta.env.VITE_API_URL || 'http://localhost:12022');
   ```
2. **If it shows `localhost`, environment variable is not set**

### Step 3: Test API Endpoint

1. **Try accessing your backend directly:**
   ```
   https://your-railway-backend-url.up.railway.app/health
   ```
2. **Should return:** `{"status":"ok"}`
3. **If it fails, backend is not running**

---

## Most Likely Fix

**90% of production issues are caused by missing `VITE_API_URL`:**

1. **Set `VITE_API_URL` in Vercel** to your Railway backend URL
2. **Redeploy frontend**
3. **Update `ALLOWED_ORIGINS` in Railway** to include Vercel URL
4. **Redeploy backend**

---

## After Fixing

### Test These Features:

1. **Authentication**
   - [ ] Sign up works
   - [ ] Login works

2. **Dashboard**
   - [ ] Loads without errors
   - [ ] Shows health score
   - [ ] Shows all widgets

3. **Pages**
   - [ ] Income page
   - [ ] Fixed expenses page
   - [ ] Variable expenses page (with subcategory & payment mode)
   - [ ] Investments page
   - [ ] Credit cards page
   - [ ] Health page (variable expenses calculate correctly)
   - [ ] Current month expenses (charts work)
   - [ ] Activity page (shows details)

4. **v1.2 Features**
   - [ ] Subcategory selection
   - [ ] Payment mode selection
   - [ ] Credit card usage tracking
   - [ ] Interactive charts
   - [ ] Detailed activity log

---

## Still Not Working?

### Get More Info:

1. **Browser Console Errors** - Copy all errors
2. **Network Tab** - Check which requests are failing
3. **Vercel Build Logs** - Check for build errors
4. **Railway Logs** - Check for backend errors

### Common Error Messages:

- **"Request failed: 404"** → Backend URL is wrong
- **"CORS error"** → `ALLOWED_ORIGINS` not set correctly
- **"Network error"** → Backend is not running
- **"undefined is not a function"** → Build issue, code not included

---

## Quick Fix Command (If you have Vercel CLI)

```bash
cd web
vercel env add VITE_API_URL production
# Enter your Railway backend URL when prompted
vercel --prod
```

---

**Start with Step 1 - Check Vercel Environment Variables. This fixes 90% of production issues!**

