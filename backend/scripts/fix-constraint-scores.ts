// Fix constraint scores: Add user_id and migrate per-user
import * as pg from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

async function fixConstraintScores() {
  console.log('🔧 Fixing constraint scores to be per-user...\n');
  
  const connectionString = process.env.SUPABASE_CONNECTION_STRING;
  
  if (!connectionString) {
    console.error('❌ SUPABASE_CONNECTION_STRING not found in .env file');
    process.exit(1);
  }
  
  // Temporarily disable SSL verification
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  
  const client = new Client({
    connectionString: connectionString
  });
  
  try {
    await client.connect();
    console.log('✅ Connected to Supabase!\n');
    
    // Step 1: Add user_id column if it doesn't exist
    console.log('📊 Step 1: Updating constraint_scores table schema...');
    try {
      await client.query(`
        ALTER TABLE constraint_scores 
        ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
      `);
      console.log('✅ Added user_id column');
    } catch (error: any) {
      console.log('⚠️  user_id column might already exist:', error.message);
    }
    
    // Step 2: Add unique constraint
    try {
      await client.query(`
        ALTER TABLE constraint_scores 
        ADD CONSTRAINT constraint_scores_user_id_unique UNIQUE (user_id);
      `);
      console.log('✅ Added unique constraint on user_id');
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        console.log('✅ Unique constraint already exists');
      } else {
        console.log('⚠️  Could not add unique constraint:', error.message);
      }
    }
    
    // Step 3: Create index
    try {
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_constraint_scores_user_id ON constraint_scores(user_id);
      `);
      console.log('✅ Created index on user_id');
    } catch (error: any) {
      console.log('⚠️  Index might already exist:', error.message);
    }
    
    // Step 4: Delete the old global constraint score
    console.log('\n📊 Step 2: Removing old global constraint score...');
    await client.query(`
      DELETE FROM constraint_scores WHERE user_id IS NULL;
    `);
    console.log('✅ Removed old global constraint score');
    
    // Step 5: Create constraint scores for all users (default: 0, green - BEST score)
    console.log('\n📊 Step 3: Creating per-user constraint scores...');
    const usersResult = await client.query('SELECT id FROM users');
    const users = usersResult.rows;
    
    console.log(`   Found ${users.length} users`);
    console.log('   Note: Constraint score 0 = Best (no overspending)');
    console.log('         Score increases with overspending (0-100 scale)');
    
    let created = 0;
    for (const user of users) {
      try {
        await client.query(`
          INSERT INTO constraint_scores (user_id, score, tier, recent_overspends, decay_applied_at, updated_at)
          VALUES ($1, $2, $3, $4, NOW(), NOW())
          ON CONFLICT (user_id) DO NOTHING
        `, [
          user.id,
          0, // Default score (0 = best, increases with overspending)
          'green', // Default tier (0-39 = green)
          0 // Default recent overspends
        ]);
        created++;
      } catch (error: any) {
        console.log(`   ⚠️  Could not create constraint for user ${user.id}: ${error.message}`);
      }
    }
    
    console.log(`✅ Created constraint scores for ${created} users`);
    
    // Step 6: Verify
    console.log('\n📊 Step 4: Verifying constraint scores...');
    const verifyResult = await client.query(`
      SELECT COUNT(*) as count, 
             COUNT(DISTINCT user_id) as unique_users
      FROM constraint_scores
    `);
    
    const { count, unique_users } = verifyResult.rows[0];
    console.log(`✅ Total constraint scores: ${count}`);
    console.log(`✅ Unique users with constraints: ${unique_users}`);
    
    if (parseInt(count) === parseInt(unique_users) && parseInt(unique_users) === users.length) {
      console.log('\n🎉 All users now have constraint scores!');
    } else {
      console.log('\n⚠️  Some users might be missing constraint scores');
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    if (process.env.NODE_TLS_REJECT_UNAUTHORIZED) {
      delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    }
    console.log('\n🔌 Disconnected from database');
  }
}

fixConstraintScores().catch(console.error);

