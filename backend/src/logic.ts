import { getStore } from "./store";
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

export function proratedVariableSpend(userId: string, today: Date, monthStartDay: number = 1): number {
  const store = getStore();
  const monthProgress = calculateMonthProgress(today, monthStartDay);
  return store.variablePlans.filter(p => p.userId === userId).reduce((sum, plan) => {
    const actualTotal = store.variableActuals
      .filter((a) => a.planId === plan.id && a.userId === userId)
      .reduce((s, a) => s + a.amount, 0);
    const proratedPlanned = plan.planned * monthProgress;
    const considered = Math.max(proratedPlanned, actualTotal);
    return sum + considered;
  }, 0);
}

export function unpaidProratedVariableForRemainingDays(userId: string, today: Date, monthStartDay: number = 1): number {
  const store = getStore();
  const monthProgress = calculateMonthProgress(today, monthStartDay);
  const remainingDaysRatio = 1 - monthProgress;

  return store.variablePlans.filter(p => p.userId === userId).reduce((sum, plan) => {
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

export function totalIncomePerMonth(userId: string): number {
  const store = getStore();
  return store.incomes.filter(i => i.userId === userId).reduce((sum, inc) => sum + monthlyEquivalent(inc.amount ?? 0, inc.frequency), 0);
}

export function totalFixedPerMonth(userId: string): number {
  const store = getStore();
  return store.fixedExpenses.filter(f => f.userId === userId).reduce((sum, exp) => sum + monthlyEquivalent(exp.amount, exp.frequency), 0);
}

export function unpaidFixedPerMonth(userId: string, today: Date): number {
  const store = getStore();
  const preferences = getUserPreferences(userId);
  const targetMonth = getBillingPeriodId(preferences.monthStartDay, today);

  return store.fixedExpenses.reduce((sum, exp) => {
    const paid = isItemPaid(userId, exp.id, 'fixed_expense', targetMonth);
    if (paid) return sum; // Skip paid items

    return sum + monthlyEquivalent(exp.amount, exp.frequency);
  }, 0);
}

export function unpaidInvestmentsPerMonth(userId: string, today: Date): number {
  const store = getStore();

  return store.investments.filter(inv => inv.userId === userId).reduce((sum, inv) => {
    // Only count active investments
    if (inv.status !== 'active') return sum;

    const month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const isInvestmentPaid = isItemPaid(userId, inv.id, 'investment', month);
    if (isInvestmentPaid) return sum; // Skip paid investments

    return sum + inv.monthlyAmount;
  }, 0);
}

export function totalActiveInvestmentsPerMonth(userId: string): number {
  const store = getStore();
  return store.investments.filter(i => i.userId === userId && i.status === 'active').reduce((sum, inv) => sum + inv.monthlyAmount, 0);
}

export function unpaidCreditCardDues(userId: string, today: Date): number {
  const store = getStore();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  return store.creditCards.filter(c => c.userId === userId).reduce((sum, card) => {
    const dueDate = new Date(card.dueDate);
    // Only count cards due in current month
    if (dueDate.getMonth() === currentMonth && dueDate.getFullYear() === currentYear) {
      const unpaidAmount = card.billAmount - card.paidAmount;
      return sum + unpaidAmount;
    }
    return sum;
  }, 0);
}



export function computeHealthSnapshot(today: Date, userId: string): { remaining: number; category: HealthCategory } {
  // Get user's billing cycle preferences
  const preferences = getUserPreferences(userId);
  const monthStartDay = preferences?.monthStartDay || 1;

  // CALCULATION:
  // Health = Available Funds - (Unpaid Fixed + Unpaid Prorated Variable for remaining days + Unpaid Investments + Unpaid Credit Cards)
  // Where: Available Funds = Total Income - All Payments Made So Far

  const totalIncome = totalIncomePerMonth(userId);
  const paymentsMade = totalPaymentsMadeThisMonth(userId, today);
  const availableFunds = totalIncome - paymentsMade;

  // Calculate unpaid obligations
  const unpaidFixed = unpaidFixedPerMonth(userId, today);

  // Variable expenses: use prorated based on user preference
  const unpaidVariable = unpaidProratedVariableForRemainingDays(userId, today, monthStartDay);

  const unpaidInvestments = unpaidInvestmentsPerMonth(userId, today);
  const unpaidCreditCards = unpaidCreditCardDues(userId, today);

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

