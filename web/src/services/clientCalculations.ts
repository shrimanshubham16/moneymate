/**
 * Client-Side Calculations for E2E Encryption
 * 
 * When E2E encryption is enabled, the server cannot decrypt data
 * to perform calculations. All calculations happen client-side
 * after decryption.
 */

export interface Income {
  id: string;
  source: string;
  amount: number;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
}

export interface FixedExpense {
  id: string;
  name: string;
  amount: number;
  frequency: 'monthly' | 'quarterly' | 'yearly';
  paid?: boolean;
  is_sip_flag?: boolean;
  accumulated_funds?: number;
}

export interface Investment {
  id: string;
  name: string;
  monthlyAmount?: number;
  monthly_amount?: number;
  status: 'active' | 'paused';
  paid?: boolean;
  accumulated_funds?: number;
}

export interface CreditCard {
  id: string;
  name: string;
  billAmount?: number;
  bill_amount?: number;
  paidAmount?: number;
  paid_amount?: number;
  dueDate: string;
}

export interface VariablePlan {
  id: string;
  name: string;
  planned: number;
  actuals?: { amount: number }[];
  actualTotal?: number;
}

export interface DashboardData {
  incomes: Income[];
  fixedExpenses: FixedExpense[];
  investments: Investment[];
  creditCards?: CreditCard[];
  variablePlans: VariablePlan[];
}

export type HealthCategory = 'good' | 'ok' | 'not_well' | 'worrisome';

export interface HealthThresholds {
  good_min: number;
  ok_min: number;
  ok_max: number;
  not_well_max: number;
}

export interface HealthBreakdown {
  totalIncome: number;
  totalObligations: number;
  availableFunds: number;
  healthScore: number;
  healthCategory: HealthCategory;
  obligations: {
    totalFixed: number;
    totalInvestments: number;
    unpaidCreditCards: number;
    unpaidVariable: number;
  };
}

export interface DueItem {
  id: string;
  type: 'fixed_expense' | 'investment' | 'credit_card' | 'periodic_sip';
  name: string;
  amount: number;
  dueDate?: string;
  paid?: boolean;
}

/**
 * Convert frequency to monthly amount
 */
function toMonthlyAmount(amount: number, frequency: string): number {
  switch (frequency) {
    case 'daily': return amount * 30;
    case 'weekly': return amount * 4.33;
    case 'biweekly': return amount * 2.17;
    case 'monthly': return amount;
    case 'quarterly': return amount / 3;
    case 'yearly': return amount / 12;
    default: return amount;
  }
}

/**
 * Calculate total monthly income
 */
export function calculateTotalIncome(incomes: Income[]): number {
  return incomes.reduce((sum, income) => {
    return sum + toMonthlyAmount(income.amount, income.frequency);
  }, 0);
}

/**
 * Calculate total fixed expenses (ALL, not just unpaid)
 */
export function calculateTotalFixed(expenses: FixedExpense[]): number {
  return expenses.reduce((sum, exp) => {
    return sum + toMonthlyAmount(exp.amount, exp.frequency);
  }, 0);
}

/**
 * Calculate total investments (ALL active, not just unpaid)
 */
export function calculateTotalInvestments(investments: Investment[]): number {
  return investments
    .filter(inv => inv.status === 'active')
    .reduce((sum, inv) => {
      const amount = inv.monthlyAmount || inv.monthly_amount || 0;
      return sum + amount;
    }, 0);
}

/**
 * Calculate unpaid credit cards for current billing period
 */
export function calculateUnpaidCreditCards(creditCards: CreditCard[]): number {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  return (creditCards || []).reduce((sum, card) => {
    const dueDate = new Date(card.dueDate);
    const isCurrentMonth = dueDate.getMonth() === currentMonth && dueDate.getFullYear() === currentYear;
    
    if (isCurrentMonth) {
      const bill = card.billAmount || card.bill_amount || 0;
      const paid = card.paidAmount || card.paid_amount || 0;
      return sum + Math.max(0, bill - paid);
    }
    return sum;
  }, 0);
}

/**
 * Calculate prorated variable expenses
 */
export function calculateProratedVariable(
  plans: VariablePlan[],
  daysRemaining: number = 15,
  totalDays: number = 30
): number {
  return plans.reduce((sum, plan) => {
    const spent = plan.actualTotal || 0;
    const planned = plan.planned || 0;
    
    // Prorated remaining = (planned * daysRemaining / totalDays) 
    // But use higher of actual spending rate or planned rate
    const dailySpent = spent / (totalDays - daysRemaining);
    const dailyPlanned = planned / totalDays;
    const dailyRate = Math.max(dailySpent, dailyPlanned);
    
    return sum + (dailyRate * daysRemaining);
  }, 0);
}

/**
 * Calculate full health breakdown (client-side)
 */
export function calculateHealthBreakdown(
  data: DashboardData,
  thresholds: HealthThresholds = {
    good_min: 20,
    ok_min: 10,
    ok_max: 19.99,
    not_well_max: 9.99
  }
): HealthBreakdown {
  const totalIncome = calculateTotalIncome(data.incomes || []);
  const totalFixed = calculateTotalFixed(data.fixedExpenses || []);
  const totalInvestments = calculateTotalInvestments(data.investments || []);
  const unpaidCreditCards = calculateUnpaidCreditCards(data.creditCards || []);
  const unpaidVariable = calculateProratedVariable(data.variablePlans || []);
  
  const totalObligations = totalFixed + totalInvestments + unpaidCreditCards + unpaidVariable;
  const availableFunds = totalIncome - totalObligations;
  
  // Health score: percentage of income remaining after obligations
  const healthScore = totalIncome > 0 
    ? Math.max(0, Math.min(100, (availableFunds / totalIncome) * 100))
    : 0;
  
  // Determine health category using thresholds
  let healthCategory: HealthBreakdown['healthCategory'];
  if (healthScore >= thresholds.good_min) healthCategory = 'good';
  else if (healthScore >= thresholds.ok_min && healthScore <= thresholds.ok_max) healthCategory = 'ok';
  else if (healthScore >= 0 && healthScore <= thresholds.not_well_max) healthCategory = 'not_well';
  else healthCategory = 'worrisome';
  
  return {
    totalIncome,
    totalObligations,
    availableFunds,
    healthScore,
    healthCategory,
    obligations: {
      totalFixed,
      totalInvestments,
      unpaidCreditCards,
      unpaidVariable,
    }
  };
}

/**
 * Calculate dues for current billing period (client-side)
 */
export function calculateDues(data: DashboardData): { items: DueItem[]; total: number } {
  const items: DueItem[] = [];
  const now = new Date();
  const currentMonth = now.getMonth();
  
  // Fixed expenses (monthly or due this month)
  (data.fixedExpenses || []).forEach(exp => {
    if (exp.paid) return;
    
    // Monthly expenses are always due
    if (exp.frequency === 'monthly') {
      items.push({
        id: exp.id,
        type: exp.is_sip_flag ? 'periodic_sip' : 'fixed_expense',
        name: exp.name,
        amount: exp.amount,
        paid: exp.paid,
      });
    }
    // Quarterly: due in Jan, Apr, Jul, Oct (0, 3, 6, 9)
    else if (exp.frequency === 'quarterly') {
      const quarterMonths = [0, 3, 6, 9];
      if (quarterMonths.includes(currentMonth)) {
        items.push({
          id: exp.id,
          type: exp.is_sip_flag ? 'periodic_sip' : 'fixed_expense',
          name: exp.name,
          amount: exp.amount,
          paid: exp.paid,
        });
      }
    }
    // Yearly: due in same month as start date (or January by default)
    else if (exp.frequency === 'yearly') {
      // Assume January for now (could use start_date if available)
      if (currentMonth === 0) {
        items.push({
          id: exp.id,
          type: exp.is_sip_flag ? 'periodic_sip' : 'fixed_expense',
          name: exp.name,
          amount: exp.amount,
          paid: exp.paid,
        });
      }
    }
  });
  
  // Active investments (unpaid)
  (data.investments || []).forEach(inv => {
    if (inv.status !== 'active' || inv.paid) return;
    
    const amount = inv.monthlyAmount || inv.monthly_amount || 0;
    items.push({
      id: inv.id,
      type: 'investment',
      name: inv.name,
      amount,
      paid: inv.paid,
    });
  });
  
  // Credit cards (due this month)
  (data.creditCards || []).forEach(card => {
    const dueDate = new Date(card.dueDate);
    if (dueDate.getMonth() !== currentMonth) return;
    
    const bill = card.billAmount || card.bill_amount || 0;
    const paid = card.paidAmount || card.paid_amount || 0;
    const remaining = bill - paid;
    
    if (remaining > 0) {
      items.push({
        id: card.id,
        type: 'credit_card',
        name: card.name,
        amount: remaining,
        dueDate: card.dueDate,
      });
    }
  });
  
  const total = items.reduce((sum, item) => sum + item.amount, 0);
  
  return { items, total };
}

/**
 * Calculate accumulated funds for an investment
 */
export function calculateAccumulatedFunds(
  investment: Investment,
  paymentMade: number = 0
): number {
  const current = investment.accumulated_funds || 0;
  return current + paymentMade;
}

/**
 * Calculate accumulated funds after SIP payment
 * (SIP deducts from accumulated, investment adds)
 */
export function calculateSIPAccumulatedFunds(
  sipExpense: FixedExpense,
  paymentMade: number = 0
): number {
  const current = sipExpense.accumulated_funds || 0;
  return Math.max(0, current - paymentMade);
}
