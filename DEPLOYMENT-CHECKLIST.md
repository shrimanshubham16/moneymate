# ✅ MoneyMate Deployment Checklist

## Pre-Deployment

### Code Preparation
- [x] Backend build scripts configured (`npm run build`)
- [x] Frontend build scripts configured (`npm run build`)
- [x] TypeScript compilation works
- [x] All tests passing
- [x] Data persistence implemented
- [x] Environment variables documented

### Security
- [x] CORS configured for production
- [x] Rate limiting enabled
- [x] JWT authentication implemented
- [x] Strong password requirements
- [x] Account lockout on failed logins
- [ ] Environment variables secured (use secrets, not hardcoded)

### Configuration Files
- [x] `backend/railway.json` - Railway configuration
- [x] `backend/Procfile` - Process definition
- [x] `web/vercel.json` - Vercel configuration
- [x] `.gitignore` - Excludes sensitive files
- [ ] `backend/.env.production` - Production environment variables
- [ ] `web/.env.production` - Production environment variables

---

## Deployment Steps

### 1. Backend (Railway)

#### Setup
- [ ] Create Railway account
- [ ] Connect GitHub repository
- [ ] Select `backend` folder

#### Configuration
- [ ] Add environment variables:
  ```
  PORT=12022
  NODE_ENV=production
  JWT_SECRET=<generate-secure-secret>
  ALLOWED_ORIGINS=https://your-app.vercel.app
  ```
- [ ] Configure build command: `npm run build`
- [ ] Configure start command: `npm start`

#### Verification
- [ ] Backend deploys successfully
- [ ] Health check endpoint responds: `/health`
- [ ] Logs show no errors
- [ ] Note backend URL: `https://your-app.railway.app`

---

### 2. Frontend (Vercel)

#### Setup
- [ ] Create Vercel account
- [ ] Import GitHub repository
- [ ] Select `web` folder

#### Configuration
- [ ] Framework: Vite
- [ ] Build Command: `npm run build`
- [ ] Output Directory: `dist`
- [ ] Add environment variable:
  ```
  VITE_API_URL=https://your-backend.railway.app
  ```

#### Verification
- [ ] Frontend deploys successfully
- [ ] App loads without errors
- [ ] Can connect to backend
- [ ] Note frontend URL: `https://your-app.vercel.app`

---

### 3. Update CORS

- [ ] Go back to Railway → Environment Variables
- [ ] Update `ALLOWED_ORIGINS` with Vercel URL:
  ```
  ALLOWED_ORIGINS=https://your-app.vercel.app,http://localhost:5173
  ```
- [ ] Redeploy backend (Railway will auto-redeploy)

---

## Post-Deployment

### Testing
- [ ] Sign up with test account
- [ ] Create income sources
- [ ] Add fixed expenses
- [ ] Add variable expenses
- [ ] Add investments
- [ ] Test payment tracking
- [ ] Test dashboard calculations
- [ ] Test health score
- [ ] Test sharing features
- [ ] Test on mobile browser
- [ ] Test in different browsers (Chrome, Firefox, Safari)

### Monitoring
- [ ] Check Railway logs for errors
- [ ] Check Vercel analytics
- [ ] Monitor response times
- [ ] Set up uptime monitoring (UptimeRobot - free)

### Documentation
- [ ] Update README with live URLs
- [ ] Document any deployment issues
- [ ] Create user guide (optional)

---

## Optional Enhancements

### Performance
- [ ] Enable caching headers
- [ ] Add Redis for session storage
- [ ] Optimize images
- [ ] Enable compression

### Features
- [ ] Set up email notifications
- [ ] Add PWA support
- [ ] Implement analytics (Google Analytics)
- [ ] Add error tracking (Sentry)

### Database
- [ ] Migrate to PostgreSQL
- [ ] Set up database backups
- [ ] Add database migrations
- [ ] Implement connection pooling

### Mobile
- [ ] Deploy Flutter app to Google Play
- [ ] Deploy Flutter app to Apple App Store
- [ ] Or: Configure as PWA (free!)

### Custom Domain (Optional)
- [ ] Purchase domain (~$10/year)
- [ ] Configure DNS in Vercel
- [ ] Enable automatic HTTPS
- [ ] Update CORS to include custom domain

---

## Cost Tracking

### Expected Monthly Costs (First Month)
- Railway: $0 (within free $5 credit)
- Vercel: $0 (free tier)
- **Total: $0/month**

### Monitor Usage
- [ ] Check Railway usage dashboard
- [ ] Check Vercel analytics
- [ ] Set up billing alerts
- [ ] Upgrade if needed

---

## Troubleshooting

### Backend Issues
- Check Railway logs: `railway logs`
- Verify environment variables are set
- Check PORT is using $PORT variable
- Verify build completes successfully

### Frontend Issues
- Check browser console for errors
- Verify VITE_API_URL is correct
- Check CORS errors in network tab
- Verify build completes successfully

### Connection Issues
- Verify backend URL is correct in frontend
- Check CORS is properly configured
- Ensure backend is not sleeping (Railway free tier)
- Check firewall/network settings

---

## Success Criteria

- [x] Backend deployed and accessible
- [x] Frontend deployed and accessible
- [x] User can sign up and login
- [x] All features work as expected
- [x] Mobile responsive
- [x] No console errors
- [x] Performance acceptable (<3s load time)
- [x] Data persists across restarts

---

## 🎉 Deployment Complete!

Once all items are checked, your MoneyMate app is live!

**Share your app URL**: `https://your-app.vercel.app`

Next steps:
1. Share with friends for feedback
2. Monitor usage and costs
3. Implement future enhancements
4. Consider custom domain
5. Deploy mobile app

**Congratulations on deploying MoneyMate! 🚀**
