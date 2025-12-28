import { loadFixtureStore, getStore } from "../src/store";

loadFixtureStore();
console.log("Seeded in-memory store with fixtures. Counts:", {
  incomes: getStore().incomes.length,
  fixed: getStore().fixedExpenses.length,
  variablePlans: getStore().variablePlans.length,
  variableActuals: getStore().variableActuals.length
});

