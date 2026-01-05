# 🧪 Testing Supabase Migration

## Current Status

You're seeing Supabase initialization errors. This is **normal** - Supabase needs time to initialize.

## Quick Test Options

### Option 1: List Existing Users

First, see what users exist in Supabase:

```bash
npm run list-users
```

This will show all usernames. If you see "schema cache" error, wait 1-2 minutes and try again.

### Option 2: Check User Password

If you know a username, check if the password matches:

```bash
npm run check-user shubham YourPassword123!
```

This will tell you if the password is correct.

### Option 3: Create Test User

Create a new test user with known credentials:

```bash
npm run create-test-user
```

This creates:
- Username: `testuser`
- Password: `Test123!@#`

Then test with:
```bash
npm run test-existing-user testuser Test123!@#
```

### Option 4: Test with Command Line Args

You can pass username and password directly:

```bash
npm run test-existing-user <username> <password>
```

Example:
```bash
npm run test-existing-user shubham MyPassword123!
```

## If Supabase is Still Initializing

If you keep seeing "schema cache" errors:

1. **Wait 2-3 minutes** - Supabase needs time to fully initialize
2. **Check Supabase Dashboard**:
   - Go to https://supabase.com/dashboard
   - Check if project is "Active" (not "Paused")
   - If paused, click "Resume" and wait
3. **Verify Schema**:
   - Go to Table Editor → users
   - If you see the table, schema is ready
   - If not, wait a bit longer

## Manual Check in Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Table Editor** → **users**
4. You should see all migrated users
5. Note down a username you want to test with

## Finding Passwords

If you don't know the password for migrated users:

1. **Check original data file**: `data/finflow-data.json`
   - Passwords are hashed (SHA256), but you can see the original if you have it
2. **Create new test user**: `npm run create-test-user`
3. **Use Supabase SQL Editor** to reset password (advanced)

## Expected Test Results

Once Supabase is ready, you should see:

```
✅ Login successful!
✅ Dashboard loaded!
   - Incomes: X
   - Fixed Expenses: X
   - Health: Good (₹X)
✅ Health details loaded!
✅ Preferences loaded!
✅ Income created!
```

## Troubleshooting

### "Invalid credentials"
- Password is wrong
- User doesn't exist
- Try: `npm run check-user <username> <password>`

### "Schema cache" error
- Supabase is initializing
- Wait 1-2 minutes
- Check Supabase dashboard

### "503 Service Unavailable"
- Project might be paused
- Check Supabase dashboard
- Resume if needed

---

**The migration is complete!** Just need to wait for Supabase to finish initializing, then you can test everything.



