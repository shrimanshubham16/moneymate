/**
 * Shared health score calculation — single source of truth.
 * Used by DashboardPage, HealthDetailsPage, reportTotals, and ExportPage.
 */

export interface HealthInput {
  incomes: any[];
  fixedExpenses: any[];
  variablePlans: any[];
  investments: any[];
  creditCards: any[];
  futureBombs: any[];
  sharedAggregates: any[];
  healthThresholds?: { good_min: number; ok_min: number; ok_max?: number; not_well_max?: number };
  currentUserId: string | null;
  selectedView: string;
}

export interface HealthOutput {
  remaining: number | null;
  category: string;
  healthPct: number;
  noAggregateData: boolean;
  isSpecificUserView: boolean;
  breakdown: {
    ownIncome: number;
    sharedIncome: number;
    totalIncome: number;
    ownFixed: number;
    sharedFixed: number;
    totalFixed: number;
    ownVariable: number;
    sharedVariable: number;
    totalVariable: number;
    ownInvestments: number;
    sharedInvestments: number;
    totalInvestments: number;
    ownCcBill: number;
    sharedCcBill: number;
    totalCcBill: number;
    bombSip: number;
    totalOutflow: number;
  };
}

export function calculateHealthScore(input: HealthInput): HealthOutput {
  const {
    incomes, fixedExpenses, variablePlans, investments,
    creditCards, futureBombs, sharedAggregates,
    healthThresholds, currentUserId, selectedView
  } = input;

  const isSpecificUserView = selectedView !== 'me' && selectedView !== 'merged';

  const filterByUser = (items: any[]) => {
    if (isSpecificUserView) return [];
    return items.filter((item: any) =>
      item.userId === currentUserId || item.user_id === currentUserId
    );
  };

  const ownIncomes = filterByUser(incomes);
  const ownFixed = filterByUser(fixedExpenses);
  const ownInvestmentsArr = filterByUser(investments);
  const ownVariablePlans = filterByUser(variablePlans);

  const specificUserAggregate = isSpecificUserView
    ? sharedAggregates.find((agg: any) => agg.userId === selectedView || agg.user_id === selectedView)
    : null;

  const readAgg = (agg: any, camel: string, snake: string): number =>
    parseFloat(agg?.[camel] ?? agg?.[snake]) || 0;

  const sharedIncome = isSpecificUserView
    ? readAgg(specificUserAggregate, 'totalIncomeMonthly', 'total_income_monthly')
    : sharedAggregates.reduce((s: number, a: any) => s + readAgg(a, 'totalIncomeMonthly', 'total_income_monthly'), 0);
  const sharedFixed = isSpecificUserView
    ? readAgg(specificUserAggregate, 'totalFixedMonthly', 'total_fixed_monthly')
    : sharedAggregates.reduce((s: number, a: any) => s + readAgg(a, 'totalFixedMonthly', 'total_fixed_monthly'), 0);
  const sharedInvestments = isSpecificUserView
    ? readAgg(specificUserAggregate, 'totalInvestmentsMonthly', 'total_investments_monthly')
    : sharedAggregates.reduce((s: number, a: any) => s + readAgg(a, 'totalInvestmentsMonthly', 'total_investments_monthly'), 0);
  const sharedVarPlanned = isSpecificUserView
    ? readAgg(specificUserAggregate, 'totalVariablePlanned', 'total_variable_planned')
    : sharedAggregates.reduce((s: number, a: any) => s + readAgg(a, 'totalVariablePlanned', 'total_variable_planned'), 0);
  const sharedVarActual = isSpecificUserView
    ? readAgg(specificUserAggregate, 'totalVariableActual', 'total_variable_actual')
    : sharedAggregates.reduce((s: number, a: any) => s + readAgg(a, 'totalVariableActual', 'total_variable_actual'), 0);
  const sharedCcBill = isSpecificUserView
    ? readAgg(specificUserAggregate, 'totalCreditCardDues', 'total_credit_card_dues')
    : sharedAggregates.reduce((s: number, a: any) => s + readAgg(a, 'totalCreditCardDues', 'total_credit_card_dues'), 0);

  // ── Income ──
  const ownIncome = ownIncomes
    .filter((inc: any) => inc.includeInHealth !== false)
    .reduce((sum: number, inc: any) => {
      const amount = parseFloat(inc.amount) || 0;
      const monthly = inc.frequency === 'monthly' ? amount
        : inc.frequency === 'quarterly' ? amount / 3 : amount / 12;
      return sum + monthly;
    }, 0);
  const totalIncome = ownIncome + sharedIncome;

  // ── Fixed expenses ──
  const now = new Date();
  const ownFixedTotal = ownFixed
    .filter((exp: any) => {
      if (exp.isSkipped) return false;
      const endDate = exp.endDate || exp.end_date;
      const startDate = exp.startDate || exp.start_date;
      if (endDate && new Date(endDate) < now) return false;
      if (startDate && new Date(startDate) > now) return false;
      return true;
    })
    .reduce((sum: number, exp: any) => {
      const amount = parseFloat(exp.amount) || 0;
      const monthly = exp.frequency === 'monthly' ? amount
        : exp.frequency === 'quarterly' ? amount / 3 : amount / 12;
      return sum + monthly;
    }, 0);
  const totalFixed = ownFixedTotal + sharedFixed;

  // ── Investments ──
  const ownInvestmentsTotal = ownInvestmentsArr
    .filter((inv: any) => inv.status === 'active')
    .reduce((sum: number, inv: any) => sum + (parseFloat(inv.monthlyAmount) || 0), 0);
  const totalInvestmentsVal = ownInvestmentsTotal + sharedInvestments;

  // ── Variable expenses ──
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const remainingDaysRatio = 1 - now.getDate() / daysInMonth;

  const ownVariableTotal = ownVariablePlans.reduce((sum: number, plan: any) => {
    const actuals = (plan.actuals || []).filter((a: any) =>
      a.paymentMode !== "ExtraCash" && a.paymentMode !== "CreditCard"
    );
    const actualTotal = actuals.reduce((s: number, a: any) => s + (parseFloat(a.amount) || 0), 0);
    const prorated = (parseFloat(plan.planned) || 0) * remainingDaysRatio;
    return sum + Math.max(actualTotal, prorated);
  }, 0);
  const sharedVariableEffective = Math.max(sharedVarActual, sharedVarPlanned * remainingDaysRatio);
  const totalVariable = ownVariableTotal + sharedVariableEffective;

  // ── Credit Card Bill ──
  const ownCcBillTotal = isSpecificUserView ? 0 : creditCards
    .filter((c: any) => !c.isSharedCard)
    .reduce((sum: number, c: any) => sum + (parseFloat(c.billAmount || c.bill_amount) || 0), 0);
  const totalCcBill = ownCcBillTotal + sharedCcBill;

  // ── Bomb Defusal SIP ──
  const bombSip = (futureBombs as any[]).reduce((sum: number, bomb: any) => {
    const bombRemaining = Math.max(0,
      (parseFloat(bomb.totalAmount ?? bomb.total_amount ?? 0) || 0) -
      (parseFloat(bomb.savedAmount ?? bomb.saved_amount ?? 0) || 0));
    if (bombRemaining <= 0) return sum;
    const dueDate = new Date(bomb.dueDate || bomb.due_date);
    const defuseBy = new Date(dueDate.getFullYear(), dueDate.getMonth() - 1, dueDate.getDate());
    const msPerMonth = 30.44 * 24 * 60 * 60 * 1000;
    const monthsLeft = Math.max(1, Math.floor((defuseBy.getTime() - now.getTime()) / msPerMonth));
    return sum + (bombRemaining / monthsLeft);
  }, 0);

  // ── Totals ──
  const totalOutflow = totalFixed + totalVariable + totalInvestmentsVal + totalCcBill + bombSip;
  const remaining = totalIncome - totalOutflow;

  // ── Category (percentage-based thresholds) ──
  const ht = healthThresholds || { good_min: 20, ok_min: 10 };
  const healthPct = totalIncome > 0
    ? (remaining / totalIncome) * 100
    : (remaining < 0 ? -100 : 0);

  let category: string;
  if (healthPct < 0) category = "worrisome";
  else if (healthPct >= ht.good_min) category = "good";
  else if (healthPct >= ht.ok_min) category = "ok";
  else category = "not_well";

  const noAggregateData = isSpecificUserView && !specificUserAggregate;

  return {
    remaining: noAggregateData ? null : remaining,
    category: noAggregateData ? 'unavailable' : category,
    healthPct: noAggregateData ? 0 : healthPct,
    noAggregateData,
    isSpecificUserView,
    breakdown: {
      ownIncome,
      sharedIncome,
      totalIncome,
      ownFixed: ownFixedTotal,
      sharedFixed,
      totalFixed,
      ownVariable: ownVariableTotal,
      sharedVariable: sharedVariableEffective,
      totalVariable,
      ownInvestments: ownInvestmentsTotal,
      sharedInvestments,
      totalInvestments: totalInvestmentsVal,
      ownCcBill: ownCcBillTotal,
      sharedCcBill,
      totalCcBill,
      bombSip,
      totalOutflow,
    },
  };
}
