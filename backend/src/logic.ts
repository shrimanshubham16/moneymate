import * as db from "./supabase-db";
import { ConstraintScore, Frequency } from "./mockData";
import { getUserPreferences, getCurrentBillingPeriod, getBillingPeriodId } from "./preferences";
import { getUserPayments, isPaid as isItemPaid } from "./payments";

const HEALTH_THRESHOLDS = {
  good: 10000,
  okMin: 1,
  okMax: 9999,
  notWellMax: 3000
};

export type HealthCategory = "good" | "ok" | "not_well" | "worrisome";

export function calculateMonthProgress(today: Date, monthStartDay: number = 1): number {
  // Calculate progress based on user's billing cycle, not calendar month
  const currentDay = today.getDate();

  let startDate: Date;
  let endDate: Date;

  if (currentDay >= monthStartDay) {
    startDate = new Date(today.getFullYear(), today.getMonth(), monthStartDay);
    endDate = new Date(today.getFullYear(), today.getMonth() + 1, monthStartDay - 1);
  } else {
    startDate = new Date(today.getFullYear(), today.getMonth() - 1, monthStartDay);
    endDate = new Date(today.getFullYear(), today.getMonth(), monthStartDay - 1);
  }

  const progress = (today.getTime() - startDate.getTime()) / (endDate.getTime() - startDate.getTime());
  return Math.min(Math.max(progress, 0), 1);
}

export function monthlyEquivalent(amount: number, frequency: Frequency): number {
  if (frequency === "monthly") return amount;
  if (frequency === "quarterly") return amount / 3;
  return amount / 12;
}

export async function proratedVariableSpend(userId: string, today: Date, monthStartDay: number = 1): Promise<number> {
  const monthProgress = calculateMonthProgress(today, monthStartDay);
  const plans = await db.getVariablePlansByUserId(userId);
  const allActuals = await db.getVariableActualsByUserId(userId);
  return plans.reduce((sum, plan) => {
    const actualTotal = allActuals
      .filter((a) => a.planId === plan.id && a.userId === userId)
      .reduce((s, a) => s + a.amount, 0);
    const proratedPlanned = plan.planned * monthProgress;
    const considered = Math.max(proratedPlanned, actualTotal);
    return sum + considered;
  }, 0);
}

export async function unpaidProratedVariableForRemainingDays(userId: string, today: Date, monthStartDay: number = 1): Promise<number> {
  const monthProgress = calculateMonthProgress(today, monthStartDay);
  const remainingDaysRatio = 1 - monthProgress;

  const plans = await db.getVariablePlansByUserId(userId);
  const allActuals = await db.getVariableActualsByUserId(userId);
  return plans.reduce((sum, plan) => {
    // v1.2: Get actuals for this plan, excluding ExtraCash and CreditCard (they don't reduce available funds)
    const actuals = allActuals.filter(
      a => a.planId === plan.id && 
           a.userId === userId &&
           a.paymentMode !== "ExtraCash" &&
           a.paymentMode !== "CreditCard"
    );
    
    const actualTotal = actuals.reduce((s, a) => s + a.amount, 0);
    const proratedForRemainingDays = plan.planned * remainingDaysRatio;
    
    // Use higher of actual (excluding non-fund-deducting modes) or prorated
    return sum + Math.max(proratedForRemainingDays, actualTotal);
  }, 0);
}

export function totalPaymentsMadeThisMonth(userId: string, today: Date): number {
  const month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const payments = getUserPayments(userId, month);
  return payments.reduce((sum: number, payment: any) => sum + payment.paidAmount, 0);
}

export async function totalIncomePerMonth(userId: string): Promise<number> {
  const incomes = await db.getIncomesByUserId(userId);
  return incomes.reduce((sum, inc) => sum + monthlyEquivalent(inc.amount ?? 0, inc.frequency as Frequency), 0);
}

export async function totalFixedPerMonth(userId: string): Promise<number> {
  const expenses = await db.getFixedExpensesByUserId(userId);
  return expenses.reduce((sum, exp) => sum + monthlyEquivalent(exp.amount, exp.frequency as Frequency), 0);
}

export async function unpaidFixedPerMonth(userId: string, today: Date): Promise<number> {
  const preferences = await getUserPreferences(userId);
  const targetMonth = getBillingPeriodId(preferences.monthStartDay || 1, today);
  const expenses = await db.getFixedExpensesByUserId(userId);

  return expenses
    .reduce((sum, exp) => {
      const paid = isItemPaid(userId, exp.id, 'fixed_expense', targetMonth);
      if (paid) return sum; // Skip paid items

      return sum + monthlyEquivalent(exp.amount, exp.frequency as Frequency);
    }, 0);
}

export async function unpaidInvestmentsPerMonth(userId: string, today: Date): Promise<number> {
  const preferences = await getUserPreferences(userId);
  const targetMonth = getBillingPeriodId(preferences.monthStartDay || 1, today);
  const investments = await db.getInvestmentsByUserId(userId);

  return investments
    .reduce((sum, inv) => {
      // Only count active investments
      if (inv.status !== 'active') return sum;

      const isInvestmentPaid = isItemPaid(userId, inv.id, 'investment', targetMonth);
      if (isInvestmentPaid) return sum; // Skip paid investments

      return sum + inv.monthlyAmount;
    }, 0);
}

export async function totalActiveInvestmentsPerMonth(userId: string): Promise<number> {
  const investments = await db.getInvestmentsByUserId(userId);
  return investments.filter(i => i.status === 'active').reduce((sum, inv) => sum + inv.monthlyAmount, 0);
}

export async function unpaidCreditCardDues(userId: string, today: Date): Promise<number> {
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const cards = await db.getCreditCardsByUserId(userId);

  // v1.2: Design: Health score considers FULL bill amount, not unpaid amount
  // This way, paying credit card bill doesn't affect health score until overpaid
  return cards.reduce((sum, card) => {
    const dueDate = new Date(card.dueDate);
    // Only count cards due in current month
    if (dueDate.getMonth() === currentMonth && dueDate.getFullYear() === currentYear) {
      // Use full bill amount (not unpaid amount)
      // This ensures paying the bill doesn't improve health score
      // Only overpayment (paidAmount > billAmount) would affect available funds
      return sum + (card.billAmount || 0);
    }
    return sum;
  }, 0);
}

// v1.2: Calculate credit card overpayments (paidAmount > billAmount)
// These should reduce available funds
export async function getCreditCardOverpayments(userId: string, today: Date): Promise<number> {
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const cards = await db.getCreditCardsByUserId(userId);

  return cards.reduce((sum, card) => {
    const dueDate = new Date(card.dueDate);
    // Only count cards due in current month
    if (dueDate.getMonth() === currentMonth && dueDate.getFullYear() === currentYear) {
      const overpayment = Math.max(0, (card.paidAmount || 0) - (card.billAmount || 0));
      return sum + overpayment;
    }
    return sum;
  }, 0);
}

/**
 * Fast-path health calculation using PostgreSQL function (income - fixed).
 * Used for cache warmups or lightweight health checks.
 */
export async function computeHealthSnapshotDb(userId: string): Promise<{ remaining: number; category: HealthCategory }> {
  const result = await db.calculateHealthInDb(userId);
  const remaining = Math.round(result.availableFunds || 0);
  let category: HealthCategory = "ok";
  if (remaining > HEALTH_THRESHOLDS.good) category = "good";
  else if (remaining >= HEALTH_THRESHOLDS.okMin && remaining <= HEALTH_THRESHOLDS.okMax) category = "ok";
  else if (remaining < 0 && Math.abs(remaining) <= HEALTH_THRESHOLDS.notWellMax) category = "not_well";
  else category = "worrisome";
  return { remaining, category };
}

export async function computeHealthSnapshot(today: Date, userId: string): Promise<{ remaining: number; category: HealthCategory }> {
  // Get user's billing cycle preferences
  const preferences = await getUserPreferences(userId);
  const monthStartDay = preferences?.monthStartDay || 1;

  // CALCULATION:
  // Health = Available Funds - (Unpaid Fixed + Unpaid Prorated Variable for remaining days + Unpaid Investments + Unpaid Credit Cards)
  // Where: Available Funds = Total Income - All Payments Made So Far

  const [totalIncome, paymentsMade, creditCardOverpaymentsAmount, unpaidFixed, unpaidVariable, unpaidInvestments, unpaidCreditCards] = await Promise.all([
    totalIncomePerMonth(userId),
    Promise.resolve(totalPaymentsMadeThisMonth(userId, today)), // This is sync
    getCreditCardOverpayments(userId, today),
    unpaidFixedPerMonth(userId, today),
    unpaidProratedVariableForRemainingDays(userId, today, monthStartDay),
    unpaidInvestmentsPerMonth(userId, today),
    unpaidCreditCardDues(userId, today)
  ]);

  // v1.2: Credit card overpayments (paidAmount > billAmount) reduce available funds
  const availableFunds = totalIncome - paymentsMade - creditCardOverpaymentsAmount;

  const remaining = availableFunds - unpaidFixed - unpaidVariable - unpaidInvestments - unpaidCreditCards;
  
  // Round to integer for display (health score should be whole rupees)
  const remainingRounded = Math.round(remaining);

  let category: HealthCategory;
  if (remainingRounded > HEALTH_THRESHOLDS.good) category = "good";
  else if (remainingRounded >= HEALTH_THRESHOLDS.okMin && remainingRounded <= HEALTH_THRESHOLDS.okMax) category = "ok";
  else if (remainingRounded < 0 && Math.abs(remainingRounded) <= HEALTH_THRESHOLDS.notWellMax) category = "not_well";
  else category = "worrisome";

  return { remaining: remainingRounded, category };
}

export function applyConstraintDecay(state: ConstraintScore, asOf: Date): ConstraintScore {
  const last = new Date(state.decayAppliedAt);
  const sameMonth = last.getUTCFullYear() === asOf.getUTCFullYear() && last.getUTCMonth() === asOf.getUTCMonth();
  if (sameMonth) return state;
  const decayed = Math.ceil(state.score * 0.95);
  return { ...state, score: decayed, decayAppliedAt: asOf.toISOString(), tier: tierFor(decayed) };
}

export function tierFor(score: number): ConstraintScore["tier"] {
  if (score >= 70) return "red";
  if (score >= 40) return "amber";
  return "green";
}

