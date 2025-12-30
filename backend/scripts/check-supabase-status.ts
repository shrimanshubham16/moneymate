// Check Supabase project status and connection
// Run with: npx tsx scripts/check-supabase-status.ts

import * as dotenv from 'dotenv';
import path from 'path';
import { supabase } from '../src/supabase';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function checkSupabaseStatus() {
  console.log('🔍 Checking Supabase Status...\n');

  const supabaseUrl = process.env.SUPABASE_URL;
  if (!supabaseUrl) {
    console.log('❌ SUPABASE_URL not found in .env');
    return;
  }

  console.log(`📍 Project URL: ${supabaseUrl}\n`);

  // 1. Test basic API connectivity
  console.log('1️⃣  Testing API Connectivity...');
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      }
    });
    
    if (response.status === 503) {
      console.log('⚠️  503 Service Unavailable');
      console.log('   This usually means:');
      console.log('   - Project is paused (check Supabase Dashboard)');
      console.log('   - Project is still initializing');
      console.log('   - Temporary Supabase outage');
      console.log('\n💡 Action: Go to https://supabase.com/dashboard and check project status');
    } else if (response.ok || response.status === 404) {
      console.log('✅ API is reachable');
    } else {
      console.log(`⚠️  Status: ${response.status} ${response.statusText}`);
    }
  } catch (error: any) {
    console.log(`❌ Network error: ${error.message}`);
    console.log('   Check your internet connection');
  }

  console.log('');

  // 2. Test database connection
  console.log('2️⃣  Testing Database Connection...');
  let attempts = 0;
  const maxAttempts = 5;
  
  while (attempts < maxAttempts) {
    attempts++;
    try {
      const { data, error } = await supabase
        .from('users')
        .select('count')
        .limit(1);
      
      if (error) {
        if (error.message?.includes('schema cache')) {
          console.log(`⚠️  Attempt ${attempts}/${maxAttempts}: Schema cache still building...`);
          if (attempts < maxAttempts) {
            console.log(`   Waiting 3 seconds before retry...\n`);
            await new Promise(resolve => setTimeout(resolve, 3000));
            continue;
          } else {
            console.log('\n❌ Schema cache error persists after all retries');
            console.log('\n💡 This means:');
            console.log('   1. Supabase project might be paused');
            console.log('   2. Project is still initializing (can take 2-5 minutes)');
            console.log('   3. Schema might not be created yet');
            console.log('\n📋 Next Steps:');
            console.log('   1. Go to https://supabase.com/dashboard');
            console.log('   2. Check if project is "Active" (not "Paused")');
            console.log('   3. If paused, click "Resume" and wait 2-3 minutes');
            console.log('   4. Go to Table Editor → check if "users" table exists');
            console.log('   5. If table doesn\'t exist, run schema.sql in SQL Editor');
            return;
          }
        } else if (error.message?.includes('does not exist') || error.code === '42P01') {
          console.log('⚠️  Schema not created yet');
          console.log('   Next step: Run schema.sql in Supabase SQL Editor');
          return;
        } else {
          console.log(`❌ Database error: ${error.message}`);
          return;
        }
      }
      
      console.log('✅ Database connection successful!');
      console.log('✅ Schema is ready!');
      return;
      
    } catch (error: any) {
      console.log(`❌ Error: ${error.message}`);
      return;
    }
  }
}

checkSupabaseStatus();

