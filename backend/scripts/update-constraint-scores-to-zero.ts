// Update all constraint scores from 100 to 0 (correct default)
import * as pg from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

async function updateConstraintScores() {
  console.log('🔧 Updating constraint scores to correct default (0 = best)...\n');
  
  const connectionString = process.env.SUPABASE_CONNECTION_STRING;
  
  if (!connectionString) {
    console.error('❌ SUPABASE_CONNECTION_STRING not found in .env file');
    process.exit(1);
  }
  
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  
  const client = new Client({
    connectionString: connectionString
  });
  
  try {
    await client.connect();
    console.log('✅ Connected to Supabase!\n');
    
    // Update all constraint scores to 0 (best score)
    console.log('📊 Updating constraint scores...');
    const result = await client.query(`
      UPDATE constraint_scores 
      SET score = 0,
          tier = 'green',
          recent_overspends = 0,
          updated_at = NOW()
      WHERE score = 100 OR score > 0
    `);
    
    console.log(`✅ Updated ${result.rowCount} constraint scores to 0 (best score)`);
    
    // Verify
    const verifyResult = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN score = 0 THEN 1 END) as zero_scores,
        COUNT(CASE WHEN tier = 'green' THEN 1 END) as green_tiers
      FROM constraint_scores
    `);
    
    const { total, zero_scores, green_tiers } = verifyResult.rows[0];
    console.log(`\n✅ Verification:`);
    console.log(`   Total constraint scores: ${total}`);
    console.log(`   Scores at 0 (best): ${zero_scores}`);
    console.log(`   Green tier: ${green_tiers}`);
    
    if (parseInt(zero_scores) === parseInt(total)) {
      console.log('\n🎉 All constraint scores are now at 0 (best score)!');
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

updateConstraintScores().catch(console.error);



