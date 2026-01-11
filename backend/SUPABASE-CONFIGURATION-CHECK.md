# 🔧 Supabase Configuration Check

## Current Status: Project Not Responding

If Supabase has been down for a long time, check these configurations:

## 1. Check Project Status

### Go to Supabase Dashboard
1. Visit: https://supabase.com/dashboard
2. Select your project: `lvwpurwrktdblctzwctr`
3. **Check the status badge** at the top:
   - ✅ **"Active"** = Good, project is running
   - ⏸️ **"Paused"** = Project is paused (click "Resume")
   - ❌ **"Inactive"** = Project needs to be activated

### If Project is Paused
1. Click **"Resume"** button
2. Wait **2-3 minutes** for project to fully start
3. You'll see a loading indicator
4. Once active, try again

## 2. Verify Environment Variables

Check your `.env` file in `backend/.env`:

```bash
cd backend
cat .env | grep SUPABASE
```

You should have:
- `SUPABASE_URL=https://lvwpurwrktdblctzwctr.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...` (long JWT token)
- `SUPABASE_CONNECTION_STRING=postgresql://...` (optional)

### If Missing, Get from Supabase Dashboard:

**Project URL:**
1. Go to **Settings** → **API**
2. Copy **Project URL** → `SUPABASE_URL`

**Service Role Key:**
1. Go to **Settings** → **API**
2. Under **Project API keys**, find **service_role** (secret)
3. Click **Reveal** and copy → `SUPABASE_SERVICE_ROLE_KEY`
4. ⚠️ **Keep this secret!** Never commit to git.

**Connection String (Optional):**
1. Go to **Settings** → **Database**
2. Under **Connection string**, select **Transaction mode**
3. Copy connection string → `SUPABASE_CONNECTION_STRING`

## 3. Check Database Status

### Verify Tables Exist
1. Go to **Table Editor** in Supabase Dashboard
2. You should see these tables:
   - ✅ users
   - ✅ constraint_scores
   - ✅ incomes
   - ✅ fixed_expenses
   - ✅ variable_expense_plans
   - ✅ variable_expense_actuals
   - ✅ investments
   - ✅ future_bombs
   - ✅ credit_cards
   - ✅ loans
   - ✅ activities
   - ✅ user_preferences
   - ✅ theme_states
   - ✅ shared_accounts
   - ✅ shared_members
   - ✅ sharing_requests
   - ✅ payments

### If Tables Don't Exist
The schema hasn't been created yet:

1. Go to **SQL Editor** in Supabase Dashboard
2. Click **New query**
3. Open `backend/supabase/schema.sql` in your code editor
4. Copy **ALL** SQL content
5. Paste into Supabase SQL Editor
6. Click **Run** (or press Ctrl+Enter)
7. Wait for "Success" message

## 4. Check Project Settings

### Database Settings
1. Go to **Settings** → **Database**
2. Check:
   - **Database version**: Should show PostgreSQL version
   - **Connection pooling**: Should be enabled
   - **Direct connection**: Should show connection string

### API Settings
1. Go to **Settings** → **API**
2. Check:
   - **Project URL**: Should match your `.env` file
   - **API keys**: Should show `anon` and `service_role` keys

## 5. Check Project Limits

Free tier limits:
- **Database size**: 500 MB
- **Bandwidth**: 2 GB/month
- **API requests**: Unlimited (with rate limits)

If you've exceeded limits:
- Check **Usage** tab in dashboard
- Consider upgrading or optimizing

## 6. Test Connection

After verifying everything, test:

```bash
cd backend
npm run check-supabase
```

Expected output:
```
✅ API is reachable
✅ Database connection successful!
✅ Schema is ready!
```

## 7. Common Issues & Fixes

### Issue: "503 Service Unavailable"
**Fix**: Project is paused → Resume in dashboard

### Issue: "Schema cache" error
**Fix**: Wait 2-3 minutes after resuming project

### Issue: "Connection refused"
**Fix**: Check if project URL is correct in `.env`

### Issue: "Invalid API key"
**Fix**: Regenerate service role key in Settings → API

### Issue: "Relation does not exist"
**Fix**: Schema not created → Run `schema.sql` in SQL Editor

## 8. Still Not Working?

### Check Supabase Status Page
Visit: https://status.supabase.com
- Check if there's a known outage
- Check your region (ap-south-1)

### Verify Project Region
1. Go to **Settings** → **General**
2. Check **Region**: Should be `ap-south-1` (Asia Pacific - Mumbai)
3. If different, connection string might be wrong

### Contact Support
If nothing works:
1. Go to Supabase Dashboard
2. Click **Support** (bottom left)
3. Describe the issue

## Quick Checklist

- [ ] Project is **Active** (not Paused)
- [ ] `.env` file has all 3 Supabase variables
- [ ] Tables exist in **Table Editor**
- [ ] Schema was created in **SQL Editor**
- [ ] `npm run check-supabase` shows success
- [ ] Project region matches connection string

---

**Most Common Issue**: Project is **Paused**. Just click "Resume" and wait 2-3 minutes!


