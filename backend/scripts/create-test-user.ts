// Create a test user with known credentials
// Run with: npx tsx scripts/create-test-user.ts

import * as dotenv from 'dotenv';
import path from 'path';
import * as db from '../src/supabase-db';
import crypto from 'crypto';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

async function createTestUser() {
  const username = 'testuser';
  const password = 'Test123!@#';
  
  console.log('🧪 Creating Test User\n');
  console.log(`Username: ${username}`);
  console.log(`Password: ${password}\n`);

  try {
    // Check if user already exists
    const existing = await db.getUserByUsername(username);
    if (existing) {
      console.log(`⚠️  User "${username}" already exists!`);
      console.log(`   ID: ${existing.id}`);
      console.log('\n💡 Options:');
      console.log('   1. Use this user with password: Test123!@#');
      console.log('   2. Delete and recreate (requires manual SQL in Supabase)');
      console.log('   3. Use a different username');
      return;
    }

    // Create new user
    const passwordHash = hashPassword(password);
    const user = await db.createUser({ username, passwordHash });
    
    console.log('✅ Test user created successfully!');
    console.log(`   ID: ${user.id}`);
    console.log(`   Username: ${user.username}`);
    console.log('\n📝 Credentials:');
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${password}`);
    console.log('\n🧪 You can now test with:');
    console.log(`   npm run test-existing-user`);
    console.log(`   (Update TEST_USERNAME to "${username}" and TEST_PASSWORD to "${password}")`);

  } catch (error: any) {
    if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
      console.log(`❌ User "${username}" already exists`);
      console.log('   Try a different username or check existing user');
    } else {
      console.error('❌ Error creating user:', error.message);
      console.error('   Full error:', error);
    }
  }
}

createTestUser();



