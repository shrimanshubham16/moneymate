# 📥 Export Data from Railway for Migration

## 🚀 Quick Method: Use Admin Endpoint

I've added a temporary admin endpoint to export all data.

### Step 1: Get Your Auth Token

1. **Login to your app** (production or local)
2. **Open browser DevTools** (F12)
3. **Go to Application/Storage** → **Local Storage**
4. **Find** `authToken` or `token`
5. **Copy the token**

### Step 2: Call Export Endpoint

**Option A: Using curl**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  https://your-railway-backend-url.up.railway.app/admin/export-full-store \
  > data/finflow-data.json
```

**Option B: Using Browser**
1. Open: `https://your-railway-backend-url.up.railway.app/admin/export-full-store`
2. Add header: `Authorization: Bearer YOUR_TOKEN`
3. The JSON file will download automatically

**Option C: Using Postman/Insomnia**
- Method: GET
- URL: `https://your-railway-backend-url.up.railway.app/admin/export-full-store`
- Headers: `Authorization: Bearer YOUR_TOKEN`
- Save response as `data/finflow-data.json`

---

## 🔧 Alternative: Railway CLI

If Railway CLI works, try:

```bash
# Find the correct path
railway run pwd

# Then try to read the file
railway run cat data/finflow-data.json

# Or list files to find it
railway run ls -la data/
```

---

## ⚠️ Security Note

The admin endpoint checks for username 'admin'. If your username is different:
1. **Temporarily** change the check in `server.ts` to your username
2. Or remove the check temporarily (only for migration)
3. **Remove this endpoint** after migration is complete

---

## ✅ After Export

Once you have `data/finflow-data.json`:
```bash
cd backend
npm run migrate-data
```


