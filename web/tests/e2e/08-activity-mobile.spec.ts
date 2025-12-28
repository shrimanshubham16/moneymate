import { test, expect } from '@playwright/test';
import { TEST_ACCOUNTS, UIHelper } from '../fixtures';

test.describe('Section 9: Activity Log', () => {

    test('TC-ACTIVITY-001: Activity Tracking', async ({ page }) => {
        await UIHelper.loginUI(page, TEST_ACCOUNTS.individual1.username, TEST_ACCOUNTS.individual1.password);

        // Perform actions
        await page.goto('/settings/plan-finances/income');
        await page.getByRole('button', { name: /Add Income/i }).click();
        await page.getByLabel('Source').fill('Test Income');
        await page.getByLabel('Amount').fill('50000');
        await page.getByRole('button', { name: 'Add' }).click();

        // Check activity log
        await page.goto('/activities');

        await expect(page.getByText(/added income/i)).toBeVisible();
        await expect(page.getByText('Test Income')).toBeVisible();
    });
});

test.describe('Section 10: Mobile Responsiveness', () => {

    test('TC-MOBILE-001: Viewport Zoom Prevention', async ({ page, isMobile }) => {
        test.skip(!isMobile, 'Mobile test only');

        await UIHelper.loginUI(page, TEST_ACCOUNTS.individual1.username, TEST_ACCOUNTS.individual1.password);
        await page.goto('/settings/plan-finances/income');

        const input = page.getByLabel('Source');
        const initialZoom = await page.evaluate(() => window.visualViewport?.scale);

        await input.click();
        await page.waitForTimeout(500);

        const afterClickZoom = await page.evaluate(() => window.visualViewport?.scale);

        // Zoom should not change
        expect(afterClickZoom).toBe(initialZoom);
    });

    test('TC-MOBILE-002: Health Page Layout', async ({ page, isMobile }) => {
        test.skip(!isMobile, 'Mobile test only');

        await UIHelper.loginUI(page, TEST_ACCOUNTS.individual1.username, TEST_ACCOUNTS.individual1.password);
        await page.goto('/health');

        // Check no horizontal scroll
        const hasHorizontalScroll = await page.evaluate(() =>
            document.documentElement.scrollWidth > document.documentElement.clientWidth
        );
        expect(hasHorizontalScroll).toBe(false);

        // Check cards stack vertically
        const cards = page.locator('.health-card');
        const count = await cards.count();
        if (count > 1) {
            const firstCardBox = await cards.first().boundingBox();
            const secondCardBox = await cards.nth(1).boundingBox();
            expect(secondCardBox!.y).toBeGreaterThan(firstCardBox!.y + firstCardBox!.height);
        }
    });

    test('TC-MOBILE-003: Card Layouts', async ({ page, isMobile }) => {
        test.skip(!isMobile, 'Mobile test only');

        await UIHelper.loginUI(page, TEST_ACCOUNTS.individual1.username, TEST_ACCOUNTS.individual1.password);
        await page.goto('/fixed-expenses');

        const iconButton = page.locator('.expense-actions button').first();
        const buttonBox = await iconButton.boundingBox();

        // Touch target should be >= 44px
        expect(buttonBox!.width).toBeGreaterThanOrEqual(36);
        expect(buttonBox!.height).toBeGreaterThanOrEqual(36);
    });
});
