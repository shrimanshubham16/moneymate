# 🔧 Fix Invalid Configuration After Domain Change

## 🚨 Problem

You changed the Vercel domain and removed the old one. Now you're seeing "invalid configuration" errors.

**Root Cause**: The Railway backend's `ALLOWED_ORIGINS` environment variable still has the old Vercel domain, so it's rejecting requests from your new domain.

---

## ✅ Solution: Update Railway CORS Settings

### Step 1: Get Your New Vercel Domain

1. **Go to Vercel Dashboard**: https://vercel.com/
2. **Select your project**
3. **Go to Settings → Domains**
4. **Copy your new domain** (e.g., `finflow.vercel.app` or your custom domain)

### Step 2: Update Railway ALLOWED_ORIGINS

1. **Go to Railway Dashboard**: https://railway.app/
2. **Select your backend service** (`moneymate-production-1036` or similar)
3. **Go to Settings → Variables**
4. **Find `ALLOWED_ORIGINS`** variable
5. **Click "Edit"** or update the value
6. **Set it to** (replace with your actual new domain):
   ```
   https://your-new-vercel-domain.vercel.app,http://localhost:5173
   ```
   
   **Example:**
   ```
   https://finflow.vercel.app,http://localhost:5173
   ```
   
   Or if you have a custom domain:
   ```
   https://finflow.com,http://localhost:5173
   ```

7. **Click "Save"** or "Update"

### Step 3: Restart Railway Service (if needed)

1. **In Railway**, go to your backend service
2. **Click "Deployments"** tab
3. **Click "Redeploy"** on the latest deployment
   - OR
4. **Go to Settings → Restart** (if available)

This ensures the new CORS settings take effect.

---

## 🔍 Step 4: Verify Configuration

### Test Backend Health:
```bash
curl https://moneymate-production-1036.up.railway.app/health
```
Should return: `{"status":"ok"}`

### Test CORS (from browser console on your new Vercel site):
```javascript
fetch('https://moneymate-production-1036.up.railway.app/health', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
})
.then(r => r.json())
.then(console.log)
.catch(console.error)
```

Should return: `{status: "ok"}` without CORS errors.

---

## 🐛 If Still Not Working

### Check These:

1. **Vercel Environment Variables**:
   - Go to Vercel → Settings → Environment Variables
   - Verify `VITE_API_URL` is set to your Railway backend URL:
     ```
     https://moneymate-production-1036.up.railway.app
     ```
   - If missing or wrong, add/update it and **redeploy**

2. **Railway Backend Logs**:
   - Go to Railway → Your Service → Logs
   - Look for CORS errors or connection issues
   - Check if backend is running properly

3. **Browser Console**:
   - Open your new Vercel site
   - Press `F12` → Console tab
   - Look for CORS errors like:
     ```
     Access to fetch at '...' from origin '...' has been blocked by CORS policy
     ```
   - This confirms it's a CORS issue

4. **Network Tab**:
   - Open DevTools → Network tab
   - Try to use the app
   - Check failed requests
   - Look at the request URL and response headers

---

## 📋 Quick Checklist

- [ ] Identified new Vercel domain
- [ ] Updated Railway `ALLOWED_ORIGINS` with new domain
- [ ] Removed old domain from `ALLOWED_ORIGINS` (if needed)
- [ ] Restarted/Redeployed Railway service
- [ ] Verified `VITE_API_URL` in Vercel is correct
- [ ] Tested backend health endpoint
- [ ] Tested CORS from browser
- [ ] Hard refreshed browser (`Ctrl+Shift+R` or `Cmd+Shift+R`)

---

## 💡 Common Issues

### Issue 1: Multiple Domains
If you have both a Vercel domain AND a custom domain, include both:
```
https://finflow.vercel.app,https://finflow.com,http://localhost:5173
```

### Issue 2: Protocol Mismatch
Make sure you're using `https://` for production domains:
- ✅ `https://finflow.vercel.app`
- ❌ `http://finflow.vercel.app` (wrong protocol)

### Issue 3: Trailing Slash
Don't include trailing slashes:
- ✅ `https://finflow.vercel.app`
- ❌ `https://finflow.vercel.app/` (trailing slash)

### Issue 4: Vercel Preview Deployments
If you're testing on a preview deployment, you might need to add that domain too, or use a wildcard pattern (if Railway supports it).

---

## 🎯 Expected Result

After updating `ALLOWED_ORIGINS` and restarting Railway:

1. ✅ Your new Vercel site should connect to the backend
2. ✅ No CORS errors in browser console
3. ✅ API calls should succeed
4. ✅ App should work normally

---

**Need help? Share:**
- Your new Vercel domain
- Any error messages from browser console
- Railway logs if there are errors

