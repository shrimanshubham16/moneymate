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

        // Click Add Income
        await page.getByRole('button', { name: /Add Income/i }).click();

        // Fill form
        await page.getByLabel('Source').fill(TEST_DATA.income.salary.source);
        await page.getByLabel('Amount').fill(TEST_DATA.income.salary.amount.toString());
        await page.selectOption('select[name="frequency"]', 'monthly');

        // Submit
        await page.getByRole('button', { name: 'Add' }).click();

        // Verify income appears in list
        await expect(page.getByText('Salary')).toBeVisible();
        await expect(page.getByText('₹1,00,000')).toBeVisible();
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

        // Click edit icon on first income
        await page.locator('.income-card').first().locator('button[title="Edit"]').click();

        // Change amount
        await page.getByLabel('Amount').fill('120000');
        await page.getByRole('button', { name: 'Update' }).click();

        // Verify updated amount
        await expect(page.getByText('₹1,20,000')).toBeVisible();
    });

    test('TC-INCOME-003: Delete Income', async ({ page }) => {
        await UIHelper.loginUI(page, TEST_ACCOUNTS.individual1.username, TEST_ACCOUNTS.individual1.password);
        await page.goto('/settings/plan-finances/income');

        // Get initial count
        const initialCount = await page.locator('.income-card').count();

        // Click delete on last income
        await page.locator('.income-card').last().locator('button[title="Delete"]').click();

        // Confirm deletion
        await page.on('dialog', dialog => dialog.accept());

        // Verify count decreased
        const newCount = await page.locator('.income-card').count();
        expect(newCount).toBe(initialCount - 1);
    });
});
