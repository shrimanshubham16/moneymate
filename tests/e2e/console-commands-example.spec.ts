/**
 * Example: How to pass console commands to browser
 * Demonstrates various ways to execute JavaScript in browser context
 */

import { test, expect } from '@playwright/test';
import {
  executeConsoleCommand,
  consoleLog,
  getConsoleMessages,
  setLocalStorage,
  getLocalStorage,
  getWindowProperty,
} from './browser-console-helper';

const APP_URL = process.env.TEST_APP_URL || 'http://localhost:5174';

test.describe('Browser Console Commands', () => {
  
  test('Execute simple JavaScript command', async ({ page }) => {
    await page.goto(APP_URL);
    
    // Method 1: Direct evaluate
    const title = await page.evaluate(() => document.title);
    console.log('Page title:', title);
    
    // Method 2: Using helper function
    const url = await executeConsoleCommand(page, 'window.location.href');
    console.log('Page URL:', url);
  });

  test('Execute console.log and capture output', async ({ page }) => {
    await page.goto(APP_URL);
    
    const logs: string[] = [];
    page.on('console', (msg) => {
      logs.push(msg.text());
    });
    
    // Execute console.log in browser
    await consoleLog(page, 'Test message from Playwright');
    await page.evaluate(() => {
      console.log('Another message');
      console.error('Error message');
    });
    
    // Wait a bit for logs to be captured
    await page.waitForTimeout(100);
    
    expect(logs.length).toBeGreaterThan(0);
  });

  test('Execute localStorage commands', async ({ page }) => {
    await page.goto(APP_URL);
    
    // Set value
    await setLocalStorage(page, 'test-key', 'test-value');
    
    // Get value
    const value = await getLocalStorage(page, 'test-key');
    expect(value).toBe('test-value');
    
    // Or use direct evaluate
    const directValue = await page.evaluate(() => {
      return localStorage.getItem('test-key');
    });
    expect(directValue).toBe('test-value');
  });

  test('Execute window object commands', async ({ page }) => {
    await page.goto(APP_URL);
    
    // Get window property
    const userAgent = await getWindowProperty(page, 'navigator');
    expect(userAgent).toBeTruthy();
    
    // Execute custom window function
    const result = await page.evaluate(() => {
      // Access any window property or function
      return (window as any).location.origin;
    });
    expect(result).toContain('http');
  });

  test('Execute async JavaScript', async ({ page }) => {
    await page.goto(APP_URL);
    
    // Execute async function
    const result = await page.evaluate(async () => {
      // Simulate async operation
      await new Promise(resolve => setTimeout(resolve, 100));
      return 'Async result';
    });
    
    expect(result).toBe('Async result');
  });

  test('Execute function with arguments', async ({ page }) => {
    await page.goto(APP_URL);
    
    // Pass arguments to evaluate
    const result = await page.evaluate(
      ({ a, b }) => {
        return a + b;
      },
      { a: 5, b: 10 }
    );
    
    expect(result).toBe(15);
  });

  test('Execute complex JavaScript expression', async ({ page }) => {
    await page.goto(APP_URL);
    
    // Execute any JavaScript expression
    const result = await page.evaluate(() => {
      const obj = { name: 'Test', value: 42 };
      return JSON.stringify(obj);
    });
    
    expect(JSON.parse(result)).toEqual({ name: 'Test', value: 42 });
  });

  test('Capture console errors', async ({ page }) => {
    await page.goto(APP_URL);
    
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Trigger an error
    await page.evaluate(() => {
      console.error('Test error message');
    });
    
    await page.waitForTimeout(100);
    
    expect(errors.length).toBeGreaterThan(0);
  });
});
