# 🚀 Deploy FinFlow (Rebranded) to Production

## ✅ Code Pushed to GitHub

All rebranding changes have been committed and pushed to `main` branch.

---

## 🔄 Step 1: Redeploy Frontend on Vercel

### Quick Steps:

1. **Go to Vercel Dashboard**: https://vercel.com/
2. **Select your project** (might still be named "moneymate-phi" or similar)
3. **Go to Deployments tab**
4. **Click "Redeploy"** on the latest deployment
5. **IMPORTANT**: 
   - **Uncheck "Use existing Build Cache"** to force a fresh build
   - This ensures all new code is included
6. **Wait 3-5 minutes** for build to complete

### Verify Build:

- Check build logs for any errors
- Verify commit hash matches latest from GitHub
- Build should complete successfully

---

## 🔄 Step 2: Verify Backend on Railway

### Check Backend Status:

1. **Go to Railway Dashboard**: https://railway.app/
2. **Select your backend service** (`moneymate-production-1036` or similar)
3. **Check deployment status** - should be "Active"
4. **View logs** - should show no errors
5. **Test backend directly:**
   ```
   https://moneymate-production-1036.up.railway.app/health
   ```
   Should return: `{"status":"ok"}`

### Backend Changes:

The backend code has been updated with FinFlow branding, but **no restart is needed** unless you see errors in logs.

---

## ✅ Step 3: Verify Environment Variables

### Vercel Environment Variables:

1. **Go to Vercel → Settings → Environment Variables**
2. **Verify `VITE_API_URL`** is set to:
   ```
   https://moneymate-production-1036.up.railway.app
   ```
3. **If missing or incorrect**, update it and redeploy

### Railway CORS Settings:

1. **Go to Railway → Settings → Variables**
2. **Check `ALLOWED_ORIGINS`** includes:
   ```
   https://moneymate-phi.vercel.app,http://localhost:5173
   ```
   (Update the Vercel URL if your project has a different name)

---

## 🧪 Step 4: Test Production Deployment

### After Vercel redeploy completes:

1. **Visit production site**: https://moneymate-phi.vercel.app/
2. **Hard refresh browser**:
   - Windows/Linux: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`
3. **Test the rebrand**:
   - ✅ Logo shows "FinFlow" (not MoneyMate)
   - ✅ Logo icon is chart line (not wallet)
   - ✅ All pages show "FinFlow" branding
   - ✅ No emojis visible (all replaced with icons)
   - ✅ Professional icons throughout

### Test Key Features:

- [ ] Login works
- [ ] Dashboard loads
- [ ] All pages accessible
- [ ] Icons render correctly
- [ ] No console errors
- [ ] API calls succeed

---

## 🎨 What Changed in This Deployment

### Rebranding:
- ✅ MoneyMate → FinFlow (all instances)
- ✅ Logo icon: Wallet → Chart Line
- ✅ Package names: finflow-web, finflow-backend

### UI Improvements:
- ✅ All emojis replaced with professional React Icons
- ✅ Consistent iconography throughout
- ✅ Professional appearance

---

## 🐛 If Something Goes Wrong

### Frontend Issues:

1. **Check Vercel build logs** for errors
2. **Verify `VITE_API_URL`** is correct
3. **Clear browser cache** and hard refresh
4. **Check browser console** for errors

### Backend Issues:

1. **Check Railway logs** for errors
2. **Verify backend is running** (health endpoint)
3. **Check CORS settings** in Railway
4. **Restart backend service** if needed

### Name/Logo Issues:

1. **If old name appears**: Clear browser cache
2. **If logo wrong**: Verify build included latest code
3. **If icons missing**: Check build logs for import errors

---

## 📊 Post-Deployment Checklist

- [ ] Code pushed to GitHub
- [ ] Vercel deployment triggered
- [ ] Build completed successfully
- [ ] Backend is running
- [ ] Environment variables verified
- [ ] Production site tested
- [ ] All features working
- [ ] Rebranding visible
- [ ] No console errors
- [ ] Icons rendering correctly

---

## 🎯 Quick Test Commands

### Test Backend:
```bash
curl https://moneymate-production-1036.up.railway.app/health
```

### Test Frontend API Connection:
Open browser console on production site and run:
```javascript
console.log('API URL:', import.meta.env.VITE_API_URL);
console.log('App Name:', document.title);
```

Should show:
- API URL: `https://moneymate-production-1036.up.railway.app`
- App Name: `FinFlow`

---

**After redeploy, wait 2-3 minutes, then hard refresh and test!**

🎉 **FinFlow is ready to go live!**

