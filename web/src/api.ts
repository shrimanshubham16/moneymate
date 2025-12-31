import { encryptString } from "./lib/crypto";

export type LoginResponse = { access_token: string; user: { id: string; username: string }; encryption_salt?: string };

// API URL - defaults to Supabase Edge Function, falls back to Railway/localhost
const getBaseUrl = () => {
  // Check for explicit API URL first
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    if (!envUrl.startsWith("http://") && !envUrl.startsWith("https://")) {
      return `https://${envUrl}`;
    }
    return envUrl;
  }
  
  // Default to Supabase Edge Function in production
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (supabaseUrl) {
    return `${supabaseUrl}/functions/v1/api`;
  }
  
  // Fallback to localhost for development
  return "http://localhost:12022";
};

const BASE_URL = getBaseUrl();

// Supabase anon key for Edge Function authentication
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Check if we're using Supabase Edge Functions
const isSupabaseEdgeFunction = BASE_URL.includes('supabase.co/functions');

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
  
  // Add Supabase apikey header for Edge Functions
  if (isSupabaseEdgeFunction && SUPABASE_ANON_KEY) {
    headers['apikey'] = SUPABASE_ANON_KEY;
  }
  
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function buildBody(data: any, cryptoKey?: CryptoKey): Promise<string> {
  if (!cryptoKey) return JSON.stringify(data);
  const encrypted = await encryptString(JSON.stringify(data), cryptoKey);
  return JSON.stringify({ payload: encrypted.ciphertext, iv: encrypted.iv });
}

export async function signup(username: string, password: string, encryptionSalt: string, recoveryKeyHash: string): Promise<LoginResponse> {
  return request<LoginResponse>("/auth/signup", { method: "POST", body: JSON.stringify({ username, password, encryptionSalt, recoveryKeyHash }) });
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  return request<LoginResponse>("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) });
}

export async function fetchSalt(username: string): Promise<{ encryption_salt: string }> {
  return request<{ encryption_salt: string }>(`/auth/salt/${encodeURIComponent(username)}`, { method: "GET" });
}

export async function fetchDashboard(token: string, asOf?: string) {
  const query = asOf ? `?today=${encodeURIComponent(asOf)}` : "";
  return request<{ data: any }>(`/dashboard${query}`, { method: "GET" }, token);
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

export async function sendInvite(token: string, payload: { username: string; role: "editor" | "viewer"; merge_finances?: boolean }) {
  // Map frontend 'username' field to backend 'email_or_username' field
  const requestData = {
    email_or_username: payload.username,
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

export async function fetchCreditCards(token: string) {
  // #region agent log
  const result = await request<{ data: any[] }>("/debts/credit-cards", { method: "GET" }, token);
  console.log('[DEBUG_CREDIT_CARD]', JSON.stringify({location:'api.ts:fetchCreditCards',message:'Credit cards fetched from API',data:{count:result?.data?.length||0,firstCard:result?.data?.[0]||null,allCards:result?.data||[]},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1,H2'}));
  // #endregion
  return result;
}

// v1.2: Updated to include billingDate
export async function createCreditCard(token: string, payload: { name: string; billAmount?: number; paidAmount?: number; dueDate: string; billingDate?: number }) {
  return request<{ data: any }>("/debts/credit-cards", { method: "POST", body: JSON.stringify(payload) }, token);
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

export async function fetchLoans(token: string) {
  return request<{ data: any[] }>("/debts/loans", { method: "GET" }, token);
}

export async function fetchActivity(token: string) {
  return request<{ data: any[] }>("/activity", { method: "GET" }, token);
}

export async function fetchAlerts(token: string) {
  return request<{ data: any[] }>("/alerts", { method: "GET" }, token);
}

export async function fetchThemeState(token: string) {
  return request<{ data: any }>("/themes/state", { method: "GET" }, token);
}

export async function updateThemeState(token: string, payload: { mode?: "health_auto" | "manual"; selected_theme?: "thunderstorms" | "reddish_dark_knight" | "green_zone"; constraint_tier_effect?: boolean }) {
  return request<{ data: any }>("/themes/state", { method: "PATCH", body: JSON.stringify(payload) }, token);
}

export async function createFixedExpense(token: string, payload: { name: string; amount: number; frequency: string; category: string; start_date?: string; end_date?: string; is_sip_flag?: boolean }) {
  return request<{ data: any }>("/planning/fixed-expenses", { method: "POST", body: JSON.stringify(payload) }, token);
}

export async function updateFixedExpense(token: string, id: string, payload: { name?: string; amount?: number; frequency?: string; category?: string; start_date?: string; end_date?: string; is_sip_flag?: boolean }) {
  return request<{ data: any }>(`/planning/fixed-expenses/${id}`, { method: "PUT", body: JSON.stringify(payload) }, token);
}

export async function deleteFixedExpense(token: string, id: string) {
  return request<{ data: any }>(`/planning/fixed-expenses/${id}`, { method: "DELETE" }, token);
}

export async function createVariableExpensePlan(token: string, payload: { name: string; planned: number; category: string; start_date: string; end_date?: string }) {
  return request<{ data: any }>("/planning/variable-expenses", { method: "POST", body: JSON.stringify(payload) }, token);
}

export async function updateVariableExpensePlan(token: string, id: string, payload: { name?: string; planned?: number; category?: string; start_date?: string; end_date?: string }) {
  return request<{ data: any }>(`/planning/variable-expenses/${id}`, { method: "PUT", body: JSON.stringify(payload) }, token);
}

export async function deleteVariableExpensePlan(token: string, id: string) {
  return request<{ data: any }>(`/planning/variable-expenses/${id}`, { method: "DELETE" }, token);
}

export async function updateIncome(token: string, id: string, payload: { source?: string; amount?: number; frequency?: string }) {
  return request<{ data: any }>(`/planning/income/${id}`, { method: "PUT", body: JSON.stringify(payload) }, token);
}

export async function deleteIncome(token: string, id: string) {
  return request<{ data: any }>(`/planning/income/${id}`, { method: "DELETE" }, token);
}

// Investments
export async function createInvestment(token: string, payload: { name: string; goal: string; monthlyAmount: number; status: string }) {
  return request<{ data: any }>("/investments", { method: "POST", body: JSON.stringify(payload) }, token);
}

export async function updateInvestment(token: string, id: string, payload: { name?: string; goal?: string; monthlyAmount?: number; status?: string }) {
  return request<{ data: any }>(`/investments/${id}`, { method: "PATCH", body: JSON.stringify(payload) }, token);
}

export async function deleteInvestment(token: string, id: string) {
  return request<{ data: { deleted: boolean } }>(`/investments/${id}`, { method: "DELETE" }, token);
}

export async function pauseInvestment(token: string, id: string) {
  return request<{ data: any }>(`/investments/${id}/pause`, { method: "POST" }, token);
}

export async function resumeInvestment(token: string, id: string) {
  return request<{ data: any }>(`/investments/${id}/resume`, { method: "POST" }, token);
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

// Health details
export async function fetchHealthDetails(token: string, asOf?: string) {
  const query = asOf ? `?today=${encodeURIComponent(asOf)}` : "";
  return request<{ data: any }>(`/health/details${query}`, { method: "GET" }, token);
}
