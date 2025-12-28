import fs from "fs";
import path from "path";
import { Store, defaultStore, FixedExpense, Income, VariableExpensePlan, VariableExpenseActual } from "./mockData";

type FixtureData = Partial<Store> & {
  variableFixtures?: Array<{
    date?: string | null;
    category?: string | null;
    planned?: number | null;
    actual?: number | null;
    paid_via?: string | null;
    notes?: string | null;
    cc_amount?: number | null;
  }>;
};

function readJson(file: string) {
  const p = path.resolve(process.cwd(), "testdata", file);
  return JSON.parse(fs.readFileSync(p, "utf-8"));
}

export function loadFixtures(): Store {
  const fixedRaw = readJson("fixed_expenses.json") as Array<{ category: string; name: string; amount: number; frequency: string }>;
  const varRaw = readJson("variable_expenses.json") as FixtureData["variableFixtures"];
  const invRaw = readJson("investments.json") as Array<{ name: string; goal: string; monthly_amount: number; status: string }>;

  const fixed: FixedExpense[] = fixedRaw.map((f, idx) => ({
    id: `fix-fixture-${idx}`,
    name: f.name,
    category: f.category,
    amount: f.amount,
    frequency: f.frequency as any
  }));

  const variablePlans: VariableExpensePlan[] = [];
  const variableActuals: VariableExpenseActual[] = [];
  (varRaw || []).forEach((v, idx) => {
    const planId = `var-fixture-${idx}`;
    variablePlans.push({
      id: planId,
      name: v.category ?? "Variable",
      planned: v.planned ?? 0,
      category: v.category ?? "General",
      startDate: v.date ?? "2025-01-01"
    });
    if (v.actual != null) {
      variableActuals.push({
        id: `act-fixture-${idx}`,
        planId,
        amount: v.actual,
        incurredAt: v.date ?? "2025-01-01T00:00:00Z",
        justification: v.notes ?? undefined
      });
    }
  });

  const incomes: Income[] = [
    { id: "inc-fixture-1", source: "Primary Salary", amount: 150000, frequency: "monthly" },
    { id: "inc-fixture-2", source: "Side Hustle", amount: 20000, frequency: "monthly" }
  ];

  return {
    ...defaultStore,
    incomes,
    fixedExpenses: fixed,
    variablePlans,
    variableActuals,
    // keep defaults for users/constraint
    constraint: defaultStore.constraint
  };
}

