// Test script for Supabase migration
// Run with: npx ts-node scripts/test-supabase-endpoints.ts

import * as dotenv from 'dotenv';
import path from 'path';
import * as db from '../src/supabase-db';
import { testConnection } from '../src/supabase';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const BASE_URL = process.env.VITE_API_URL || 'http://localhost:12022';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  data?: any;
}

async function testEndpoint(method: string, path: string, token?: string, body?: any): Promise<TestResult> {
  try {
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      ...(body ? { body: JSON.stringify(body) } : {})
    };

    const response = await fetch(`${BASE_URL}${path}`, options);
    const data = await response.json();

    if (!response.ok) {
      return {
        name: `${method} ${path}`,
        passed: false,
        error: `Status ${response.status}: ${JSON.stringify(data)}`
      };
    }

    return {
      name: `${method} ${path}`,
      passed: true,
      data
    };
  } catch (error: any) {
    return {
      name: `${method} ${path}`,
      passed: false,
      error: error.message
    };
  }
}

async function runTests() {
  console.log('🧪 Starting Supabase Migration Tests\n');
  console.log(`📍 Testing against: ${BASE_URL}\n`);

  const results: TestResult[] = [];

  // Test 1: Supabase Connection
  console.log('1️⃣  Testing Supabase Connection...');
  const connectionOk = await testConnection();
  results.push({
    name: 'Supabase Connection',
    passed: connectionOk,
    error: connectionOk ? undefined : 'Connection failed'
  });
  console.log(connectionOk ? '✅ Connected' : '❌ Failed\n');

  // Test 2: Health Check (No Auth)
  console.log('2️⃣  Testing Health Endpoint (No Auth)...');
  const healthResult = await testEndpoint('GET', '/health');
  results.push(healthResult);
  console.log(healthResult.passed ? '✅ Passed' : `❌ Failed: ${healthResult.error}\n`);

  // Test 3: Signup
  console.log('3️⃣  Testing User Signup...');
  const testUsername = `test_${Date.now()}`;
  const testPassword = 'Test123!@#';
  const encryptionSalt = 'c2FsdGxvYWR0ZXN0'; // base64(salt) for test
  const recoveryKeyHash = 'cmVjaGFzaGxvYWR0ZXN0'; // base64(fake hash) for test
  const signupResult = await testEndpoint('POST', '/auth/signup', undefined, {
    username: testUsername,
    password: testPassword,
    encryptionSalt,
    recoveryKeyHash
  });
  results.push(signupResult);
  const token = signupResult.passed && signupResult.data?.access_token ? signupResult.data.access_token : null;
  console.log(signupResult.passed ? `✅ Passed (Token: ${token?.substring(0, 20)}...)` : `❌ Failed: ${signupResult.error}\n`);

  if (!token) {
    console.log('⚠️  Cannot continue tests without authentication token\n');
    printSummary(results);
    return;
  }

  // Test 4: Login
  console.log('4️⃣  Testing User Login...');
  const loginResult = await testEndpoint('POST', '/auth/login', undefined, {
    username: testUsername,
    password: testPassword
  });
  results.push(loginResult);
  console.log(loginResult.passed ? '✅ Passed' : `❌ Failed: ${loginResult.error}\n`);

  // Test 5: Get Dashboard
  console.log('5️⃣  Testing Dashboard Endpoint...');
  const dashboardResult = await testEndpoint('GET', '/dashboard', token);
  results.push(dashboardResult);
  if (dashboardResult.passed) {
    console.log(`✅ Passed (Incomes: ${dashboardResult.data?.data?.incomes?.length || 0}, Expenses: ${dashboardResult.data?.data?.fixedExpenses?.length || 0})`);
  } else {
    console.log(`❌ Failed: ${dashboardResult.error}`);
  }
  console.log();

  // Test 6: Create Income
  console.log('6️⃣  Testing Create Income...');
  const incomeResult = await testEndpoint('POST', '/planning/income', token, {
    source: 'Test Salary',
    amount: 50000,
    frequency: 'monthly'
  });
  results.push(incomeResult);
  const incomeId = incomeResult.passed && incomeResult.data?.data?.id ? incomeResult.data.data.id : null;
  console.log(incomeResult.passed ? `✅ Passed (ID: ${incomeId})` : `❌ Failed: ${incomeResult.error}\n`);

  // Test 7: Get Incomes
  console.log('7️⃣  Testing Get Incomes...');
  const getIncomesResult = await testEndpoint('GET', '/planning/income', token);
  results.push(getIncomesResult);
  if (getIncomesResult.passed) {
    const count = getIncomesResult.data?.data?.length || 0;
    console.log(`✅ Passed (Found ${count} incomes)`);
    if (incomeId) {
      const found = getIncomesResult.data?.data?.find((i: any) => i.id === incomeId);
      console.log(found ? '   ✅ Created income found in list' : '   ⚠️  Created income not found in list');
    }
  } else {
    console.log(`❌ Failed: ${getIncomesResult.error}`);
  }
  console.log();

  // Test 8: Create Fixed Expense
  console.log('8️⃣  Testing Create Fixed Expense...');
  const expenseResult = await testEndpoint('POST', '/planning/fixed-expenses', token, {
    name: 'Test Rent',
    amount: 15000,
    frequency: 'monthly',
    category: 'housing',
    is_sip_flag: false
  });
  results.push(expenseResult);
  const expenseId = expenseResult.passed && expenseResult.data?.data?.id ? expenseResult.data.data.id : null;
  console.log(expenseResult.passed ? `✅ Passed (ID: ${expenseId})` : `❌ Failed: ${expenseResult.error}\n`);

  // Test 9: Get Health Details
  console.log('9️⃣  Testing Health Details...');
  const healthDetailsResult = await testEndpoint('GET', '/health/details', token);
  results.push(healthDetailsResult);
  if (healthDetailsResult.passed) {
    const health = healthDetailsResult.data?.data?.health;
    console.log(`✅ Passed (Health: ${health?.category}, Remaining: ₹${health?.remaining})`);
  } else {
    console.log(`❌ Failed: ${healthDetailsResult.error}`);
  }
  console.log();

  // Test 10: Get Preferences
  console.log('🔟 Testing Get Preferences...');
  const prefsResult = await testEndpoint('GET', '/preferences', token);
  results.push(prefsResult);
  if (prefsResult.passed) {
    const prefs = prefsResult.data?.data;
    console.log(`✅ Passed (Month Start: ${prefs?.monthStartDay}, Currency: ${prefs?.currency})`);
  } else {
    console.log(`❌ Failed: ${prefsResult.error}`);
  }
  console.log();

  // Test 11: Update Preferences
  console.log('1️⃣1️⃣  Testing Update Preferences...');
  const updatePrefsResult = await testEndpoint('PATCH', '/preferences', token, {
    monthStartDay: 5
  });
  results.push(updatePrefsResult);
  console.log(updatePrefsResult.passed ? '✅ Passed' : `❌ Failed: ${updatePrefsResult.error}\n`);

  // Test 12: Get Activities
  console.log('1️⃣2️⃣  Testing Get Activities...');
  const activitiesResult = await testEndpoint('GET', '/activity', token);
  results.push(activitiesResult);
  if (activitiesResult.passed) {
    const count = activitiesResult.data?.data?.length || 0;
    console.log(`✅ Passed (Found ${count} activities)`);
  } else {
    console.log(`❌ Failed: ${activitiesResult.error}`);
  }
  console.log();

  // Test 13: Direct Database Query Test
  console.log('1️⃣3️⃣  Testing Direct Database Queries...');
  try {
    const userId = signupResult.data?.data?.user?.id;
    if (userId) {
      const dbIncomes = await db.getIncomesByUserId(userId);
      const dbExpenses = await db.getFixedExpensesByUserId(userId);
      const dbPrefs = await db.getUserPreferences(userId);
      console.log(`✅ Direct DB queries work (Incomes: ${dbIncomes.length}, Expenses: ${dbExpenses.length}, Prefs: ${dbPrefs.monthStartDay})`);
      results.push({
        name: 'Direct Database Queries',
        passed: true
      });
    } else {
      throw new Error('No user ID available');
    }
  } catch (error: any) {
    console.log(`❌ Failed: ${error.message}`);
    results.push({
      name: 'Direct Database Queries',
      passed: false,
      error: error.message
    });
  }
  console.log();

  // Print Summary
  printSummary(results);
}

function printSummary(results: TestResult[]) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  console.log(`\n✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${failed}/${total}`);
  console.log(`📈 Success Rate: ${((passed / total) * 100).toFixed(1)}%\n`);

  if (failed > 0) {
    console.log('❌ FAILED TESTS:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`   - ${r.name}`);
      if (r.error) console.log(`     Error: ${r.error}`);
    });
    console.log();
  }

  console.log('='.repeat(60));
}

// Run tests
runTests().catch(error => {
  console.error('💥 Test suite crashed:', error);
  process.exit(1);
});

