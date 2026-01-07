// Combined API Edge Function - Replaces Railway Backend
// Handles all API operations with custom JWT auth

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================================
// EMAIL SERVICE (Inlined to avoid import issues)
// ============================================================================
const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'noreply@finflow.app';
const FROM_NAME = Deno.env.get('FROM_NAME') || 'FinFlow';
const IS_PRODUCTION = Deno.env.get('ENVIRONMENT') === 'production';

const POSTMARK_TOKEN = Deno.env.get('POSTMARK_TOKEN');

async function sendVerificationEmail(to: string, code: string): Promise<{ success: boolean; devCode?: string; error?: string }> {
  const subject = 'Verify your FinFlow email';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #1a1a1a; padding: 32px; border-radius: 12px;">
      <h1 style="color: #00e676; text-align: center;">🌿 FinFlow</h1>
      <p style="color: #ccc;">Please verify your email with this code:</p>
      <div style="background: #2d2d2d; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #00e676;">${code}</span>
      </div>
      <p style="color: #888; font-size: 12px;">This code expires in 15 minutes.</p>
    </div>
  `;
  
  if (IS_PRODUCTION && SENDGRID_API_KEY) {
    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${SENDGRID_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: FROM_EMAIL, name: FROM_NAME },
          subject,
          content: [{ type: 'text/html', value: html }]
        })
      });
      return { success: response.ok || response.status === 202 };
    } catch (e) {
      console.error('[EMAIL_ERROR]', e);
      return { success: false, error: 'SendGrid send failed' };
    }
  } else if (IS_PRODUCTION && POSTMARK_TOKEN) {
    try {
      const response = await fetch('https://api.postmarkapp.com/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-Postmark-Server-Token': POSTMARK_TOKEN },
        body: JSON.stringify({
          From: FROM_EMAIL,
          To: to,
          Subject: subject,
          HtmlBody: html,
        })
      });
      return { success: response.ok };
    } catch (e) {
      console.error('[EMAIL_ERROR_POSTMARK]', e);
      return { success: false, error: 'Postmark send failed' };
    }
  } else if (!IS_PRODUCTION) {
    console.log(`[EMAIL_DEV] Verification email to ${to}, code: ${code}`);
    return { success: true, devCode: code };
  }
  return { success: false, error: 'Email provider not configured' };
}

async function sendPasswordResetEmail(to: string, code: string): Promise<{ success: boolean; devCode?: string; error?: string }> {
  const subject = 'Reset your FinFlow password';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #1a1a1a; padding: 32px; border-radius: 12px;">
      <h1 style="color: #00e676; text-align: center;">🌿 FinFlow</h1>
      <p style="color: #ccc;">Use this code to reset your password:</p>
      <div style="background: #2d2d2d; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #ff9800;">${code}</span>
      </div>
      <p style="color: #ff9800; background: rgba(255,152,0,0.1); padding: 12px; border-radius: 8px;">⚠️ You'll also need your 24-word recovery key.</p>
      <p style="color: #888; font-size: 12px;">This code expires in 15 minutes.</p>
    </div>
  `;
  
  if (IS_PRODUCTION && SENDGRID_API_KEY) {
    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${SENDGRID_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: FROM_EMAIL, name: FROM_NAME },
          subject,
          content: [{ type: 'text/html', value: html }]
        })
      });
      return { success: response.ok || response.status === 202 };
    } catch (e) {
      console.error('[EMAIL_ERROR]', e);
      return { success: false, error: 'SendGrid send failed' };
    }
  } else if (IS_PRODUCTION && POSTMARK_TOKEN) {
    try {
      const response = await fetch('https://api.postmarkapp.com/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-Postmark-Server-Token': POSTMARK_TOKEN },
        body: JSON.stringify({
          From: FROM_EMAIL,
          To: to,
          Subject: subject,
          HtmlBody: html,
        })
      });
      return { success: response.ok };
    } catch (e) {
      console.error('[EMAIL_ERROR_POSTMARK]', e);
      return { success: false, error: 'Postmark send failed' };
    }
  } else if (!IS_PRODUCTION) {
    console.log(`[EMAIL_DEV] Password reset email to ${to}, code: ${code}`);
    return { success: true, devCode: code };
  }
  return { success: false, error: 'Email provider not configured' };
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
      const { username, password, email, encryptionSalt, recoveryKeyHash } = await req.json();
      
      if (!username || !password) return error('Username and password required');
      if (username.length < 3 || username.length > 20) return error('Username must be 3-20 characters');
      if (password.length < 8) return error('Password must be at least 8 characters');
      
      // Email validation (optional but recommended)
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return error('Invalid email format');
      }

      // Check existing username
      const { data: existingUser } = await supabase
        .from('users').select('id').eq('username', username).single();
      if (existingUser) return error('Username already taken', 409);
      
      // Check existing email if provided
      if (email) {
        const { data: existingEmail } = await supabase
          .from('users').select('id').eq('email', email).single();
        if (existingEmail) return error('Email already registered', 409);
      }

      // Generate email verification code (6-digit)
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

      // Create user
      const passwordHash = await hashPassword(password);
      const { data: user, error: insertErr } = await supabase
        .from('users')
        .insert({ 
          username, 
          password_hash: passwordHash, 
          email: email || null,
          email_verified: false,
          email_verification_code: email ? verificationCode : null,
          email_verification_expires: email ? verificationExpires : null,
          encryption_salt: encryptionSalt, 
          recovery_key_hash: recoveryKeyHash 
        })
        .select('id, username, email').single();
      
      if (insertErr) {
        console.error('Signup error:', insertErr);
        return error('Failed to create user', 500);
      }

      // Create defaults
      await supabase.from('user_preferences').insert({ user_id: user.id, month_start_day: 1, currency: 'INR' });
      await supabase.from('constraint_scores').insert({ user_id: user.id, score: 0, tier: 'green' });

      // TODO: Send verification email (integrate with email service)
      // Send verification email if email provided
      let devCode: string | undefined;
      if (email) {
        const emailResult = await sendVerificationEmail(email, verificationCode);
        if (!emailResult.success) {
          console.error('[EMAIL_SEND_FAILED]', emailResult.error || 'unknown');
          return error('Failed to send verification email. Please try again later.', 502);
        }
        devCode = emailResult.devCode;
      }

      const token = await createToken(user.id, user.username);
      return json({ 
        access_token: token, 
        user: { id: user.id, username: user.username, email: user.email, email_verified: false }, 
        encryption_salt: encryptionSalt,
        ...(devCode ? { _dev_verification_code: devCode } : {})
      }, 201);
    }
    
    // EMAIL VERIFICATION - Verify email with code
    if (path === '/auth/verify-email' && method === 'POST') {
      const { email, code } = await req.json();
      
      if (!email || !code) return error('Email and verification code required');
      
      const { data: user, error: userErr } = await supabase
        .from('users')
        .select('id, email_verification_code, email_verification_expires, email_verified')
        .eq('email', email)
        .single();
      
      if (userErr || !user) return error('User not found', 404);
      if (user.email_verified) return error('Email already verified');
      
      // Check expiry
      if (new Date(user.email_verification_expires) < new Date()) {
        return error('Verification code expired. Please request a new one.');
      }
      
      // Check code
      if (user.email_verification_code !== code) {
        return error('Invalid verification code');
      }
      
      // Mark verified
      await supabase.from('users').update({
        email_verified: true,
        email_verification_code: null,
        email_verification_expires: null
      }).eq('id', user.id);
      
      return json({ message: 'Email verified successfully', verified: true });
    }
    
    // RESEND VERIFICATION CODE
    if (path === '/auth/resend-verification' && method === 'POST') {
      const { email } = await req.json();
      
      if (!email) return error('Email required');
      
      const { data: user, error: userErr } = await supabase
        .from('users')
        .select('id, email_verified')
        .eq('email', email)
        .single();
      
      if (userErr || !user) return error('User not found', 404);
      if (user.email_verified) return error('Email already verified');
      
      // Generate new code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      
      await supabase.from('users').update({
        email_verification_code: verificationCode,
        email_verification_expires: verificationExpires
      }).eq('id', user.id);
      
      // Send verification email
      const emailResult = await sendVerificationEmail(email, verificationCode);
      if (!emailResult.success) {
        console.error('[EMAIL_SEND_FAILED]', emailResult.error || 'unknown');
        return error('Failed to send verification email. Please try again later.', 502);
      }
      
      return json({ 
        message: 'Verification code sent', 
        ...(emailResult.devCode ? { _dev_code: emailResult.devCode } : {})
      });
    }
    
    // FORGOT PASSWORD - Step 1: Request reset (email + sends code)
    if (path === '/auth/forgot-password' && method === 'POST') {
      const { email } = await req.json();
      
      if (!email) return error('Email required');
      
      const { data: user, error: userErr } = await supabase
        .from('users')
        .select('id, email, email_verified')
        .eq('email', email)
        .single();
      
      // Don't reveal if user exists
      if (userErr || !user) {
        return json({ message: 'If email exists, a reset code will be sent' });
      }
      
      // Require verified email
      if (!user.email_verified) {
        return error('Email not verified. Please verify your email first.');
      }
      
      // Generate reset code
      const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
      
      await supabase.from('users').update({
        password_reset_code: resetCode,
        password_reset_expires: resetExpires
      }).eq('id', user.id);
      
      // Send reset email
      const emailResult = await sendPasswordResetEmail(email, resetCode);
      if (!emailResult.success) {
        console.error('[EMAIL_SEND_FAILED]', emailResult.error || 'unknown');
        return error('Failed to send reset email. Please try again later.', 502);
      }
      
      return json({ 
        message: 'If email exists, a reset code will be sent', 
        ...(emailResult.devCode ? { _dev_code: emailResult.devCode } : {})
      });
    }
    
    // FORGOT PASSWORD - Step 2: Verify code + recovery key + set new password
    if (path === '/auth/reset-password' && method === 'POST') {
      const { email, resetCode, recoveryKey, newPassword } = await req.json();
      
      if (!email || !resetCode || !recoveryKey || !newPassword) {
        return error('Email, reset code, recovery key, and new password required');
      }
      
      if (newPassword.length < 8) return error('Password must be at least 8 characters');
      
      const { data: user, error: userErr } = await supabase
        .from('users')
        .select('id, password_reset_code, password_reset_expires, recovery_key_hash, encryption_salt')
        .eq('email', email)
        .single();
      
      if (userErr || !user) return error('User not found', 404);
      
      // Check reset code
      if (user.password_reset_code !== resetCode) {
        return error('Invalid reset code');
      }
      
      // Check expiry
      if (new Date(user.password_reset_expires) < new Date()) {
        return error('Reset code expired. Please request a new one.');
      }
      
      // Verify recovery key (hash and compare)
      const encoder = new TextEncoder();
      const recoveryData = encoder.encode(recoveryKey.trim().toLowerCase());
      const recoveryHashBuffer = await crypto.subtle.digest('SHA-256', recoveryData);
      const recoveryHashArray = Array.from(new Uint8Array(recoveryHashBuffer));
      const recoveryHashB64 = btoa(String.fromCharCode(...recoveryHashArray));
      
      if (recoveryHashB64 !== user.recovery_key_hash) {
        return error('Invalid recovery key. Please check your 24-word recovery phrase.');
      }
      
      // Update password
      const newPasswordHash = await hashPassword(newPassword);
      await supabase.from('users').update({
        password_hash: newPasswordHash,
        password_reset_code: null,
        password_reset_expires: null,
        failed_login_attempts: 0,
        account_locked_until: null
      }).eq('id', user.id);
      
      return json({ 
        message: 'Password reset successfully. Please log in with your new password.',
        encryption_salt: user.encryption_salt 
      });
    }

    // RECOVER WITH RECOVERY KEY (no email, no code)
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
          .select('id, username, email, email_verified, password_hash, encryption_salt, failed_login_attempts, account_locked_until')
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
            username: user.username,
            email: user.email,
            email_verified: user.email_verified 
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
      
      // #region agent log - DEBUG: Log health details raw data
      console.log('[DEBUG_HEALTH] variablePlans count:', variablePlans?.length || 0);
      console.log('[DEBUG_HEALTH] variableActuals count:', variableActuals?.length || 0);
      // #endregion
      
      // Calculate totals
      const incomeItems = (incomes || []).map((i: any) => ({
        ...i,
        monthlyEquivalent: i.frequency === 'monthly' ? i.amount : 
          i.frequency === 'quarterly' ? i.amount / 3 : i.amount / 12
      }));
      const totalIncome = incomeItems.reduce((sum: number, i: any) => sum + i.monthlyEquivalent, 0);
      
      const fixedExpenseItems = (fixedExpenses || []).map((e: any) => ({
        ...e,
        monthlyEquivalent: e.frequency === 'monthly' ? e.amount :
          e.frequency === 'quarterly' ? e.amount / 3 : e.amount / 12
      }));
      const totalFixedExpenses = fixedExpenseItems.reduce((sum: number, e: any) => sum + e.monthlyEquivalent, 0);
      
      const variablePlanItems = (variablePlans || []).map((p: any) => {
        const actuals = (variableActuals || []).filter((a: any) => a.plan_id === p.id);
        const calcActualTotal = actuals.reduce((s: number, a: any) => s + (parseFloat(a.amount) || 0), 0);
        // #region agent log - DEBUG: Health variable plan actual
        console.log(`[DEBUG_HEALTH_VAR] Plan ${p.id} (${p.name}): ${actuals.length} actuals, actualTotal=${calcActualTotal}`);
        // #endregion
        return { ...p, actuals, actualTotal: calcActualTotal };
      });
      const totalVariablePlanned = variablePlanItems.reduce((sum: number, p: any) => sum + (p.planned || 0), 0);
      const totalVariableActual = variablePlanItems.reduce((sum: number, p: any) => sum + p.actualTotal, 0);
      // #region agent log
      console.log(`[DEBUG_HEALTH_VAR_TOTAL] totalVariablePlanned=${totalVariablePlanned}, totalVariableActual=${totalVariableActual}`);
      // #endregion
      
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
      
      // Calculate remaining (available funds)
      const totalExpenses = totalFixedExpenses + effectiveVariable + totalInvestments + totalCreditCardDue;
      const remaining = totalIncome - totalExpenses;
      
      // Determine category - MUST match PostgreSQL calculate_full_health function
      // Good: Remaining > ₹10,000
      // OK: Remaining >= 0 (but <= 10,000)
      // Not Well: Short by ₹1 - ₹3,000 (remaining is -3000 to -1)
      // Worrisome: Short by > ₹3,000 (remaining < -3000)
      let category: string;
      if (remaining > 10000) {
        category = 'good';
      } else if (remaining >= 0) {
        category = 'ok';
      } else if (remaining >= -3000) {
        category = 'not_well';
      } else {
        category = 'worrisome';
      }
      
      const healthData = {
        health: {
          remaining: Math.round(remaining),
          category
        },
        formula: "Income - (Fixed + Prorated Variable + Investments + CreditCards)",
        calculation: `${Math.round(totalIncome)} - (${Math.round(totalFixedExpenses)} + ${Math.round(effectiveVariable)} + ${Math.round(totalInvestments)} + ${Math.round(totalCreditCardDue)}) = ${Math.round(remaining)}`,
        monthProgress,
        // Structure expected by frontend
        totalIncome: Math.round(totalIncome),
        obligations: {
          totalFixed: Math.round(totalFixedExpenses),
          unpaidFixed: Math.round(totalFixedExpenses),
          unpaidProratedVariable: Math.round(effectiveVariable),
          totalVariablePlanned: Math.round(totalVariablePlanned),
          totalVariableProrated: Math.round(totalVariableProrated),
          unpaidVariable: Math.round(totalVariableActual),
          totalInvestments: Math.round(totalInvestments),
          unpaidInvestments: Math.round(totalInvestments),
          totalCreditCardDue: Math.round(totalCreditCardDue)
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
        .select('id, username, email, email_verified, encryption_salt, created_at')
        .eq('id', userId)
        .single();
      
      if (profileErr || !profile) return error('User not found', 404);
      return json({ data: profile });
    }
    
    // UPDATE user email (for users who didn't provide at signup)
    if (path === '/user/email' && method === 'PUT') {
      const { email } = await req.json();
      
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return error('Valid email required');
      }
      
      // Check if email already used by another user
      const { data: existingEmail } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .neq('id', userId)
        .single();
      
      if (existingEmail) return error('Email already registered', 409);
      
      // Generate verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      
      await supabase.from('users').update({
        email,
        email_verified: false,
        email_verification_code: verificationCode,
        email_verification_expires: verificationExpires
      }).eq('id', userId);
      
      // Send verification email
      const emailResult = await sendVerificationEmail(email, verificationCode);
      
      return json({ 
        message: 'Email updated. Please verify your email.',
        ...(emailResult.devCode ? { _dev_code: emailResult.devCode } : {})
      });
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
      const { data, error: rpcError } = await supabase.rpc('get_dashboard_data', { p_user_id: userId, p_billing_period_id: null });
      
      // WORKAROUND: Direct queries to bypass broken RPC function
      const { data: directIncomes } = await supabase.from('incomes').select('*').eq('user_id', userId);
      const { data: directFixedExpenses } = await supabase.from('fixed_expenses').select('*').eq('user_id', userId);
      const { data: directVariablePlans } = await supabase.from('variable_expense_plans').select('*').eq('user_id', userId);
      const { data: directVariableActuals } = await supabase.from('variable_expense_actuals').select('*').eq('user_id', userId);
      const { data: directInvestments } = await supabase.from('investments').select('*').eq('user_id', userId);
      const { data: directFutureBombs } = await supabase.from('future_bombs').select('*').eq('user_id', userId);
      
      // #region agent log - DEBUG: Log raw variable actuals for hypothesis B/C
      console.log('[DEBUG_DASH] directVariablePlans count:', directVariablePlans?.length || 0);
      console.log('[DEBUG_DASH] directVariableActuals count:', directVariableActuals?.length || 0);
      if (directVariableActuals?.length) {
        console.log('[DEBUG_DASH] Sample actual:', JSON.stringify(directVariableActuals[0]));
      }
      // #endregion
      
      // Normalize variable plans with actuals/actualTotal (REMOVED DUPLICATE)
      const variablePlans = (directVariablePlans || []).map((plan: any) => {
        const actuals = (directVariableActuals || []).filter((a: any) => a.plan_id === plan.id || a.planId === plan.id);
        const actualTotal = actuals.reduce((sum: number, a: any) => sum + (parseFloat(a.amount) || 0), 0);
        // #region agent log - DEBUG: Log per-plan actuals
        console.log(`[DEBUG_DASH] Plan ${plan.id} (${plan.name}): ${actuals.length} actuals, actualTotal=${actualTotal}`);
        // #endregion
        return { ...plan, actuals, actualTotal };
      });

      timings.dashboardData = Date.now() - t0;
      
      // Query 2: Constraint score
      const t1 = Date.now();
      const { data: constraint } = await supabase.from('constraint_scores').select('*').eq('user_id', userId).single();
      timings.constraintScore = Date.now() - t1;
      
      // Query 2.5: Credit cards (needed for health calc)
      const { data: directCreditCards } = await supabase.from('credit_cards').select('*').eq('user_id', userId);
      
      // Query 3: Health calculation - INLINE to match /health/details exactly
      const t2 = Date.now();
      const today = new Date();
      
      // Calculate health using same logic as /health/details endpoint
      const incomeItems = (directIncomes || []).map((i: any) => ({
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
      const calcTotalVariableActual = (directVariablePlans || []).reduce((sum: number, p: any) => {
        const actuals = (directVariableActuals || []).filter((a: any) => a.plan_id === p.id);
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
      
      // Final remaining
      const calcRemaining = calcTotalIncome - (calcTotalFixed + calcEffectiveVariable + calcTotalInvestments + calcTotalCreditCard);
      
      // Category - must match /health/details exactly
      let calcCategory: string;
      if (calcRemaining > 10000) {
        calcCategory = 'good';
      } else if (calcRemaining >= 0) {
        calcCategory = 'ok';
      } else if (calcRemaining >= -3000) {
        calcCategory = 'not_well';
      } else {
        calcCategory = 'worrisome';
      }
      
      const healthData = {
        health: {
          remaining: Math.round(calcRemaining),
          category: calcCategory
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
        endDate: i.end_date
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
        // #region agent log - DEBUG: Log finalVariablePlans actualTotal calculation
        console.log(`[DEBUG_FINAL] Plan ${plan.id} finalActualTotal=${calcActualTotal}, actuals.length=${actuals.length}`);
        // #endregion
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
        accumulated_funds: i.accumulated_funds || 0,
        accumulated_funds_enc: i.accumulated_funds_enc,
        accumulated_funds_iv: i.accumulated_funds_iv,
        startDate: i.start_date,
        paid: paymentStatus[`investment:${i.id}`] || false
      }));
      
      // Map future bombs
      const finalFutureBombs = (directFutureBombs || []).map((fb: any) => ({
        id: fb.id,
        userId: fb.user_id,
        name: fb.name,
        name_enc: fb.name_enc,
        name_iv: fb.name_iv,
        totalAmount: fb.total_amount,
        total_amount_enc: fb.total_amount_enc,
        total_amount_iv: fb.total_amount_iv,
        savedAmount: fb.saved_amount,
        saved_amount_enc: fb.saved_amount_enc,
        saved_amount_iv: fb.saved_amount_iv,
        targetDate: fb.target_date,
        status: fb.status
      }));
      
      const responseData = {
        incomes: finalIncomes,
        fixedExpenses: finalFixedExpenses,
        variablePlans: finalVariablePlans,
        investments: finalInvestments,
        futureBombs: finalFutureBombs,
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
      // E2E Phase 2: Use encrypted fields, fallback to plaintext, or placeholder
      const hasEncryption = body.source_enc && body.source_iv;
      const insertData: any = { 
        user_id: userId, 
        // Use plaintext if provided, else placeholder for E2E
        name: body.source || (hasEncryption ? '[encrypted]' : null), 
        amount: body.amount ?? (body.amount_enc ? 0 : null), 
        frequency: body.frequency, 
        category: 'employment' 
      };
      // Store encrypted versions if provided
      if (body.source_enc) insertData.source_enc = body.source_enc;
      if (body.source_iv) insertData.source_iv = body.source_iv;
      if (body.amount_enc) insertData.amount_enc = body.amount_enc;
      if (body.amount_iv) insertData.amount_iv = body.amount_iv;
      
      const { data, error: e } = await supabase.from('incomes')
        .insert(insertData)
        .select().single();
      if (e) return error(e.message, 500);
      // Activity log with full details for display
      const logName = body.source || '[encrypted]';
      const logAmount = body.amount || data.amount || 0;
      await logActivity(userId, 'income', 'added income source', { 
        name: logName, 
        amount: logAmount,
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
      if (body.amount) updates.amount = body.amount;
      if (body.frequency) updates.frequency = body.frequency;
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
      const logName = body.name || '[encrypted]';
      const logAmount = body.amount || data.amount || 0;
      await logActivity(userId, 'fixed_expense', 'added fixed expense', { 
        name: logName, 
        amount: logAmount,
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
      const logName = body.name || '[encrypted]';
      const logPlanned = body.planned || data.planned || 0;
      await logActivity(userId, 'variable_expense_plan', 'added variable expense plan', { 
        name: logName, 
        planned: logPlanned,
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
      // Instrumentation
      try {
        await fetch('http://127.0.0.1:7242/ingest/620c30bd-a4ac-4892-8325-a941881cbeee', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: 'api:addVariableActual',
            message: 'Inserted variable actual',
            data: { userId, planId, amount: body.amount, payment_mode: body.payment_mode, subcategory: body.subcategory },
            timestamp: Date.now(),
            sessionId: 'debug-session',
            hypothesisId: 'P0-variable-actual'
          })
        });
      } catch {}
      
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
      
      // Use body.amount for activity log since data.amount may be 0 placeholder for encrypted data
      await logActivity(userId, 'variable_expense', 'added actual expense', { 
        planName: plan?.name,
        category: plan?.category,
        amount: body.amount || data.amount || 0, 
        subcategory: body.subcategory || data.subcategory,
        paymentMode: body.payment_mode || data.payment_mode,
        creditCard: cardName,
        justification: body.justification || data.justification 
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
      // E2E Phase 2: Use encrypted fields, fallback to plaintext, or placeholder
      const hasEncryption = body.name_enc && body.name_iv;
      const insertData: any = { 
        user_id: userId, 
        name: body.name || (hasEncryption ? '[encrypted]' : null), 
        goal: body.goal || (body.goal_enc ? '[encrypted]' : null), 
        monthly_amount: body.monthly_amount ?? (body.monthly_amount_enc ? 0 : null), 
        status: body.status || 'active' 
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
      await logActivity(userId, 'investment', 'added investment', { name: data.name, goal: data.goal, monthlyAmount: data.monthly_amount });
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
        accumulatedFunds: data.accumulated_funds
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
        targetDate: body.target_date,
        encrypted: hasEncryption 
      });
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
      const { data: userData } = await supabase.from('users').select('id, username, email, email_verified, encryption_salt, created_at').eq('id', userId).single();
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
      
      // #region agent log - DEBUG: Activity fetch
      console.log(`[DEBUG_ACTIVITY] Fetching activities for user ${userId}`);
      // #endregion
      
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
      
      // #region agent log - DEBUG: Sample activities being returned
      console.log(`[DEBUG_ACTIVITY] Returning ${formatted.length} activities`);
      if (formatted.length > 0) {
        console.log(`[DEBUG_ACTIVITY_SAMPLE]`, JSON.stringify(formatted.slice(0, 3)));
      }
      // #endregion
      
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

    // EXPORT - reliable direct queries (bypass RPC)
    if ((path === '/export' && method === 'GET') || (path === '/export/finances' && method === 'GET')) {
      const { data: userData, error: userErr } = await supabase.from('users').select('id, username').eq('id', userId).single();
      if (userErr || !userData) return error('Failed to fetch user data', 500);

      const { data: directIncomes } = await supabase.from('incomes').select('*').eq('user_id', userId);
      const { data: directFixedExpenses } = await supabase.from('fixed_expenses').select('*').eq('user_id', userId);
      const { data: directVariablePlans } = await supabase.from('variable_expense_plans').select('*').eq('user_id', userId);
      const { data: directVariableActuals } = await supabase.from('variable_expense_actuals').select('*');
      const { data: directInvestments } = await supabase.from('investments').select('*').eq('user_id', userId);
      const { data: directFutureBombs } = await supabase.from('future_bombs').select('*').eq('user_id', userId);
      const { data: creditCards } = await supabase.from('credit_cards').select('*').eq('user_id', userId);

      const variableExpenses = (directVariablePlans || []).map((plan: any) => {
        const actuals = (directVariableActuals || []).filter((a: any) => a.plan_id === plan.id || a.planId === plan.id);
        const actualTotal = actuals.reduce((sum: number, a: any) => sum + (parseFloat(a.amount) || 0), 0);
        return { ...plan, actuals, actualTotal };
      });

      const loans = (directFixedExpenses || []).filter((exp: any) => 
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

      const { data: activities } = await supabase
        .from('activities')
        .select('*')
        .eq('actor_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      const totalIncome = (directIncomes || []).reduce((sum: number, i: any) => {
        const amount = parseFloat(i.amount) || 0;
        const monthly = i.frequency === 'monthly' ? amount :
          i.frequency === 'quarterly' ? amount / 3 : amount / 12;
        return sum + monthly;
      }, 0);

      const totalFixedExpenses = (directFixedExpenses || []).reduce((sum: number, e: any) => {
        const amount = parseFloat(e.amount) || 0;
        const monthly = e.frequency === 'monthly' ? amount :
          e.frequency === 'quarterly' ? amount / 3 : e.amount / 12;
        return sum + monthly;
      }, 0);

      const totalVariableActual = variableExpenses.reduce((sum: number, p: any) => sum + (p.actualTotal || 0), 0);
      const totalInvestments = (directInvestments || []).reduce((sum: number, inv: any) => sum + (parseFloat(inv.monthly_amount || inv.monthlyAmount || 0)), 0);

      const today = new Date();
      const creditCardDues = (creditCards || []).reduce((sum: number, c: any) => {
        const billAmount = parseFloat(c.bill_amount || c.billAmount || 0);
        const paidAmount = parseFloat(c.paid_amount || c.paidAmount || 0);
        const remaining = billAmount - paidAmount;
        if (remaining > 0) {
          const dueDate = new Date(c.due_date || c.dueDate);
          if (dueDate.getMonth() === today.getMonth() && dueDate.getFullYear() === today.getFullYear()) {
            return sum + remaining;
          }
        }
        return sum;
      }, 0);

      const remainingBalance = totalIncome - (totalFixedExpenses + totalVariableActual + totalInvestments + creditCardDues);
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
          totalInvestments,
          remainingBalance,
          healthCategory
        },
        healthDetails: {}
      };

      return json(exportData);
    }

    return error('Not found', 404);

  } catch (err) {
    console.error('API Error:', err);
    return error('Internal server error', 500);
  }
});

