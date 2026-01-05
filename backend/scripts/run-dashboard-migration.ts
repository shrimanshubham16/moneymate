// Script to create the get_dashboard_data PostgreSQL function
import * as pg from 'pg';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import * as dns from 'dns';

dotenv.config();
dns.setDefaultResultOrder('ipv4first');

async function runMigration() {
  const connectionString = process.env.SUPABASE_CONNECTION_STRING;
  
  if (!connectionString) {
    console.error('❌ SUPABASE_CONNECTION_STRING not found');
    process.exit(1);
  }

  const pool = new pg.Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔗 Connecting to database...');
    
    // Read the migration SQL
    const sqlPath = path.join(__dirname, '../../supabase/migrations/005_dashboard_function.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');
    
    console.log('📝 Running migration...');
    await pool.query(sql);
    
    console.log('✅ Dashboard function created successfully!');
    
    // Test the function
    console.log('\n🧪 Testing the function...');
    const testResult = await pool.query(
      `SELECT get_dashboard_data($1, $2) as data`,
      ['83632f9d-c03a-4d2c-910b-09411a9f0f7b', null]
    );
    
    if (testResult.rows[0]?.data) {
      const data = testResult.rows[0].data;
      console.log('✅ Function works! Data summary:');
      console.log(`   - Group User IDs: ${data.groupUserIds?.length || 0}`);
      console.log(`   - Incomes: ${data.incomes?.length || 0}`);
      console.log(`   - Fixed Expenses: ${data.fixedExpenses?.length || 0}`);
      console.log(`   - Variable Plans: ${data.variablePlans?.length || 0}`);
      console.log(`   - Investments: ${data.investments?.length || 0}`);
      console.log(`   - Future Bombs: ${data.futureBombs?.length || 0}`);
      console.log(`   - Preferences: ${data.preferences ? 'Yes' : 'No'}`);
      console.log(`   - Constraint Score: ${data.constraintScore ? 'Yes' : 'No'}`);
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.detail) console.error('   Detail:', error.detail);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();



