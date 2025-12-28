# 🔧 Test Suite Fixes Applied

## Fixed Issues

### 1. ✅ API Endpoints (fixtures.ts)
- Changed `API_BASE` from `localhost:3000` → `localhost:12022`
- Fixed `/incomes` → `/planning/income`
- Fixed `/fixed-expenses` → `/planning/fixed-expenses`
- Fixed `/dashboard?date=` → `/dashboard?today=`
- Added `.data` extraction from API responses

### 2. ✅ Auth Tests (01-auth.spec.ts)
- Fixed signup flow: No tabs, uses toggle button
- Added wait for password validation
- Fixed password reset: Click "Change Password" button first
- Updated button text: "Update Password" not "Change Password"
- Added proper timeouts for navigation

### 3. ✅ Login Helper (fixtures.ts)
- Fixed `loginUI()` to handle toggle button
- No tabs in UI, uses "Already have an account? Login" button
- Added proper timeout for dashboard navigation

### 4. 🔧 Income Tests (02-income.spec.ts)
**Locators to verify:**
- Button: `/Add.*Income/i` or `/Add New Income/i`
- Form labels: Check actual IncomePage.tsx
- Edit/Delete icons: Now using react-icons

### 5. 🔧 Fixed Expenses Tests (03-fixed-expenses.spec.ts)
**Critical fixes needed:**
- Edit icon: NOT emoji ✏️, now `<FaEdit />` component
- Delete icon: NOT emoji 🗑️, now `<FaTrashAlt />` component
- Locator: `.expense-card button[title="Edit"]` or by aria-label
- SIP toggle: NOT checkbox, now toggle button for quarterly/yearly only

---

## Remaining Fixes Needed

### Income Page Locators
Need to check actual UI structure in `IncomePage.tsx`

### Fixed Expenses Locators
```typescript
// OLD (won't work):
await page.locator('.expense-card').first().locator('button[title="Edit"]').click();

// NEW (should work):
await page.locator('.expense-card').first().locator('button[aria-label="Edit expense"]').click();
// OR
await page.locator('.expense-card').first().getByRole('button', { name: /edit/i }).click();
```

### SIP Toggle
```typescript
// OLD (won't work):
await page.getByRole('checkbox', { name: /SIP/i }).check();

// NEW (should work):
// 1. Select quarterly or yearly frequency first
await page.selectOption('select[name="frequency"]', 'quarterly');
// 2. Click toggle button (not checkbox)
await page.locator('.toggle-button').click();
```

---

## Test Data Setup

### Create Test Accounts
Before running tests, create these accounts:

```bash
# Via API or UI:
1. qa_individual_1 / Test@123456
2. qa_individual_2 / Test@123456
3. qa_family_owner / Test@123456
4. qa_family_spouse / Test@123456
5. qa_family_parent / Test@123456
```

---

## Running Tests

### Prerequisites
```bash
cd web
npm install -D @playwright/test
npx playwright install
```

### Start Backend & Frontend
```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd web
npm run dev
```

### Run Tests
```bash
cd web
npx playwright test
```

### Run Specific Tests
```bash
npx playwright test tests/e2e/01-auth.spec.ts
npx playwright test tests/e2e/02-income.spec.ts
npx playwright test tests/e2e/03-fixed-expenses.spec.ts
```

### Debug Mode
```bash
npx playwright test --debug
npx playwright test --ui
```

---

## Known Issues to Fix

1. **Income Edit/Delete buttons**: Need actual selectors from IncomePage.tsx
2. **Fixed Expenses icons**: React Icons, not emojis
3. **SIP Toggle**: Button, not checkbox
4. **Payment checkboxes**: May not exist in current UI
5. **Dialog confirmations**: Need to handle properly

---

## Next Steps

1. ✅ Verify IncomePage.tsx structure
2. ✅ Update income test locators
3. ✅ Fix fixed expenses icon locators
4. ✅ Fix SIP toggle interaction
5. ✅ Run full test suite
6. ✅ Fix any remaining failures


