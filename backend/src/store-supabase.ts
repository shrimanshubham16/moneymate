// Store compatibility layer using direct PostgreSQL
// Provides the same interface as the old store.ts but uses pg-db.ts
import * as db from "./pg-db";

// Re-export types
export type { ConstraintScore } from "./pg-db";

// User subcategories (in-memory for now - TODO: migrate to DB if needed)
const userSubcategories = new Map<string, string[]>();

// Constraint score functions
export async function getConstraint(userId: string) {
  return await db.getConstraintScore(userId);
}

export async function setConstraint(userId: string, constraint: { score: number; tier: string; recentOverspends?: number; decayAppliedAt?: string }) {
  return await db.updateConstraintScore(userId, constraint);
}

// Income functions
export async function addIncome(userId: string, income: { name?: string; amount?: number; frequency?: string; category?: string; startDate?: string; endDate?: string; description?: string }) {
  return await db.addIncome({
    userId,
    name: income.name,
    amount: income.amount,
    frequency: income.frequency,
    category: income.category,
    startDate: income.startDate,
    endDate: income.endDate,
    description: income.description
  });
}

export async function updateIncome(incomeId: string, updates: any) {
  return await db.updateIncome(incomeId, updates);
}

export async function deleteIncome(userId: string, incomeId: string) {
  return await db.deleteIncome(incomeId);
}

// Fixed expense functions
export async function addFixedExpense(userId: string, expense: { name: string; amount: number; frequency?: string; category?: string; isSip?: boolean; startDate?: string; endDate?: string }) {
  return await db.addFixedExpense({
    userId,
    name: expense.name,
    amount: expense.amount,
    frequency: expense.frequency,
    category: expense.category,
    isSip: expense.isSip,
    startDate: expense.startDate,
    endDate: expense.endDate
  });
}

export async function updateFixedExpense(expenseId: string, updates: any) {
  return await db.updateFixedExpense(expenseId, updates);
}

export async function deleteFixedExpense(userId: string, expenseId: string) {
  return await db.deleteFixedExpense(expenseId);
}

// Variable plan functions
export async function addVariablePlan(userId: string, plan: { name: string; planned: number; category?: string; startDate: string; endDate?: string }) {
  return await db.addVariablePlan({
    userId,
    name: plan.name,
    planned: plan.planned,
    category: plan.category,
    startDate: plan.startDate,
    endDate: plan.endDate
  });
}

export async function updateVariablePlan(planId: string, updates: any) {
  return await db.updateVariablePlan(planId, updates);
}

export async function deleteVariablePlan(userId: string, planId: string) {
  return await db.deleteVariablePlan(planId);
}

// Variable actual functions
export async function addVariableActual(userId: string, actual: { planId: string; amount: number; incurredAt: string; justification?: string; subcategory?: string; paymentMode?: string; creditCardId?: string }) {
  return await db.addVariableActual({
    userId,
    planId: actual.planId,
    amount: actual.amount,
    incurredAt: actual.incurredAt,
    justification: actual.justification,
    subcategory: actual.subcategory,
    paymentMode: actual.paymentMode,
    creditCardId: actual.creditCardId
  });
}

// Investment functions
export async function addInvestment(userId: string, investment: { name: string; goal?: string; monthlyAmount: number; status?: string }) {
  return await db.addInvestment({
    userId,
    name: investment.name,
    goal: investment.goal,
    monthlyAmount: investment.monthlyAmount,
    status: investment.status
  });
}

export async function updateInvestment(investmentId: string, updates: any) {
  return await db.updateInvestment(investmentId, updates);
}

// Future bomb functions
export async function addFutureBomb(userId: string, bomb: { name: string; dueDate: string; totalAmount: number; savedAmount?: number; monthlyEquivalent?: number; preparednessRatio?: number }) {
  return await db.addFutureBomb({
    userId,
    name: bomb.name,
    dueDate: bomb.dueDate,
    totalAmount: bomb.totalAmount,
    savedAmount: bomb.savedAmount,
    monthlyEquivalent: bomb.monthlyEquivalent,
    preparednessRatio: bomb.preparednessRatio
  });
}

export async function updateFutureBomb(bombId: string, updates: any) {
  return await db.updateFutureBomb(bombId, updates);
}

// Credit card functions
export async function addCreditCard(userId: string, card: { name: string; statementDate: string; dueDate: string; billAmount?: number; paidAmount?: number; currentExpenses?: number; billingDate?: number; needsBillUpdate?: boolean }) {
  return await db.addCreditCard({
    userId,
    name: card.name,
    statementDate: card.statementDate,
    dueDate: card.dueDate,
    billAmount: card.billAmount,
    paidAmount: card.paidAmount,
    currentExpenses: card.currentExpenses,
    billingDate: card.billingDate,
    needsBillUpdate: card.needsBillUpdate
  });
}

export async function payCreditCard(cardId: string, amount: number) {
  const card = await db.getCreditCardById(cardId);
  if (!card) return null;
  const newPaidAmount = (card.paidAmount || 0) + amount;
  return await db.updateCreditCard(cardId, { paidAmount: newPaidAmount });
}

export async function resetCreditCardCurrentExpenses(cardId: string, userId: string) {
  const card = await db.getCreditCardById(cardId);
  if (!card || card.userId !== userId) return null;
  return await db.updateCreditCard(cardId, { currentExpenses: 0 });
}

export async function deleteCreditCard(userId: string, cardId: string) {
  const card = await db.getCreditCardById(cardId);
  if (!card || card.userId !== userId) return false;
  return await db.deleteCreditCard(cardId);
}

export async function checkAndAlertBillingDates(today: Date) {
  // TODO: Implement billing alerts if needed
  return [];
}

// Loan functions
export async function addLoan(userId: string, loan: { name: string; principal: number; remainingTenureMonths: number; emi: number }) {
  return await db.addLoan({
    userId,
    name: loan.name,
    principal: loan.principal,
    remainingTenureMonths: loan.remainingTenureMonths,
    emi: loan.emi
  });
}

export async function listLoans(userId: string) {
  return await db.getLoansByUserId(userId);
}

// Activity functions
export async function addActivity(userId: string, entity: string, action: string, payload?: any) {
  return await db.addActivity({ actorId: userId, entity, action, payload });
}

export async function listActivities(userId: string) {
  return await db.getActivitiesByUserId(userId);
}

// Theme state functions
export async function getThemeState(userId: string) {
  const state = await db.getThemeState(userId);
  return state || { ownerRef: userId, mode: 'health_auto', selectedTheme: 'green_zone', constraintTierEffect: false };
}

export async function updateThemeState(userId: string, state: { mode?: string; selectedTheme?: string; constraintTierEffect?: boolean }) {
  return await db.updateThemeState(userId, state);
}

// Sharing functions
export async function listRequestsForUser(userId: string, username: string) {
  const outgoing = await db.getSharingRequestsByInviterId(userId);
  const incoming = await db.getSharingRequestsByInviteeEmail(username);
  return { incoming, outgoing };
}

export async function createSharingRequest(inviterId: string, inviteeEmail: string, role: string, mergeFinances: boolean) {
  return await db.createSharingRequest({
    inviterId,
    inviteeEmail,
    role,
    mergeFinances
  });
}

export async function approveRequest(requestId: string, username: string) {
  const request = await db.updateSharingRequest(requestId, { status: 'approved' });
  if (!request) return null;
  
  // Create shared account and members
  const account = await db.createSharedAccount({ name: `Shared-${Date.now()}` });
  await db.createSharedMember({ sharedAccountId: account.id, userId: request.inviterId, role: 'owner', mergeFinances: request.mergeFinances });
  
  // Get invitee user
  const invitee = await db.getUserByUsername(username);
  if (invitee) {
    await db.createSharedMember({ sharedAccountId: account.id, userId: invitee.id, role: request.role, mergeFinances: request.mergeFinances });
  }
  
  return { account, request };
}

export async function rejectRequest(requestId: string) {
  const result = await db.updateSharingRequest(requestId, { status: 'rejected' });
  return !!result;
}

export async function listMembers(userId: string) {
  return await db.getSharedMembersByUserId(userId);
}

export async function listSharedAccountsFor(userId: string) {
  return await db.getSharedAccountsByUserId(userId);
}

export async function removeMember(memberId: string, userId: string) {
  // Only allow removing self or if owner
  return await db.deleteSharedMember(memberId);
}

// User subcategories (in-memory)
export function getUserSubcategories(userId: string): string[] {
  return userSubcategories.get(userId) || ['Food', 'Transport', 'Shopping', 'Entertainment', 'Health', 'Other'];
}

export function addUserSubcategory(userId: string, subcategory: string) {
  const existing = getUserSubcategories(userId);
  if (!existing.includes(subcategory)) {
    userSubcategories.set(userId, [...existing, subcategory]);
  }
}
