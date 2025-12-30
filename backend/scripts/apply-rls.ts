// Script to apply RLS policies to Supabase
import * as pg from 'pg';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import * as dns from 'dns';

dotenv.config();
dns.setDefaultResultOrder('ipv4first');

async function applyRLS() {
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
    
    // Read the RLS SQL
    const sqlPath = path.join(__dirname, '../../supabase/migrations/006_enable_rls.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');
    
    console.log('📝 Applying RLS policies...');
    
    // Split by statements and execute each
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    let successCount = 0;
    let skipCount = 0;
    
    for (const statement of statements) {
      try {
        await pool.query(statement);
        successCount++;
        // Extract policy/table name for logging
        const match = statement.match(/(ENABLE ROW LEVEL|CREATE POLICY|ALTER TABLE)\s+[\w"]+/i);
        if (match) {
          console.log(`  ✓ ${match[0]}`);
        }
      } catch (error: any) {
        if (error.code === '42710') {
          // Policy already exists
          skipCount++;
          console.log(`  ⏭ Skipped (already exists)`);
        } else {
          console.error(`  ❌ Error: ${error.message}`);
        }
      }
    }
    
    console.log(`\n✅ RLS setup complete!`);
    console.log(`   Applied: ${successCount}`);
    console.log(`   Skipped: ${skipCount}`);
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

applyRLS();

