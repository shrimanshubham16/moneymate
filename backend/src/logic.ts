import { getStore } from "./store";
import { ConstraintScore, Frequency } from "./mockData";
import { getUserPreferences, getBillingPeriod } from "./preferences";
import { getUserPayments, isPaid as getPaymentStatusForItem } from "./payments";

const HEALTH_THRESHOLDS = {
  good: 10000,
  okMin: 1,
  okMax: 9999,
  notWellMax: 3000
};

export type HealthCategory = "good" | "ok" | "not_well" | "worrisome";

export function calculateMonthProgress(today: Date, monthStartDay: number = 1): number {
  // Calculate progress based on user's billing cycle, not calendar month
  const { start, end } = getBillingPeriod(today, monthStartDay);
  
  const progress = (today.getTime() - start.getTime()) / (end.getTime() - start.getTime());
  return Math.min(Math.max(progress, 0), 1);
}

export function monthlyEquivalent(amount: number, frequency: Frequency): number {
  if (frequency === "monthly") return amount;
  if (frequency === "quarterly") return amount / 3;
  return amount / 12;
}

export function proratedVariableSpend(today: Date, monthStartDay: number = 1): number {
  const store = getStore();
  const monthProgress = calculateMonthProgress(today, monthStartDay);
  return store.variablePlans.reduce((sum, plan) => {
    const actualTotal = store.variableActuals
      .filter((a) => a.planId === plan.id)
      .reduce((s, a) => s + a.amount, 0);
    const proratedPlanned = plan.planned * monthProgress;
    const considered = Math.max(proratedPlanned, actualTotal);
    return sum + considered;
  }, 0);
}

export function unpaidProratedVariableForRemainingDays(today: Date, monthStartDay: number = 1): number {
  const store = getStore();
  const monthProgress = calculateMonthProgress(today, monthStartDay);
  const remainingDaysRatio = 1 - monthProgress;

  return store.variablePlans.reduce((sum, plan) => {
    // Calculate prorated amount for remaining days of billing cycle
    const proratedForRemainingDays = plan.planned * remainingDaysRatio;
    return sum + proratedForRemainingDays;
  }, 0);
}

export function totalPaymentsMadeThisMonth(userId: string, today: Date): number {
  const month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const payments = getUserPayments(userId, month);
  return payments.reduce((sum: number, payment: any) => sum + payment.paidAmount, 0);
}

export function totalIncomePerMonth(): number {
  const store = getStore();
  return store.incomes.reduce((sum, inc) => sum + monthlyEquivalent(inc.amount, inc.frequency), 0);
}

export function totalFixedPerMonth(): number {
  const store = getStore();
  return store.fixedExpenses.reduce((sum, exp) => sum + monthlyEquivalent(exp.amount, exp.frequency), 0);
}

export function unpaidFixedPerMonth(userId: string, today: Date): number {
  const store = getStore();

  return store.fixedExpenses.reduce((sum, exp) => {
    const isPaid = getPaymentStatusForItem(userId, exp.id, 'fixed_expense', today);
    if (isPaid) return sum; // Skip paid items

    return sum + monthlyEquivalent(exp.amount, exp.frequency);
  }, 0);
}

export function unpaidInvestmentsPerMonth(userId: string, today: Date): number {
  const store = getStore();

  return store.investments.reduce((sum, inv) => {
    // Only count active investments
    if (inv.status !== 'active') return sum;

    const isPaid = getPaymentStatusForItem(userId, inv.id, 'investment', today);
    if (isPaid) return sum; // Skip paid investments

    return sum + inv.monthlyAmount;
  }, 0);
}

export function totalActiveInvestmentsPerMonth(): number {
  const store = getStore();
  return store.investments
    .filter(inv => inv.status === 'active')
    .reduce((sum, inv) => sum + inv.monthlyAmount, 0);
}

export function unpaidCreditCardDues(today: Date): number {
  const store = getStore();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  return store.creditCards.reduce((sum, card) => {
    const dueDate = new Date(card.dueDate);
    // Only count cards due in current month
    if (dueDate.getMonth() === currentMonth && dueDate.getFullYear() === currentYear) {
      const unpaidAmount = card.billAmount - card.paidAmount;
      return sum + Math.max(0, unpaidAmount); // Only count if unpaid
    }
    return sum;
  }, 0);
}

export function totalPlannedVariableExpenses(): number {
  const store = getStore();
  return store.variablePlans.reduce((sum, plan) => sum + plan.planned, 0);
}

export function computeHealthSnapshot(today: Date, userId?: string): { remaining: number; category: HealthCategory } {
  // Get user's billing cycle preferences
  const preferences = userId ? getUserPreferences(userId) : null;
  const monthStartDay = preferences?.monthStartDay || 1;
  const useProrated = preferences?.useProrated ?? false; // Default to false - simpler calculation

  if (!userId) {
    // Fallback for when userId is not provided (shouldn't happen in normal flow)
    const income = totalIncomePerMonth();
    const variable = totalPlannedVariableExpenses(); // Use full planned, not prorated
    const fixed = totalFixedPerMonth();
    const investments = totalActiveInvestmentsPerMonth();
    const creditCardDues = unpaidCreditCardDues(today);
    const remaining = income - fixed - variable - investments - creditCardDues;

    let category: HealthCategory;
    if (remaining > HEALTH_THRESHOLDS.good) category = "good";
    else if (remaining >= HEALTH_THRESHOLDS.okMin && remaining <= HEALTH_THRESHOLDS.okMax) category = "ok";
    else if (remaining < 0 && Math.abs(remaining) <= HEALTH_THRESHOLDS.notWellMax) category = "not_well";
    else category = "worrisome";

    return { remaining, category };
  }

  // SIMPLIFIED CALCULATION (default):
  // Health = Available Funds - (Unpaid Fixed + Planned Variable + Unpaid Investments + Unpaid Credit Cards)
  // Where: Available Funds = Total Income - All Payments Made So Far
  //
  // ADVANCED CALCULATION (if useProrated enabled):
  // Uses prorated variable expenses based on remaining days in billing cycle

  const totalIncome = totalIncomePerMonth();
  const paymentsMade = totalPaymentsMadeThisMonth(userId, today);
  const availableFunds = totalIncome - paymentsMade;

  // Calculate unpaid obligations
  const unpaidFixed = unpaidFixedPerMonth(userId, today);
  
  // Variable expenses: use prorated or full planned based on user preference
  const unpaidVariable = useProrated 
    ? unpaidProratedVariableForRemainingDays(today, monthStartDay)
    : totalPlannedVariableExpenses();
    
  const unpaidInvestments = unpaidInvestmentsPerMonth(userId, today);
  const unpaidCreditCards = unpaidCreditCardDues(today);

  const remaining = availableFunds - unpaidFixed - unpaidVariable - unpaidInvestments - unpaidCreditCards;

  let category: HealthCategory;
  if (remaining > HEALTH_THRESHOLDS.good) category = "good";
  else if (remaining >= HEALTH_THRESHOLDS.okMin && remaining <= HEALTH_THRESHOLDS.okMax) category = "ok";
  else if (remaining < 0 && Math.abs(remaining) <= HEALTH_THRESHOLDS.notWellMax) category = "not_well";
  else category = "worrisome";

  return { remaining, category };
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

