# 🐛 Production Bugs - Critical Fixes

**Date**: January 31, 2025  
**Status**: Active Fixing

---

## 🔴 P0 - Critical Bugs

### Bug #1: Overspend Risk Always Shows 0
**Status**: 🔴 **IN PROGRESS**  
**Priority**: P0  
**Description**:  
Overspend Risk in `/health` page always shows 0, even when user has overspent on variable expenses.

**Root Cause**:
- Constraint score `recentOverspends` field exists but is never updated
- No logic to detect when `variable_expense_actuals.amount > variable_expense_plans.planned`
- Need to calculate overspend on actual expense creation and update constraint score

**Fix Plan**:
1. Add overspend detection in `/planning/variable-expenses/:id/actuals` POST endpoint
2. Calculate: `actualAmount > plannedAmount` for the billing period
3. Update `constraint_scores.recentOverspends` and `constraint_scores.score` (+5 per overspend)
4. Add activity log for overspend detection

---

### Bug #2: Monthly Reset Not Working
**Status**: 🔴 **IN PROGRESS**  
**Priority**: P0  
**Description**:  
On monthly reset date (user's `month_start_day`), paid expenses/investments should become unpaid again, but they remain paid.

**Root Cause**:
- `payments` table stores paid status per month (YYYY-MM format)
- No scheduled job or trigger to clear old month's payments
- Dashboard shows old month's paid items as still paid

**Fix Plan**:
1. Create database function to check if month has changed based on `user_preferences.month_start_day`
2. On dashboard load, check if month changed and clear previous month's payments
3. Reset `variable_expense_actuals` for previous month (or archive them)
4. Ensure `/dues` page shows items as unpaid after reset

**What Gets Reset**:
- ✅ Fixed expenses: Clear `payments` entries for previous month
- ✅ Investments: Clear `payments` entries for previous month  
- ✅ Variable expenses: Archive/clear `variable_expense_actuals` for previous month
- ✅ Loans: Clear `payments` entries for previous month (if tracked separately)

---

## 🟡 P1 - High Priority Bugs

### Bug #3: Dues Page Checkbox Slow
**Status**: 🟡 **PENDING**  
**Priority**: P1  
**Description**:  
Clicking checkbox on dues page takes significant time to remove card from UI, feels unresponsive.

**Fix Plan**:
1. Add optimistic UI update (remove card immediately)
2. Add toast notification: "Hurray!! [Item Name] Due paid"
3. Revert on error

---

## 🟢 P2 - Medium Priority Bugs

### Bug #4: Loading Text Instead of Animation
**Status**: 🟢 **PENDING**  
**Priority**: P2  
**Description**:  
Pages show "Loading..." text instead of the loading animation used in health calculation.

**Fix Plan**:
1. Replace all `"Loading..."` with `<SkeletonLoader />` or `<MatrixLoader />`
2. Check all pages: DuesPage, FixedExpensesPage, InvestmentsPage, etc.

---

## 🎨 Enhancements

### Enhancement #1: Activity Page - History Button
**Status**: 🟢 **PENDING**  
**Priority**: Enhancement  
**Description**:  
Add History button to Activity page showing monthly snapshots.

**Features**:
- List previous months (Dec 2025, Nov 2025, etc.)
- Click month → Show complete "Current Month Expenses" snapshot for that month
- Trend charts: Monthly paid fixed, variable, investments, overspends, misses
- Click chart bar → View detailed breakdown

---

### Enhancement #2: Activity Page - Period Selector
**Status**: 🟢 **PENDING**  
**Priority**: Enhancement  
**Description**:  
Add period selector to filter activities by custom date range.

**Features**:
- Default: Current billing month
- Custom range picker
- Filter activities by selected period

---

## 📊 Bug Status Summary

| Priority | Count | Fixed | In Progress | Pending |
|----------|-------|-------|-------------|---------|
| P0 (Critical) | 2 | 0 | 2 | 0 |
| P1 (High) | 1 | 0 | 0 | 1 |
| P2 (Medium) | 1 | 0 | 0 | 1 |
| Enhancements | 2 | 0 | 0 | 2 |

---

**Last Updated**: January 31, 2025
