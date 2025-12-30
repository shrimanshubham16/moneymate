// Combined API Edge Function - Replaces Railway Backend
// Handles all API operations with custom JWT auth

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// SHA256 hashing (matches Railway backend)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function verifyPassword(password: string, hash: string): Promise<boolean> {
  return hashPassword(password).then(h => h === hash);
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

// JWT handling
const JWT_SECRET = Deno.env.get('JWT_SECRET') || 'finflow-jwt-secret-2024';

function base64UrlDecode(str: string): string {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return atob(str);
}

function verifyToken(token: string): { userId: string; username: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(base64UrlDecode(parts[1]));
    // Basic expiry check if exp exists
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    return { userId: payload.userId, username: payload.username };
  } catch {
    return null;
  }
}

async function createToken(userId: string, username: string): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = { userId, username, iat: Math.floor(Date.now() / 1000) };
  
  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(JWT_SECRET),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(`${headerB64}.${payloadB64}`));
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  return `${headerB64}.${payloadB64}.${signatureB64}`;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace('/api', '').replace('/functions/v1/api', '');
  const method = req.method;

  // Create admin client (bypasses RLS)
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // Helper to return JSON
  const json = (data: any, status = 200) => new Response(
    JSON.stringify(data),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );

  const error = (message: string, status = 400) => json({ error: { message } }, status);

  try {
    // ========================================================================
    // AUTH ROUTES (no token required)
    // ========================================================================
    
    if (path === '/auth/signup' && method === 'POST') {
      const { username, password, encryptionSalt, recoveryKeyHash } = await req.json();
      
      if (!username || !password) return error('Username and password required');
      if (username.length < 3 || username.length > 20) return error('Username must be 3-20 characters');
      if (password.length < 8) return error('Password must be at least 8 characters');

      // Check existing
      const { data: existing } = await supabase
        .from('users').select('id').eq('username', username).single();
      if (existing) return error('Username already taken', 409);

      // Create user
      const passwordHash = await hashPassword(password);
      const { data: user, error: insertErr } = await supabase
        .from('users')
        .insert({ username, password_hash: passwordHash, encryption_salt: encryptionSalt, recovery_key_hash: recoveryKeyHash })
        .select('id, username').single();
      
      if (insertErr) return error('Failed to create user', 500);

      // Create defaults
      await supabase.from('user_preferences').insert({ user_id: user.id, month_start_day: 1, currency: 'INR' });
      await supabase.from('constraint_scores').insert({ user_id: user.id, score: 0, tier: 'green' });

      const token = await createToken(user.id, user.username);
      return json({ access_token: token, user: { id: user.id, username: user.username }, encryption_salt: encryptionSalt }, 201);
    }

    if (path === '/auth/login' && method === 'POST') {
      try {
        const { username, password } = await req.json();
        if (!username || !password) return error('Username and password required');

        const { data: user, error: userErr } = await supabase
          .from('users')
          .select('id, username, password_hash, encryption_salt, failed_login_attempts, account_locked_until')
          .eq('username', username).single();
        
        if (userErr) {
          console.error('User fetch error:', userErr);
          return error('Database error', 500);
        }
        
        if (!user) return error('Invalid credentials', 401);

        // Check lockout
        if (user.account_locked_until && new Date(user.account_locked_until) > new Date()) {
          return error('Account locked. Try again later.', 423);
        }

        // Verify password (SHA256)
        const valid = await verifyPassword(password, user.password_hash);
        
        if (!valid) {
          const attempts = (user.failed_login_attempts || 0) + 1;
          await supabase.from('users').update({
            failed_login_attempts: attempts,
            account_locked_until: attempts >= 5 ? new Date(Date.now() + 600000).toISOString() : null
          }).eq('id', user.id);
          return error('Invalid credentials', 401);
        }

        // Clear lockout
        await supabase.from('users').update({ failed_login_attempts: 0, account_locked_until: null }).eq('id', user.id);

        const token = await createToken(user.id, user.username);
        return json({ access_token: token, user: { id: user.id, username: user.username }, encryption_salt: user.encryption_salt });
      } catch (loginErr) {
        console.error('Login error:', loginErr);
        return error('Login failed: ' + (loginErr as Error).message, 500);
      }
    }

    if (path.startsWith('/auth/salt/') && method === 'GET') {
      const username = path.replace('/auth/salt/', '');
      const { data } = await supabase.from('users').select('encryption_salt').eq('username', username).single();
      return json({ encryption_salt: data?.encryption_salt || null });
    }

    // ========================================================================
    // PROTECTED ROUTES (token required)
    // ========================================================================
    
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    const user = token ? verifyToken(token) : null;
    
    if (!user) return error('Unauthorized', 401);
    const userId = user.userId;

    // HEALTH DETAILS - Full health calculation with breakdown
    if (path === '/health/details' && method === 'GET') {
      const { data: healthData } = await supabase.rpc('calculate_full_health', { p_user_id: userId });
      return json({ data: healthData });
    }

    // DASHBOARD
    if (path === '/dashboard' && method === 'GET') {
      const { data } = await supabase.rpc('get_dashboard_data', { p_user_id: userId, p_billing_period_id: null });
      
      // Get constraint score
      const { data: constraint } = await supabase.from('constraint_scores').select('*').eq('user_id', userId).single();
      
      // Get health from PostgreSQL function (matches /health/details exactly)
      const { data: healthData } = await supabase.rpc('calculate_full_health', { p_user_id: userId });
      
      // Format response
      const variablePlans = (data?.variablePlans || []).map((plan: any) => {
        const actuals = (data?.variableActuals || []).filter((a: any) => a.planId === plan.id);
        return { ...plan, actuals, actualTotal: actuals.reduce((s: number, a: any) => s + (a.amount || 0), 0) };
      });

      return json({
        data: {
          incomes: data?.incomes || [],
          fixedExpenses: (data?.fixedExpenses || []).map((e: any) => ({ ...e, is_sip_flag: e.isSipFlag })),
          variablePlans,
          investments: data?.investments || [],
          futureBombs: data?.futureBombs || [],
          health: healthData?.health || { remaining: 0, category: 'ok' },
          constraintScore: constraint || { score: 0, tier: 'green' },
          alerts: []
        }
      });
    }

    // INCOMES
    if (path === '/planning/income' && method === 'POST') {
      const body = await req.json();
      const { data, error: e } = await supabase.from('incomes')
        .insert({ user_id: userId, name: body.source, amount: body.amount, frequency: body.frequency, category: 'employment' })
        .select().single();
      if (e) return error(e.message, 500);
      return json({ data }, 201);
    }
    if (path.startsWith('/planning/income/') && method === 'PUT') {
      const id = path.split('/').pop();
      const body = await req.json();
      const updates: any = {};
      if (body.source) updates.name = body.source;
      if (body.amount) updates.amount = body.amount;
      if (body.frequency) updates.frequency = body.frequency;
      const { data, error: e } = await supabase.from('incomes').update(updates).eq('id', id).select().single();
      if (e) return error(e.message, 500);
      return json({ data });
    }
    if (path.startsWith('/planning/income/') && method === 'DELETE') {
      const id = path.split('/').pop();
      await supabase.from('incomes').delete().eq('id', id);
      return json({ data: { deleted: true } });
    }

    // FIXED EXPENSES
    if (path === '/planning/fixed-expenses' && method === 'POST') {
      const body = await req.json();
      const { data, error: e } = await supabase.from('fixed_expenses')
        .insert({ user_id: userId, name: body.name, amount: body.amount, frequency: body.frequency, category: body.category, is_sip: body.is_sip_flag })
        .select().single();
      if (e) return error(e.message, 500);
      return json({ data }, 201);
    }
    if (path.startsWith('/planning/fixed-expenses/') && method === 'PUT') {
      const id = path.split('/').pop();
      const body = await req.json();
      const updates: any = {};
      if (body.name) updates.name = body.name;
      if (body.amount) updates.amount = body.amount;
      if (body.frequency) updates.frequency = body.frequency;
      if (body.category) updates.category = body.category;
      if (body.is_sip_flag !== undefined) updates.is_sip = body.is_sip_flag;
      const { data, error: e } = await supabase.from('fixed_expenses').update(updates).eq('id', id).select().single();
      if (e) return error(e.message, 500);
      return json({ data });
    }
    if (path.startsWith('/planning/fixed-expenses/') && method === 'DELETE') {
      const id = path.split('/').pop();
      await supabase.from('fixed_expenses').delete().eq('id', id);
      return json({ data: { deleted: true } });
    }

    // VARIABLE EXPENSES
    if (path === '/planning/variable-expenses' && method === 'POST') {
      const body = await req.json();
      const { data, error: e } = await supabase.from('variable_expense_plans')
        .insert({ user_id: userId, name: body.name, planned: body.planned, category: body.category, start_date: body.start_date })
        .select().single();
      if (e) return error(e.message, 500);
      return json({ data }, 201);
    }
    if (path.match(/\/planning\/variable-expenses\/[^/]+\/actuals$/) && method === 'POST') {
      const planId = path.split('/')[3];
      const body = await req.json();
      const { data, error: e } = await supabase.from('variable_expense_actuals')
        .insert({ user_id: userId, plan_id: planId, amount: body.amount, incurred_at: body.incurred_at, justification: body.justification, subcategory: body.subcategory, payment_mode: body.payment_mode, credit_card_id: body.credit_card_id })
        .select().single();
      if (e) return error(e.message, 500);
      return json({ data }, 201);
    }
    if (path.startsWith('/planning/variable-expenses/') && method === 'DELETE') {
      const id = path.split('/').pop();
      await supabase.from('variable_expense_plans').delete().eq('id', id);
      return json({ data: { deleted: true } });
    }

    // INVESTMENTS
    if (path === '/planning/investments' && method === 'POST') {
      const body = await req.json();
      const { data, error: e } = await supabase.from('investments')
        .insert({ user_id: userId, name: body.name, goal: body.goal, monthly_amount: body.monthly_amount })
        .select().single();
      if (e) return error(e.message, 500);
      return json({ data }, 201);
    }
    if (path.startsWith('/planning/investments/') && method === 'DELETE') {
      const id = path.split('/').pop();
      await supabase.from('investments').delete().eq('id', id);
      return json({ data: { deleted: true } });
    }

    // FUTURE BOMBS
    if (path === '/future-bombs' && method === 'POST') {
      const body = await req.json();
      const { data, error: e } = await supabase.from('future_bombs')
        .insert({ user_id: userId, name: body.name, due_date: body.due_date, total_amount: body.total_amount, saved_amount: body.saved_amount || 0 })
        .select().single();
      if (e) return error(e.message, 500);
      return json({ data }, 201);
    }
    if (path.startsWith('/future-bombs/') && method === 'DELETE') {
      const id = path.split('/').pop();
      await supabase.from('future_bombs').delete().eq('id', id);
      return json({ data: { deleted: true } });
    }

    // PREFERENCES
    if (path === '/preferences' && method === 'GET') {
      const { data } = await supabase.from('user_preferences').select('*').eq('user_id', userId).single();
      return json({ data: data || { month_start_day: 1, currency: 'INR' } });
    }
    if (path === '/preferences' && method === 'PUT') {
      const body = await req.json();
      const { data, error: e } = await supabase.from('user_preferences')
        .upsert({ user_id: userId, ...body }).select().single();
      if (e) return error(e.message, 500);
      return json({ data });
    }

    // HEALTH
    if (path === '/health' && method === 'GET') {
      return json({ status: 'ok' });
    }

    // EXPORT
    if (path === '/export' && method === 'GET') {
      const { data } = await supabase.rpc('get_dashboard_data', { p_user_id: userId, p_billing_period_id: null });
      return json({ data });
    }

    return error('Not found', 404);

  } catch (err) {
    console.error('API Error:', err);
    return error('Internal server error', 500);
  }
});

