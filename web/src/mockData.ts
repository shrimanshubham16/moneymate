export type Income = { id: string; source: string; amount: number; frequency: "monthly" | "quarterly" | "yearly" };
export type FixedExpense = { id: string; name: string; amount: number; frequency: "monthly" | "quarterly" | "yearly"; category: string };
export type VariableExpense = { id: string; name: string; planned: number; actual: number; category: string };
export type Investment = { id: string; name: string; amount: number; status: "active" | "paused" };
export type Alert = { id: string; type: string; message: string; severity: "info" | "warn" | "critical" };
export type FutureBomb = { id: string; name: string; dueDate: string; monthlyEquivalent: number; preparedness: number };
export type ConstraintScore = { score: number; tier: "green" | "amber" | "red"; recentOverspends: number };

export const incomes: Income[] = [
  { id: "inc-1", source: "Salary", amount: 120000, frequency: "monthly" },
  { id: "inc-2", source: "Side Hustle", amount: 15000, frequency: "monthly" }
];

export const fixedExpenses: FixedExpense[] = [
  { id: "fix-1", name: "Rent", amount: 30000, frequency: "monthly", category: "Housing" },
  { id: "fix-2", name: "Car EMI", amount: 12000, frequency: "monthly", category: "Loan" },
  { id: "fix-3", name: "Insurance", amount: 24000, frequency: "yearly", category: "Insurance" }
];

export const variableExpenses: VariableExpense[] = [
  { id: "var-1", name: "Groceries", planned: 12000, actual: 8000, category: "Food" },
  { id: "var-2", name: "Eating Out", planned: 6000, actual: 5200, category: "Food" },
  { id: "var-3", name: "Transport", planned: 4000, actual: 3000, category: "Transit" }
];

export const investments: Investment[] = [
  { id: "inv-1", name: "Index SIP", amount: 8000, status: "active" },
  { id: "inv-2", name: "Gold SIP", amount: 4000, status: "paused" }
];

export const futureBombs: FutureBomb[] = [
  { id: "fb-1", name: "Annual Insurance", dueDate: "2025-12-10", monthlyEquivalent: 2000, preparedness: 0.4 },
  { id: "fb-2", name: "School Fees", dueDate: "2025-04-05", monthlyEquivalent: 5000, preparedness: 0.6 }
];

export const alerts: Alert[] = [
  { id: "al-1", type: "overspend", message: "Eating Out overspend detected", severity: "warn" },
  { id: "al-2", type: "missed_investment", message: "Gold SIP paused for 2 cycles", severity: "info" },
  { id: "al-3", type: "future_bomb", message: "Annual Insurance underprepared (40%)", severity: "critical" }
];

export const constraintScore: ConstraintScore = { score: 62, tier: "amber", recentOverspends: 2 };

