// Verify Supabase configuration
// Run with: npx tsx scripts/verify-supabase-config.ts

import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

function checkConfig() {
  console.log('🔍 Verifying Supabase Configuration...\n');

  const issues: string[] = [];
  const warnings: string[] = [];

  // 1. Check environment variables
  console.log('1️⃣  Checking Environment Variables...');
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const connectionString = process.env.SUPABASE_CONNECTION_STRING;

  if (!supabaseUrl) {
    issues.push('❌ SUPABASE_URL is missing from .env');
  } else {
    console.log(`   ✅ SUPABASE_URL: ${supabaseUrl.substring(0, 30)}...`);
    if (!supabaseUrl.startsWith('https://')) {
      issues.push('❌ SUPABASE_URL should start with https://');
    }
    if (!supabaseUrl.includes('supabase.co')) {
      warnings.push('⚠️  SUPABASE_URL does not look like a Supabase URL');
    }
  }

  if (!serviceRoleKey) {
    issues.push('❌ SUPABASE_SERVICE_ROLE_KEY is missing from .env');
  } else {
    console.log(`   ✅ SUPABASE_SERVICE_ROLE_KEY: ${serviceRoleKey.substring(0, 20)}...`);
    if (!serviceRoleKey.startsWith('eyJ')) {
      warnings.push('⚠️  Service role key should be a JWT token (starts with eyJ)');
    }
  }

  if (!connectionString) {
    warnings.push('⚠️  SUPABASE_CONNECTION_STRING is optional but recommended');
  } else {
    console.log(`   ✅ SUPABASE_CONNECTION_STRING: ${connectionString.substring(0, 30)}...`);
  }

  console.log('');

  // 2. Check .env file exists
  console.log('2️⃣  Checking .env File...');
  const envPath = path.resolve(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    console.log(`   ✅ .env file exists at: ${envPath}`);
  } else {
    issues.push(`❌ .env file not found at: ${envPath}`);
  }
  console.log('');

  // 3. Check expected project URL
  console.log('3️⃣  Verifying Project URL...');
  const expectedUrl = 'https://lvwpurwrktdblctzwctr.supabase.co';
  if (supabaseUrl && supabaseUrl !== expectedUrl) {
    warnings.push(`⚠️  SUPABASE_URL is ${supabaseUrl}, expected ${expectedUrl}`);
    console.log(`   ⚠️  URL mismatch: ${supabaseUrl} vs ${expectedUrl}`);
  } else if (supabaseUrl === expectedUrl) {
    console.log(`   ✅ Project URL matches expected: ${expectedUrl}`);
  }
  console.log('');

  // 4. Test API connectivity
  console.log('4️⃣  Testing API Connectivity...');
  if (supabaseUrl && serviceRoleKey) {
    fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`
      }
    })
      .then(response => {
        if (response.status === 503) {
          issues.push('❌ Supabase project is paused or unavailable (503)');
          console.log('   ❌ 503 Service Unavailable');
          console.log('   💡 Go to https://supabase.com/dashboard and resume your project');
        } else if (response.ok || response.status === 404) {
          console.log('   ✅ API is reachable');
        } else {
          warnings.push(`⚠️  API returned status ${response.status}`);
          console.log(`   ⚠️  Status: ${response.status}`);
        }
        printSummary(issues, warnings);
      })
      .catch(error => {
        issues.push(`❌ Network error: ${error.message}`);
        console.log(`   ❌ Network error: ${error.message}`);
        printSummary(issues, warnings);
      });
  } else {
    console.log('   ⏭️  Skipping (missing credentials)');
    printSummary(issues, warnings);
  }
}

function printSummary(issues: string[], warnings: string[]) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 CONFIGURATION SUMMARY');
  console.log('='.repeat(60));

  if (issues.length === 0 && warnings.length === 0) {
    console.log('\n✅ All checks passed! Configuration looks good.\n');
    console.log('💡 Next steps:');
    console.log('   1. Run: npm run check-supabase');
    console.log('   2. If still having issues, check Supabase dashboard');
    return;
  }

  if (issues.length > 0) {
    console.log('\n❌ CRITICAL ISSUES:');
    issues.forEach(issue => console.log(`   ${issue}`));
  }

  if (warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    warnings.forEach(warning => console.log(`   ${warning}`));
  }

  console.log('\n💡 FIXES:');
  console.log('   1. Go to https://supabase.com/dashboard');
  console.log('   2. Select your project');
  console.log('   3. Check if project is "Active" (not "Paused")');
  console.log('   4. If paused, click "Resume" and wait 2-3 minutes');
  console.log('   5. Go to Settings → API to get credentials');
  console.log('   6. Update backend/.env with correct values');
  console.log('   7. Run: npm run check-supabase\n');
}

checkConfig();

