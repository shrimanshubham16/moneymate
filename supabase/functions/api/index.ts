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
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
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

// Transform credit card from snake_case to camelCase for frontend compatibility
function transformCreditCard(card: any) {
  return {
    id: card.id,
    userId: card.user_id,
    name: card.name,
    statementDate: card.statement_date,
    dueDate: card.due_date,
    billAmount: card.bill_amount,
    paidAmount: card.paid_amount,
    currentExpenses: card.current_expenses,
    billingDate: card.billing_date,
    needsBillUpdate: card.needs_bill_update,
    createdAt: card.created_at
  };
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(req.url);
  let path = url.pathname.replace('/api', '').replace('/functions/v1/api', '');
  // Ensure path starts with / for proper matching
  if (!path.startsWith('/')) path = '/' + path;
  const method = req.method;
  
  // Debug logging for route matching (temporary)
  if (path.includes('investment')) {
    console.log(`[ROUTE_DEBUG] Path: ${path}, Method: ${method}, Original: ${url.pathname}`);
  }
  
  // HEALTH CHECK - for keep-alive pings (no auth required)
  if (path === '/health' && method === 'GET') {
    return new Response(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Create admin client (bypasses RLS)
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // Redis client for caching
  const REDIS_URL = Deno.env.get('UPSTASH_REDIS_URL');
  const REDIS_TOKEN = Deno.env.get('UPSTASH_REDIS_TOKEN');
  
  async function redisGet(key: string): Promise<any | null> {
    if (!REDIS_URL || !REDIS_TOKEN) return null;
    try {
      const response = await fetch(`${REDIS_URL}/get/${key}`, {
        headers: { Authorization: `Bearer ${REDIS_TOKEN}` }
      });
      const data = await response.json();
      if (data.result) {
        console.log(`[REDIS_HIT] ${key}`);
        return JSON.parse(data.result);
      }
      return null;
    } catch (e) {
      console.error('[REDIS_ERROR] Get failed:', e);
      return null;
    }
  }
  
  async function redisSet(key: string, value: any, ttlSeconds = 60): Promise<void> {
    if (!REDIS_URL || !REDIS_TOKEN) return;
    try {
      await fetch(`${REDIS_URL}/setex/${key}/${ttlSeconds}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
        body: JSON.stringify(value)
      });
      console.log(`[REDIS_SET] ${key} (TTL: ${ttlSeconds}s)`);
    } catch (e) {
      console.error('[REDIS_ERROR] Set failed:', e);
    }
  }
  
  async function redisInvalidate(pattern: string): Promise<void> {
    if (!REDIS_URL || !REDIS_TOKEN) return;
    try {
      // Delete specific key
      await fetch(`${REDIS_URL}/del/${pattern}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${REDIS_TOKEN}` }
      });
      console.log(`[REDIS_INVALIDATE] ${pattern}`);
    } catch (e) {
      console.error('[REDIS_ERROR] Invalidate failed:', e);
    }
  }
  
  // Invalidate all dashboard-related caches for a user
  async function invalidateUserCache(userId: string): Promise<void> {
    await Promise.all([
      redisInvalidate(`dashboard:${userId}`),
      redisInvalidate(`health:${userId}`)
    ]);
    console.log(`[CACHE_INVALIDATE] User ${userId} caches cleared`);
  }

  // P0 FIX: Monthly reset - clear previous month's payments when new month starts
  async function checkAndResetMonthlyPayments(userId: string): Promise<void> {
    try {
      // Get user preferences for month start day
      const { data: prefs } = await supabase.from('user_preferences')
        .select('month_start_day').eq('user_id', userId).single();
      const monthStartDay = prefs?.month_start_day || 1;
      
      const today = new Date();
      let currentMonthStart: Date;
      let previousMonthStart: Date;
      let previousMonthEnd: Date;
      
      // Calculate current billing period
      if (today.getDate() >= monthStartDay) {
        currentMonthStart = new Date(today.getFullYear(), today.getMonth(), monthStartDay);
      } else {
        currentMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, monthStartDay);
      }
      
      // Calculate previous billing period
      previousMonthStart = new Date(currentMonthStart);
      previousMonthStart.setMonth(previousMonthStart.getMonth() - 1);
      previousMonthEnd = new Date(currentMonthStart);
      
      const previousMonthStr = `${previousMonthStart.getFullYear()}-${String(previousMonthStart.getMonth() + 1).padStart(2, '0')}`;
      const currentMonthStr = `${currentMonthStart.getFullYear()}-${String(currentMonthStart.getMonth() + 1).padStart(2, '0')}`;
      
      // Check if we've already reset for current billing period
      // P0 FIX: Check for reset in current billing period using created_at timestamp
      console.log(`[MONTHLY_RESET_CHECK] Checking for existing reset for user ${userId}, currentMonthStart: ${currentMonthStart.toISOString()}, currentMonthStr: ${currentMonthStr}`);
      const { data: resetCheck, error: resetCheckErr } = await supabase.from('activities')
        .select('id, created_at')
        .eq('actor_id', userId)
        .eq('entity', 'system')
        .eq('action', 'monthly_reset')
        .gte('created_at', currentMonthStart.toISOString())
        .lt('created_at', new Date(currentMonthStart.getTime() + 32 * 24 * 60 * 60 * 1000).toISOString()) // Next month
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (resetCheckErr) {
        console.error(`[MONTHLY_RESET_CHECK_ERROR]`, resetCheckErr);
      } else {
        console.log(`[MONTHLY_RESET_CHECK] Found ${resetCheck?.length || 0} existing reset(s) for current billing period`);
        if (resetCheck && resetCheck.length > 0) {
          console.log(`[MONTHLY_RESET_CHECK] Existing reset found at ${resetCheck[0].created_at}, skipping reset`);
        }
      }
      
      // Only reset if we haven't already reset for this billing period
      if (!resetCheck || resetCheck.length === 0) {
        console.log(`[MONTHLY_RESET] Resetting payments and variable actuals for user ${userId}, previous month: ${previousMonthStr}`);
        
        // Delete all payments from previous month (resets payment status for fixed expenses, investments, SIPs)
        const { error: deleteErr } = await supabase.from('payments')
          .delete()
          .eq('user_id', userId)
          .eq('month', previousMonthStr);
        
        if (deleteErr) {
          console.error(`[MONTHLY_RESET_ERROR] Failed to delete payments:`, deleteErr);
        }
        
        // P0 FIX: Delete variable expense actuals from previous billing period
        // This ensures variable actuals are reset on monthly reset date
        const { error: deleteActualsErr } = await supabase.from('variable_expense_actuals')
          .delete()
          .eq('user_id', userId)
          .gte('incurred_at', previousMonthStart.toISOString().split('T')[0])
          .lt('incurred_at', previousMonthEnd.toISOString().split('T')[0]);
        
        if (deleteActualsErr) {
          console.error(`[MONTHLY_RESET_ERROR] Failed to delete variable actuals:`, deleteActualsErr);
        } else {
          console.log(`[MONTHLY_RESET] Deleted variable actuals from ${previousMonthStart.toISOString().split('T')[0]} to ${previousMonthEnd.toISOString().split('T')[0]}`);
        }
        
        // Log monthly reset activity only if at least one operation succeeded
        if (!deleteErr || !deleteActualsErr) {
          await logActivity(userId, 'system', 'monthly_reset', {
            month: currentMonthStr,
            previousMonth: previousMonthStr,
            paymentsDeleted: !deleteErr,
            variableActualsDeleted: !deleteActualsErr,
            resetAt: new Date().toISOString()
          });
          
          console.log(`[MONTHLY_RESET] Cleared payments for ${previousMonthStr}, new month: ${currentMonthStr}`);
        }
      }
    } catch (err) {
      console.error('[MONTHLY_RESET_ERROR]', err);
      // Don't fail the request if reset check fails
    }
  }

  // Helper to return JSON
  const json = (data: any, status = 200) => new Response(
    JSON.stringify(data),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );

  const error = (message: string, status = 400) => json({ error: { message } }, status);

  // Helper to log activities
  async function logActivity(actorId: string, entity: string, action: string, payload?: any) {
    try {
      await supabase.from('activities').insert({
        actor_id: actorId,
        entity,
        action,
        payload: payload ? JSON.stringify(payload) : null
      });
    } catch (err) {
      console.error('Failed to log activity:', err);
      // Don't fail the request if activity logging fails
    }
  }

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

        // Auto-generate encryption salt for users who don't have one (legacy users)
        let encryptionSalt = user.encryption_salt;
        if (!encryptionSalt) {
          // Generate a random salt (32 bytes, base64 encoded)
          const saltBytes = new Uint8Array(32);
          crypto.getRandomValues(saltBytes);
          encryptionSalt = btoa(String.fromCharCode(...saltBytes));
          await supabase.from('users').update({ encryption_salt: encryptionSalt }).eq('id', user.id);
        }

        const token = await createToken(user.id, user.username);
        return json({ access_token: token, user: { id: user.id, username: user.username }, encryption_salt: encryptionSalt });
      } catch (loginErr) {
        console.error('Login error:', loginErr);
        return error('Login failed: ' + (loginErr as Error).message, 500);
      }
    }

    if (path.startsWith('/auth/salt/') && method === 'GET') {
      const username = path.replace('/auth/salt/', '');
      const { data: user } = await supabase.from('users').select('id, encryption_salt').eq('username', username).single();
      
      // Auto-generate encryption salt for users who don't have one (legacy users)
      if (user && !user.encryption_salt) {
        // Generate a random salt (32 bytes, base64 encoded)
        const saltBytes = new Uint8Array(32);
        crypto.getRandomValues(saltBytes);
        const saltB64 = btoa(String.fromCharCode(...saltBytes));
        
        await supabase.from('users').update({ encryption_salt: saltB64 }).eq('id', user.id);
        return json({ encryption_salt: saltB64 });
      }
      
      return json({ encryption_salt: user?.encryption_salt || null });
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
      // P0 FIX: Check and reset monthly payments if new month has started
      await checkAndResetMonthlyPayments(userId);
      
      // P0 FIX: Auto-accumulate funds for SIPs and investments
      try {
        const { error: accErr } = await supabase.rpc('auto_accumulate_funds', { 
          p_user_id: userId, 
          p_today: new Date().toISOString().split('T')[0] 
        });
        if (accErr) console.error('[AUTO_ACCUMULATE_ERROR]', accErr);
      } catch (err) {
        console.error('[AUTO_ACCUMULATE_ERROR]', err);
      }
      
      const perfStart = Date.now();
      const cacheKey = `dashboard:${userId}`;
      
      // Try Redis cache first
      const cached = await redisGet(cacheKey);
      if (cached) {
        const cacheTime = Date.now() - perfStart;
        console.log('[EDGE_PERF_CACHE] Dashboard from cache', { cacheTime, userId });
        return json({ data: cached });
      }
      
      const timings: any = {};
      
      // Query 1: Dashboard data
      const t0 = Date.now();
      const { data } = await supabase.rpc('get_dashboard_data', { p_user_id: userId, p_billing_period_id: null });
      timings.dashboardData = Date.now() - t0;
      
      // Query 2: Constraint score
      const t1 = Date.now();
      const { data: constraint } = await supabase.from('constraint_scores').select('*').eq('user_id', userId).single();
      timings.constraintScore = Date.now() - t1;
      
      // Query 3: Health calculation
      const t2 = Date.now();
      const { data: healthData } = await supabase.rpc('calculate_full_health', { p_user_id: userId });
      timings.healthCalc = Date.now() - t2;
      
      // Query 4: Payment status - P0 FIX: Use billing period month, not calendar month
      const t3 = Date.now();
      
      // Get user's billing period month (same logic as monthly reset)
      const { data: prefs } = await supabase.from('user_preferences')
        .select('month_start_day').eq('user_id', userId).single();
      const monthStartDay = prefs?.month_start_day || 1;
      
      const today = new Date();
      let billingMonthStart: Date;
      if (today.getDate() >= monthStartDay) {
        billingMonthStart = new Date(today.getFullYear(), today.getMonth(), monthStartDay);
      } else {
        billingMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, monthStartDay);
      }
      
      // Format as YYYY-MM for payments table lookup
      const billingMonth = `${billingMonthStart.getFullYear()}-${String(billingMonthStart.getMonth() + 1).padStart(2, '0')}`;
      
      const { data: payments } = await supabase
        .from('payments')
        .select('entity_type, entity_id')
        .eq('user_id', userId)
        .eq('month', billingMonth);
      timings.payments = Date.now() - t3;
      
      // Create payment status map
      const paymentStatus: Record<string, boolean> = {};
      (payments || []).forEach((p: any) => {
        paymentStatus[`${p.entity_type}:${p.entity_id}`] = true;
      });
      
      // Format response
      const variablePlans = (data?.variablePlans || []).map((plan: any) => {
        const actuals = (data?.variableActuals || []).filter((a: any) => a.planId === plan.id);
        return { ...plan, actuals, actualTotal: actuals.reduce((s: number, a: any) => s + (a.amount || 0), 0) };
      });

      const responseData = {
        incomes: data?.incomes || [],
        fixedExpenses: (data?.fixedExpenses || []).map((e: any) => ({ 
          ...e, 
          is_sip_flag: e.isSipFlag,
          paid: paymentStatus[`fixed_expense:${e.id}`] || false 
        })),
        variablePlans,
        investments: (data?.investments || []).map((i: any) => ({ 
          ...i, 
          paid: paymentStatus[`investment:${i.id}`] || false 
        })),
        futureBombs: data?.futureBombs || [],
        health: healthData?.health || { remaining: 0, category: 'ok' },
        constraintScore: constraint ? {
          score: constraint.score,
          tier: constraint.tier,
          recentOverspends: constraint.recent_overspends || 0,
          decayAppliedAt: constraint.decay_applied_at,
          updatedAt: constraint.updated_at
        } : { score: 0, tier: 'green', recentOverspends: 0 },
        alerts: []
      };

      // Cache the result (60s TTL)
      await redisSet(cacheKey, responseData, 60);

      const totalTime = Date.now() - perfStart;
      console.log('[EDGE_PERF_H3_H7] Dashboard endpoint timing', { totalTime, timings, userId, cached: false });

      return json({ data: responseData });
    }

    // INCOMES
    if (path === '/planning/income' && method === 'POST') {
      const body = await req.json();
      const { data, error: e } = await supabase.from('incomes')
        .insert({ user_id: userId, name: body.source, amount: body.amount, frequency: body.frequency, category: 'employment' })
        .select().single();
      if (e) return error(e.message, 500);
      await logActivity(userId, 'income', 'added income source', { name: data.name, amount: data.amount, frequency: data.frequency });
      await invalidateUserCache(userId);
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
      const { data: deleted } = await supabase.from('incomes').select('name').eq('id', id).single();
      await supabase.from('incomes').delete().eq('id', id);
      if (deleted) await logActivity(userId, 'income', 'deleted income source', { id, name: deleted.name });
      await invalidateUserCache(userId);
      return json({ data: { deleted: true } });
    }

    // FIXED EXPENSES
    if (path === '/planning/fixed-expenses' && method === 'POST') {
      const body = await req.json();
      const { data, error: e } = await supabase.from('fixed_expenses')
        .insert({ user_id: userId, name: body.name, amount: body.amount, frequency: body.frequency, category: body.category, is_sip: body.is_sip_flag })
        .select().single();
      if (e) return error(e.message, 500);
      await logActivity(userId, 'fixed_expense', 'added fixed expense', { name: data.name, amount: data.amount, category: data.category, frequency: data.frequency });
      await invalidateUserCache(userId);
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
      const { data: deleted } = await supabase.from('fixed_expenses').select('name, category').eq('id', id).single();
      await supabase.from('fixed_expenses').delete().eq('id', id);
      if (deleted) await logActivity(userId, 'fixed_expense', 'deleted fixed expense', { id, name: deleted.name, category: deleted.category });
      await invalidateUserCache(userId);
      return json({ data: { deleted: true } });
    }

    // VARIABLE EXPENSES
    if (path === '/planning/variable-expenses' && method === 'POST') {
      const body = await req.json();
      const { data, error: e } = await supabase.from('variable_expense_plans')
        .insert({ user_id: userId, name: body.name, planned: body.planned, category: body.category, start_date: body.start_date })
        .select().single();
      if (e) return error(e.message, 500);
      await logActivity(userId, 'variable_expense_plan', 'added variable expense plan', { name: data.name, planned: data.planned, category: data.category });
      await invalidateUserCache(userId);
      return json({ data }, 201);
    }
    if (path.match(/\/planning\/variable-expenses\/[^/]+\/actuals$/) && method === 'POST') {
      const planId = path.split('/')[3];
      const body = await req.json();
      
      // Get plan details for activity log and overspend detection
      const { data: plan } = await supabase.from('variable_expense_plans')
        .select('name, category, planned').eq('id', planId).single();
      
      const { data, error: e } = await supabase.from('variable_expense_actuals')
        .insert({ user_id: userId, plan_id: planId, amount: body.amount, incurred_at: body.incurred_at, justification: body.justification, subcategory: body.subcategory, payment_mode: body.payment_mode, credit_card_id: body.credit_card_id })
        .select().single();
      if (e) return error(e.message, 500);
      
      // If paid via credit card, update the card's current_expenses
      if (body.payment_mode === 'CreditCard' && body.credit_card_id) {
        const { data: card } = await supabase.from('credit_cards')
          .select('current_expenses')
          .eq('id', body.credit_card_id)
          .eq('user_id', userId)
          .single();
        
        if (card) {
          await supabase.from('credit_cards')
            .update({ current_expenses: (card.current_expenses || 0) + body.amount })
            .eq('id', body.credit_card_id)
            .eq('user_id', userId);
          console.log(`[CREDIT_CARD_SYNC] Updated card ${body.credit_card_id} current_expenses: ${(card.current_expenses || 0)} + ${body.amount} = ${(card.current_expenses || 0) + body.amount}`);
        }
      }
      
      // P0 FIX: Detect and record overspend
      if (plan?.planned) {
        // Get user's billing period
        const { data: prefs } = await supabase.from('user_preferences')
          .select('month_start_day').eq('user_id', userId).single();
        const monthStartDay = prefs?.month_start_day || 1;
        
        // Calculate billing period dates
        const today = new Date(body.incurred_at || new Date().toISOString());
        let monthStart: Date;
        let monthEnd: Date;
        
        if (today.getDate() >= monthStartDay) {
          monthStart = new Date(today.getFullYear(), today.getMonth(), monthStartDay);
          monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, monthStartDay);
        } else {
          monthStart = new Date(today.getFullYear(), today.getMonth() - 1, monthStartDay);
          monthEnd = new Date(today.getFullYear(), today.getMonth(), monthStartDay);
        }
        
        // Get total actual spending for this plan in current billing period
        const { data: actuals } = await supabase.from('variable_expense_actuals')
          .select('amount')
          .eq('plan_id', planId)
          .eq('user_id', userId)
          .gte('incurred_at', monthStart.toISOString())
          .lt('incurred_at', monthEnd.toISOString());
        
        const totalActual = (actuals || []).reduce((sum: number, a: any) => sum + (parseFloat(a.amount) || 0), 0);
        const plannedAmount = parseFloat(plan.planned) || 0;
        
        // Detect overspend: actual > planned (only count once per plan per billing period)
        if (totalActual > plannedAmount) {
          console.log(`[OVERSPEND_CHECK] Plan: ${plan.name}, Planned: ${plannedAmount}, Actual: ${totalActual}, Overspend: ${totalActual - plannedAmount}`);
          
          // Check if we've already recorded an overspend for THIS PLAN this billing period
          const { data: existingOverspend } = await supabase.from('activities')
            .select('id')
            .eq('actor_id', userId)
            .eq('entity', 'variable_expense')
            .eq('action', 'overspend_detected')
            .like('payload', `%"planName":"${plan.name}"%`)
            .gte('created_at', monthStart.toISOString())
            .lt('created_at', monthEnd.toISOString())
            .limit(1);
          
          // Only count if this is a NEW overspend for this plan
          if (!existingOverspend || existingOverspend.length === 0) {
            console.log(`[OVERSPEND_DETECTED] Plan: ${plan.name}, Planned: ${plannedAmount}, Actual: ${totalActual}, Overspend: ${totalActual - plannedAmount}`);
            
            // Get current constraint score
            const { data: constraint } = await supabase.from('constraint_scores')
              .select('*').eq('user_id', userId).single();
            
            if (constraint) {
              const currentScore = constraint.score || 0;
              const currentOverspends = constraint.recent_overspends || 0;
              
              // Update constraint score: +5 per overspend, max 100
              const newScore = Math.min(100, currentScore + 5);
              const newTier = newScore >= 70 ? 'red' : newScore >= 40 ? 'amber' : 'green';
              
              await supabase.from('constraint_scores')
                .update({
                  score: newScore,
                  tier: newTier,
                  recent_overspends: currentOverspends + 1,
                  updated_at: new Date().toISOString()
                })
                .eq('user_id', userId);
              
              // Log overspend activity
              await logActivity(userId, 'variable_expense', 'overspend_detected', {
                planName: plan.name,
                planned: plannedAmount,
                actual: totalActual,
                overspend: totalActual - plannedAmount,
                billingPeriod: `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}`
              });
              
              console.log(`[CONSTRAINT_UPDATE] Score: ${currentScore} → ${newScore}, Overspends: ${currentOverspends} → ${currentOverspends + 1}`);
            } else {
              // Create constraint score if it doesn't exist
              await supabase.from('constraint_scores').insert({
                user_id: userId,
                score: 5,
                tier: 'green',
                recent_overspends: 1
              });
              
              await logActivity(userId, 'variable_expense', 'overspend_detected', {
                planName: plan.name,
                planned: plannedAmount,
                actual: totalActual,
                overspend: totalActual - plannedAmount,
                billingPeriod: `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}`
              });
            }
          }
        }
      }
      
      // Enhanced activity log with all details
      let cardName = null;
      if (body.credit_card_id) {
        const { data: cardData } = await supabase.from('credit_cards').select('name').eq('id', body.credit_card_id).single();
        cardName = cardData?.name;
      }
      
      await logActivity(userId, 'variable_expense', 'added actual expense', { 
        planName: plan?.name,
        category: plan?.category,
        amount: data.amount, 
        subcategory: data.subcategory,
        paymentMode: data.payment_mode,
        creditCard: cardName,
        justification: data.justification 
      });
      
      await invalidateUserCache(userId);
      return json({ data }, 201);
    }
    if (path.startsWith('/planning/variable-expenses/') && method === 'DELETE') {
      const id = path.split('/').pop();
      const { data: deleted } = await supabase.from('variable_expense_plans').select('name').eq('id', id).single();
      await supabase.from('variable_expense_plans').delete().eq('id', id);
      if (deleted) await logActivity(userId, 'variable_expense_plan', 'deleted variable expense plan', { id, name: deleted.name });
      return json({ data: { deleted: true } });
    }

    // INVESTMENTS
    if (path === '/planning/investments' && method === 'POST') {
      const body = await req.json();
      console.log(`[INVESTMENT_CREATE] Creating investment for user ${userId}, body:`, body);
      const { data, error: e } = await supabase.from('investments')
        .insert({ user_id: userId, name: body.name, goal: body.goal, monthly_amount: body.monthly_amount, status: body.status || 'active' })
        .select().single();
      if (e) {
        console.error(`[INVESTMENT_CREATE_ERROR] Database error:`, e);
        return error(e.message, 500);
      }
      if (!data) {
        console.error(`[INVESTMENT_CREATE_ERROR] No data returned`);
        return error('Failed to create investment', 500);
      }
      console.log(`[INVESTMENT_CREATE] Successfully created investment ${data.id}`);
      await logActivity(userId, 'investment', 'added investment', { name: data.name, goal: data.goal, monthlyAmount: data.monthly_amount });
      await invalidateUserCache(userId); // P0 FIX: Invalidate cache after creation
      return json({ data }, 201);
    }
    if (path.startsWith('/planning/investments/') && method === 'PUT') {
      const id = path.split('/').pop();
      if (!id) {
        console.error(`[INVESTMENT_UPDATE] Missing investment ID, path: ${path}`);
        return error('Investment ID required', 400);
      }
      const body = await req.json();
      console.log(`[INVESTMENT_UPDATE] Request received for investment ${id}, userId: ${userId}, path: ${path}, body:`, body);
      const updateData: any = {};
      if (body.name !== undefined) updateData.name = body.name;
      if (body.goal !== undefined) updateData.goal = body.goal;
      if (body.monthly_amount !== undefined) updateData.monthly_amount = body.monthly_amount;
      if (body.status !== undefined) updateData.status = body.status;
      if (body.accumulated_funds !== undefined) updateData.accumulated_funds = body.accumulated_funds;
      
      console.log(`[INVESTMENT_UPDATE] Updating investment ${id} with data:`, updateData);
      const { data, error: e } = await supabase.from('investments')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();
      if (e) {
        console.error(`[INVESTMENT_UPDATE_ERROR] Database error:`, e);
        return error(e.message, 500);
      }
      
      if (!data) {
        console.error(`[INVESTMENT_UPDATE_ERROR] No data returned, investment ${id} not found or access denied`);
        return error('Investment not found', 404);
      }
      
      console.log(`[INVESTMENT_UPDATE] Successfully updated investment ${id}:`, data);
      
      if (body.accumulated_funds !== undefined) {
        await logActivity(userId, 'investment', 'updated available fund', { id, name: data.name, accumulatedFunds: body.accumulated_funds });
      } else {
        await logActivity(userId, 'investment', 'updated investment', { id, name: data.name });
      }
      await invalidateUserCache(userId);
      return json({ data });
    }
    if (path.startsWith('/planning/investments/') && method === 'DELETE') {
      const id = path.split('/').pop();
      const { data: deleted } = await supabase.from('investments').select('name').eq('id', id).single();
      await supabase.from('investments').delete().eq('id', id);
      if (deleted) await logActivity(userId, 'investment', 'deleted investment', { id, name: deleted.name });
      return json({ data: { deleted: true } });
    }

    // FUTURE BOMBS
    if (path === '/future-bombs' && method === 'POST') {
      const body = await req.json();
      const { data, error: e } = await supabase.from('future_bombs')
        .insert({ user_id: userId, name: body.name, due_date: body.due_date, total_amount: body.total_amount, saved_amount: body.saved_amount || 0 })
        .select().single();
      if (e) return error(e.message, 500);
      await logActivity(userId, 'future_bomb', 'added future bomb', { name: data.name, totalAmount: data.total_amount, dueDate: data.due_date });
      return json({ data }, 201);
    }
    if (path.startsWith('/future-bombs/') && method === 'DELETE') {
      const id = path.split('/').pop();
      const { data: deleted } = await supabase.from('future_bombs').select('name').eq('id', id).single();
      await supabase.from('future_bombs').delete().eq('id', id);
      if (deleted) await logActivity(userId, 'future_bomb', 'deleted future bomb', { id, name: deleted.name });
      return json({ data: { deleted: true } });
    }

    // PREFERENCES
    if (path === '/preferences' && method === 'GET') {
      const { data } = await supabase.from('user_preferences').select('*').eq('user_id', userId).single();
      const prefs = data || { month_start_day: 1, currency: 'INR', timezone: 'Asia/Kolkata' };
      return json({ data: {
        monthStartDay: prefs.month_start_day ?? 1,
        currency: prefs.currency ?? 'INR',
        timezone: prefs.timezone ?? 'Asia/Kolkata'
      }});
    }
    if (path === '/preferences' && (method === 'PUT' || method === 'PATCH')) {
      const body = await req.json();
      const updates: any = { user_id: userId };
      if (body.monthStartDay !== undefined) updates.month_start_day = body.monthStartDay;
      if (body.month_start_day !== undefined) updates.month_start_day = body.month_start_day;
      if (body.currency !== undefined) updates.currency = body.currency;
      if (body.timezone !== undefined) updates.timezone = body.timezone;
      const { data, error: e } = await supabase.from('user_preferences')
        .upsert(updates, { onConflict: 'user_id' }).select().single();
      if (e) return error(e.message, 500);
      const prefs = data || updates;
      return json({ data: {
        monthStartDay: prefs.month_start_day ?? 1,
        currency: prefs.currency ?? 'INR',
        timezone: prefs.timezone ?? 'Asia/Kolkata'
      }});
    }

    // HEALTH
    if (path === '/health' && method === 'GET') {
      return json({ status: 'ok' });
    }

    // AUTH/ME - Get current user info
    if (path === '/auth/me' && method === 'GET') {
      const { data: userData } = await supabase.from('users').select('id, username, created_at').eq('id', userId).single();
      return json({ data: userData });
    }

    // CHANGE PASSWORD
    if (path === '/auth/change-password' && method === 'POST') {
      const { currentPassword, newPassword } = await req.json();
      
      if (!currentPassword || !newPassword) {
        return error('Current password and new password are required', 400);
      }
      
      if (newPassword.length < 8) {
        return error('New password must be at least 8 characters', 400);
      }
      
      // Fetch user with current password hash
      const { data: user, error: userErr } = await supabase
        .from('users')
        .select('id, username, password_hash')
        .eq('id', userId)
        .single();
      
      if (userErr || !user) {
        return error('User not found', 404);
      }
      
      // Verify current password
      const validPassword = await verifyPassword(currentPassword, user.password_hash);
      if (!validPassword) {
        return error('Current password is incorrect', 401);
      }
      
      // Check if new password is different from current
      if (currentPassword === newPassword) {
        return error('New password must be different from current password', 400);
      }
      
      // Hash new password
      const newPasswordHash = await hashPassword(newPassword);
      
      // Update password in database
      const { error: updateErr } = await supabase
        .from('users')
        .update({ password_hash: newPasswordHash })
        .eq('id', userId);
      
      if (updateErr) {
        console.error('Password update error:', updateErr);
        return error('Failed to update password', 500);
      }
      
      return json({ message: 'Password updated successfully' });
    }

    // CREDIT CARDS
    if (path === '/debts/credit-cards/billing-alerts' && method === 'GET') {
      const today = new Date();
      const todayDay = today.getDate();
      
      const { data: cards } = await supabase
        .from('credit_cards')
        .select('*')
        .eq('user_id', userId);
      
      const alerts: Array<{ cardId: string; cardName: string; message: string }> = [];
      
      (cards || []).forEach((card: any) => {
        const billingDate = card.billing_date || 1;
        const currentExpenses = parseFloat(card.current_expenses || 0);
        
        // Alert if billing date arrived and currentExpenses > 0
        if (todayDay === billingDate && currentExpenses > 0) {
          alerts.push({
            cardId: card.id,
            cardName: card.name,
            message: `${card.name}: ₹${currentExpenses.toLocaleString('en-IN')} pending billing. Please reset and update bill.`
          });
        }
        
        // Alert if card needs bill update
        if (card.needs_bill_update) {
          alerts.push({
            cardId: card.id,
            cardName: card.name,
            message: `${card.name}: Bill needs to be updated with actual amount.`
          });
        }
      });
      
      return json({ data: alerts });
    }
    if (path === '/debts/credit-cards' && method === 'GET') {
      const { data } = await supabase.from('credit_cards').select('*').eq('user_id', userId);
      return json({ data: (data || []).map(transformCreditCard) });
    }
    if (path.match(/\/debts\/credit-cards\/[^/]+\/usage$/) && method === 'GET') {
      const id = path.split('/')[3];
      const { data: card, error: cardErr } = await supabase.from('credit_cards').select('*').eq('id', id).eq('user_id', userId).single();
      if (cardErr || !card) return error('Credit card not found', 404);
      
      // Get all variable expense actuals for this credit card
      const { data: usage } = await supabase
        .from('variable_expense_actuals')
        .select('*')
        .eq('user_id', userId)
        .eq('payment_mode', 'CreditCard')
        .eq('credit_card_id', id);
      
      // Transform snake_case to camelCase for frontend compatibility
      const transformedUsage = (usage || []).map((u: any) => ({
        id: u.id,
        planId: u.plan_id,
        amount: u.amount,
        incurredAt: u.incurred_at,
        subcategory: u.subcategory,
        justification: u.justification,
        paymentMode: u.payment_mode,
        creditCardId: u.credit_card_id
      }));
      
      return json({ data: transformedUsage });
    }
    if (path === '/debts/credit-cards' && method === 'POST') {
      const body = await req.json();
      // statement_date is required - default to today if not provided
      const statementDate = body.statementDate || new Date().toISOString().split('T')[0];
      const { data, error: e } = await supabase.from('credit_cards')
        .insert({ 
          user_id: userId, 
          name: body.name, 
          statement_date: statementDate,
          bill_amount: body.billAmount || 0, 
          paid_amount: body.paidAmount || 0, 
          due_date: body.dueDate, 
          billing_date: body.billingDate 
        })
        .select().single();
      if (e) return error(e.message, 500);
      
      // If paidAmount provided, update it
      if (body.paidAmount !== undefined && body.paidAmount > 0) {
        await supabase.from('credit_cards')
          .update({ paid_amount: body.paidAmount })
          .eq('id', data.id);
      }
      
      await logActivity(userId, 'credit_card', 'created', { id: data.id, name: data.name });
      await invalidateUserCache(userId);
      return json({ data: transformCreditCard(data) }, 201);
    }
    if (path.startsWith('/debts/credit-cards/') && method === 'PUT') {
      const id = path.split('/').pop();
      const body = await req.json();
      const updates: any = {};
      if (body.name) updates.name = body.name;
      if (body.statementDate) updates.statement_date = body.statementDate;
      if (body.billAmount !== undefined) updates.bill_amount = body.billAmount;
      if (body.paidAmount !== undefined) updates.paid_amount = body.paidAmount;
      if (body.dueDate) updates.due_date = body.dueDate;
      if (body.billingDate) updates.billing_date = body.billingDate;
      const { data, error: e } = await supabase.from('credit_cards').update(updates).eq('id', id).eq('user_id', userId).select().single();
      if (e) return error(e.message, 500);
      if (!data) return error('Credit card not found', 404);
      return json({ data: transformCreditCard(data) });
    }
    if (path.match(/\/debts\/credit-cards\/[^/]+\/payments$/) && method === 'POST') {
      const id = path.split('/')[3];
      const body = await req.json();
      const { data: card, error: cardErr } = await supabase.from('credit_cards').select('*').eq('id', id).eq('user_id', userId).single();
      if (cardErr || !card) return error('Credit card not found', 404);
      const newPaidAmount = (card.paid_amount || 0) + (body.amount || 0);
      const { data, error: e } = await supabase.from('credit_cards').update({ paid_amount: newPaidAmount }).eq('id', id).select().single();
      if (e) return error(e.message, 500);
      await logActivity(userId, 'credit_card', 'payment', { id: data.id, amount: body.amount });
      await invalidateUserCache(userId);
      return json({ data: transformCreditCard(data) });
    }
    if (path.match(/\/debts\/credit-cards\/[^/]+\/reset-billing$/) && method === 'POST') {
      const id = path.split('/')[3];
      const { data, error: e } = await supabase.from('credit_cards').update({ current_expenses: 0, needs_bill_update: false }).eq('id', id).eq('user_id', userId).select().single();
      if (e) return error(e.message, 500);
      await logActivity(userId, 'credit_card', 'reset_billing', { id: data.id });
      await invalidateUserCache(userId);
      return json({ data: transformCreditCard(data) });
    }
    if (path.startsWith('/debts/credit-cards/') && method === 'PATCH') {
      const id = path.split('/').pop();
      const body = await req.json();
      const { data: card, error: cardErr } = await supabase.from('credit_cards').select('*').eq('id', id).eq('user_id', userId).single();
      if (cardErr || !card) return error('Credit card not found', 404);
      if (body.billAmount === undefined || body.billAmount < 0) return error('billAmount must be a nonnegative number', 400);
      const { data, error: e } = await supabase.from('credit_cards').update({ bill_amount: Math.round(body.billAmount * 100) / 100, needs_bill_update: false }).eq('id', id).select().single();
      if (e) return error(e.message, 500);
      await logActivity(userId, 'credit_card', 'updated_bill', { id: data.id, billAmount: data.bill_amount });
      await invalidateUserCache(userId);
      return json({ data: transformCreditCard(data) });
    }
    if (path.startsWith('/debts/credit-cards/') && method === 'DELETE') {
      const id = path.split('/').pop();
      const { data: deleted } = await supabase.from('credit_cards').select('name').eq('id', id).single();
      await supabase.from('credit_cards').delete().eq('id', id);
      if (deleted) await logActivity(userId, 'credit_card', 'deleted', { id, name: deleted.name });
      await invalidateUserCache(userId);
      return json({ data: { deleted: true } });
    }

    // LOANS - Auto-fetch from fixed expenses where category = "Loan"
    if (path === '/debts/loans' && method === 'GET') {
      const perfStart = Date.now();
      
      // OPTIMIZED: Filter at DB level using ilike for case-insensitive search
      const t0 = Date.now();
      const { data: loanExpenses, error: loanErr } = await supabase
        .from('fixed_expenses')
        .select('*')
        .eq('user_id', userId)
        .ilike('category', 'loan'); // Database-level filtering
      const queryTime = Date.now() - t0;
      
      if (loanErr) {
        console.error('Error fetching loans:', loanErr);
        return json({ data: [] });
      }
      
      // Convert fixed expenses to loan format
      const t1 = Date.now();
      const autoLoans = (loanExpenses || []).map((exp: any) => {
        const amount = parseFloat(exp.amount) || 0;
        const emi = exp.frequency === 'monthly' ? amount :
          exp.frequency === 'quarterly' ? amount / 3 :
          exp.frequency === 'yearly' ? amount / 12 : amount;
        
        const remainingMonths = exp.end_date ? Math.max(1, Math.ceil(
          (new Date(exp.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 30)
        )) : 12;
        
        return {
          id: exp.id,
          name: exp.name,
          emi: Math.round(emi * 100) / 100,
          remainingTenureMonths: remainingMonths,
          principal: Math.round((emi * remainingMonths) * 100) / 100
        };
      });
      const mapTime = Date.now() - t1;
      const totalTime = Date.now() - perfStart;
      
      console.log('[EDGE_PERF_LOANS] Loans endpoint timing', { 
        totalTime, 
        queryTime, 
        mapTime, 
        loanCount: autoLoans.length,
        userId 
      });
      
      return json({ data: autoLoans });
    }
    if (path === '/debts/loans' && method === 'POST') {
      const body = await req.json();
      const { data, error: e } = await supabase.from('loans')
        .insert({ user_id: userId, name: body.name, principal: body.principal, remaining_tenure_months: body.remainingTenureMonths, emi: body.emi })
        .select().single();
      if (e) return error(e.message, 500);
      return json({ data }, 201);
    }
    if (path.startsWith('/debts/loans/') && method === 'DELETE') {
      const id = path.split('/').pop();
      await supabase.from('loans').delete().eq('id', id);
      return json({ data: { deleted: true } });
    }

    // ACTIVITY LOG
    if (path === '/activity' && method === 'GET') {
      // Support date range filtering via query params
      const url = new URL(req.url);
      const startDate = url.searchParams.get('start_date');
      const endDate = url.searchParams.get('end_date');
      
      // activities table uses actor_id, not user_id
      let query = supabase
        .from('activities')
        .select('*')
        .eq('actor_id', userId);
      
      // Apply date filters if provided
      if (startDate) {
        query = query.gte('created_at', startDate);
      }
      if (endDate) {
        query = query.lte('created_at', endDate);
      }
      
      const { data: activities, error: actErr } = await query
        .order('created_at', { ascending: false })
        .limit(1000); // Increased limit for history view
      
      if (actErr) {
        console.error('Error fetching activities:', actErr);
        return json({ data: [] });
      }
      
      // Get unique actor IDs and fetch usernames
      const actorIds = [...new Set((activities || []).map((a: any) => a.actor_id))];
      const { data: users } = await supabase
        .from('users')
        .select('id, username')
        .in('id', actorIds);
      
      // Create a map of user ID to username
      const usernameMap = new Map((users || []).map((u: any) => [u.id, u.username]));
      
      // Format response with username and parse JSON payload
      const formatted = (activities || []).map((act: any) => {
        let parsedPayload = null;
        try {
          // Parse JSON string payload back to object
          parsedPayload = act.payload ? JSON.parse(act.payload) : null;
        } catch (e) {
          console.error('[ACTIVITY_PARSE_ERROR] Failed to parse payload:', act.payload);
          parsedPayload = act.payload; // Keep as-is if parse fails
        }
        
        return {
          id: act.id,
          actorId: act.actor_id,
          entity: act.entity,
          action: act.action,
          payload: parsedPayload, // Parsed object, not string
          createdAt: act.created_at,
          username: usernameMap.get(act.actor_id) || 'Unknown User'
        };
      });
      
      return json({ data: formatted });
    }

    // SHARING
    if (path === '/sharing/members' && method === 'GET') {
      const { data: members } = await supabase.from('shared_members').select('*').eq('user_id', userId);
      const { data: accounts } = await supabase.from('shared_accounts').select('*');
      return json({ data: { members: members || [], accounts: accounts || [] } });
    }
    if (path === '/sharing/requests' && method === 'GET') {
      const { data: incoming } = await supabase.from('sharing_requests').select('*').eq('invitee_id', userId);
      const { data: outgoing } = await supabase.from('sharing_requests').select('*').eq('inviter_id', userId);
      return json({ data: { incoming: incoming || [], outgoing: outgoing || [] } });
    }

    // PAYMENTS
    if (path === '/payments/mark-paid' && method === 'POST') {
      const body = await req.json();
      if (!body.itemId || !body.itemType || !body.amount) return error('itemId, itemType, and amount required');
      if (!['fixed_expense', 'investment', 'loan'].includes(body.itemType)) return error('Invalid itemType');
      
      // Fetch the item name for activity logging
      let itemName = 'Unknown';
      if (body.itemType === 'fixed_expense') {
        const { data: expense } = await supabase.from('fixed_expenses').select('name').eq('id', body.itemId).single();
        itemName = expense?.name || 'Unknown Expense';
      } else if (body.itemType === 'investment') {
        const { data: investment } = await supabase.from('investments').select('name').eq('id', body.itemId).single();
        itemName = investment?.name || 'Unknown Investment';
      } else if (body.itemType === 'loan') {
        const { data: loan } = await supabase.from('fixed_expenses').select('name').eq('id', body.itemId).eq('category', 'loan').single();
        itemName = loan?.name || 'Unknown Loan';
      }
      
      // Get user's billing period month (same logic as dashboard)
      const { data: prefs } = await supabase.from('user_preferences')
        .select('month_start_day').eq('user_id', userId).single();
      const monthStartDay = prefs?.month_start_day || 1;
      
      const today = new Date();
      let billingMonthStart: Date;
      if (today.getDate() >= monthStartDay) {
        billingMonthStart = new Date(today.getFullYear(), today.getMonth(), monthStartDay);
      } else {
        billingMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, monthStartDay);
      }
      
      const billingMonthStr = `${billingMonthStart.getFullYear()}-${String(billingMonthStart.getMonth() + 1).padStart(2, '0')}`;
      
      console.log(`[MARK_PAID] Marking ${body.itemType} ${body.itemId} as paid for user ${userId}, month: ${billingMonthStr}, amount: ${body.amount}`);
      
      const { data: existing } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', userId)
        .eq('entity_id', body.itemId)
        .eq('entity_type', body.itemType)
        .eq('month', billingMonthStr)
        .single();
      
      let payment;
      if (existing) {
        const { data: updated } = await supabase
          .from('payments')
          .update({ amount: body.amount, paid_at: new Date().toISOString() })
          .eq('id', existing.id)
          .select()
          .single();
        payment = updated;
      } else {
        const { data: created } = await supabase
          .from('payments')
          .insert({ user_id: userId, entity_type: body.itemType, entity_id: body.itemId, month: billingMonthStr, amount: body.amount })
          .select()
          .single();
        payment = created;
      }
      
      // P0 FIX: Update accumulated_funds when marked as paid
      // INVESTMENTS: Add paid amount to accumulated_funds (savings increase)
      // PERIODIC SIPs: Deduct paid amount from accumulated_funds (savings decrease)
      if (body.itemType === 'investment') {
        console.log(`[MARK_PAID] Adding paid amount to accumulated_funds for investment ${body.itemId}, amount: ${body.amount}`);
        // Get current accumulated_funds
        const { data: inv } = await supabase.from('investments')
          .select('accumulated_funds')
          .eq('id', body.itemId)
          .eq('user_id', userId)
          .single();
        const currentAccumulated = inv?.accumulated_funds || 0;
        const newAccumulated = currentAccumulated + body.amount;
        const { error: updateErr } = await supabase
          .from('investments')
          .update({ accumulated_funds: newAccumulated })
          .eq('id', body.itemId)
          .eq('user_id', userId);
        if (updateErr) {
          console.error('[MARK_PAID] Failed to update accumulated_funds for investment:', updateErr);
        } else {
          console.log(`[MARK_PAID] Updated investment accumulated_funds from ${currentAccumulated} to ${newAccumulated}`);
        }
      } else if (body.itemType === 'fixed_expense') {
        // Check if it's a periodic SIP (is_sip = true and frequency != monthly)
        const { data: expense } = await supabase.from('fixed_expenses')
          .select('is_sip, frequency, accumulated_funds')
          .eq('id', body.itemId)
          .eq('user_id', userId)
          .single();
        
        if (expense?.is_sip && expense.frequency !== 'monthly') {
          // Periodic SIP: Deduct paid amount from accumulated_funds
          console.log(`[MARK_PAID] Deducting paid amount from accumulated_funds for periodic SIP ${body.itemId}, amount: ${body.amount}`);
          const currentAccumulated = expense.accumulated_funds || 0;
          const newAccumulated = Math.max(0, currentAccumulated - body.amount); // Don't go negative
          const { error: updateErr } = await supabase
            .from('fixed_expenses')
            .update({ accumulated_funds: newAccumulated })
            .eq('id', body.itemId)
            .eq('user_id', userId);
          if (updateErr) {
            console.error('[MARK_PAID] Failed to update accumulated_funds for periodic SIP:', updateErr);
          } else {
            console.log(`[MARK_PAID] Updated periodic SIP accumulated_funds from ${currentAccumulated} to ${newAccumulated}`);
          }
        } else {
          // Regular monthly fixed expense: Reset to 0 (no accumulation needed)
          console.log(`[MARK_PAID] Resetting accumulated_funds for regular fixed expense ${body.itemId}`);
          const { error: resetErr } = await supabase
            .from('fixed_expenses')
            .update({ accumulated_funds: 0 })
            .eq('id', body.itemId)
            .eq('user_id', userId);
          if (resetErr) console.error('[MARK_PAID] Failed to reset accumulated funds:', resetErr);
        }
      }
      
      await logActivity(userId, body.itemType, 'paid', { id: body.itemId, name: itemName, amount: body.amount });
      await invalidateUserCache(userId);
      return json({ data: payment });
    }
    if (path === '/payments/mark-unpaid' && method === 'POST') {
      const body = await req.json();
      if (!body.itemId || !body.itemType) return error('itemId and itemType required');
      if (!['fixed_expense', 'investment', 'loan'].includes(body.itemType)) return error('Invalid itemType');
      
      // Fetch the item name for activity logging
      let itemName = 'Unknown';
      if (body.itemType === 'fixed_expense') {
        const { data: expense } = await supabase.from('fixed_expenses').select('name').eq('id', body.itemId).single();
        itemName = expense?.name || 'Unknown Expense';
      } else if (body.itemType === 'investment') {
        const { data: investment } = await supabase.from('investments').select('name').eq('id', body.itemId).single();
        itemName = investment?.name || 'Unknown Investment';
      } else if (body.itemType === 'loan') {
        const { data: loan } = await supabase.from('fixed_expenses').select('name').eq('id', body.itemId).eq('category', 'loan').single();
        itemName = loan?.name || 'Unknown Loan';
      }
      
      const month = new Date().toISOString().slice(0, 7);
      const { error: e } = await supabase
        .from('payments')
        .delete()
        .eq('user_id', userId)
        .eq('entity_id', body.itemId)
        .eq('entity_type', body.itemType)
        .eq('month', month);
      
      if (e) return error(e.message, 500);
      await logActivity(userId, body.itemType, 'unpaid', { id: body.itemId, name: itemName });
      await invalidateUserCache(userId);
      return json({ data: { success: true } });
    }
    if (path === '/payments/status' && method === 'GET') {
      const month = url.searchParams.get('month') || new Date().toISOString().slice(0, 7);
      const { data: payments } = await supabase
        .from('payments')
        .select('entity_type, entity_id')
        .eq('user_id', userId)
        .eq('month', month);
      
      const status: Record<string, boolean> = {};
      (payments || []).forEach((p: any) => {
        status[`${p.entity_type}:${p.entity_id}`] = true;
      });
      return json({ data: status });
    }
    if (path === '/payments/summary' && method === 'GET') {
      const month = url.searchParams.get('month') || new Date().toISOString().slice(0, 7);
      const { data: payments } = await supabase
        .from('payments')
        .select('entity_type, entity_id, amount')
        .eq('user_id', userId)
        .eq('month', month);
      
      const summary: Record<string, number> = {};
      (payments || []).forEach((p: any) => {
        const key = `${p.entity_type}:${p.entity_id}`;
        summary[key] = (summary[key] || 0) + (p.amount || 0);
      });
      return json({ data: Object.entries(summary).map(([key, total]) => {
        const [entityType, entityId] = key.split(':');
        return { entityType, entityId, totalPaid: total };
      })});
    }

    // SUBCATEGORIES
    if (path === '/user/subcategories' && method === 'GET') {
      const { data: prefs } = await supabase.from('user_preferences').select('subcategories').eq('user_id', userId).single();
      return json({ data: prefs?.subcategories || [] });
    }
    if (path === '/user/subcategories' && method === 'POST') {
      const body = await req.json();
      if (!body.subcategory || body.subcategory.length < 1 || body.subcategory.length > 50) return error('Subcategory must be 1-50 characters');
      
      const { data: prefs } = await supabase.from('user_preferences').select('subcategories').eq('user_id', userId).single();
      const current = prefs?.subcategories || [];
      if (current.includes(body.subcategory)) return json({ data: { subcategory: body.subcategory, subcategories: current } });
      
      const updated = [...current, body.subcategory];
      const { data, error: e } = await supabase
        .from('user_preferences')
        .upsert({ user_id: userId, subcategories: updated }, { onConflict: 'user_id' })
        .select()
        .single();
      
      if (e) return error(e.message, 500);
      return json({ data: { subcategory: body.subcategory, subcategories: updated } });
    }

    // EXPORT
    // EXPORT - Match old backend structure exactly
    if (path === '/export' && method === 'GET' || path === '/export/finances' && method === 'GET') {
      // Get user data with error handling
      const { data: userData, error: userErr } = await supabase.from('users').select('id, username').eq('id', userId).single();
      if (userErr || !userData) {
        console.error('Export: User fetch error:', userErr);
        return error('Failed to fetch user data', 500);
      }
      
      // Get all data needed for export
      const { data: dashboardData } = await supabase.rpc('get_dashboard_data', { p_user_id: userId, p_billing_period_id: null });
      
      // Get loans (auto-fetched from fixed expenses)
      const { data: loanExpenses } = await supabase
        .from('fixed_expenses')
        .select('*')
        .eq('user_id', userId);
      const loans = (loanExpenses || []).filter((exp: any) => 
        exp.category && exp.category.toLowerCase() === 'loan'
      ).map((exp: any) => {
        const amount = parseFloat(exp.amount) || 0;
        const emi = exp.frequency === 'monthly' ? amount :
          exp.frequency === 'quarterly' ? amount / 3 :
          exp.frequency === 'yearly' ? amount / 12 : amount;
        const remainingMonths = exp.end_date ? Math.max(1, Math.ceil(
          (new Date(exp.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 30)
        )) : 12;
        return {
          id: exp.id,
          name: exp.name,
          emi: Math.round(emi * 100) / 100,
          remainingTenureMonths: remainingMonths,
          principal: Math.round((emi * remainingMonths) * 100) / 100
        };
      });
      
      // Get activities
      const { data: activities } = await supabase
        .from('activities')
        .select('*')
        .eq('actor_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);
      
      // Get credit cards
      const { data: creditCards } = await supabase.from('credit_cards').select('*').eq('user_id', userId);
      
      // Get health data
      const { data: healthData } = await supabase.rpc('calculate_full_health', { p_user_id: userId });
      
      // Get constraint score
      const { data: constraint } = await supabase.from('constraint_scores').select('*').eq('user_id', userId).single();
      
      // Build export structure matching old backend
      const exportData = {
        exportDate: new Date().toISOString(),
        user: { id: userData.id, username: userData.username },
        health: healthData?.health || { remaining: 0, category: 'ok' },
        constraintScore: constraint ? {
          score: constraint.score,
          tier: constraint.tier,
          recentOverspends: constraint.recent_overspends || 0,
          decayAppliedAt: constraint.decay_applied_at,
          updatedAt: constraint.updated_at
        } : { score: 0, tier: 'green', recentOverspends: 0 },
        incomes: dashboardData?.incomes || [],
        fixedExpenses: (dashboardData?.fixedExpenses || []).map((e: any) => ({
          ...e,
          monthlyEquivalent: e.frequency === 'monthly' ? e.amount :
            e.frequency === 'quarterly' ? e.amount / 3 :
            e.amount / 12
        })),
        variableExpenses: (dashboardData?.variablePlans || []).map((plan: any) => {
          const actuals = (dashboardData?.variableActuals || []).filter((a: any) => a.planId === plan.id);
          return {
            ...plan,
            actuals,
            actualTotal: actuals.reduce((sum: number, a: any) => sum + (a.amount || 0), 0)
          };
        }),
        investments: dashboardData?.investments || [],
        futureBombs: dashboardData?.futureBombs || [],
        creditCards: creditCards || [],
        loans: loans,
        activities: (activities || []).map((a: any) => ({
          id: a.id,
          actorId: a.actor_id,
          entity: a.entity,
          action: a.action,
          payload: a.payload,
          createdAt: a.created_at
        })),
        alerts: [],
        summary: {
          totalIncome: (dashboardData?.incomes || []).reduce((sum: number, i: any) => 
            sum + ((i.amount || 0) / (i.frequency === 'monthly' ? 1 : i.frequency === 'quarterly' ? 3 : 12)), 0),
          totalFixedExpenses: (dashboardData?.fixedExpenses || []).reduce((sum: number, e: any) => {
            const monthly = e.frequency === 'monthly' ? e.amount : e.frequency === 'quarterly' ? e.amount / 3 : e.amount / 12;
            return sum + monthly;
          }, 0),
          totalVariableActual: (dashboardData?.variablePlans || []).reduce((sum: number, plan: any) => {
            const actuals = (dashboardData?.variableActuals || []).filter((a: any) => a.planId === plan.id);
            return sum + actuals.reduce((s: number, a: any) => s + (a.amount || 0), 0);
          }, 0),
          totalInvestments: (dashboardData?.investments || []).reduce((sum: number, i: any) => sum + (i.monthlyAmount || 0), 0),
          healthCategory: healthData?.health?.category || 'ok',
          remainingBalance: healthData?.health?.remaining || 0
        }
      };
      
      // Old backend returns exportData directly, not wrapped in { data: ... }
      return new Response(
        JSON.stringify(exportData),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return error('Not found', 404);

  } catch (err) {
    console.error('API Error:', err);
    return error('Internal server error', 500);
  }
});

