# 🔧 Troubleshooting Supabase Migration

## Common Issues

### 1. "Could not query the database for the schema cache. Retrying."

**Cause**: Supabase is rebuilding its schema cache or the project is still initializing.

**Solutions**:
- Wait 1-2 minutes and try again
- Check Supabase dashboard - project should be "Active"
- Verify schema is created in Supabase SQL Editor
- The retry logic should handle this automatically

### 2. "503 Service Unavailable"

**Cause**: Supabase project might be paused or having temporary issues.

**Solutions**:
- Check Supabase dashboard - ensure project is active
- Wait a few minutes and retry
- Check Supabase status page: https://status.supabase.com

### 3. "409 Conflict" on Signup

**Cause**: Username already exists OR Supabase connection issue.

**Solutions**:
- Try a different username
- Check if user already exists in Supabase dashboard
- Verify Supabase connection is working

### 4. Server Still Loading from Disk

**Cause**: Old `store.ts` is still being imported somewhere.

**Solutions**:
- Check `mergedFinances.ts` - should use Supabase
- Check `server.ts` shutdown handler - should not use old store
- Rebuild: `npm run build`
- Restart server

### 5. Port Already in Use

**Solution**:
```bash
lsof -ti:12022 | xargs kill -9
```

## Verification Steps

### 1. Check Supabase Connection
```bash
npm run test-supabase
```

### 2. Check Schema Exists
- Go to Supabase Dashboard → Table Editor
- Should see 16 tables
- If missing, run schema.sql in SQL Editor

### 3. Check Environment Variables
```bash
# In backend directory
cat .env | grep SUPABASE
```

Should have:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_CONNECTION_STRING` (optional)

### 4. Test Direct Database Query
```bash
npm run test-supabase
```

## Still Having Issues?

1. **Check Supabase Dashboard**:
   - Project status
   - Database is active
   - Tables exist

2. **Check Server Logs**:
   - Look for error messages
   - Check if Supabase errors are retrying

3. **Verify Data Migration**:
   - Check if data exists in Supabase tables
   - Run: `npm run migrate-data-direct` if needed

4. **Test with Existing User**:
   - Try logging in with an existing user
   - Check if data loads from Supabase



