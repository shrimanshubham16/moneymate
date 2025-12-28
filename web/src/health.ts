import { fixedExpenses, incomes, variableExpenses } from "./mockData";

export type HealthCategory = "good" | "ok" | "not_well" | "worrisome";

const HEALTH_THRESHOLDS = {
  good: 10000,
  okMin: 1,
  okMax: 9999,
  notWellMax: 3000
};

export function calculateMonthProgress(today: Date): number {
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth();
  const start = Date.UTC(year, month, 1);
  const end = Date.UTC(year, month + 1, 1);
  const progress = (today.getTime() - start) / (end - start);
  return Math.min(Math.max(progress, 0), 1);
}

export function monthlyEquivalent(amount: number, frequency: "monthly" | "quarterly" | "yearly"): number {
  if (frequency === "monthly") return amount;
  if (frequency === "quarterly") return amount / 3;
  return amount / 12;
}

export function computeHealth(today: Date): { remaining: number; category: HealthCategory } {
  const monthProgress = calculateMonthProgress(today);
  const income = incomes.reduce((sum, inc) => sum + monthlyEquivalent(inc.amount, inc.frequency), 0);
  const fixed = fixedExpenses.reduce((sum, exp) => sum + monthlyEquivalent(exp.amount, exp.frequency), 0);
  const variable = variableExpenses.reduce((sum, exp) => {
    const prorated = exp.planned * monthProgress;
    const considered = Math.max(prorated, exp.actual);
    return sum + considered;
  }, 0);

  const remaining = income - fixed - variable;
  let category: HealthCategory;
  if (remaining > HEALTH_THRESHOLDS.good) category = "good";
  else if (remaining >= HEALTH_THRESHOLDS.okMin && remaining <= HEALTH_THRESHOLDS.okMax) category = "ok";
  else if (remaining < 0 && Math.abs(remaining) <= HEALTH_THRESHOLDS.notWellMax) category = "not_well";
  else category = "worrisome";

  return { remaining, category };
}

