// Check if database schema exists in Supabase
// Run with: npx tsx scripts/check-schema-exists.ts

import * as dotenv from 'dotenv';
import path from 'path';
import { supabase } from '../src/supabase';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const REQUIRED_TABLES = [
  'users',
  'constraint_scores',
  'incomes',
  'fixed_expenses',
  'variable_expense_plans',
  'variable_expense_actuals',
  'investments',
  'future_bombs',
  'credit_cards',
  'loans',
  'activities',
  'user_preferences',
  'theme_states',
  'shared_accounts',
  'shared_members',
  'sharing_requests',
  'payments'
];

async function checkSchema() {
  console.log('🔍 Checking Database Schema...\n');

  const missingTables: string[] = [];
  const existingTables: string[] = [];

  for (const tableName of REQUIRED_TABLES) {
    try {
      // Try to query the table (will fail if it doesn't exist)
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      if (error) {
        if (error.message?.includes('does not exist') || 
            error.code === '42P01' ||
            error.message?.includes('relation')) {
          missingTables.push(tableName);
          console.log(`❌ ${tableName} - NOT FOUND`);
        } else if (error.message?.includes('schema cache')) {
          console.log(`⚠️  ${tableName} - Schema cache error (Supabase initializing)`);
          console.log('   Wait 2-3 minutes and try again');
          return;
        } else {
          // Table exists but query failed for another reason
          existingTables.push(tableName);
          console.log(`✅ ${tableName} - EXISTS (query error: ${error.message})`);
        }
      } else {
        existingTables.push(tableName);
        console.log(`✅ ${tableName} - EXISTS`);
      }
    } catch (error: any) {
      if (error.message?.includes('schema cache')) {
        console.log(`⚠️  ${tableName} - Schema cache error`);
        console.log('   Supabase is still initializing. Wait 2-3 minutes.');
        return;
      }
      missingTables.push(tableName);
      console.log(`❌ ${tableName} - ERROR: ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 SCHEMA CHECK SUMMARY');
  console.log('='.repeat(60));
  console.log(`\n✅ Existing tables: ${existingTables.length}/${REQUIRED_TABLES.length}`);
  console.log(`❌ Missing tables: ${missingTables.length}/${REQUIRED_TABLES.length}\n`);

  if (missingTables.length === 0) {
    console.log('✅ All tables exist! Schema is complete.\n');
    console.log('💡 Next steps:');
    console.log('   1. Run: npm run verify-config');
    console.log('   2. Run: npm run create-test-user');
    console.log('   3. Run: npm run test-existing-user');
  } else {
    console.log('❌ Missing tables:\n');
    missingTables.forEach(table => console.log(`   - ${table}`));
    console.log('\n💡 FIX: Create schema in Supabase SQL Editor:');
    console.log('   1. Go to Supabase Dashboard → SQL Editor');
    console.log('   2. Open backend/supabase/schema.sql');
    console.log('   3. Copy ALL SQL content');
    console.log('   4. Paste into SQL Editor');
    console.log('   5. Click "Run"');
    console.log('   6. Wait for "Success" message');
    console.log('   7. Run this script again to verify\n');
  }
}

checkSchema().catch(console.error);


