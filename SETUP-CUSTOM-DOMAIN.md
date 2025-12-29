# 🌐 Setup Custom Domain: freefinflow.app

## Step-by-Step Guide

### Step 1: Deploy to Vercel (If Not Already Done)

1. **Go to Vercel Dashboard**: https://vercel.com/
2. **Add New Project** (or use existing)
3. **Import from GitHub**: Select your `moneymate` repository
4. **Configure:**
   - **Root Directory**: `web`
   - **Framework**: Vite (auto-detected)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. **Add Environment Variable:**
   - **Name**: `VITE_API_URL`
   - **Value**: `https://moneymate-production-1036.up.railway.app`
6. **Deploy**

---

### Step 2: Add Custom Domain in Vercel

**After deployment completes:**

1. **Go to your project** in Vercel Dashboard
2. **Click "Settings"** tab
3. **Click "Domains"** in the sidebar
4. **Click "Add"** button
5. **Enter domain**: `freefinflow.app`
6. **Click "Add"**

---

### Step 3: Configure DNS Records

Vercel will show you what DNS records to add. You'll need to add these to your domain registrar (where you bought `freefinflow.app`).

#### Option A: Using A Record (Root Domain)

**Add this A record:**
- **Type**: `A`
- **Name**: `@` (or leave blank, means root domain)
- **Value**: `76.76.21.21` (Vercel's IP - they'll show you the exact IP)
- **TTL**: `3600` (or default)

#### Option B: Using CNAME (Recommended - Easier)

**Add this CNAME record:**
- **Type**: `CNAME`
- **Name**: `@` (or leave blank for root domain)
- **Value**: `cname.vercel-dns.com` (Vercel will show you exact value)
- **TTL**: `3600` (or default)

**Note:** Some registrars don't allow CNAME on root domain. If that's the case, use Option A (A record).

#### Option C: Using www Subdomain (Easier Alternative)

If root domain is complicated, you can use:
- **Domain**: `www.freefinflow.app`
- **Type**: `CNAME`
- **Value**: `cname.vercel-dns.com`

Then Vercel can redirect `freefinflow.app` → `www.freefinflow.app`

---

### Step 4: Wait for DNS Propagation

1. **After adding DNS records**, wait 5-60 minutes
2. **Vercel will automatically detect** when DNS is configured
3. **Status will change** from "Pending" to "Valid" in Vercel dashboard

**Check DNS propagation:**
```bash
# In terminal, check if DNS is resolving:
nslookup freefinflow.app
# or
dig freefinflow.app
```

---

### Step 5: Update Railway ALLOWED_ORIGINS

**Important:** Update Railway to allow your custom domain!

1. **Go to Railway** → Your Backend Service → Settings → Variables
2. **Update `ALLOWED_ORIGINS`:**
   - **If variable exists**, edit it
   - **If not**, create new variable
   
3. **Set value to:**
   ```
   https://freefinflow.app,https://www.freefinflow.app,http://localhost:5173
   ```
   
   (Include both root and www if you're using both)

4. **Save** and **Redeploy Railway** (Deployments → Redeploy)

---

### Step 6: SSL Certificate (Automatic)

- ✅ Vercel automatically provisions SSL certificates
- ✅ Your site will be available at `https://freefinflow.app`
- ✅ No manual SSL setup needed!

---

### Step 7: Verify Everything Works

1. **Visit**: `https://freefinflow.app`
2. **Hard refresh**: `Ctrl + Shift + R` (Windows/Linux) or `Cmd + Shift + R` (Mac)
3. **Test:**
   - ✅ Site loads
   - ✅ Can login
   - ✅ No console errors
   - ✅ API calls work

4. **Check Railway logs:**
   - Should show: `🔒 CORS origins: https://freefinflow.app, https://www.freefinflow.app, http://localhost:5173`

---

## 📋 Common Domain Registrars Setup

### GoDaddy:
1. Log in → My Products → DNS
2. Add A record or CNAME as shown above

### Namecheap:
1. Domain List → Manage → Advanced DNS
2. Add A record or CNAME

### Google Domains:
1. DNS → Custom records
2. Add A record or CNAME

### Cloudflare:
1. DNS → Records
2. Add A or CNAME
3. **Important:** Set proxy status to "DNS only" (gray cloud) initially, or use "Proxied" (orange cloud) if you want Cloudflare CDN

---

## 🐛 Troubleshooting

### Issue: Domain not resolving
**Fix:**
- Wait longer (DNS can take up to 48 hours, usually 5-60 minutes)
- Check DNS records are correct
- Verify TTL is not too high

### Issue: SSL certificate not issued
**Fix:**
- Wait for DNS to fully propagate
- Vercel will retry automatically
- Check Vercel dashboard for SSL status

### Issue: CORS errors with custom domain
**Fix:**
- Make sure `ALLOWED_ORIGINS` in Railway includes `https://freefinflow.app`
- Include `https://www.freefinflow.app` if using www
- Redeploy Railway after updating

### Issue: Site shows Vercel default page
**Fix:**
- Check Root Directory is set to `web` in Vercel
- Verify build completed successfully
- Check deployment logs

---

## ✅ Final Checklist

- [ ] Vercel project deployed
- [ ] Custom domain `freefinflow.app` added in Vercel
- [ ] DNS records added at domain registrar
- [ ] DNS propagated (Vercel shows "Valid")
- [ ] Railway `ALLOWED_ORIGINS` updated with `https://freefinflow.app`
- [ ] Railway service redeployed
- [ ] Site accessible at `https://freefinflow.app`
- [ ] SSL certificate active (automatic)
- [ ] No console errors
- [ ] Login works
- [ ] API calls succeed

---

## 🎯 Quick Reference

**Vercel Domain Settings:**
- Domain: `freefinflow.app`
- SSL: Automatic (Vercel handles)

**Railway ALLOWED_ORIGINS:**
```
https://freefinflow.app,https://www.freefinflow.app,http://localhost:5173
```

**Vercel Environment Variable:**
- `VITE_API_URL` = `https://moneymate-production-1036.up.railway.app`

---

**Need help with a specific registrar? Let me know which one you're using!**

