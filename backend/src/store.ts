import { randomUUID } from "crypto";
import * as fs from "fs";
import * as path from "path";
import {
  ConstraintScore,
  FixedExpense,
  Income,
  Store,
  Investment,
  FutureBomb,
  SharedAccount,
  SharedMember,
  SharingRequest,
  CreditCard,
  Loan,
  Activity,
  VariableExpenseActual,
  VariableExpensePlan,
  ThemeState,
  defaultStore
} from "./mockData";
import { loadFixtures } from "./fixtures";

// Data persistence file path
const DATA_FILE = path.join(__dirname, "../../data/finflow-data.json");

// Load state from disk on startup
function loadStateFromDisk(): Store {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, "utf-8");
      console.log("📂 Loading persisted data from disk...");
      const loadedState = JSON.parse(data);
      console.log(`✅ Loaded data: ${loadedState.users.length} users, ${loadedState.fixedExpenses.length} fixed expenses`);
      return loadedState;
    }
  } catch (error) {
    console.error("⚠️  Error loading persisted data:", error);
  }
  console.log("📝 No persisted data found, starting with default store");
  return structuredClone(defaultStore);
}

// Save state to disk
function saveStateToDisk() {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), "utf-8");
    console.log("💾 Data persisted to disk");
  } catch (error) {
    console.error("⚠️  Error saving data to disk:", error);
  }
}

// Auto-save with debouncing to avoid excessive writes
let saveTimeout: NodeJS.Timeout | null = null;
function scheduleSave() {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  saveTimeout = setTimeout(() => {
    saveStateToDisk();
    saveTimeout = null;
  }, 1000); // Save 1 second after last change
}

let state: Store = loadStateFromDisk();

export function resetStore() {
  const currentUsers = state.users;
  const currentConstraint = state.constraint;
  state = structuredClone(defaultStore);
  // For unit tests: clear users to allow clean test runs
  // For functional tests: preserve users to keep tokens valid
  // This is a compromise - functional tests should re-authenticate after resetStore()
  state.users = [];
  // Preserve constraint if it exists (for functional tests)
  if (currentConstraint && currentUsers.length > 0) {
    state.constraint = currentConstraint;
  }
  scheduleSave(); // Persist reset
}

export function loadFixtureStore() {
  const currentUsers = state.users;
  const currentConstraint = state.constraint;
  state = loadFixtures();
  // Preserve signed-up users and current constraint state
  state.users = currentUsers.length ? currentUsers : state.users;
  state.constraint = currentConstraint;
  state.sharedAccounts = [];
  state.sharedMembers = [];
  state.sharingRequests = [];
}

export function getStore(): Store {
  return state;
}

// Export save function for manual saves
export function saveState() {
  saveStateToDisk();
}

// Export schedule save for mutation functions
export { scheduleSave };

// User management
export function createUser(username: string, passwordHash: string) {
  const existing = state.users.find(u => u.username === username);
  if (existing) {
    throw new Error("Username already exists");
  }
  const user = { id: randomUUID(), username, passwordHash, createdAt: new Date().toISOString(), failedLoginAttempts: 0, accountLockedUntil: null };
  state.users.push(user);
  scheduleSave();
  return user;
}

export function getUserByUsername(username: string) {
  return state.users.find(u => u.username === username);
}

export function getUserById(userId: string) {
  return state.users.find(u => u.id === userId);
}

export function updateUserPassword(userId: string, newPasswordHash: string) {
  const user = state.users.find(u => u.id === userId);
  if (!user) throw new Error("User not found");
  user.passwordHash = newPasswordHash;
  scheduleSave();
}

export function findUserByUsername(username: string) {
  return state.users.find(u => u.username === username);
}

export function addIncome(userId: string, data: Omit<Income, "id" | "userId">): Income {
  const income = { ...data, id: randomUUID(), userId };
  state.incomes.push(income);
  scheduleSave();
  return income;
}

export function updateIncome(id: string, data: Partial<Omit<Income, "id">>): Income | undefined {
  const idx = state.incomes.findIndex((i) => i.id === id);
  if (idx === -1) return undefined;
  state.incomes[idx] = { ...state.incomes[idx], ...data };
  scheduleSave();
  return state.incomes[idx];
}

export function deleteIncome(userId: string, id: string): boolean {
  const prev = state.incomes.length;
  state.incomes = state.incomes.filter((i) => i.id !== id || i.userId !== userId);
  const deleted = state.incomes.length < prev;
  if (deleted) scheduleSave();
  return deleted;
}

export function addFixedExpense(userId: string, data: Omit<FixedExpense, "id" | "userId">): FixedExpense {
  const exp = { ...data, id: randomUUID(), userId };
  state.fixedExpenses.push(exp);
  scheduleSave();
  return exp;
}

export function updateFixedExpense(id: string, data: Partial<Omit<FixedExpense, "id">>): FixedExpense | undefined {
  const idx = state.fixedExpenses.findIndex((f) => f.id === id);
  if (idx === -1) return undefined;
  state.fixedExpenses[idx] = { ...state.fixedExpenses[idx], ...data };
  scheduleSave();
  return state.fixedExpenses[idx];
}

export function deleteFixedExpense(userId: string, id: string): boolean {
  const prev = state.fixedExpenses.length;
  state.fixedExpenses = state.fixedExpenses.filter((f) => f.id !== id || f.userId !== userId);
  const deleted = state.fixedExpenses.length < prev;
  if (deleted) scheduleSave();
  return deleted;
}

export function addVariablePlan(userId: string, data: Omit<VariableExpensePlan, "id" | "userId">): VariableExpensePlan {
  const plan = { ...data, id: randomUUID(), userId };
  state.variablePlans.push(plan);
  scheduleSave();  // FIX: Save data to persist across deploys
  return plan;
}

export function updateVariablePlan(
  id: string,
  data: Partial<Omit<VariableExpensePlan, "id">>
): VariableExpensePlan | undefined {
  const idx = state.variablePlans.findIndex((v) => v.id === id);
  if (idx === -1) return undefined;
  state.variablePlans[idx] = { ...state.variablePlans[idx], ...data };
  scheduleSave();  // FIX: Save data to persist across deploys
  return state.variablePlans[idx];
}

export function deleteVariablePlan(userId: string, id: string): boolean {
  const prev = state.variablePlans.length;
  state.variablePlans = state.variablePlans.filter((v) => v.id !== id || v.userId !== userId);
  const deleted = state.variablePlans.length < prev;
  state.variableActuals = state.variableActuals.filter((a) => a.planId !== id);
  if (deleted) scheduleSave();  // FIX: Save data to persist across deploys
  return deleted;
}

// v1.2: User subcategories storage
const userSubcategories = new Map<string, string[]>();

export function getUserSubcategories(userId: string): string[] {
  if (!userSubcategories.has(userId)) {
    userSubcategories.set(userId, ["Unspecified"]);
  }
  return userSubcategories.get(userId)!;
}

export function addUserSubcategory(userId: string, subcategory: string): void {
  const subs = getUserSubcategories(userId);
  if (!subs.includes(subcategory) && subcategory.trim() !== "") {
    subs.push(subcategory.trim());
    scheduleSave();
  }
}

export function addVariableActual(userId: string, data: Omit<VariableExpenseActual, "id" | "userId">): VariableExpenseActual {
  // v1.2: Set default subcategory if not provided
  const subcategory = data.subcategory || "Unspecified";
  
  const actual: VariableExpenseActual = { 
    ...data, 
    id: randomUUID(), 
    userId,
    subcategory,
    // Ensure paymentMode is set (required field)
    paymentMode: data.paymentMode || "Cash"
  };
  
  state.variableActuals.push(actual);
  
  // v1.2: If payment mode is CreditCard, update credit card's currentExpenses
  if (actual.paymentMode === "CreditCard" && actual.creditCardId) {
    const card = state.creditCards.find(c => c.id === actual.creditCardId && c.userId === userId);
    if (card) {
      card.currentExpenses = (card.currentExpenses || 0) + actual.amount;
      scheduleSave();
    }
  }
  
  // v1.2: If new subcategory, add to user's subcategories
  if (subcategory && subcategory !== "Unspecified") {
    addUserSubcategory(userId, subcategory);
  }
  
  scheduleSave();
  return actual;
}

export function addInvestment(userId: string, data: Omit<Investment, "id" | "userId">): Investment {
  const inv = { ...data, id: randomUUID(), userId };
  state.investments.push(inv);
  return inv;
}

export function updateInvestment(id: string, data: Partial<Omit<Investment, "id">>): Investment | undefined {
  const idx = state.investments.findIndex((i) => i.id === id);
  if (idx === -1) return undefined;
  state.investments[idx] = { ...state.investments[idx], ...data };
  return state.investments[idx];
}

export function addFutureBomb(userId: string, data: Omit<FutureBomb, "id" | "userId" | "preparednessRatio" | "monthlyEquivalent">): FutureBomb {
  const months = monthsUntil(data.dueDate);
  const monthlyEquivalent = data.totalAmount / months;
  const fb: FutureBomb = {
    ...data,
    id: randomUUID(),
    userId,
    monthlyEquivalent,
    preparednessRatio: data.totalAmount === 0 ? 0 : data.savedAmount / data.totalAmount
  };
  state.futureBombs.push(fb);
  return fb;
}

export function updateFutureBomb(
  id: string,
  data: Partial<Omit<FutureBomb, "id" | "monthlyEquivalent" | "preparednessRatio">>
): FutureBomb | undefined {
  const idx = state.futureBombs.findIndex((f) => f.id === id);
  if (idx === -1) return undefined;
  const existing = state.futureBombs[idx];
  const next = { ...existing, ...data };
  const months = monthsUntil(next.dueDate);
  next.monthlyEquivalent = next.totalAmount / months;
  next.preparednessRatio = next.totalAmount === 0 ? 0 : next.savedAmount / next.totalAmount;
  state.futureBombs[idx] = next;
  return next;
}

function monthsUntil(date: string): number {
  const now = new Date();
  const due = new Date(date);
  const months = (due.getUTCFullYear() - now.getUTCFullYear()) * 12 + (due.getUTCMonth() - now.getUTCMonth());
  return Math.max(months, 1);
}

// User-scoped constraint scores
const userConstraints = new Map<string, ConstraintScore>();

const defaultConstraint: ConstraintScore = {
  score: 0,
  tier: "green",
  recentOverspends: 0,
  decayAppliedAt: new Date().toISOString()
};

export function getConstraint(userId: string): ConstraintScore {
  if (!userConstraints.has(userId)) {
    userConstraints.set(userId, { ...defaultConstraint });
  }
  return userConstraints.get(userId)!;
}

export function setConstraint(userId: string, next: ConstraintScore) {
  userConstraints.set(userId, next);
}

export function createSharingRequest(inviterId: string, inviteeUsername: string, role: "editor" | "viewer", mergeFinances: boolean): SharingRequest {
  const req: SharingRequest = {
    id: randomUUID(),
    inviterId,
    inviteeEmail: inviteeUsername, // Using username, field name kept for compatibility
    role,
    mergeFinances,
    status: "pending"
  };
  state.sharingRequests.push(req);
  return req;
}

export function listRequestsForUser(userId: string, username: string) {
  return {
    outgoing: state.sharingRequests.filter((r) => r.inviterId === userId),
    incoming: state.sharingRequests.filter((r) => r.inviteeEmail === username) // Field name kept for compatibility
  };
}

export function approveRequest(reqId: string, approverUsername: string): { sharedAccount: SharedAccount; members: SharedMember[] } | undefined {
  const reqIndex = state.sharingRequests.findIndex((r) => r.id === reqId);
  if (reqIndex === -1) return undefined;

  const req = state.sharingRequests[reqIndex];
  if (req.status !== "pending" || req.inviteeEmail !== approverUsername) return undefined;

  req.status = "approved";
  const inviter = state.users.find((u) => u.id === req.inviterId);
  const invitee = state.users.find((u) => u.username === req.inviteeEmail);
  if (!inviter || !invitee) return undefined;

  const sharedAccount: SharedAccount = { id: randomUUID(), name: `Shared-${inviter.username}-${invitee.username}` };
  state.sharedAccounts.push(sharedAccount);

  const owner: SharedMember = {
    id: randomUUID(),
    sharedAccountId: sharedAccount.id,
    userId: inviter.id,
    role: "owner",
    mergeFinances: true  // Always merge finances
  };
  const member: SharedMember = {
    id: randomUUID(),
    sharedAccountId: sharedAccount.id,
    userId: invitee.id,
    role: "editor",  // Changed from req.role - always editor for merged finances
    mergeFinances: true  // Always merge finances
  };
  state.sharedMembers.push(owner, member);

  // CRITICAL FIX: Remove the request after approval
  state.sharingRequests.splice(reqIndex, 1);
  scheduleSave();

  return { sharedAccount, members: [owner, member] };
}

export function rejectRequest(reqId: string): boolean {
  const reqIndex = state.sharingRequests.findIndex((r) => r.id === reqId);
  if (reqIndex === -1) return false;

  const req = state.sharingRequests[reqIndex];
  if (req.status !== "pending") return false;

  // CRITICAL FIX: Remove the request after rejection
  state.sharingRequests.splice(reqIndex, 1);
  scheduleSave();

  return true;
}

export function listMembers(userId: string) {
  return state.sharedMembers.filter((m) => m.userId === userId);
}

export function listSharedAccountsFor(userId: string) {
  const memberEntries = state.sharedMembers.filter((m) => m.userId === userId);
  const ids = new Set(memberEntries.map((m) => m.sharedAccountId));
  return state.sharedAccounts.filter((sa) => ids.has(sa.id));
}

export function removeMember(sharedMemberId: string, requesterId: string): boolean {
  // Only owner of the same shared account may remove others
  const member = state.sharedMembers.find((m) => m.id === sharedMemberId);
  if (!member) return false;
  const owner = state.sharedMembers.find((m) => m.sharedAccountId === member.sharedAccountId && m.role === "owner" && m.userId === requesterId);
  if (!owner) return false;
  state.sharedMembers = state.sharedMembers.filter((m) => m.id !== sharedMemberId);
  return true;
}

export function listCreditCards() {
  return state.creditCards;
}

export function addCreditCard(userId: string, data: Omit<CreditCard, "id" | "userId" | "paidAmount">): CreditCard {
  const card: CreditCard = { 
    ...data, 
    id: randomUUID(), 
    userId, 
    paidAmount: 0,
    statementDate: data.statementDate || new Date().toISOString().split('T')[0],
    // v1.2: Initialize new fields with defaults
    currentExpenses: data.currentExpenses || 0,
    billingDate: data.billingDate || 1,  // Default to 1st of month
    needsBillUpdate: data.needsBillUpdate || false
  };
  state.creditCards.push(card);
  scheduleSave();
  return card;
}

export function payCreditCard(id: string, amount: number): CreditCard | undefined {
  const card = state.creditCards.find((c) => c.id === id);
  if (!card) return undefined;
  card.paidAmount += amount;
  scheduleSave();
  return card;
}

export function deleteCreditCard(userId: string, id: string): boolean {
  const prev = state.creditCards.length;
  state.creditCards = state.creditCards.filter((c) => c.id !== id || c.userId !== userId);
  const deleted = state.creditCards.length < prev;
  if (deleted) scheduleSave();
  return deleted;
}

// v1.2: Reset credit card current expenses (prepare for billing)
// NOTE: Does NOT auto-update billAmount - user must manually update bill
// This allows for additional charges (fees, friend's usage) or redemptions
export function resetCreditCardCurrentExpenses(cardId: string, userId: string): CreditCard | undefined {
  const card = state.creditCards.find(c => c.id === cardId && c.userId === userId);
  if (!card) return undefined;
  
  // Only reset currentExpenses to 0, don't touch billAmount
  // User will manually update billAmount with actual bill amount
  card.currentExpenses = 0;
  card.statementDate = new Date().toISOString().split('T')[0];
  
  // Calculate new due date (billingDate + payment terms, e.g., 20 days)
  const billingDate = new Date(card.statementDate);
  billingDate.setDate(billingDate.getDate() + 20); // 20 days payment window
  card.dueDate = billingDate.toISOString().split('T')[0];
  
  // Mark card as needing bill update
  card.needsBillUpdate = true;
  
  scheduleSave();
  return card;
}

// v1.2: Check and return alerts for billing dates
export function checkAndAlertBillingDates(today: Date): Array<{ cardId: string; cardName: string; message: string }> {
  const alerts: Array<{ cardId: string; cardName: string; message: string }> = [];
  
  state.creditCards.forEach(card => {
    const todayDay = today.getDate();
    const billingDate = card.billingDate || 1;
    
    // Alert if billing date arrived and currentExpenses > 0
    if (todayDay === billingDate && (card.currentExpenses || 0) > 0) {
      alerts.push({
        cardId: card.id,
        cardName: card.name,
        message: `${card.name}: ₹${(card.currentExpenses || 0).toLocaleString("en-IN")} pending billing. Please reset and update bill.`
      });
    }
    
    // Alert if card needs bill update
    if (card.needsBillUpdate) {
      alerts.push({
        cardId: card.id,
        cardName: card.name,
        message: `${card.name}: Bill needs to be updated with actual amount.`
      });
    }
  });
  
  return alerts;
}

export function listLoans(userId?: string) {
  // Auto-fetch loans from fixed expenses with category "Loan" (case-insensitive)
  const loanExpenses = state.fixedExpenses.filter(
    (exp) => {
      const matchesCategory = exp.category?.toLowerCase() === "loan";
      if (userId) {
        return matchesCategory && exp.userId === userId;
      }
      return matchesCategory;
    }
  );

  // Convert fixed expenses to loan format
  const autoLoans = loanExpenses.map((exp) => {
    const emi = exp.frequency === "monthly" ? exp.amount :
      exp.frequency === "quarterly" ? exp.amount / 3 :
        exp.amount / 12;

    const remainingMonths = exp.endDate ? Math.max(1, Math.ceil(
      (new Date(exp.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 30)
    )) : 12;

    return {
      id: exp.id,
      name: exp.name,
      emi: emi || 0,
      remainingTenureMonths: remainingMonths,
      principal: (emi || 0) * remainingMonths
    };
  });

  // Merge with manually added loans
  return [...state.loans, ...autoLoans];
}

export function addActivity(actorId: string, entity: string, action: string, payload?: any) {
  const act: Activity = { id: randomUUID(), actorId, entity, action, payload, createdAt: new Date().toISOString() };
  state.activities.push(act);
  return act;
}

export function listActivities() {
  return state.activities;
}

export function getThemeState(userId: string): ThemeState {
  let theme = state.themeStates.find((t) => t.ownerRef === userId);
  if (!theme) {
    theme = {
      id: randomUUID(),
      ownerRef: userId,
      mode: "health_auto",
      constraintTierEffect: true
    };
    state.themeStates.push(theme);
  }
  return theme;
}

export function updateThemeState(userId: string, updates: Partial<Omit<ThemeState, "id" | "ownerRef">>): ThemeState {
  let theme = state.themeStates.find((t) => t.ownerRef === userId);
  if (!theme) {
    theme = {
      id: randomUUID(),
      ownerRef: userId,
      mode: "health_auto",
      constraintTierEffect: true
    };
    state.themeStates.push(theme);
  }
  if (updates.mode !== undefined) theme.mode = updates.mode;
  if (updates.selectedTheme !== undefined) theme.selectedTheme = updates.selectedTheme;
  if (updates.constraintTierEffect !== undefined) theme.constraintTierEffect = updates.constraintTierEffect;
  return theme;
}

