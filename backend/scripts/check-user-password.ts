// Helper script to check user exists and verify password hash
// Run with: npx tsx scripts/check-user-password.ts

import * as dotenv from 'dotenv';
import path from 'path';
import * as db from '../src/supabase-db';
import crypto from 'crypto';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

async function checkUser(username: string, password?: string) {
  console.log(`🔍 Checking user: ${username}\n`);

  try {
    const user = await db.getUserByUsername(username);
    
    if (!user) {
      console.log(`❌ User "${username}" not found in Supabase`);
      console.log('\n💡 Available options:');
      console.log('   1. Check Supabase Dashboard → users table for existing usernames');
      console.log('   2. Create a new test user with: npm run create-test-user');
      return;
    }

    console.log(`✅ User found!`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Password Hash: ${user.passwordHash.substring(0, 20)}...\n`);

    if (password) {
      const providedHash = hashPassword(password);
      const matches = providedHash === user.passwordHash;
      
      console.log(`🔐 Password Check:`);
      console.log(`   Provided hash: ${providedHash.substring(0, 20)}...`);
      console.log(`   Stored hash:   ${user.passwordHash.substring(0, 20)}...`);
      console.log(`   Match: ${matches ? '✅ YES' : '❌ NO'}\n`);
      
      if (!matches) {
        console.log('💡 Password does not match.');
        console.log('   Options:');
        console.log('   1. Try a different password');
        console.log('   2. Create a new test user: npm run create-test-user');
        console.log('   3. Reset password in Supabase (requires manual SQL)');
      } else {
        console.log('✅ Password matches! You can use this for testing.');
      }
    } else {
      console.log('💡 To verify password, run:');
      console.log(`   npx tsx scripts/check-user-password.ts ${username} YOUR_PASSWORD`);
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

// Get username and password from command line
const username = process.argv[2];
const password = process.argv[3];

if (!username) {
  console.log('Usage: npx tsx scripts/check-user-password.ts <username> [password]');
  console.log('\nExample:');
  console.log('  npx tsx scripts/check-user-password.ts shubham');
  console.log('  npx tsx scripts/check-user-password.ts shubham MyPassword123!');
  process.exit(1);
}

checkUser(username, password);


