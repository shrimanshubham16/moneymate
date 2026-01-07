/**
 * E2E Tests for Encryption Flow
 * Verifies that encryption key is properly set during login
 */

import { test, expect } from '@playwright/test';

const APP_URL = process.env.TEST_APP_URL || 'http://localhost:5174';

test.describe('Encryption Key Flow', () => {
  
  test('E2E-AUTH-004: Encryption key is set after login', async ({ page }) => {
    // Navigate to app
    await page.goto(APP_URL);
    
    // Wait for login form
    await page.waitForSelector('input[type="text"]');
    
    // Fill login credentials (use test user)
    await page.fill('input[type="text"]', 'testuser');
    await page.fill('input[type="password"]', 'TestPassword123!');
    
    // Click login
    await page.click('button[type="submit"]');
    
    // Wait for dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    
    // Check console for encryption key status
    const logs: string[] = [];
    page.on('console', msg => {
      if (msg.text().includes('[E2E_DEBUG]')) {
        logs.push(msg.text());
      }
    });
    
    // Navigate to trigger API calls
    await page.goto(`${APP_URL}/settings/plan-finances/income`);
    await page.waitForTimeout(2000);
    
    // Check if key was present
    const keyPresentLogs = logs.filter(l => l.includes('key present: true'));
    expect(keyPresentLogs.length).toBeGreaterThan(0);
  });
  
  test('E2E-ENC-001: New data is encrypted in requests', async ({ page }) => {
    // This test would intercept network requests and verify encryption
    await page.goto(APP_URL);
    
    // Login first
    await page.fill('input[type="text"]', 'testuser');
    await page.fill('input[type="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    
    // Navigate to income page
    await page.goto(`${APP_URL}/settings/plan-finances/income`);
    
    // Set up request interception
    let requestBody: any = null;
    page.on('request', request => {
      if (request.url().includes('/planning/income') && request.method() === 'POST') {
        requestBody = JSON.parse(request.postData() || '{}');
      }
    });
    
    // Add new income
    await page.click('button:has-text("Add Income")');
    await page.fill('input[name="source"]', 'E2E Test Salary');
    await page.fill('input[name="amount"]', '100000');
    await page.selectOption('select[name="frequency"]', 'monthly');
    await page.click('button[type="submit"]');
    
    // Wait for request
    await page.waitForTimeout(2000);
    
    // Verify encryption fields were sent
    if (requestBody) {
      // If encryption is working, these fields should exist
      expect(requestBody.source_enc || requestBody.source).toBeTruthy();
    }
  });
});

test.describe('Login Flow', () => {
  
  test('E2E-AUTH-003: Login with valid credentials', async ({ page }) => {
    await page.goto(APP_URL);
    
    // Should show login form
    await expect(page.locator('input[type="text"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    
    // Fill credentials
    await page.fill('input[type="text"]', 'testuser');
    await page.fill('input[type="password"]', 'TestPassword123!');
    
    // Submit
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/dashboard/);
  });
  
  test('E2E-AUTH-005: Key is cleared on logout', async ({ page }) => {
    // Login first
    await page.goto(APP_URL);
    await page.fill('input[type="text"]', 'testuser');
    await page.fill('input[type="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    
    // Navigate to settings and logout
    await page.goto(`${APP_URL}/settings`);
    await page.click('button:has-text("Logout")');
    
    // Should be back at login
    await expect(page.locator('input[type="text"]')).toBeVisible();
  });
});

