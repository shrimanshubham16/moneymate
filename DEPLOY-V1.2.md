# 🚀 Deploy MoneyMate v1.2 to Production

## Current Status
- ✅ Feature branch: `feature/v1.2-subcategory-payment-mode`
- ✅ All changes committed and pushed to GitHub
- ✅ Ready for deployment

---

## 📋 Pre-Deployment Checklist

### Option A: Deploy from Feature Branch (Quick)
- Deploy directly from `feature/v1.2-subcategory-payment-mode` branch
- Faster, but feature branch remains separate

### Option B: Merge to Main First (Recommended)
- Merge feature branch to main
- Deploy from main branch
- Cleaner production history

---

## 🎯 Deployment Steps

### Step 1: Merge to Main (If Option B)

```bash
cd MoneyMate
git checkout main
git pull origin main
git merge feature/v1.2-subcategory-payment-mode
git push origin main
```

### Step 2: Deploy Backend (Railway)

1. **Go to Railway Dashboard**: https://railway.app/
2. **Select your MoneyMate backend project**
3. **Go to Settings → Source**
   - If deploying from feature branch: Change branch to `feature/v1.2-subcategory-payment-mode`
   - If deploying from main: Ensure branch is `main`
4. **Go to Variables** and verify:
   ```
   PORT=12022
   NODE_ENV=production
   JWT_SECRET=<your-secret-key>
   ALLOWED_ORIGINS=<your-vercel-url>,http://localhost:5173
   ```
5. **Click "Redeploy"** or wait for auto-deploy
6. **Copy your backend URL** (e.g., `https://moneymate-backend-production.up.railway.app`)

### Step 3: Deploy Frontend (Vercel)

1. **Go to Vercel Dashboard**: https://vercel.com/
2. **Select your MoneyMate project**
3. **Go to Settings → Git**
   - If deploying from feature branch: Change branch to `feature/v1.2-subcategory-payment-mode`
   - If deploying from main: Ensure branch is `main`
4. **Go to Environment Variables** and verify:
   ```
   VITE_API_URL=https://your-railway-backend-url.up.railway.app
   ```
   (Update with your actual Railway backend URL)
5. **Go to Deployments**
6. **Click "Redeploy"** on the latest deployment or create a new deployment
7. **Wait for build to complete** (~2-3 minutes)
8. **Copy your frontend URL** (e.g., `https://moneymate-xxx.vercel.app`)

### Step 4: Update CORS (Important!)

1. **Go back to Railway dashboard**
2. **Select your backend service**
3. **Go to Variables**
4. **Update `ALLOWED_ORIGINS`**:
   ```
   https://your-vercel-app.vercel.app,http://localhost:5173
   ```
   (Replace with your actual Vercel URL)
5. **Click "Redeploy"** to apply changes

---

## ✅ Post-Deployment Verification

### Test Checklist:

1. **Frontend loads correctly**
   - Visit your Vercel URL
   - Check browser console (F12) for errors

2. **Authentication works**
   - Sign up with a test account
   - Log in successfully

3. **Core features work**
   - ✅ Add income source
   - ✅ Add fixed expense
   - ✅ Add variable expense plan
   - ✅ Add actual variable expense (with subcategory & payment mode)
   - ✅ Add investment
   - ✅ Add credit card
   - ✅ View dashboard
   - ✅ View health page (verify variable expense calculation matches)
   - ✅ View current month expenses (verify charts work)
   - ✅ View activity log (verify details are shown)

4. **v1.2 specific features**
   - ✅ Subcategory selection in variable expenses
   - ✅ Payment mode selection (UPI/Cash, Extra Cash, Credit Card)
   - ✅ Credit card usage tracking
   - ✅ Update credit card bill amount
   - ✅ Category breakdown chart (clickable)
   - ✅ Subcategory breakdown chart
   - ✅ Activity log with detailed information
   - ✅ Variable expense calculation matches backend on health page

---

## 🐛 Troubleshooting

### Backend Issues

**Build fails:**
- Check Railway logs
- Verify `railway.json` is in `backend/` directory
- Ensure TypeScript compiles: `cd backend && npm run build`

**Runtime errors:**
- Check Railway logs
- Verify environment variables are set
- Check PORT is correct

### Frontend Issues

**Build fails:**
- Check Vercel logs
- Verify `vercel.json` is in `web/` directory
- Ensure build works locally: `cd web && npm run build`

**API connection fails:**
- Verify `VITE_API_URL` is correct
- Check CORS settings in Railway
- Check browser console for errors

**Variable expense calculation mismatch:**
- Verify backend is using latest code
- Check browser console for API responses
- Verify `monthProgress` is being passed correctly

---

## 📊 Monitor Deployment

### Railway
- Check deployment logs
- Monitor resource usage
- Check for errors

### Vercel
- Check build logs
- Monitor analytics
- Check for errors

---

## 🎉 Success!

Once all tests pass:
- ✅ v1.2 is live in production
- ✅ All new features are available
- ✅ Variable expense calculation is fixed
- ✅ Users can enjoy the improved experience

---

## 📝 Next Steps

1. **Monitor for 24 hours**
   - Watch for errors
   - Check user feedback
   - Monitor performance

2. **Update documentation**
   - Update README with v1.2 features
   - Update changelog
   - Document new features

3. **Announce release**
   - Update GitHub release notes
   - Share on social media
   - Notify existing users

---

## 🚀 Quick Deploy Commands

If you prefer CLI (requires Railway/Vercel CLI installed):

### Backend (Railway):
```bash
cd backend
railway login
railway link
railway up --branch feature/v1.2-subcategory-payment-mode  # or main
```

### Frontend (Vercel):
```bash
cd web
vercel login
vercel --prod --branch feature/v1.2-subcategory-payment-mode  # or main
```

---

**Ready to deploy! Follow the steps above and your v1.2 will be live! 🎉**

