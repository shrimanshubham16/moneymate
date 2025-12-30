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
    // Test basic API connectivity first
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': supabaseServiceRoleKey!,
        'Authorization': `Bearer ${supabaseServiceRoleKey}`
      }
    });
    
    if (!response.ok && response.status !== 404) {
      console.error(`❌ API connection failed: ${response.status} ${response.statusText}`);
      return false;
    }
    
    // Try querying a table (will fail if schema doesn't exist, but that's OK)
    const { data, error } = await supabase.from('users').select('id').limit(1);
    
    if (error) {
      // Check if it's a "relation does not exist" error (schema not created yet)
      if (error.message.includes('does not exist') || 
          error.message.includes('relation') ||
          error.message.includes('schema') ||
          error.code === '42P01') {
        console.log('✅ Connection successful!');
        console.log('⚠️  Schema not created yet - this is expected.');
        console.log('   Next step: Create schema in Supabase SQL Editor (see SCHEMA-SETUP.md)');
        return true; // Connection is valid, just schema missing
      }
      console.error('❌ Query failed:', error.message);
      return false;
    }
    
    console.log('✅ Supabase connection successful!');
    console.log('✅ Schema exists and is accessible!');
    return true;
  } catch (error: any) {
    // Network errors are different from schema errors
    if (error.message.includes('fetch') || error.message.includes('network')) {
      console.error('❌ Network error. Check your internet connection and Supabase URL.');
      return false;
    }
    console.error('❌ Connection error:', error.message);
    return false;
  }
}

