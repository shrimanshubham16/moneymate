// List all users in Supabase
// Run with: npx tsx scripts/list-users.ts

import * as dotenv from 'dotenv';
import path from 'path';
import { supabase } from '../src/supabase';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function listUsers() {
  console.log('👥 Listing all users in Supabase...\n');

  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, username, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      if (error.message?.includes('schema cache')) {
        console.log('⚠️  Supabase is still initializing (schema cache error)');
        console.log('   Please wait 1-2 minutes and try again');
        console.log('   Or check Supabase Dashboard directly');
        return;
      }
      throw error;
    }

    if (!data || data.length === 0) {
      console.log('❌ No users found in Supabase');
      console.log('   This might mean:');
      console.log('   1. Data migration hasn\'t run yet');
      console.log('   2. Users table is empty');
      console.log('   3. Schema doesn\'t exist');
      return;
    }

    console.log(`✅ Found ${data.length} user(s):\n`);
    data.forEach((user, index) => {
      console.log(`${index + 1}. ${user.username}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Created: ${user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}`);
      console.log('');
    });

    console.log('💡 To check a user\'s password:');
    console.log('   npm run check-user <username>');
    console.log('\n💡 To create a test user:');
    console.log('   npm run create-test-user');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Alternative: Check Supabase Dashboard');
    console.log('   1. Go to https://supabase.com/dashboard');
    console.log('   2. Select your project');
    console.log('   3. Go to Table Editor → users');
    console.log('   4. View usernames there');
  }
}

listUsers();


