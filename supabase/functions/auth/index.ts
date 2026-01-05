// Supabase Edge Function: Authentication
// Handles signup, login, and password management
// Compatible with existing users table (custom JWT auth)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as bcrypt from 'https://deno.land/x/bcrypt@v0.4.1/mod.ts';
import { create, verify } from 'https://deno.land/x/djwt@v2.8/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// JWT secret - must match what frontend expects
const JWT_SECRET = Deno.env.get('JWT_SECRET') || 'your-super-secret-jwt-key-change-in-production';

// Create JWT key
async function getJwtKey() {
  const encoder = new TextEncoder();
  return await crypto.subtle.importKey(
    'raw',
    encoder.encode(JWT_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.split('/').pop(); // 'signup', 'login', etc.

  // Create admin client for database access
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    // ========================================================================
    // SIGNUP
    // ========================================================================
    if (path === 'signup' && req.method === 'POST') {
      const { username, password, encryptionSalt, recoveryKeyHash } = await req.json();

      // Validate input
      if (!username || !password) {
        return new Response(
          JSON.stringify({ error: { message: 'Username and password required' } }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (username.length < 3 || username.length > 20) {
        return new Response(
          JSON.stringify({ error: { message: 'Username must be 3-20 characters' } }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (password.length < 8) {
        return new Response(
          JSON.stringify({ error: { message: 'Password must be at least 8 characters' } }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if username exists
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .single();

      if (existing) {
        return new Response(
          JSON.stringify({ error: { message: 'Username already taken' } }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password);

      // Create user
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          username,
          password_hash: passwordHash,
          encryption_salt: encryptionSalt || null,
          recovery_key_hash: recoveryKeyHash || null,
          created_at: new Date().toISOString()
        })
        .select('id, username')
        .single();

      if (insertError) {
        console.error('Insert error:', insertError);
        return new Response(
          JSON.stringify({ error: { message: 'Failed to create user' } }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create default preferences
      await supabase
        .from('user_preferences')
        .insert({
          user_id: newUser.id,
          month_start_day: 1,
          currency: 'INR'
        });

      // Create default constraint score
      await supabase
        .from('constraint_scores')
        .insert({
          user_id: newUser.id,
          score: 0,
          tier: 'green'
        });

      // Generate JWT
      const key = await getJwtKey();
      const token = await create(
        { alg: 'HS256', typ: 'JWT' },
        { userId: newUser.id, username: newUser.username, iat: Math.floor(Date.now() / 1000) },
        key
      );

      return new Response(
        JSON.stringify({
          access_token: token,
          user: { id: newUser.id, username: newUser.username },
          encryption_salt: encryptionSalt || null
        }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========================================================================
    // LOGIN
    // ========================================================================
    if (path === 'login' && req.method === 'POST') {
      const { username, password } = await req.json();

      if (!username || !password) {
        return new Response(
          JSON.stringify({ error: { message: 'Username and password required' } }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get user
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, username, password_hash, encryption_salt, failed_login_attempts, account_locked_until')
        .eq('username', username)
        .single();

      if (userError || !user) {
        return new Response(
          JSON.stringify({ error: { message: 'Invalid credentials' } }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if account is locked
      if (user.account_locked_until) {
        const lockedUntil = new Date(user.account_locked_until);
        if (lockedUntil > new Date()) {
          const remainingMs = lockedUntil.getTime() - Date.now();
          return new Response(
            JSON.stringify({ 
              error: { 
                message: 'Account locked due to too many failed attempts',
                lockoutTime: Math.ceil(remainingMs / 1000)
              } 
            }),
            { status: 423, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Verify password
      const passwordValid = await bcrypt.compare(password, user.password_hash);
      if (!passwordValid) {
        // Record failed attempt
        const attempts = (user.failed_login_attempts || 0) + 1;
        const lockUntil = attempts >= 5 
          ? new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 min lockout
          : null;

        await supabase
          .from('users')
          .update({ 
            failed_login_attempts: attempts,
            account_locked_until: lockUntil
          })
          .eq('id', user.id);

        return new Response(
          JSON.stringify({ 
            error: { 
              message: 'Invalid credentials',
              remainingAttempts: Math.max(0, 5 - attempts)
            } 
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Clear failed attempts on successful login
      await supabase
        .from('users')
        .update({ 
          failed_login_attempts: 0,
          account_locked_until: null
        })
        .eq('id', user.id);

      // Generate JWT
      const key = await getJwtKey();
      const token = await create(
        { alg: 'HS256', typ: 'JWT' },
        { userId: user.id, username: user.username, iat: Math.floor(Date.now() / 1000) },
        key
      );

      return new Response(
        JSON.stringify({
          access_token: token,
          user: { id: user.id, username: user.username },
          encryption_salt: user.encryption_salt || null
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========================================================================
    // GET SALT (for key derivation)
    // ========================================================================
    if (path?.startsWith('salt/') && req.method === 'GET') {
      const username = path.replace('salt/', '');
      
      const { data: user } = await supabase
        .from('users')
        .select('encryption_salt')
        .eq('username', username)
        .single();

      return new Response(
        JSON.stringify({ encryption_salt: user?.encryption_salt || null }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Unknown endpoint
    return new Response(
      JSON.stringify({ error: { message: 'Not found' } }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Auth error:', error);
    return new Response(
      JSON.stringify({ error: { message: 'Internal server error' } }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});



