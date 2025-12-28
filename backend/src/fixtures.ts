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

  const FIXTURE_USER_ID = "fixture-user-001"; // Dummy user ID for fixtures

  const fixed: FixedExpense[] = fixedRaw.map((f, idx) => ({
    id: `fix-fixture-${idx}`,
    userId: FIXTURE_USER_ID,
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
      userId: FIXTURE_USER_ID,
      name: v.category ?? "Variable",
      planned: v.planned ?? 0,
      category: v.category ?? "General",
      startDate: v.date ?? "2025-01-01"
    });
    if (v.actual != null) {
      variableActuals.push({
        id: `act-fixture-${idx}`,
        userId: FIXTURE_USER_ID,
        planId,
        amount: v.actual,
        incurredAt: v.date ?? "2025-01-01T00:00:00Z",
        justification: v.notes ?? undefined
      });
    }
  });

  const incomes: Income[] = [
    { id: "inc-fixture-1", userId: FIXTURE_USER_ID, name: "Primary Salary", amount: 150000, category: "employment", frequency: "monthly", startDate: "2024-01-01" },
    { id: "inc-fixture-2", userId: FIXTURE_USER_ID, name: "Side Hustle", amount: 20000, category: "freelance", frequency: "monthly", startDate: "2024-01-01" }
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

