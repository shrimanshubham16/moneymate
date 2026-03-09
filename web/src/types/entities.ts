// types/entities.ts

export interface Income {
  id: string;
  userId: string;
  /** Display name; API may send as `source` */
  name: string;
  amount: number;
  frequency: 'monthly' | 'quarterly' | 'yearly';
  incomeType: 'salary' | 'freelance' | 'investment' | 'other' | 'rsu' | 'regular';
  includeInHealth: boolean;
  paid?: boolean;
  /** API sends this for income source label */
  source?: string;
  // RSU specific
  rsuVestingSchedule?: any[];
  rsuCurrency?: string;
  rsuStockPrice?: number;
  rsuTaxRate?: number;
  rsuExpectedDecline?: number;
  rsuConversionRate?: number;
  rsuTicker?: string;
  rsuGrantCount?: number;
  rsuPriceUpdatedAt?: string;
  // Encryption
  amount_enc?: string;
  amount_iv?: string;
  name_enc?: string;
  name_iv?: string;
}

export interface FixedExpense {
  id: string;
  userId: string;
  name: string;
  amount: number;
  frequency: 'monthly' | 'quarterly' | 'yearly';
  category: string;
  startDate?: string;
  endDate?: string;
  isSipFlag: boolean;
  accumulatedFunds: number;
  paid: boolean;
  isSkipped: boolean;
}

export interface VariablePlan {
  id: string;
  userId: string;
  name: string;
  planned: number;
  category: string;
  startDate: string;
  endDate?: string;
  actuals: VariableActual[];
  actualTotal?: number;
}

export interface VariableActual {
  id: string;
  planId: string;
  amount: number;
  subcategory?: string;
  note?: string;
  justification?: string;
  paymentMode: 'UPI' | 'Cash' | 'ExtraCash' | 'CreditCard';
  creditCardId?: string;
  incurredAt: string;
}

export interface Investment {
  id: string;
  userId: string;
  name: string;
  monthlyAmount: number;
  accumulatedFunds: number;
  status: 'active' | 'paused';
  isPriority: boolean;
  paid: boolean;
  goal?: string;
}

export interface CreditCard {
  id: string;
  userId: string;
  name: string;
  billAmount: number;
  paidAmount: number;
  dueDate: string;
  billingDate?: number;
  statementDate?: string;
  currentExpenses?: number;
  needsBillUpdate?: boolean;
  createdAt?: string;
}

export interface FutureBomb {
  id: string;
  userId: string;
  name: string;
  totalAmount: number;
  savedAmount: number;
  dueDate: string;
  monthlyEquivalent?: number;
  preparednessRatio?: number;
  monthsUntilDue?: number;
  defusalMonths?: number;
  remaining?: number;
}

export interface Loan {
  id: string;
  userId: string;
  name: string;
  totalAmount: number;
  paidAmount: number;
  interestRate: number;
  emiAmount: number;
  emi?: number;
}

export interface Payment {
  id: string;
  userId: string;
  entityType: 'fixed_expense' | 'investment' | 'loan';
  entityId: string;
  month: string;
  amount: number;
  isSkip: boolean;
  paidAt?: string;
}

export interface UserPreferences {
  userId?: string;
  monthStartDay: number;
  currency: string;
  lastAccumulationDate?: string;
}

export interface SharedMember {
  userId: string;
  username: string;
  display_name?: string | null;
  role: 'owner' | 'member';
  sharedAccountId: string;
  shared_user_id?: string;
  user_id?: string;
}

export interface UserAggregate {
  userId: string;
  username?: string;
  display_name?: string | null;
  totalIncomeMonthly: number;
  totalFixedMonthly: number;
  totalInvestmentsMonthly: number;
  totalVariablePlanned: number;
  totalVariableActual: number;
  totalCreditCardDues: number;
}

export interface DashboardData {
  incomes: Income[];
  fixedExpenses: FixedExpense[];
  variablePlans: VariablePlan[];
  investments: Investment[];
  futureBombs: FutureBomb[];
  creditCards: CreditCard[];
  loans: Loan[];
  payments?: Payment[];
  sharedMembers?: SharedMember[];
  sharedUserAggregates?: UserAggregate[];
  activities?: Activity[];
  healthScore?: number;
  health?: { remaining: number; category: string; score: number };
  constraintScore?: any;
  userPreferences?: UserPreferences;
  preferences?: UserPreferences;
  healthThresholds?: any;
  _notificationCount?: number;
}

export interface Activity {
  id: string;
  actorId: string;
  username?: string;
  entity: string;
  action: string;
  payload: Record<string, any>;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
}
