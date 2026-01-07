/**
 * API Test Setup
 * Configuration and utilities for API testing
 */

// Test configuration
export const TEST_CONFIG = {
  // Supabase Edge Function URL
  API_URL: process.env.TEST_API_URL || 'https://eklennfapovprkebdsml.supabase.co/functions/v1/api',
  
  // Supabase anon key for auth
  ANON_KEY: process.env.TEST_ANON_KEY || '',
  
  // Test user credentials (create a dedicated test user)
  TEST_USER: {
    username: `testuser_${Date.now()}`,
    password: 'TestPassword123!',
    email: `test_${Date.now()}@example.com`
  }
};

// HTTP helper for making API requests
export async function apiRequest(
  path: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'GET',
  body?: any,
  token?: string
): Promise<{ status: number; data: any }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': TEST_CONFIG.ANON_KEY,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${TEST_CONFIG.API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  
  const data = await response.json().catch(() => ({}));
  
  return {
    status: response.status,
    data
  };
}

// Test result tracking
export interface TestResult {
  id: string;
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

export class TestRunner {
  private results: TestResult[] = [];
  private token: string | null = null;
  private testUserId: string | null = null;
  
  setToken(token: string) {
    this.token = token;
  }
  
  setUserId(userId: string) {
    this.testUserId = userId;
  }
  
  getToken(): string | null {
    return this.token;
  }
  
  async run(id: string, name: string, testFn: () => Promise<void>): Promise<TestResult> {
    const start = Date.now();
    let passed = false;
    let error: string | undefined;
    
    try {
      await testFn();
      passed = true;
      console.log(`✅ ${id}: ${name}`);
    } catch (e: any) {
      error = e.message;
      console.log(`❌ ${id}: ${name}`);
      console.log(`   Error: ${error}`);
    }
    
    const result: TestResult = {
      id,
      name,
      passed,
      error,
      duration: Date.now() - start
    };
    
    this.results.push(result);
    return result;
  }
  
  getResults(): TestResult[] {
    return this.results;
  }
  
  printSummary(): void {
    const total = this.results.length;
    const passed = this.results.filter(r => r.passed).length;
    const failed = total - passed;
    
    console.log('\n' + '='.repeat(60));
    console.log('TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total:  ${total}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ❌`);
    console.log(`Pass Rate: ${((passed / total) * 100).toFixed(1)}%`);
    
    if (failed > 0) {
      console.log('\nFailed Tests:');
      this.results.filter(r => !r.passed).forEach(r => {
        console.log(`  - ${r.id}: ${r.name}`);
        console.log(`    ${r.error}`);
      });
    }
    
    console.log('='.repeat(60) + '\n');
  }
}

// Assertion helpers
export function assertEqual<T>(actual: T, expected: T, message?: string): void {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

export function assertTrue(condition: boolean, message?: string): void {
  if (!condition) {
    throw new Error(message || 'Expected condition to be true');
  }
}

export function assertFalse(condition: boolean, message?: string): void {
  if (condition) {
    throw new Error(message || 'Expected condition to be false');
  }
}

export function assertExists<T>(value: T | null | undefined, message?: string): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(message || 'Expected value to exist');
  }
}

export function assertStatusOk(status: number, message?: string): void {
  if (status < 200 || status >= 300) {
    throw new Error(message || `Expected success status, got ${status}`);
  }
}

export function assertStatus(actual: number, expected: number, message?: string): void {
  if (actual !== expected) {
    throw new Error(message || `Expected status ${expected}, got ${actual}`);
  }
}

