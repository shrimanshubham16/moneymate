# 🔌 Get Direct Connection String from Supabase

## Issue
The connection pooling string (port 6543) is not working for migrations. We need the **direct connection** string (port 5432).

## Steps to Get Direct Connection String

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard/project/lvwpurwrktdblctzwctr

2. **Navigate to**: **Settings** → **Database**

3. **Find "Connection String" section**

4. **Look for tabs**: You should see:
   - **URI** (this is what we need)
   - **JDBC**
   - **Connection Pooling**

5. **Click on "URI" tab** (NOT "Connection Pooling")

6. **Copy the connection string** - It should look like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.lvwpurwrktdblctzwctr.supabase.co:5432/postgres
   ```

7. **Replace `[YOUR-PASSWORD]`** with your database password (the one with spaces: `b0rn & BroughT UP in`)

8. **URL-encode the password**:
   - Space → `%20`
   - `&` → `%26`
   - So: `b0rn & BroughT UP in` → `b0rn%20%26%20BroughT%20UP%20in`

9. **Final connection string should be**:
   ```
   postgresql://postgres:b0rn%20%26%20BroughT%20UP%20in@db.lvwpurwrktdblctzwctr.supabase.co:5432/postgres
   ```

10. **Update `backend/.env`**:
    ```bash
    SUPABASE_CONNECTION_STRING=postgresql://postgres:b0rn%20%26%20BroughT%20UP%20in@db.lvwpurwrktdblctzwctr.supabase.co:5432/postgres
    ```

## Alternative: Use Supabase SQL Editor

If connection string doesn't work, we can also:
1. Use Supabase SQL Editor to run INSERT statements
2. Or use Supabase Dashboard's Table Editor to import data

---

**Once you have the direct connection string, update `.env` and run migration again!**

