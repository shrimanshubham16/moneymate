import { test, expect } from '@playwright/test';
import { TEST_ACCOUNTS, APIHelper } from '../fixtures';

test.describe('Section 1: Authentication & User Management', () => {

    test('TC-AUTH-001: User Signup', async ({ page }) => {
        const timestamp = Date.now();
        const username = `qa_test_${timestamp}`;
        const password = 'Test@123456';

        await page.goto('/');

        // Click Sign Up tab
        await page.getByRole('tab', { name: 'Sign Up' }).click();

        // Fill form
        await page.getByPlaceholder('your_unique_username').fill(username);
        await page.getByPlaceholder('••••••••').fill(password);

        // Submit
        await page.getByRole('button', { name: 'Sign Up' }).click();

        // Verify redirect to dashboard
        await expect(page).toHaveURL('/dashboard');

        // Verify token stored
        const token = await page.evaluate(() => localStorage.getItem('token'));
        expect(token).toBeTruthy();
    });

    test('TC-AUTH-002: User Login', async ({ page }) => {
        const { username, password } = TEST_ACCOUNTS.individual1;

        await page.goto('/');

        // Enter credentials
        await page.getByPlaceholder('your_unique_username').fill(username);
        await page.getByPlaceholder('••••••••').fill(password);

        // Click Login
        await page.getByRole('button', { name: 'Login' }).click();

        // Verify redirect
        await expect(page).toHaveURL('/dashboard');

        // Verify username displayed (if header shows it)
        // await expect(page.getByText(username)).toBeVisible();
    });

    test('TC-AUTH-003: Password Reset', async ({ page }) => {
        const { username, password } = TEST_ACCOUNTS.individual1;
        const newPassword = 'NewPass@123';

        // Login
        await page.goto('/');
        await page.getByPlaceholder('your_unique_username').fill(username);
        await page.getByPlaceholder('••••••••').fill(password);
        await page.getByRole('button', { name: 'Login' }).click();
        await page.waitForURL('/dashboard');

        // Navigate to Account Settings
        await page.goto('/settings/account');

        // Fill password reset form
        await page.getByLabel('Current Password').fill(password);
        await page.getByLabel('New Password').fill(newPassword);
        await page.getByLabel('Confirm New Password').fill(newPassword);

        // Submit
        await page.getByRole('button', { name: 'Change Password' }).click();

        // Verify auto-logout (should redirect to login)
        await expect(page).toHaveURL('/');

        // Try login with new password
        await page.getByPlaceholder('your_unique_username').fill(username);
        await page.getByPlaceholder('••••••••').fill(newPassword);
        await page.getByRole('button', { name: 'Login' }).click();
        await expect(page).toHaveURL('/dashboard');

        // Reset password back
        await page.goto('/settings/account');
        await page.getByLabel('Current Password').fill(newPassword);
        await page.getByLabel('New Password').fill(password);
        await page.getByLabel('Confirm New Password').fill(password);
        await page.getByRole('button', { name: 'Change Password' }).click();
    });

    test('[API] TC-AUTH-001: Signup via API', async () => {
        const username = `qa_api_${Date.now()}`;
        const result = await APIHelper.signup(username, 'Test@123456');

        expect(result).toHaveProperty('access_token');
        expect(result.access_token).toBeTruthy();
    });

    test('[API] TC-AUTH-002: Login via API', async () => {
        const { username, password } = TEST_ACCOUNTS.individual1;
        const result = await APIHelper.login(username, password);

        expect(result).toHaveProperty('access_token');
        expect(result.access_token).toBeTruthy();
    });
});
