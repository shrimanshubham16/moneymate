// Test with existing migrated user (avoids signup issues)
// Run with: npx tsx scripts/test-with-existing-user.ts

import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const BASE_URL = process.env.VITE_API_URL || 'http://localhost:12022';

// Use an existing user from migrated data
// You can find usernames in Supabase dashboard → users table
const TEST_USERNAME = 'shubham'; // Change this to an existing username
const TEST_PASSWORD = 'YourPassword123!'; // Change this to the actual password

async function testWithExistingUser() {
  console.log('🧪 Testing with Existing User\n');
  console.log(`📍 Testing against: ${BASE_URL}\n`);
  console.log(`👤 Using username: ${TEST_USERNAME}\n`);

  try {
    // 1. Test Login
    console.log('1️⃣  Testing Login...');
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: TEST_USERNAME,
        password: TEST_PASSWORD
      })
    });

    if (!loginRes.ok) {
      const error = await loginRes.json();
      console.log(`❌ Login failed: ${loginRes.status} - ${JSON.stringify(error)}`);
      console.log('\n💡 Tip: Make sure the username and password are correct.');
      console.log('   You can check existing users in Supabase Dashboard → users table');
      return;
    }

    const loginData = await loginRes.json();
    const token = loginData.access_token;
    console.log(`✅ Login successful! Token: ${token.substring(0, 20)}...\n`);

    // 2. Test Dashboard
    console.log('2️⃣  Testing Dashboard...');
    const dashRes = await fetch(`${BASE_URL}/dashboard`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!dashRes.ok) {
      const error = await dashRes.json();
      console.log(`❌ Dashboard failed: ${dashRes.status} - ${JSON.stringify(error)}`);
      return;
    }

    const dashData = await dashRes.json();
    console.log(`✅ Dashboard loaded!`);
    console.log(`   - Incomes: ${dashData.data?.incomes?.length || 0}`);
    console.log(`   - Fixed Expenses: ${dashData.data?.fixedExpenses?.length || 0}`);
    console.log(`   - Variable Plans: ${dashData.data?.variablePlans?.length || 0}`);
    console.log(`   - Investments: ${dashData.data?.investments?.length || 0}`);
    console.log(`   - Health: ${dashData.data?.health?.category} (₹${dashData.data?.health?.remaining})`);
    console.log(`   - Constraint Score: ${dashData.data?.constraintScore?.score}/100 (${dashData.data?.constraintScore?.tier})\n`);

    // 3. Test Health Details
    console.log('3️⃣  Testing Health Details...');
    const healthRes = await fetch(`${BASE_URL}/health/details`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (healthRes.ok) {
      const healthData = await healthRes.json();
      console.log(`✅ Health details loaded!`);
      console.log(`   - Total Income: ₹${healthData.data?.breakdown?.totalIncome}`);
      console.log(`   - Available Funds: ₹${healthData.data?.breakdown?.availableFunds}`);
      console.log(`   - Total Obligations: ₹${healthData.data?.breakdown?.totalObligations}\n`);
    } else {
      console.log(`❌ Health details failed: ${healthRes.status}\n`);
    }

    // 4. Test Preferences
    console.log('4️⃣  Testing Preferences...');
    const prefsRes = await fetch(`${BASE_URL}/preferences`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (prefsRes.ok) {
      const prefsData = await prefsRes.json();
      console.log(`✅ Preferences loaded!`);
      console.log(`   - Month Start Day: ${prefsData.data?.monthStartDay}`);
      console.log(`   - Currency: ${prefsData.data?.currency}`);
      console.log(`   - Timezone: ${prefsData.data?.timezone}\n`);
    } else {
      console.log(`❌ Preferences failed: ${prefsRes.status}\n`);
    }

    // 5. Test Create Income (to verify writes work)
    console.log('5️⃣  Testing Create Income...');
    const createRes = await fetch(`${BASE_URL}/planning/income`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        source: `Test Income ${Date.now()}`,
        amount: 1000,
        frequency: 'monthly'
      })
    });

    if (createRes.ok) {
      const createData = await createRes.json();
      console.log(`✅ Income created! ID: ${createData.data?.id}\n`);
      
      // Verify it appears in list
      const listRes = await fetch(`${BASE_URL}/planning/income`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (listRes.ok) {
        const listData = await listRes.json();
        const found = listData.data?.find((i: any) => i.id === createData.data.id);
        console.log(found ? '✅ Created income found in list!' : '⚠️  Created income not found in list');
      }
    } else {
      const error = await createRes.json();
      console.log(`❌ Create income failed: ${createRes.status} - ${JSON.stringify(error)}\n`);
    }

    console.log('='.repeat(60));
    console.log('✅ All tests completed!');
    console.log('='.repeat(60));

  } catch (error: any) {
    console.error('💥 Test crashed:', error.message);
    process.exit(1);
  }
}

// Run test
testWithExistingUser();

