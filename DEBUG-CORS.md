# 🐛 Debug CORS / Invalid Configuration

## Step-by-Step Debugging

### 1. Check Railway Logs

**What to do:**
1. Go to Railway → Your Backend Service → **Logs** tab
2. Look for the startup message that shows CORS origins
3. **Copy the exact message** you see

**What you should see:**
```
🔒 CORS origins: https://your-domain.vercel.app, http://localhost:5173
```

**If you see:**
- `🔒 CORS origins: http://localhost:5173` → Variable not loaded correctly
- No CORS message → Service might not have restarted

---

### 2. Verify Environment Variable in Railway

**Check:**
1. Railway → Settings → Variables
2. **Confirm `ALLOWED_ORIGINS` exists** and has the correct value
3. **Check the exact format:**
   - ✅ `https://your-domain.vercel.app,http://localhost:5173`
   - ❌ `https://your-domain.vercel.app/` (trailing slash)
   - ❌ `your-domain.vercel.app` (missing protocol)
   - ❌ `http://your-domain.vercel.app` (wrong protocol - should be https)

---

### 3. Check Browser Console Error

**What to do:**
1. Open your Vercel site
2. Press `F12` → **Console** tab
3. **Copy the exact error message**

**Common errors:**
- `Access to fetch at '...' from origin '...' has been blocked by CORS policy`
- `Failed to fetch`
- `Network error`

---

### 4. Check Network Tab

**What to do:**
1. Open DevTools → **Network** tab
2. Try to use the app (login, etc.)
3. Look for **failed requests** (red)
4. Click on a failed request
5. Check:
   - **Request URL** - Is it pointing to Railway?
   - **Response Headers** - Any CORS headers?
   - **Status Code** - What error code?

---

### 5. Verify Vercel Environment Variable

**Check:**
1. Vercel → Settings → Environment Variables
2. **Confirm `VITE_API_URL` exists** and is set to:
   ```
   https://moneymate-production-1036.up.railway.app
   ```
   (or your actual Railway backend URL)

---

### 6. Test Backend Directly

**Test the health endpoint:**
```bash
curl https://moneymate-production-1036.up.railway.app/health
```

**Should return:**
```json
{"status":"ok"}
```

**If it fails:**
- Backend might be down
- URL might be wrong

---

### 7. Test CORS from Browser

**Open browser console on your Vercel site and run:**
```javascript
fetch('https://moneymate-production-1036.up.railway.app/health', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
})
.then(r => r.json())
.then(data => console.log('✅ Success:', data))
.catch(err => console.error('❌ Error:', err))
```

**What to look for:**
- ✅ `Success: {status: "ok"}` = CORS is working!
- ❌ `Error: ...` = CORS is blocking (check the error message)

---

## Common Issues & Fixes

### Issue 1: Variable Not Loaded
**Symptom:** Railway logs show only `http://localhost:5173`

**Fix:**
1. Double-check variable name is exactly `ALLOWED_ORIGINS`
2. Make sure value has no extra spaces
3. **Redeploy Railway service** (Deployments → Redeploy)

### Issue 2: Domain Mismatch
**Symptom:** CORS error shows different domain than what you set

**Fix:**
- Make sure the domain in `ALLOWED_ORIGINS` matches **exactly** what Vercel shows
- Check for `www.` prefix differences
- Check for custom domain vs Vercel domain

### Issue 3: Protocol Mismatch
**Symptom:** Works in some cases but not others

**Fix:**
- Always use `https://` for production domains
- Never use `http://` for Vercel domains

### Issue 4: Service Not Restarted
**Symptom:** Variable added but still not working

**Fix:**
- **Force redeploy** Railway service
- Or restart the service if option available

### Issue 5: Multiple Domains
**Symptom:** Works on one domain but not another

**Fix:**
- Add all domains to `ALLOWED_ORIGINS`:
  ```
  https://domain1.vercel.app,https://domain2.com,http://localhost:5173
  ```

---

## Quick Checklist

- [ ] `ALLOWED_ORIGINS` variable exists in Railway
- [ ] Variable value includes your new Vercel domain with `https://`
- [ ] No trailing slash in domain
- [ ] Railway service has been redeployed/restarted
- [ ] Railway logs show your domain in CORS origins
- [ ] `VITE_API_URL` in Vercel points to Railway backend
- [ ] Backend health endpoint works
- [ ] Browser console shows no CORS errors

---

## What to Share

Please share:
1. **Your new Vercel domain** (e.g., `finflow.vercel.app`)
2. **Railway logs** showing CORS origins message
3. **Browser console error** (if any)
4. **Network tab** details for failed requests
5. **What you see** when you try to use the app

This will help me pinpoint the exact issue!

