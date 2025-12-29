# Debug: 404 Errors on Credit Card Endpoints

## Issue
- Update bill: Request failed: 404
- View credit card usage: Request failed: 404

## Root Cause Analysis

### Route Ordering (Fixed)
Express.js matches routes in the order they're defined. More specific routes must come before general ones.

**Current Route Order (Correct):**
1. `GET /debts/credit-cards/billing-alerts` - Specific (no :id)
2. `GET /debts/credit-cards` - General list
3. `POST /debts/credit-cards` - General create
4. `GET /debts/credit-cards/:id/usage` - Specific (with :id)
5. `POST /debts/credit-cards/:id/payments` - Specific (with :id)
6. `POST /debts/credit-cards/:id/reset-billing` - Specific (with :id)
7. `DELETE /debts/credit-cards/:id` - General (with :id)
8. `PATCH /debts/credit-cards/:id` - General (with :id)

### Possible Issues

1. **Server Not Restarted**: The backend server needs to be restarted after route changes
2. **Route Matching**: Express might be matching a general route before the specific one
3. **API Base URL**: Frontend might be using wrong base URL

## Fixes Applied

1. ✅ Reordered routes so specific routes come first
2. ✅ Created `updateCreditCardBill` API helper function
3. ✅ Updated frontend to use API helper instead of direct fetch
4. ✅ Improved error handling

## Testing Steps

1. **Restart Backend Server**:
   ```bash
   cd backend
   npm run dev
   ```

2. **Test Update Bill**:
   - Click "Update Bill" button on a credit card
   - Enter a bill amount
   - Submit
   - Should update successfully

3. **Test View Usage**:
   - Click "View Usage" button on a credit card
   - Should show modal with expenses

## If Still Getting 404

1. Check backend server is running: `curl http://localhost:12022/health`
2. Check route registration: Look for routes in server logs
3. Verify API base URL in frontend: Check `VITE_API_URL` env var
4. Check browser console for actual request URL
5. Verify authentication token is being sent

## Expected Behavior

- **Update Bill**: `PATCH /debts/credit-cards/:id` with `{ billAmount: number }`
- **View Usage**: `GET /debts/credit-cards/:id/usage`

Both should return 200 OK, not 404.

