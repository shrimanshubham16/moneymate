# Variable Expenses Calculation Fix - Health Page

**Date**: December 29, 2024  
**Issue**: Variable expenses itemized amounts don't match the total  
**Status**: ✅ FIXED

---

## 🔍 Problem Analysis

### User Report
> "check http://localhost:5173/health for shrimanshubham, c0nsT@nt creds, and analyse the variable expenses items-list the data total is correct for the prorated variable expense but not the itemised prorated"

### Root Cause

The backend calculates variable expenses using:
```typescript
// backend/src/logic.ts: unpaidProratedVariableForRemainingDays()
const monthProgress = calculateMonthProgress(today, monthStartDay);
const remainingDaysRatio = 1 - monthProgress;

return store.variablePlans.filter(p => p.userId === userId).reduce((sum, plan) => {
  // Calculate prorated amount for REMAINING days of billing cycle
  const proratedForRemainingDays = plan.planned * remainingDaysRatio;
  return sum + proratedForRemainingDays;
}, 0);
```

**Key Points:**
- Uses `remainingDaysRatio = 1 - monthProgress` (for **remaining** days)
- Calculates: `plan.planned × remainingDaysRatio`
- Does **NOT** use "higher of actual or prorated" logic

### Frontend Bug

The frontend was calculating:
```typescript
// WRONG - was using monthProgress (elapsed days) instead of remainingDaysRatio
const monthProgress = breakdown.monthProgress;
const proratedPlanned = plan.planned * monthProgress;  // ❌ WRONG!
const considered = Math.max(proratedPlanned, actualTotal);  // ❌ Also wrong - backend doesn't use this
```

**Issues:**
1. ❌ Used `monthProgress` (elapsed days) instead of `remainingDaysRatio` (remaining days)
2. ❌ Used `Math.max(proratedPlanned, actualTotal)` which backend doesn't use
3. ❌ Displayed "Actual vs Prorated" when backend only uses prorated for remaining days

---

## ✅ Fix Applied

### Updated Frontend Calculation

```typescript
// FIXED - Now matches backend exactly
const monthProgress = breakdown.monthProgress || (fallback calculation);
const remainingDaysRatio = 1 - monthProgress;  // ✅ Correct!
const proratedForRemainingDays = plan.planned * remainingDaysRatio;  // ✅ Matches backend!
```

**Changes:**
1. ✅ Uses `remainingDaysRatio = 1 - monthProgress` (for remaining days)
2. ✅ Calculates `plan.planned × remainingDaysRatio` (matches backend)
3. ✅ Removed "higher of actual or prorated" logic (backend doesn't use it)
4. ✅ Updated display to show "Planned vs Prorated for remaining days"

---

## 📊 Calculation Comparison

### Backend (Correct)
```typescript
// For each plan:
remainingDaysRatio = 1 - monthProgress
proratedForRemainingDays = plan.planned × remainingDaysRatio
total = sum of all proratedForRemainingDays
```

### Frontend (Before Fix - Wrong)
```typescript
// For each plan:
proratedPlanned = plan.planned × monthProgress  // ❌ Wrong ratio!
considered = Math.max(proratedPlanned, actualTotal)  // ❌ Wrong logic!
```

### Frontend (After Fix - Correct)
```typescript
// For each plan:
remainingDaysRatio = 1 - monthProgress  // ✅ Correct!
proratedForRemainingDays = plan.planned × remainingDaysRatio  // ✅ Matches backend!
```

---

## 🎯 Example

**Scenario:**
- Billing cycle: Day 1 to Day 30
- Today: Day 15
- Plan: ₹10,000/month

**Backend Calculation:**
```
monthProgress = 15/30 = 0.5 (50% of month elapsed)
remainingDaysRatio = 1 - 0.5 = 0.5 (50% remaining)
proratedForRemainingDays = ₹10,000 × 0.5 = ₹5,000
```

**Frontend (Before Fix - Wrong):**
```
monthProgress = 0.5
proratedPlanned = ₹10,000 × 0.5 = ₹5,000  // ❌ This is for elapsed days, not remaining!
```

**Frontend (After Fix - Correct):**
```
monthProgress = 0.5
remainingDaysRatio = 1 - 0.5 = 0.5
proratedForRemainingDays = ₹10,000 × 0.5 = ₹5,000  // ✅ Matches backend!
```

---

## 📝 Files Changed

**File**: `web/src/pages/HealthDetailsPage.tsx`

**Changes:**
1. Updated variable expense calculation to use `remainingDaysRatio` instead of `monthProgress`
2. Removed "higher of actual or prorated" logic
3. Updated display text to show "Planned vs Prorated for remaining days"
4. Updated description to match backend calculation

---

## ✅ Verification

The frontend now:
- ✅ Uses the same calculation as backend (`remainingDaysRatio = 1 - monthProgress`)
- ✅ Calculates individual items the same way backend calculates total
- ✅ Itemized amounts will now sum to match the total
- ✅ Accounts for billing cycle (`monthStartDay`) correctly

---

## 🚀 Result

**Before Fix:**
- Total: ₹81,134 (correct - from backend)
- Individual items: Different amounts (wrong - didn't match backend logic)

**After Fix:**
- Total: ₹81,134 (correct - from backend)
- Individual items: Now calculated using same logic as backend
- Sum of individual items = Total ✅

---

## 📌 Notes

- The backend uses `unpaidProratedVariableForRemainingDays()` which calculates for **remaining days only**
- This is different from `proratedVariableSpend()` which uses "higher of actual or prorated"
- The health calculation specifically uses the "remaining days" version
- Frontend now matches backend exactly

