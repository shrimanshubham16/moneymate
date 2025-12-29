# 🚀 Deploy Vercel Project with Custom Domain

## ✅ Yes! You Can Add Domain During Deployment

You can add `freefinflow.app` during the initial deployment setup. Here's how:

---

## Step-by-Step: Deploy with Domain

### Step 1: Create New Project in Vercel

1. **Go to Vercel Dashboard**: https://vercel.com/
2. **Click "Add New Project"**
3. **Import Git Repository:**
   - Select your GitHub repository (`shrimanshubham16/moneymate`)
   - Click **Import**

---

### Step 2: Configure Project Settings

**In the project configuration page:**

1. **Project Name**: `finflow` (or your preferred name)

2. **Root Directory**: 
   - Click "Edit" next to Root Directory
   - Enter: `web`
   - ⚠️ **Important:** This tells Vercel where your frontend code is

3. **Framework Preset**: 
   - Should auto-detect as "Vite"
   - If not, select "Vite" or "Other"

4. **Build Settings** (should auto-detect):
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

---

### Step 3: Add Environment Variables (Before Deploying)

**Before clicking "Deploy":**

1. **Click "Environment Variables"** section (or expand it)

2. **Add Variable:**
   - **Name**: `VITE_API_URL`
   - **Value**: `https://moneymate-production-1036.up.railway.app`
   - **Environment**: Select all (Production, Preview, Development)

3. **Click "Add"**

---

### Step 4: Add Domain (During Setup)

**You can add the domain in two ways:**

#### Option A: Add Domain Before First Deploy

1. **Before clicking "Deploy"**, look for **"Domains"** section
2. **If you see it**, click "Add Domain"
3. **Enter**: `freefinflow.app`
4. **Click "Add"**

#### Option B: Add Domain Right After Deploy Starts

1. **Click "Deploy"** to start deployment
2. **While deployment is running**, go to **Settings → Domains**
3. **Click "Add"**
4. **Enter**: `freefinflow.app`
5. **Click "Add"**

**Note:** Even if you add the domain during setup, you still need to configure DNS at your domain registrar (see Step 5).

---

### Step 5: Configure DNS at Domain Registrar

**After adding domain in Vercel, you'll see DNS instructions:**

1. **Vercel will show you** what DNS records to add
2. **Go to your domain registrar** (where you bought `freefinflow.app`)
3. **Add DNS record:**

   **Option 1: A Record**
   - Type: `A`
   - Name: `@` (or blank)
   - Value: `76.76.21.21` (Vercel will show exact IP)
   - TTL: `3600`

   **Option 2: CNAME Record** (if supported)
   - Type: `CNAME`
   - Name: `@` (or blank)
   - Value: `cname.vercel-dns.com` (Vercel will show exact value)
   - TTL: `3600`

4. **Save DNS record**

---

### Step 6: Wait for Deployment & DNS

1. **Wait for Vercel deployment** to complete (2-3 minutes)
2. **Wait for DNS propagation** (5-60 minutes, sometimes up to 48 hours)
3. **Vercel will show domain status:**
   - "Pending" → Waiting for DNS
   - "Valid" → DNS configured, SSL being issued
   - "Valid" with green check → Ready!

---

### Step 7: Update Railway ALLOWED_ORIGINS

**Critical Step!**

1. **Go to Railway** → Your Backend Service → Settings → Variables

2. **Update `ALLOWED_ORIGINS`:**
   - **If exists**: Edit it
   - **If not**: Create new variable
   
3. **Set value to:**
   ```
   https://freefinflow.app,https://www.freefinflow.app,http://localhost:5173
   ```

4. **Save** and **Redeploy Railway** (Deployments → Redeploy)

---

## 📋 Complete Deployment Checklist

### During Vercel Setup:
- [ ] Project name set
- [ ] Root Directory set to `web`
- [ ] Build settings configured
- [ ] `VITE_API_URL` environment variable added
- [ ] Domain `freefinflow.app` added (if option available)
- [ ] Deploy started

### After Deployment:
- [ ] Deployment completed successfully
- [ ] Domain added in Settings → Domains (if not done during setup)
- [ ] DNS records added at domain registrar
- [ ] DNS propagated (Vercel shows "Valid")
- [ ] Railway `ALLOWED_ORIGINS` updated
- [ ] Railway service redeployed
- [ ] Site accessible at `https://freefinflow.app`

---

## 🎯 Quick Answer

**Yes, you can add the domain during deployment!**

- ✅ Add it in the "Domains" section before clicking "Deploy"
- ✅ OR add it right after deployment starts (Settings → Domains)
- ⚠️ **But:** You still need to configure DNS at your domain registrar separately
- ⚠️ **And:** You still need to update Railway `ALLOWED_ORIGINS`

The domain setup in Vercel just tells Vercel to expect that domain. The actual DNS configuration happens at your domain registrar.

---

## 💡 Pro Tip

**Best approach:**
1. Deploy project first (get it working)
2. Add domain in Vercel
3. Configure DNS at registrar
4. Update Railway CORS
5. Test when DNS propagates

This way you can verify the deployment works before dealing with DNS!

---

**Ready to deploy? Follow the steps above and you'll have `freefinflow.app` set up!**

