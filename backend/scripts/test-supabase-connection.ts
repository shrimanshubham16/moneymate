// Test Supabase connection
import * as dotenv from 'dotenv';

// Load .env BEFORE importing supabase
dotenv.config();

import { supabase, testConnection } from '../src/supabase';

async function main() {
  console.log('🔌 Testing Supabase connection...');
  console.log(`URL: ${process.env.SUPABASE_URL}`);
  console.log(`Service Role Key: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing'}`);
  
  const connected = await testConnection();
  
  if (connected) {
    console.log('\n✅ Connection successful! Ready to proceed with migration.');
  } else {
    console.log('\n❌ Connection failed. Please check your credentials.');
    process.exit(1);
  }
}

main().catch(console.error);

