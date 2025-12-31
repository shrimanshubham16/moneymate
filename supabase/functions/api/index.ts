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
      const { data } = await supabase.rpc('get_dashboard_data', { p_user_id: userId, p_billing_period_id: null });
      
      // Get constraint score
      const { data: constraint } = await supabase.from('constraint_scores').select('*').eq('user_id', userId).single();
      
      // Get health from PostgreSQL function (matches /health/details exactly)
      const { data: healthData } = await supabase.rpc('calculate_full_health', { p_user_id: userId });
      
      // Get payment status for current month (matching old backend behavior)
      const month = new Date().toISOString().slice(0, 7); // YYYY-MM
      const { data: payments } = await supabase
        .from('payments')
        .select('entity_type, entity_id')
        .eq('user_id', userId)
        .eq('month', month);
      
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

      return json({
        data: {
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
      await logActivity(userId, 'income', 'added income source', { name: data.name, amount: data.amount, frequency: data.frequency });
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
      return json({ data }, 201);
    }
    if (path.match(/\/planning\/variable-expenses\/[^/]+\/actuals$/) && method === 'POST') {
      const planId = path.split('/')[3];
      const body = await req.json();
      const { data, error: e } = await supabase.from('variable_expense_actuals')
        .insert({ user_id: userId, plan_id: planId, amount: body.amount, incurred_at: body.incurred_at, justification: body.justification, subcategory: body.subcategory, payment_mode: body.payment_mode, credit_card_id: body.credit_card_id })
        .select().single();
      if (e) return error(e.message, 500);
      await logActivity(userId, 'variable_expense', 'added actual expense', { planId, amount: data.amount, paymentMode: data.payment_mode });
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
      const { data, error: e } = await supabase.from('investments')
        .insert({ user_id: userId, name: body.name, goal: body.goal, monthly_amount: body.monthly_amount })
        .select().single();
      if (e) return error(e.message, 500);
      await logActivity(userId, 'investment', 'added investment', { name: data.name, goal: data.goal, monthlyAmount: data.monthly_amount });
      return json({ data }, 201);
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
      
      return json({ data: usage || [] });
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
      return json({ data });
    }
    if (path.match(/\/debts\/credit-cards\/[^/]+\/reset-billing$/) && method === 'POST') {
      const id = path.split('/')[3];
      const { data, error: e } = await supabase.from('credit_cards').update({ current_expenses: 0, needs_bill_update: false }).eq('id', id).eq('user_id', userId).select().single();
      if (e) return error(e.message, 500);
      await logActivity(userId, 'credit_card', 'reset_billing', { id: data.id });
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
      return json({ data });
    }
    if (path.startsWith('/debts/credit-cards/') && method === 'DELETE') {
      const id = path.split('/').pop();
      const { data: deleted } = await supabase.from('credit_cards').select('name').eq('id', id).single();
      await supabase.from('credit_cards').delete().eq('id', id);
      if (deleted) await logActivity(userId, 'credit_card', 'deleted', { id, name: deleted.name });
      return json({ data: { deleted: true } });
    }

    // LOANS - Auto-fetch from fixed expenses where category = "Loan"
    if (path === '/debts/loans' && method === 'GET') {
      // Get fixed expenses with category "Loan" (case-insensitive)
      // Use LOWER() for case-insensitive matching since ilike might not work with all Supabase versions
      const { data: loanExpenses, error: loanErr } = await supabase
        .from('fixed_expenses')
        .select('*')
        .eq('user_id', userId);
      
      if (loanErr) {
        console.error('Error fetching loans:', loanErr);
        return json({ data: [] });
      }
      
      // Filter for "Loan" category (case-insensitive)
      const loanExpensesFiltered = (loanExpenses || []).filter((exp: any) => 
        exp.category && exp.category.toLowerCase() === 'loan'
      );
      
      // Convert fixed expenses to loan format
      const autoLoans = loanExpensesFiltered.map((exp: any) => {
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
          emi: Math.round(emi * 100) / 100, // Round to 2 decimal places
          remainingTenureMonths: remainingMonths,
          principal: Math.round((emi * remainingMonths) * 100) / 100
        };
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
      // activities table uses actor_id, not user_id
      const { data: activities, error: actErr } = await supabase
        .from('activities')
        .select('*')
        .eq('actor_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);
      
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
      
      // Format response with username
      const formatted = (activities || []).map((act: any) => ({
        id: act.id,
        actorId: act.actor_id,
        entity: act.entity,
        action: act.action,
        payload: act.payload,
        createdAt: act.created_at,
        username: usernameMap.get(act.actor_id) || 'Unknown User'
      }));
      
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
      
      const month = new Date().toISOString().slice(0, 7); // YYYY-MM
      const { data: existing } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', userId)
        .eq('entity_id', body.itemId)
        .eq('entity_type', body.itemType)
        .eq('month', month)
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
          .insert({ user_id: userId, entity_type: body.itemType, entity_id: body.itemId, month, amount: body.amount })
          .select()
          .single();
        payment = created;
      }
      
      await logActivity(userId, body.itemType, 'paid', { id: body.itemId, amount: body.amount });
      return json({ data: payment });
    }
    if (path === '/payments/mark-unpaid' && method === 'POST') {
      const body = await req.json();
      if (!body.itemId || !body.itemType) return error('itemId and itemType required');
      if (!['fixed_expense', 'investment', 'loan'].includes(body.itemType)) return error('Invalid itemType');
      
      const month = new Date().toISOString().slice(0, 7);
      const { error: e } = await supabase
        .from('payments')
        .delete()
        .eq('user_id', userId)
        .eq('entity_id', body.itemId)
        .eq('entity_type', body.itemType)
        .eq('month', month);
      
      if (e) return error(e.message, 500);
      await logActivity(userId, body.itemType, 'unpaid', { id: body.itemId });
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
        constraintScore: constraint || { score: 0, tier: 'green' },
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

