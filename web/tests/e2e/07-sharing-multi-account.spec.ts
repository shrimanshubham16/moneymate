import { test, expect } from '@playwright/test';
import { TEST_ACCOUNTS, UIHelper } from '../fixtures';

test.describe('Section 8: Sharing & Multi-Account (5 Accounts)', () => {

    test('TC-SHARE-001: Send Sharing Request', async ({ page }) => {
        await UIHelper.loginUI(page, TEST_ACCOUNTS.familyOwner.username, TEST_ACCOUNTS.familyOwner.password);
        await page.goto('/settings/sharing');

        await page.getByRole('button', { name: /Bring Aboard/i }).click();
        await page.getByPlaceholder('their_username').fill(TEST_ACCOUNTS.familySpouse.username);
        await page.getByRole('button', { name: 'Share' }).click();

        await expect(page.getByText('Pending Requests')).toBeVisible();
        await expect(page.getByText(TEST_ACCOUNTS.familySpouse.username)).toBeVisible();
    });

    test('TC-SHARE-002: Accept Request', async ({ page, context }) => {
        // Login as spouse
        await UIHelper.loginUI(page, TEST_ACCOUNTS.familySpouse.username, TEST_ACCOUNTS.familySpouse.password);
        await page.goto('/settings/sharing');

        await expect(page.getByText('Incoming')).toBeVisible();
        await page.getByRole('button', { name: 'Accept' }).click();

        await expect(page.getByText('Members')).toBeVisible();
        await expect(page.getByText(TEST_ACCOUNTS.familyOwner.username)).toBeVisible();
    });

    test('TC-MULTI-001: Individual Account Isolation', async ({ page }) => {
        // Login as individual 1
        await UIHelper.loginUI(page, TEST_ACCOUNTS.individual1.username, TEST_ACCOUNTS.individual1.password);
        await page.goto('/dashboard');

        const user1Data = await page.locator('.dashboard-widget').allTextContents();

        // Logout and login as individual 2
        await UIHelper.logoutUI(page);
        await UIHelper.loginUI(page, TEST_ACCOUNTS.individual2.username, TEST_ACCOUNTS.individual2.password);
        await page.goto('/dashboard');

        const user2Data = await page.locator('.dashboard-widget').allTextContents();

        // Verify data is different (isolation)
        expect(user1Data).not.toEqual(user2Data);
    });

    test('TC-MULTI-002: 3-Way Sharing Setup', async ({ browser }) => {
        // Create 3 contexts for 3 users
        const ownerContext = await browser.newContext();
        const spouseContext = await browser.newContext();
        const parentContext = await browser.newContext();

        const ownerPage = await ownerContext.newPage();
        const spousePage = await spouseContext.newPage();
        const parentPage = await parentContext.newPage();

        // Owner sends requests    await UIHelper.loginUI(ownerPage, TEST_ACCOUNTS.familyOwner.username, TEST_ACCOUNTS.familyOwner.password);
        await ownerPage.goto('/settings/sharing');

        // Send to spouse
        await ownerPage.getByRole('button', { name: /Bring Aboard/i }).click();
        await ownerPage.getByPlaceholder('their_username').fill(TEST_ACCOUNTS.familySpouse.username);
        await ownerPage.getByRole('button', { name: 'Share' }).click();

        // Send to parent
        await ownerPage.getByRole('button', { name: /Bring Aboard/i }).click();
        await ownerPage.getByPlaceholder('their_username').fill(TEST_ACCOUNTS.familyParent.username);
        await ownerPage.getByRole('button', { name: 'Share' }).click();

        // Spouse accepts
        await UIHelper.loginUI(spousePage, TEST_ACCOUNTS.familySpouse.username, TEST_ACCOUNTS.familySpouse.password);
        await spousePage.goto('/settings/sharing');
        await spousePage.getByRole('button', { name: 'Accept' }).first().click();

        // Parent accepts
        await UIHelper.loginUI(parentPage, TEST_ACCOUNTS.familyParent.username, TEST_ACCOUNTS.familyParent.password);
        await parentPage.goto('/settings/sharing');
        await parentPage.getByRole('button', { name: 'Accept' }).first().click();

        // Verify all 3 see merged data
        await ownerPage.goto('/dashboard');
        const ownerHealth = await ownerPage.locator('.health-amount').textContent();

        await spousePage.goto('/dashboard');
        const spouseHealth = await spousePage.locator('.health-amount').textContent();

        await parentPage.goto('/dashboard');
        const parentHealth = await parentPage.locator('.health-amount').textContent();

        expect(ownerHealth).toBe(spouseHealth);
        expect(spouseHealth).toBe(parentHealth);

        await ownerContext.close();
        await spouseContext.close();
        await parentContext.close();
    });

    test('TC-MULTI-003: Shared Finance Editing (All Members)', async ({ page }) => {
        await UIHelper.loginUI(page, TEST_ACCOUNTS.familySpouse.username, TEST_ACCOUNTS.familySpouse.password);
        await page.goto('/settings/plan-finances/fixed');

        await page.getByRole('button', { name: /Add Fixed Expense/i }).click();
        await page.getByLabel('Name').fill('Kids School');
        await page.getByLabel('Amount').fill('15000');
        await page.getByRole('button', { name: 'Add' }).click();

        // Verify owner sees it
        await UIHelper.logoutUI(page);
        await UIHelper.loginUI(page, TEST_ACCOUNTS.familyOwner.username, TEST_ACCOUNTS.familyOwner.password);
        await page.goto('/fixed-expenses');

        await expect(page.getByText('Kids School')).toBeVisible();
    });
});
