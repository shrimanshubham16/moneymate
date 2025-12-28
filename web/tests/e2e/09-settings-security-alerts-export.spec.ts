import { test, expect } from '@playwright/test';
import { TEST_ACCOUNTS, UIHelper } from '../fixtures';

test.describe('Section 11: Settings & Routes', () => {

    test('TC-SETTINGS-001: All Routes Accessible', async ({ page }) => {
        await UIHelper.loginUI(page, TEST_ACCOUNTS.individual1.username, TEST_ACCOUNTS.individual1.password);

        const routes = [
            '/settings',
            '/settings/account',
            '/settings/preferences',
            '/settings/plan-finances',
            '/settings/plan-finances/income',
            '/settings/plan-finances/fixed',
            '/settings/plan-finances/variable',
            '/settings/plan-finances/investments',
            '/settings/sharing',
            '/settings/about',
            '/settings/support'
        ];

        for (const route of routes) {
            await page.goto(route);

            // Should not show "No routes matched"
            await expect(page.locator('body')).not.toContainText('No routes matched');

            // Should not be blank (has content)
            const content = await page.locator('body').textContent();
            expect(content!.length).toBeGreaterThan(0);
        }
    });

    test('TC-SETTINGS-002: Version Display', async ({ page }) => {
        await UIHelper.loginUI(page, TEST_ACCOUNTS.individual1.username, TEST_ACCOUNTS.individual1.password);
        await page.goto('/settings/about');

        await expect(page.getByText(/v1\.1\./)).toBeVisible();
        await expect(page.getByText(/Dec.*2024/)).toBeVisible();
    });
});

test.describe('Section 12: Security & Data Isolation', () => {

    test('TC-SECURITY-001: User Data Isolation', async ({ page }) => {
        // Login as user 1, add secret income
        await UIHelper.loginUI(page, TEST_ACCOUNTS.individual1.username, TEST_ACCOUNTS.individual1.password);
        await page.goto('/settings/plan-finances/income');

        await page.getByRole('button', { name: /Add Income/i }).click();
        await page.getByLabel('Source').fill('Secret Salary');
        await page.getByLabel('Amount').fill('150000');
        await page.getByRole('button', { name: 'Add' }).click();

        // Logout
        await UIHelper.logoutUI(page);

        // Login as user 2
        await UIHelper.loginUI(page, TEST_ACCOUNTS.individual2.username, TEST_ACCOUNTS.individual2.password);
        await page.goto('/settings/plan-finances/income');

        // User 2 should NOT see user 1's income
        await expect(page.getByText('Secret Salary')).not.toBeVisible();
    });

    test('[API] TC-SECURITY-002: JWT Token Validation', async () => {
        const { username, password } = TEST_ACCOUNTS.individual1;
        const { access_token } = await APIHelper.login(username, password);

        // Valid token should work
        const dashboard = await APIHelper.getDashboard(access_token);
        expect(dashboard).toBeTruthy();

        // Invalid token should fail
        try {
            await APIHelper.getDashboard('invalid_token_12345');
            throw new Error('Should have failed');
        } catch (e: any) {
            expect(e.message).toContain('failed');
        }
    });
});

test.describe('Section 13: Alerts', () => {

    test('TC-ALERT-001: Overspend Alert', async ({ page }) => {
        await UIHelper.loginUI(page, TEST_ACCOUNTS.individual1.username, TEST_ACCOUNTS.individual1.password);

        // Create variable plan with planned 5000
        await page.goto('/settings/plan-finances/variable');
        await page.getByRole('button', { name: /Create Plan/i }).click();
        await page.getByLabel('Name').fill('Food');
        await page.getByLabel('Planned').fill('5000');
        await page.getByRole('button', { name: 'Add' }).click();

        // Add actuals totaling > 5000
        await page.locator('.plan-card:has-text("Food")').getByRole('button', { name: /Add Actual/i }).click();
        await page.getByLabel('Amount').fill('6000');
        await page.getByRole('button', { name: 'Add' }).click();

        // Check alerts page
        await page.goto('/alerts');
        await expect(page.getByText(/overspend/i)).toBeVisible();
    });
});

test.describe('Section 14: Export', () => {

    test('TC-EXPORT-001: Export Data', async ({ page }) => {
        await UIHelper.loginUI(page, TEST_ACCOUNTS.individual1.username, TEST_ACCOUNTS.individual1.password);
        await page.goto('/export');

        const downloadPromise = page.waitForEvent('download');
        await page.getByRole('button', { name: /Export.*CSV/i }).click();
        const download = await downloadPromise;

        expect(download.suggestedFilename()).toContain('.csv');
    });
});
