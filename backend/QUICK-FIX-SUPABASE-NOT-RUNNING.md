# ⚡ Quick Fix: Supabase Not Running

## Most Likely Issue: Project is Paused

Supabase free tier projects **auto-pause after 7 days of inactivity** to save resources.

## Immediate Fix (2 minutes)

### Step 1: Resume Project
1. Go to: https://supabase.com/dashboard
2. Login to your account
3. Find your project: `lvwpurwrktdblctzwctr`
4. Look for a **"Paused"** badge or **"Resume"** button
5. Click **"Resume"**
6. Wait **2-3 minutes** for project to fully start

### Step 2: Verify It's Running
```bash
cd backend
npm run verify-config
```

You should see:
```
✅ API is reachable
✅ Database connection successful!
```

## If Project Won't Resume

### Check Project Status
1. In Supabase Dashboard, check the **status badge**:
   - ✅ **Active** = Running
   - ⏸️ **Paused** = Needs resume
   - ❌ **Inactive** = Needs activation

### Check Project Settings
1. Go to **Settings** → **General**
2. Verify:
   - **Project name**: Should be visible
   - **Region**: Should be `ap-south-1` (or your region)
   - **Database version**: Should show PostgreSQL version

### Check Billing/Usage
1. Go to **Settings** → **Usage**
2. Check if you've exceeded free tier limits
3. If exceeded, you may need to upgrade or wait for reset

## Verify Configuration

Run the verification script:
```bash
npm run verify-config
```

This will check:
- ✅ Environment variables are set
- ✅ Project URL is correct
- ✅ API keys are valid
- ✅ Connection is working

## Common Issues

### "503 Service Unavailable"
**Cause**: Project is paused  
**Fix**: Resume in dashboard

### "Connection refused"
**Cause**: Wrong project URL  
**Fix**: Check `SUPABASE_URL` in `.env` matches dashboard

### "Invalid API key"
**Cause**: Wrong or expired key  
**Fix**: Regenerate in Settings → API → service_role key

### "Schema cache" error
**Cause**: Project just resumed, still initializing  
**Fix**: Wait 2-3 minutes

## Still Not Working?

### Option 1: Check Supabase Status
Visit: https://status.supabase.com
- Check for outages in your region
- Check if maintenance is scheduled

### Option 2: Verify Region
1. Go to **Settings** → **General**
2. Note your **Region** (e.g., `ap-south-1`)
3. Check connection string matches region

### Option 3: Recreate Project (Last Resort)
If nothing works:
1. Create a new Supabase project
2. Update `.env` with new credentials
3. Run schema migration again

## Prevention

To prevent auto-pause:
- **Use project regularly** (at least once per week)
- **Set up monitoring** to ping your API
- **Consider upgrading** to Pro tier (no auto-pause)

---

**Most Common Solution**: Just click **"Resume"** in the dashboard and wait 2-3 minutes! 🚀


