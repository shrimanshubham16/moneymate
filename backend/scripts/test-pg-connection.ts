// Test direct PostgreSQL connection
// Run with: npx tsx scripts/test-pg-connection.ts

import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

import * as db from '../src/pg-db';

async function testConnection() {
  console.log('🔍 Testing Direct PostgreSQL Connection...\n');

  try {
    // Test basic connection
    console.log('1️⃣  Testing connection...');
    const connected = await db.testConnection();
    if (!connected) {
      console.log('❌ Connection failed');
      process.exit(1);
    }
    console.log('✅ Connection successful!\n');

    // Test fetching users
    console.log('2️⃣  Fetching users...');
    const user = await db.getUserByUsername('shubham');
    if (user) {
      console.log(`✅ Found user: ${user.username} (ID: ${user.id})`);
    } else {
      console.log('⚠️  User "shubham" not found, trying to list users...');
      // Try to get any user
      const testUser = await db.getUserByUsername('testuser');
      if (testUser) {
        console.log(`✅ Found user: ${testUser.username}`);
      }
    }
    console.log('');

    // Test fetching incomes for a user
    if (user) {
      console.log('3️⃣  Fetching incomes...');
      const incomes = await db.getIncomesByUserId(user.id);
      console.log(`✅ Found ${incomes.length} income(s)`);
      if (incomes.length > 0) {
        console.log(`   First income: ${incomes[0].name} - ₹${incomes[0].amount}`);
      }
      console.log('');

      // Test fetching fixed expenses
      console.log('4️⃣  Fetching fixed expenses...');
      const expenses = await db.getFixedExpensesByUserId(user.id);
      console.log(`✅ Found ${expenses.length} fixed expense(s)`);
      console.log('');

      // Test fetching preferences
      console.log('5️⃣  Fetching preferences...');
      const prefs = await db.getUserPreferences(user.id);
      console.log(`✅ Preferences: Month starts on day ${prefs.monthStartDay}`);
      console.log('');

      // Test fetching constraint score
      console.log('6️⃣  Fetching constraint score...');
      const constraint = await db.getConstraintScore(user.id);
      console.log(`✅ Constraint score: ${constraint.score}/100 (${constraint.tier})`);
      console.log('');
    }

    console.log('='.repeat(60));
    console.log('✅ All tests passed! Direct PostgreSQL connection works!');
    console.log('='.repeat(60));
    console.log('\n💡 Next steps:');
    console.log('   1. Update server.ts to use pg-db.ts instead of supabase-db.ts');
    console.log('   2. Restart server');
    console.log('   3. Test the app');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
      console.log('\n💡 DNS resolution failed. Check your connection string hostname.');
    } else if (error.message.includes('authentication')) {
      console.log('\n💡 Authentication failed. Check your password in connection string.');
    } else if (error.message.includes('SSL') || error.message.includes('certificate')) {
      console.log('\n💡 SSL error. The script should handle this, but check connection string.');
    }
    process.exit(1);
  } finally {
    await db.closePool();
  }
}

testConnection();



