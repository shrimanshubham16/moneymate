// API client that uses Supabase Edge Functions instead of Railway
// This eliminates the Railway backend entirely

import { createClient } from '@supabase/supabase-js';

export type LoginResponse = { access_token: string; user: { id: string; username: string }; encryption_salt?: string };

// Supabase configuration
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://lvwpurwrktdblctzwctr.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper to call Edge Functions
async function callEdgeFunction<T>(
  functionName: string, 
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'POST',
  body?: any,
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.error?.message || `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

// ============================================================================
// AUTH
// ============================================================================

export async function signup(
  username: string, 
  password: string, 
  encryptionSalt: string, 
  recoveryKeyHash: string
): Promise<LoginResponse> {
  return callEdgeFunction<LoginResponse>('auth/signup', 'POST', {
    username,
    password,
    encryptionSalt,
    recoveryKeyHash
  });
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  return callEdgeFunction<LoginResponse>('auth/login', 'POST', {
    username,
    password
  });
}

export async function fetchSalt(username: string): Promise<{ encryption_salt: string }> {
  return callEdgeFunction<{ encryption_salt: string }>(`auth/salt/${encodeURIComponent(username)}`, 'GET');
}

// ============================================================================
// DASHBOARD
// ============================================================================

export async function fetchDashboard(token: string, asOf?: string) {
  const query = asOf ? `?today=${encodeURIComponent(asOf)}` : '';
  return callEdgeFunction<{ data: any }>(`dashboard${query}`, 'GET', undefined, token);
}

// ============================================================================
// DIRECT SUPABASE CALLS (with anon key + user's JWT for RLS bypass via service role in Edge Function)
// For operations that need Edge Functions due to complex logic
// ============================================================================

// Helper to get current user from token
function parseToken(token: string): { userId: string; username: string } | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return { userId: payload.userId, username: payload.username };
  } catch {
    return null;
  }
}

// ============================================================================
// PLANNING - INCOME
// ============================================================================

export async function createIncome(
  token: string, 
  payload: { source: string; amount: number; frequency: string }
) {
  const user = parseToken(token);
  if (!user) throw new Error('Invalid token');

  const { data, error } = await supabase
    .from('incomes')
    .insert({
      user_id: user.userId,
      name: payload.source,
      amount: payload.amount,
      frequency: payload.frequency,
      category: 'employment',
      start_date: new Date().toISOString().split('T')[0]
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return { data };
}

export async function updateIncome(
  token: string,
  id: string,
  payload: Partial<{ source: string; amount: number; frequency: string }>
) {
  const updates: any = {};
  if (payload.source !== undefined) updates.name = payload.source;
  if (payload.amount !== undefined) updates.amount = payload.amount;
  if (payload.frequency !== undefined) updates.frequency = payload.frequency;

  const { data, error } = await supabase
    .from('incomes')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return { data };
}

export async function deleteIncome(token: string, id: string) {
  const { error } = await supabase
    .from('incomes')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
  return { data: { deleted: true } };
}

// ============================================================================
// PLANNING - FIXED EXPENSES
// ============================================================================

export async function createFixedExpense(
  token: string,
  payload: { name: string; amount: number; frequency: string; category: string; is_sip_flag?: boolean }
) {
  const user = parseToken(token);
  if (!user) throw new Error('Invalid token');

  const { data, error } = await supabase
    .from('fixed_expenses')
    .insert({
      user_id: user.userId,
      name: payload.name,
      amount: payload.amount,
      frequency: payload.frequency,
      category: payload.category,
      is_sip: payload.is_sip_flag || false,
      start_date: new Date().toISOString().split('T')[0]
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return { data };
}

export async function updateFixedExpense(
  token: string,
  id: string,
  payload: Partial<{ name: string; amount: number; frequency: string; category: string; is_sip_flag: boolean }>
) {
  const updates: any = {};
  if (payload.name !== undefined) updates.name = payload.name;
  if (payload.amount !== undefined) updates.amount = payload.amount;
  if (payload.frequency !== undefined) updates.frequency = payload.frequency;
  if (payload.category !== undefined) updates.category = payload.category;
  if (payload.is_sip_flag !== undefined) updates.is_sip = payload.is_sip_flag;

  const { data, error } = await supabase
    .from('fixed_expenses')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return { data };
}

export async function deleteFixedExpense(token: string, id: string) {
  const { error } = await supabase
    .from('fixed_expenses')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
  return { data: { deleted: true } };
}

// ============================================================================
// PLANNING - VARIABLE EXPENSES
// ============================================================================

export async function createVariablePlan(
  token: string,
  payload: { name: string; planned: number; category: string; start_date: string }
) {
  const user = parseToken(token);
  if (!user) throw new Error('Invalid token');

  const { data, error } = await supabase
    .from('variable_expense_plans')
    .insert({
      user_id: user.userId,
      name: payload.name,
      planned: payload.planned,
      category: payload.category,
      start_date: payload.start_date
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return { data };
}

export async function addVariableActual(
  token: string,
  planId: string,
  payload: {
    amount: number;
    incurred_at: string;
    justification?: string;
    subcategory?: string;
    payment_mode: string;
    credit_card_id?: string;
  }
) {
  const user = parseToken(token);
  if (!user) throw new Error('Invalid token');

  const { data, error } = await supabase
    .from('variable_expense_actuals')
    .insert({
      user_id: user.userId,
      plan_id: planId,
      amount: payload.amount,
      incurred_at: payload.incurred_at,
      justification: payload.justification,
      subcategory: payload.subcategory,
      payment_mode: payload.payment_mode,
      credit_card_id: payload.credit_card_id
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return { data };
}

export async function updateVariableActual(
  token: string,
  actualId: string,
  payload: Partial<{
    amount: number;
    incurred_at: string;
    justification: string;
    subcategory: string;
    payment_mode: string;
    credit_card_id: string;
  }>
) {
  const { data, error } = await supabase
    .from('variable_expense_actuals')
    .update(payload)
    .eq('id', actualId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return { data };
}

export async function deleteVariableActual(token: string, actualId: string) {
  const { error } = await supabase
    .from('variable_expense_actuals')
    .delete()
    .eq('id', actualId);

  if (error) throw new Error(error.message);
  return { data: { deleted: true } };
}

export async function deleteVariablePlan(token: string, planId: string) {
  const { error } = await supabase
    .from('variable_expense_plans')
    .delete()
    .eq('id', planId);

  if (error) throw new Error(error.message);
  return { data: { deleted: true } };
}

// ============================================================================
// INVESTMENTS
// ============================================================================

export async function createInvestment(
  token: string,
  payload: { name: string; goal?: string; monthly_amount: number }
) {
  const user = parseToken(token);
  if (!user) throw new Error('Invalid token');

  const { data, error } = await supabase
    .from('investments')
    .insert({
      user_id: user.userId,
      name: payload.name,
      goal: payload.goal,
      monthly_amount: payload.monthly_amount,
      status: 'active'
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return { data };
}

export async function updateInvestment(
  token: string,
  id: string,
  payload: Partial<{ name: string; goal: string; monthly_amount: number; status: string }>
) {
  const { data, error } = await supabase
    .from('investments')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return { data };
}

export async function deleteInvestment(token: string, id: string) {
  const { error } = await supabase
    .from('investments')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
  return { data: { deleted: true } };
}

// ============================================================================
// FUTURE BOMBS
// ============================================================================

export async function createFutureBomb(
  token: string,
  payload: { name: string; due_date: string; total_amount: number; saved_amount?: number }
) {
  const user = parseToken(token);
  if (!user) throw new Error('Invalid token');

  const { data, error } = await supabase
    .from('future_bombs')
    .insert({
      user_id: user.userId,
      name: payload.name,
      due_date: payload.due_date,
      total_amount: payload.total_amount,
      saved_amount: payload.saved_amount || 0
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return { data };
}

export async function updateFutureBomb(
  token: string,
  id: string,
  payload: Partial<{ name: string; due_date: string; total_amount: number; saved_amount: number }>
) {
  const { data, error } = await supabase
    .from('future_bombs')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return { data };
}

export async function deleteFutureBomb(token: string, id: string) {
  const { error } = await supabase
    .from('future_bombs')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
  return { data: { deleted: true } };
}

// ============================================================================
// LOANS
// ============================================================================

export async function createLoan(
  token: string,
  payload: { name: string; principal: number; remaining_tenure_months: number; emi: number }
) {
  const user = parseToken(token);
  if (!user) throw new Error('Invalid token');

  const { data, error } = await supabase
    .from('loans')
    .insert({
      user_id: user.userId,
      name: payload.name,
      principal: payload.principal,
      remaining_tenure_months: payload.remaining_tenure_months,
      emi: payload.emi
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return { data };
}

export async function updateLoan(
  token: string,
  id: string,
  payload: Partial<{ name: string; principal: number; remaining_tenure_months: number; emi: number }>
) {
  const { data, error } = await supabase
    .from('loans')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return { data };
}

export async function deleteLoan(token: string, id: string) {
  const { error } = await supabase
    .from('loans')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
  return { data: { deleted: true } };
}

// ============================================================================
// CREDIT CARDS
// ============================================================================

export async function createCreditCard(
  token: string,
  payload: { name: string; statement_date: string; due_date: string; billing_date?: number }
) {
  const user = parseToken(token);
  if (!user) throw new Error('Invalid token');

  const { data, error } = await supabase
    .from('credit_cards')
    .insert({
      user_id: user.userId,
      name: payload.name,
      statement_date: payload.statement_date,
      due_date: payload.due_date,
      billing_date: payload.billing_date
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return { data };
}

export async function updateCreditCard(
  token: string,
  id: string,
  payload: Partial<{ 
    name: string; 
    statement_date: string; 
    due_date: string; 
    bill_amount: number;
    paid_amount: number;
    billing_date: number;
  }>
) {
  const { data, error } = await supabase
    .from('credit_cards')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return { data };
}

export async function deleteCreditCard(token: string, id: string) {
  const { error } = await supabase
    .from('credit_cards')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
  return { data: { deleted: true } };
}

// ============================================================================
// PREFERENCES
// ============================================================================

export async function getPreferences(token: string) {
  const user = parseToken(token);
  if (!user) throw new Error('Invalid token');

  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', user.userId)
    .single();

  if (error && error.code !== 'PGRST116') throw new Error(error.message);
  return { data: data || { month_start_day: 1, currency: 'INR' } };
}

export async function updatePreferences(
  token: string,
  payload: { month_start_day?: number; currency?: string; timezone?: string; use_prorated?: boolean }
) {
  const user = parseToken(token);
  if (!user) throw new Error('Invalid token');

  const { data, error } = await supabase
    .from('user_preferences')
    .upsert({
      user_id: user.userId,
      ...payload,
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return { data };
}

// ============================================================================
// EXPORT
// ============================================================================

export async function exportData(token: string) {
  return fetchDashboard(token);
}

// ============================================================================
// PAYMENT TRACKING (in-memory on frontend for now)
// ============================================================================

const paymentStatus: Record<string, Record<string, boolean>> = {};

export async function markAsPaid(token: string, entityType: string, entityId: string, month: string) {
  const user = parseToken(token);
  if (!user) throw new Error('Invalid token');
  
  const key = `${user.userId}:${month}`;
  if (!paymentStatus[key]) paymentStatus[key] = {};
  paymentStatus[key][`${entityType}:${entityId}`] = true;
  
  return { data: { success: true } };
}

export async function markAsUnpaid(token: string, entityType: string, entityId: string, month: string) {
  const user = parseToken(token);
  if (!user) throw new Error('Invalid token');
  
  const key = `${user.userId}:${month}`;
  if (paymentStatus[key]) {
    delete paymentStatus[key][`${entityType}:${entityId}`];
  }
  
  return { data: { success: true } };
}

// ============================================================================
// ACTIVITIES (read-only for now)
// ============================================================================

export async function getActivities(token: string) {
  const user = parseToken(token);
  if (!user) throw new Error('Invalid token');

  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .eq('actor_id', user.userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);
  return { data };
}



