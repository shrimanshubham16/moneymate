# ⚠️ IMPORTANT: Server Restart Required

## Issue
Getting 404 errors on:
- `PATCH /debts/credit-cards/:id` (Update Bill)
- `GET /debts/credit-cards/:id/usage` (View Usage)

## Root Cause
The backend server is running **old code** that doesn't have these routes registered.

## Solution: Restart Backend Server

### Steps:
1. **Stop the current backend server** (press `Ctrl+C` in the terminal running `npm run dev`)

2. **Restart the backend server**:
   ```bash
   cd backend
   npm run dev
   ```

3. **Verify the server started**:
   - Look for: `Server running on port 12022`
   - Check: `📂 Loading persisted data from disk...`

4. **Test the endpoints**:
   - Try updating a credit card bill
   - Try viewing credit card usage
   - Both should work now

## Why This Happens
- Routes were added/modified in the code
- TypeScript was compiled (`npm run build` succeeded)
- But the **running server** still has the old code in memory
- Node.js doesn't auto-reload when source files change (unless using a file watcher)

## Verification
After restarting, you should see in the server logs when you make requests:
- No more 404 errors
- Successful responses (200 OK)

## If Still Getting 404 After Restart
1. Check server logs for route registration
2. Verify the compiled JavaScript has the routes: `grep -r "app.patch" dist/`
3. Check if there's a port conflict
4. Verify the frontend is calling the correct URL

