# 🔧 Add ALLOWED_ORIGINS to Railway

## 🚨 Problem

The `ALLOWED_ORIGINS` environment variable doesn't exist in Railway, so the backend is only allowing `http://localhost:5173`, which blocks your new Vercel domain.

---

## ✅ Solution: Add ALLOWED_ORIGINS Variable

### Step 1: Get Your New Vercel Domain

1. **Go to Vercel Dashboard**: https://vercel.com/
2. **Select your project**
3. **Go to Settings → Domains**
4. **Copy your new domain** (e.g., `finflow.vercel.app` or your custom domain)

### Step 2: Add ALLOWED_ORIGINS in Railway

1. **Go to Railway Dashboard**: https://railway.app/
2. **Select your backend service** (`moneymate-production-1036` or similar)
3. **Go to Settings → Variables** tab
4. **Click "New Variable"** or "Add Variable" button
5. **Fill in:**
   - **Variable Name**: `ALLOWED_ORIGINS`
   - **Value**: `https://your-new-vercel-domain.vercel.app,http://localhost:5173`
   
   **Example:**
   ```
   https://finflow.vercel.app,http://localhost:5173
   ```
   
   **If you have a custom domain:**
   ```
   https://finflow.com,http://localhost:5173
   ```
   
   **If you have both Vercel domain AND custom domain:**
   ```
   https://finflow.vercel.app,https://finflow.com,http://localhost:5173
   ```

6. **Click "Add"** or "Save"

### Step 3: Restart Railway Service

After adding the variable, Railway should automatically redeploy. If not:

1. **Go to Deployments** tab
2. **Click "Redeploy"** on the latest deployment
   - OR
3. **Go to Settings → Restart** (if available)

This ensures the new environment variable is loaded.

---

## 🔍 Step 4: Verify It's Working

### Check Railway Logs:

1. **Go to Railway → Your Service → Logs**
2. **Look for the startup message:**
   ```
   🔒 CORS origins: https://your-new-domain.vercel.app, http://localhost:5173
   ```
3. **This confirms the variable is loaded correctly**

### Test from Browser:

1. **Visit your new Vercel site**
2. **Open browser console** (`F12`)
3. **Try to use the app** (login, etc.)
4. **Check for CORS errors:**
   - ✅ No CORS errors = Working!
   - ❌ CORS errors = Check the domain format

---

## 📋 Format Requirements

### ✅ Correct Format:
```
https://finflow.vercel.app,http://localhost:5173
```

### ❌ Common Mistakes:
- **No protocol**: `finflow.vercel.app` (missing `https://`)
- **Trailing slash**: `https://finflow.vercel.app/` (shouldn't have `/`)
- **Spaces**: `https://finflow.vercel.app , http://localhost:5173` (no spaces around comma)
- **Wrong protocol**: `http://finflow.vercel.app` (should be `https://` for production)

---

## 🎯 Expected Result

After adding `ALLOWED_ORIGINS` and restarting:

1. ✅ Railway logs show your new domain in CORS origins
2. ✅ Your Vercel site can connect to the backend
3. ✅ No CORS errors in browser console
4. ✅ App works normally

---

## 🐛 If Still Not Working

### Check These:

1. **Variable Name**: Must be exactly `ALLOWED_ORIGINS` (case-sensitive)
2. **Domain Format**: Must include `https://` and no trailing slash
3. **Railway Restart**: Service must be restarted after adding variable
4. **Vercel Environment**: Make sure `VITE_API_URL` in Vercel points to Railway backend

### Debug Steps:

1. **Check Railway logs** for the CORS origins message
2. **Check browser console** for specific CORS error messages
3. **Verify domain matches exactly** (including protocol and no trailing slash)

---

**Share your new Vercel domain and I can give you the exact value to paste!**

