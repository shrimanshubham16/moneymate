/**
 * FinFlow API Test Suite
 * Plain JavaScript - no build step required
 * 
 * Usage:
 *   TEST_ANON_KEY="your-key" node api/run-tests.js
 */

const API_URL = process.env.TEST_API_URL || 'https://eklennfapovprkebdsml.supabase.co/functions/v1/api';
const ANON_KEY = process.env.TEST_ANON_KEY || '';

// Test state
let authToken = null;
let testUserId = null;
const results = [];

// Helpers
async function apiRequest(path, method = 'GET', body = null, token = null) {
  const headers = {
    'Content-Type': 'application/json',
    'apikey': ANON_KEY,
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => ({}));
  return { status: response.status, data };
}

async function runTest(id, name, testFn) {
  const start = Date.now();
  try {
    await testFn();
    console.log(`✅ ${id}: ${name}`);
    results.push({ id, name, passed: true, duration: Date.now() - start });
  } catch (e) {
    console.log(`❌ ${id}: ${name}`);
    console.log(`   Error: ${e.message}`);
    results.push({ id, name, passed: false, error: e.message, duration: Date.now() - start });
  }
}

function assertEqual(actual, expected, msg) {
  if (actual !== expected) throw new Error(msg || `Expected ${expected}, got ${actual}`);
}

function assertTrue(condition, msg) {
  if (!condition) throw new Error(msg || 'Expected true');
}

function assertExists(value, msg) {
  if (value === null || value === undefined) throw new Error(msg || 'Expected value to exist');
}

// ============ AUTH TESTS ============
async function runAuthTests() {
  console.log('\n📋 AUTHENTICATION TESTS\n');
  
  const testUser = {
    username: `tst${Date.now().toString().slice(-6)}`,  // 9 chars total
    password: 'TestPassword123!',
    email: `test${Date.now().toString().slice(-6)}@example.com`
  };

  // AUTH-001: Signup
  await runTest('AUTH-001', 'Create new user with valid data', async () => {
    const { status, data } = await apiRequest('/auth/signup', 'POST', {
      username: testUser.username,
      password: testUser.password,
      email: testUser.email,
      encryptionSalt: 'dGVzdHNhbHQxMjM0NTY3ODkwYWJjZGVmZ2hpamtsbW4=',
      recoveryKeyHash: 'dGVzdHJlY292ZXJ5aGFzaA=='
    });
    assertTrue(status >= 200 && status < 300, `Signup failed: ${status} - ${JSON.stringify(data)}`);
    assertExists(data.access_token, 'No access_token');
    authToken = data.access_token;
  });

  // AUTH-005: Encryption salt returned
  await runTest('AUTH-005', 'Return encryption_salt on signup', async () => {
    const { data } = await apiRequest('/auth/login', 'POST', {
      username: testUser.username,
      password: testUser.password
    });
    assertExists(data.encryption_salt, 'No encryption_salt on login');
    assertTrue(data.encryption_salt.length > 10, 'Salt too short');
  });

  // AUTH-006: Login
  await runTest('AUTH-006', 'Login with valid credentials', async () => {
    const { status, data } = await apiRequest('/auth/login', 'POST', {
      username: testUser.username,
      password: testUser.password
    });
    assertTrue(status >= 200 && status < 300, `Login failed: ${status}`);
    assertExists(data.access_token, 'No access_token on login');
    authToken = data.access_token;
  });

  // AUTH-007: Wrong password
  await runTest('AUTH-007', 'Reject invalid credentials', async () => {
    const { status } = await apiRequest('/auth/login', 'POST', {
      username: testUser.username,
      password: 'WrongPassword!'
    });
    assertEqual(status, 401, 'Should reject wrong password');
  });

  // AUTH-010: Get salt
  await runTest('AUTH-010', 'Return salt for existing user', async () => {
    const { status, data } = await apiRequest(`/auth/salt/${testUser.username}`, 'GET');
    assertTrue(status >= 200 && status < 300, `Salt lookup failed: ${status}`);
    assertExists(data.encryption_salt, 'No salt returned');
  });

  // AUTH-011: Get profile
  await runTest('AUTH-011', 'Return user profile with token', async () => {
    const { status, data } = await apiRequest('/auth/me', 'GET', null, authToken);
    assertTrue(status >= 200 && status < 300, `Profile failed: ${status} - ${JSON.stringify(data)}`);
    assertExists(data.data, 'No data in profile response');
  });
}

// ============ INCOME TESTS ============
async function runIncomeTests() {
  console.log('\n📋 INCOME TESTS\n');
  
  if (!authToken) {
    console.log('⚠️ Skipping income tests - no auth token');
    return;
  }

  let incomeId = null;

  // INC-001: Create income (plaintext)
  await runTest('INC-001', 'Create income with plaintext', async () => {
    const { status, data } = await apiRequest('/planning/income', 'POST', {
      source: 'Test Salary',
      amount: 50000,
      frequency: 'monthly'
    }, authToken);
    assertTrue(status >= 200 && status < 300, `Create failed: ${status} - ${JSON.stringify(data)}`);
    assertExists(data.data?.id, 'No ID returned');
    incomeId = data.data.id;
  });

  // INC-002: Create income (encrypted)
  await runTest('INC-002', 'Create income with encrypted fields', async () => {
    const { status, data } = await apiRequest('/planning/income', 'POST', {
      source: 'Encrypted Bonus',
      source_enc: 'ZW5jcnlwdGVkX3NvdXJjZQ==',
      source_iv: 'aXZfZm9yX3NvdXJjZQ==',
      amount: 10000,
      amount_enc: 'ZW5jcnlwdGVkX2Ftb3VudA==',
      amount_iv: 'aXZfZm9yX2Ftb3VudA==',
      frequency: 'yearly'
    }, authToken);
    assertTrue(status >= 200 && status < 300, `Create encrypted failed: ${status} - ${JSON.stringify(data)}`);
  });

  // INC-003: Create with only encrypted (no plaintext)
  await runTest('INC-003', 'Store [encrypted] when no plaintext', async () => {
    const { status, data } = await apiRequest('/planning/income', 'POST', {
      source_enc: 'ZW5jcnlwdGVkX29ubHk=',
      source_iv: 'aXZfb25seQ==',
      amount_enc: 'YW1vdW50X2VuYw==',
      amount_iv: 'YW1vdW50X2l2',
      frequency: 'monthly'
    }, authToken);
    assertTrue(status >= 200 && status < 300, `Create encrypted-only failed: ${status} - ${JSON.stringify(data)}`);
    assertEqual(data.data?.name, '[encrypted]', 'Should store [encrypted] placeholder');
  });

  // INC-004: Update income
  await runTest('INC-004', 'Update income', async () => {
    if (!incomeId) throw new Error('No income to update');
    const { status, data } = await apiRequest(`/planning/income/${incomeId}`, 'PUT', {
      source: 'Updated Salary',
      amount: 60000
    }, authToken);
    assertTrue(status >= 200 && status < 300, `Update failed: ${status} - ${JSON.stringify(data)}`);
  });

  // INC-005: Delete income
  await runTest('INC-005', 'Delete income', async () => {
    if (!incomeId) throw new Error('No income to delete');
    const { status } = await apiRequest(`/planning/income/${incomeId}`, 'DELETE', null, authToken);
    assertTrue(status >= 200 && status < 300, `Delete failed: ${status}`);
  });

  // INC-006: Dashboard includes incomes
  await runTest('INC-006', 'Dashboard returns incomes', async () => {
    const { status, data } = await apiRequest('/dashboard', 'GET', null, authToken);
    assertTrue(status >= 200 && status < 300, `Dashboard failed: ${status}`);
    assertTrue(Array.isArray(data.data?.incomes), 'incomes should be array');
  });
}

// ============ DASHBOARD & HEALTH TESTS ============
async function runDashboardTests() {
  console.log('\n📋 DASHBOARD & HEALTH TESTS\n');
  
  if (!authToken) {
    console.log('⚠️ Skipping dashboard tests - no auth token');
    return;
  }

  // DASH-001: Dashboard loads
  await runTest('DASH-001', 'Dashboard returns all data', async () => {
    const { status, data } = await apiRequest('/dashboard', 'GET', null, authToken);
    assertTrue(status >= 200 && status < 300, `Dashboard failed: ${status}`);
    assertExists(data.data, 'No data in dashboard');
    assertExists(data.data.incomes, 'No incomes');
    assertExists(data.data.fixedExpenses, 'No fixedExpenses');
    assertExists(data.data.variablePlans, 'No variablePlans');
  });

  // DASH-002: Health score included
  await runTest('DASH-002', 'Dashboard includes health score', async () => {
    const { status, data } = await apiRequest('/dashboard', 'GET', null, authToken);
    assertTrue(status >= 200 && status < 300, `Dashboard failed: ${status}`);
    assertExists(data.data?.health, 'No health in dashboard');
    assertExists(data.data.health.remaining, 'No remaining in health');
    assertExists(data.data.health.category, 'No category in health');
  });

  // DASH-003: Health details
  await runTest('DASH-003', 'Health details endpoint works', async () => {
    const { status, data } = await apiRequest('/health/details', 'GET', null, authToken);
    assertTrue(status >= 200 && status < 300, `Health details failed: ${status}`);
    assertExists(data.data?.health, 'No health data in response');
    assertExists(data.data.health.remaining !== undefined, 'No remaining in health');
    assertExists(data.data.health.category, 'No category in health');
  });
}

// ============ MAIN ============
async function main() {
  console.log('='.repeat(60));
  console.log('FINFLOW API TEST SUITE');
  console.log('='.repeat(60));
  console.log(`API URL: ${API_URL}`);
  console.log(`Anon Key: ${ANON_KEY ? '✓ Set' : '✗ Missing'}`);
  console.log('='.repeat(60));

  if (!ANON_KEY) {
    console.error('\n❌ TEST_ANON_KEY is required');
    console.log('Usage: TEST_ANON_KEY="your-key" node api/run-tests.js');
    process.exit(1);
  }

  await runAuthTests();
  await runIncomeTests();
  await runDashboardTests();

  // Summary
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
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
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.id}: ${r.name}`);
      console.log(`    ${r.error}`);
    });
  }

  console.log('='.repeat(60) + '\n');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => {
  console.error('Test suite crashed:', e);
  process.exit(1);
});

