import { test, expect } from '@playwright/test';
import { TEST_ACCOUNTS, TEST_DATA, UIHelper } from '../fixtures';

test.describe('Section 4: Variable Expenses', () => {

    test('TC-VARIABLE-001: Create Expense Plan', async ({ page }) => {
        await UIHelper.loginUI(page, TEST_ACCOUNTS.individual1.username, TEST_ACCOUNTS.individual1.password);
        await page.goto('/settings/plan-finances/variable');

        await page.getByRole('button', { name: /Create Plan/i }).click();

        await page.getByLabel('Name').fill(TEST_DATA.variableExpense.groceries.name);
        await page.getByLabel('Planned').fill(TEST_DATA.variableExpense.groceries.planned.toString());
        await page.selectOption('select[name="category"]', 'Food');

        await page.getByRole('button', { name: 'Add' }).click();

        await expect(page.getByText('Groceries')).toBeVisible();
        await expect(page.getByText('₹8,000')).toBeVisible();
    });

    test('TC-VARIABLE-002: Add Actual Expense', async ({ page }) => {
        await UIHelper.loginUI(page, TEST_ACCOUNTS.individual1.username, TEST_ACCOUNTS.individual1.password);
        await page.goto('/variable-expenses');

        await page.locator('.plan-card').first().getByRole('button', { name: /Add Actual/i }).click();

        await page.getByLabel('Amount').fill('2500');
        await page.getByLabel('Justification').fill('Weekly shopping');
        await page.getByRole('button', { name: 'Add' }).click();

        await expect(page.getByText('Weekly shopping')).toBeVisible();
        await expect(page.getByText('₹2,500')).toBeVisible();
    });

    test('TC-VARIABLE-003: Data Persistence', async ({ page, context }) => {
        await UIHelper.loginUI(page, TEST_ACCOUNTS.individual1.username, TEST_ACCOUNTS.individual1.password);
        await page.goto('/settings/plan-finances/variable');

        await page.getByRole('button', { name: /Create Plan/i }).click();
        await page.getByLabel('Name').fill('Transport');
        await page.getByLabel('Planned').fill('5000');
        await page.getByRole('button', { name: 'Add' }).click();

        const planId = await page.locator('.plan-card:has-text("Transport")').getAttribute('data-id');

        // Simulate deploy by refreshing page
        await page.reload();

        // Verify plan still exists
        await expect(page.getByText('Transport')).toBeVisible();
    });
});
