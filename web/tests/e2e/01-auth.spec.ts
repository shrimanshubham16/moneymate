import { test, expect } from '@playwright/test';
import { TEST_ACCOUNTS, APIHelper } from '../fixtures';

test.describe('Section 1: Authentication & User Management', () => {

    test('TC-AUTH-001: User Signup', async ({ page }) => {
        const timestamp = Date.now();
        const username = `qa_test_${timestamp}`;
        const password = 'Test@123456';

        await page.goto('/');

        // Switch to Sign Up mode (button text: "Don't have an account? Sign Up")
        const signupButton = page.getByRole('button', { name: /Don't have an account\? Sign Up/i });
        if (await signupButton.isVisible()) {
            await signupButton.click();
        }

        // Fill form
        await page.getByPlaceholder('your_unique_username').fill(username);
        await page.getByPlaceholder('••••••••').fill(password);

        // Wait for password validation to pass
        await page.waitForTimeout(500);

        // Submit
        await page.getByRole('button', { name: 'Sign Up' }).click();

        // Verify redirect to dashboard
        await expect(page).toHaveURL('/dashboard', { timeout: 10000 });

        // Verify token stored
        const token = await page.evaluate(() => localStorage.getItem('token'));
        expect(token).toBeTruthy();
    });

    test('TC-AUTH-002: User Login', async ({ page }) => {
        const { username, password } = TEST_ACCOUNTS.individual1;

        await page.goto('/');

        // Switch to Login mode if needed
        const loginButton = page.getByRole('button', { name: /Already have an account\? Login/i });
        if (await loginButton.isVisible()) {
            await loginButton.click();
            await page.waitForTimeout(300);
        }

        // Enter credentials
        await page.getByPlaceholder('your_unique_username').fill(username);
        await page.getByPlaceholder('••••••••').fill(password);

        // Click Login
        await page.getByRole('button', { name: 'Login' }).click();

        // Verify redirect
        await expect(page).toHaveURL('/dashboard', { timeout: 10000 });

        // Verify username displayed (if header shows it)
        // await expect(page.getByText(username)).toBeVisible();
    });

    test('TC-AUTH-003: Password Reset', async ({ page }) => {
        const { username, password } = TEST_ACCOUNTS.individual1;
        const newPassword = 'NewPass@123';

        // Login
        await page.goto('/');
        const loginButton = page.getByRole('button', { name: /Already have an account\? Login/i });
        if (await loginButton.isVisible()) {
            await loginButton.click();
            await page.waitForTimeout(300);
        }
        await page.getByPlaceholder('your_unique_username').fill(username);
        await page.getByPlaceholder('••••••••').fill(password);
        await page.getByRole('button', { name: 'Login' }).click();
        await page.waitForURL('/dashboard', { timeout: 10000 });

        // Navigate to Account Settings
        await page.goto('/settings/account');

        // Click "Change Password" button to show form
        await page.getByRole('button', { name: 'Change Password' }).click();
        await page.waitForTimeout(500);

        // Fill password reset form
        await page.getByLabel(/Current Password/i).fill(password);
        await page.getByLabel(/New Password/i).first().fill(newPassword);
        await page.getByLabel(/Confirm New Password/i).fill(newPassword);

        // Submit
        await page.getByRole('button', { name: 'Update Password' }).click();

        // Wait for success message and auto-logout
        await page.waitForTimeout(2500);

        // Verify auto-logout (should redirect to login)
        await expect(page).toHaveURL('/', { timeout: 5000 });

        // Try login with new password
        const loginButton2 = page.getByRole('button', { name: /Already have an account\? Login/i });
        if (await loginButton2.isVisible()) {
            await loginButton2.click();
            await page.waitForTimeout(300);
        }
        await page.getByPlaceholder('your_unique_username').fill(username);
        await page.getByPlaceholder('••••••••').fill(newPassword);
        await page.getByRole('button', { name: 'Login' }).click();
        await expect(page).toHaveURL('/dashboard', { timeout: 10000 });

        // Reset password back
        await page.goto('/settings/account');
        await page.getByRole('button', { name: 'Change Password' }).click();
        await page.waitForTimeout(500);
        await page.getByLabel(/Current Password/i).fill(newPassword);
        await page.getByLabel(/New Password/i).first().fill(password);
        await page.getByLabel(/Confirm New Password/i).fill(password);
        await page.getByRole('button', { name: 'Update Password' }).click();
        await page.waitForTimeout(2500);
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
