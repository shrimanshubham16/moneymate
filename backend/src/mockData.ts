export type Frequency = "monthly" | "quarterly" | "yearly";
export interface User {
  id: string;
  username: string;
  passwordHash: string;
  salt?: string;  // For client-side encryption key derivation
}
export interface Income {
  id: string;
  userId: string;
  category: string;
  frequency: "monthly" | "quarterly" | "yearly";
  amount?: number;  // Legacy plaintext
  startDate: string;
  endDate?: string;
  name?: string;  // Legacy plaintext

  // Encrypted fields
  name_encrypted?: string;
  name_iv?: string;
  amount_encrypted?: string;
  amount_iv?: string;
  description?: string;  // Legacy plaintext
  description_encrypted?: string;
  description_iv?: string;
}
export type FixedExpense = { id: string; userId: string; name: string; amount: number; frequency: Frequency; category: string; isSip?: boolean; startDate?: string; endDate?: string };
export type VariableExpensePlan = { id: string; userId: string; name: string; planned: number; category: string; startDate: string; endDate?: string };
export type VariableExpenseActual = { id: string; userId: string; planId: string; amount: number; incurredAt: string; justification?: string };
export type ConstraintScore = { score: number; tier: "green" | "amber" | "red"; recentOverspends: number; decayAppliedAt: string };
export type Investment = { id: string; userId: string; name: string; goal: string; monthlyAmount: number; status: "active" | "paused" };
export type FutureBomb = { id: string; userId: string; name: string; dueDate: string; totalAmount: number; savedAmount: number; monthlyEquivalent: number; preparednessRatio: number };
export type SharedAccount = { id: string; name: string };
export type SharedMember = { id: string; sharedAccountId: string; userId: string; role: "owner" | "editor" | "viewer"; mergeFinances: boolean };
export type SharingRequest = { id: string; inviterId: string; inviteeEmail: string; role: "editor" | "viewer"; mergeFinances: boolean; status: "pending" | "approved" | "rejected" };
export type CreditCard = { id: string; userId: string; name: string; statementDate: string; dueDate: string; billAmount: number; paidAmount: number };
export type Loan = { id: string; userId: string; name: string; principal: number; remainingTenureMonths: number; emi: number };
export type Activity = { id: string; actorId: string; entity: string; action: string; payload?: any; createdAt: string };
export type ThemeState = { id: string; ownerRef: string; mode: "health_auto" | "manual"; selectedTheme?: "thunderstorms" | "reddish_dark_knight" | "green_zone"; constraintTierEffect: boolean };

export type Store = {
  users: User[];
  incomes: Income[];
  fixedExpenses: FixedExpense[];
  variablePlans: VariableExpensePlan[];
  variableActuals: VariableExpenseActual[];
  constraint: ConstraintScore;
  investments: Investment[];
  futureBombs: FutureBomb[];
  sharedAccounts: SharedAccount[];
  sharedMembers: SharedMember[];
  sharingRequests: SharingRequest[];
  creditCards: CreditCard[];
  loans: Loan[];
  activities: Activity[];
  themeStates: ThemeState[];
};

export const defaultStore: Store = {
  users: [],
  incomes: [],
  fixedExpenses: [],
  variablePlans: [],
  variableActuals: [],
  constraint: {
    score: 100,
    tier: "green",
    recentOverspends: 0,
    decayAppliedAt: new Date().toISOString()
  },
  investments: [],
  futureBombs: [],
  sharedAccounts: [],
  sharedMembers: [],
  sharingRequests: [],
  creditCards: [],
  loans: [],
  activities: [],
  themeStates: []
};

