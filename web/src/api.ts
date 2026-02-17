import { encryptString, decryptString } from "./lib/crypto";

export type LoginResponse = { 
  access_token: string; 
  user: { id: string; username: string }; 
  encryption_salt?: string;
};

export type HealthThresholds = {
  good_min: number;
  ok_min: number;
  ok_max: number;
  not_well_max: number;
};

// API URL - defaults to Supabase Edge Function, falls back to Railway/localhost
export const getBaseUrl = () => {
  // Check for explicit API URL first
  const envUrl = (import.meta as any).env?.VITE_API_URL;
  if (envUrl) {
    if (!envUrl.startsWith("http://") && !envUrl.startsWith("https://")) {
      return `https://${envUrl}`;
    }
    return envUrl;
  }
  
  // Default to Supabase Edge Function in production
  const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
  if (supabaseUrl) {
    return `${supabaseUrl}/functions/v1/api`;
  }
  
  // Fallback to localhost for development
  return "http://localhost:12022";
};

const BASE_URL = getBaseUrl();

// Supabase anon key for Edge Function authentication
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

// Check if we're using Supabase Edge Functions
const isSupabaseEdgeFunction = BASE_URL.includes('supabase.co/functions');

// E2E Encryption: Sensitive fields that need encryption
const SENSITIVE_FIELDS = new Set([
  'name', 'amount', 'planned', 'description', 'justification',
  'source', 'goal', 'limit', 'bill_amount', 'paid_amount',
  'monthly_amount', 'total_amount', 'saved_amount', 'accumulated_funds',
  'principal', 'emi'  // loans
]);

function isSensitiveField(field: string): boolean {
  if (SENSITIVE_FIELDS.has(field)) return true;
  for (const sf of SENSITIVE_FIELDS) {
    if (field.endsWith(`_${sf}`) || field.startsWith(`${sf}_`)) return true;
  }
  return false;
}

// E2E Encryption: Encrypt object fields in parallel
// PHASE 2: Only send encrypted data, NO plaintext for sensitive fields
async function encryptObjectFields(obj: any, key: CryptoKey): Promise<any> {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return Promise.all(obj.map(item => encryptObjectFields(item, key)));
  if (typeof obj !== 'object') return obj;
  
  const result: any = {};
  const tasks: Promise<void>[] = [];
  
  for (const [field, value] of Object.entries(obj)) {
    if (field.endsWith('_enc') || field.endsWith('_iv')) continue;
    
    if (isSensitiveField(field) && value !== null && value !== undefined) {
      tasks.push(
        encryptString(String(value), key).then(({ ciphertext, iv }) => {
          result[`${field}_enc`] = ciphertext;
          result[`${field}_iv`] = iv;
          // PHASE 2: NO plaintext - server stores only encrypted data
        })
      );
    } else if (typeof value === 'object') {
      tasks.push(encryptObjectFields(value, key).then(enc => { result[field] = enc; }));
    } else {
      result[field] = value;
    }
  }
  
  await Promise.all(tasks);
  return result;
}

// E2E Encryption: Decrypt object fields in parallel
// PHASE 2: No plaintext fallback - encrypted data is the source of truth
async function decryptObjectFields(obj: any, key: CryptoKey): Promise<any> {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return Promise.all(obj.map(item => decryptObjectFields(item, key)));
  if (typeof obj !== 'object') return obj;
  
  const result: any = {};
  const processed = new Set<string>();
  const tasks: Promise<void>[] = [];
  
  for (const [field, value] of Object.entries(obj)) {
    if (field.endsWith('_enc')) {
      const orig = field.slice(0, -4);
      const ivField = `${orig}_iv`;
      if (obj[ivField]) {
        processed.add(field);
        processed.add(ivField);
        processed.add(orig); // Mark original field as processed (will be replaced by decrypted)
        tasks.push(
          decryptString(value as string, obj[ivField] as string, key)
            .then(dec => {
              const num = parseFloat(dec);
              result[orig] = isNaN(num) ? dec : num;
            })
            .catch((err) => { 
              console.error(`[E2E_DECRYPT_ERROR] Failed to decrypt ${orig}:`, err);
              // PHASE 2: Use placeholder on decrypt failure, NOT plaintext
              result[orig] = typeof obj[orig] === 'number' ? 0 : '[Private]';
            })
        );
      }
    }
  }
  
  for (const [field, value] of Object.entries(obj)) {
    if (!processed.has(field) && !field.endsWith('_iv') && !field.endsWith('_enc')) {
      if (typeof value === 'object') {
        tasks.push(decryptObjectFields(value, key).then(dec => { result[field] = dec; }));
      } else {
        // PHASE 2: Don't copy '[encrypted]' placeholder values from server
        if (value !== '[encrypted]') {
          result[field] = value;
        }
      }
    }
  }
  
  await Promise.all(tasks);
  return result;
}

async function request<T>(path: string, options: RequestInit = {}, token?: string, cryptoKey?: CryptoKey): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
  
  // Add Supabase apikey header for Edge Functions (required even for public endpoints)
  if (isSupabaseEdgeFunction) {
    if (SUPABASE_ANON_KEY) {
      headers['apikey'] = SUPABASE_ANON_KEY;
    } else {
      console.error('[API_ERROR] VITE_SUPABASE_ANON_KEY is not set. Supabase Edge Functions require the apikey header.');
    }
  }
  
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers
  });
  
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    // Provide more helpful error message for 401 on auth endpoints
    if (res.status === 401 && (path.includes('/auth/') || path.includes('/signup'))) {
      if (isSupabaseEdgeFunction && !SUPABASE_ANON_KEY) {
        throw new Error('Authentication failed: VITE_SUPABASE_ANON_KEY environment variable is missing. Please configure it in your deployment settings.');
      }
    }
    throw new Error(body?.error?.message || `Request failed: ${res.status}`);
  }
  const data = await res.json() as any;
  
  // E2E: Decrypt response if crypto key is provided
  if (cryptoKey && data.data) {
    data.data = await decryptObjectFields(data.data, cryptoKey);
    
    // Post-decryption: Normalize field names and recalculate aggregates
    if (data.data.investments && Array.isArray(data.data.investments)) {
      data.data.investments = data.data.investments.map((inv: any) => ({
        ...inv,
        monthlyAmount: parseFloat(inv.monthly_amount) || parseFloat(inv.monthlyAmount) || 0
      }));
    }
    
    if (data.data.fixedExpenses && Array.isArray(data.data.fixedExpenses)) {
      data.data.fixedExpenses = data.data.fixedExpenses.map((exp: any) => ({
        ...exp,
        amount: parseFloat(exp.amount) || 0
      }));
    }
    
    if (data.data.incomes && Array.isArray(data.data.incomes)) {
      data.data.incomes = data.data.incomes.map((inc: any) => ({
        ...inc,
        amount: parseFloat(inc.amount) || 0
      }));
    }
    
    if (data.data.variablePlans && Array.isArray(data.data.variablePlans)) {
      data.data.variablePlans = data.data.variablePlans.map((plan: any) => {
        const planned = parseFloat(plan.planned) || 0;
        if (plan.actuals && Array.isArray(plan.actuals)) {
          const recalculatedTotal = plan.actuals.reduce((sum: number, actual: any) => {
            const amount = parseFloat(actual.amount) || 0;
            return sum + amount;
          }, 0);
          return { ...plan, planned, actualTotal: recalculatedTotal };
        }
        return { ...plan, planned };
      });
    }
    
    const loansArray = Array.isArray(data.data) ? data.data : data.data.loans;
    if (loansArray && Array.isArray(loansArray)) {
      const processedLoans = loansArray.map((loan: any) => {
        const amount = parseFloat(loan.amount) || 0;
        const frequency = loan.frequency || 'monthly';
        
        const emi = frequency === 'monthly' ? amount :
          frequency === 'quarterly' ? amount / 3 :
          frequency === 'yearly' ? amount / 12 : amount;
        
        const remainingMonths = loan.remainingTenureMonths || 12;
        
        return {
          ...loan,
          amount,
          emi: Math.round(emi * 100) / 100,
          principal: Math.round((emi * remainingMonths) * 100) / 100
        };
      });
      
      if (Array.isArray(data.data)) {
        data.data = processedLoans;
      } else if (data.data.loans) {
        data.data.loans = processedLoans;
      }
    }
  }
  
  return data as T;
}

async function buildBody(data: any, cryptoKey?: CryptoKey): Promise<string> {
  if (!cryptoKey) {
    return JSON.stringify(data);
  }
  const encrypted = await encryptObjectFields(data, cryptoKey);
  return JSON.stringify(encrypted);
}

export async function signup(
  username: string, 
  password: string, 
  encryptionSalt: string, 
  recoveryKeyHash: string
): Promise<LoginResponse> {
  return request<LoginResponse>("/auth/signup", { 
    method: "POST", 
    body: JSON.stringify({ username, password, encryptionSalt, recoveryKeyHash }) 
  });
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  return request<LoginResponse>("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) });
}

export async function fetchSalt(username: string): Promise<{ encryption_salt: string }> {
  return request<{ encryption_salt: string }>(`/auth/salt/${encodeURIComponent(username)}`, { method: "GET" });
}

// Health thresholds
export async function getHealthThresholds(token: string): Promise<HealthThresholds> {
  const res = await request<{ data: HealthThresholds }>("/health-thresholds", { method: "GET" }, token);
  return res.data;
}

export async function updateHealthThresholds(token: string, thresholds: Partial<HealthThresholds>): Promise<HealthThresholds> {
  const res = await request<{ data: HealthThresholds }>("/health-thresholds", {
    method: "PUT",
    body: JSON.stringify(thresholds)
  }, token);
  return res.data;
}

// Recovery with recovery key
export async function recoverWithKey(
  username: string,
  recoveryKey: string,
  newPassword: string
): Promise<{ access_token: string; encryption_salt: string }> {
  return request<{ access_token: string; encryption_salt: string }>("/auth/recover-with-key", {
    method: "POST",
    body: JSON.stringify({ username, recoveryKey, newPassword })
  });
}

// User profile
export async function getUserProfile(token: string): Promise<{ data: any }> {
  return request<{ data: any }>("/user/profile", { method: "GET" }, token);
}

export async function updateUserPassword(
  token: string, 
  oldPassword: string, 
  newPassword: string
): Promise<{ message: string }> {
  return request<{ message: string }>("/user/password", {
    method: "PUT",
    body: JSON.stringify({ oldPassword, newPassword })
  }, token);
}

export async function fetchDashboard(token: string, asOf?: string, view?: string, cryptoKey?: CryptoKey, nocache?: boolean) {
  const params = new URLSearchParams();
  if (asOf) params.set("today", asOf);
  if (view) params.set("view", view);
  if (nocache) params.set("nocache", "true");
  const query = params.toString() ? `?${params.toString()}` : "";
  return request<{ data: any }>(`/dashboard${query}`, { method: "GET" }, token, cryptoKey);
}

export async function createIncome(token: string, payload: { source: string; amount: number; frequency: string }, cryptoKey?: CryptoKey) {
  const body = await buildBody(payload, cryptoKey);
  return request<{ data: any }>("/planning/income", { method: "POST", body }, token);
}

export async function createVariablePlan(
  token: string,
  payload: { name: string; planned: number; category: string; start_date: string },
  cryptoKey?: CryptoKey
) {
  const body = await buildBody(payload, cryptoKey);
  return request<{ data: any }>("/planning/variable-expenses", { method: "POST", body }, token);
}

// v1.2: Updated to include subcategory and payment mode
export async function addVariableActual(
  token: string,
  id: string,
  payload: { 
    amount: number; 
    incurred_at: string; 
    justification?: string;
    subcategory?: string;
    payment_mode: "UPI" | "Cash" | "ExtraCash" | "CreditCard";
    credit_card_id?: string;
  },
  cryptoKey?: CryptoKey
) {
  const body = await buildBody(payload, cryptoKey);
  return request<{ data: any }>(`/planning/variable-expenses/${id}/actuals`, { method: "POST", body }, token);
}

// v1.2: Subcategory management
export async function getUserSubcategories(token: string) {
  return request<{ data: string[] }>("/user/subcategories", { method: "GET" }, token);
}

export async function addUserSubcategory(token: string, subcategory: string) {
  const body = await buildBody({ subcategory });
  return request<{ data: { subcategory: string; subcategories: string[] } }>("/user/subcategories", { method: "POST", body }, token);
}

export async function fetchSharingRequests(token: string) {
  return request<{ data: { incoming: any[]; outgoing: any[] } }>("/sharing/requests", { method: "GET" }, token);
}

export async function fetchSharingMembers(token: string) {
  return request<{ data: { members: any[]; accounts: any[] } }>("/sharing/members", { method: "GET" }, token);
}

// Update user aggregates (for E2E encryption - client calculates, server stores)
export async function updateUserAggregates(
  token: string,
  aggregates: {
    total_income_monthly: number;
    total_fixed_monthly: number;
    total_investments_monthly: number;
    total_variable_planned: number;
    total_variable_actual: number;
    total_credit_card_dues: number;
  }
) {
  return request<{ data: { success: boolean } }>("/user/aggregates", {
    method: "PUT",
    body: JSON.stringify(aggregates)
  }, token);
}

export async function sendInvite(token: string, payload: { username: string; role: "editor" | "viewer"; merge_finances?: boolean }) {
  const requestData = {
    username: payload.username,
    role: payload.role,
    merge_finances: payload.merge_finances || false
  };
  const body = await buildBody(requestData);
  return request<{ data: any }>("/sharing/invite", { method: "POST", body }, token);
}

export async function approveRequest(token: string, id: string) {
  return request<{ data: any }>(`/sharing/requests/${id}/approve`, { method: "POST" }, token);
}

export async function rejectRequest(token: string, id: string) {
  return request<{ data: any }>(`/sharing/requests/${id}/reject`, { method: "POST" }, token);
}

export async function fetchCreditCards(token: string, cryptoKey?: CryptoKey) {
  return request<{ data: any[] }>("/debts/credit-cards", { method: "GET" }, token, cryptoKey);
}

// v1.2: Updated to include billingDate
export async function createCreditCard(token: string, payload: { name: string; billAmount?: number; paidAmount?: number; dueDate: string; billingDate?: number }, cryptoKey?: CryptoKey) {
  const body = await buildBody(payload, cryptoKey);
  return request<{ data: any }>("/debts/credit-cards", { method: "POST", body }, token);
}

export async function updateCreditCard(token: string, id: string, payload: { name?: string; billAmount?: number; paidAmount?: number; dueDate?: string; billingDate?: number }, cryptoKey?: CryptoKey) {
  const body = await buildBody(payload, cryptoKey);
  return request<{ data: any }>(`/debts/credit-cards/${id}`, { method: "PUT", body }, token);
}

export async function deleteCreditCard(token: string, id: string) {
  return request<{ data: any }>(`/debts/credit-cards/${id}`, { method: "DELETE" }, token);
}

export async function payCreditCard(token: string, id: string, amount: number) {
  return request<{ data: any }>(`/debts/credit-cards/${id}/payments`, { method: "POST", body: JSON.stringify({ amount }) }, token);
}

// v1.2: Credit card billing functions
export async function resetCreditCardBilling(token: string, id: string) {
  return request<{ data: any }>(`/debts/credit-cards/${id}/reset-billing`, { method: "POST" }, token);
}

export async function getBillingAlerts(token: string) {
  return request<{ data: Array<{ cardId: string; cardName: string; message: string }> }>("/debts/credit-cards/billing-alerts", { method: "GET" }, token);
}

// v1.2: Get credit card usage
export async function getCreditCardUsage(token: string, cardId: string) {
  return request<{ data: any[] }>(`/debts/credit-cards/${cardId}/usage`, { method: "GET" }, token);
}

// v1.2: Update credit card bill amount
export async function updateCreditCardBill(token: string, cardId: string, billAmount: number) {
  return request<{ data: any }>(`/debts/credit-cards/${cardId}`, { 
    method: "PATCH", 
    body: JSON.stringify({ billAmount: Math.round(billAmount * 100) / 100 }) 
  }, token);
}

export async function fetchLoans(token: string, cryptoKey?: CryptoKey) {
  return request<{ data: any[] }>("/debts/loans", { method: "GET" }, token, cryptoKey);
}

export async function fetchActivity(token: string, startDate?: string, endDate?: string, cryptoKey?: CryptoKey, view?: string) {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  if (view && view !== 'me') params.append('view', view);
  const queryString = params.toString();
  const url = `/activity${queryString ? `?${queryString}` : ''}`;
  return request<{ data: any[] }>(url, { method: "GET" }, token, cryptoKey);
}

export async function fetchAlerts(token: string) {
  return request<{ data: any[] }>("/alerts", { method: "GET" }, token);
}

// Export finances with decryption support
export async function exportFinances(token: string, cryptoKey?: CryptoKey) {
  return request<{ data: any }>("/export/finances", { method: "GET" }, token, cryptoKey);
}

export async function fetchThemeState(token: string) {
  return request<{ data: any }>("/themes/state", { method: "GET" }, token);
}

export async function updateThemeState(token: string, payload: { mode?: "health_auto" | "manual"; selected_theme?: "thunderstorms" | "reddish_dark_knight" | "green_zone"; constraint_tier_effect?: boolean }) {
  return request<{ data: any }>("/themes/state", { method: "PATCH", body: JSON.stringify(payload) }, token);
}

export async function createFixedExpense(token: string, payload: { name: string; amount: number; frequency: string; category: string; start_date?: string; end_date?: string; is_sip_flag?: boolean }, cryptoKey?: CryptoKey) {
  const body = await buildBody(payload, cryptoKey);
  return request<{ data: any }>("/planning/fixed-expenses", { method: "POST", body }, token);
}

export async function updateFixedExpense(token: string, id: string, payload: { name?: string; amount?: number; frequency?: string; category?: string; start_date?: string; end_date?: string; is_sip_flag?: boolean }, cryptoKey?: CryptoKey) {
  const body = await buildBody(payload, cryptoKey);
  return request<{ data: any }>(`/planning/fixed-expenses/${id}`, { method: "PUT", body }, token);
}

export async function deleteFixedExpense(token: string, id: string) {
  return request<{ data: any }>(`/planning/fixed-expenses/${id}`, { method: "DELETE" }, token);
}

export async function createVariableExpensePlan(token: string, payload: { name: string; planned: number; category: string; start_date: string; end_date?: string }, cryptoKey?: CryptoKey) {
  const body = await buildBody(payload, cryptoKey);
  return request<{ data: any }>("/planning/variable-expenses", { method: "POST", body }, token);
}

export async function updateVariableExpensePlan(token: string, id: string, payload: { name?: string; planned?: number; category?: string; start_date?: string; end_date?: string }, cryptoKey?: CryptoKey) {
  const body = await buildBody(payload, cryptoKey);
  return request<{ data: any }>(`/planning/variable-expenses/${id}`, { method: "PUT", body }, token);
}

export async function deleteVariableExpensePlan(token: string, id: string) {
  return request<{ data: any }>(`/planning/variable-expenses/${id}`, { method: "DELETE" }, token);
}

export async function updateIncome(token: string, id: string, payload: { source?: string; amount?: number; frequency?: string }, cryptoKey?: CryptoKey) {
  const body = await buildBody(payload, cryptoKey);
  return request<{ data: any }>(`/planning/income/${id}`, { method: "PUT", body }, token);
}

export async function deleteIncome(token: string, id: string) {
  return request<{ data: any }>(`/planning/income/${id}`, { method: "DELETE" }, token);
}

// Investments
export async function createInvestment(token: string, payload: { name: string; goal: string; monthlyAmount: number; status: string }, cryptoKey?: CryptoKey) {
  const backendPayload: any = {
    name: payload.name,
    goal: payload.goal,
    monthly_amount: payload.monthlyAmount,
    status: payload.status
  };
  const body = await buildBody(backendPayload, cryptoKey);
  return request<{ data: any }>("/planning/investments", { method: "POST", body }, token);
}

export async function updateInvestment(token: string, id: string, payload: { name?: string; goal?: string; monthlyAmount?: number; status?: string; accumulatedFunds?: number }, cryptoKey?: CryptoKey) {
  const backendPayload: any = {};
  if (payload.name !== undefined) backendPayload.name = payload.name;
  if (payload.goal !== undefined) backendPayload.goal = payload.goal;
  if (payload.monthlyAmount !== undefined) backendPayload.monthly_amount = payload.monthlyAmount;
  if (payload.status !== undefined) backendPayload.status = payload.status;
  if (payload.accumulatedFunds !== undefined) backendPayload.accumulated_funds = payload.accumulatedFunds;
  
  const body = await buildBody(backendPayload, cryptoKey);
  return request<{ data: any }>(`/planning/investments/${id}`, { method: "PUT", body }, token);
}

export async function deleteInvestment(token: string, id: string) {
  return request<{ data: { deleted: boolean } }>(`/planning/investments/${id}`, { method: "DELETE" }, token);
}

export async function pauseInvestment(token: string, id: string) {
  return updateInvestment(token, id, { status: "paused" });
}

export async function resumeInvestment(token: string, id: string) {
  return updateInvestment(token, id, { status: "active" });
}

// Payment tracking
export async function markAsPaid(token: string, itemId: string, itemType: 'fixed_expense' | 'investment' | 'loan', amount: number) {
  return request<{ data: any }>("/payments/mark-paid", { method: "POST", body: JSON.stringify({ itemId, itemType, amount }) }, token);
}

export async function markAsUnpaid(token: string, itemId: string, itemType: 'fixed_expense' | 'investment' | 'loan') {
  return request<{ data: any }>("/payments/mark-unpaid", { method: "POST", body: JSON.stringify({ itemId, itemType }) }, token);
}

export async function getPaymentStatus(token: string, month?: string) {
  const query = month ? `?month=${month}` : '';
  return request<{ data: Record<string, boolean> }>(`/payments/status${query}`, {}, token);
}

export async function getPaymentsSummary(token: string, month?: string) {
  const query = month ? `?month=${month}` : '';
  return request<{ data: any }>(`/payments/summary${query}`, {}, token);
}

// User preferences
export async function getUserPreferences(token: string) {
  return request<{ data: any }>("/preferences", {}, token);
}

export async function updateUserPreferences(token: string, preferences: { monthStartDay?: number; currency?: string; timezone?: string }) {
  return request<{ data: any }>("/preferences", { method: "PATCH", body: JSON.stringify(preferences) }, token);
}

// Notification preferences
export async function getNotificationPreferences(token: string) {
  return request<{ data: any }>("/notifications/preferences", {}, token);
}

export async function updateNotificationPreferences(token: string, prefs: any) {
  return request<{ data: any }>("/notifications/preferences", { method: "PUT", body: JSON.stringify(prefs) }, token);
}

// Health details
export async function fetchHealthDetails(token: string, asOf?: string, cryptoKey?: CryptoKey) {
  const query = asOf ? `?today=${encodeURIComponent(asOf)}` : "";
  return request<{ data: any }>(`/health/details${query}`, { method: "GET" }, token, cryptoKey);
}
