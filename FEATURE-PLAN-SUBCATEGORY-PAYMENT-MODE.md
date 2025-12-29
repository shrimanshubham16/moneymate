# Feature Plan: Subcategory & Payment Mode for Variable Expenses

**Date**: December 29, 2024  
**Status**: 📋 Planning Phase  
**Priority**: P1 - Enhancement

---

## 🎯 Feature Overview

Enhance variable expense actuals with:
1. **Subcategory** - User-defined subcategories with "Unspecified" as default
2. **Payment Mode** - UPI, Cash, Extra Cash, Credit Cards
3. **Credit Card Current Expenses** - Track expenses charged to credit cards
4. **Enhanced Current Month Expenses** - Beautiful categorized expense behavior visualization

---

## 📊 Current State Analysis

### Current Data Structure

**VariableExpenseActual** (Current):
```typescript
{
  id: string;
  userId: string;
  planId: string;
  amount: number;
  incurredAt: string;
  justification?: string;
}
```

**CreditCard** (Current):
```typescript
{
  id: string;
  userId: string;
  name: string;
  statementDate: string;  // Billing cycle start
  dueDate: string;        // Payment due date
  billAmount: number;     // Total bill amount
  paidAmount: number;     // Amount paid
}
```

### Current Flow

1. **Adding Variable Expense Actual**:
   - User selects plan (category is inherited from plan)
   - User enters amount
   - User optionally adds justification
   - Backend creates `VariableExpenseActual`
   - Amount is added to plan's `actualTotal`
   - Amount affects available funds (reduces health score)

2. **Current Month Expenses Page**:
   - Groups expenses by category
   - Shows fixed and variable expenses
   - Displays payment status

---

## 🎨 Proposed Changes

### 1. Data Structure Updates

#### A. Update `VariableExpenseActual`
```typescript
export type VariableExpenseActual = {
  id: string;
  userId: string;
  planId: string;
  amount: number;
  incurredAt: string;
  justification?: string;
  // NEW FIELDS:
  subcategory?: string;           // User-defined subcategory, defaults to "Unspecified"
  paymentMode: PaymentMode;        // UPI | Cash | ExtraCash | CreditCard
  creditCardId?: string;           // Required if paymentMode === "CreditCard"
};
```

#### B. Add `PaymentMode` Type
```typescript
export type PaymentMode = "UPI" | "Cash" | "ExtraCash" | "CreditCard";
```

#### C. Add User Subcategories Storage
```typescript
// New in Store:
userSubcategories: Map<string, string[]>;  // userId -> subcategories array
```

#### D. Update `CreditCard` Type
```typescript
export type CreditCard = {
  id: string;
  userId: string;
  name: string;
  statementDate: string;
  dueDate: string;
  billAmount: number;
  paidAmount: number;
  // NEW FIELDS:
  currentExpenses: number;  // Running total of expenses charged to this card
  billingDate: number;      // Day of month when bill is generated (1-31)
  needsBillUpdate?: boolean; // Flag to alert user that bill needs manual update
};
```

---

### 2. Backend Changes

#### A. Update Schema (`server.ts`)
```typescript
const variableActualSchema = z.object({
  amount: z.number().positive(),
  incurred_at: z.string(),
  justification: z.string().optional(),
  // NEW:
  subcategory: z.string().optional(),
  payment_mode: z.enum(["UPI", "Cash", "ExtraCash", "CreditCard"]),
  credit_card_id: z.string().optional().refine(
    (val, ctx) => {
      if (ctx.parent.payment_mode === "CreditCard" && !val) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Credit card ID required when payment mode is CreditCard" });
        return false;
      }
      return true;
    }
  )
});
```

#### B. Update Store Functions (`store.ts`)

**Add Subcategory Management:**
```typescript
// Store user subcategories
const userSubcategories = new Map<string, string[]>();

export function getUserSubcategories(userId: string): string[] {
  if (!userSubcategories.has(userId)) {
    userSubcategories.set(userId, ["Unspecified"]);
  }
  return userSubcategories.get(userId)!;
}

export function addUserSubcategory(userId: string, subcategory: string): void {
  const subs = getUserSubcategories(userId);
  if (!subs.includes(subcategory)) {
    subs.push(subcategory);
    scheduleSave();
  }
}
```

**Update `addVariableActual`:**
```typescript
export function addVariableActual(
  userId: string,
  data: Omit<VariableExpenseActual, "id" | "userId">
): VariableExpenseActual {
  const actual = {
    ...data,
    id: randomUUID(),
    userId,
    subcategory: data.subcategory || "Unspecified"
  };
  
  state.variableActuals.push(actual);
  
  // If payment mode is CreditCard, update credit card's currentExpenses
  if (data.paymentMode === "CreditCard" && data.creditCardId) {
    const card = state.creditCards.find(c => c.id === data.creditCardId && c.userId === userId);
    if (card) {
      card.currentExpenses += data.amount;
      scheduleSave();
    }
  }
  
  // If new subcategory, add to user's subcategories
  if (data.subcategory && data.subcategory !== "Unspecified") {
    addUserSubcategory(userId, data.subcategory);
  }
  
  scheduleSave();
  return actual;
}
```

**Update Credit Card Billing Logic:**
```typescript
// Function to reset credit card current expenses (prepare for billing)
// NOTE: Does NOT auto-update billAmount - user must manually update bill
// This allows for additional charges (fees, friend's usage) or redemptions
export function resetCreditCardCurrentExpenses(cardId: string, userId: string): void {
  const card = state.creditCards.find(c => c.id === cardId && c.userId === userId);
  if (!card) return;
  
  // Only reset currentExpenses to 0, don't touch billAmount
  // User will manually update billAmount with actual bill amount
  card.currentExpenses = 0;
  card.statementDate = new Date().toISOString().split('T')[0];
  
  // Calculate new due date (billingDate + payment terms, e.g., 20 days)
  const billingDate = new Date(card.statementDate);
  billingDate.setDate(billingDate.getDate() + 20); // 20 days payment window
  card.dueDate = billingDate.toISOString().split('T')[0];
  
  // Mark card as needing bill update
  card.needsBillUpdate = true;
  
  scheduleSave();
}

// Function to check and alert for billing dates (run daily)
export function checkAndAlertBillingDates(today: Date): void {
  const alerts: string[] = [];
  
  state.creditCards.forEach(card => {
    const todayDay = today.getDate();
    if (todayDay === card.billingDate && card.currentExpenses > 0) {
      // Don't auto-bill, just create alert
      alerts.push(`${card.name}: ₹${card.currentExpenses.toLocaleString("en-IN")} pending billing`);
    }
    
    // Also alert if card needs bill update
    if (card.needsBillUpdate) {
      alerts.push(`${card.name}: Bill needs to be updated`);
    }
  });
  
  return alerts;
}
```

#### C. Update Health Calculation (`logic.ts`)

**Modify `unpaidProratedVariableForRemainingDays`:**
```typescript
export function unpaidProratedVariableForRemainingDays(
  userId: string,
  today: Date,
  monthStartDay: number = 1
): number {
  const store = getStore();
  const monthProgress = calculateMonthProgress(today, monthStartDay);
  const remainingDaysRatio = 1 - monthProgress;

  return store.variablePlans.filter(p => p.userId === userId).reduce((sum, plan) => {
    // Get actuals for this plan
    const actuals = store.variableActuals.filter(
      a => a.planId === plan.id && 
           a.userId === userId &&
           // EXCLUDE: ExtraCash and CreditCard (they don't reduce available funds)
           a.paymentMode !== "ExtraCash" &&
           a.paymentMode !== "CreditCard"
    );
    
    const actualTotal = actuals.reduce((s, a) => s + a.amount, 0);
    const proratedForRemainingDays = plan.planned * remainingDaysRatio;
    
    // Use higher of actual (excluding non-fund-deducting modes) or prorated
    return sum + Math.max(proratedForRemainingDays, actualTotal);
  }, 0);
}
```

#### D. New API Endpoints (`server.ts`)

```typescript
// Get user subcategories
app.get("/user/subcategories", requireAuth, (req, res) => {
  const userId = (req as any).user.userId;
  res.json({ data: getUserSubcategories(userId) });
});

// Add new subcategory
app.post("/user/subcategories", requireAuth, (req, res) => {
  const userId = (req as any).user.userId;
  const parsed = z.object({ subcategory: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  
  addUserSubcategory(userId, parsed.data.subcategory);
  res.json({ data: { subcategory: parsed.data.subcategory } });
});

// Process credit card billing (manual trigger)
app.post("/debts/credit-cards/:id/bill", requireAuth, (req, res) => {
  const userId = (req as any).user.userId;
  processCreditCardBilling(req.params.id, userId);
  res.json({ data: { success: true } });
});
```

---

### 3. Frontend Changes

#### A. Update Variable Expense Actual Form (`VariableExpensesPage.tsx`)

**New Form Fields:**
```typescript
interface ActualFormState {
  amount: string;
  justification: string;
  subcategory: string;        // NEW
  paymentMode: PaymentMode;   // NEW
  creditCardId?: string;       // NEW (conditional)
  showNewSubcategory: boolean; // NEW
  newSubcategory: string;      // NEW
}

// Payment mode options
const PAYMENT_MODES = [
  { value: "UPI", label: "UPI", icon: "📱" },
  { value: "Cash", label: "Cash", icon: "💵" },
  { value: "ExtraCash", label: "Extra Cash", icon: "💰", description: "Doesn't affect available funds" },
  { value: "CreditCard", label: "Credit Card", icon: "💳", description: "Will be billed on card's billing date" }
] as const;
```

**Form UI:**
```tsx
<form onSubmit={handleActualSubmit}>
  {/* Existing: Plan selection */}
  <div className="form-group">
    <label>Select Plan *</label>
    <select value={selectedPlanId || ""} onChange={(e) => setSelectedPlanId(e.target.value)} required>
      {/* ... existing options ... */}
    </select>
  </div>

  {/* Existing: Amount */}
  <div className="form-group">
    <label>Amount *</label>
    <input type="number" value={actualForm.amount} onChange={(e) => setActualForm({ ...actualForm, amount: e.target.value })} required />
  </div>

  {/* NEW: Subcategory */}
  <div className="form-group">
    <label>Subcategory</label>
    <div style={{ display: 'flex', gap: '8px' }}>
      <select
        value={actualForm.subcategory}
        onChange={(e) => {
          if (e.target.value === "__NEW__") {
            setActualForm({ ...actualForm, showNewSubcategory: true, subcategory: "" });
          } else {
            setActualForm({ ...actualForm, subcategory: e.target.value, showNewSubcategory: false });
          }
        }}
      >
        <option value="Unspecified">Unspecified</option>
        {userSubcategories.map(sub => (
          <option key={sub} value={sub}>{sub}</option>
        ))}
        <option value="__NEW__">+ Add New Subcategory</option>
      </select>
      {actualForm.showNewSubcategory && (
        <input
          type="text"
          placeholder="Enter new subcategory"
          value={actualForm.newSubcategory}
          onChange={(e) => setActualForm({ ...actualForm, newSubcategory: e.target.value })}
          onBlur={async () => {
            if (actualForm.newSubcategory.trim()) {
              await addSubcategory(actualForm.newSubcategory.trim());
              setActualForm({ ...actualForm, subcategory: actualForm.newSubcategory.trim(), showNewSubcategory: false });
            }
          }}
        />
      )}
    </div>
  </div>

  {/* NEW: Payment Mode */}
  <div className="form-group">
    <label>Payment Mode *</label>
    <div className="payment-mode-grid">
      {PAYMENT_MODES.map(mode => (
        <label key={mode.value} className="payment-mode-option">
          <input
            type="radio"
            name="paymentMode"
            value={mode.value}
            checked={actualForm.paymentMode === mode.value}
            onChange={(e) => setActualForm({ ...actualForm, paymentMode: e.target.value as PaymentMode })}
          />
          <div className="payment-mode-content">
            <span className="payment-mode-icon">{mode.icon}</span>
            <span className="payment-mode-label">{mode.label}</span>
            {mode.description && <small>{mode.description}</small>}
          </div>
        </label>
      ))}
    </div>
  </div>

  {/* NEW: Credit Card Selection (conditional) */}
  {actualForm.paymentMode === "CreditCard" && (
    <div className="form-group">
      <label>Select Credit Card *</label>
      <select
        value={actualForm.creditCardId || ""}
        onChange={(e) => setActualForm({ ...actualForm, creditCardId: e.target.value })}
        required
      >
        <option value="">Select credit card</option>
        {creditCards.map(card => (
          <option key={card.id} value={card.id}>
            {card.name} (Current: ₹{card.currentExpenses?.toLocaleString("en-IN") || 0})
          </option>
        ))}
      </select>
      <small>This expense will be added to the card's current expenses and billed on {selectedCard?.billingDate || 'billing date'}</small>
    </div>
  )}

  {/* Existing: Justification */}
  <div className="form-group">
    <label>Justification (if overspend)</label>
    <textarea value={actualForm.justification} onChange={(e) => setActualForm({ ...actualForm, justification: e.target.value })} rows={3} />
  </div>

  <div className="form-actions">
    <button type="button" onClick={() => setShowActualForm(false)}>Cancel</button>
    <button type="submit">Add</button>
  </div>
</form>
```

#### B. Update Credit Card Display (`CreditCardsManagementPage.tsx`)

**Add Current Expenses Display:**
```tsx
<div className="card-details">
  {/* Existing fields */}
  <div className="detail-row">
    <span>Current Expenses:</span>
    <span className="amount warning">₹{card.currentExpenses?.toLocaleString("en-IN") || 0}</span>
  </div>
  <div className="detail-row">
    <span>Billing Date:</span>
    <span>Day {card.billingDate} of each month</span>
  </div>
  {/* ... rest of fields ... */}
</div>
```

**Add Manual Bill Processing:**
```tsx
{card.currentExpenses > 0 && (
  <button
    className="bill-button"
    onClick={async () => {
      if (confirm(`Generate bill for ₹${card.currentExpenses.toLocaleString("en-IN")}?`)) {
        await processBilling(card.id);
        await loadCards();
      }
    }}
  >
    Generate Bill
  </button>
)}
```

#### C. Enhanced Current Month Expenses Page (`CurrentMonthExpensesPage.tsx`)

**New Visualization Design:**

```tsx
// Group by: Category → Subcategory → Payment Mode
const expensesByCategory = expenses.reduce((acc, expense) => {
  const category = expense.category;
  const subcategory = expense.subcategory || "Unspecified";
  const paymentMode = expense.paymentMode;
  
  if (!acc[category]) acc[category] = {};
  if (!acc[category][subcategory]) acc[category][subcategory] = {};
  if (!acc[category][subcategory][paymentMode]) {
    acc[category][subcategory][paymentMode] = [];
  }
  
  acc[category][subcategory][paymentMode].push(expense);
  return acc;
}, {});

// Beautiful visualization with:
// - Category cards with expandable sections
// - Subcategory tabs/pills
// - Payment mode badges with icons
// - Expense items with details
// - Totals and breakdowns
// - Charts/graphs for spending patterns
```

**UI Components:**
- Category accordion/cards
- Subcategory filter tabs
- Payment mode badges (color-coded)
- Expense timeline/list
- Spending charts (pie, bar, line)
- Payment mode distribution
- Subcategory breakdown

---

### 4. UI/UX Design for Current Month Expenses

#### Design Concept: "Expense Behavior Dashboard"

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  Current Month Expenses - Expense Behavior Analysis     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [Summary Cards Row]                                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ Total    │ │ UPI      │ │ Cash     │ │ Credit   │  │
│  │ ₹50,000  │ │ ₹30,000  │ │ ₹15,000  │ │ ₹5,000   │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│                                                         │
│  [Category Tabs]                                        │
│  Food | Grocery | Transport | Entertainment | ...      │
│                                                         │
│  [Selected Category: Food]                              │
│  ┌─────────────────────────────────────────────────┐  │
│  │ Subcategory: [All] [Restaurants] [Delivery] ... │  │
│  ├─────────────────────────────────────────────────┤  │
│  │ Payment Mode Distribution:                      │  │
│  │ [Chart: Pie/Bar showing UPI vs Cash vs Credit]   │  │
│  ├─────────────────────────────────────────────────┤  │
│  │ Expense Timeline:                                │  │
│  │ • Jan 5 - Restaurant - ₹500 (UPI)                │  │
│  │ • Jan 8 - Delivery - ₹300 (Credit Card)          │  │
│  │ • Jan 12 - Restaurant - ₹800 (Cash)             │  │
│  │ ...                                              │  │
│  └─────────────────────────────────────────────────┘  │
│                                                         │
│  [Spending Patterns Chart]                              │
│  [Line chart showing daily/weekly spending]             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Features:**
- Interactive category/subcategory filters
- Payment mode breakdown with visual indicators
- Expense timeline with search/filter
- Spending pattern charts
- Export functionality
- Comparison with previous months

---

## 📋 Implementation Plan

### Phase 1: Backend Foundation
1. ✅ Update `VariableExpenseActual` type
2. ✅ Add `PaymentMode` type
3. ✅ Update `CreditCard` type (add `currentExpenses`, `billingDate`)
4. ✅ Add subcategory management functions
5. ✅ Update `addVariableActual` function
6. ✅ Update health calculation logic
7. ✅ Add credit card billing functions
8. ✅ Update API endpoints
9. ✅ Add new API endpoints for subcategories

### Phase 2: Frontend Form Updates
1. ✅ Update variable expense actual form
2. ✅ Add subcategory dropdown with "Add New" option
3. ✅ Add payment mode selection (radio buttons with icons)
4. ✅ Add conditional credit card selection
5. ✅ Update API calls
6. ✅ Add subcategory management API calls

### Phase 3: Credit Card Updates
1. ✅ Update credit card display (show current expenses)
2. ✅ Add billing date field to credit card form
3. ✅ Add "Generate Bill" button
4. ✅ Update credit card list to show current expenses

### Phase 4: Enhanced Current Month Expenses
1. ✅ Redesign Current Month Expenses page
2. ✅ Add category/subcategory grouping
3. ✅ Add payment mode visualization
4. ✅ Add expense timeline
5. ✅ Add charts and graphs
6. ✅ Add filters and search

### Phase 5: Testing & Polish
1. ✅ Test all payment modes
2. ✅ Test credit card billing flow
3. ✅ Test subcategory management
4. ✅ Test health calculation with new logic
5. ✅ UI/UX polish
6. ✅ Performance optimization

---

## 🔍 Key Considerations

### 1. Available Funds Calculation
- **UPI & Cash**: Reduce available funds (affect health score)
- **Extra Cash**: Don't reduce available funds (separate tracking)
- **Credit Card**: Don't reduce available funds until billed

### 2. Credit Card Billing Flow
- On billing date: Alert user that billing is due
- User manually triggers "Reset for Billing" (resets `currentExpenses` to 0)
- User manually updates `billAmount` with actual bill (may include fees, friend's usage, redemptions)
- Alert system notifies user when:
  - Billing date arrives and `currentExpenses` > 0
  - Card has `needsBillUpdate` flag set
- This approach allows flexibility for real-world scenarios (additional charges, redemptions)

### 3. Subcategory Management
- Default "Unspecified" always available
- User can add unlimited custom subcategories
- Subcategories are user-specific
- Can be reused across different plans/categories

### 4. Data Migration
- Existing `VariableExpenseActual` records: `subcategory = "Unspecified"`, `paymentMode = "Cash"` (assumed)
- Existing credit cards: `currentExpenses = 0`, `billingDate = 1` (default)

---

## 🎨 Design Inspiration

- **CRED App**: Clean card-based design, smooth animations
- **Blissy**: Modern gradients, glassmorphism
- **Mint/Personal Capital**: Comprehensive expense analysis
- **YNAB**: Category-based budgeting visualization

---

## 📝 Next Steps

1. Review and approve this plan
2. Start with Phase 1 (Backend Foundation)
3. Implement incrementally with testing at each phase
4. Gather user feedback during development
5. Polish UI/UX based on feedback

---

## 🚀 Estimated Timeline

- **Phase 1**: 2-3 days
- **Phase 2**: 2-3 days
- **Phase 3**: 1-2 days
- **Phase 4**: 3-4 days
- **Phase 5**: 2-3 days

**Total**: ~10-15 days

---

## ✅ Success Criteria

- [ ] Users can add subcategories to variable expenses
- [ ] Users can select payment mode (UPI, Cash, Extra Cash, Credit Card)
- [ ] Credit card expenses tracked separately and don't affect available funds
- [ ] Credit card billing works correctly
- [ ] Current Month Expenses page shows beautiful categorized visualization
- [ ] Health calculation correctly excludes Extra Cash and Credit Card
- [ ] All existing functionality remains intact

