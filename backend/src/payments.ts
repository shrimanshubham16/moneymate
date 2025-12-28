// Payment tracking for fixed expenses and investments
// Tracks monthly payments per user

export type PaymentRecord = {
  id: string;
  userId: string;
  itemId: string;
  itemType: 'fixed_expense' | 'investment' | 'loan';
  month: string; // YYYY-MM format
  paidAmount: number;
  paidAt: string; // ISO timestamp
};

let payments: PaymentRecord[] = [];

export function markAsPaid(
  userId: string,
  itemId: string,
  itemType: 'fixed_expense' | 'investment' | 'loan',
  amount: number
): PaymentRecord {
  const month = getCurrentMonth();
  
  // Check if already paid this month
  const existing = payments.find(
    p => p.userId === userId && p.itemId === itemId && p.itemType === itemType && p.month === month
  );
  
  if (existing) {
    // Update existing payment
    existing.paidAmount = amount;
    existing.paidAt = new Date().toISOString();
    return existing;
  }
  
  // Create new payment record
  const payment: PaymentRecord = {
    id: `pay-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    userId,
    itemId,
    itemType,
    month,
    paidAmount: amount,
    paidAt: new Date().toISOString()
  };
  
  payments.push(payment);
  return payment;
}

export function markAsUnpaid(
  userId: string,
  itemId: string,
  itemType: 'fixed_expense' | 'investment' | 'loan'
): boolean {
  const month = getCurrentMonth();
  const index = payments.findIndex(
    p => p.userId === userId && p.itemId === itemId && p.itemType === itemType && p.month === month
  );
  
  if (index >= 0) {
    payments.splice(index, 1);
    return true;
  }
  
  return false;
}

export function isPaid(
  userId: string,
  itemId: string,
  itemType: 'fixed_expense' | 'investment' | 'loan',
  month?: string
): boolean {
  const targetMonth = month || getCurrentMonth();
  return payments.some(
    p => p.userId === userId && p.itemId === itemId && p.itemType === itemType && p.month === targetMonth
  );
}

export function getPaymentStatus(
  userId: string,
  month?: string
): Record<string, boolean> {
  const targetMonth = month || getCurrentMonth();
  const userPayments = payments.filter(p => p.userId === userId && p.month === targetMonth);
  
  const status: Record<string, boolean> = {};
  userPayments.forEach(p => {
    status[`${p.itemType}:${p.itemId}`] = true;
  });
  
  return status;
}

export function getUserPayments(userId: string, month?: string): PaymentRecord[] {
  const targetMonth = month || getCurrentMonth();
  return payments.filter(p => p.userId === userId && p.month === targetMonth);
}

export function clearPayments(): void {
  payments = [];
}

function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function getPaymentsSummary(userId: string, month?: string) {
  const targetMonth = month || getCurrentMonth();
  const userPayments = payments.filter(p => p.userId === userId && p.month === targetMonth);
  
  return {
    month: targetMonth,
    totalPaid: userPayments.reduce((sum, p) => sum + p.paidAmount, 0),
    fixedExpensesPaid: userPayments.filter(p => p.itemType === 'fixed_expense').length,
    investmentsPaid: userPayments.filter(p => p.itemType === 'investment').length,
    loansPaid: userPayments.filter(p => p.itemType === 'loan').length,
    payments: userPayments
  };
}

