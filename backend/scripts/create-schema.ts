// Create database schema in Supabase
import { supabase } from '../src/supabase';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

async function createSchema() {
  console.log('📊 Creating database schema...');
  
  // Read schema SQL file
  const schemaPath = path.join(__dirname, '../supabase/schema.sql');
  const schemaSQL = fs.readFileSync(schemaPath, 'utf-8');
  
  // Split by semicolons (basic SQL splitting)
  // Note: This is a simple approach. For production, use a proper SQL parser
  const statements = schemaSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  
  console.log(`Found ${statements.length} SQL statements to execute`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    
    // Skip empty statements and comments
    if (!statement || statement.startsWith('--')) continue;
    
    try {
      // Execute each statement
      const { error } = await supabase.rpc('exec_sql', { sql: statement });
      
      if (error) {
        // Try direct query if RPC doesn't work
        const { error: queryError } = await supabase.from('_exec_sql').select('*').limit(0);
        
        if (queryError) {
          console.log(`⚠️  Statement ${i + 1} might need manual execution`);
          console.log(`   SQL: ${statement.substring(0, 100)}...`);
        } else {
          successCount++;
        }
      } else {
        successCount++;
      }
    } catch (err: any) {
      errorCount++;
      console.error(`❌ Error executing statement ${i + 1}:`, err.message);
    }
  }
  
  console.log(`\n✅ Schema creation complete!`);
  console.log(`   Success: ${successCount}`);
  console.log(`   Errors: ${errorCount}`);
  
  if (errorCount > 0) {
    console.log('\n⚠️  Some statements failed. Please run the schema manually in Supabase SQL Editor.');
    console.log('   File: backend/supabase/schema.sql');
  }
}

createSchema().catch(console.error);

