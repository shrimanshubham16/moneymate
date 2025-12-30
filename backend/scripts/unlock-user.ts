// Unlock a user account that's been locked due to failed login attempts
// Run with: npx tsx scripts/unlock-user.ts <username>

import * as dotenv from 'dotenv';
import path from 'path';
import * as db from '../src/supabase-db';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const BASE_URL = process.env.VITE_API_URL || 'http://localhost:12022';

async function unlockUser(username: string) {
  console.log(`🔓 Unlocking user: ${username}\n`);

  try {
    // Get user first
    const user = await db.getUserByUsername(username);
    
    if (!user) {
      console.log(`❌ User "${username}" not found`);
      console.log('\n💡 Available options:');
      console.log('   npm run list-users  # See all users');
      return;
    }

    console.log(`✅ User found: ${user.id}\n`);

    // Unlock the account by clearing lockout and resetting failed attempts
    await db.updateUser(user.id, {
      accountLockedUntil: null,
      failedLoginAttempts: 0
    });

    console.log('✅ Database lockout cleared\n');

    // Also clear in-memory lockout via API (if server is running)
    try {
      const response = await fetch(`${BASE_URL}/auth/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ In-memory lockout cleared: ${data.message}`);
      } else {
        console.log('⚠️  Could not clear in-memory lockout (server might not be running)');
        console.log('   If lockout persists, restart the server');
      }
    } catch (error: any) {
      console.log('⚠️  Could not reach server to clear in-memory lockout');
      console.log('   If lockout persists, restart the server');
    }

    console.log('\n✅ Account unlocked successfully!');
    console.log('   - Database lockout cleared');
    console.log('   - Failed login attempts reset to 0');
    console.log('\n💡 You can now try logging in again');

  } catch (error: any) {
    if (error.message?.includes('schema cache')) {
      console.log('⚠️  Supabase is still initializing');
      console.log('   Wait 1-2 minutes and try again');
      console.log('   Or check: npm run check-supabase');
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

// Get username from command line
const username = process.argv[2];

if (!username) {
  console.log('Usage: npx tsx scripts/unlock-user.ts <username>');
  console.log('\nExample:');
  console.log('  npm run unlock-user shubham');
  process.exit(1);
}

unlockUser(username);

