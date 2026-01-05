// Supabase client for direct frontend access
// This replaces the Railway backend for most operations

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://lvwpurwrktdblctzwctr.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseAnonKey) {
  console.warn('VITE_SUPABASE_ANON_KEY not set - Supabase client will not work');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// ============================================================================
// AUTH FUNCTIONS
// ============================================================================

export async function signUp(email: string, password: string, username: string) {
  // Sign up with Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username }
    }
  });
  
  if (authError) throw authError;
  
  // Create user profile in our users table
  if (authData.user) {
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        username,
        password_hash: 'managed_by_supabase_auth', // Supabase Auth handles passwords
        created_at: new Date().toISOString()
      });
    
    if (profileError) throw profileError;
    
    // Create default preferences
    await supabase
      .from('user_preferences')
      .insert({
        user_id: authData.user.id,
        month_start_day: 1,
        currency: 'INR'
      });
    
    // Create default constraint score
    await supabase
      .from('constraint_scores')
      .insert({
        user_id: authData.user.id,
        score: 0,
        tier: 'green'
      });
  }
  
  return authData;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function getUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
}

// ============================================================================
// DASHBOARD DATA (Single Query)
// ============================================================================

export async function getDashboardData() {
  const user = await getUser();
  if (!user) throw new Error('Not authenticated');
  
  // Call the optimized PostgreSQL function
  const { data, error } = await supabase
    .rpc('get_dashboard_data', { 
      p_user_id: user.id,
      p_billing_period_id: null
    });
  
  if (error) throw error;
  return data;
}

// ============================================================================
// INCOMES
// ============================================================================

export async function getIncomes() {
  const { data, error } = await supabase
    .from('incomes')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
}

export async function addIncome(income: {
  name: string;
  amount: number;
  category: string;
  frequency: string;
  start_date?: string;
  end_date?: string;
}) {
  const user = await getUser();
  if (!user) throw new Error('Not authenticated');
  
  const { data, error } = await supabase
    .from('incomes')
    .insert({ ...income, user_id: user.id })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateIncome(id: string, updates: Partial<{
  name: string;
  amount: number;
  category: string;
  frequency: string;
  start_date: string;
  end_date: string;
}>) {
  const { data, error } = await supabase
    .from('incomes')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteIncome(id: string) {
  const { error } = await supabase
    .from('incomes')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

// ============================================================================
// FIXED EXPENSES
// ============================================================================

export async function getFixedExpenses() {
  const { data, error } = await supabase
    .from('fixed_expenses')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
}

export async function addFixedExpense(expense: {
  name: string;
  amount: number;
  category: string;
  frequency: string;
  is_sip?: boolean;
  start_date?: string;
  end_date?: string;
}) {
  const user = await getUser();
  if (!user) throw new Error('Not authenticated');
  
  const { data, error } = await supabase
    .from('fixed_expenses')
    .insert({ ...expense, user_id: user.id })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateFixedExpense(id: string, updates: Partial<{
  name: string;
  amount: number;
  category: string;
  frequency: string;
  is_sip: boolean;
  start_date: string;
  end_date: string;
}>) {
  const { data, error } = await supabase
    .from('fixed_expenses')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteFixedExpense(id: string) {
  const { error } = await supabase
    .from('fixed_expenses')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

// ============================================================================
// VARIABLE EXPENSE PLANS
// ============================================================================

export async function getVariablePlans() {
  const { data, error } = await supabase
    .from('variable_expense_plans')
    .select(`
      *,
      variable_expense_actuals (*)
    `)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
}

export async function addVariablePlan(plan: {
  name: string;
  planned: number;
  category: string;
  start_date: string;
  end_date?: string;
}) {
  const user = await getUser();
  if (!user) throw new Error('Not authenticated');
  
  const { data, error } = await supabase
    .from('variable_expense_plans')
    .insert({ ...plan, user_id: user.id })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function addVariableActual(actual: {
  plan_id: string;
  amount: number;
  incurred_at: string;
  justification?: string;
  subcategory?: string;
  payment_mode: string;
  credit_card_id?: string;
}) {
  const user = await getUser();
  if (!user) throw new Error('Not authenticated');
  
  const { data, error } = await supabase
    .from('variable_expense_actuals')
    .insert({ ...actual, user_id: user.id })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// ============================================================================
// INVESTMENTS
// ============================================================================

export async function getInvestments() {
  const { data, error } = await supabase
    .from('investments')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
}

export async function addInvestment(investment: {
  name: string;
  monthly_amount: number;
  goal?: string;
  status?: string;
}) {
  const user = await getUser();
  if (!user) throw new Error('Not authenticated');
  
  const { data, error } = await supabase
    .from('investments')
    .insert({ ...investment, user_id: user.id })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// ============================================================================
// FUTURE BOMBS
// ============================================================================

export async function getFutureBombs() {
  const { data, error } = await supabase
    .from('future_bombs')
    .select('*')
    .order('due_date', { ascending: true });
  
  if (error) throw error;
  return data;
}

export async function addFutureBomb(bomb: {
  name: string;
  due_date: string;
  total_amount: number;
  saved_amount?: number;
}) {
  const user = await getUser();
  if (!user) throw new Error('Not authenticated');
  
  const { data, error } = await supabase
    .from('future_bombs')
    .insert({ ...bomb, user_id: user.id })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// ============================================================================
// USER PREFERENCES
// ============================================================================

export async function getPreferences() {
  const user = await getUser();
  if (!user) throw new Error('Not authenticated');
  
  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', user.id)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
  return data;
}

export async function updatePreferences(updates: {
  month_start_day?: number;
  currency?: string;
  timezone?: string;
  use_prorated?: boolean;
}) {
  const user = await getUser();
  if (!user) throw new Error('Not authenticated');
  
  const { data, error } = await supabase
    .from('user_preferences')
    .upsert({ user_id: user.id, ...updates })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// ============================================================================
// CONSTRAINT SCORE
// ============================================================================

export async function getConstraintScore() {
  const user = await getUser();
  if (!user) throw new Error('Not authenticated');
  
  const { data, error } = await supabase
    .from('constraint_scores')
    .select('*')
    .eq('user_id', user.id)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

// ============================================================================
// HEALTH CALCULATION (via PostgreSQL function)
// ============================================================================

export async function calculateHealth() {
  const user = await getUser();
  if (!user) throw new Error('Not authenticated');
  
  // Use the PostgreSQL function we created
  const { data, error } = await supabase
    .rpc('calculate_user_health', { uid: user.id });
  
  if (error) throw error;
  return data;
}

// ============================================================================
// EXPORT DATA
// ============================================================================

export async function exportUserData() {
  const dashboardData = await getDashboardData();
  return dashboardData;
}



