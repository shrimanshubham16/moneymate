import { test, expect } from '@playwright/test';
import { TEST_ACCOUNTS, TEST_DATA, APIHelper, UIHelper } from '../fixtures';

test.describe('Section 3: Fixed Expenses', () => {

    test('TC-FIXED-001: Add Fixed Expense', async ({ page }) => {
        await UIHelper.loginUI(page, TEST_ACCOUNTS.individual1.username, TEST_ACCOUNTS.individual1.password);
        await page.goto('/settings/plan-finances/fixed');

        await page.getByRole('button', { name: /Add Fixed Expense/i }).click();

        await page.getByLabel('Name').fill(TEST_DATA.fixedExpense.rent.name);
        await page.getByLabel('Amount').fill(TEST_DATA.fixedExpense.rent.amount.toString());
        await page.selectOption('select[name="frequency"]', 'monthly');
        await page.selectOption('select[name="category"]', 'Housing');

        await page.getByRole('button', { name: 'Add' }).click();

        await expect(page.getByText('Rent')).toBeVisible();
        await expect(page.getByText('₹25,000')).toBeVisible();
    });

    test('TC-FIXED-002: Mark as Paid/Unpaid', async ({ page }) => {
        await UIHelper.loginUI(page, TEST_ACCOUNTS.individual1.username, TEST_ACCOUNTS.individual1.password);
        await page.goto('/fixed-expenses');

        const checkbox = page.locator('.expense-card').first().getByRole('checkbox');
        await checkbox.check();
        await page.reload();

        await expect(checkbox).toBeChecked();

        await checkbox.uncheck();
        await page.reload();
        await expect(checkbox).not.toBeChecked();
    });

    test('TC-FIXED-003: SIP Flagged Expense', async ({ page }) => {
        await UIHelper.loginUI(page, TEST_ACCOUNTS.individual1.username, TEST_ACCOUNTS.individual1.password);
        await page.goto('/settings/plan-finances/fixed');

        await page.getByRole('button', { name: /Add Fixed Expense/i }).click();
        await page.getByLabel('Name').fill('Insurance');
        await page.getByLabel('Amount').fill('12000');
        await page.selectOption('select[name="frequency"]', 'quarterly');
        await page.getByRole('checkbox', { name: /SIP/i }).check();
        await page.getByRole('button', { name: 'Add' }).click();

        await page.goto('/sip-expenses');
        await expect(page.getByText('Insurance')).toBeVisible();
        await expect(page.getByText('₹4,000/month')).toBeVisible(); // 12000/3
    });

    test('[API] TC-FIXED-001: Add via API', async () => {
        const { username, password } = TEST_ACCOUNTS.individual1;
        const { access_token } = await APIHelper.login(username, password);
        const result = await APIHelper.addFixedExpense(access_token, TEST_DATA.fixedExpense.utilities);

        expect(result).toHaveProperty('id');
        expect(result.name).toBe('Utilities');
    });
});
