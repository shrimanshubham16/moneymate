// Combined API Edge Function - Replaces Railway Backend
// Handles all API operations with custom JWT auth

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================================
// (Email service removed - recovery is via recovery key only)
// ============================================================================



// ============================================================================
// NOTIFICATION HELPERS
// ============================================================================

type NotificationType = 'sharing_request' | 'sharing_accepted' | 'sharing_rejected' | 
                        'payment_reminder' | 'budget_alert' | 'health_update' | 'system';

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
  groupKey?: string;
}

async function createNotification(supabase: any, params: CreateNotificationParams): Promise<boolean> {
  try {
    // Check user preferences first
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', params.userId)
      .single();
    
    // Determine if we should send based on type and preferences
    const shouldNotify = {
      sharing_request: prefs?.in_app_sharing ?? true,
      sharing_accepted: prefs?.in_app_sharing ?? true,
      sharing_rejected: prefs?.in_app_sharing ?? true,
      payment_reminder: prefs?.in_app_payments ?? true,
      budget_alert: prefs?.in_app_budget_alerts ?? true,
      health_update: prefs?.in_app_system ?? true,
      system: prefs?.in_app_system ?? true,
    };
    
    if (!shouldNotify[params.type]) {
      console.log(`[NOTIFICATION] Skipping ${params.type} for user ${params.userId} - disabled in preferences`);
      return true;
    }
    
    // Deduplication: if groupKey is provided, skip if one already exists for this user
    if (params.groupKey) {
      const { data: existing } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', params.userId)
        .eq('group_key', params.groupKey)
        .limit(1);
      if (existing && existing.length > 0) {
        return true; // Already notified for this group
      }
    }
    
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        entity_type: params.entityType,
        entity_id: params.entityId,
        action_url: params.actionUrl,
        group_key: params.groupKey
      });
    
    if (error) {
      console.error('[NOTIFICATION_ERROR]', error);
      return false;
    }
    
    return true;
  } catch (e) {
    console.error('[NOTIFICATION_ERROR]', e);
    return false;
  }
}


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
    // E2E: Include encrypted fields for frontend decryption
    name_enc: card.name_enc,
    name_iv: card.name_iv,
    statementDate: card.statement_date,
    dueDate: card.due_date,
    billAmount: card.bill_amount,
    paidAmount: card.paid_amount,
    // E2E: Include encrypted bill/paid fields
    bill_amount_enc: card.bill_amount_enc,
    bill_amount_iv: card.bill_amount_iv,
    paid_amount_enc: card.paid_amount_enc,
    paid_amount_iv: card.paid_amount_iv,
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
  // P0 FIX: Correct order - must replace longer pattern first
  let path = url.pathname.replace('/functions/v1/api', '').replace('/api', '');
  // Ensure path starts with / for proper matching
  if (!path.startsWith('/')) path = '/' + path;
  const method = req.method;
  
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
  // Uses last_reset_billing_period column for reliable tracking (not activities)
  async function checkAndResetMonthlyPayments(userId: string): Promise<void> {
    try {
      // Get user preferences for month start day and last reset period
      const { data: prefs } = await supabase.from('user_preferences')
        .select('month_start_day, last_reset_billing_period').eq('user_id', userId).single();
      const monthStartDay = prefs?.month_start_day || 1;
      const lastResetPeriod = prefs?.last_reset_billing_period;
      
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
      
      // P0 FIX: Use dedicated column instead of querying activities (more reliable)
      if (lastResetPeriod === currentMonthStr) {
        // Already reset for this billing period, skip
        return;
      }
      
      console.log(`[MONTHLY_RESET] Resetting for user ${userId}, previous: ${previousMonthStr}, current: ${currentMonthStr}, lastReset: ${lastResetPeriod || 'never'}`);
      
      // Delete all payments from previous month (resets payment status for fixed expenses, investments, SIPs)
      const { error: deleteErr } = await supabase.from('payments')
        .delete()
        .eq('user_id', userId)
        .eq('month', previousMonthStr);
      
      if (deleteErr) {
        console.error(`[MONTHLY_RESET_ERROR] Failed to delete payments:`, deleteErr);
      }
      
      // P0 FIX: Delete variable expense actuals from previous billing period
      const { error: deleteActualsErr } = await supabase.from('variable_expense_actuals')
        .delete()
        .eq('user_id', userId)
        .gte('incurred_at', previousMonthStart.toISOString().split('T')[0])
        .lt('incurred_at', previousMonthEnd.toISOString().split('T')[0]);
      
      if (deleteActualsErr) {
        console.error(`[MONTHLY_RESET_ERROR] Failed to delete variable actuals:`, deleteActualsErr);
      }
      
      // Gradual cooldown of constraint (overspend risk) score
      // - If recent_overspends > 0: slow decay (-3/month), reduce recent_overspends by 1
      // - If recent_overspends == 0 (clean streak): faster decay (-7/month)
      // This ensures bad habits take several months to cool down, not just one
      let constraintDecayed = false;
      try {
        const { data: constraint } = await supabase.from('constraint_scores')
          .select('*').eq('user_id', userId).single();
        if (constraint && constraint.score > 0) {
          const currentOverspends = constraint.recent_overspends || 0;
          // Adaptive decay: slow if recent overspends exist, fast if clean streak
          const decayAmount = currentOverspends > 0 ? 3 : 7;
          const newScore = Math.max(0, constraint.score - decayAmount);
          // Decay recent_overspends by 1 per clean month (NOT reset to 0)
          const newOverspends = Math.max(0, currentOverspends - 1);
          const newTier = newScore >= 70 ? 'red' : newScore >= 40 ? 'amber' : 'green';
          await supabase.from('constraint_scores')
            .update({ score: newScore, tier: newTier, recent_overspends: newOverspends, updated_at: new Date().toISOString() })
            .eq('user_id', userId);
          constraintDecayed = true;
          console.log(`[CONSTRAINT_DECAY] Score: ${constraint.score} → ${newScore} (decay: ${decayAmount}), Overspends: ${currentOverspends} → ${newOverspends}`);
        }
      } catch (e) {
        console.error('[CONSTRAINT_DECAY_ERROR]', e);
      }
      
      // P0 FIX: Update last_reset_billing_period BEFORE logging activity
      // This prevents duplicate resets even if activity logging fails
      const { error: updateErr } = await supabase.from('user_preferences')
        .update({ last_reset_billing_period: currentMonthStr })
        .eq('user_id', userId);
      
      if (updateErr) {
        console.error(`[MONTHLY_RESET_ERROR] Failed to update last_reset_billing_period:`, updateErr);
        // Don't log activity if we couldn't update the tracking column
        return;
      }
      
      // Log monthly reset activity (only once per billing period now)
      await logActivity(userId, 'system', 'monthly_reset', {
        month: currentMonthStr,
        previousMonth: previousMonthStr,
        paymentsDeleted: !deleteErr,
        variableActualsDeleted: !deleteActualsErr,
        constraintDecayed,
        resetAt: new Date().toISOString()
      });
      
      console.log(`[MONTHLY_RESET] Completed for ${currentMonthStr}`);
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

      // Check existing username
      const { data: existingUser } = await supabase
        .from('users').select('id').eq('username', username).single();
      if (existingUser) return error('Username already taken', 409);

      // Create user
      const passwordHash = await hashPassword(password);
      const { data: user, error: insertErr } = await supabase
        .from('users')
        .insert({ 
          username, 
          password_hash: passwordHash, 
          encryption_salt: encryptionSalt, 
          recovery_key_hash: recoveryKeyHash 
        })
        .select('id, username').single();
      
      if (insertErr) {
        console.error('Signup error:', insertErr);
        return error('Failed to create user', 500);
      }

      // Create defaults
      await supabase.from('user_preferences').insert({ user_id: user.id, month_start_day: 1, currency: 'INR' });
      await supabase.from('constraint_scores').insert({ user_id: user.id, score: 0, tier: 'green' });

      const token = await createToken(user.id, user.username);
      return json({ 
        access_token: token, 
        user: { id: user.id, username: user.username }, 
        encryption_salt: encryptionSalt
      }, 201);
    }
    

    // RECOVER WITH RECOVERY KEY
    if (path === '/auth/recover-with-key' && method === 'POST') {
      const { username, recoveryKey, newPassword } = await req.json();
      if (!username || !recoveryKey || !newPassword) return error('Username, recovery key, and new password required');
      if (newPassword.length < 8) return error('Password must be at least 8 characters');

      const { data: user, error: userErr } = await supabase
        .from('users')
        .select('id, recovery_key_hash, encryption_salt, password_hash')
        .eq('username', username)
        .single();
      if (userErr || !user) return error('User not found', 404);

      const encoder = new TextEncoder();
      const recoveryData = encoder.encode(recoveryKey.trim().toLowerCase());
      const recoveryHashBuffer = await crypto.subtle.digest('SHA-256', recoveryData);
      const recoveryHashArray = Array.from(new Uint8Array(recoveryHashBuffer));
      const recoveryHashB64 = btoa(String.fromCharCode(...recoveryHashArray));

      if (recoveryHashB64 !== user.recovery_key_hash) {
        return error('Invalid recovery key. Please check your 24-word recovery phrase.');
      }

      const newPasswordHash = await hashPassword(newPassword);
      await supabase.from('users').update({
        password_hash: newPasswordHash,
        failed_login_attempts: 0,
        account_locked_until: null
      }).eq('id', user.id);

      const token = await createToken(user.id, username);
      return json({
        message: 'Password reset via recovery key successful',
        access_token: token,
        encryption_salt: user.encryption_salt
      });
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
        return json({ 
          access_token: token, 
          user: { 
            id: user.id, 
            username: user.username
          }, 
          encryption_salt: encryptionSalt 
        });
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
      // Direct queries to bypass potentially broken RPC
      const { data: incomes } = await supabase.from('incomes').select('*').eq('user_id', userId);
      const { data: fixedExpenses } = await supabase.from('fixed_expenses').select('*').eq('user_id', userId);
      const { data: variablePlans } = await supabase.from('variable_expense_plans').select('*').eq('user_id', userId);
      // FIX: Added user_id filter - was missing and fetching ALL users' actuals!
      const { data: variableActuals } = await supabase.from('variable_expense_actuals').select('*').eq('user_id', userId);
      const { data: investments } = await supabase.from('investments').select('*').eq('user_id', userId);
      const { data: creditCards } = await supabase.from('credit_cards').select('*').eq('user_id', userId);
      const { data: loans } = await supabase.from('loans').select('*').eq('user_id', userId);
      
      // Fetch user's health thresholds
      const { data: userThresholds } = await supabase.from('health_thresholds').select('*').eq('user_id', userId).single();
      const ht = userThresholds || { good_min: 20, ok_min: 10, ok_max: 19.99, not_well_max: 9.99 };
      
      // Fetch future bombs for defusal SIP calculation
      const { data: futureBombs } = await supabase.from('future_bombs').select('*').eq('user_id', userId);
      
      // Calculate totals — filter out incomes excluded from health
      const healthIncomeItems = (incomes || []).filter((i: any) => i.include_in_health !== false);
      const incomeItems = healthIncomeItems.map((i: any) => ({
        ...i,
        monthlyEquivalent: i.frequency === 'monthly' ? i.amount : 
          i.frequency === 'quarterly' ? i.amount / 3 : i.amount / 12
      }));
      const totalIncome = incomeItems.reduce((sum: number, i: any) => sum + i.monthlyEquivalent, 0);
      
      // Fixed expenses — count ALL (commitment exists whether paid or not)
      const fixedExpenseItems = (fixedExpenses || []).map((e: any) => ({
        ...e,
        monthlyEquivalent: e.frequency === 'monthly' ? e.amount :
          e.frequency === 'quarterly' ? e.amount / 3 : e.amount / 12
      }));
      const totalFixedExpenses = fixedExpenseItems.reduce((sum: number, e: any) => sum + e.monthlyEquivalent, 0);
      
      // Variable expenses — exclude ExtraCash & CreditCard payment modes from actual totals
      const variablePlanItems = (variablePlans || []).map((p: any) => {
        const allActuals = (variableActuals || []).filter((a: any) => a.plan_id === p.id);
        const healthActuals = allActuals.filter((a: any) => a.payment_mode !== 'ExtraCash' && a.payment_mode !== 'CreditCard');
        const calcActualTotal = healthActuals.reduce((s: number, a: any) => s + (parseFloat(a.amount) || 0), 0);
        return { ...p, actuals: allActuals, actualTotal: calcActualTotal };
      });
      const totalVariablePlanned = variablePlanItems.reduce((sum: number, p: any) => sum + (p.planned || 0), 0);
      const totalVariableActual = variablePlanItems.reduce((sum: number, p: any) => sum + p.actualTotal, 0);
      
      // Investments — count ALL active (commitment exists whether paid or not)
      const activeInvestments = (investments || []).filter((i: any) => i.status === 'active');
      const totalInvestments = activeInvestments.reduce((sum: number, i: any) => sum + (i.monthly_amount || 0), 0);
      
      const creditCardItems = (creditCards || []).map((c: any) => ({
        ...c,
        remaining: Math.max(0, (c.bill_amount || 0) - (c.paid_amount || 0))
      }));
      const totalCreditCardDue = creditCardItems.reduce((sum: number, c: any) => sum + c.remaining, 0);
      
      const totalLoanEmi = (loans || []).reduce((sum: number, l: any) => sum + (l.emi || 0), 0);
      
      // Calculate month progress FIRST (needed for proration)
      const today = new Date();
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      const monthProgress = today.getDate() / daysInMonth;
      const remainingDaysRatio = 1 - monthProgress;
      
      // Calculate prorated variable expenses (for remaining days of month)
      const totalVariableProrated = totalVariablePlanned * remainingDaysRatio;
      const effectiveVariable = Math.max(totalVariableActual, totalVariableProrated);
      
      // Future Bomb Defusal SIP — the monthly amount needed to defuse bombs 1 month before due
      const totalBombSip = (futureBombs || []).reduce((sum: number, bomb: any) => {
        const remaining = Math.max(0, (bomb.total_amount || 0) - (bomb.saved_amount || 0));
        if (remaining <= 0) return sum;
        const dueDate = new Date(bomb.due_date);
        // Defuse 1 month before due
        const defuseBy = new Date(dueDate.getFullYear(), dueDate.getMonth() - 1, dueDate.getDate());
        const msPerMonth = 30.44 * 24 * 60 * 60 * 1000;
        const monthsLeft = Math.max(1, Math.floor((defuseBy.getTime() - today.getTime()) / msPerMonth));
        return sum + (remaining / monthsLeft);
      }, 0);
      
      // Calculate remaining (available funds)
      const totalExpenses = totalFixedExpenses + effectiveVariable + totalInvestments + totalCreditCardDue + totalBombSip;
      const remaining = totalIncome - totalExpenses;
      
      // Determine category using PERCENTAGE-BASED thresholds (matching frontend)
      const healthScore = totalIncome > 0
        ? Math.max(0, Math.min(100, (remaining / totalIncome) * 100))
        : 0;
      let category: string;
      if (healthScore >= ht.good_min) {
        category = 'good';
      } else if (healthScore >= ht.ok_min && healthScore <= ht.ok_max) {
        category = 'ok';
      } else if (healthScore >= 0 && healthScore <= ht.not_well_max) {
        category = 'not_well';
      } else {
        category = 'worrisome';
      }
      
      const healthData = {
        health: {
          remaining: Math.round(remaining),
          category
        },
        formula: "Income - (Fixed + max(Prorated,Actual) Variable + Investments + CreditCards + BombSIP)",
        calculation: `${Math.round(totalIncome)} - (${Math.round(totalFixedExpenses)} + ${Math.round(effectiveVariable)} + ${Math.round(totalInvestments)} + ${Math.round(totalCreditCardDue)} + ${Math.round(totalBombSip)}) = ${Math.round(remaining)}`,
        monthProgress,
        // Structure expected by frontend
        totalIncome: Math.round(totalIncome),
        obligations: {
          totalFixed: Math.round(totalFixedExpenses),
          totalVariableEffective: Math.round(effectiveVariable),
          totalVariablePlanned: Math.round(totalVariablePlanned),
          totalVariableProrated: Math.round(totalVariableProrated),
          totalVariableActual: Math.round(totalVariableActual),
          totalInvestments: Math.round(totalInvestments),
          totalCreditCardDue: Math.round(totalCreditCardDue),
          totalBombSip: Math.round(totalBombSip)
        },
        breakdown: {
          income: {
            total: Math.round(totalIncome),
            items: incomeItems
          },
          expenses: {
            fixed: {
              total: Math.round(totalFixedExpenses),
              items: fixedExpenseItems
            },
            variable: {
              total: Math.round(effectiveVariable),
              planned: Math.round(totalVariablePlanned),
              prorated: Math.round(totalVariableProrated),
              actual: Math.round(totalVariableActual),
              items: variablePlanItems
            },
            investments: {
              total: Math.round(totalInvestments),
              items: activeInvestments
            },
            bombDefusal: {
              total: Math.round(totalBombSip),
              items: (futureBombs || []).map((b: any) => ({
                name: b.name,
                totalAmount: b.total_amount,
                savedAmount: b.saved_amount,
                dueDate: b.due_date
              }))
            }
          },
          debts: {
            creditCards: {
              total: Math.round(totalCreditCardDue),
              items: creditCardItems
            },
            loans: {
              total: Math.round(totalLoanEmi),
              items: loans || []
            }
          }
        }
      };

      return json({ data: healthData });
    }
    
    // ========================================================================
    // USER PROFILE ROUTES
    // ========================================================================
    
    // GET user profile
    if (path === '/user/profile' && method === 'GET') {
      const { data: profile, error: profileErr } = await supabase
        .from('users')
        .select('id, username, encryption_salt, avatar_url, created_at')
        .eq('id', userId)
        .single();
      
      if (profileErr || !profile) return error('User not found', 404);
      return json({ data: profile });
    }
    
    // UPDATE user avatar URL
    if (path === '/user/avatar' && method === 'PUT') {
      const body = await req.json();
      const { avatar_url } = body;
      
      const { error: updateErr } = await supabase
        .from('users')
        .update({ avatar_url })
        .eq('id', userId);
      
      if (updateErr) return error(updateErr.message, 500);
      return json({ data: { avatar_url } });
    }
    
    // UPDATE user password (authenticated - requires old password)
    if (path === '/user/password' && method === 'PUT') {
      const { oldPassword, newPassword, encryptedData } = await req.json();
      
      if (!oldPassword || !newPassword) {
        return error('Old and new password required');
      }
      
      if (newPassword.length < 8) return error('Password must be at least 8 characters');
      
      // Verify old password
      const { data: currentUser, error: userErr } = await supabase
        .from('users')
        .select('password_hash')
        .eq('id', userId)
        .single();
      
      if (userErr || !currentUser) return error('User not found', 404);
      
      const valid = await verifyPassword(oldPassword, currentUser.password_hash);
      if (!valid) return error('Current password is incorrect');
      
      // Update password
      const newPasswordHash = await hashPassword(newPassword);
      await supabase.from('users').update({
        password_hash: newPasswordHash
      }).eq('id', userId);
      
      // If re-encrypted data provided, update all entities
      if (encryptedData) {
        console.log('[RE_ENCRYPT] Processing re-encrypted data for password change');
        // This is handled by the reEncryptionService on the client side
        // which makes individual API calls to update each entity
      }
      
      return json({ message: 'Password updated successfully' });
    }

    // ENABLE user encryption
    if (path === '/user/enable-encryption' && method === 'POST') {
      let body;
      try {
        body = await req.json();
      } catch (e) {
        console.error('[ENABLE_ENCRYPTION] Failed to parse request body:', e);
        return error('Invalid request body');
      }
      
      const { encryption_salt, recovery_key_hash, password } = body;
      console.log('[ENABLE_ENCRYPTION] Received request for user:', userId);
      console.log('[ENABLE_ENCRYPTION] Has salt:', !!encryption_salt, 'Has hash:', !!recovery_key_hash, 'Has password:', !!password);
      
      if (!encryption_salt || !recovery_key_hash || !password) {
        return error('Salt, recovery key hash, and password required');
      }
      
      // Verify password
      const { data: currentUser, error: userErr } = await supabase
        .from('users')
        .select('password_hash, encryption_salt')
        .eq('id', userId)
        .single();
      
      console.log('[ENABLE_ENCRYPTION] User lookup:', { found: !!currentUser, hasPasswordHash: !!currentUser?.password_hash, error: userErr?.message });
      
      if (userErr || !currentUser) return error('User not found', 404);
      
      // Check if already encrypted
      if (currentUser.encryption_salt) {
        return error('Encryption is already enabled for this account');
      }
      
      // If no password hash stored, user might be using Supabase Auth directly
      if (!currentUser.password_hash) {
        console.log('[ENABLE_ENCRYPTION] No password_hash found - user may need to set password first');
        return error('Please set a password in your account settings first');
      }
      
      const valid = await verifyPassword(password, currentUser.password_hash);
      console.log('[ENABLE_ENCRYPTION] Password verification:', valid);
      if (!valid) return error('Password is incorrect');
      
      // Update user with encryption settings
      const { error: updateErr } = await supabase.from('users').update({
        encryption_salt,
        recovery_key_hash
      }).eq('id', userId);
      
      if (updateErr) return error('Failed to enable encryption');
      
      return json({ message: 'Encryption enabled successfully' });
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
      
      // Handle shared view
      const dashUrl = new URL(req.url);
      const viewParam = dashUrl.searchParams.get('view') || 'me';
      
      // Get target user IDs for data fetching
      let targetUserIds: string[] = [userId];
      
      if (viewParam === 'merged') {
        // Get all shared accounts this user is a member of
        // FIX: Select only columns that actually exist in the table
        const { data: myMemberships, error: smErr } = await supabase.from('shared_members')
          .select('id, shared_account_id, user_id, role')
          .eq('user_id', userId);
        
        console.log('[DEBUG_MERGED_1] User memberships for', userId, ':', JSON.stringify(myMemberships), 'error:', smErr?.message);
        
        if (myMemberships?.length) {
          const sharedAccountIds = myMemberships.map((m: any) => m.shared_account_id);
          
          // Get all other members in those shared accounts
          const { data: otherMembers, error: omErr } = await supabase.from('shared_members')
            .select('id, user_id, shared_account_id')
            .in('shared_account_id', sharedAccountIds)
            .neq('user_id', userId);
          
          console.log('[DEBUG_MERGED_2] Other members in accounts', sharedAccountIds, ':', JSON.stringify(otherMembers), 'error:', omErr?.message);
          
          if (otherMembers?.length) {
            targetUserIds = [userId, ...otherMembers.map((m: any) => m.user_id)];
          }
        }
        
        console.log('[DEBUG_MERGED_3] Final targetUserIds:', targetUserIds);
        console.log('[DASHBOARD_VIEW] Merged view, target users:', targetUserIds);
      } else if (viewParam !== 'me' && viewParam) {
        // Specific user view - verify access via shared accounts
        const { data: myMemberships } = await supabase.from('shared_members')
          .select('shared_account_id')
          .eq('user_id', userId);
        
        const sharedAccountIds = (myMemberships || []).map((m: any) => m.shared_account_id);
        
        const { data: hasAccess } = await supabase.from('shared_members')
          .select('id')
          .in('shared_account_id', sharedAccountIds)
          .eq('user_id', viewParam)
          .limit(1);
        
        if (hasAccess?.length) {
          targetUserIds = [viewParam];
          console.log('[DASHBOARD_VIEW] Viewing user:', viewParam);
        } else {
          console.log('[DASHBOARD_VIEW] No access to user:', viewParam);
        }
      }
      
      const perfStart = Date.now();
      const cacheKey = `dashboard:${userId}:${viewParam}`;
      const nocache = dashUrl.searchParams.get('nocache') === 'true';
      
      // Try Redis cache first (skip if nocache=true)
      const cached = nocache ? null : await redisGet(cacheKey);
      if (cached) {
        // Always fetch fresh notification count even on cache hit
        const { count: cachedNotifCount } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('is_read', false);
        cached._notificationCount = cachedNotifCount || 0;
        const cacheTime = Date.now() - perfStart;
        console.log('[EDGE_PERF_CACHE] Dashboard from cache', { cacheTime, userId, viewParam });
        return json({ data: cached });
      }
      
      const timings: any = {};
      
      // Query 1: Dashboard data
      const t0 = Date.now();
      const { data, error: rpcError } = await supabase.rpc('get_dashboard_data', { p_user_id: userId, p_billing_period_id: null });
      
      // WORKAROUND: Direct queries to bypass broken RPC function
      // For merged/specific user view: Fetch target users' items for widget display
      // Shared users' encrypted items will show as [Private] on frontend
      // FIX: Use targetUserIds for both merged AND specific user views (not just merged)
      const queryUserIds = viewParam === 'me' ? [userId] : targetUserIds;
      
      const { data: directIncomes } = await supabase.from('incomes').select('*').in('user_id', queryUserIds);
      const { data: directFixedExpenses } = await supabase.from('fixed_expenses').select('*').in('user_id', queryUserIds);
      const { data: directVariablePlans } = await supabase.from('variable_expense_plans').select('*').in('user_id', queryUserIds);
      const { data: directVariableActuals } = await supabase.from('variable_expense_actuals').select('*').in('user_id', queryUserIds);
      const { data: directInvestments } = await supabase.from('investments').select('*').in('user_id', queryUserIds);
      const { data: directFutureBombs } = await supabase.from('future_bombs').select('*').in('user_id', queryUserIds);
      
      // Fetch shared users' aggregates for accurate health calculation
      // (Individual encrypted items can't be summed, but aggregates are plaintext)
      // - For merged view: fetch aggregates for OTHER users
      // - For specific user view: fetch aggregate for THAT specific user (we can't decrypt their items)
      let sharedUserAggregates: any[] = [];
      const isSpecificUserView = viewParam && viewParam !== 'merged' && viewParam !== userId;
      
      if (viewParam === 'merged' && targetUserIds.length > 1) {
        // Merged view: fetch aggregates for all shared users (not self)
        const sharedUserIds = targetUserIds.filter(id => id !== userId);
        const { data: aggregates } = await supabase.from('user_aggregates')
          .select('*')
          .in('user_id', sharedUserIds);
        sharedUserAggregates = aggregates || [];
      } else if (isSpecificUserView) {
        // Specific user view: fetch aggregate for THAT specific user
        const { data: aggregates } = await supabase.from('user_aggregates')
          .select('*')
          .eq('user_id', viewParam);
        sharedUserAggregates = aggregates || [];
      }
      
      // Normalize variable plans with actuals/actualTotal
      const variablePlans = (directVariablePlans || []).map((plan: any) => {
        const actuals = (directVariableActuals || []).filter((a: any) => a.plan_id === plan.id || a.planId === plan.id);
        const actualTotal = actuals.reduce((sum: number, a: any) => sum + (parseFloat(a.amount) || 0), 0);
        return { ...plan, actuals, actualTotal };
      });

      timings.dashboardData = Date.now() - t0;
      
      // Query 2: Constraint score
      const t1 = Date.now();
      const { data: constraint } = await supabase.from('constraint_scores').select('*').eq('user_id', userId).single();
      timings.constraintScore = Date.now() - t1;
      
      // Query 2.5: Credit cards (needed for health calc) — use queryUserIds for shared/merged view
      const { data: directCreditCards } = await supabase.from('credit_cards').select('*').in('user_id', queryUserIds);
      
      // Query 3: Health calculation - INLINE to match /health/details exactly
      const t2 = Date.now();
      const today = new Date();
      
      // Fetch user's configurable health thresholds
      const { data: userHealthThresholds } = await supabase.from('health_thresholds').select('*').eq('user_id', userId).single();
      const ht = userHealthThresholds || { good_min: 20, ok_min: 10, ok_max: 19.99, not_well_max: 9.99 };
      
      // Calculate health using same logic as /health/details endpoint
      // Filter out incomes where include_in_health is explicitly false
      const healthIncomes = (directIncomes || []).filter((i: any) => i.include_in_health !== false);
      const incomeItems = healthIncomes.map((i: any) => ({
        monthlyEquivalent: i.frequency === 'monthly' ? i.amount : 
          i.frequency === 'quarterly' ? i.amount / 3 : i.amount / 12
      }));
      const calcTotalIncome = incomeItems.reduce((sum: number, i: any) => sum + i.monthlyEquivalent, 0);
      
      const fixedItems = (directFixedExpenses || []).map((e: any) => ({
        monthlyEquivalent: e.frequency === 'monthly' ? e.amount :
          e.frequency === 'quarterly' ? e.amount / 3 : e.amount / 12
      }));
      const calcTotalFixed = fixedItems.reduce((sum: number, e: any) => sum + e.monthlyEquivalent, 0);
      
      const calcTotalVariablePlanned = (directVariablePlans || []).reduce((sum: number, p: any) => sum + (p.planned || 0), 0);
      // Exclude ExtraCash and CreditCard payment modes from actual totals (they don't reduce available funds)
      const calcTotalVariableActual = (directVariablePlans || []).reduce((sum: number, p: any) => {
        const actuals = (directVariableActuals || []).filter((a: any) => a.plan_id === p.id && a.payment_mode !== 'ExtraCash' && a.payment_mode !== 'CreditCard');
        return sum + actuals.reduce((s: number, a: any) => s + (a.amount || 0), 0);
      }, 0);
      
      const activeInv = (directInvestments || []).filter((i: any) => i.status === 'active');
      const calcTotalInvestments = activeInv.reduce((sum: number, i: any) => sum + (i.monthly_amount || 0), 0);
      
      const calcTotalCreditCard = (directCreditCards || []).reduce((sum: number, c: any) => 
        sum + Math.max(0, (c.bill_amount || 0) - (c.paid_amount || 0)), 0);
      
      // Calculate month progress for proration
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      const monthProgress = today.getDate() / daysInMonth;
      const remainingDaysRatio = 1 - monthProgress;
      
      // Prorated variable expenses
      const calcVariableProrated = calcTotalVariablePlanned * remainingDaysRatio;
      const calcEffectiveVariable = Math.max(calcTotalVariableActual, calcVariableProrated);
      
      // Future Bomb Defusal SIP — monthly amount needed to defuse bombs 1 month before due
      const calcBombSip = (directFutureBombs || []).reduce((sum: number, bomb: any) => {
        const bombRemaining = Math.max(0, (bomb.total_amount || 0) - (bomb.saved_amount || 0));
        if (bombRemaining <= 0) return sum;
        const dueDate = new Date(bomb.due_date);
        const defuseBy = new Date(dueDate.getFullYear(), dueDate.getMonth() - 1, dueDate.getDate());
        const msPerMonth = 30.44 * 24 * 60 * 60 * 1000;
        const monthsLeft = Math.max(1, Math.floor((defuseBy.getTime() - today.getTime()) / msPerMonth));
        return sum + (bombRemaining / monthsLeft);
      }, 0);
      
      // Final remaining
      const calcRemaining = calcTotalIncome - (calcTotalFixed + calcEffectiveVariable + calcTotalInvestments + calcTotalCreditCard + calcBombSip);
      
      // Category — use PERCENTAGE-BASED configurable thresholds (matching frontend)
      const calcHealthScore = calcTotalIncome > 0
        ? Math.max(0, Math.min(100, (calcRemaining / calcTotalIncome) * 100))
        : 0;
      let calcCategory: string;
      if (calcHealthScore >= ht.good_min) {
        calcCategory = 'good';
      } else if (calcHealthScore >= ht.ok_min && calcHealthScore <= ht.ok_max) {
        calcCategory = 'ok';
      } else if (calcHealthScore >= 0 && calcHealthScore <= ht.not_well_max) {
        calcCategory = 'not_well';
      } else {
        calcCategory = 'worrisome';
      }
      
      const healthData = {
        health: {
          remaining: Math.round(calcRemaining),
          category: calcCategory,
          score: Math.round(calcHealthScore * 100) / 100
        }
      };
      timings.healthCalc = Date.now() - t2;
      
      // Query 4: Payment status - P0 FIX: Use billing period month, not calendar month
      const t3 = Date.now();
      
      // Get user's billing period month (same logic as monthly reset)
      const { data: prefs } = await supabase.from('user_preferences')
        .select('month_start_day').eq('user_id', userId).single();
      const monthStartDay = prefs?.month_start_day || 1;
      
      // Note: 'today' already defined above for health calc
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
      
      // Format response using DIRECT QUERIES (bypassing broken RPC function)
      
      // Map incomes
      const finalIncomes = (directIncomes || []).map((i: any) => ({
        id: i.id,
        userId: i.user_id,
        source: i.name,
        source_enc: i.source_enc,
        source_iv: i.source_iv,
        amount: i.amount,
        amount_enc: i.amount_enc,
        amount_iv: i.amount_iv,
        frequency: i.frequency,
        category: i.category,
        startDate: i.start_date,
        endDate: i.end_date,
        includeInHealth: i.include_in_health !== false, // default true
        incomeType: i.income_type || 'regular',
        rsuTicker: i.rsu_ticker,
        rsuGrantCount: i.rsu_grant_count,
        rsuVestingSchedule: i.rsu_vesting_schedule,
        rsuCurrency: i.rsu_currency,
        rsuStockPrice: i.rsu_stock_price ? parseFloat(i.rsu_stock_price) : null,
        rsuPriceUpdatedAt: i.rsu_price_updated_at,
        rsuTaxRate: i.rsu_tax_rate != null ? parseFloat(i.rsu_tax_rate) : 33,
        rsuExpectedDecline: i.rsu_expected_decline != null ? parseFloat(i.rsu_expected_decline) : 20,
        rsuConversionRate: i.rsu_conversion_rate ? parseFloat(i.rsu_conversion_rate) : null
      }));
      
      // Map fixed expenses
      const finalFixedExpenses = (directFixedExpenses || []).map((e: any) => ({
        id: e.id,
        userId: e.user_id,
        name: e.name,
        name_enc: e.name_enc,
        name_iv: e.name_iv,
        amount: e.amount,
        amount_enc: e.amount_enc,
        amount_iv: e.amount_iv,
        frequency: e.frequency,
        category: e.category,
        startDate: e.start_date,
        endDate: e.end_date,
        is_sip_flag: e.is_sip || e.is_sip_flag || false,
        isSipFlag: e.is_sip || e.is_sip_flag || false,
        accumulated_funds: e.accumulated_funds || 0,
        accumulated_funds_enc: e.accumulated_funds_enc,
        accumulated_funds_iv: e.accumulated_funds_iv,
        paid: paymentStatus[`fixed_expense:${e.id}`] || false
      }));
      
      // Map variable plans with actuals
      const finalVariablePlans = (directVariablePlans || []).map((plan: any) => {
        const actuals = (directVariableActuals || []).filter((a: any) => a.plan_id === plan.id).map((a: any) => ({
          id: a.id,
          planId: a.plan_id,
          userId: a.user_id,
          amount: a.amount,
          amount_enc: a.amount_enc,
          amount_iv: a.amount_iv,
          incurredAt: a.incurred_at,
          justification: a.justification,
          justification_enc: a.justification_enc,
          justification_iv: a.justification_iv,
          subcategory: a.subcategory,
          paymentMode: a.payment_mode,
          creditCardId: a.credit_card_id
        }));
        const calcActualTotal = actuals.reduce((s: number, a: any) => s + (parseFloat(a.amount) || 0), 0);
        return {
          id: plan.id,
          userId: plan.user_id,
          name: plan.name,
          name_enc: plan.name_enc,
          name_iv: plan.name_iv,
          planned: plan.planned,
          planned_enc: plan.planned_enc,
          planned_iv: plan.planned_iv,
          category: plan.category,
          startDate: plan.start_date,
          endDate: plan.end_date,
          actuals,
          actualTotal: calcActualTotal
        };
      });
      
      // Map investments
      const finalInvestments = (directInvestments || []).map((i: any) => ({
        id: i.id,
        userId: i.user_id,
        name: i.name,
        name_enc: i.name_enc,
        name_iv: i.name_iv,
        goal: i.goal,
        goal_enc: i.goal_enc,
        goal_iv: i.goal_iv,
        monthlyAmount: i.monthly_amount,
        monthly_amount_enc: i.monthly_amount_enc,
        monthly_amount_iv: i.monthly_amount_iv,
        status: i.status,
        isPriority: i.is_priority || false,
        accumulated_funds: i.accumulated_funds || 0,
        accumulated_funds_enc: i.accumulated_funds_enc,
        accumulated_funds_iv: i.accumulated_funds_iv,
        startDate: i.start_date,
        paid: paymentStatus[`investment:${i.id}`] || false
      }));
      
      // Map future bombs with dynamic computed fields
      const now = new Date();
      const finalFutureBombs = (directFutureBombs || []).map((fb: any) => {
        const totalAmount = parseFloat(fb.total_amount) || 0;
        const savedAmount = parseFloat(fb.saved_amount) || 0;
        const remaining = Math.max(0, totalAmount - savedAmount);
        const dueDate = fb.due_date ? new Date(fb.due_date) : new Date();
        const monthsUntilDue = Math.max(0, (dueDate.getFullYear() - now.getFullYear()) * 12 + (dueDate.getMonth() - now.getMonth()));
        // Defuse 1 month early: target completion 1 month before due date
        const defusalMonths = Math.max(1, monthsUntilDue - 1);
        const monthlyEquivalent = remaining > 0 ? Math.ceil(remaining / defusalMonths) : 0;
        const preparednessRatio = totalAmount > 0 ? Math.min(1, savedAmount / totalAmount) : 0;
        
        return {
          id: fb.id,
          userId: fb.user_id,
          name: fb.name,
          name_enc: fb.name_enc,
          name_iv: fb.name_iv,
          totalAmount,
          total_amount_enc: fb.total_amount_enc,
          total_amount_iv: fb.total_amount_iv,
          savedAmount,
          saved_amount_enc: fb.saved_amount_enc,
          saved_amount_iv: fb.saved_amount_iv,
          dueDate: fb.due_date,
          targetDate: fb.target_date,
          status: fb.status,
          // Computed fields
          monthlyEquivalent,
          preparednessRatio,
          monthsUntilDue,
          defusalMonths,
          remaining
        };
      });
      
      // Map credit cards for frontend (camelCase)
      const finalCreditCards = (directCreditCards || []).map((c: any) => ({
        id: c.id,
        userId: c.user_id,
        name: c.name,
        name_enc: c.name_enc,
        name_iv: c.name_iv,
        statementDate: c.statement_date,
        dueDate: c.due_date,
        billAmount: c.bill_amount || 0,
        bill_amount_enc: c.bill_amount_enc,
        bill_amount_iv: c.bill_amount_iv,
        paidAmount: c.paid_amount || 0,
        paid_amount_enc: c.paid_amount_enc,
        paid_amount_iv: c.paid_amount_iv,
        currentExpenses: c.current_expenses || 0,
        billingDate: c.billing_date,
        needsBillUpdate: c.needs_bill_update,
        createdAt: c.created_at
      }));

      // Fetch loans for this user set
      const { data: directLoans } = await supabase.from('loans').select('*').in('user_id', targetUserIds);

      // Fetch activities
      const { data: directActivities } = await supabase.from('activities')
        .select('*').in('actor_id', targetUserIds)
        .order('created_at', { ascending: false }).limit(100);

      // Fetch preferences
      const { data: userPrefs } = await supabase.from('user_preferences')
        .select('*').eq('user_id', userId).single();

      const responseData = {
        incomes: finalIncomes,
        fixedExpenses: finalFixedExpenses,
        variablePlans: finalVariablePlans,
        investments: finalInvestments,
        futureBombs: finalFutureBombs,
        creditCards: finalCreditCards,
        loans: directLoans || [],
        activities: (directActivities || []).map((a: any) => ({
          id: a.id,
          actorId: a.actor_id,
          entity: a.entity,
          action: a.action,
          payload: a.payload,
          createdAt: a.created_at
        })),
        preferences: userPrefs ? {
          monthStartDay: userPrefs.month_start_day || 1,
          currency: userPrefs.currency || 'INR'
        } : { monthStartDay: 1, currency: 'INR' },
        health: healthData?.health || { remaining: 0, category: 'ok', score: 0 },
        healthThresholds: { good_min: ht.good_min, ok_min: ht.ok_min, ok_max: ht.ok_max, not_well_max: ht.not_well_max },
        constraintScore: constraint ? {
          score: constraint.score,
          tier: constraint.tier,
          recentOverspends: constraint.recent_overspends || 0,
          decayAppliedAt: constraint.decay_applied_at,
          updatedAt: constraint.updated_at
        } : { score: 0, tier: 'green', recentOverspends: 0 },
        alerts: [],
        // Include shared users' aggregates for combined health calculation
        sharedUserAggregates: sharedUserAggregates.length > 0 ? sharedUserAggregates : undefined
      };

      // ================================================================
      // SMART NOTIFICATION GENERATION (fire-and-forget, non-blocking)
      // ================================================================
      const monthKey = `${today.getFullYear()}_${String(today.getMonth() + 1).padStart(2, '0')}`;
      const dayOfMonth = today.getDate();
      const daysInCurrMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      const monthPctPassed = dayOfMonth / daysInCurrMonth;

      // Only generate smart notifications for the user's own view (not shared)
      if (!viewParam || viewParam === 'me') {
        // 1. Unpaid dues reminder — after 50% of month has passed
        if (monthPctPassed > 0.5) {
          const unpaidFixedNames = finalFixedExpenses
            .filter((f: any) => !paymentStatus[`fixed:${f.id}`] && f.frequency === 'monthly')
            .map((f: any) => f.name || 'Expense').slice(0, 5);
          const unpaidInvNames = finalInvestments
            .filter((i: any) => !paymentStatus[`investment:${i.id}`] && (i.status === 'active'))
            .map((i: any) => i.name || 'Investment').slice(0, 5);
          const allUnpaid = [...unpaidFixedNames, ...unpaidInvNames];
          if (allUnpaid.length > 0) {
            createNotification(supabase, {
              userId,
              type: 'payment_reminder',
              title: `${allUnpaid.length} unpaid due${allUnpaid.length > 1 ? 's' : ''} this month`,
              message: `You still haven't paid: ${allUnpaid.join(', ')}${allUnpaid.length >= 5 ? '…' : ''}. Mark them as paid to improve your health score.`,
              actionUrl: '/dues',
              groupKey: `unpaid_dues_${monthKey}`
            }).catch(() => {});
          }
        }

        // 2. Overspend warning — variable expense actual > planned
        for (const plan of finalVariablePlans) {
          const planned = plan.planned || 0;
          const actual = plan.actualTotal || 0;
          if (planned > 0 && actual > planned) {
            const pct = Math.round((actual / planned) * 100);
            createNotification(supabase, {
              userId,
              type: 'budget_alert',
              title: `Overspent on ${plan.name || 'a category'}`,
              message: `You've spent ₹${actual.toLocaleString('en-IN')} of your ₹${planned.toLocaleString('en-IN')} budget (${pct}%). Consider adjusting your spending.`,
              entityType: 'variable_plan',
              entityId: plan.id,
              actionUrl: '/variable-expenses',
              groupKey: `overspend_${plan.id}_${monthKey}`
            }).catch(() => {});
          }
        }

        // 3. Health score drop — notify when category is not_well or worrisome
        if (calcCategory === 'not_well' || calcCategory === 'worrisome') {
          const label = calcCategory === 'worrisome' ? 'Worrisome' : 'Needs Attention';
          createNotification(supabase, {
            userId,
            type: 'health_update',
            title: `Health score: ${label}`,
            message: `Your financial health is ${label.toLowerCase()}. You're spending more than you earn. Review your expenses and dues.`,
            actionUrl: '/health',
            groupKey: `health_drop_${calcCategory}_${monthKey}`
          }).catch(() => {});
        }

        // 4. Credit card billing day — today matches a card's billing_date
        for (const card of (directCreditCards || [])) {
          const billingDay = card.billing_date || 0;
          if (billingDay === dayOfMonth) {
            const cardName = card.name || 'Credit Card';
            createNotification(supabase, {
              userId,
              type: 'payment_reminder',
              title: `${cardName} billing cycle resets today`,
              message: `Your ${cardName} billing cycle resets on day ${billingDay}. Make sure your bill is updated and payments are recorded.`,
              entityType: 'credit_card',
              entityId: card.id,
              actionUrl: '/credit-cards',
              groupKey: `cc_billing_${card.id}_${monthKey}_${dayOfMonth}`
            }).catch(() => {});
          }
        }
      }

      // Also fetch unread notification count to include in dashboard response
      const { count: unreadNotifCount } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);
      
      responseData._notificationCount = unreadNotifCount || 0;

      // Cache the result (60s TTL)
      await redisSet(cacheKey, responseData, 60);

      const totalTime = Date.now() - perfStart;
      console.log('[EDGE_PERF_H3_H7] Dashboard endpoint timing', { totalTime, timings, userId, cached: false });

      return json({ data: responseData });
    }

    // INCOMES
    if (path === '/planning/income' && method === 'POST') {
      const body = await req.json();
      // E2E Phase 2: Use encrypted fields, fallback to plaintext, or placeholder
      const hasEncryption = body.source_enc && body.source_iv;
      const insertData: any = { 
        user_id: userId, 
        // Use plaintext if provided, else placeholder for E2E
        name: body.source || (hasEncryption ? '[encrypted]' : null), 
        amount: body.amount ?? (body.amount_enc ? 0 : null), 
        frequency: body.frequency, 
        category: 'employment',
        include_in_health: body.include_in_health !== undefined ? body.include_in_health : true,
        income_type: body.income_type || 'regular'
      };
      // RSU fields
      if (body.rsu_ticker) insertData.rsu_ticker = body.rsu_ticker;
      if (body.rsu_grant_count) insertData.rsu_grant_count = body.rsu_grant_count;
      if (body.rsu_vesting_schedule) insertData.rsu_vesting_schedule = body.rsu_vesting_schedule;
      if (body.rsu_currency) insertData.rsu_currency = body.rsu_currency;
      if (body.rsu_stock_price !== undefined) insertData.rsu_stock_price = body.rsu_stock_price;
      if (body.rsu_stock_price !== undefined) insertData.rsu_price_updated_at = new Date().toISOString();
      if (body.rsu_tax_rate !== undefined) insertData.rsu_tax_rate = body.rsu_tax_rate;
      if (body.rsu_expected_decline !== undefined) insertData.rsu_expected_decline = body.rsu_expected_decline;
      if (body.rsu_conversion_rate !== undefined) insertData.rsu_conversion_rate = body.rsu_conversion_rate;
      // Store encrypted versions if provided
      if (body.source_enc) insertData.source_enc = body.source_enc;
      if (body.source_iv) insertData.source_iv = body.source_iv;
      if (body.amount_enc) insertData.amount_enc = body.amount_enc;
      if (body.amount_iv) insertData.amount_iv = body.amount_iv;
      
      const { data, error: e } = await supabase.from('incomes')
        .insert(insertData)
        .select().single();
      if (e) return error(e.message, 500);
      // Activity log with full details for display (include encrypted fields for E2E)
      await logActivity(userId, 'income', 'added income source', { 
        name: body.source || '[encrypted]',
        name_enc: body.source_enc,
        name_iv: body.source_iv, 
        amount: body.amount || data.amount || 0,
        amount_enc: body.amount_enc,
        amount_iv: body.amount_iv,
        frequency: body.frequency || 'monthly',
        encrypted: hasEncryption 
      });
      await invalidateUserCache(userId);
      return json({ data }, 201);
    }
    if (path.startsWith('/planning/income/') && method === 'PUT') {
      const id = path.split('/').pop();
      const body = await req.json();
      const updates: any = {};
      if (body.source) updates.name = body.source;
      if (body.amount !== undefined) updates.amount = body.amount;
      if (body.frequency) updates.frequency = body.frequency;
      if (body.include_in_health !== undefined) updates.include_in_health = body.include_in_health;
      if (body.income_type !== undefined) updates.income_type = body.income_type;
      // RSU fields
      if (body.rsu_ticker !== undefined) updates.rsu_ticker = body.rsu_ticker;
      if (body.rsu_grant_count !== undefined) updates.rsu_grant_count = body.rsu_grant_count;
      if (body.rsu_vesting_schedule !== undefined) updates.rsu_vesting_schedule = body.rsu_vesting_schedule;
      if (body.rsu_currency !== undefined) updates.rsu_currency = body.rsu_currency;
      if (body.rsu_stock_price !== undefined) {
        updates.rsu_stock_price = body.rsu_stock_price;
        updates.rsu_price_updated_at = new Date().toISOString();
      }
      if (body.rsu_tax_rate !== undefined) updates.rsu_tax_rate = body.rsu_tax_rate;
      if (body.rsu_expected_decline !== undefined) updates.rsu_expected_decline = body.rsu_expected_decline;
      if (body.rsu_conversion_rate !== undefined) updates.rsu_conversion_rate = body.rsu_conversion_rate;
      // E2E: Include encrypted fields if provided
      if (body.source_enc) updates.source_enc = body.source_enc;
      if (body.source_iv) updates.source_iv = body.source_iv;
      if (body.amount_enc) updates.amount_enc = body.amount_enc;
      if (body.amount_iv) updates.amount_iv = body.amount_iv;
      
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
      // E2E Phase 2: Use encrypted fields, fallback to plaintext, or placeholder
      const hasEncryption = body.name_enc && body.name_iv;
      const insertData: any = { 
        user_id: userId, 
        name: body.name || (hasEncryption ? '[encrypted]' : null), 
        amount: body.amount ?? (body.amount_enc ? 0 : null), 
        frequency: body.frequency, 
        category: body.category, 
        is_sip: body.is_sip_flag 
      };
      if (body.name_enc) insertData.name_enc = body.name_enc;
      if (body.name_iv) insertData.name_iv = body.name_iv;
      if (body.amount_enc) insertData.amount_enc = body.amount_enc;
      if (body.amount_iv) insertData.amount_iv = body.amount_iv;
      
      const { data, error: e } = await supabase.from('fixed_expenses')
        .insert(insertData).select().single();
      if (e) return error(e.message, 500);
      await logActivity(userId, 'fixed_expense', 'added fixed expense', { 
        name: body.name || '[encrypted]',
        name_enc: body.name_enc,
        name_iv: body.name_iv, 
        amount: body.amount || data.amount || 0,
        amount_enc: body.amount_enc,
        amount_iv: body.amount_iv,
        frequency: body.frequency || 'monthly',
        category: body.category,
        isSip: body.is_sip || false,
        encrypted: hasEncryption 
      });
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
      // E2E: Include encrypted fields if provided
      if (body.name_enc) updates.name_enc = body.name_enc;
      if (body.name_iv) updates.name_iv = body.name_iv;
      if (body.amount_enc) updates.amount_enc = body.amount_enc;
      if (body.amount_iv) updates.amount_iv = body.amount_iv;
      
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
      // E2E Phase 2: Use encrypted fields, fallback to plaintext, or placeholder
      const hasEncryption = body.name_enc && body.name_iv;
      const insertData: any = { 
        user_id: userId, 
        name: body.name || (hasEncryption ? '[encrypted]' : null), 
        planned: body.planned ?? (body.planned_enc ? 0 : null), 
        category: body.category, 
        start_date: body.start_date 
      };
      if (body.name_enc) insertData.name_enc = body.name_enc;
      if (body.name_iv) insertData.name_iv = body.name_iv;
      if (body.planned_enc) insertData.planned_enc = body.planned_enc;
      if (body.planned_iv) insertData.planned_iv = body.planned_iv;
      
      const { data, error: e } = await supabase.from('variable_expense_plans')
        .insert(insertData).select().single();
      if (e) return error(e.message, 500);
      await logActivity(userId, 'variable_expense_plan', 'added variable expense plan', { 
        name: body.name || '[encrypted]',
        name_enc: body.name_enc,
        name_iv: body.name_iv, 
        planned: body.planned || data.planned || 0,
        planned_enc: body.planned_enc,
        planned_iv: body.planned_iv,
        category: body.category,
        encrypted: hasEncryption 
      });
      await invalidateUserCache(userId);
      return json({ data }, 201);
    }
    if (path.match(/\/planning\/variable-expenses\/[^/]+\/actuals$/) && method === 'POST') {
      const planId = path.split('/')[3];
      const body = await req.json();
      
      // Get plan details for activity log and overspend detection
      const { data: plan } = await supabase.from('variable_expense_plans')
        .select('name, category, planned').eq('id', planId).single();
      
      // E2E Phase 2: Use encrypted fields, fallback to plaintext, or placeholder
      const hasEncryption = body.amount_enc && body.amount_iv;
      const insertData: any = { 
        user_id: userId, 
        plan_id: planId, 
        amount: body.amount ?? (hasEncryption ? 0 : null), 
        incurred_at: body.incurred_at, 
        justification: body.justification || (body.justification_enc ? '[encrypted]' : null), 
        subcategory: body.subcategory, 
        payment_mode: body.payment_mode, 
        credit_card_id: body.credit_card_id 
      };
      if (body.amount_enc) insertData.amount_enc = body.amount_enc;
      if (body.amount_iv) insertData.amount_iv = body.amount_iv;
      if (body.justification_enc) insertData.justification_enc = body.justification_enc;
      if (body.justification_iv) insertData.justification_iv = body.justification_iv;
      
      const { data, error: e } = await supabase.from('variable_expense_actuals')
        .insert(insertData).select().single();
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
      
      // E2E: Include encrypted amount fields in activity so frontend can decrypt them
      await logActivity(userId, 'variable_expense', 'added actual expense', { 
        planName: plan?.name,
        category: plan?.category,
        amount: body.amount || data.amount || 0,
        amount_enc: body.amount_enc || data.amount_enc,
        amount_iv: body.amount_iv || data.amount_iv,
        subcategory: body.subcategory || data.subcategory,
        paymentMode: body.payment_mode || data.payment_mode,
        creditCard: cardName,
        justification: body.justification || data.justification,
        justification_enc: body.justification_enc || data.justification_enc,
        justification_iv: body.justification_iv || data.justification_iv
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
      // Validation
      const hasEncryption = body.name_enc && body.name_iv;
      if (!body.name && !hasEncryption) return error('Investment name is required', 400);
      if (body.monthly_amount !== undefined && (isNaN(body.monthly_amount) || body.monthly_amount < 0)) {
        return error('Monthly amount must be a non-negative number', 400);
      }
      // E2E Phase 2: Use encrypted fields, fallback to plaintext, or placeholder
      const insertData: any = { 
        user_id: userId, 
        name: body.name || (hasEncryption ? '[encrypted]' : 'Untitled'), 
        goal: body.goal || (body.goal_enc ? '[encrypted]' : ''), 
        monthly_amount: body.monthly_amount ?? (body.monthly_amount_enc ? 0 : 0), 
        status: body.status || 'active',
        is_priority: body.is_priority || false
      };
      if (body.name_enc) insertData.name_enc = body.name_enc;
      if (body.name_iv) insertData.name_iv = body.name_iv;
      if (body.goal_enc) insertData.goal_enc = body.goal_enc;
      if (body.goal_iv) insertData.goal_iv = body.goal_iv;
      if (body.monthly_amount_enc) insertData.monthly_amount_enc = body.monthly_amount_enc;
      if (body.monthly_amount_iv) insertData.monthly_amount_iv = body.monthly_amount_iv;
      
      const { data, error: e } = await supabase.from('investments')
        .insert(insertData).select().single();
      if (e) {
        console.error(`[INVESTMENT_CREATE_ERROR] Database error:`, e);
        return error(e.message, 500);
      }
      if (!data) {
        console.error(`[INVESTMENT_CREATE_ERROR] No data returned`);
        return error('Failed to create investment', 500);
      }
      console.log(`[INVESTMENT_CREATE] Successfully created investment ${data.id}`);
      // E2E: Include encrypted fields in activity so frontend can decrypt
      await logActivity(userId, 'investment', 'added investment', { 
        name: body.name || data.name,
        name_enc: body.name_enc,
        name_iv: body.name_iv,
        goal: body.goal || data.goal,
        goal_enc: body.goal_enc,
        goal_iv: body.goal_iv,
        monthlyAmount: body.monthly_amount || data.monthly_amount || 0,
        monthly_amount_enc: body.monthly_amount_enc,
        monthly_amount_iv: body.monthly_amount_iv,
        status: data.status
      });
      await invalidateUserCache(userId); // P0 FIX: Invalidate cache after creation
      return json({ data }, 201);
    }
    if (path.startsWith('/planning/investments/') && method === 'PUT') {
      const id = path.split('/').pop();
      if (!id) {
        return error('Investment ID required', 400);
      }
      const body = await req.json();
      const updateData: any = {};
      if (body.name !== undefined) updateData.name = body.name;
      if (body.goal !== undefined) updateData.goal = body.goal;
      if (body.monthly_amount !== undefined) updateData.monthly_amount = body.monthly_amount;
      if (body.status !== undefined) updateData.status = body.status;
      if (body.accumulated_funds !== undefined) updateData.accumulated_funds = body.accumulated_funds;
      if (body.is_priority !== undefined) updateData.is_priority = body.is_priority;
      // E2E: Include encrypted fields if provided
      if (body.name_enc) updateData.name_enc = body.name_enc;
      if (body.name_iv) updateData.name_iv = body.name_iv;
      if (body.goal_enc) updateData.goal_enc = body.goal_enc;
      if (body.goal_iv) updateData.goal_iv = body.goal_iv;
      if (body.monthly_amount_enc) updateData.monthly_amount_enc = body.monthly_amount_enc;
      if (body.monthly_amount_iv) updateData.monthly_amount_iv = body.monthly_amount_iv;
      
      const { data, error: e } = await supabase.from('investments')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();
      if (e) {
        return error(e.message, 500);
      }
      
      if (!data) {
        return error('Investment not found', 404);
      }
      
      if (body.accumulated_funds !== undefined) {
        await logActivity(userId, 'investment', 'updated available fund', { id, name: data.name, accumulatedFunds: body.accumulated_funds });
      } else {
        await logActivity(userId, 'investment', 'updated investment', { id, name: data.name });
      }
      await invalidateUserCache(userId);
      
      // Transform response to include camelCase for frontend
      const responseData = {
        ...data,
        monthlyAmount: data.monthly_amount,
        accumulatedFunds: data.accumulated_funds,
        isPriority: data.is_priority || false
      };
      return json({ data: responseData });
    }
    if (path.startsWith('/planning/investments/') && method === 'DELETE') {
      const id = path.split('/').pop();
      const { data: deleted } = await supabase.from('investments').select('name').eq('id', id).single();
      await supabase.from('investments').delete().eq('id', id);
      if (deleted) await logActivity(userId, 'investment', 'deleted investment', { id, name: deleted.name });
      await invalidateUserCache(userId); // P0 FIX: Invalidate cache after delete
      return json({ data: { deleted: true } });
    }

    // FUTURE BOMBS
    if (path === '/future-bombs' && method === 'POST') {
      const body = await req.json();
      // Validate due_date is in the future
      if (body.due_date) {
        const todayCheck = new Date(); todayCheck.setHours(0,0,0,0);
        const dueDateCheck = new Date(body.due_date);
        if (dueDateCheck <= todayCheck) return error('Due date must be in the future', 400);
      }
      if (body.total_amount !== undefined && body.total_amount <= 0) return error('Total amount must be positive', 400);
      // E2E Phase 2: Use encrypted fields, fallback to plaintext, or placeholder
      const hasEncryption = body.name_enc && body.name_iv;
      const insertData: any = { 
        user_id: userId, 
        name: body.name || (hasEncryption ? '[encrypted]' : null), 
        due_date: body.due_date, 
        total_amount: body.total_amount ?? (body.total_amount_enc ? 0 : null), 
        saved_amount: body.saved_amount ?? (body.saved_amount_enc ? 0 : 0) 
      };
      if (body.name_enc) insertData.name_enc = body.name_enc;
      if (body.name_iv) insertData.name_iv = body.name_iv;
      if (body.total_amount_enc) insertData.total_amount_enc = body.total_amount_enc;
      if (body.total_amount_iv) insertData.total_amount_iv = body.total_amount_iv;
      if (body.saved_amount_enc) insertData.saved_amount_enc = body.saved_amount_enc;
      if (body.saved_amount_iv) insertData.saved_amount_iv = body.saved_amount_iv;
      
      const { data, error: e } = await supabase.from('future_bombs')
        .insert(insertData).select().single();
      if (e) return error(e.message, 500);
      const logName = body.name || '[encrypted]';
      const logTotal = body.total_amount || data.total_amount || 0;
      await logActivity(userId, 'future_bomb', 'added future bomb', { 
        name: logName, 
        totalAmount: logTotal,
        dueDate: body.due_date || body.target_date,
        savedAmount: body.saved_amount || 0,
        encrypted: hasEncryption 
      });
      return json({ data }, 201);
    }
    if (path.startsWith('/future-bombs/') && method === 'PUT') {
      const id = path.split('/').pop();
      if (!id) return error('Future bomb ID required', 400);
      const body = await req.json();
      // Validate due_date if provided
      if (body.due_date) {
        const todayCheck = new Date(); todayCheck.setHours(0,0,0,0);
        const dueDateCheck = new Date(body.due_date);
        if (dueDateCheck <= todayCheck) return error('Due date must be in the future', 400);
      }
      if (body.total_amount !== undefined && body.total_amount <= 0) return error('Total amount must be positive', 400);
      const updateData: any = {};
      if (body.name !== undefined) updateData.name = body.name;
      if (body.due_date !== undefined) updateData.due_date = body.due_date;
      if (body.total_amount !== undefined) updateData.total_amount = body.total_amount;
      if (body.saved_amount !== undefined) updateData.saved_amount = body.saved_amount;
      // E2E encrypted fields
      if (body.name_enc) updateData.name_enc = body.name_enc;
      if (body.name_iv) updateData.name_iv = body.name_iv;
      if (body.total_amount_enc) updateData.total_amount_enc = body.total_amount_enc;
      if (body.total_amount_iv) updateData.total_amount_iv = body.total_amount_iv;
      if (body.saved_amount_enc) updateData.saved_amount_enc = body.saved_amount_enc;
      if (body.saved_amount_iv) updateData.saved_amount_iv = body.saved_amount_iv;
      
      const { data, error: e } = await supabase.from('future_bombs')
        .update(updateData).eq('id', id).eq('user_id', userId).select().single();
      if (e) return error(e.message, 500);
      if (!data) return error('Future bomb not found', 404);
      await logActivity(userId, 'future_bomb', 'updated future bomb', { 
        id, 
        name: data.name, 
        totalAmount: data.total_amount,
        savedAmount: data.saved_amount,
        dueDate: data.due_date
      });
      await invalidateUserCache(userId);
      return json({ data });
    }
    if (path.startsWith('/future-bombs/') && method === 'DELETE') {
      const id = path.split('/').pop();
      const { data: deleted } = await supabase.from('future_bombs').select('name, total_amount, saved_amount, due_date').eq('id', id).single();
      await supabase.from('future_bombs').delete().eq('id', id);
      if (deleted) await logActivity(userId, 'future_bomb', 'deleted future bomb', { 
        id, 
        name: deleted.name,
        totalAmount: deleted.total_amount,
        dueDate: deleted.due_date
      });
      await invalidateUserCache(userId);
      return json({ data: { deleted: true } });
    }

    // STOCK QUOTE (Yahoo Finance)
    if (path === '/stock/quote' && method === 'GET') {
      const ticker = url.searchParams.get('ticker');
      const convertTo = url.searchParams.get('convert_to');
      if (!ticker) return error('Ticker symbol is required');

      try {
        // Fetch stock data from Yahoo Finance v8 chart API
        const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;
        const yahooRes = await fetch(yahooUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        if (!yahooRes.ok) {
          const errText = await yahooRes.text();
          console.error('[STOCK_QUOTE] Yahoo Finance error:', yahooRes.status, errText);
          return error(`Could not fetch quote for "${ticker}". Verify the ticker symbol.`, 404);
        }
        const yahooData = await yahooRes.json();
        const meta = yahooData?.chart?.result?.[0]?.meta;
        if (!meta) return error(`No data found for ticker "${ticker}"`, 404);

        const stockPrice = meta.regularMarketPrice ?? meta.previousClose;
        const stockCurrency = (meta.currency || 'USD').toUpperCase();
        const stockName = meta.shortName || meta.longName || meta.symbol || ticker;
        const exchange = meta.exchangeName || meta.fullExchangeName || '';

        const result: any = {
          ticker: meta.symbol || ticker.toUpperCase(),
          name: stockName,
          price: stockPrice,
          currency: stockCurrency,
          exchange
        };

        // Currency conversion if requested and different from stock currency
        if (convertTo && convertTo.toUpperCase() !== stockCurrency) {
          const forexTicker = `${stockCurrency}${convertTo.toUpperCase()}=X`;
          try {
            const forexUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(forexTicker)}?interval=1d&range=1d`;
            const forexRes = await fetch(forexUrl, {
              headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            if (forexRes.ok) {
              const forexData = await forexRes.json();
              const forexMeta = forexData?.chart?.result?.[0]?.meta;
              const rate = forexMeta?.regularMarketPrice ?? forexMeta?.previousClose;
              if (rate) {
                result.conversionRate = rate;
                result.convertedPrice = Math.round(stockPrice * rate * 100) / 100;
                result.convertedCurrency = convertTo.toUpperCase();
              }
            } else {
              console.warn(`[STOCK_QUOTE] Forex fetch failed for ${forexTicker}:`, forexRes.status);
              // Continue without conversion - return stock price as-is
            }
          } catch (forexErr) {
            console.warn('[STOCK_QUOTE] Forex conversion error:', forexErr);
          }
        }

        return json({ data: result });
      } catch (fetchErr: any) {
        console.error('[STOCK_QUOTE] Fetch error:', fetchErr);
        return error('Failed to fetch stock quote: ' + fetchErr.message, 500);
      }
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
      const newMonthStartDay = body.monthStartDay ?? body.month_start_day;
      if (newMonthStartDay !== undefined) updates.month_start_day = newMonthStartDay;
      if (body.currency !== undefined) updates.currency = body.currency;
      if (body.timezone !== undefined) updates.timezone = body.timezone;
      
      // If month_start_day changed, clear last_reset_billing_period so the new cycle triggers a fresh reset
      if (newMonthStartDay !== undefined) {
        const { data: currentPrefs } = await supabase.from('user_preferences')
          .select('month_start_day').eq('user_id', userId).single();
        if (currentPrefs && currentPrefs.month_start_day !== newMonthStartDay) {
          updates.last_reset_billing_period = null;
          console.log(`[PREFS_UPDATE] month_start_day changed from ${currentPrefs.month_start_day} to ${newMonthStartDay}, clearing last_reset_billing_period`);
        }
      }
      
      const { data, error: e } = await supabase.from('user_preferences')
        .upsert(updates, { onConflict: 'user_id' }).select().single();
      if (e) return error(e.message, 500);
      const prefs = data || updates;
      await invalidateUserCache(userId);
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

  // Health thresholds (per user)
  if (path === '/health-thresholds' && method === 'GET') {
    const { data } = await supabase
      .from('health_thresholds')
      .select('*')
      .eq('user_id', userId)
      .single();
    const thresholds = data || {
      good_min: 20,
      ok_min: 10,
      ok_max: 19.99,
      not_well_max: 9.99
    };
    return json({ data: thresholds });
  }

  if (path === '/health-thresholds' && (method === 'PUT' || method === 'PATCH')) {
    const body = await req.json();
    const updates: any = { user_id: userId };
    if (body.good_min !== undefined) updates.good_min = Number(body.good_min);
    if (body.ok_min !== undefined) updates.ok_min = Number(body.ok_min);
    if (body.ok_max !== undefined) updates.ok_max = Number(body.ok_max);
    if (body.not_well_max !== undefined) updates.not_well_max = Number(body.not_well_max);

    // Basic validation
    if (
      updates.ok_min >= updates.ok_max ||
      updates.good_min < updates.ok_max ||
      updates.not_well_max < 0
    ) {
      return error('Invalid thresholds', 400);
    }

    const { data, error: e } = await supabase
      .from('health_thresholds')
      .upsert(updates, { onConflict: 'user_id' })
      .select()
      .single();
    if (e) return error(e.message, 500);
    return json({ data });
  }

    // AUTH/ME - Get current user info
    if (path === '/auth/me' && method === 'GET') {
      const { data: userData } = await supabase.from('users').select('id, username, encryption_salt, avatar_url, created_at').eq('id', userId).single();
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
      // E2E Phase 2: Use encrypted fields, fallback to plaintext, or placeholder
      const hasEncryption = body.name_enc && body.name_iv;
      const insertData: any = { 
        user_id: userId, 
        name: body.name || (hasEncryption ? '[encrypted]' : null), 
        statement_date: statementDate,
        bill_amount: body.billAmount ?? (body.bill_amount_enc ? 0 : 0), 
        paid_amount: body.paidAmount ?? (body.paid_amount_enc ? 0 : 0), 
        due_date: body.dueDate, 
        billing_date: body.billingDate 
      };
      if (body.name_enc) insertData.name_enc = body.name_enc;
      if (body.name_iv) insertData.name_iv = body.name_iv;
      if (body.bill_amount_enc) insertData.bill_amount_enc = body.bill_amount_enc;
      if (body.bill_amount_iv) insertData.bill_amount_iv = body.bill_amount_iv;
      if (body.paid_amount_enc) insertData.paid_amount_enc = body.paid_amount_enc;
      if (body.paid_amount_iv) insertData.paid_amount_iv = body.paid_amount_iv;
      
      const { data, error: e } = await supabase.from('credit_cards')
        .insert(insertData).select().single();
      if (e) return error(e.message, 500);
      
      // If paidAmount provided, update it
      if (body.paidAmount !== undefined && body.paidAmount > 0) {
        await supabase.from('credit_cards')
          .update({ paid_amount: body.paidAmount })
          .eq('id', data.id);
      }
      
      // E2E: Include encrypted fields in activity for frontend decryption
      await logActivity(userId, 'credit_card', 'created', { 
        id: data.id, 
        name: data.name,
        name_enc: data.name_enc,
        name_iv: data.name_iv,
        billAmount: data.bill_amount,
        bill_amount_enc: data.bill_amount_enc,
        bill_amount_iv: data.bill_amount_iv
      });
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
      // E2E: Include encrypted fields if provided
      if (body.name_enc) updates.name_enc = body.name_enc;
      if (body.name_iv) updates.name_iv = body.name_iv;
      if (body.bill_amount_enc) updates.bill_amount_enc = body.bill_amount_enc;
      if (body.bill_amount_iv) updates.bill_amount_iv = body.bill_amount_iv;
      if (body.paid_amount_enc) updates.paid_amount_enc = body.paid_amount_enc;
      if (body.paid_amount_iv) updates.paid_amount_iv = body.paid_amount_iv;
      
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
      // NOTE: With E2E encryption, amount may be 0 (placeholder) - frontend will decrypt and recalculate EMI
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
          name_enc: exp.name_enc,
          name_iv: exp.name_iv,
          amount: amount,  // May be 0 (placeholder) for encrypted data
          amount_enc: exp.amount_enc,
          amount_iv: exp.amount_iv,
          frequency: exp.frequency,
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
      // E2E Phase 2: Use encrypted fields, fallback to plaintext, or placeholder
      const hasEncryption = body.name_enc && body.name_iv;
      const insertData: any = { 
        user_id: userId, 
        name: body.name || (hasEncryption ? '[encrypted]' : null), 
        principal: body.principal ?? (body.principal_enc ? 0 : null), 
        remaining_tenure_months: body.remainingTenureMonths, 
        emi: body.emi ?? (body.emi_enc ? 0 : null) 
      };
      if (body.name_enc) insertData.name_enc = body.name_enc;
      if (body.name_iv) insertData.name_iv = body.name_iv;
      if (body.principal_enc) insertData.principal_enc = body.principal_enc;
      if (body.principal_iv) insertData.principal_iv = body.principal_iv;
      if (body.emi_enc) insertData.emi_enc = body.emi_enc;
      if (body.emi_iv) insertData.emi_iv = body.emi_iv;
      
      const { data, error: e } = await supabase.from('loans')
        .insert(insertData).select().single();
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
      const viewParam = url.searchParams.get('view') || 'me';
      
      // Get target user IDs based on view parameter (same logic as dashboard)
      let activityUserIds: string[] = [userId];
      
      if (viewParam === 'merged') {
        // Get all shared accounts this user is a member of
        const { data: myMemberships } = await supabase.from('shared_members')
          .select('id, shared_account_id, user_id, role')
          .eq('user_id', userId);
        
        if (myMemberships?.length) {
          const sharedAccountIds = myMemberships.map((m: any) => m.shared_account_id);
          
          // Get all other members in those shared accounts
          const { data: otherMembers } = await supabase.from('shared_members')
            .select('id, user_id, shared_account_id')
            .in('shared_account_id', sharedAccountIds)
            .neq('user_id', userId);
          
          if (otherMembers?.length) {
            activityUserIds = [userId, ...otherMembers.map((m: any) => m.user_id)];
          }
        }
      }
      
      // activities table uses actor_id, not user_id
      let query = supabase
        .from('activities')
        .select('*')
        .in('actor_id', activityUserIds);
      
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

    // USER AGGREGATES - Update from client-side calculations (for E2E encryption)
    if (path === '/user/aggregates' && method === 'PUT') {
      const body = await req.json();
      
      // Validate required fields
      const { 
        total_income_monthly,
        total_fixed_monthly,
        total_investments_monthly,
        total_variable_planned,
        total_variable_actual,
        total_credit_card_dues
      } = body;
      
      // Upsert the user's aggregates
      const { error: aggErr } = await supabase.from('user_aggregates')
        .upsert({
          user_id: userId,
          total_income_monthly: total_income_monthly || 0,
          total_fixed_monthly: total_fixed_monthly || 0,
          total_investments_monthly: total_investments_monthly || 0,
          total_variable_planned: total_variable_planned || 0,
          total_variable_actual: total_variable_actual || 0,
          total_credit_card_dues: total_credit_card_dues || 0,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
      
      if (aggErr) {
        console.error('[USER_AGGREGATES] Failed to update:', aggErr);
        return error(aggErr.message, 500);
      }
      
      console.log('[USER_AGGREGATES] Updated for user:', userId);
      return json({ data: { success: true } });
    }

    // SHARING
    if (path === '/sharing/members' && method === 'GET') {
      // Get all shared accounts that this user is a member of
      const { data: myMemberships, error: membersErr } = await supabase
        .from('shared_members')
        .select('*, shared_accounts(*)')
        .eq('user_id', userId);
      
      // Get all other members in those shared accounts
      const sharedAccountIds = (myMemberships || []).map((m: any) => m.shared_account_id);
      let enrichedMembers: any[] = [];
      
      if (sharedAccountIds.length > 0) {
        // Get all members of these shared accounts (excluding current user)
        const { data: otherMembers } = await supabase
          .from('shared_members')
          .select('*')
          .in('shared_account_id', sharedAccountIds)
          .neq('user_id', userId);
        
        // Get user details for those members
        const otherUserIds = (otherMembers || []).map((m: any) => m.user_id);
        
        if (otherUserIds.length > 0) {
          const { data: users } = await supabase
            .from('users')
            .select('id, username')
            .in('id', otherUserIds);
          
          const userMap = new Map((users || []).map((u: any) => [u.id, u]));
          
          enrichedMembers = (otherMembers || []).map((m: any) => {
            const user = userMap.get(m.user_id) || {};
            return {
              ...m,
              userId: m.user_id,
              username: user.username || 'Unknown',
              role: m.role
            };
          });
        }
      }
      
      const { data: accounts } = await supabase.from('shared_accounts').select('*').in('id', sharedAccountIds);

      return json({ data: { members: enrichedMembers, accounts: accounts || [] } });
    }
    if (path === '/sharing/requests' && method === 'GET') {
      // Only return PENDING requests - approved/rejected should not show
      const { data: incoming } = await supabase.from('sharing_requests').select('*').eq('invitee_id', userId).eq('status', 'pending');
      const { data: outgoing } = await supabase.from('sharing_requests').select('*').eq('inviter_id', userId).eq('status', 'pending');
      
      // Fetch usernames for all users involved
      const allUserIds = [...new Set([
        ...(incoming || []).map((r: any) => r.inviter_id),
        ...(outgoing || []).map((r: any) => r.invitee_id)
      ])];
      
      const { data: users } = await supabase.from('users')
        .select('id, username')
        .in('id', allUserIds);
      
      const userMap = new Map((users || []).map((u: any) => [u.id, u]));
      
      // Enrich incoming requests with inviter info (show as "From")
      const enrichedIncoming = (incoming || []).map((req: any) => {
        const inviter = userMap.get(req.inviter_id) || {};
        return {
          ...req,
          ownerId: req.inviter_id,
          inviterUsername: inviter.username,
          mergeFinances: req.merge_finances
        };
      });
      
      // Enrich outgoing requests with invitee info (show as "To")
      const enrichedOutgoing = (outgoing || []).map((req: any) => {
        const invitee = userMap.get(req.invitee_id) || {};
        return {
          ...req,
          inviteeId: req.invitee_id,
          inviteeUsername: invitee.username,
          mergeFinances: req.merge_finances
        };
      });
      
      return json({ data: { incoming: enrichedIncoming, outgoing: enrichedOutgoing } });
    }
    
    // Send sharing invite
    if (path === '/sharing/invite' && method === 'POST') {
      const body = await req.json();
      const { username: inviteUsername, role, merge_finances } = body;
      const lookupName = inviteUsername;
      
      if (!lookupName || !role) {
        return error('username and role required', 400);
      }
      
      // Find invitee by username
      const { data: invitee } = await supabase.from('users')
        .select('id, username')
        .eq('username', lookupName)
        .single();
      
      if (!invitee) {
        return error('User not found', 404);
      }
      
      if (invitee.id === userId) {
        return error('Cannot invite yourself', 400);
      }
      
      // Check for existing request
      const { data: existing } = await supabase.from('sharing_requests')
        .select('*')
        .eq('inviter_id', userId)
        .eq('invitee_id', invitee.id)
        .eq('status', 'pending')
        .single();
      
      if (existing) {
        return error('Invite already sent to this user', 400);
      }
      
      // Create sharing request
      const { data: request, error: reqErr } = await supabase.from('sharing_requests')
        .insert({
          inviter_id: userId,
          invitee_id: invitee.id,
          role: role,
          merge_finances: merge_finances || false,
          status: 'pending'
        })
        .select()
        .single();
      
      if (reqErr) {
        console.error('[SHARING_INVITE_ERROR]', reqErr);
        return error(reqErr.message, 500);
      }
      
      // Get inviter username for notification
      const { data: inviter } = await supabase.from('users').select('username').eq('id', userId).single();
      
      // Create notification for invitee
      await createNotification(supabase, {
        userId: invitee.id,
        type: 'sharing_request',
        title: 'New Sharing Request',
        message: `${inviter?.username || 'Someone'} wants to share finances with you`,
        entityType: 'sharing_request',
        entityId: request.id,
        actionUrl: '/sharing'
      });
      
      await logActivity(userId, 'sharing', 'sent_invite', { invitee: invitee.username, role });
      return json({ data: request }, 201);
    }
    
    // Approve sharing request
    if (path.match(/\/sharing\/requests\/[^/]+\/approve$/) && method === 'POST') {
      const requestId = path.split('/')[3];
      
      // Get the request
      const { data: request } = await supabase.from('sharing_requests')
        .select('*')
        .eq('id', requestId)
        .eq('invitee_id', userId)
        .eq('status', 'pending')
        .single();
      
      if (!request) {
        return error('Request not found or already processed', 404);
      }
      
      // Update request status
      await supabase.from('sharing_requests')
        .update({ status: 'approved' })
        .eq('id', requestId);
      
      // Create a shared_account first, then add both users as members
      // Step 1: Create the shared account (only use columns that exist in the table)
      const { data: sharedAccount, error: accountErr } = await supabase.from('shared_accounts').insert({
        name: `Shared: ${request.inviter_id.substring(0,8)} & ${userId.substring(0,8)}`
      }).select().single();
      
      if (accountErr || !sharedAccount) {
        console.log('[DEBUG_APPROVAL] Failed to create shared_account:', accountErr?.message);
        return error('Failed to create shared account: ' + (accountErr?.message || 'unknown'), 500);
      }
      
      // Step 2: Add inviter to the shared account
      const { error: insert1Err } = await supabase.from('shared_members').insert({
        user_id: request.inviter_id,
        shared_account_id: sharedAccount.id,
        role: 'owner',
        merge_finances: request.merge_finances
      });
      
      // Step 3: Add invitee (approver) to the shared account
      const { error: insert2Err } = await supabase.from('shared_members').insert({
        user_id: userId,
        shared_account_id: sharedAccount.id,
        role: request.role,
        merge_finances: request.merge_finances
      });
      
      console.log('[DEBUG_APPROVAL] Results:', { 
        sharedAccountId: sharedAccount.id,
        insert1Err: insert1Err?.message, 
        insert2Err: insert2Err?.message, 
        inviterId: request.inviter_id, 
        inviteeId: userId 
      });
      
      if (insert1Err || insert2Err) {
        return error('Failed to add members to shared account: ' + (insert1Err?.message || insert2Err?.message), 500);
      }
      
      // Get inviter username for activity log
      const { data: inviter } = await supabase.from('users').select('username').eq('id', request.inviter_id).single();
      
      // Get current user's username for notification
      const { data: currentUser } = await supabase.from('users').select('username').eq('id', userId).single();
      
      // Invalidate dashboard caches for both users (critical for merged view to work)
      await Promise.all([
        invalidateUserCache(userId),
        invalidateUserCache(request.inviter_id),
        redisInvalidate(`dashboard:${userId}:merged`),
        redisInvalidate(`dashboard:${request.inviter_id}:merged`)
      ]);
      
      // Notify the inviter that their request was accepted
      await createNotification(supabase, {
        userId: request.inviter_id,
        type: 'sharing_accepted',
        title: 'Sharing Request Accepted!',
        message: `${currentUser?.username || 'User'} accepted your sharing request. You can now view combined finances.`,
        actionUrl: '/dashboard?view=merged'
      });
      
      await logActivity(userId, 'sharing', 'approved_request', { inviter: inviter?.username, role: request.role });
      return json({ data: { success: true } });
    }
    
    // Reject sharing request
    if (path.match(/\/sharing\/requests\/[^/]+\/reject$/) && method === 'POST') {
      const requestId = path.split('/')[3];
      
      // Get the request
      const { data: request } = await supabase.from('sharing_requests')
        .select('*')
        .eq('id', requestId)
        .eq('invitee_id', userId)
        .eq('status', 'pending')
        .single();
      
      if (!request) {
        return error('Request not found or already processed', 404);
      }
      
      // Update request status
      await supabase.from('sharing_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);
      
      // Get inviter username for activity log
      const { data: inviter } = await supabase.from('users').select('username').eq('id', request.inviter_id).single();
      
      // Get current user's username for notification
      const { data: rejectingUser } = await supabase.from('users').select('username').eq('id', userId).single();
      
      // Notify the inviter that their request was rejected
      await createNotification(supabase, {
        userId: request.inviter_id,
        type: 'sharing_rejected',
        title: 'Sharing Request Declined',
        message: `${rejectingUser?.username || 'User'} declined your sharing request.`,
        actionUrl: '/sharing'
      });
      
      await logActivity(userId, 'sharing', 'rejected_request', { inviter: inviter?.username });
      return json({ data: { success: true } });
    }
    
    // Cancel outgoing sharing request (inviter withdraws their own pending invite)
    if (path.match(/\/sharing\/requests\/[^/]+\/cancel$/) && method === 'POST') {
      const requestId = path.split('/')[3];
      
      // Verify this is the user's own outgoing request and it's still pending
      const { data: request } = await supabase.from('sharing_requests')
        .select('*')
        .eq('id', requestId)
        .eq('inviter_id', userId)
        .eq('status', 'pending')
        .single();
      
      if (!request) {
        return error('Request not found or already processed', 404);
      }
      
      // Delete the request entirely (not just status change — it was never accepted)
      await supabase.from('sharing_requests')
        .delete()
        .eq('id', requestId);
      
      const { data: invitee } = await supabase.from('users').select('username').eq('id', request.invitee_id).single();
      await logActivity(userId, 'sharing', 'cancelled_invite', { invitee: invitee?.username });
      return json({ data: { success: true } });
    }
    
    // Revoke sharing (delete shared account and all members)
    if (path === '/sharing/revoke' && method === 'POST') {
      const body = await req.json();
      const { sharedAccountId } = body;
      
      if (!sharedAccountId) {
        return error('sharedAccountId required', 400);
      }
      
      // Verify user is a member of this shared account
      const { data: membership } = await supabase.from('shared_members')
        .select('*')
        .eq('shared_account_id', sharedAccountId)
        .eq('user_id', userId)
        .single();
      
      if (!membership) {
        return error('Not authorized to revoke this sharing', 403);
      }
      
      // Get all members before deleting for activity logging
      const { data: allMembers } = await supabase.from('shared_members')
        .select('user_id')
        .eq('shared_account_id', sharedAccountId);
      
      // Delete all members from this shared account
      await supabase.from('shared_members')
        .delete()
        .eq('shared_account_id', sharedAccountId);
      
      // Delete the shared account itself
      await supabase.from('shared_accounts')
        .delete()
        .eq('id', sharedAccountId);
      
      // Log activity for all affected users
      for (const member of (allMembers || [])) {
        await logActivity(member.user_id, 'sharing', 'revoked_sharing', { 
          revokedBy: userId,
          sharedAccountId 
        });
        // Invalidate cache for each affected user
        await redisDel(`dashboard:${member.user_id}:me`);
        await redisDel(`dashboard:${member.user_id}:merged`);
      }
      
      return json({ data: { success: true } });
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

    // EXPORT - reliable direct queries (bypass RPC)
    if ((path === '/export' && method === 'GET') || (path === '/export/finances' && method === 'GET')) {
      const { data: userData, error: userErr } = await supabase.from('users').select('id, username').eq('id', userId).single();
      if (userErr || !userData) return error('Failed to fetch user data', 500);

      const num = (v: any) => {
        const n = parseFloat(v);
        return isNaN(n) ? 0 : n;
      };

      const { data: directIncomes } = await supabase.from('incomes').select('*').eq('user_id', userId);
      const { data: directFixedExpenses } = await supabase.from('fixed_expenses').select('*').eq('user_id', userId);
      const { data: directVariablePlans } = await supabase.from('variable_expense_plans').select('*').eq('user_id', userId);
      // FIX: Filter variableActuals by user_id to prevent data leak
      const { data: directVariableActuals } = await supabase.from('variable_expense_actuals').select('*').eq('user_id', userId);
      const { data: directInvestments } = await supabase.from('investments').select('*').eq('user_id', userId);
      const { data: directFutureBombs } = await supabase.from('future_bombs').select('*').eq('user_id', userId);
      const { data: creditCards } = await supabase.from('credit_cards').select('*').eq('user_id', userId);

      const variableExpenses = (directVariablePlans || []).map((plan: any) => {
        const actuals = (directVariableActuals || []).filter((a: any) => a.plan_id === plan.id || a.planId === plan.id);
        const actualTotal = actuals.reduce((sum: number, a: any) => sum + num(a.amount), 0);
        return { ...plan, actuals, actualTotal };
      });

      const loans = (directFixedExpenses || []).filter((exp: any) => 
        exp.category && exp.category.toLowerCase() === 'loan'
      ).map((exp: any) => {
        const amount = num(exp.amount);
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

      const { data: activities } = await supabase
        .from('activities')
        .select('*')
        .eq('actor_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      const totalIncome = (directIncomes || []).reduce((sum: number, i: any) => {
        const amount = num(i.amount);
        const monthly = i.frequency === 'monthly' ? amount :
          i.frequency === 'quarterly' ? amount / 3 : amount / 12;
        return sum + monthly;
      }, 0);

      const totalFixedExpenses = (directFixedExpenses || []).reduce((sum: number, e: any) => {
        const amount = num(e.amount);
        const monthly = e.frequency === 'monthly' ? amount :
          e.frequency === 'quarterly' ? amount / 3 : amount / 12;
        return sum + monthly;
      }, 0);

      // Calculate variable expenses as max(actual, prorated) for health calculation
      const today = new Date();
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      const remainingDaysRatio = 1 - (today.getDate() / daysInMonth);
      
      const totalVariablePlanned = variableExpenses.reduce((sum: number, p: any) => sum + num(p.planned), 0);
      const totalVariableActual = variableExpenses.reduce((sum: number, p: any) => sum + num(p.actualTotal), 0);
      const totalVariableProrated = totalVariablePlanned * remainingDaysRatio;
      const effectiveVariableExpense = Math.max(totalVariableActual, totalVariableProrated);
      
      // Parse investments - handle encrypted values by using numeric field
      const totalInvestments = (directInvestments || []).reduce((sum: number, inv: any) => {
        // Try numeric fields first, avoid encrypted strings
        const amount = num(inv.monthly_amount || inv.monthlyAmount || 0);
        return sum + amount;
      }, 0);

      const creditCardDues = (creditCards || []).reduce((sum: number, c: any) => {
        const billAmount = num(c.bill_amount || c.billAmount || 0);
        const paidAmount = num(c.paid_amount || c.paidAmount || 0);
        const remaining = billAmount - paidAmount;
        if (remaining > 0) {
          const dueDate = new Date(c.due_date || c.dueDate);
          if (dueDate.getMonth() === today.getMonth() && dueDate.getFullYear() === today.getFullYear()) {
            return sum + remaining;
          }
        }
        return sum;
      }, 0);

      const remainingBalance = totalIncome - (totalFixedExpenses + effectiveVariableExpense + totalInvestments + creditCardDues);
      let healthCategory = 'ok';
      if (remainingBalance > 10000) healthCategory = 'good';
      else if (remainingBalance >= 0) healthCategory = 'ok';
      else if (remainingBalance >= -3000) healthCategory = 'not_well';
      else healthCategory = 'worrisome';

      const { data: constraint } = await supabase.from('constraint_scores').select('*').eq('user_id', userId).single();

      const exportData = {
        exportDate: new Date().toISOString(),
        user: { id: userData.id, username: userData.username },
        health: { remaining: remainingBalance, category: healthCategory },
        constraintScore: constraint ? {
          score: constraint.score,
          tier: constraint.tier,
          recentOverspends: constraint.recent_overspends || 0,
          decayAppliedAt: constraint.decay_applied_at,
          updatedAt: constraint.updated_at
        } : { score: 0, tier: 'green', recentOverspends: 0 },
        incomes: directIncomes || [],
        fixedExpenses: (directFixedExpenses || []).map((e: any) => ({
          ...e,
          monthlyEquivalent: e.frequency === 'monthly' ? e.amount :
            e.frequency === 'quarterly' ? e.amount / 3 :
            e.amount / 12
        })),
        variableExpenses,
        investments: directInvestments || [],
        futureBombs: directFutureBombs || [],
        creditCards: creditCards || [],
        loans,
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
          totalIncome,
          totalFixedExpenses,
          totalVariableActual,
          totalVariablePlanned,
          totalVariableProrated,
          effectiveVariableExpense,
          totalInvestments,
          remainingBalance,
          healthCategory
        },
        healthDetails: {}
      };

      // Wrap in { data: ... } to match frontend expectation
      return json({ data: exportData });
    }

    // ============================================================================
    // NOTIFICATION SYSTEM ENDPOINTS
    // ============================================================================

    // GET /notifications - List user's notifications
    if (path === '/notifications' && method === 'GET') {
      const notifUrl = new URL(req.url);
      const unreadOnly = notifUrl.searchParams.get('unread') === 'true';
      const limit = parseInt(notifUrl.searchParams.get('limit') || '50');
      
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (unreadOnly) {
        query = query.eq('is_read', false);
      }
      
      const { data: notifications, error: notifErr } = await query;
      
      if (notifErr) {
        console.error('Error fetching notifications:', notifErr);
        return error('Failed to fetch notifications', 500);
      }
      
      // Get unread count
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);
      
      return json({ 
        data: {
          notifications: (notifications || []).map((n: any) => ({
            id: n.id,
            type: n.type,
            title: n.title,
            message: n.message,
            entityType: n.entity_type,
            entityId: n.entity_id,
            actionUrl: n.action_url,
            isRead: n.is_read,
            readAt: n.read_at,
            createdAt: n.created_at
          })),
          unreadCount: count || 0
        }
      });
    }

    // PUT /notifications/read - Mark notifications as read
    if (path === '/notifications/read' && method === 'PUT') {
      const body = await req.json();
      const { notificationIds } = body;
      
      if (!notificationIds || !Array.isArray(notificationIds)) {
        return error('notificationIds array required', 400);
      }
      
      const { error: updateErr } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .in('id', notificationIds);
      
      if (updateErr) {
        return error('Failed to mark notifications as read', 500);
      }
      
      return json({ data: { success: true, markedCount: notificationIds.length } });
    }

    // PUT /notifications/read-all - Mark all notifications as read
    if (path === '/notifications/read-all' && method === 'PUT') {
      const { error: updateErr } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('is_read', false);
      
      if (updateErr) {
        return error('Failed to mark all notifications as read', 500);
      }
      
      return json({ data: { success: true } });
    }

    // GET /notifications/preferences - Get notification preferences
    if (path === '/notifications/preferences' && method === 'GET') {
      const { data: prefs, error: prefsErr } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (prefsErr && prefsErr.code !== 'PGRST116') { // Not found is ok
        return error('Failed to fetch preferences', 500);
      }
      
      // Return default preferences if none exist
      const preferences = prefs || {
        in_app_sharing: true,
        in_app_payments: true,
        in_app_budget_alerts: true,
        in_app_system: true
      };
      
      return json({ 
        data: {
          inApp: {
            sharing: preferences.in_app_sharing,
            payments: preferences.in_app_payments,
            budgetAlerts: preferences.in_app_budget_alerts,
            system: preferences.in_app_system
          }
        }
      });
    }

    // PUT /notifications/preferences - Update notification preferences
    if (path === '/notifications/preferences' && method === 'PUT') {
      const body = await req.json();
      
      const updates: any = {};
      
      // In-app preferences
      if (body.inApp) {
        if (typeof body.inApp.sharing === 'boolean') updates.in_app_sharing = body.inApp.sharing;
        if (typeof body.inApp.payments === 'boolean') updates.in_app_payments = body.inApp.payments;
        if (typeof body.inApp.budgetAlerts === 'boolean') updates.in_app_budget_alerts = body.inApp.budgetAlerts;
        if (typeof body.inApp.system === 'boolean') updates.in_app_system = body.inApp.system;
      }
      
      updates.updated_at = new Date().toISOString();
      
      // Upsert preferences
      const { error: upsertErr } = await supabase
        .from('notification_preferences')
        .upsert({ user_id: userId, ...updates }, { onConflict: 'user_id' });
      
      if (upsertErr) {
        console.error('Error updating preferences:', upsertErr);
        return error('Failed to update preferences', 500);
      }
      
      return json({ data: { success: true } });
    }

    // DELETE /notifications/:id - Delete a notification
    if (path.match(/^\/notifications\/[^/]+$/) && method === 'DELETE') {
      const notificationId = path.split('/').pop();
      
      const { error: delErr } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', userId);
      
      if (delErr) {
        return error('Failed to delete notification', 500);
      }
      
      return json({ data: { success: true } });
    }

    return error('Not found', 404);

  } catch (err) {
    console.error('API Error:', err);
    return error('Internal server error', 500);
  }
});

