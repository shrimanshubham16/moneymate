# Health Calculation Explanation

## Issue: Different Health Scores on Dashboard vs /health Page

**User:** shriman_shubham  
**Dashboard Health:** ₹63,725.806  
**Health Details Page:** ₹57,466.577  
**Difference:** ₹6,259.229

---

## Root Cause Analysis

The discrepancy is likely caused by **different data being used** for the calculation on each page:

### **Dashboard (`/dashboard`)**
- Calls: `GET /dashboard?asOf=2025-01-15T00:00:00Z`
- Backend calculates health **once** using `computeHealthSnapshot()`
- Returns: `data.health.remaining`
- Dashboard displays this value directly

### **Health Details Page (`/health`)**
- Calls: `GET /dashboard?asOf=2025-01-15T00:00:00Z` (same endpoint)
- **BUT** also recalculates on frontend using fetched data
- May have timing issues or data inconsistencies

---

## Current Health Calculation Formula

```typescript
// Backend: computeHealthSnapshot()

Step 1: Calculate Total Income (Monthly)
  totalIncome = Sum of all income sources (monthly equivalent)

Step 2: Calculate Payments Made This Month
  paymentsMade = Sum of all payment records for current month

Step 3: Calculate Available Funds
  availableFunds = totalIncome - paymentsMade

Step 4: Calculate Unpaid Obligations
  unpaidFixed = Sum of unpaid fixed expenses (monthly equivalent)
  unpaidProratedVariable = Sum of variable plans * (1 - monthProgress)
  unpaidInvestments = Sum of unpaid active investments
  unpaidCreditCards = Sum of unpaid credit card bills (current month)

Step 5: Calculate Health
  health = availableFunds - unpaidFixed - unpaidProratedVariable - unpaidInvestments - unpaidCreditCards
```

---

## Possible Causes of Discrepancy

### 1. **Frontend Recalculation Issue**
The `HealthDetailsPage.tsx` is recalculating health on the frontend instead of using the backend value directly.

**Problem:** Frontend may be using different logic or data.

**Solution:** Both pages should use `data.health.remaining` from backend.

### 2. **Timing/Caching Issue**
Dashboard and Health page may be fetching data at slightly different times.

**Problem:** Data changes between requests.

**Solution:** Use the same API response for both.

### 3. **Month Progress Calculation**
The `unpaidProratedVariable` uses `monthProgress` which changes throughout the day.

**Problem:** Different calculation times = different month progress = different health.

**Solution:** Use the same `asOf` timestamp for consistency.

### 4. **Payment Records**
Payment records may not be synced properly.

**Problem:** One page sees different payment records than the other.

**Solution:** Ensure both use the same user ID and month.

---

## Debugging Steps

### Step 1: Check Backend Logs
The backend should log health calculation details. Check for:
```
🔍 Health Calculation Debug:
  Income: X
  Payments Made: Y
  Available Funds: Z
  Unpaid Fixed: A
  Unpaid Variable (remaining days): B
  Unpaid Investments: C
  Unpaid Credit Cards: D
  Health: E
```

### Step 2: Check Frontend Console
Both Dashboard and Health Details pages should log:
```
🔍 DEBUG: Backend health: { remaining: X, category: Y }
```

### Step 3: Compare Values
- Dashboard: `data.health.remaining`
- Health Details: `backendRemaining` (should be same as dashboard)

If different, check:
- Are they calling the same API endpoint?
- Are they using the same `asOf` timestamp?
- Are they using the same user ID?

---

## Recommended Fix

### **Option 1: Use Backend Value Only (Recommended)**

Both Dashboard and Health Details should use `data.health.remaining` directly without recalculation.

**Dashboard:**
```typescript
<HealthIndicator
  category={data.health.category}
  remaining={data.health.remaining}  // ✅ Use backend value
  onClick={() => navigate("/health")}
/>
```

**Health Details:**
```typescript
// ✅ Use backend value directly
const backendRemaining = data.health.remaining;
const backendCategory = data.health.category;

// Display breakdown for transparency, but use backend value for health
setHealth({
  category: backendCategory,
  remaining: backendRemaining,  // ✅ Use backend value
  description,
  advice
});
```

### **Option 2: Debug and Fix Discrepancy**

1. Add extensive logging to both frontend and backend
2. Compare each component of the calculation
3. Identify which value is different
4. Fix the root cause

---

## Current Status

**Issue 1: Loans in Dues** ✅ **FIXED**
- Loans are now excluded from Dues page
- Loans are auto-tracked from fixed expenses with category "Loan"
- Users should mark the corresponding fixed expense as paid instead

**Issue 2: Health Discrepancy** 🔍 **INVESTIGATING**
- Need to check actual data for `shriman_shubham` account
- Need to compare backend logs vs frontend calculations
- Need to verify both pages use the same data source

---

## Next Steps

1. Login as `shriman_shubham` with password `c0nsT@nt`
2. Open browser console (F12)
3. Go to Dashboard - note the health value and console logs
4. Go to /health - note the health value and console logs
5. Compare the logs to identify the discrepancy
6. Report findings for further debugging

---

**Status:** 🔍 **INVESTIGATION IN PROGRESS**

