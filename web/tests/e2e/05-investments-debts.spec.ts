import { test, expect } from '@playwright/test';
import { TEST_ACCOUNTS, TEST_DATA, UIHelper, API_BASE } from '../fixtures';

test.describe('Section 5: Investments', () => {

    test('TC-INVEST-001: Add Investment', async ({ page }) => {
        await UIHelper.loginUI(page, TEST_ACCOUNTS.individual1.username, TEST_ACCOUNTS.individual1.password);
        await page.goto('/settings/plan-finances/investments');

        await page.getByRole('button', { name: /Add Investment/i }).click();
        await page.getByLabel('Name').fill(TEST_DATA.investment.ppf.name);
        await page.getByLabel('Monthly Amount').fill(TEST_DATA.investment.ppf.monthlyAmount.toString());
        await page.getByRole('button', { name: 'Add' }).click();

        await expect(page.getByText('PPF')).toBeVisible();
        await expect(page.getByText('₹10,000')).toBeVisible();
    });

    test('TC-INVEST-002: Delete Investment (Bug Fix Verification)', async ({ page }) => {
        await UIHelper.loginUI(page, TEST_ACCOUNTS.individual1.username, TEST_ACCOUNTS.individual1.password);
        await page.goto('/settings/plan-finances/investments');

        const initialCount = await page.locator('.investment-card').count();

        await page.locator('.investment-card').last().locator('button[title="Delete"]').click();
        page.on('dialog', dialog => dialog.accept());

        await page.waitForTimeout(1000);
        const newCount = await page.locator('.investment-card').count();
        expect(newCount).toBe(initialCount - 1);
    });
});

test.describe('Section 6: Debts Management', () => {

    test('TC-DEBT-001: Add Credit Card', async ({ page }) => {
        await UIHelper.loginUI(page, TEST_ACCOUNTS.individual1.username, TEST_ACCOUNTS.individual1.password);
        await page.goto('/settings/manage-debts/credit-cards');

        await page.getByRole('button', { name: /Add Card/i }).click();
        await page.getByLabel('Name').fill(TEST_DATA.creditCard.hdfc.name);
        await page.getByLabel('Limit').fill(TEST_DATA.creditCard.hdfc.limit.toString());
        await page.getByLabel('Bill Amount').fill(TEST_DATA.creditCard.hdfc.billAmount.toString());
        await page.getByLabel('Due Date').fill('5');
        await page.getByRole('button', { name: 'Add' }).click();

        await expect(page.getByText('HDFC Regalia')).toBeVisible();
    });

    test('TC-DEBT-002: Add Loan', async ({ page }) => {
        await UIHelper.loginUI(page, TEST_ACCOUNTS.individual1.username, TEST_ACCOUNTS.individual1.password);
        await page.goto('/loans');

        // Loans are auto-created from fixed expenses with category "Loan"
        await page.goto('/settings/plan-finances/fixed');
        await page.getByRole('button', { name: /Add Fixed Expense/i }).click();
        await page.getByLabel('Name').fill('Car Loan');
        await page.getByLabel('Amount').fill('12000');
        await page.selectOption('select[name="category"]', 'Loan');
        await page.getByRole('button', { name: 'Add' }).click();

        await page.goto('/loans');
        await expect(page.getByText('Car Loan')).toBeVisible();
    });
});
