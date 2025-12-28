# MoneyMate Deployment Guide

## 🚀 Deployment Strategy (Free/Minimal Cost)

### Architecture:
- **Frontend (React)**: Vercel (Free)
- **Backend (Node.js)**: Railway or Render (Free tier)
- **Database**: Upgrade from file-based to PostgreSQL/MongoDB (Free tier)

---

## Option 1: Quick Deploy (Recommended)

### Backend: Railway.app (Free $5/month credit)
- ✅ Free tier with $5/month credit
- ✅ PostgreSQL included
- ✅ Automatic deployments from GitHub
- ✅ Easy environment variables

### Frontend: Vercel (Free)
- ✅ Unlimited free deployments
- ✅ Global CDN
- ✅ Automatic HTTPS
- ✅ Preview deployments

---

## Option 2: Alternative Free Hosting

### Backend: Render.com (Free tier)
- ✅ 750 hours/month free
- ✅ PostgreSQL included
- ⚠️  Spins down after 15 min inactivity

### Frontend: Netlify (Free)
- ✅ 100GB bandwidth/month
- ✅ Continuous deployment
- ✅ Form handling

---

## Step-by-Step Deployment

### Phase 1: Prepare for Production

#### 1.1 Environment Variables Setup
Create `.env.example` files for both backend and frontend

#### 1.2 Database Migration
Migrate from file-based storage to PostgreSQL or MongoDB

#### 1.3 Security Hardening
- Add helmet.js for security headers
- Configure CORS for production domains
- Add rate limiting (already done)
- Add request validation

### Phase 2: Backend Deployment (Railway)

#### 2.1 Create Railway Account
1. Go to https://railway.app
2. Sign up with GitHub
3. Connect your repository

#### 2.2 Deploy Backend
1. Click "New Project" → "Deploy from GitHub repo"
2. Select MoneyMate/backend
3. Add environment variables
4. Deploy!

### Phase 3: Frontend Deployment (Vercel)

#### 3.1 Create Vercel Account
1. Go to https://vercel.com
2. Sign up with GitHub
3. Import MoneyMate/web

#### 3.2 Configure Build Settings
- Framework: Vite
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

### Phase 4: Mobile App (Optional)

#### Flutter App Deployment
- **Android**: Google Play Store ($25 one-time fee)
- **iOS**: Apple App Store ($99/year)
- **Alternative**: PWA (Progressive Web App) - Free!

---

## Estimated Costs

### Free Tier (Starts at $0/month)
- Railway: $5 credit/month (enough for hobby projects)
- Vercel: Unlimited free deployments
- PostgreSQL: Included in Railway free tier
- **Total: $0/month** (within free tiers)

### Light Usage (~100 users)
- Railway: $5-10/month
- Vercel: Free
- Database: Included
- **Total: $5-10/month**

### Production Scale (~1000+ users)
- Railway: $20-30/month
- Vercel: Free (or $20/month for Pro features)
- Database: $10-15/month (if separate)
- **Total: $30-50/month**

---

## Quick Start Commands

### 1. Setup for Deployment
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize project
railway init
```

### 2. Deploy Backend
```bash
cd MoneyMate/backend
railway up
```

### 3. Deploy Frontend
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd MoneyMate/web
vercel
```

---

## Custom Domain (Optional)

### Free Options:
- **Subdomain**: yourname.railway.app (Railway)
- **Subdomain**: yourapp.vercel.app (Vercel)

### Paid Domain:
- Purchase from Namecheap (~$10/year)
- Configure DNS in Railway/Vercel
- Automatic HTTPS included!

---

## Next Steps

1. **Choose hosting platform** (Railway + Vercel recommended)
2. **Setup accounts** (5 minutes)
3. **Add database** (PostgreSQL recommended)
4. **Deploy backend** (10 minutes)
5. **Deploy frontend** (5 minutes)
6. **Test and celebrate!** 🎉

---

## Need Help?

- Railway Docs: https://docs.railway.app
- Vercel Docs: https://vercel.com/docs
- Render Docs: https://render.com/docs

**Let's deploy MoneyMate to the world!** 🚀

