import { test, expect } from '@playwright/test';
import { TEST_ACCOUNTS, TEST_DATA, APIHelper, UIHelper } from '../fixtures';

test.describe('Section 2: Income Management', () => {
    let token: string;

    test.beforeAll(async () => {
        // Login to get token
        const result = await APIHelper.login(
            TEST_ACCOUNTS.individual1.username,
            TEST_ACCOUNTS.individual1.password
        );
        token = result.access_token;
    });

    test('TC-INCOME-001: Add Income (UI)', async ({ page }) => {
        await UIHelper.loginUI(page, TEST_ACCOUNTS.individual1.username, TEST_ACCOUNTS.individual1.password);

        // Navigate to Income page
        await page.goto('/settings/plan-finances/income');

        // Click Add Income button (in header)
        await page.getByRole('button', { name: 'Add Income' }).click();

        // Fill form in modal
        await page.getByLabel(/Source/i).fill(TEST_DATA.income.salary.source);
        await page.getByLabel(/Amount/i).fill(TEST_DATA.income.salary.amount.toString());
        await page.locator('select[name="frequency"]').selectOption('monthly');

        // Submit
        await page.getByRole('button', { name: 'Add Income Source' }).click();

        // Verify income appears in list
        await expect(page.getByText('Salary')).toBeVisible({ timeout: 5000 });
        await expect(page.getByText(/₹1,00,000/)).toBeVisible();
    });

    test('[API] TC-INCOME-001: Add Income via API', async () => {
        const result = await APIHelper.addIncome(token, TEST_DATA.income.bonus);

        expect(result).toHaveProperty('id');
        expect(result.source).toBe('Bonus');
        expect(result.amount).toBe(50000);
    });

    test('TC-INCOME-002: Update Income', async ({ page }) => {
        await UIHelper.loginUI(page, TEST_ACCOUNTS.individual1.username, TEST_ACCOUNTS.individual1.password);
        await page.goto('/settings/plan-finances/income');

        // Note: Current IncomePage.tsx doesn't have edit functionality
        // Only delete is available. Skipping this test for now.
        test.skip();
    });

    test('TC-INCOME-003: Delete Income', async ({ page }) => {
        await UIHelper.loginUI(page, TEST_ACCOUNTS.individual1.username, TEST_ACCOUNTS.individual1.password);
        await page.goto('/settings/plan-finances/income');

        // Wait for incomes to load
        await page.waitForTimeout(1000);

        // Get initial count
        const initialCount = await page.locator('.income-card').count();
        
        if (initialCount === 0) {
            test.skip(); // Skip if no incomes to delete
        }

        // Set up dialog handler BEFORE clicking delete
        page.once('dialog', dialog => dialog.accept());

        // Click delete on last income (button with title="Delete income source")
        await page.locator('.income-card').last().locator('button[title="Delete income source"]').click();

        // Wait for deletion to complete
        await page.waitForTimeout(1000);

        // Verify count decreased
        const newCount = await page.locator('.income-card').count();
        expect(newCount).toBe(initialCount - 1);
    });
});
