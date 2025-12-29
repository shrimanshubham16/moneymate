# 🚀 Force Redeploy v1.2 to Production

## ✅ Code Merged and Pushed!

All v1.2 features have been merged to `main` and pushed to GitHub.

---

## 🔄 Force Redeploy on Vercel

### Step 1: Trigger New Deployment

1. **Go to Vercel Dashboard**: https://vercel.com/
2. **Select your MoneyMate project**
3. **Go to Deployments tab**
4. **Click "Redeploy"** on the latest deployment
5. **OR create a new deployment:**
   - Click "..." (three dots) on latest deployment
   - Select "Redeploy"
   - **IMPORTANT**: Check "Use existing Build Cache" = **UNCHECKED** (to force fresh build)
6. **Wait for build to complete** (~3-5 minutes)

### Step 2: Verify Deployment

1. **Check build logs** for any errors
2. **Verify commit hash** matches latest from GitHub
3. **Check deployment URL** is updated

### Step 3: Clear Browser Cache

1. **Visit production site**: https://moneymate-phi.vercel.app/
2. **Hard refresh**: 
   - Windows/Linux: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`
3. **Or clear cache** in browser settings

---

## ✅ Verify v1.2 Features Are Live

### Test These Features:

1. **Variable Expenses Page**
   - [ ] Subcategory dropdown appears
   - [ ] Can add new subcategory
   - [ ] Payment mode selection (UPI/Cash, Extra Cash, Credit Card)
   - [ ] Credit card selection when payment mode is Credit Card

2. **Credit Cards Page**
   - [ ] "Update Bill" button works
   - [ ] "View Usage" button works
   - [ ] Current expenses display
   - [ ] Billing date setting

3. **Current Month Expenses Page**
   - [ ] Category breakdown chart is clickable
   - [ ] Subcategory breakdown appears when clicking category
   - [ ] Payment mode distribution chart
   - [ ] Status shows "completed" or "pending" correctly

4. **Health Page**
   - [ ] Variable expense items show actual vs prorated
   - [ ] Items sum correctly to total
   - [ ] Shows "(using actual)" when applicable

5. **Activity Page**
   - [ ] Shows detailed information (amounts, names, etc.)
   - [ ] Most recent first
   - [ ] Credit card names and amounts shown

6. **Account Page**
   - [ ] Password requirements shown
   - [ ] Success toast on password update

---

## 🔍 Check Railway Backend

### Verify Backend is Running:

1. **Go to Railway**: https://railway.app/
2. **Select your backend service**
3. **Check deployment status** - should be "Active"
4. **View logs** - should show no errors
5. **Test backend directly:**
   ```
   https://moneymate-production-1036.up.railway.app/health
   ```
   Should return: `{"status":"ok"}`

### Verify CORS:

1. **In Railway → Settings → Variables**
2. **Check `ALLOWED_ORIGINS`** includes:
   ```
   https://moneymate-phi.vercel.app,http://localhost:5173
   ```

---

## 🐛 If Features Still Missing

### Option 1: Force Clear Build Cache

1. **In Vercel → Settings → General**
2. **Scroll to "Build & Development Settings"**
3. **Clear build cache** (if option available)
4. **Redeploy**

### Option 2: Check Branch Settings

1. **In Vercel → Settings → Git**
2. **Verify Production Branch** is set to `main`
3. **Verify Root Directory** is set to `web`

### Option 3: Manual Build Test

```bash
cd web
npm install
npm run build
# Check if build succeeds and includes all files
```

---

## 📊 Deployment Checklist

- [ ] Code merged to `main` on GitHub
- [ ] Code pushed to GitHub
- [ ] Vercel deployment triggered
- [ ] Build completed successfully
- [ ] No build errors in logs
- [ ] Browser cache cleared
- [ ] Features tested and working
- [ ] Backend is running
- [ ] CORS is configured

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
```

Should show: `https://moneymate-production-1036.up.railway.app`

---

**After redeploy, wait 2-3 minutes, then hard refresh your browser and test all v1.2 features!**

