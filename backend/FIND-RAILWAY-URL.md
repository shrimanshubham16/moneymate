# 🔍 How to Find Your Railway Backend URL

## Method 1: Railway Dashboard (Easiest)

1. Go to **Railway Dashboard**: https://railway.app/dashboard
2. Select your **moneymate** project
3. Click on your **backend service**
4. Go to **Settings** tab
5. Look for **Domains** or **Public URL**
6. Copy the URL (should look like: `https://xxxxx.up.railway.app`)

## Method 2: Railway CLI

```bash
railway domain
```

This will show your Railway service domain.

## Method 3: Check Vercel Environment Variables

1. Go to **Vercel Dashboard**: https://vercel.com/dashboard
2. Select your **freefinflow** project
3. Go to **Settings** → **Environment Variables**
4. Look for `VITE_API_URL`
5. That's your Railway backend URL!

## Method 4: Check Browser Network Tab

1. Go to https://freefinflow.vercel.app
2. Open **DevTools** (F12)
3. Go to **Network** tab
4. Make any API call (login, dashboard, etc.)
5. Look at the request URL - that's your Railway backend!

---

## Once You Have the URL

Use it in the curl command:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://YOUR-ACTUAL-RAILWAY-URL.up.railway.app/admin/export-full-store \
  > data/finflow-data.json
```

---

**The easiest way is Method 3 - check Vercel environment variables!**

