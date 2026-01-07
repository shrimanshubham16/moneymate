/**
 * API Test Runner
 * Executes all API tests and reports results
 * 
 * Usage:
 *   npx ts-node tests/api/run-tests.ts
 * 
 * Environment Variables:
 *   TEST_API_URL - API endpoint URL
 *   TEST_ANON_KEY - Supabase anon key
 */

import { TestRunner, TEST_CONFIG } from './setup.js';
import { runAuthTests } from './auth.test.js';
import { runIncomeTests } from './income.test.js';

async function main() {
  console.log('='.repeat(60));
  console.log('FINFLOW API TEST SUITE');
  console.log('='.repeat(60));
  console.log(`API URL: ${TEST_CONFIG.API_URL}`);
  console.log(`Anon Key: ${TEST_CONFIG.ANON_KEY ? '✓ Set' : '✗ Missing'}`);
  console.log('='.repeat(60) + '\n');
  
  if (!TEST_CONFIG.ANON_KEY) {
    console.error('❌ TEST_ANON_KEY environment variable is required');
    console.log('\nSet it with:');
    console.log('  export TEST_ANON_KEY="your-supabase-anon-key"');
    process.exit(1);
  }
  
  const runner = new TestRunner();
  
  try {
    // Run test suites in order
    console.log('\n📋 AUTHENTICATION TESTS\n');
    await runAuthTests(runner);
    
    console.log('\n📋 INCOME TESTS\n');
    await runIncomeTests(runner);
    
    // Add more test suites here as they're created
    // console.log('\n📋 FIXED EXPENSE TESTS\n');
    // await runFixedExpenseTests(runner);
    
  } catch (e: any) {
    console.error('\n❌ Test suite crashed:', e.message);
  }
  
  // Print summary
  runner.printSummary();
  
  // Exit with appropriate code
  const results = runner.getResults();
  const failed = results.filter(r => !r.passed).length;
  process.exit(failed > 0 ? 1 : 0);
}

main();

