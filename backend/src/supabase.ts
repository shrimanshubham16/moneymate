// Supabase client configuration
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load .env if not already loaded (for direct imports)
if (!process.env.SUPABASE_URL) {
  dotenv.config();
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

// Create Supabase client with service role key (for backend operations)
// This bypasses Row Level Security, so use only in backend
export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// For testing connection
export async function testConnection() {
  try {
    // Try a simple query to test connection
    // If schema doesn't exist, this will fail but connection is still valid
    const { error } = await supabase.from('users').select('id').limit(1);
    
    if (error) {
      // Check if it's a "relation does not exist" error (schema not created yet)
      if (error.message.includes('does not exist') || error.message.includes('relation')) {
        console.log('⚠️  Connection works, but schema not created yet.');
        console.log('   Please create the schema first (see SCHEMA-SETUP.md)');
        return true; // Connection is valid, just schema missing
      }
      console.error('❌ Supabase connection failed:', error.message);
      return false;
    }
    console.log('✅ Supabase connection successful!');
    console.log('✅ Schema exists and is accessible!');
    return true;
  } catch (error: any) {
    console.error('❌ Supabase connection error:', error.message);
    return false;
  }
}

