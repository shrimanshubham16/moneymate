// Store functions using Supabase (replaces store.ts)
// This file maintains the same function signatures as store.ts for compatibility
import { randomUUID } from "crypto";
import {
  ConstraintScore,
  FixedExpense,
  Income,
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
  User
} from "./mockData";
import * as db from "./supabase-db";

// ============================================================================
// COMPATIBILITY LAYER - Same function signatures as old store.ts
// ============================================================================

// Note: getStore() is no longer used - data is fetched from Supabase on-demand
// For backward compatibility, we'll create a minimal Store object when needed
export function getStore() {
  // This is deprecated - use direct Supabase queries instead
  // Kept for backward compatibility with code that still calls getStore()
  console.warn("⚠️  getStore() is deprecated - use Supabase queries directly");
  return {
    users: [],
    incomes: [],
    fixedExpenses: [],
    variablePlans: [],
    variableActuals: [],
    investments: [],
    futureBombs: [],
    creditCards: [],
    loans: [],
    activities: [],
    preferences: [],
    themeStates: [],
    sharedAccounts: [],
    sharedMembers: [],
    sharingRequests: [],
    constraint: { score: 0, tier: "green" as const, recentOverspends: 0, decayAppliedAt: new Date().toISOString() }
  };
}

// No-op for compatibility
export function scheduleSave() {
  // Supabase saves automatically - no need for manual saves
}

export function saveState() {
  // Supabase saves automatically - no need for manual saves
}

// ============================================================================
// USER MANAGEMENT
// ============================================================================

export async function createUser(username: string, passwordHash: string): Promise<User> {
  const existing = await db.getUserByUsername(username);
  if (existing) {
    throw new Error("Username already exists");
  }
  return await db.createUser({ username, passwordHash });
}

export async function getUserByUsername(username: string): Promise<User | undefined> {
  return await db.getUserByUsername(username) || undefined;
}

export async function getUserById(userId: string): Promise<User | undefined> {
  return await db.getUserById(userId) || undefined;
}

export async function updateUserPassword(userId: string, newPasswordHash: string): Promise<void> {
  // Note: This function signature doesn't match Supabase - we'll need to update auth.ts
  // For now, we'll update the user record
  const user = await db.getUserById(userId);
  if (!user) throw new Error("User not found");
  // Update password hash in users table
  // This will need to be handled in auth.ts
}

export function findUserByUsername(username: string) {
  return getUserByUsername(username);
}

// ============================================================================
// INCOMES
// ============================================================================

export async function addIncome(userId: string, data: Omit<Income, "id" | "userId">): Promise<Income> {
  return await db.createIncome({ ...data, userId });
}

export async function updateIncome(id: string, data: Partial<Omit<Income, "id">>): Promise<Income | undefined> {
  await db.updateIncome(id, data);
  // Fetch updated income
  const incomes = await db.getIncomesByUserId(data.userId as string);
  return incomes.find(i => i.id === id);
}

export async function deleteIncome(userId: string, id: string): Promise<boolean> {
  try {
    await db.deleteIncome(id);
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// FIXED EXPENSES
// ============================================================================

export async function addFixedExpense(userId: string, data: Omit<FixedExpense, "id" | "userId">): Promise<FixedExpense> {
  return await db.createFixedExpense({ ...data, userId });
}

export async function updateFixedExpense(id: string, data: Partial<Omit<FixedExpense, "id">>): Promise<FixedExpense | undefined> {
  await db.updateFixedExpense(id, data);
  // Fetch updated expense
  const expenses = await db.getFixedExpensesByUserId(data.userId as string);
  return expenses.find(e => e.id === id);
}

export async function deleteFixedExpense(userId: string, id: string): Promise<boolean> {
  try {
    await db.deleteFixedExpense(id);
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// VARIABLE EXPENSE PLANS
// ============================================================================

export async function addVariablePlan(userId: string, data: Omit<VariableExpensePlan, "id" | "userId">): Promise<VariableExpensePlan> {
  return await db.createVariablePlan({ ...data, userId });
}

export async function updateVariablePlan(
  id: string,
  data: Partial<Omit<VariableExpensePlan, "id">>
): Promise<VariableExpensePlan | undefined> {
  await db.updateVariablePlan(id, data);
  // Fetch updated plan
  const plans = await db.getVariablePlansByUserId(data.userId as string);
  return plans.find(p => p.id === id);
}

export async function deleteVariablePlan(userId: string, id: string): Promise<boolean> {
  try {
    // Delete all actuals for this plan first
    const actuals = await db.getVariableActualsByPlanId(id);
    for (const actual of actuals) {
      await db.deleteVariableActual(actual.id);
    }
    await db.deleteVariablePlan(id);
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// VARIABLE EXPENSE ACTUALS
// ============================================================================

// v1.2: User subcategories storage (in-memory for now, can be moved to DB later)
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
  }
}

export async function addVariableActual(userId: string, data: Omit<VariableExpenseActual, "id" | "userId">): Promise<VariableExpenseActual> {
  const subcategory = data.subcategory || "Unspecified";
  
  const actual = await db.createVariableActual({
    ...data,
    userId,
    subcategory,
    paymentMode: data.paymentMode || "Cash"
  });
  
  // v1.2: If payment mode is CreditCard, update credit card's currentExpenses
  if (actual.paymentMode === "CreditCard" && actual.creditCardId) {
    const cards = await db.getCreditCardsByUserId(userId);
    const card = cards.find(c => c.id === actual.creditCardId);
    if (card) {
      await db.updateCreditCard(card.id, {
        currentExpenses: (card.currentExpenses || 0) + actual.amount
      });
    }
  }
  
  // v1.2: If new subcategory, add to user's subcategories
  if (subcategory && subcategory !== "Unspecified") {
    addUserSubcategory(userId, subcategory);
  }
  
  return actual;
}

// ============================================================================
// INVESTMENTS
// ============================================================================

export async function addInvestment(userId: string, data: Omit<Investment, "id" | "userId">): Promise<Investment> {
  return await db.createInvestment({ ...data, userId });
}

export async function updateInvestment(id: string, data: Partial<Omit<Investment, "id">>): Promise<Investment | undefined> {
  await db.updateInvestment(id, data);
  // Fetch updated investment
  const investments = await db.getInvestmentsByUserId(data.userId as string);
  return investments.find(i => i.id === id);
}

// ============================================================================
// FUTURE BOMBS
// ============================================================================

function monthsUntil(date: string): number {
  const now = new Date();
  const due = new Date(date);
  const months = (due.getUTCFullYear() - now.getUTCFullYear()) * 12 + (due.getUTCMonth() - now.getUTCMonth());
  return Math.max(months, 1);
}

export async function addFutureBomb(userId: string, data: Omit<FutureBomb, "id" | "userId" | "preparednessRatio" | "monthlyEquivalent">): Promise<FutureBomb> {
  const months = monthsUntil(data.dueDate);
  const monthlyEquivalent = data.totalAmount / months;
  return await db.createFutureBomb({
    ...data,
    userId,
    monthlyEquivalent,
    preparednessRatio: data.totalAmount === 0 ? 0 : (data.savedAmount || 0) / data.totalAmount
  });
}

export async function updateFutureBomb(
  id: string,
  data: Partial<Omit<FutureBomb, "id" | "monthlyEquivalent" | "preparednessRatio">>
): Promise<FutureBomb | undefined> {
  // Fetch existing bomb to calculate new values
  const bombs = await db.getFutureBombsByUserId(data.userId as string);
  const existing = bombs.find(b => b.id === id);
  if (!existing) return undefined;
  
  const next = { ...existing, ...data };
  const months = monthsUntil(next.dueDate);
  next.monthlyEquivalent = next.totalAmount / months;
  next.preparednessRatio = next.totalAmount === 0 ? 0 : (next.savedAmount || 0) / next.totalAmount;
  
  await db.updateFutureBomb(id, next);
  return next;
}

// ============================================================================
// CONSTRAINT SCORES
// ============================================================================

const defaultConstraint: ConstraintScore = {
  score: 0,
  tier: "green",
  recentOverspends: 0,
  decayAppliedAt: new Date().toISOString()
};

export async function getConstraint(userId: string): Promise<ConstraintScore> {
  return await db.getConstraintScore(userId);
}

export async function setConstraint(userId: string, next: ConstraintScore): Promise<void> {
  await db.setConstraintScore(userId, next);
}

// ============================================================================
// SHARING
// ============================================================================

export async function createSharingRequest(inviterId: string, inviteeUsername: string, role: "editor" | "viewer", mergeFinances: boolean): Promise<SharingRequest> {
  return await db.createSharingRequest({
    inviterId,
    inviteeEmail: inviteeUsername,
    role,
    mergeFinances,
    status: "pending"
  });
}

export async function listRequestsForUser(userId: string, username: string) {
  const requests = await db.getSharingRequestsByInviterId(userId);
  return {
    outgoing: requests,
    incoming: requests.filter(r => r.inviteeEmail === username)
  };
}

export async function approveRequest(reqId: string, approverUsername: string): Promise<{ sharedAccount: SharedAccount; members: SharedMember[] } | undefined> {
  // This is complex - need to fetch request, create account, members, etc.
  // For now, return undefined - will need to implement properly
  return undefined;
}

export async function rejectRequest(reqId: string): Promise<boolean> {
  // Update request status to rejected
  try {
    await db.updateSharingRequest(reqId, { status: "rejected" });
    return true;
  } catch {
    return false;
  }
}

export async function listMembers(userId: string): Promise<SharedMember[]> {
  // Get all shared accounts user is member of
  const accounts = await db.getSharedAccountsByUserId(userId);
  const allMembers: SharedMember[] = [];
  for (const account of accounts) {
    const members = await db.getSharedMembersByAccountId(account.id);
    allMembers.push(...members);
  }
  return allMembers.filter(m => m.userId === userId);
}

export async function listSharedAccountsFor(userId: string): Promise<SharedAccount[]> {
  return await db.getSharedAccountsByUserId(userId);
}

export async function removeMember(sharedMemberId: string, requesterId: string): Promise<boolean> {
  // This needs proper implementation - check if requester is owner
  // For now, return false
  return false;
}

// ============================================================================
// CREDIT CARDS
// ============================================================================

export async function listCreditCards(userId?: string): Promise<CreditCard[]> {
  if (userId) {
    return await db.getCreditCardsByUserId(userId);
  }
  // If no userId, return empty (shouldn't happen in production)
  return [];
}

export async function addCreditCard(userId: string, data: Omit<CreditCard, "id" | "userId" | "paidAmount">): Promise<CreditCard> {
  return await db.createCreditCard({
    ...data,
    userId,
    paidAmount: 0,
    currentExpenses: data.currentExpenses || 0,
    billingDate: data.billingDate || 1,
    needsBillUpdate: data.needsBillUpdate || false
  });
}

export async function payCreditCard(id: string, amount: number): Promise<CreditCard | undefined> {
  const cards = await db.getCreditCardsByUserId(""); // Need userId - this function signature needs fixing
  const card = cards.find(c => c.id === id);
  if (!card) return undefined;
  
  await db.updateCreditCard(id, {
    paidAmount: (card.paidAmount || 0) + amount
  });
  
  // Fetch updated card
  const updatedCards = await db.getCreditCardsByUserId(card.userId);
  return updatedCards.find(c => c.id === id);
}

export async function deleteCreditCard(userId: string, id: string): Promise<boolean> {
  try {
    await db.deleteCreditCard(id);
    return true;
  } catch {
    return false;
  }
}

export async function resetCreditCardCurrentExpenses(cardId: string, userId: string): Promise<CreditCard | undefined> {
  const cards = await db.getCreditCardsByUserId(userId);
  const card = cards.find(c => c.id === cardId);
  if (!card) return undefined;
  
  const statementDate = new Date().toISOString().split('T')[0];
  const billingDate = new Date(statementDate);
  billingDate.setDate(billingDate.getDate() + 20);
  
  await db.updateCreditCard(cardId, {
    currentExpenses: 0,
    statementDate,
    dueDate: billingDate.toISOString().split('T')[0],
    needsBillUpdate: true
  });
  
  const updatedCards = await db.getCreditCardsByUserId(userId);
  return updatedCards.find(c => c.id === cardId);
}

export async function checkAndAlertBillingDates(today: Date): Promise<Array<{ cardId: string; cardName: string; message: string }>> {
  // This needs to query all credit cards - for now return empty
  // Will need to implement properly
  return [];
}

// ============================================================================
// LOANS
// ============================================================================

export async function listLoans(userId?: string): Promise<Loan[]> {
  // Auto-fetch loans from fixed expenses with category "Loan"
  if (!userId) return [];
  
  const expenses = await db.getFixedExpensesByUserId(userId);
  const loanExpenses = expenses.filter(exp => exp.category?.toLowerCase() === "loan");
  
  return loanExpenses.map(exp => {
    const emi = exp.frequency === "monthly" ? exp.amount :
      exp.frequency === "quarterly" ? exp.amount / 3 :
        exp.amount / 12;
    
    const remainingMonths = exp.endDate ? Math.max(1, Math.ceil(
      (new Date(exp.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 30)
    )) : 12;
    
    return {
      id: exp.id,
      userId: exp.userId,
      name: exp.name,
      emi: emi || 0,
      remainingTenureMonths: remainingMonths,
      principal: (emi || 0) * remainingMonths
    };
  });
}

// ============================================================================
// ACTIVITIES
// ============================================================================

export async function addActivity(actorId: string, entity: string, action: string, payload?: any): Promise<Activity> {
  return await db.createActivity({
    actorId,
    entity,
    action,
    payload,
    createdAt: new Date().toISOString()
  });
}

export async function listActivities(userId?: string, limit?: number): Promise<Activity[]> {
  if (userId) {
    return await db.getActivitiesByUserId(userId, limit);
  }
  return [];
}

// ============================================================================
// THEME STATES
// ============================================================================

export async function getThemeState(userId: string): Promise<ThemeState> {
  const theme = await db.getThemeState(userId);
  if (theme) return theme;
  
  // Create default theme
  return await db.setThemeState({
    ownerRef: userId,
    mode: "health_auto",
    constraintTierEffect: true
  });
}

export async function updateThemeState(userId: string, updates: Partial<Omit<ThemeState, "id" | "ownerRef">>): Promise<ThemeState> {
  const existing = await db.getThemeState(userId);
  if (existing) {
    return await db.setThemeState({ ...existing, ...updates });
  }
  return await db.setThemeState({
    ownerRef: userId,
    mode: updates.mode || "health_auto",
    selectedTheme: updates.selectedTheme,
    constraintTierEffect: updates.constraintTierEffect !== undefined ? updates.constraintTierEffect : true
  });
}

// ============================================================================
// TEST HELPERS (for backward compatibility)
// ============================================================================

export async function resetStore() {
  // For tests - clear all data
  // This is destructive - only use in tests
  console.warn("⚠️  resetStore() called - this is destructive!");
}

export async function loadFixtureStore() {
  // For tests - load fixture data
  console.warn("⚠️  loadFixtureStore() not implemented for Supabase");
}

