/**
 * Quick example: Setting feature flag in localStorage
 */

import { test } from '@playwright/test';
import { setFeatureFlag } from './browser-console-helper';

const APP_URL = process.env.TEST_APP_URL || 'http://localhost:5174';

test('Set storage dashboard feature flag', async ({ page }) => {
  await page.goto(APP_URL);
  
  // Method 1: Using helper function
  await setFeatureFlag(page, 'feat-storage-dashboard', true);
  
  // Method 2: Direct evaluate
  await page.evaluate(() => {
    localStorage.setItem('preview#feat-storage-dashboard', 'true');
  });
  
  // Verify it was set
  const value = await page.evaluate(() => {
    return localStorage.getItem('preview#feat-storage-dashboard');
  });
  
  console.log('Feature flag value:', value);
});
