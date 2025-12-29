# Credit Card Health Score Logic (v1.2)

## Design Philosophy

The health score calculation for credit cards is designed to ensure users understand their **full financial obligations**, not just what's unpaid.

## How It Works

### 1. Health Score Calculation
- **Uses FULL bill amount** (`billAmount`), not unpaid amount (`billAmount - paidAmount`)
- This means paying your credit card bill **doesn't improve your health score** until you pay MORE than the bill amount

### 2. Available Funds
- Credit card payments **do NOT reduce available funds** (they're not included in `totalPaymentsMadeThisMonth`)
- Only **overpayments** (when `paidAmount > billAmount`) reduce available funds
- Overpayments are calculated separately and subtracted from available funds

### 3. Why This Design?

**User Confusion Prevention:**
- Users were confused why paying credit card bills didn't improve their health score
- This design makes it clear: the full bill obligation is always considered

**Financial Reality:**
- A credit card bill is a financial obligation that exists regardless of payment status
- The health score reflects your ability to meet ALL obligations, not just unpaid ones
- Only when you overpay (pay more than the bill) does it affect your available funds

## Formula

```
Available Funds = Total Income - Payments Made - Credit Card Overpayments
Health Score = Available Funds - (Unpaid Fixed + Prorated Variable + Unpaid Investments + Full Credit Card Bill Amount)
```

Where:
- `Credit Card Overpayments = max(0, paidAmount - billAmount)` for each card
- `Full Credit Card Bill Amount = billAmount` (not `billAmount - paidAmount`)

## Example

**Scenario:**
- Bill Amount: ₹10,000
- Paid Amount: ₹5,000
- Remaining: ₹5,000

**Health Score Impact:**
- Full bill amount (₹10,000) is subtracted from available funds
- Paid amount (₹5,000) does NOT reduce available funds
- Health score doesn't improve until you pay MORE than ₹10,000

**If you pay ₹12,000:**
- Full bill amount (₹10,000) still subtracted from available funds
- Overpayment (₹2,000) reduces available funds
- Health score reflects the overpayment

## User Communication

The health details page now includes:
- Clear explanation that full bill amount is used
- Note that payments don't affect health score until overpaid
- Breakdown showing bill amount, paid amount, and remaining for each card

## Code Changes

### Backend (`logic.ts`)
- `unpaidCreditCardDues()`: Now returns `billAmount` (full amount), not `billAmount - paidAmount`
- `getCreditCardOverpayments()`: New function to calculate overpayments
- `computeHealthSnapshot()`: Subtracts overpayments from available funds

### Frontend (`HealthDetailsPage.tsx`)
- Updated explanation text
- Shows full bill amount in breakdown
- Displays bill/paid/remaining details for each card
- Added visual callout explaining the logic

