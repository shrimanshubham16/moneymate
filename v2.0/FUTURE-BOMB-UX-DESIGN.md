# 💣 Future Bomb Feature - UX Design Document

## 🎯 User Problem Statement

**Scenario:** A regular household user needs to prepare for a large, infrequent expense.

**Examples:**
- Annual insurance premium (₹50,000 due in 6 months)
- Car maintenance (₹30,000 expected in 3 months)
- Wedding expenses (₹2,00,000 in 1 year)
- School fees (₹1,00,000 in 4 months)
- Home renovation (₹5,00,000 in 8 months)

**User's Mental Journey:**
1. "I have this big expense coming"
2. "How much do I need to save?"
3. "Can I afford to save that much?"
4. "When should I start?"
5. "How do I track my progress?"
6. "What if I can't save enough?"

---

## 🧠 User Research Insights

### Common User Behaviors

1. **Procrastination**
   - Users often forget about future expenses
   - Don't start saving until it's too late
   - Underestimate the impact

2. **Uncertainty**
   - Don't know how much to save monthly
   - Worried about affecting current finances
   - Need reassurance

3. **Tracking Difficulty**
   - Hard to track progress manually
   - Forget how much they've saved
   - Don't know if they're on track

4. **Financial Stress**
   - Large expenses cause anxiety
   - Worried about not having enough
   - Need clear visibility

---

## 💡 Proposed Solution

### Core Concept: "Future Expense Planning"

**Key Principles:**
1. **Proactive:** Help users plan ahead
2. **Visual:** Show progress clearly
3. **Flexible:** Multiple saving strategies
4. **Reassuring:** Clear communication about impact
5. **Actionable:** Simple steps to get started

---

## 🎨 UX Flow Design

### Entry Point 1: Dashboard Widget

**Widget Design:**
```
┌─────────────────────────────────┐
│  💣 Future Expenses              │
│                                  │
│  No future expenses planned      │
│                                  │
│  [Plan for Future Expense]       │
└─────────────────────────────────┘
```

**When User Has Future Bombs:**
```
┌─────────────────────────────────┐
│  💣 Future Expenses              │
│                                  │
│  Insurance Premium               │
│  ████████░░ 60% (₹30k / ₹50k)   │
│  3 months remaining              │
│                                  │
│  Car Maintenance                 │
│  ████░░░░░░ 40% (₹12k / ₹30k)   │
│  2 months remaining              │
│                                  │
│  [View All] [Add New]           │
└─────────────────────────────────┘
```

### Entry Point 2: Health Page Alert

**When Health Score is Good:**
```
┌─────────────────────────────────┐
│  💡 Planning Tip                 │
│                                  │
│  You have ₹15,000 remaining.    │
│  Consider planning for future   │
│  large expenses to avoid         │
│  financial surprises.            │
│                                  │
│  [Plan Future Expense]           │
└─────────────────────────────────┘
```

### Entry Point 3: Settings Menu

**Settings → Plan Finances → Future Expenses**

---

## 📝 Add Future Bomb Flow

### Step 1: Quick Add (Simple)

**Modal/Page:**
```
┌─────────────────────────────────┐
│  Plan for Future Expense         │
│                                  │
│  What's the expense?             │
│  [Insurance Premium________]     │
│                                  │
│  When is it due?                 │
│  [📅 June 15, 2025]              │
│                                  │
│  Total amount needed?            │
│  [₹50,000________]               │
│                                  │
│  [Cancel]  [Next →]              │
└─────────────────────────────────┘
```

### Step 2: Planning Options (Smart)

**After Step 1, show smart suggestions:**
```
┌─────────────────────────────────┐
│  Smart Planning                  │
│                                  │
│  To save ₹50,000 by June 15:    │
│                                  │
│  💡 Recommended:                 │
│  Save ₹8,333/month               │
│  Start: This month               │
│  Impact: Reduces health score    │
│  by ₹8,333/month                 │
│                                  │
│  [Use This Plan]                 │
│                                  │
│  Or customize:                   │
│  [ ] Auto-deduct from health     │
│      score (recommended)         │
│  [ ] Manual tracking only       │
│  [ ] Start saving from:          │
│      [Next month]                │
│                                  │
│  [← Back]  [Save Plan]           │
└─────────────────────────────────┘
```

### Step 3: Confirmation

**Show impact clearly:**
```
┌─────────────────────────────────┐
│  ✅ Future Expense Planned!      │
│                                  │
│  Insurance Premium               │
│  Due: June 15, 2025              │
│  Amount: ₹50,000                 │
│                                  │
│  Monthly savings: ₹8,333         │
│  This will reduce your monthly   │
│  health score by ₹8,333          │
│                                  │
│  [View on Dashboard] [Done]      │
└─────────────────────────────────┘
```

---

## 📊 Dashboard Integration

### Widget Design (Detailed)

**Expanded View:**
```
┌─────────────────────────────────┐
│  💣 Future Expenses              │
│                                  │
│  ┌─────────────────────────┐   │
│  │ Insurance Premium         │   │
│  │                           │   │
│  │ Progress:                 │   │
│  │ ████████░░ 60%            │   │
│  │ ₹30,000 / ₹50,000         │   │
│  │                           │   │
│  │ Timeline:                 │   │
│  │ Today ──────● Due Date    │   │
│  │       3 months left       │   │
│  │                           │   │
│  │ Monthly: ₹8,333          │   │
│  │ Status: ✅ On Track       │   │
│  │                           │   │
│  │ [Update] [View Details]  │   │
│  └─────────────────────────┘   │
│                                  │
│  [Add New Future Expense]        │
└─────────────────────────────────┘
```

### Status Indicators

**On Track:**
- Green progress bar
- "✅ On Track" badge
- "Great progress!" message

**Behind:**
- Orange/Red progress bar
- "⚠️ Behind Schedule" badge
- "You need to save ₹X more/month"

**Ahead:**
- Green progress bar
- "🎉 Ahead of Schedule" badge
- "You're doing great!"

**Completed:**
- Full progress bar
- "✅ Completed" badge
- "Ready for your expense!"

---

## 🎯 Health Score Integration

### Option 1: Auto-Deduct (Recommended)

**How it works:**
- Future bomb monthly contribution reduces available funds
- Health score calculation includes future bomb savings
- User sees impact immediately

**Example:**
```
Health Score Calculation:
Income: ₹50,000
Expenses: ₹30,000
Investments: ₹5,000
Future Bomb Savings: ₹8,333  ← Deducted
────────────────────────────
Remaining: ₹6,667
```

**User sees:**
- Health score reflects future savings
- Clear indication: "₹8,333 reserved for Insurance"
- Reassurance: "You're on track"

### Option 2: Manual Tracking

**How it works:**
- Future bomb tracked separately
- Doesn't affect health score
- User manually updates saved amount

**Use case:**
- User wants flexibility
- Savings come from separate account
- User tracks externally

---

## 🔔 Alerts & Notifications

### Alert Types

**1. Behind Schedule**
```
⚠️ Future Expense Alert

Insurance Premium is behind schedule.
You need to save ₹10,000 more this month
to stay on track.

Current: ₹20,000 / ₹50,000
Needed: ₹10,000 more this month

[Update Savings] [Adjust Plan]
```

**2. Due Soon**
```
⏰ Reminder

Insurance Premium is due in 1 month.
You have ₹45,000 saved (90% complete).

[View Details] [Mark as Paid]
```

**3. Completed**
```
🎉 Goal Achieved!

Insurance Premium savings complete!
₹50,000 ready for your expense.

[Mark Expense as Paid] [Archive]
```

---

## 📱 Mobile Considerations

### Simplified Mobile View
- Card-based layout
- Swipe to see details
- Quick actions (Update, Pay, Delete)
- Progress visualization

---

## 🎨 Visual Design

### Progress Visualization

**Option 1: Progress Bar**
```
Insurance Premium
████████░░ 60%
₹30,000 / ₹50,000
```

**Option 2: Circular Progress**
```
    60%
  ┌─────┐
  │ 30k │
  │/50k │
  └─────┘
```

**Option 3: Timeline**
```
Today ──────────────● Due Date
  │                    │
  │  Save ₹8,333/mo   │
  │  Progress: 60%    │
  └────────────────────┘
```

---

## 🔄 User Actions

### Available Actions

1. **View Details**
   - Full information
   - Payment history
   - Timeline view

2. **Update Savings**
   - Manually update saved amount
   - Add one-time contribution
   - Adjust monthly amount

3. **Mark as Paid**
   - Expense completed
   - Archive future bomb
   - Update health score

4. **Edit Plan**
   - Change amount
   - Change due date
   - Adjust monthly savings

5. **Delete**
   - Remove future bomb
   - Restore health score
   - Confirmation required

---

## 📊 Data Model

```typescript
type FutureBomb = {
  id: string;
  userId: string;
  
  // Encrypted fields
  name_encrypted: string;
  name_iv: string;
  totalAmount_encrypted: string;
  totalAmount_iv: string;
  savedAmount_encrypted: string;
  savedAmount_iv: string;
  
  // Metadata (not encrypted)
  dueDate: string;
  monthlyContribution: number; // Calculated
  autoDeduct: boolean;
  status: "on-track" | "behind" | "ahead" | "completed";
  createdAt: string;
  updatedAt: string;
  
  // Payment tracking
  payments: {
    date: string;
    amount: number; // Encrypted
    source: string; // "manual" | "auto"
  }[];
}
```

---

## 🚀 Implementation Priority

### Phase 1: Core (MVP)
- [ ] Add future bomb form
- [ ] Basic progress tracking
- [ ] Dashboard widget
- [ ] Auto-deduct option

### Phase 2: Enhanced
- [ ] Smart suggestions
- [ ] Alerts system
- [ ] Timeline visualization
- [ ] Payment history

### Phase 3: Advanced
- [ ] Multiple saving strategies
- [ ] Integration with investments
- [ ] Sharing support
- [ ] Mobile optimizations

---

**Key Success Metrics:**
- Users create future bombs
- Users stay on track (80%+ completion rate)
- Users find it helpful (feedback)
- Reduces financial stress (user reports)

