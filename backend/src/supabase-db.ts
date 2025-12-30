// Supabase Database Access Layer
// Replaces getStore() with direct Supabase queries
import { supabase } from './supabase';
import { withRetry } from './supabase-retry';
import {
  User,
  Income,
  FixedExpense,
  VariableExpensePlan,
  VariableExpenseActual,
  Investment,
  FutureBomb,
  CreditCard,
  Loan,
  Activity,
  ConstraintScore,
  ThemeState,
  SharedAccount,
  SharedMember,
  SharingRequest
} from './mockData';

// UserPreferences type (from preferences.ts)
export type UserPreferences = {
  userId: string;
  monthStartDay: number;
  currency: string;
  timezone: string;
  useProrated?: boolean;
};

// ============================================================================
// USERS
// ============================================================================

export async function getUserById(userId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (error || !data) return null;
  
  return {
    id: data.id,
    username: data.username,
    passwordHash: data.password_hash
  };
}

export async function getUserByUsername(username: string): Promise<User | null> {
  return withRetry(async () => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();
    
    if (error) {
      // 406 = no rows returned (not an error, just no user found)
      if (error.code === 'PGRST116' || error.message?.includes('No rows')) {
        return null;
      }
      throw error;
    }
    
    if (!data) return null;
    
    return {
      id: data.id,
      username: data.username,
      passwordHash: data.password_hash
    };
  });
}

export async function createUser(user: Omit<User, 'id'> & { id?: string }): Promise<User> {
  return withRetry(async () => {
    const { data, error } = await supabase
      .from('users')
      .insert({
        id: user.id,
        username: user.username,
        password_hash: user.passwordHash,
        created_at: new Date().toISOString(),
        failed_login_attempts: 0,
        account_locked_until: null
      })
      .select()
      .single();
    
    if (error) {
      // Check for duplicate username
      if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('unique')) {
        throw new Error('Username already exists');
      }
      throw error;
    }
    
    return {
      id: data.id,
      username: data.username,
      passwordHash: data.password_hash
    };
  });
}

export async function updateUser(userId: string, updates: Partial<{ passwordHash?: string; failedLoginAttempts?: number; accountLockedUntil?: string | null }>): Promise<void> {
  const updateData: any = {};
  if (updates.passwordHash !== undefined) updateData.password_hash = updates.passwordHash;
  if (updates.failedLoginAttempts !== undefined) updateData.failed_login_attempts = updates.failedLoginAttempts;
  if (updates.accountLockedUntil !== undefined) updateData.account_locked_until = updates.accountLockedUntil;
  
  const { error } = await supabase
    .from('users')
    .update(updateData)
    .eq('id', userId);
  
  if (error) throw error;
}

// ============================================================================
// INCOMES
// ============================================================================

export async function getIncomesByUserId(userId: string): Promise<Income[]> {
  const { data, error } = await supabase
    .from('incomes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  
  return (data || []).map(row => ({
    id: row.id,
    userId: row.user_id,
    name: row.name,
    amount: row.amount,
    category: row.category,
    frequency: row.frequency,
    startDate: row.start_date,
    endDate: row.end_date,
    name_encrypted: row.name_encrypted,
    name_iv: row.name_iv,
    amount_encrypted: row.amount_encrypted,
    amount_iv: row.amount_iv,
    description: row.description,
    description_encrypted: row.description_encrypted,
    description_iv: row.description_iv
  }));
}

export async function getIncomesByUserIds(userIds: string[]): Promise<Income[]> {
  if (userIds.length === 0) return [];
  
  const { data, error } = await supabase
    .from('incomes')
    .select('*')
    .in('user_id', userIds)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  
  return (data || []).map(row => ({
    id: row.id,
    userId: row.user_id,
    name: row.name,
    amount: row.amount,
    category: row.category,
    frequency: row.frequency,
    startDate: row.start_date,
    endDate: row.end_date,
    name_encrypted: row.name_encrypted,
    name_iv: row.name_iv,
    amount_encrypted: row.amount_encrypted,
    amount_iv: row.amount_iv,
    description: row.description,
    description_encrypted: row.description_encrypted,
    description_iv: row.description_iv
  }));
}

export async function createIncome(income: Omit<Income, 'id'> & { id?: string }): Promise<Income> {
  const { data, error } = await supabase
    .from('incomes')
    .insert({
      id: income.id,
      user_id: income.userId,
      name: income.name,
      amount: income.amount,
      category: income.category,
      frequency: income.frequency,
      start_date: income.startDate,
      end_date: income.endDate,
      name_encrypted: income.name_encrypted,
      name_iv: income.name_iv,
      amount_encrypted: income.amount_encrypted,
      amount_iv: income.amount_iv,
      description: income.description,
      description_encrypted: income.description_encrypted,
      description_iv: income.description_iv
    })
    .select()
    .single();
  
  if (error) throw error;
  
  return {
    id: data.id,
    userId: data.user_id,
    name: data.name,
    amount: data.amount,
    category: data.category,
    frequency: data.frequency,
    startDate: data.start_date,
    endDate: data.end_date,
    name_encrypted: data.name_encrypted,
    name_iv: data.name_iv,
    amount_encrypted: data.amount_encrypted,
    amount_iv: data.amount_iv,
    description: data.description,
    description_encrypted: data.description_encrypted,
    description_iv: data.description_iv
  };
}

export async function updateIncome(incomeId: string, updates: Partial<Income>): Promise<void> {
  const updateData: any = {};
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.amount !== undefined) updateData.amount = updates.amount;
  if (updates.category !== undefined) updateData.category = updates.category;
  if (updates.frequency !== undefined) updateData.frequency = updates.frequency;
  if (updates.startDate !== undefined) updateData.start_date = updates.startDate;
  if (updates.endDate !== undefined) updateData.end_date = updates.endDate;
  
  const { error } = await supabase
    .from('incomes')
    .update(updateData)
    .eq('id', incomeId);
  
  if (error) throw error;
}

export async function deleteIncome(incomeId: string): Promise<void> {
  const { error } = await supabase
    .from('incomes')
    .delete()
    .eq('id', incomeId);
  
  if (error) throw error;
}

// ============================================================================
// FIXED EXPENSES
// ============================================================================

export async function getFixedExpensesByUserId(userId: string): Promise<FixedExpense[]> {
  const { data, error } = await supabase
    .from('fixed_expenses')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  
  return (data || []).map(row => ({
    id: row.id,
    userId: row.user_id,
    name: row.name,
    amount: row.amount,
    frequency: row.frequency,
    category: row.category,
    isSip: row.is_sip,
    startDate: row.start_date,
    endDate: row.end_date
  }));
}

export async function getFixedExpensesByUserIds(userIds: string[]): Promise<FixedExpense[]> {
  if (userIds.length === 0) return [];
  
  const { data, error } = await supabase
    .from('fixed_expenses')
    .select('*')
    .in('user_id', userIds)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  
  return (data || []).map(row => ({
    id: row.id,
    userId: row.user_id,
    name: row.name,
    amount: row.amount,
    frequency: row.frequency,
    category: row.category,
    isSip: row.is_sip,
    startDate: row.start_date,
    endDate: row.end_date
  }));
}

export async function createFixedExpense(expense: Omit<FixedExpense, 'id'> & { id?: string }): Promise<FixedExpense> {
  const { data, error } = await supabase
    .from('fixed_expenses')
    .insert({
      id: expense.id,
      user_id: expense.userId,
      name: expense.name,
      amount: expense.amount,
      frequency: expense.frequency,
      category: expense.category,
      is_sip: expense.isSip,
      start_date: expense.startDate,
      end_date: expense.endDate
    })
    .select()
    .single();
  
  if (error) throw error;
  
  return {
    id: data.id,
    userId: data.user_id,
    name: data.name,
    amount: data.amount,
    frequency: data.frequency,
    category: data.category,
    isSip: data.is_sip,
    startDate: data.start_date,
    endDate: data.end_date
  };
}

export async function updateFixedExpense(expenseId: string, updates: Partial<FixedExpense>): Promise<void> {
  const updateData: any = {};
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.amount !== undefined) updateData.amount = updates.amount;
  if (updates.frequency !== undefined) updateData.frequency = updates.frequency;
  if (updates.category !== undefined) updateData.category = updates.category;
  if (updates.isSip !== undefined) updateData.is_sip = updates.isSip;
  if (updates.startDate !== undefined) updateData.start_date = updates.startDate;
  if (updates.endDate !== undefined) updateData.end_date = updates.endDate;
  
  const { error } = await supabase
    .from('fixed_expenses')
    .update(updateData)
    .eq('id', expenseId);
  
  if (error) throw error;
}

export async function deleteFixedExpense(expenseId: string): Promise<void> {
  const { error } = await supabase
    .from('fixed_expenses')
    .delete()
    .eq('id', expenseId);
  
  if (error) throw error;
}

// ============================================================================
// VARIABLE EXPENSE PLANS
// ============================================================================

export async function getVariablePlansByUserId(userId: string): Promise<VariableExpensePlan[]> {
  const { data, error } = await supabase
    .from('variable_expense_plans')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  
  return (data || []).map(row => ({
    id: row.id,
    userId: row.user_id,
    name: row.name,
    planned: row.planned,
    category: row.category,
    startDate: row.start_date,
    endDate: row.end_date
  }));
}

export async function getVariablePlansByUserIds(userIds: string[]): Promise<VariableExpensePlan[]> {
  if (userIds.length === 0) return [];
  
  const { data, error } = await supabase
    .from('variable_expense_plans')
    .select('*')
    .in('user_id', userIds)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  
  return (data || []).map(row => ({
    id: row.id,
    userId: row.user_id,
    name: row.name,
    planned: row.planned,
    category: row.category,
    startDate: row.start_date,
    endDate: row.end_date
  }));
}

export async function createVariablePlan(plan: Omit<VariableExpensePlan, 'id'> & { id?: string }): Promise<VariableExpensePlan> {
  const { data, error } = await supabase
    .from('variable_expense_plans')
    .insert({
      id: plan.id,
      user_id: plan.userId,
      name: plan.name,
      planned: plan.planned,
      category: plan.category,
      start_date: plan.startDate,
      end_date: plan.endDate
    })
    .select()
    .single();
  
  if (error) throw error;
  
  return {
    id: data.id,
    userId: data.user_id,
    name: data.name,
    planned: data.planned,
    category: data.category,
    startDate: data.start_date,
    endDate: data.end_date
  };
}

export async function updateVariablePlan(planId: string, updates: Partial<VariableExpensePlan>): Promise<void> {
  const updateData: any = {};
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.planned !== undefined) updateData.planned = updates.planned;
  if (updates.category !== undefined) updateData.category = updates.category;
  if (updates.startDate !== undefined) updateData.start_date = updates.startDate;
  if (updates.endDate !== undefined) updateData.end_date = updates.endDate;
  
  const { error } = await supabase
    .from('variable_expense_plans')
    .update(updateData)
    .eq('id', planId);
  
  if (error) throw error;
}

export async function deleteVariablePlan(planId: string): Promise<void> {
  const { error } = await supabase
    .from('variable_expense_plans')
    .delete()
    .eq('id', planId);
  
  if (error) throw error;
}

// ============================================================================
// VARIABLE EXPENSE ACTUALS
// ============================================================================

export async function getVariableActualsByUserId(userId: string): Promise<VariableExpenseActual[]> {
  const { data, error } = await supabase
    .from('variable_expense_actuals')
    .select('*')
    .eq('user_id', userId)
    .order('incurred_at', { ascending: false });
  
  if (error) throw error;
  
  return (data || []).map(row => ({
    id: row.id,
    userId: row.user_id,
    planId: row.plan_id,
    amount: row.amount,
    incurredAt: row.incurred_at,
    justification: row.justification,
    subcategory: row.subcategory,
    paymentMode: row.payment_mode,
    creditCardId: row.credit_card_id
  }));
}

export async function getVariableActualsByPlanId(planId: string): Promise<VariableExpenseActual[]> {
  const { data, error } = await supabase
    .from('variable_expense_actuals')
    .select('*')
    .eq('plan_id', planId)
    .order('incurred_at', { ascending: false });
  
  if (error) throw error;
  
  return (data || []).map(row => ({
    id: row.id,
    userId: row.user_id,
    planId: row.plan_id,
    amount: row.amount,
    incurredAt: row.incurred_at,
    justification: row.justification,
    subcategory: row.subcategory,
    paymentMode: row.payment_mode,
    creditCardId: row.credit_card_id
  }));
}

export async function getVariableActualsByUserIds(userIds: string[]): Promise<VariableExpenseActual[]> {
  if (userIds.length === 0) return [];
  
  const { data, error } = await supabase
    .from('variable_expense_actuals')
    .select('*')
    .in('user_id', userIds)
    .order('incurred_at', { ascending: false });
  
  if (error) throw error;
  
  return (data || []).map(row => ({
    id: row.id,
    userId: row.user_id,
    planId: row.plan_id,
    amount: row.amount,
    incurredAt: row.incurred_at,
    justification: row.justification,
    subcategory: row.subcategory,
    paymentMode: row.payment_mode,
    creditCardId: row.credit_card_id
  }));
}

export async function createVariableActual(actual: Omit<VariableExpenseActual, 'id'> & { id?: string }): Promise<VariableExpenseActual> {
  const { data, error } = await supabase
    .from('variable_expense_actuals')
    .insert({
      id: actual.id,
      user_id: actual.userId,
      plan_id: actual.planId,
      amount: actual.amount,
      incurred_at: actual.incurredAt,
      justification: actual.justification,
      subcategory: actual.subcategory || 'Unspecified',
      payment_mode: actual.paymentMode,
      credit_card_id: actual.creditCardId
    })
    .select()
    .single();
  
  if (error) throw error;
  
  return {
    id: data.id,
    userId: data.user_id,
    planId: data.plan_id,
    amount: data.amount,
    incurredAt: data.incurred_at,
    justification: data.justification,
    subcategory: data.subcategory,
    paymentMode: data.payment_mode,
    creditCardId: data.credit_card_id
  };
}

export async function deleteVariableActual(actualId: string): Promise<void> {
  const { error } = await supabase
    .from('variable_expense_actuals')
    .delete()
    .eq('id', actualId);
  
  if (error) throw error;
}

// ============================================================================
// INVESTMENTS
// ============================================================================

export async function getInvestmentsByUserId(userId: string): Promise<Investment[]> {
  const { data, error } = await supabase
    .from('investments')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  
  return (data || []).map(row => ({
    id: row.id,
    userId: row.user_id,
    name: row.name,
    goal: row.goal,
    monthlyAmount: row.monthly_amount,
    status: row.status
  }));
}

export async function getInvestmentsByUserIds(userIds: string[]): Promise<Investment[]> {
  if (userIds.length === 0) return [];
  
  const { data, error } = await supabase
    .from('investments')
    .select('*')
    .in('user_id', userIds)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  
  return (data || []).map(row => ({
    id: row.id,
    userId: row.user_id,
    name: row.name,
    goal: row.goal,
    monthlyAmount: row.monthly_amount,
    status: row.status
  }));
}

export async function createInvestment(investment: Omit<Investment, 'id'> & { id?: string }): Promise<Investment> {
  const { data, error } = await supabase
    .from('investments')
    .insert({
      id: investment.id,
      user_id: investment.userId,
      name: investment.name,
      goal: investment.goal,
      monthly_amount: investment.monthlyAmount,
      status: investment.status || 'active'
    })
    .select()
    .single();
  
  if (error) throw error;
  
  return {
    id: data.id,
    userId: data.user_id,
    name: data.name,
    goal: data.goal,
    monthlyAmount: data.monthly_amount,
    status: data.status
  };
}

export async function updateInvestment(investmentId: string, updates: Partial<Investment>): Promise<void> {
  const updateData: any = {};
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.goal !== undefined) updateData.goal = updates.goal;
  if (updates.monthlyAmount !== undefined) updateData.monthly_amount = updates.monthlyAmount;
  if (updates.status !== undefined) updateData.status = updates.status;
  
  const { error } = await supabase
    .from('investments')
    .update(updateData)
    .eq('id', investmentId);
  
  if (error) throw error;
}

export async function deleteInvestment(investmentId: string): Promise<void> {
  const { error } = await supabase
    .from('investments')
    .delete()
    .eq('id', investmentId);
  
  if (error) throw error;
}

// ============================================================================
// FUTURE BOMBS
// ============================================================================

export async function getFutureBombsByUserId(userId: string): Promise<FutureBomb[]> {
  const { data, error } = await supabase
    .from('future_bombs')
    .select('*')
    .eq('user_id', userId)
    .order('due_date', { ascending: true });
  
  if (error) throw error;
  
  return (data || []).map(row => ({
    id: row.id,
    userId: row.user_id,
    name: row.name,
    dueDate: row.due_date,
    totalAmount: row.total_amount,
    savedAmount: row.saved_amount,
    monthlyEquivalent: row.monthly_equivalent,
    preparednessRatio: row.preparedness_ratio
  }));
}

export async function getFutureBombsByUserIds(userIds: string[]): Promise<FutureBomb[]> {
  if (userIds.length === 0) return [];
  
  const { data, error } = await supabase
    .from('future_bombs')
    .select('*')
    .in('user_id', userIds)
    .order('due_date', { ascending: true });
  
  if (error) throw error;
  
  return (data || []).map(row => ({
    id: row.id,
    userId: row.user_id,
    name: row.name,
    dueDate: row.due_date,
    totalAmount: row.total_amount,
    savedAmount: row.saved_amount,
    monthlyEquivalent: row.monthly_equivalent,
    preparednessRatio: row.preparedness_ratio
  }));
}

export async function createFutureBomb(bomb: Omit<FutureBomb, 'id'> & { id?: string }): Promise<FutureBomb> {
  const { data, error } = await supabase
    .from('future_bombs')
    .insert({
      id: bomb.id,
      user_id: bomb.userId,
      name: bomb.name,
      due_date: bomb.dueDate,
      total_amount: bomb.totalAmount,
      saved_amount: bomb.savedAmount || 0,
      monthly_equivalent: bomb.monthlyEquivalent,
      preparedness_ratio: bomb.preparednessRatio || 0
    })
    .select()
    .single();
  
  if (error) throw error;
  
  return {
    id: data.id,
    userId: data.user_id,
    name: data.name,
    dueDate: data.due_date,
    totalAmount: data.total_amount,
    savedAmount: data.saved_amount,
    monthlyEquivalent: data.monthly_equivalent,
    preparednessRatio: data.preparedness_ratio
  };
}

export async function updateFutureBomb(bombId: string, updates: Partial<FutureBomb>): Promise<void> {
  const updateData: any = {};
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.dueDate !== undefined) updateData.due_date = updates.dueDate;
  if (updates.totalAmount !== undefined) updateData.total_amount = updates.totalAmount;
  if (updates.savedAmount !== undefined) updateData.saved_amount = updates.savedAmount;
  if (updates.monthlyEquivalent !== undefined) updateData.monthly_equivalent = updates.monthlyEquivalent;
  if (updates.preparednessRatio !== undefined) updateData.preparedness_ratio = updates.preparednessRatio;
  
  const { error } = await supabase
    .from('future_bombs')
    .update(updateData)
    .eq('id', bombId);
  
  if (error) throw error;
}

export async function deleteFutureBomb(bombId: string): Promise<void> {
  const { error } = await supabase
    .from('future_bombs')
    .delete()
    .eq('id', bombId);
  
  if (error) throw error;
}

// ============================================================================
// CREDIT CARDS
// ============================================================================

export async function getCreditCardsByUserId(userId: string): Promise<CreditCard[]> {
  const { data, error } = await supabase
    .from('credit_cards')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  
  return (data || []).map(row => ({
    id: row.id,
    userId: row.user_id,
    name: row.name,
    statementDate: row.statement_date,
    dueDate: row.due_date,
    billAmount: row.bill_amount,
    paidAmount: row.paid_amount,
    currentExpenses: row.current_expenses || 0,
    billingDate: row.billing_date,
    needsBillUpdate: row.needs_bill_update
  }));
}

export async function createCreditCard(card: Omit<CreditCard, 'id'> & { id?: string }): Promise<CreditCard> {
  const { data, error } = await supabase
    .from('credit_cards')
    .insert({
      id: card.id,
      user_id: card.userId,
      name: card.name,
      statement_date: card.statementDate,
      due_date: card.dueDate,
      bill_amount: card.billAmount || 0,
      paid_amount: card.paidAmount || 0,
      current_expenses: card.currentExpenses || 0,
      billing_date: card.billingDate,
      needs_bill_update: card.needsBillUpdate || false
    })
    .select()
    .single();
  
  if (error) throw error;
  
  return {
    id: data.id,
    userId: data.user_id,
    name: data.name,
    statementDate: data.statement_date,
    dueDate: data.due_date,
    billAmount: data.bill_amount,
    paidAmount: data.paid_amount,
    currentExpenses: data.current_expenses,
    billingDate: data.billing_date,
    needsBillUpdate: data.needs_bill_update
  };
}

export async function updateCreditCard(cardId: string, updates: Partial<CreditCard>): Promise<void> {
  const updateData: any = {};
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.statementDate !== undefined) updateData.statement_date = updates.statementDate;
  if (updates.dueDate !== undefined) updateData.due_date = updates.dueDate;
  if (updates.billAmount !== undefined) updateData.bill_amount = updates.billAmount;
  if (updates.paidAmount !== undefined) updateData.paid_amount = updates.paidAmount;
  if (updates.currentExpenses !== undefined) updateData.current_expenses = updates.currentExpenses;
  if (updates.billingDate !== undefined) updateData.billing_date = updates.billingDate;
  if (updates.needsBillUpdate !== undefined) updateData.needs_bill_update = updates.needsBillUpdate;
  
  const { error } = await supabase
    .from('credit_cards')
    .update(updateData)
    .eq('id', cardId);
  
  if (error) throw error;
}

export async function deleteCreditCard(cardId: string): Promise<void> {
  const { error } = await supabase
    .from('credit_cards')
    .delete()
    .eq('id', cardId);
  
  if (error) throw error;
}

// ============================================================================
// LOANS
// ============================================================================

export async function getLoansByUserId(userId: string): Promise<Loan[]> {
  const { data, error } = await supabase
    .from('loans')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  
  return (data || []).map(row => ({
    id: row.id,
    userId: row.user_id,
    name: row.name,
    principal: row.principal,
    remainingTenureMonths: row.remaining_tenure_months,
    emi: row.emi
  }));
}

export async function createLoan(loan: Omit<Loan, 'id'> & { id?: string }): Promise<Loan> {
  const { data, error } = await supabase
    .from('loans')
    .insert({
      id: loan.id,
      user_id: loan.userId,
      name: loan.name,
      principal: loan.principal,
      remaining_tenure_months: loan.remainingTenureMonths,
      emi: loan.emi
    })
    .select()
    .single();
  
  if (error) throw error;
  
  return {
    id: data.id,
    userId: data.user_id,
    name: data.name,
    principal: data.principal,
    remainingTenureMonths: data.remaining_tenure_months,
    emi: data.emi
  };
}

export async function updateLoan(loanId: string, updates: Partial<Loan>): Promise<void> {
  const updateData: any = {};
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.principal !== undefined) updateData.principal = updates.principal;
  if (updates.remainingTenureMonths !== undefined) updateData.remaining_tenure_months = updates.remainingTenureMonths;
  if (updates.emi !== undefined) updateData.emi = updates.emi;
  
  const { error } = await supabase
    .from('loans')
    .update(updateData)
    .eq('id', loanId);
  
  if (error) throw error;
}

export async function deleteLoan(loanId: string): Promise<void> {
  const { error } = await supabase
    .from('loans')
    .delete()
    .eq('id', loanId);
  
  if (error) throw error;
}

// ============================================================================
// ACTIVITIES
// ============================================================================

export async function getActivitiesByUserId(userId: string, limit?: number): Promise<Activity[]> {
  let query = supabase
    .from('activities')
    .select('*')
    .eq('actor_id', userId)
    .order('created_at', { ascending: false });
  
  if (limit) {
    query = query.limit(limit);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  
  return (data || []).map(row => ({
    id: row.id,
    actorId: row.actor_id,
    entity: row.entity,
    action: row.action,
    payload: row.payload,
    createdAt: row.created_at
  }));
}

export async function createActivity(activity: Omit<Activity, 'id'> & { id?: string }): Promise<Activity> {
  const { data, error } = await supabase
    .from('activities')
    .insert({
      id: activity.id,
      actor_id: activity.actorId,
      entity: activity.entity,
      action: activity.action,
      payload: activity.payload,
      created_at: activity.createdAt || new Date().toISOString()
    })
    .select()
    .single();
  
  if (error) throw error;
  
  return {
    id: data.id,
    actorId: data.actor_id,
    entity: data.entity,
    action: data.action,
    payload: data.payload,
    createdAt: data.created_at
  };
}

// ============================================================================
// CONSTRAINT SCORES
// ============================================================================

export async function getConstraintScore(userId: string): Promise<ConstraintScore> {
  const { data, error } = await supabase
    .from('constraint_scores')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (error || !data) {
    // Return default if not found
    return {
      score: 0,
      tier: 'green',
      recentOverspends: 0,
      decayAppliedAt: new Date().toISOString()
    };
  }
  
  return {
    score: data.score,
    tier: data.tier,
    recentOverspends: data.recent_overspends,
    decayAppliedAt: data.decay_applied_at
  };
}

export async function setConstraintScore(userId: string, constraint: ConstraintScore): Promise<void> {
  const { error } = await supabase
    .from('constraint_scores')
    .upsert({
      user_id: userId,
      score: constraint.score,
      tier: constraint.tier,
      recent_overspends: constraint.recentOverspends,
      decay_applied_at: constraint.decayAppliedAt,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id'
    });
  
  if (error) throw error;
}

// ============================================================================
// USER PREFERENCES
// ============================================================================

export async function getUserPreferences(userId: string): Promise<UserPreferences> {
  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (error || !data) {
    // Return default if not found
    return {
      userId,
      monthStartDay: 1,
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      useProrated: false
    };
  }
  
  return {
    userId: data.user_id,
    monthStartDay: data.month_start_day,
    currency: data.currency,
    timezone: data.timezone,
    useProrated: data.use_prorated
  };
}

export async function updateUserPreferences(userId: string, updates: Partial<Omit<UserPreferences, 'userId'>>): Promise<UserPreferences> {
  const updateData: any = {};
  if (updates.monthStartDay !== undefined) updateData.month_start_day = updates.monthStartDay;
  if (updates.currency !== undefined) updateData.currency = updates.currency;
  if (updates.timezone !== undefined) updateData.timezone = updates.timezone;
  if (updates.useProrated !== undefined) updateData.use_prorated = updates.useProrated;
  updateData.updated_at = new Date().toISOString();
  
  const { error } = await supabase
    .from('user_preferences')
    .upsert({
      user_id: userId,
      ...updateData
    }, {
      onConflict: 'user_id'
    });
  
  if (error) throw error;
  
  return getUserPreferences(userId);
}

// ============================================================================
// THEME STATES
// ============================================================================

export async function getThemeState(userId: string): Promise<ThemeState | null> {
  const { data, error } = await supabase
    .from('theme_states')
    .select('*')
    .eq('owner_ref', userId)
    .single();
  
  if (error || !data) return null;
  
  return {
    id: data.id,
    ownerRef: data.owner_ref,
    mode: data.mode,
    selectedTheme: data.selected_theme,
    constraintTierEffect: data.constraint_tier_effect
  };
}

export async function setThemeState(theme: Omit<ThemeState, 'id'> & { id?: string }): Promise<ThemeState> {
  const { data, error } = await supabase
    .from('theme_states')
    .upsert({
      id: theme.id,
      owner_ref: theme.ownerRef,
      mode: theme.mode,
      selected_theme: theme.selectedTheme,
      constraint_tier_effect: theme.constraintTierEffect
    }, {
      onConflict: 'id'
    })
    .select()
    .single();
  
  if (error) throw error;
  
  return {
    id: data.id,
    ownerRef: data.owner_ref,
    mode: data.mode,
    selectedTheme: data.selected_theme,
    constraintTierEffect: data.constraint_tier_effect
  };
}

// ============================================================================
// SHARED ACCOUNTS
// ============================================================================

export async function getSharedAccountsByUserId(userId: string): Promise<SharedAccount[]> {
  const { data, error } = await supabase
    .from('shared_members')
    .select('shared_account_id, shared_accounts(*)')
    .eq('user_id', userId);
  
  if (error) throw error;
  
  const accounts = (data || []).map((row: any) => row.shared_accounts).filter(Boolean);
  return accounts.map((acc: any) => ({
    id: acc.id,
    name: acc.name
  }));
}

export async function createSharedAccount(account: Omit<SharedAccount, 'id'> & { id?: string }): Promise<SharedAccount> {
  const { data, error } = await supabase
    .from('shared_accounts')
    .insert({
      id: account.id,
      name: account.name
    })
    .select()
    .single();
  
  if (error) throw error;
  
  return {
    id: data.id,
    name: data.name
  };
}

// ============================================================================
// SHARED MEMBERS
// ============================================================================

export async function getSharedMembersByAccountId(accountId: string): Promise<SharedMember[]> {
  const { data, error } = await supabase
    .from('shared_members')
    .select('*')
    .eq('shared_account_id', accountId);
  
  if (error) throw error;
  
  return (data || []).map(row => ({
    id: row.id,
    sharedAccountId: row.shared_account_id,
    userId: row.user_id,
    role: row.role,
    mergeFinances: row.merge_finances
  }));
}

export async function createSharedMember(member: Omit<SharedMember, 'id'> & { id?: string }): Promise<SharedMember> {
  const { data, error } = await supabase
    .from('shared_members')
    .insert({
      id: member.id,
      shared_account_id: member.sharedAccountId,
      user_id: member.userId,
      role: member.role,
      merge_finances: member.mergeFinances
    })
    .select()
    .single();
  
  if (error) throw error;
  
  return {
    id: data.id,
    sharedAccountId: data.shared_account_id,
    userId: data.user_id,
    role: data.role,
    mergeFinances: data.merge_finances
  };
}

// ============================================================================
// SHARING REQUESTS
// ============================================================================

export async function getSharingRequestsByInviterId(inviterId: string): Promise<SharingRequest[]> {
  const { data, error } = await supabase
    .from('sharing_requests')
    .select('*')
    .eq('inviter_id', inviterId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  
  return (data || []).map(row => ({
    id: row.id,
    inviterId: row.inviter_id,
    inviteeEmail: row.invitee_email || '', // Database has invitee_id, but type uses inviteeEmail
    role: row.role,
    mergeFinances: row.merge_finances,
    status: row.status
  }));
}

export async function createSharingRequest(request: Omit<SharingRequest, 'id'> & { id?: string; inviteeId?: string }): Promise<SharingRequest> {
  const { data, error } = await supabase
    .from('sharing_requests')
    .insert({
      id: request.id,
      inviter_id: request.inviterId,
      invitee_email: request.inviteeEmail,
      invitee_id: (request as any).inviteeId || null, // Optional field from database
      role: request.role,
      merge_finances: request.mergeFinances,
      status: request.status || 'pending'
    })
    .select()
    .single();
  
  if (error) throw error;
  
  return {
    id: data.id,
    inviterId: data.inviter_id,
    inviteeEmail: data.invitee_email || '',
    role: data.role,
    mergeFinances: data.merge_finances,
    status: data.status
  };
}

export async function updateSharingRequest(requestId: string, updates: Partial<SharingRequest & { inviteeId?: string }>): Promise<void> {
  const updateData: any = {};
  if (updates.status !== undefined) updateData.status = updates.status;
  if ((updates as any).inviteeId !== undefined) updateData.invitee_id = (updates as any).inviteeId;
  
  const { error } = await supabase
    .from('sharing_requests')
    .update(updateData)
    .eq('id', requestId);
  
  if (error) throw error;
}

