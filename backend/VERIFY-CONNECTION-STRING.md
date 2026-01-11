# ✅ Verify Connection String Format

## Current Issue
Both connection pooling and direct connection are failing with "Tenant or user not found".

## Please Verify in Supabase Dashboard

1. **Go to**: https://supabase.com/dashboard/project/lvwpurwrktdblctzwctr/settings/database

2. **Check "Connection String" section** - You should see multiple options:
   - **Connection Pooling** (port 6543)
   - **Direct Connection** (port 5432)
   - **Session Mode**
   - **Transaction Mode**

3. **For Migrations, we need:**
   - **Transaction Mode** connection string (if available)
   - OR **Direct Connection** (port 5432)

4. **Copy the EXACT connection string** from the dashboard (don't modify it)

5. **Share it here** (with password URL-encoded) so I can update the script

## Alternative: Use Supabase SQL Editor

If connection strings don't work, we can:
1. Use Supabase SQL Editor to run INSERT statements
2. Or create a script that uses Supabase REST API
3. Or manually verify the connection string format first

---

**The connection string format from Supabase dashboard should work - let's make sure we're using the exact format they provide!**


