# User Scoping & Data Isolation Audit

## Critical Issues Found & Fixed

### 1. ✅ Credit Card Creation (FIXED)
**Issue**: Schema mismatch - frontend sending `paidAmount`, backend expecting only required fields
**Impact**: 400 error when creating credit cards
**Fix**: 
- Updated `creditCardSchema` to accept optional `paidAmount` and `statementDate`
- Modified `addCreditCard` endpoint to handle optional fields properly

### 2. ⚠️ Alerts System (GLOBAL - NO USER SCOPING)
**Issue**: `alerts` array is global, shared across all users
**Impact**: All users see all alerts
**Location**: `backend/src/alerts.ts`
**Status**: NEEDS FIX

### 3. ⚠️ Activity Log (PARTIALLY SCOPED)
**Issue**: `listActivities()` returns all activities, filtering done in endpoint
**Impact**: Potential data leakage if endpoint filtering is bypassed
**Location**: `backend/src/store.ts:428`
**Status**: NEEDS IMPROVEMENT

### 4. ⚠️ Constraint Score (GLOBAL - SINGLE INSTANCE)
**Issue**: Single constraint score shared across all users
**Impact**: One user's overspending affects all users' constraint scores
**Location**: `backend/src/store.ts` - `getConstraint()`, `setConstraint()`
**Status**: NEEDS FIX

### 5. ✅ Loans (FIXED)
**Issue**: Already properly scoped by userId in `listLoans(userId)`
**Status**: WORKING CORRECTLY

### 6. ✅ Credit Cards Listing (FIXED)
**Issue**: Used `user.id` instead of `user.userId` (though they're the same)
**Fix**: Standardized to use `userId` consistently

### 7. ✅ Health Score Calculation (VERIFIED)
**Issue**: Reported mismatch
**Status**: All logic functions properly filter by userId - WORKING CORRECTLY

## Endpoints Audit

### ✅ PROPERLY SCOPED:
- `/planning/income` - filters by userId
- `/planning/fixed-expenses` - filters by userId  
- `/planning/variable-expenses` - filters by userId
- `/planning/investments` - filters by userId
- `/debts/credit-cards` (GET) - filters by userId
- `/debts/loans` - filters by userId
- `/dashboard` - uses groupUserIds for merged finances
- `/health` - scoped to userId
- `/activity` - filters by actorId === userId

### ⚠️ NEEDS FIXING:
- `/alerts` - returns global alerts (line 592)
- Constraint score system - global, not per-user
- Alerts in dashboard - uses global `listAlerts()` (line 256)

## Recommended Fixes

### Priority 1: Alerts System
```typescript
// Change from global array to user-scoped
const userAlerts = new Map<string, Alert[]>();

export function listAlerts(userId: string) {
  return userAlerts.get(userId) || [];
}

export function addOverspendAlert(userId: string, planName: string, ...) {
  const alerts = userAlerts.get(userId) || [];
  alerts.push({...});
  userAlerts.set(userId, alerts);
}
```

### Priority 2: Constraint Score
```typescript
// Change from single instance to per-user
const userConstraints = new Map<string, ConstraintScore>();

export function getConstraint(userId: string): ConstraintScore {
  return userConstraints.get(userId) || defaultConstraint;
}
```

### Priority 3: Activity Log
```typescript
// Add userId parameter to listActivities
export function listActivities(userId: string) {
  return state.activities.filter(a => a.actorId === userId);
}
```

## Testing Plan
1. Create 2 test users
2. User A adds fixed expenses in "Loan" category
3. Verify User B doesn't see User A's loans
4. Verify User B's health score is not affected
5. User A creates overspend alert
6. Verify User B doesn't see User A's alert
7. User A adds credit card
8. Verify User B doesn't see User A's credit card

