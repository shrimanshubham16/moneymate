# 🔧 Update Railway ALLOWED_ORIGINS for New Domain

## ✅ What to Do: UPDATE, Not Remove

**Don't remove `ALLOWED_ORIGINS`** - you need it! Just **update it** to include your new domain.

---

## Step-by-Step: Update ALLOWED_ORIGINS

### Step 1: Go to Railway Variables

1. **Go to Railway Dashboard**: https://railway.app/
2. **Select your backend service**
3. **Go to Settings → Variables**
4. **Find `ALLOWED_ORIGINS`** variable

---

### Step 2: Update the Value

**Current value might be:**
```
https://old-vercel-domain.vercel.app,http://localhost:5173
```

**Update it to include your new domain:**

#### Option A: Replace Old Domain (If Not Using It)
```
https://freefinflow.app,https://www.freefinflow.app,http://localhost:5173
```

#### Option B: Keep Both Domains (If You Want Both to Work)
```
https://old-vercel-domain.vercel.app,https://freefinflow.app,https://www.freefinflow.app,http://localhost:5173
```

**Recommended:** Use Option A (replace old domain) unless you need both.

---

### Step 3: Save and Redeploy

1. **Click "Save"** or "Update"
2. **Go to Deployments** tab
3. **Click "Redeploy"** on latest deployment
   - This ensures the new CORS settings take effect

---

## 📋 Format Requirements

### ✅ Correct Format:
```
https://freefinflow.app,https://www.freefinflow.app,http://localhost:5173
```

### Important:
- ✅ Use `https://` for production domains
- ✅ Use `http://localhost:5173` for local development
- ✅ Separate domains with commas (no spaces)
- ✅ No trailing slashes
- ✅ Include both root and www if using both

### ❌ Common Mistakes:
- ❌ `http://freefinflow.app` (wrong protocol - should be https)
- ❌ `https://freefinflow.app/` (trailing slash)
- ❌ `freefinflow.app` (missing protocol)
- ❌ `https://freefinflow.app , http://localhost:5173` (spaces around comma)

---

## 🔍 Verify It's Working

### Check Railway Logs:

1. **Go to Railway → Your Service → Logs**
2. **Look for startup message:**
   ```
   🔒 CORS origins: https://freefinflow.app, https://www.freefinflow.app, http://localhost:5173
   ```
3. **This confirms the variable is loaded correctly**

### Test from Browser:

1. **Visit**: `https://freefinflow.app`
2. **Open browser console** (`F12`)
3. **Try to use the app** (login, etc.)
4. **Check for CORS errors:**
   - ✅ No CORS errors = Working!
   - ❌ CORS errors = Check domain format

---

## 🎯 Final ALLOWED_ORIGINS Value

**For `freefinflow.app` domain, use:**

```
https://freefinflow.app,https://www.freefinflow.app,http://localhost:5173
```

**Copy this exact value** and paste it into Railway's `ALLOWED_ORIGINS` variable.

---

## ❌ Don't Remove It!

**Why you need `ALLOWED_ORIGINS`:**
- ✅ Without it, only `http://localhost:5173` is allowed
- ✅ Your production domain will be blocked
- ✅ You'll get CORS errors
- ✅ The app won't work

**What to do instead:**
- ✅ Keep the variable
- ✅ Update the value with your new domain
- ✅ Remove old domain if not using it
- ✅ Keep `http://localhost:5173` for local development

---

## 📋 Checklist

- [ ] `ALLOWED_ORIGINS` variable exists in Railway
- [ ] Value updated to include `https://freefinflow.app`
- [ ] Value includes `http://localhost:5173` for local dev
- [ ] Old domain removed (if not using it)
- [ ] Format is correct (https://, no trailing slash, comma-separated)
- [ ] Railway service redeployed
- [ ] Railway logs show new domain in CORS origins
- [ ] Site works without CORS errors

---

**TL;DR: Keep `ALLOWED_ORIGINS`, just update it to include `https://freefinflow.app`!**

