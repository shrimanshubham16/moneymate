// PostgreSQL Database Access Layer (Direct Connection)
// Replaces Supabase REST client with direct PostgreSQL using pg library
import * as pg from 'pg';
import * as dotenv from 'dotenv';
import * as dns from 'dns';

dotenv.config();

// Force IPv4 for DNS lookups (Railway has IPv6 connectivity issues)
dns.setDefaultResultOrder('ipv4first');

const { Pool } = pg;

// Connection pool for better performance
let pool: pg.Pool | null = null;

function getPool(): pg.Pool {
  if (!pool) {
    const connectionString = process.env.SUPABASE_CONNECTION_STRING;
    
    if (!connectionString) {
      // In production (Railway), log helpful error instead of crashing
      const errorMsg = process.env.NODE_ENV === 'production' 
        ? 'SUPABASE_CONNECTION_STRING not found in Railway environment variables. Please set it in Railway Dashboard → Variables tab. See backend/RAILWAY-ENV-SETUP.md for instructions.'
        : 'SUPABASE_CONNECTION_STRING not found in .env file';
      throw new Error(errorMsg);
    }

    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false }, // Supabase uses self-signed certs
      max: 10, // Maximum connections in pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    // Log connection errors
    pool.on('error', (err) => {
      console.error('Unexpected PostgreSQL pool error:', err);
    });
  }
  return pool;
}

// Helper function to run queries
async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const client = await getPool().connect();
  try {
    const result = await client.query(text, params);
    return result.rows as T[];
  } finally {
    client.release();
  }
}

async function queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] || null;
}

// ============================================================================
// USERS
// ============================================================================

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  encryptionSalt?: string | null;
  recoveryKeyHash?: string | null;
  createdAt?: string;
  failedLoginAttempts?: number;
  accountLockedUntil?: string | null;
}

export async function createUser(user: Omit<User, 'id'> & { id?: string }): Promise<User> {
  const result = await queryOne<any>(
    `INSERT INTO users (id, username, password_hash, encryption_salt, recovery_key_hash, created_at, failed_login_attempts, account_locked_until)
     VALUES (COALESCE($1, gen_random_uuid()), $2, $3, $4, $5, NOW(), 0, NULL)
     RETURNING id, username, password_hash, encryption_salt, recovery_key_hash, created_at, failed_login_attempts, account_locked_until`,
    [user.id || null, user.username, user.passwordHash, user.encryptionSalt || null, user.recoveryKeyHash || null]
  );
  
  if (!result) throw new Error('Failed to create user');
  
  return {
    id: result.id,
    username: result.username,
    passwordHash: result.password_hash,
    encryptionSalt: result.encryption_salt,
    recoveryKeyHash: result.recovery_key_hash,
    createdAt: result.created_at,
    failedLoginAttempts: result.failed_login_attempts,
    accountLockedUntil: result.account_locked_until
  };
}

export async function getUserByUsername(username: string): Promise<User | null> {
  const result = await queryOne<any>(
    'SELECT * FROM users WHERE username = $1',
    [username]
  );
  
  if (!result) return null;
  
  return {
    id: result.id,
    username: result.username,
    passwordHash: result.password_hash,
    encryptionSalt: result.encryption_salt,
    recoveryKeyHash: result.recovery_key_hash,
    createdAt: result.created_at,
    failedLoginAttempts: result.failed_login_attempts,
    accountLockedUntil: result.account_locked_until
  };
}

export async function getUserById(userId: string): Promise<User | null> {
  const result = await queryOne<any>(
    'SELECT * FROM users WHERE id = $1',
    [userId]
  );
  
  if (!result) return null;
  
  return {
    id: result.id,
    username: result.username,
    passwordHash: result.password_hash,
    encryptionSalt: result.encryption_salt,
    recoveryKeyHash: result.recovery_key_hash,
    createdAt: result.created_at,
    failedLoginAttempts: result.failed_login_attempts,
    accountLockedUntil: result.account_locked_until
  };
}

export async function updateUser(userId: string, updates: Partial<{ passwordHash?: string; failedLoginAttempts?: number; accountLockedUntil?: string | null; encryptionSalt?: string | null; recoveryKeyHash?: string | null }>): Promise<boolean> {
  const setClauses: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (updates.passwordHash !== undefined) {
    setClauses.push(`password_hash = $${paramIndex++}`);
    values.push(updates.passwordHash);
  }
  if (updates.failedLoginAttempts !== undefined) {
    setClauses.push(`failed_login_attempts = $${paramIndex++}`);
    values.push(updates.failedLoginAttempts);
  }
  if (updates.accountLockedUntil !== undefined) {
    setClauses.push(`account_locked_until = $${paramIndex++}`);
    values.push(updates.accountLockedUntil);
  }
  if (updates.encryptionSalt !== undefined) {
    setClauses.push(`encryption_salt = $${paramIndex++}`);
    values.push(updates.encryptionSalt);
  }
  if (updates.recoveryKeyHash !== undefined) {
    setClauses.push(`recovery_key_hash = $${paramIndex++}`);
    values.push(updates.recoveryKeyHash);
  }

  if (setClauses.length === 0) return true;

  values.push(userId);
  await query(
    `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${paramIndex}`,
    values
  );
  return true;
}

// ============================================================================
// HEALTH CACHE
// ============================================================================

export interface HealthCache {
  userId: string;
  billingPeriodId: string;
  availableFunds: number | null;
  healthCategory: string | null;
  healthPercentage: number | null;
  constraintScore: number | null;
  constraintTier: string | null;
  computedAt?: string | null;
  isStale?: boolean | null;
}

export async function getHealthCache(userId: string, billingPeriodId: string): Promise<HealthCache | null> {
  const result = await queryOne<any>(
    `SELECT * FROM health_cache WHERE user_id = $1 AND billing_period_id = $2`,
    [userId, billingPeriodId]
  );
  if (!result) return null;
  return {
    userId: result.user_id,
    billingPeriodId: result.billing_period_id,
    availableFunds: result.available_funds,
    healthCategory: result.health_category,
    healthPercentage: result.health_percentage,
    constraintScore: result.constraint_score,
    constraintTier: result.constraint_tier,
    computedAt: result.computed_at,
    isStale: result.is_stale,
  };
}

export async function upsertHealthCache(entry: HealthCache): Promise<void> {
  await query(
    `INSERT INTO health_cache (user_id, billing_period_id, available_funds, health_category, health_percentage, constraint_score, constraint_tier, computed_at, is_stale)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), FALSE)
     ON CONFLICT (user_id) DO UPDATE
       SET billing_period_id = EXCLUDED.billing_period_id,
           available_funds = EXCLUDED.available_funds,
           health_category = EXCLUDED.health_category,
           health_percentage = EXCLUDED.health_percentage,
           constraint_score = EXCLUDED.constraint_score,
           constraint_tier = EXCLUDED.constraint_tier,
           computed_at = NOW(),
           is_stale = FALSE`,
    [
      entry.userId,
      entry.billingPeriodId,
      entry.availableFunds,
      entry.healthCategory,
      entry.healthPercentage,
      entry.constraintScore,
      entry.constraintTier,
    ]
  );
}

export async function markHealthCacheStale(userId: string): Promise<void> {
  await query(
    `UPDATE health_cache SET is_stale = TRUE, computed_at = NOW() WHERE user_id = $1`,
    [userId]
  );
}

export async function calculateHealthInDb(userId: string): Promise<{ availableFunds: number; healthCategory: string }> {
  const result = await queryOne<any>(
    `SELECT * FROM calculate_user_health($1)`,
    [userId]
  );
  if (!result) {
    return { availableFunds: 0, healthCategory: "ok" };
  }
  return {
    availableFunds: Number(result.available_funds || 0),
    healthCategory: result.health_category || "ok",
  };
}

// ============================================================================
// INCOMES
// ============================================================================

export interface Income {
  id: string;
  userId: string;
  name?: string;
  amount?: number;
  category?: string;
  frequency?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
}

export async function addIncome(income: Omit<Income, 'id'> & { id?: string }): Promise<Income> {
  const result = await queryOne<any>(
    `INSERT INTO incomes (id, user_id, name, amount, category, frequency, start_date, end_date, description)
     VALUES (COALESCE($1, gen_random_uuid()), $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [income.id || null, income.userId, income.name, income.amount, income.category, income.frequency, income.startDate, income.endDate, income.description]
  );
  
  if (!result) throw new Error('Failed to add income');
  
  return {
    id: result.id,
    userId: result.user_id,
    name: result.name,
    amount: parseFloat(result.amount) || 0,
    category: result.category,
    frequency: result.frequency,
    startDate: result.start_date,
    endDate: result.end_date,
    description: result.description
  };
}

export async function getIncomesByUserId(userId: string): Promise<Income[]> {
  const rows = await query<any>(
    'SELECT * FROM incomes WHERE user_id = $1',
    [userId]
  );
  
  return rows.map(r => ({
    id: r.id,
    userId: r.user_id,
    name: r.name,
    amount: parseFloat(r.amount) || 0,
    category: r.category,
    frequency: r.frequency,
    startDate: r.start_date,
    endDate: r.end_date,
    description: r.description
  }));
}

export async function getIncomesByUserIds(userIds: string[]): Promise<Income[]> {
  if (userIds.length === 0) return [];
  
  const placeholders = userIds.map((_, i) => `$${i + 1}`).join(', ');
  const rows = await query<any>(
    `SELECT * FROM incomes WHERE user_id IN (${placeholders})`,
    userIds
  );
  
  return rows.map(r => ({
    id: r.id,
    userId: r.user_id,
    name: r.name,
    amount: parseFloat(r.amount) || 0,
    category: r.category,
    frequency: r.frequency,
    startDate: r.start_date,
    endDate: r.end_date,
    description: r.description
  }));
}

export async function updateIncome(incomeId: string, updates: Partial<Omit<Income, 'id' | 'userId'>>): Promise<Income | null> {
  const setClauses: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (updates.name !== undefined) { setClauses.push(`name = $${paramIndex++}`); values.push(updates.name); }
  if (updates.amount !== undefined) { setClauses.push(`amount = $${paramIndex++}`); values.push(updates.amount); }
  if (updates.category !== undefined) { setClauses.push(`category = $${paramIndex++}`); values.push(updates.category); }
  if (updates.frequency !== undefined) { setClauses.push(`frequency = $${paramIndex++}`); values.push(updates.frequency); }
  if (updates.startDate !== undefined) { setClauses.push(`start_date = $${paramIndex++}`); values.push(updates.startDate); }
  if (updates.endDate !== undefined) { setClauses.push(`end_date = $${paramIndex++}`); values.push(updates.endDate); }
  if (updates.description !== undefined) { setClauses.push(`description = $${paramIndex++}`); values.push(updates.description); }

  if (setClauses.length === 0) return null;

  values.push(incomeId);
  const result = await queryOne<any>(
    `UPDATE incomes SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  
  if (!result) return null;
  
  return {
    id: result.id,
    userId: result.user_id,
    name: result.name,
    amount: parseFloat(result.amount) || 0,
    category: result.category,
    frequency: result.frequency,
    startDate: result.start_date,
    endDate: result.end_date,
    description: result.description
  };
}

export async function deleteIncome(incomeId: string): Promise<boolean> {
  await query('DELETE FROM incomes WHERE id = $1', [incomeId]);
  return true;
}

// ============================================================================
// FIXED EXPENSES
// ============================================================================

export interface FixedExpense {
  id: string;
  userId: string;
  name: string;
  amount: number;
  frequency?: string;
  category?: string;
  isSip?: boolean;
  startDate?: string;
  endDate?: string;
}

export async function addFixedExpense(expense: Omit<FixedExpense, 'id'> & { id?: string }): Promise<FixedExpense> {
  const result = await queryOne<any>(
    `INSERT INTO fixed_expenses (id, user_id, name, amount, frequency, category, is_sip, start_date, end_date)
     VALUES (COALESCE($1, gen_random_uuid()), $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [expense.id || null, expense.userId, expense.name, expense.amount, expense.frequency, expense.category, expense.isSip || false, expense.startDate, expense.endDate]
  );
  
  if (!result) throw new Error('Failed to add fixed expense');
  
  return {
    id: result.id,
    userId: result.user_id,
    name: result.name,
    amount: parseFloat(result.amount) || 0,
    frequency: result.frequency,
    category: result.category,
    isSip: result.is_sip,
    startDate: result.start_date,
    endDate: result.end_date
  };
}

export async function getFixedExpensesByUserId(userId: string): Promise<FixedExpense[]> {
  const rows = await query<any>(
    'SELECT * FROM fixed_expenses WHERE user_id = $1',
    [userId]
  );
  
  return rows.map(r => ({
    id: r.id,
    userId: r.user_id,
    name: r.name,
    amount: parseFloat(r.amount) || 0,
    frequency: r.frequency,
    category: r.category,
    isSip: r.is_sip,
    startDate: r.start_date,
    endDate: r.end_date
  }));
}

export async function getFixedExpensesByUserIds(userIds: string[]): Promise<FixedExpense[]> {
  if (userIds.length === 0) return [];
  
  const placeholders = userIds.map((_, i) => `$${i + 1}`).join(', ');
  const rows = await query<any>(
    `SELECT * FROM fixed_expenses WHERE user_id IN (${placeholders})`,
    userIds
  );
  
  return rows.map(r => ({
    id: r.id,
    userId: r.user_id,
    name: r.name,
    amount: parseFloat(r.amount) || 0,
    frequency: r.frequency,
    category: r.category,
    isSip: r.is_sip,
    startDate: r.start_date,
    endDate: r.end_date
  }));
}

export async function updateFixedExpense(expenseId: string, updates: Partial<Omit<FixedExpense, 'id' | 'userId'>>): Promise<FixedExpense | null> {
  const setClauses: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (updates.name !== undefined) { setClauses.push(`name = $${paramIndex++}`); values.push(updates.name); }
  if (updates.amount !== undefined) { setClauses.push(`amount = $${paramIndex++}`); values.push(updates.amount); }
  if (updates.frequency !== undefined) { setClauses.push(`frequency = $${paramIndex++}`); values.push(updates.frequency); }
  if (updates.category !== undefined) { setClauses.push(`category = $${paramIndex++}`); values.push(updates.category); }
  if (updates.isSip !== undefined) { setClauses.push(`is_sip = $${paramIndex++}`); values.push(updates.isSip); }
  if (updates.startDate !== undefined) { setClauses.push(`start_date = $${paramIndex++}`); values.push(updates.startDate); }
  if (updates.endDate !== undefined) { setClauses.push(`end_date = $${paramIndex++}`); values.push(updates.endDate); }

  if (setClauses.length === 0) return null;

  values.push(expenseId);
  const result = await queryOne<any>(
    `UPDATE fixed_expenses SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  
  if (!result) return null;
  
  return {
    id: result.id,
    userId: result.user_id,
    name: result.name,
    amount: parseFloat(result.amount) || 0,
    frequency: result.frequency,
    category: result.category,
    isSip: result.is_sip,
    startDate: result.start_date,
    endDate: result.end_date
  };
}

export async function deleteFixedExpense(expenseId: string): Promise<boolean> {
  await query('DELETE FROM fixed_expenses WHERE id = $1', [expenseId]);
  return true;
}

// ============================================================================
// VARIABLE EXPENSE PLANS
// ============================================================================

export interface VariablePlan {
  id: string;
  userId: string;
  name: string;
  planned: number;
  category?: string;
  startDate: string;
  endDate?: string;
}

export async function addVariablePlan(plan: Omit<VariablePlan, 'id'> & { id?: string }): Promise<VariablePlan> {
  const result = await queryOne<any>(
    `INSERT INTO variable_expense_plans (id, user_id, name, planned, category, start_date, end_date)
     VALUES (COALESCE($1, gen_random_uuid()), $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [plan.id || null, plan.userId, plan.name, plan.planned, plan.category, plan.startDate, plan.endDate]
  );
  
  if (!result) throw new Error('Failed to add variable plan');
  
  return {
    id: result.id,
    userId: result.user_id,
    name: result.name,
    planned: parseFloat(result.planned) || 0,
    category: result.category,
    startDate: result.start_date,
    endDate: result.end_date
  };
}

export async function getVariablePlansByUserId(userId: string): Promise<VariablePlan[]> {
  const rows = await query<any>(
    'SELECT * FROM variable_expense_plans WHERE user_id = $1',
    [userId]
  );
  
  return rows.map(r => ({
    id: r.id,
    userId: r.user_id,
    name: r.name,
    planned: parseFloat(r.planned) || 0,
    category: r.category,
    startDate: r.start_date,
    endDate: r.end_date
  }));
}

export async function getVariablePlansByUserIds(userIds: string[]): Promise<VariablePlan[]> {
  if (userIds.length === 0) return [];
  
  const placeholders = userIds.map((_, i) => `$${i + 1}`).join(', ');
  const rows = await query<any>(
    `SELECT * FROM variable_expense_plans WHERE user_id IN (${placeholders})`,
    userIds
  );
  
  return rows.map(r => ({
    id: r.id,
    userId: r.user_id,
    name: r.name,
    planned: parseFloat(r.planned) || 0,
    category: r.category,
    startDate: r.start_date,
    endDate: r.end_date
  }));
}

export async function updateVariablePlan(planId: string, updates: Partial<Omit<VariablePlan, 'id' | 'userId'>>): Promise<VariablePlan | null> {
  const setClauses: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (updates.name !== undefined) { setClauses.push(`name = $${paramIndex++}`); values.push(updates.name); }
  if (updates.planned !== undefined) { setClauses.push(`planned = $${paramIndex++}`); values.push(updates.planned); }
  if (updates.category !== undefined) { setClauses.push(`category = $${paramIndex++}`); values.push(updates.category); }
  if (updates.startDate !== undefined) { setClauses.push(`start_date = $${paramIndex++}`); values.push(updates.startDate); }
  if (updates.endDate !== undefined) { setClauses.push(`end_date = $${paramIndex++}`); values.push(updates.endDate); }

  if (setClauses.length === 0) return null;

  values.push(planId);
  const result = await queryOne<any>(
    `UPDATE variable_expense_plans SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  
  if (!result) return null;
  
  return {
    id: result.id,
    userId: result.user_id,
    name: result.name,
    planned: parseFloat(result.planned) || 0,
    category: result.category,
    startDate: result.start_date,
    endDate: result.end_date
  };
}

export async function deleteVariablePlan(planId: string): Promise<boolean> {
  await query('DELETE FROM variable_expense_plans WHERE id = $1', [planId]);
  return true;
}

// ============================================================================
// VARIABLE EXPENSE ACTUALS
// ============================================================================

export interface VariableActual {
  id: string;
  userId: string;
  planId: string;
  amount: number;
  incurredAt: string;
  justification?: string;
  subcategory?: string;
  paymentMode?: string;
  creditCardId?: string;
}

export async function addVariableActual(actual: Omit<VariableActual, 'id'> & { id?: string }): Promise<VariableActual> {
  const result = await queryOne<any>(
    `INSERT INTO variable_expense_actuals (id, user_id, plan_id, amount, incurred_at, justification, subcategory, payment_mode, credit_card_id)
     VALUES (COALESCE($1, gen_random_uuid()), $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [actual.id || null, actual.userId, actual.planId, actual.amount, actual.incurredAt, actual.justification, actual.subcategory || 'Unspecified', actual.paymentMode, actual.creditCardId]
  );
  
  if (!result) throw new Error('Failed to add variable actual');
  
  return {
    id: result.id,
    userId: result.user_id,
    planId: result.plan_id,
    amount: parseFloat(result.amount) || 0,
    incurredAt: result.incurred_at,
    justification: result.justification,
    subcategory: result.subcategory,
    paymentMode: result.payment_mode,
    creditCardId: result.credit_card_id
  };
}

export async function getVariableActualsByUserId(userId: string): Promise<VariableActual[]> {
  const rows = await query<any>(
    'SELECT * FROM variable_expense_actuals WHERE user_id = $1',
    [userId]
  );
  
  return rows.map(r => ({
    id: r.id,
    userId: r.user_id,
    planId: r.plan_id,
    amount: parseFloat(r.amount) || 0,
    incurredAt: r.incurred_at,
    justification: r.justification,
    subcategory: r.subcategory,
    paymentMode: r.payment_mode,
    creditCardId: r.credit_card_id
  }));
}

export async function getVariableActualsByUserIds(userIds: string[]): Promise<VariableActual[]> {
  if (userIds.length === 0) return [];
  
  const placeholders = userIds.map((_, i) => `$${i + 1}`).join(', ');
  const rows = await query<any>(
    `SELECT * FROM variable_expense_actuals WHERE user_id IN (${placeholders})`,
    userIds
  );
  
  return rows.map(r => ({
    id: r.id,
    userId: r.user_id,
    planId: r.plan_id,
    amount: parseFloat(r.amount) || 0,
    incurredAt: r.incurred_at,
    justification: r.justification,
    subcategory: r.subcategory,
    paymentMode: r.payment_mode,
    creditCardId: r.credit_card_id
  }));
}

export async function getVariableActualsByPlanId(planId: string): Promise<VariableActual[]> {
  const rows = await query<any>(
    'SELECT * FROM variable_expense_actuals WHERE plan_id = $1',
    [planId]
  );
  
  return rows.map(r => ({
    id: r.id,
    userId: r.user_id,
    planId: r.plan_id,
    amount: parseFloat(r.amount) || 0,
    incurredAt: r.incurred_at,
    justification: r.justification,
    subcategory: r.subcategory,
    paymentMode: r.payment_mode,
    creditCardId: r.credit_card_id
  }));
}

export async function updateVariableActual(actualId: string, updates: Partial<Omit<VariableActual, 'id' | 'userId' | 'planId'>>): Promise<VariableActual | null> {
  const setClauses: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (updates.amount !== undefined) { setClauses.push(`amount = $${paramIndex++}`); values.push(updates.amount); }
  if (updates.incurredAt !== undefined) { setClauses.push(`incurred_at = $${paramIndex++}`); values.push(updates.incurredAt); }
  if (updates.justification !== undefined) { setClauses.push(`justification = $${paramIndex++}`); values.push(updates.justification); }
  if (updates.subcategory !== undefined) { setClauses.push(`subcategory = $${paramIndex++}`); values.push(updates.subcategory); }
  if (updates.paymentMode !== undefined) { setClauses.push(`payment_mode = $${paramIndex++}`); values.push(updates.paymentMode); }
  if (updates.creditCardId !== undefined) { setClauses.push(`credit_card_id = $${paramIndex++}`); values.push(updates.creditCardId); }

  if (setClauses.length === 0) return null;

  values.push(actualId);
  const result = await queryOne<any>(
    `UPDATE variable_expense_actuals SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  
  if (!result) return null;
  
  return {
    id: result.id,
    userId: result.user_id,
    planId: result.plan_id,
    amount: parseFloat(result.amount) || 0,
    incurredAt: result.incurred_at,
    justification: result.justification,
    subcategory: result.subcategory,
    paymentMode: result.payment_mode,
    creditCardId: result.credit_card_id
  };
}

export async function deleteVariableActual(actualId: string): Promise<boolean> {
  await query('DELETE FROM variable_expense_actuals WHERE id = $1', [actualId]);
  return true;
}

// ============================================================================
// INVESTMENTS
// ============================================================================

export interface Investment {
  id: string;
  userId: string;
  name: string;
  goal?: string;
  monthlyAmount: number;
  status?: string;
}

export async function addInvestment(investment: Omit<Investment, 'id'> & { id?: string }): Promise<Investment> {
  const result = await queryOne<any>(
    `INSERT INTO investments (id, user_id, name, goal, monthly_amount, status)
     VALUES (COALESCE($1, gen_random_uuid()), $2, $3, $4, $5, $6)
     RETURNING *`,
    [investment.id || null, investment.userId, investment.name, investment.goal, investment.monthlyAmount, investment.status || 'active']
  );
  
  if (!result) throw new Error('Failed to add investment');
  
  return {
    id: result.id,
    userId: result.user_id,
    name: result.name,
    goal: result.goal,
    monthlyAmount: parseFloat(result.monthly_amount) || 0,
    status: result.status
  };
}

export async function getInvestmentsByUserId(userId: string): Promise<Investment[]> {
  const rows = await query<any>(
    'SELECT * FROM investments WHERE user_id = $1',
    [userId]
  );
  
  return rows.map(r => ({
    id: r.id,
    userId: r.user_id,
    name: r.name,
    goal: r.goal,
    monthlyAmount: parseFloat(r.monthly_amount) || 0,
    status: r.status
  }));
}

export async function getInvestmentsByUserIds(userIds: string[]): Promise<Investment[]> {
  if (userIds.length === 0) return [];
  
  const placeholders = userIds.map((_, i) => `$${i + 1}`).join(', ');
  const rows = await query<any>(
    `SELECT * FROM investments WHERE user_id IN (${placeholders})`,
    userIds
  );
  
  return rows.map(r => ({
    id: r.id,
    userId: r.user_id,
    name: r.name,
    goal: r.goal,
    monthlyAmount: parseFloat(r.monthly_amount) || 0,
    status: r.status
  }));
}

export async function updateInvestment(investmentId: string, updates: Partial<Omit<Investment, 'id' | 'userId'>>): Promise<Investment | null> {
  const setClauses: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (updates.name !== undefined) { setClauses.push(`name = $${paramIndex++}`); values.push(updates.name); }
  if (updates.goal !== undefined) { setClauses.push(`goal = $${paramIndex++}`); values.push(updates.goal); }
  if (updates.monthlyAmount !== undefined) { setClauses.push(`monthly_amount = $${paramIndex++}`); values.push(updates.monthlyAmount); }
  if (updates.status !== undefined) { setClauses.push(`status = $${paramIndex++}`); values.push(updates.status); }

  if (setClauses.length === 0) return null;

  values.push(investmentId);
  const result = await queryOne<any>(
    `UPDATE investments SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  
  if (!result) return null;
  
  return {
    id: result.id,
    userId: result.user_id,
    name: result.name,
    goal: result.goal,
    monthlyAmount: parseFloat(result.monthly_amount) || 0,
    status: result.status
  };
}

export async function deleteInvestment(investmentId: string): Promise<boolean> {
  await query('DELETE FROM investments WHERE id = $1', [investmentId]);
  return true;
}

// ============================================================================
// FUTURE BOMBS
// ============================================================================

export interface FutureBomb {
  id: string;
  userId: string;
  name: string;
  dueDate: string;
  totalAmount: number;
  savedAmount?: number;
  monthlyEquivalent?: number;
  preparednessRatio?: number;
}

export async function addFutureBomb(bomb: Omit<FutureBomb, 'id'> & { id?: string }): Promise<FutureBomb> {
  const result = await queryOne<any>(
    `INSERT INTO future_bombs (id, user_id, name, due_date, total_amount, saved_amount, monthly_equivalent, preparedness_ratio)
     VALUES (COALESCE($1, gen_random_uuid()), $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [bomb.id || null, bomb.userId, bomb.name, bomb.dueDate, bomb.totalAmount, bomb.savedAmount || 0, bomb.monthlyEquivalent, bomb.preparednessRatio || 0]
  );
  
  if (!result) throw new Error('Failed to add future bomb');
  
  return {
    id: result.id,
    userId: result.user_id,
    name: result.name,
    dueDate: result.due_date,
    totalAmount: parseFloat(result.total_amount) || 0,
    savedAmount: parseFloat(result.saved_amount) || 0,
    monthlyEquivalent: parseFloat(result.monthly_equivalent) || 0,
    preparednessRatio: parseFloat(result.preparedness_ratio) || 0
  };
}

export async function getFutureBombsByUserId(userId: string): Promise<FutureBomb[]> {
  const rows = await query<any>(
    'SELECT * FROM future_bombs WHERE user_id = $1',
    [userId]
  );
  
  return rows.map(r => ({
    id: r.id,
    userId: r.user_id,
    name: r.name,
    dueDate: r.due_date,
    totalAmount: parseFloat(r.total_amount) || 0,
    savedAmount: parseFloat(r.saved_amount) || 0,
    monthlyEquivalent: parseFloat(r.monthly_equivalent) || 0,
    preparednessRatio: parseFloat(r.preparedness_ratio) || 0
  }));
}

export async function getFutureBombsByUserIds(userIds: string[]): Promise<FutureBomb[]> {
  if (userIds.length === 0) return [];
  
  const placeholders = userIds.map((_, i) => `$${i + 1}`).join(', ');
  const rows = await query<any>(
    `SELECT * FROM future_bombs WHERE user_id IN (${placeholders})`,
    userIds
  );
  
  return rows.map(r => ({
    id: r.id,
    userId: r.user_id,
    name: r.name,
    dueDate: r.due_date,
    totalAmount: parseFloat(r.total_amount) || 0,
    savedAmount: parseFloat(r.saved_amount) || 0,
    monthlyEquivalent: parseFloat(r.monthly_equivalent) || 0,
    preparednessRatio: parseFloat(r.preparedness_ratio) || 0
  }));
}

export async function updateFutureBomb(bombId: string, updates: Partial<Omit<FutureBomb, 'id' | 'userId'>>): Promise<FutureBomb | null> {
  const setClauses: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (updates.name !== undefined) { setClauses.push(`name = $${paramIndex++}`); values.push(updates.name); }
  if (updates.dueDate !== undefined) { setClauses.push(`due_date = $${paramIndex++}`); values.push(updates.dueDate); }
  if (updates.totalAmount !== undefined) { setClauses.push(`total_amount = $${paramIndex++}`); values.push(updates.totalAmount); }
  if (updates.savedAmount !== undefined) { setClauses.push(`saved_amount = $${paramIndex++}`); values.push(updates.savedAmount); }
  if (updates.monthlyEquivalent !== undefined) { setClauses.push(`monthly_equivalent = $${paramIndex++}`); values.push(updates.monthlyEquivalent); }
  if (updates.preparednessRatio !== undefined) { setClauses.push(`preparedness_ratio = $${paramIndex++}`); values.push(updates.preparednessRatio); }

  if (setClauses.length === 0) return null;

  values.push(bombId);
  const result = await queryOne<any>(
    `UPDATE future_bombs SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  
  if (!result) return null;
  
  return {
    id: result.id,
    userId: result.user_id,
    name: result.name,
    dueDate: result.due_date,
    totalAmount: parseFloat(result.total_amount) || 0,
    savedAmount: parseFloat(result.saved_amount) || 0,
    monthlyEquivalent: parseFloat(result.monthly_equivalent) || 0,
    preparednessRatio: parseFloat(result.preparedness_ratio) || 0
  };
}

export async function deleteFutureBomb(bombId: string): Promise<boolean> {
  await query('DELETE FROM future_bombs WHERE id = $1', [bombId]);
  return true;
}

// ============================================================================
// CREDIT CARDS
// ============================================================================

export interface CreditCard {
  id: string;
  userId: string;
  name: string;
  statementDate: string;
  dueDate: string;
  billAmount?: number;
  paidAmount?: number;
  currentExpenses?: number;
  billingDate?: number;
  needsBillUpdate?: boolean;
}

export async function addCreditCard(card: Omit<CreditCard, 'id'> & { id?: string }): Promise<CreditCard> {
  const result = await queryOne<any>(
    `INSERT INTO credit_cards (id, user_id, name, statement_date, due_date, bill_amount, paid_amount, current_expenses, billing_date, needs_bill_update)
     VALUES (COALESCE($1, gen_random_uuid()), $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [card.id || null, card.userId, card.name, card.statementDate, card.dueDate, card.billAmount || 0, card.paidAmount || 0, card.currentExpenses || 0, card.billingDate, card.needsBillUpdate || false]
  );
  
  if (!result) throw new Error('Failed to add credit card');
  
  return {
    id: result.id,
    userId: result.user_id,
    name: result.name,
    statementDate: result.statement_date,
    dueDate: result.due_date,
    billAmount: parseFloat(result.bill_amount) || 0,
    paidAmount: parseFloat(result.paid_amount) || 0,
    currentExpenses: parseFloat(result.current_expenses) || 0,
    billingDate: result.billing_date,
    needsBillUpdate: result.needs_bill_update
  };
}

export async function getCreditCardsByUserId(userId: string): Promise<CreditCard[]> {
  const rows = await query<any>(
    'SELECT * FROM credit_cards WHERE user_id = $1',
    [userId]
  );
  
  return rows.map(r => ({
    id: r.id,
    userId: r.user_id,
    name: r.name,
    statementDate: r.statement_date,
    dueDate: r.due_date,
    billAmount: parseFloat(r.bill_amount) || 0,
    paidAmount: parseFloat(r.paid_amount) || 0,
    currentExpenses: parseFloat(r.current_expenses) || 0,
    billingDate: r.billing_date,
    needsBillUpdate: r.needs_bill_update
  }));
}

export async function getCreditCardById(cardId: string): Promise<CreditCard | null> {
  const result = await queryOne<any>(
    'SELECT * FROM credit_cards WHERE id = $1',
    [cardId]
  );
  
  if (!result) return null;
  
  return {
    id: result.id,
    userId: result.user_id,
    name: result.name,
    statementDate: result.statement_date,
    dueDate: result.due_date,
    billAmount: parseFloat(result.bill_amount) || 0,
    paidAmount: parseFloat(result.paid_amount) || 0,
    currentExpenses: parseFloat(result.current_expenses) || 0,
    billingDate: result.billing_date,
    needsBillUpdate: result.needs_bill_update
  };
}

export async function updateCreditCard(cardId: string, updates: Partial<Omit<CreditCard, 'id' | 'userId'>>): Promise<CreditCard | null> {
  const setClauses: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (updates.name !== undefined) { setClauses.push(`name = $${paramIndex++}`); values.push(updates.name); }
  if (updates.statementDate !== undefined) { setClauses.push(`statement_date = $${paramIndex++}`); values.push(updates.statementDate); }
  if (updates.dueDate !== undefined) { setClauses.push(`due_date = $${paramIndex++}`); values.push(updates.dueDate); }
  if (updates.billAmount !== undefined) { setClauses.push(`bill_amount = $${paramIndex++}`); values.push(updates.billAmount); }
  if (updates.paidAmount !== undefined) { setClauses.push(`paid_amount = $${paramIndex++}`); values.push(updates.paidAmount); }
  if (updates.currentExpenses !== undefined) { setClauses.push(`current_expenses = $${paramIndex++}`); values.push(updates.currentExpenses); }
  if (updates.billingDate !== undefined) { setClauses.push(`billing_date = $${paramIndex++}`); values.push(updates.billingDate); }
  if (updates.needsBillUpdate !== undefined) { setClauses.push(`needs_bill_update = $${paramIndex++}`); values.push(updates.needsBillUpdate); }

  if (setClauses.length === 0) return null;

  values.push(cardId);
  const result = await queryOne<any>(
    `UPDATE credit_cards SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  
  if (!result) return null;
  
  return {
    id: result.id,
    userId: result.user_id,
    name: result.name,
    statementDate: result.statement_date,
    dueDate: result.due_date,
    billAmount: parseFloat(result.bill_amount) || 0,
    paidAmount: parseFloat(result.paid_amount) || 0,
    currentExpenses: parseFloat(result.current_expenses) || 0,
    billingDate: result.billing_date,
    needsBillUpdate: result.needs_bill_update
  };
}

export async function deleteCreditCard(cardId: string): Promise<boolean> {
  await query('DELETE FROM credit_cards WHERE id = $1', [cardId]);
  return true;
}

// ============================================================================
// LOANS
// ============================================================================

export interface Loan {
  id: string;
  userId: string;
  name: string;
  principal: number;
  remainingTenureMonths: number;
  emi: number;
}

export async function addLoan(loan: Omit<Loan, 'id'> & { id?: string }): Promise<Loan> {
  const result = await queryOne<any>(
    `INSERT INTO loans (id, user_id, name, principal, remaining_tenure_months, emi)
     VALUES (COALESCE($1, gen_random_uuid()), $2, $3, $4, $5, $6)
     RETURNING *`,
    [loan.id || null, loan.userId, loan.name, loan.principal, loan.remainingTenureMonths, loan.emi]
  );
  
  if (!result) throw new Error('Failed to add loan');
  
  return {
    id: result.id,
    userId: result.user_id,
    name: result.name,
    principal: parseFloat(result.principal) || 0,
    remainingTenureMonths: result.remaining_tenure_months,
    emi: parseFloat(result.emi) || 0
  };
}

export async function getLoansByUserId(userId: string): Promise<Loan[]> {
  const rows = await query<any>(
    'SELECT * FROM loans WHERE user_id = $1',
    [userId]
  );
  
  return rows.map(r => ({
    id: r.id,
    userId: r.user_id,
    name: r.name,
    principal: parseFloat(r.principal) || 0,
    remainingTenureMonths: r.remaining_tenure_months,
    emi: parseFloat(r.emi) || 0
  }));
}

export async function getLoanById(loanId: string): Promise<Loan | null> {
  const result = await queryOne<any>(
    'SELECT * FROM loans WHERE id = $1',
    [loanId]
  );
  
  if (!result) return null;
  
  return {
    id: result.id,
    userId: result.user_id,
    name: result.name,
    principal: parseFloat(result.principal) || 0,
    remainingTenureMonths: result.remaining_tenure_months,
    emi: parseFloat(result.emi) || 0
  };
}

export async function updateLoan(loanId: string, updates: Partial<Omit<Loan, 'id' | 'userId'>>): Promise<Loan | null> {
  const setClauses: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (updates.name !== undefined) { setClauses.push(`name = $${paramIndex++}`); values.push(updates.name); }
  if (updates.principal !== undefined) { setClauses.push(`principal = $${paramIndex++}`); values.push(updates.principal); }
  if (updates.remainingTenureMonths !== undefined) { setClauses.push(`remaining_tenure_months = $${paramIndex++}`); values.push(updates.remainingTenureMonths); }
  if (updates.emi !== undefined) { setClauses.push(`emi = $${paramIndex++}`); values.push(updates.emi); }

  if (setClauses.length === 0) return null;

  values.push(loanId);
  const result = await queryOne<any>(
    `UPDATE loans SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  
  if (!result) return null;
  
  return {
    id: result.id,
    userId: result.user_id,
    name: result.name,
    principal: parseFloat(result.principal) || 0,
    remainingTenureMonths: result.remaining_tenure_months,
    emi: parseFloat(result.emi) || 0
  };
}

export async function deleteLoan(loanId: string): Promise<boolean> {
  await query('DELETE FROM loans WHERE id = $1', [loanId]);
  return true;
}

// ============================================================================
// ACTIVITIES
// ============================================================================

export interface Activity {
  id: string;
  actorId: string;
  entity: string;
  action: string;
  payload?: any;
  createdAt?: string;
}

export async function addActivity(activity: Omit<Activity, 'id' | 'createdAt'> & { id?: string }): Promise<Activity> {
  const result = await queryOne<any>(
    `INSERT INTO activities (id, actor_id, entity, action, payload, created_at)
     VALUES (COALESCE($1, gen_random_uuid()), $2, $3, $4, $5, NOW())
     RETURNING *`,
    [activity.id || null, activity.actorId, activity.entity, activity.action, activity.payload ? JSON.stringify(activity.payload) : null]
  );
  
  if (!result) throw new Error('Failed to add activity');
  
  return {
    id: result.id,
    actorId: result.actor_id,
    entity: result.entity,
    action: result.action,
    payload: result.payload,
    createdAt: result.created_at
  };
}

export async function getActivitiesByUserId(userId: string, limit?: number): Promise<Activity[]> {
  let sql = 'SELECT * FROM activities WHERE actor_id = $1 ORDER BY created_at DESC';
  const params: any[] = [userId];
  
  if (limit) {
    sql += ' LIMIT $2';
    params.push(limit);
  }
  
  const rows = await query<any>(sql, params);
  
  return rows.map(r => ({
    id: r.id,
    actorId: r.actor_id,
    entity: r.entity,
    action: r.action,
    payload: r.payload,
    createdAt: r.created_at
  }));
}

// ============================================================================
// USER PREFERENCES
// ============================================================================

export interface UserPreferences {
  userId: string;
  monthStartDay?: number;
  currency?: string;
  timezone?: string;
  useProrated?: boolean;
}

export async function getUserPreferences(userId: string): Promise<UserPreferences> {
  const result = await queryOne<any>(
    'SELECT * FROM user_preferences WHERE user_id = $1',
    [userId]
  );
  
  if (!result) {
    // Return defaults
    return {
      userId,
      monthStartDay: 1,
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      useProrated: false
    };
  }
  
  return {
    userId: result.user_id,
    monthStartDay: result.month_start_day || 1,
    currency: result.currency || 'INR',
    timezone: result.timezone || 'Asia/Kolkata',
    useProrated: result.use_prorated || false
  };
}

export async function updateUserPreferences(userId: string, updates: Partial<Omit<UserPreferences, 'userId'>>): Promise<UserPreferences> {
  // Upsert pattern
  const result = await queryOne<any>(
    `INSERT INTO user_preferences (user_id, month_start_day, currency, timezone, use_prorated, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (user_id) DO UPDATE SET
       month_start_day = COALESCE($2, user_preferences.month_start_day),
       currency = COALESCE($3, user_preferences.currency),
       timezone = COALESCE($4, user_preferences.timezone),
       use_prorated = COALESCE($5, user_preferences.use_prorated),
       updated_at = NOW()
     RETURNING *`,
    [userId, updates.monthStartDay, updates.currency, updates.timezone, updates.useProrated]
  );
  
  return {
    userId: result.user_id,
    monthStartDay: result.month_start_day || 1,
    currency: result.currency || 'INR',
    timezone: result.timezone || 'Asia/Kolkata',
    useProrated: result.use_prorated || false
  };
}

// ============================================================================
// CONSTRAINT SCORES
// ============================================================================

export interface ConstraintScore {
  id?: string;
  userId: string;
  score: number;
  tier: string;
  recentOverspends?: number;
  decayAppliedAt?: string;
}

export async function getConstraintScore(userId: string): Promise<ConstraintScore> {
  const result = await queryOne<any>(
    'SELECT * FROM constraint_scores WHERE user_id = $1',
    [userId]
  );
  
  if (!result) {
    // Return defaults
    return {
      userId,
      score: 0,
      tier: 'green',
      recentOverspends: 0
    };
  }
  
  return {
    id: result.id,
    userId: result.user_id,
    score: result.score,
    tier: result.tier,
    recentOverspends: result.recent_overspends || 0,
    decayAppliedAt: result.decay_applied_at
  };
}

export async function updateConstraintScore(userId: string, updates: Partial<Omit<ConstraintScore, 'id' | 'userId'>>): Promise<ConstraintScore> {
  // Upsert pattern
  const result = await queryOne<any>(
    `INSERT INTO constraint_scores (user_id, score, tier, recent_overspends, decay_applied_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (user_id) DO UPDATE SET
       score = COALESCE($2, constraint_scores.score),
       tier = COALESCE($3, constraint_scores.tier),
       recent_overspends = COALESCE($4, constraint_scores.recent_overspends),
       decay_applied_at = COALESCE($5, constraint_scores.decay_applied_at),
       updated_at = NOW()
     RETURNING *`,
    [userId, updates.score, updates.tier, updates.recentOverspends, updates.decayAppliedAt]
  );
  
  return {
    id: result.id,
    userId: result.user_id,
    score: result.score,
    tier: result.tier,
    recentOverspends: result.recent_overspends || 0,
    decayAppliedAt: result.decay_applied_at
  };
}

// ============================================================================
// THEME STATES
// ============================================================================

export interface ThemeState {
  id?: string;
  ownerRef: string;
  mode?: string;
  selectedTheme?: string;
  constraintTierEffect?: boolean;
}

export async function getThemeState(userId: string): Promise<ThemeState | null> {
  const result = await queryOne<any>(
    'SELECT * FROM theme_states WHERE owner_ref = $1',
    [userId]
  );
  
  if (!result) return null;
  
  return {
    id: result.id,
    ownerRef: result.owner_ref,
    mode: result.mode,
    selectedTheme: result.selected_theme,
    constraintTierEffect: result.constraint_tier_effect
  };
}

export async function updateThemeState(userId: string, updates: Partial<Omit<ThemeState, 'id' | 'ownerRef'>>): Promise<ThemeState> {
  const result = await queryOne<any>(
    `INSERT INTO theme_states (owner_ref, mode, selected_theme, constraint_tier_effect, created_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (owner_ref) DO UPDATE SET
       mode = COALESCE($2, theme_states.mode),
       selected_theme = COALESCE($3, theme_states.selected_theme),
       constraint_tier_effect = COALESCE($4, theme_states.constraint_tier_effect)
     RETURNING *`,
    [userId, updates.mode, updates.selectedTheme, updates.constraintTierEffect]
  );
  
  return {
    id: result.id,
    ownerRef: result.owner_ref,
    mode: result.mode,
    selectedTheme: result.selected_theme,
    constraintTierEffect: result.constraint_tier_effect
  };
}

// ============================================================================
// SHARED ACCOUNTS
// ============================================================================

export interface SharedAccount {
  id: string;
  name: string;
  createdAt?: string;
}

export async function createSharedAccount(account: Omit<SharedAccount, 'id' | 'createdAt'> & { id?: string }): Promise<SharedAccount> {
  const result = await queryOne<any>(
    `INSERT INTO shared_accounts (id, name, created_at)
     VALUES (COALESCE($1, gen_random_uuid()), $2, NOW())
     RETURNING *`,
    [account.id || null, account.name]
  );
  
  if (!result) throw new Error('Failed to create shared account');
  
  return {
    id: result.id,
    name: result.name,
    createdAt: result.created_at
  };
}

export async function getSharedAccountsByUserId(userId: string): Promise<SharedAccount[]> {
  const rows = await query<any>(
    `SELECT sa.* FROM shared_accounts sa
     JOIN shared_members sm ON sa.id = sm.shared_account_id
     WHERE sm.user_id = $1`,
    [userId]
  );
  
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    createdAt: r.created_at
  }));
}

export async function getSharedAccountById(accountId: string): Promise<SharedAccount | null> {
  const result = await queryOne<any>(
    'SELECT * FROM shared_accounts WHERE id = $1',
    [accountId]
  );
  
  if (!result) return null;
  
  return {
    id: result.id,
    name: result.name,
    createdAt: result.created_at
  };
}

export async function updateSharedAccount(accountId: string, updates: Partial<Omit<SharedAccount, 'id' | 'createdAt'>>): Promise<SharedAccount | null> {
  if (!updates.name) return null;
  
  const result = await queryOne<any>(
    'UPDATE shared_accounts SET name = $1 WHERE id = $2 RETURNING *',
    [updates.name, accountId]
  );
  
  if (!result) return null;
  
  return {
    id: result.id,
    name: result.name,
    createdAt: result.created_at
  };
}

export async function deleteSharedAccount(accountId: string): Promise<boolean> {
  await query('DELETE FROM shared_accounts WHERE id = $1', [accountId]);
  return true;
}

// ============================================================================
// SHARED MEMBERS
// ============================================================================

export interface SharedMember {
  id: string;
  sharedAccountId: string;
  userId: string;
  role: string;
  mergeFinances?: boolean;
  createdAt?: string;
}

export async function createSharedMember(member: Omit<SharedMember, 'id' | 'createdAt'> & { id?: string }): Promise<SharedMember> {
  const result = await queryOne<any>(
    `INSERT INTO shared_members (id, shared_account_id, user_id, role, merge_finances, created_at)
     VALUES (COALESCE($1, gen_random_uuid()), $2, $3, $4, $5, NOW())
     RETURNING *`,
    [member.id || null, member.sharedAccountId, member.userId, member.role, member.mergeFinances || false]
  );
  
  if (!result) throw new Error('Failed to create shared member');
  
  return {
    id: result.id,
    sharedAccountId: result.shared_account_id,
    userId: result.user_id,
    role: result.role,
    mergeFinances: result.merge_finances,
    createdAt: result.created_at
  };
}

export async function getSharedMembersByAccountId(accountId: string): Promise<SharedMember[]> {
  const rows = await query<any>(
    'SELECT * FROM shared_members WHERE shared_account_id = $1',
    [accountId]
  );
  
  return rows.map(r => ({
    id: r.id,
    sharedAccountId: r.shared_account_id,
    userId: r.user_id,
    role: r.role,
    mergeFinances: r.merge_finances,
    createdAt: r.created_at
  }));
}

export async function getSharedMembersByUserId(userId: string): Promise<SharedMember[]> {
  const rows = await query<any>(
    'SELECT * FROM shared_members WHERE user_id = $1',
    [userId]
  );
  
  return rows.map(r => ({
    id: r.id,
    sharedAccountId: r.shared_account_id,
    userId: r.user_id,
    role: r.role,
    mergeFinances: r.merge_finances,
    createdAt: r.created_at
  }));
}

export async function updateSharedMember(memberId: string, updates: Partial<Omit<SharedMember, 'id' | 'sharedAccountId' | 'userId' | 'createdAt'>>): Promise<SharedMember | null> {
  const setClauses: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (updates.role !== undefined) { setClauses.push(`role = $${paramIndex++}`); values.push(updates.role); }
  if (updates.mergeFinances !== undefined) { setClauses.push(`merge_finances = $${paramIndex++}`); values.push(updates.mergeFinances); }

  if (setClauses.length === 0) return null;

  values.push(memberId);
  const result = await queryOne<any>(
    `UPDATE shared_members SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  
  if (!result) return null;
  
  return {
    id: result.id,
    sharedAccountId: result.shared_account_id,
    userId: result.user_id,
    role: result.role,
    mergeFinances: result.merge_finances,
    createdAt: result.created_at
  };
}

export async function deleteSharedMember(memberId: string): Promise<boolean> {
  await query('DELETE FROM shared_members WHERE id = $1', [memberId]);
  return true;
}

// ============================================================================
// SHARING REQUESTS
// ============================================================================

export interface SharingRequest {
  id: string;
  inviterId: string;
  inviteeEmail?: string;
  inviteeId?: string;
  role: string;
  mergeFinances?: boolean;
  status?: string;
  createdAt?: string;
}

export async function createSharingRequest(request: Omit<SharingRequest, 'id' | 'createdAt'> & { id?: string }): Promise<SharingRequest> {
  const result = await queryOne<any>(
    `INSERT INTO sharing_requests (id, inviter_id, invitee_email, invitee_id, role, merge_finances, status, created_at)
     VALUES (COALESCE($1, gen_random_uuid()), $2, $3, $4, $5, $6, $7, NOW())
     RETURNING *`,
    [request.id || null, request.inviterId, request.inviteeEmail, request.inviteeId, request.role, request.mergeFinances || false, request.status || 'pending']
  );
  
  if (!result) throw new Error('Failed to create sharing request');
  
  return {
    id: result.id,
    inviterId: result.inviter_id,
    inviteeEmail: result.invitee_email,
    inviteeId: result.invitee_id,
    role: result.role,
    mergeFinances: result.merge_finances,
    status: result.status,
    createdAt: result.created_at
  };
}

export async function getSharingRequestsByInviterId(inviterId: string): Promise<SharingRequest[]> {
  const rows = await query<any>(
    'SELECT * FROM sharing_requests WHERE inviter_id = $1',
    [inviterId]
  );
  
  return rows.map(r => ({
    id: r.id,
    inviterId: r.inviter_id,
    inviteeEmail: r.invitee_email,
    inviteeId: r.invitee_id,
    role: r.role,
    mergeFinances: r.merge_finances,
    status: r.status,
    createdAt: r.created_at
  }));
}

export async function getSharingRequestsByInviteeEmail(email: string): Promise<SharingRequest[]> {
  const rows = await query<any>(
    'SELECT * FROM sharing_requests WHERE invitee_email = $1',
    [email]
  );
  
  return rows.map(r => ({
    id: r.id,
    inviterId: r.inviter_id,
    inviteeEmail: r.invitee_email,
    inviteeId: r.invitee_id,
    role: r.role,
    mergeFinances: r.merge_finances,
    status: r.status,
    createdAt: r.created_at
  }));
}

export async function updateSharingRequest(requestId: string, updates: Partial<Omit<SharingRequest, 'id' | 'inviterId' | 'createdAt'>>): Promise<SharingRequest | null> {
  const setClauses: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (updates.inviteeEmail !== undefined) { setClauses.push(`invitee_email = $${paramIndex++}`); values.push(updates.inviteeEmail); }
  if (updates.inviteeId !== undefined) { setClauses.push(`invitee_id = $${paramIndex++}`); values.push(updates.inviteeId); }
  if (updates.role !== undefined) { setClauses.push(`role = $${paramIndex++}`); values.push(updates.role); }
  if (updates.mergeFinances !== undefined) { setClauses.push(`merge_finances = $${paramIndex++}`); values.push(updates.mergeFinances); }
  if (updates.status !== undefined) { setClauses.push(`status = $${paramIndex++}`); values.push(updates.status); }

  if (setClauses.length === 0) return null;

  values.push(requestId);
  const result = await queryOne<any>(
    `UPDATE sharing_requests SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  
  if (!result) return null;
  
  return {
    id: result.id,
    inviterId: result.inviter_id,
    inviteeEmail: result.invitee_email,
    inviteeId: result.invitee_id,
    role: result.role,
    mergeFinances: result.merge_finances,
    status: result.status,
    createdAt: result.created_at
  };
}

export async function deleteSharingRequest(requestId: string): Promise<boolean> {
  await query('DELETE FROM sharing_requests WHERE id = $1', [requestId]);
  return true;
}

// ============================================================================
// PAYMENTS
// ============================================================================

export interface Payment {
  id: string;
  userId: string;
  entityType: string;
  entityId: string;
  month: string;
  amount: number;
  paidAt?: string;
}

export async function addPayment(payment: Omit<Payment, 'id' | 'paidAt'> & { id?: string }): Promise<Payment> {
  const result = await queryOne<any>(
    `INSERT INTO payments (id, user_id, entity_type, entity_id, month, amount, paid_at)
     VALUES (COALESCE($1, gen_random_uuid()), $2, $3, $4, $5, $6, NOW())
     RETURNING *`,
    [payment.id || null, payment.userId, payment.entityType, payment.entityId, payment.month, payment.amount]
  );
  
  if (!result) throw new Error('Failed to add payment');
  
  return {
    id: result.id,
    userId: result.user_id,
    entityType: result.entity_type,
    entityId: result.entity_id,
    month: result.month,
    amount: parseFloat(result.amount) || 0,
    paidAt: result.paid_at
  };
}

export async function getPaymentsByUserIdAndMonth(userId: string, month: string): Promise<Payment[]> {
  const rows = await query<any>(
    'SELECT * FROM payments WHERE user_id = $1 AND month = $2',
    [userId, month]
  );
  
  return rows.map(r => ({
    id: r.id,
    userId: r.user_id,
    entityType: r.entity_type,
    entityId: r.entity_id,
    month: r.month,
    amount: parseFloat(r.amount) || 0,
    paidAt: r.paid_at
  }));
}

export async function getPaymentsSummaryByUserIdAndMonth(userId: string, month: string): Promise<{ entityType: string; entityId: string; totalPaid: number }[]> {
  const rows = await query<any>(
    `SELECT entity_type, entity_id, SUM(amount) as total_paid
     FROM payments
     WHERE user_id = $1 AND month = $2
     GROUP BY entity_type, entity_id`,
    [userId, month]
  );
  
  return rows.map(r => ({
    entityType: r.entity_type,
    entityId: r.entity_id,
    totalPaid: parseFloat(r.total_paid) || 0
  }));
}

export async function deletePayment(paymentId: string): Promise<boolean> {
  await query('DELETE FROM payments WHERE id = $1', [paymentId]);
  return true;
}

// ============================================================================
// COMBINED DASHBOARD DATA (Single Query Optimization)
// ============================================================================

export interface DashboardData {
  groupUserIds: string[];
  incomes: Income[];
  fixedExpenses: FixedExpense[];
  variablePlans: VariablePlan[];
  variableActuals: VariableActual[];
  investments: Investment[];
  futureBombs: FutureBomb[];
  loans: Loan[];
  creditCards: CreditCard[];
  preferences: { userId: string; monthStartDay: number; currency: string; timezone: string; useProrated: boolean } | null;
  constraintScore: { userId: string; score: number; tier: string; recentOverspends: number; decayAppliedAt: string; updatedAt: string } | null;
  healthCache: {
    availableFunds: number;
    healthCategory: string;
    healthPercentage: number | null;
    constraintScore: number;
    constraintTier: string;
    computedAt: string;
    isStale: boolean;
  } | null;
}

/**
 * Fetches ALL dashboard data in a single database round-trip.
 * This dramatically reduces latency compared to 10+ separate queries.
 */
export async function getDashboardData(userId: string, billingPeriodId?: string): Promise<DashboardData> {
  const result = await queryOne<any>(
    `SELECT get_dashboard_data($1, $2) as data`,
    [userId, billingPeriodId || null]
  );
  
  if (!result?.data) {
    // Return empty dashboard if function fails
    return {
      groupUserIds: [userId],
      incomes: [],
      fixedExpenses: [],
      variablePlans: [],
      variableActuals: [],
      investments: [],
      futureBombs: [],
      loans: [],
      creditCards: [],
      preferences: null,
      constraintScore: null,
      healthCache: null
    };
  }
  
  const data = result.data;
  
  return {
    groupUserIds: data.groupUserIds || [userId],
    incomes: (data.incomes || []).map((i: any) => ({
      id: i.id,
      userId: i.userId,
      name: i.name,
      amount: parseFloat(i.amount) || 0,
      category: i.category,
      frequency: i.frequency,
      startDate: i.startDate,
      endDate: i.endDate
    })),
    fixedExpenses: (data.fixedExpenses || []).map((fe: any) => ({
      id: fe.id,
      userId: fe.userId,
      name: fe.name,
      amount: parseFloat(fe.amount) || 0,
      category: fe.category,
      frequency: fe.frequency,
      startDate: fe.startDate,
      endDate: fe.endDate,
      isSip: fe.isSipFlag
    })),
    variablePlans: (data.variablePlans || []).map((vp: any) => ({
      id: vp.id,
      userId: vp.userId,
      name: vp.name,
      planned: parseFloat(vp.planned) || 0,
      category: vp.category,
      startDate: vp.startDate,
      endDate: vp.endDate
    })),
    variableActuals: (data.variableActuals || []).map((va: any) => ({
      id: va.id,
      planId: va.planId,
      userId: va.userId,
      amount: parseFloat(va.amount) || 0,
      incurredAt: va.incurredAt,
      justification: va.justification,
      subcategory: va.subcategory,
      paymentMode: va.paymentMode,
      creditCardId: va.creditCardId
    })),
    investments: (data.investments || []).map((inv: any) => ({
      id: inv.id,
      userId: inv.userId,
      name: inv.name,
      monthlyAmount: parseFloat(inv.monthlyAmount) || 0,
      goal: inv.goal,
      status: inv.status || 'active'
    })),
    futureBombs: (data.futureBombs || []).map((fb: any) => ({
      id: fb.id,
      userId: fb.userId,
      name: fb.name,
      dueDate: fb.dueDate,
      totalAmount: parseFloat(fb.totalAmount) || 0,
      savedAmount: parseFloat(fb.savedAmount) || 0,
      monthlyEquivalent: parseFloat(fb.monthlyEquivalent) || 0,
      preparednessRatio: parseFloat(fb.preparednessRatio) || 0
    })),
    loans: (data.loans || []).map((l: any) => ({
      id: l.id,
      userId: l.userId,
      name: l.name,
      principal: parseFloat(l.principal) || 0,
      remainingTenureMonths: l.remainingTenureMonths || 0,
      emi: parseFloat(l.emi) || 0
    })),
    creditCards: (data.creditCards || []).map((cc: any) => ({
      id: cc.id,
      userId: cc.userId,
      name: cc.name,
      statementDate: cc.statementDate,
      dueDate: cc.dueDate,
      billAmount: parseFloat(cc.billAmount) || 0,
      paidAmount: parseFloat(cc.paidAmount) || 0,
      currentExpenses: parseFloat(cc.currentExpenses) || 0,
      billingDate: cc.billingDate,
      needsBillUpdate: cc.needsBillUpdate
    })),
    preferences: data.preferences ? {
      userId: data.preferences.userId,
      monthStartDay: data.preferences.monthStartDay || 1,
      currency: data.preferences.currency || 'INR',
      timezone: data.preferences.timezone || 'Asia/Kolkata',
      useProrated: data.preferences.useProrated || false
    } : null,
    constraintScore: data.constraintScore ? {
      userId: data.constraintScore.userId,
      score: parseFloat(data.constraintScore.score) || 0,
      tier: data.constraintScore.tier || 'green',
      recentOverspends: data.constraintScore.recentOverspends || 0,
      decayAppliedAt: data.constraintScore.decayAppliedAt,
      updatedAt: data.constraintScore.updatedAt
    } : null,
    healthCache: data.healthCache ? {
      availableFunds: parseFloat(data.healthCache.availableFunds) || 0,
      healthCategory: data.healthCache.healthCategory || 'ok',
      healthPercentage: data.healthCache.healthPercentage ? parseFloat(data.healthCache.healthPercentage) : null,
      constraintScore: parseFloat(data.healthCache.constraintScore) || 0,
      constraintTier: data.healthCache.constraintTier || 'green',
      computedAt: data.healthCache.computedAt,
      isStale: data.healthCache.isStale === true
    } : null
  };
}

// ============================================================================
// CONNECTION TEST
// ============================================================================

export async function testConnection(): Promise<boolean> {
  try {
    const result = await queryOne<any>('SELECT 1 as test');
    return result?.test === 1;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}

// ============================================================================
// USER AGGREGATES (for sharing feature)
// ============================================================================

export interface UserAggregate {
  user_id: string;
  total_income_monthly: number;
  total_fixed_monthly: number;
  total_investments_monthly: number;
  total_variable_planned: number;
  total_variable_actual: number;
  total_credit_card_dues: number;
  updated_at: string;
}

export async function getUserAggregates(userIds: string[]): Promise<UserAggregate[]> {
  if (!userIds.length) return [];
  
  const placeholders = userIds.map((_, i) => `$${i + 1}`).join(', ');
  const rows = await query<any>(
    `SELECT user_id, total_income_monthly, total_fixed_monthly, total_investments_monthly,
            total_variable_planned, total_variable_actual, total_credit_card_dues, updated_at
     FROM user_aggregates 
     WHERE user_id IN (${placeholders})`,
    userIds
  );
  
  return rows.map(r => ({
    user_id: r.user_id,
    total_income_monthly: parseFloat(r.total_income_monthly) || 0,
    total_fixed_monthly: parseFloat(r.total_fixed_monthly) || 0,
    total_investments_monthly: parseFloat(r.total_investments_monthly) || 0,
    total_variable_planned: parseFloat(r.total_variable_planned) || 0,
    total_variable_actual: parseFloat(r.total_variable_actual) || 0,
    total_credit_card_dues: parseFloat(r.total_credit_card_dues) || 0,
    updated_at: r.updated_at
  }));
}

export async function upsertUserAggregate(aggregate: Omit<UserAggregate, 'updated_at'>): Promise<void> {
  await query(
    `INSERT INTO user_aggregates (user_id, total_income_monthly, total_fixed_monthly, total_investments_monthly,
                                   total_variable_planned, total_variable_actual, total_credit_card_dues, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
     ON CONFLICT (user_id) DO UPDATE SET
       total_income_monthly = EXCLUDED.total_income_monthly,
       total_fixed_monthly = EXCLUDED.total_fixed_monthly,
       total_investments_monthly = EXCLUDED.total_investments_monthly,
       total_variable_planned = EXCLUDED.total_variable_planned,
       total_variable_actual = EXCLUDED.total_variable_actual,
       total_credit_card_dues = EXCLUDED.total_credit_card_dues,
       updated_at = NOW()`,
    [
      aggregate.user_id,
      aggregate.total_income_monthly,
      aggregate.total_fixed_monthly,
      aggregate.total_investments_monthly,
      aggregate.total_variable_planned,
      aggregate.total_variable_actual,
      aggregate.total_credit_card_dues
    ]
  );
}

// ============================================================================
// CLEANUP
// ============================================================================

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

