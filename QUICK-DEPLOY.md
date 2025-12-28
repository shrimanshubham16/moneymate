# 🚀 MoneyMate Quick Deploy Guide

## Option 1: Deploy to Railway (Backend) + Vercel (Frontend)

### ⏱️ Total Time: ~15 minutes

---

## Step 1: Deploy Backend to Railway (5 min)

### 1.1 Create Railway Account
```bash
# Visit https://railway.app
# Click "Login with GitHub"
# Authorize Railway to access your repositories
```

### 1.2 Create New Project
1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Search for **"MoneyMate"**
4. Select **`backend`** folder
5. Click **"Deploy Now"**

### 1.3 Add Environment Variables
In Railway dashboard → Variables:
```
PORT=12022
NODE_ENV=production
JWT_SECRET=your-super-secret-key-here-change-this
ALLOWED_ORIGINS=*
```

### 1.4 Get Backend URL
- Railway will provide: `https://your-app.railway.app`
- **Save this URL!** You'll need it for frontend

---

## Step 2: Deploy Frontend to Vercel (5 min)

### 2.1 Create Vercel Account
```bash
# Visit https://vercel.com
# Click "Sign Up with GitHub"
# Authorize Vercel
```

### 2.2 Import Project
1. Click **"Add New..."** → **"Project"**
2. Select **"MoneyMate"** repo
3. Select **Root Directory**: `web`
4. Framework Preset: **Vite**

### 2.3 Configure Build Settings
```
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

### 2.4 Add Environment Variables
In Vercel → Settings → Environment Variables:
```
VITE_API_URL=https://your-app.railway.app
```
*(Use the Railway URL from Step 1.4)*

### 2.5 Deploy!
- Click **"Deploy"**
- Wait 2-3 minutes
- Vercel will provide: `https://your-app.vercel.app`

---

## Step 3: Update CORS (2 min)

### 3.1 Update Railway Backend
Go back to Railway → Variables → Add/Update:
```
ALLOWED_ORIGINS=https://your-app.vercel.app,http://localhost:5173
```

### 3.2 Redeploy Backend
- Railway will auto-redeploy
- Wait 1-2 minutes

---

## Step 4: Test Your Deployment! 🎉

1. Open `https://your-app.vercel.app`
2. Try to sign up
3. Create test data
4. Check if everything works!

---

## Troubleshooting

### Backend not responding?
```bash
# Check Railway logs
railway logs

# Common issues:
# - Wrong PORT (should be from $PORT env variable)
# - CORS not configured
# - Build failed
```

### Frontend can't connect to backend?
```bash
# Check browser console for errors
# Common issues:
# - Wrong VITE_API_URL
# - CORS blocked
# - Backend not deployed
```

### CORS errors?
Update Railway ALLOWED_ORIGINS to include your Vercel URL

---

## Free Tier Limits

### Railway (Free $5/month credit)
- ✅ ~500 hours/month
- ✅ PostgreSQL database included
- ✅ Perfect for hobby projects

### Vercel (Free)
- ✅ Unlimited deployments
- ✅ 100GB bandwidth/month
- ✅ Automatic HTTPS

---

## Next Steps

1. ✅ **Add Custom Domain** (optional, ~$10/year)
2. ✅ **Migrate to PostgreSQL** (for production data)
3. ✅ **Set up monitoring** (UptimeRobot - free)
4. ✅ **Deploy mobile app** (Play Store/App Store)

---

## Need Help?

- **Railway Support**: https://help.railway.app
- **Vercel Support**: https://vercel.com/support
- **MoneyMate Issues**: Create GitHub issue

**Congratulations! Your app is now live! 🚀**

