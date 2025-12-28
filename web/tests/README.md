# MoneyMate Automated Test Suite

## 🤖 Overview
Comprehensive Playwright test suite covering all 43 test cases from QA test suite.

## 📦 Installation
```bash
cd /Users/shubham.shrivastava/Documents/AntiGravity\ WP/Tools/MoneyMate/web
npm install -D @playwright/test
npx playwright install
```

## 🧪 Running Tests

### Run All Tests
```bash
npm test
```

### Run Specific Section
```bash
npm run test:auth          # Authentication tests
npm run test:income        # Income tests
npm test tests/e2e/03-*    # Fixed expenses
npm test tests/e2e/04-*    # Variable expenses
npm test tests/e2e/07-*    # Sharing & multi-account
```

### Run with UI
```bash
npm run test:ui
```

### Run in Debug Mode
```bash
npm run test:debug
```

### Run Mobile Tests Only
```bash
npx playwright test --project=mobile
```

## 📋 Test Coverage

| Section | Tests | File |
|---------|-------|------|
| **1. Authentication** | 5 | `01-auth.spec.ts` |
| **2. Income** | 4 | `02-income.spec.ts` |
| **3. Fixed Expenses** | 4 | `03-fixed-expenses.spec.ts` |
| **4. Variable Expenses** | 3 | `04-variable-expenses.spec.ts` |
| **5. Investments** | 2 | `05-investments-debts.spec.ts` |
| **6. Debts** | 2 | `05-investments-debts.spec.ts` |
| **7. Health** | 3 | `06-health.spec.ts` |
| **8. Sharing** | 9 | `07-sharing-multi-account.spec.ts` |
| **9. Activity** | 1 | `08-activity-mobile.spec.ts` |
| **10. Mobile** | 3 | `08-activity-mobile.spec.ts` |
| **11. Settings** | 2 | `09-settings-security-alerts-export.spec.ts` |
| **12. Security** | 2 | `09-settings-security-alerts-export.spec.ts` |
| **13. Alerts** | 1 | `09-settings-security-alerts-export.spec.ts` |
| **14. Export** | 1 | `09-settings-security-alerts-export.spec.ts` |
| **TOTAL** | **43** | **9 spec files** |

## 🔧 Configuration

### Environment Variables
```bash
BASE_URL=http://localhost:5173    # Frontend URL
API_URL=https://api.moneymate.com # Backend API
```

### Test Accounts
See `tests/fixtures.ts` for predefined test accounts:
- `qa_individual_1` - High income individual
- `qa_individual_2` - Tight budget individual
- `qa_family_owner` - Family account owner
- `qa_family_spouse` - Family spouse (shared)
- `qa_family_parent` - Family parent (shared)

## 📊 Reports

### HTML Report
```bash
npm run test:report
```

### JSON Results
After running tests, find results in:
```
test-results/results.json
```

## 🎯 Test Types

### E2E UI Tests
- Full user flows through UI
- Uses Playwright page automation
- Validates UI elements and interactions

### API Tests
- Direct backend API calls
- Marked with `[API]` prefix
- Validates endpoints and data

### Mobile Tests
- Responsive design validation
- Touch target sizes
- Viewport zoom prevention

## ⚠️ Important Notes

### Test Order
Tests run **serially** (not parallel) to avoid data conflicts.

### Data Isolation
Each test account should have isolated data. Clean up or use fresh accounts for consistent results.

### Known Limitations
1. Activity log amounts not displayed (acknowledged bug)
2. Viewer/editor permissions not enforced (all shared users can edit)

## 🐛 Debugging Failed Tests

### Take Screenshots
Screenshots are automatically captured on failure in `test-results/`

### Record Videos
Videos are recorded on failure, find in `test-results/`

### Enable Trace
```bash
npx playwright test --trace on
npx playwright show-trace trace.zip
```

## 🚀 CI/CD Integration

### GitHub Actions Example
```yaml
- name: Install Playwright
  run: npx playwright install --with-deps

- name: Run Tests
  run: npm test
  env:
    BASE_URL: ${{ secrets.BASE_URL }}
    API_URL: ${{ secrets.API_URL }}

- name: Upload Report
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

## 📝 Writing New Tests

### Example Test
```typescript
import { test, expect } from '@playwright/test';
import { UIHelper, TEST_ACCOUNTS } from '../fixtures';

test('TC-NEW-001: Test Description', async ({ page }) => {
  await UIHelper.loginUI(page, TEST_ACCOUNTS.individual1.username, TEST_ACCOUNTS.individual1.password);
  await page.goto('/some-page');
  
  // Perform actions
  await page.getByRole('button', { name: 'Click Me' }).click();
  
  // Verify results
  await expect(page.getByText('Success')).toBeVisible();
});
```

## 🔗 Related Documentation
- [QA Test Suite](../../../.gemini/antigravity/brain/338be114-8e7a-42f5-a95c-4975df8da560/qa_test_suite.md)
- [Sharing Feature Explained](../../../.gemini/antigravity/brain/338be114-8e7a-42f5-a95c-4975df8da560/sharing_feature_explained.md)
- [Playwright Docs](https://playwright.dev/)
