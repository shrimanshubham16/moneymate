/**
 * Helper utilities for executing console commands in browser
 * Works with both Playwright and can be adapted for Selenium
 */

import { Page } from '@playwright/test';

/**
 * Execute a console command in the browser and return the result
 */
export async function executeConsoleCommand(
  page: Page,
  command: string
): Promise<any> {
  return await page.evaluate((cmd) => {
    // Execute command in browser context
    return eval(cmd);
  }, command);
}

/**
 * Execute console.log and capture the output
 */
export async function consoleLog(
  page: Page,
  message: string
): Promise<void> {
  await page.evaluate((msg) => {
    console.log(msg);
  }, message);
}

/**
 * Get all console messages of a specific type
 */
export async function getConsoleMessages(
  page: Page,
  type?: 'log' | 'error' | 'warning' | 'info'
): Promise<string[]> {
  const messages: string[] = [];
  
  page.on('console', (msg) => {
    if (!type || msg.type() === type) {
      messages.push(msg.text());
    }
  });
  
  return messages;
}

/**
 * Execute a JavaScript function in browser context
 */
export async function executeFunction<T>(
  page: Page,
  fn: () => T
): Promise<T> {
  return await page.evaluate(fn);
}

/**
 * Execute async JavaScript function
 */
export async function executeAsyncFunction<T>(
  page: Page,
  fn: (callback: (result: T) => void) => void
): Promise<T> {
  return await page.evaluate((fnStr) => {
    return new Promise((resolve) => {
      const fn = new Function('callback', fnStr);
      fn(resolve);
    });
  }, fn.toString());
}

/**
 * Execute localStorage commands - supports string, boolean, number, and object values
 */
export async function setLocalStorage(
  page: Page,
  key: string,
  value: string | boolean | number | object
): Promise<void> {
  await page.evaluate(
    ({ k, v }) => {
      // Stringify non-string values
      const stringValue = typeof v === 'string' ? v : JSON.stringify(v);
      localStorage.setItem(k, stringValue);
    },
    { k: key, v: value }
  );
}

/**
 * Set feature flag in localStorage
 * Example: setFeatureFlag(page, 'feat-storage-dashboard', true)
 */
export async function setFeatureFlag(
  page: Page,
  featureName: string,
  enabled: boolean = true
): Promise<void> {
  const key = `preview#${featureName}`;
  await setLocalStorage(page, key, enabled);
}

export async function getLocalStorage(
  page: Page,
  key: string
): Promise<string | null> {
  return await page.evaluate((k) => {
    return localStorage.getItem(k);
  }, key);
}

/**
 * Example: Execute sessionStorage commands
 */
export async function setSessionStorage(
  page: Page,
  key: string,
  value: string
): Promise<void> {
  await page.evaluate(
    ({ k, v }) => {
      sessionStorage.setItem(k, v);
    },
    { k: key, v: value }
  );
}

/**
 * Example: Execute window object commands
 */
export async function getWindowProperty(
  page: Page,
  property: string
): Promise<any> {
  return await page.evaluate((prop) => {
    return (window as any)[prop];
  }, property);
}
