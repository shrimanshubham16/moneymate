# 👥 Sharing Feature - UX Design Document

## 🎯 User Problem Statement

**Scenario:** Family/household wants to track shared finances together.

**Examples:**
- Couple tracking joint expenses (rent, groceries, utilities)
- Family tracking household expenses
- Roommates splitting bills
- Parents tracking family finances

**User's Mental Journey:**
1. "We share expenses"
2. "Who paid what?"
3. "How much do I owe?"
4. "How much am I owed?"
5. "What's our combined financial health?"
6. "Can we see each other's finances?"

---

## 🧠 User Research Insights

### Common Use Cases

1. **Couples**
   - Joint account expenses
   - Split bills
   - Combined financial planning
   - Transparency

2. **Families**
   - Household expenses
   - Parental oversight
   - Teaching kids about money
   - Family budget

3. **Roommates**
   - Rent splitting
   - Utility bills
   - Groceries
   - Who owes whom

### User Concerns

1. **Privacy**
   - "Do they see my personal expenses?"
   - "Can they see my salary?"
   - "What if I don't want to share everything?"

2. **Control**
   - "Who can add expenses?"
   - "Who can delete things?"
   - "What if they make mistakes?"

3. **Fairness**
   - "How do we split expenses?"
   - "What if someone doesn't pay?"
   - "How do we track who paid what?"

---

## 💡 Proposed Solution

### Core Concept: "Shared Accounts"

**Key Principles:**
1. **Separation:** Personal vs Shared finances
2. **Flexibility:** Choose what to share
3. **Transparency:** Clear visibility
4. **Control:** Role-based permissions
5. **Fairness:** Easy expense splitting

---

## 🎨 UX Flow Design

### Entry Point: Settings → Sharing

**Main Sharing Page:**
```
┌─────────────────────────────────┐
│  👥 Sharing                      │
│                                  │
│  Shared Accounts                │
│  ┌─────────────────────────┐   │
│  │ Family Account           │   │
│  │ 2 members • Editor       │   │
│  │ Combined health: ₹15,000 │   │
│  │ [View] [Settings]        │   │
│  └─────────────────────────┘   │
│                                  │
│  [Create Shared Account]         │
│                                  │
│  Pending Invitations             │
│  ┌─────────────────────────┐   │
│  │ @username invited you    │   │
│  │ Role: Editor             │   │
│  │ [Accept] [Decline]       │   │
│  └─────────────────────────┘   │
└─────────────────────────────────┘
```

---

## 📝 Create Shared Account Flow

### Step 1: Create Account

```
┌─────────────────────────────────┐
│  Create Shared Account           │
│                                  │
│  Account Name                    │
│  [Family Expenses________]       │
│                                  │
│  Description (optional)           │
│  [Household expenses for...]     │
│                                  │
│  [Cancel]  [Next →]              │
└─────────────────────────────────┘
```

### Step 2: Invite Members

```
┌─────────────────────────────────┐
│  Invite Members                  │
│                                  │
│  Enter username or email         │
│  [partner@example.com________]   │
│                                  │
│  Role                            │
│  ○ Viewer - Can see only         │
│  ● Editor - Can add/edit         │
│  ○ Owner - Full control          │
│                                  │
│  Merge Finances?                 │
│  [✓] Yes - Combined health score │
│  [ ] No - Separate tracking      │
│                                  │
│  [Add Another]                   │
│                                  │
│  [← Back]  [Send Invites]        │
└─────────────────────────────────┘
```

### Step 3: Confirmation

```
┌─────────────────────────────────┐
│  ✅ Shared Account Created!       │
│                                  │
│  Family Expenses                 │
│                                  │
│  Invitations sent to:            │
│  • partner@example.com           │
│                                  │
│  They'll receive an invitation   │
│  and can accept to join.         │
│                                  │
│  [Go to Shared Account] [Done]   │
└─────────────────────────────────┘
```

---

## 🏠 Shared Account Dashboard

### View Toggle

```
┌─────────────────────────────────┐
│  [Personal] [Shared] [Combined]  │
│         ↑ Active                 │
└─────────────────────────────────┘
```

### Combined View

```
┌─────────────────────────────────┐
│  Combined Financial Health       │
│                                  │
│  Health Score: ₹15,000          │
│  (Personal: ₹10k + Shared: ₹5k) │
│                                  │
│  ┌───────────┬───────────┐     │
│  │ Personal  │  Shared   │     │
│  │           │           │     │
│  │ Income    │ Income    │     │
│  │ ₹50,000   │ ₹30,000   │     │
│  │           │           │     │
│  │ Expenses  │ Expenses  │     │
│  │ ₹40,000   │ ₹25,000   │     │
│  └───────────┴───────────┘     │
└─────────────────────────────────┘
```

---

## 💰 Shared Expense Flow

### Add Shared Expense

```
┌─────────────────────────────────┐
│  Add Shared Expense              │
│                                  │
│  Account: Family Expenses       │
│                                  │
│  Expense Name                    │
│  [Groceries________]             │
│                                  │
│  Amount                          │
│  [₹5,000________]                │
│                                  │
│  Who Paid?                       │
│  [You] [Partner]                 │
│                                  │
│  Split Between                   │
│  [✓] You (₹2,500)                │
│  [✓] Partner (₹2,500)            │
│                                  │
│  [Equal Split] [Custom]          │
│                                  │
│  [Cancel]  [Add Expense]         │
└─────────────────────────────────┘
```

### Expense Splitting Options

**Equal Split:**
```
Total: ₹5,000
Split: 2 people
Each pays: ₹2,500
```

**Custom Split:**
```
Total: ₹5,000
You: ₹3,000 (60%)
Partner: ₹2,000 (40%)
```

**Percentage Split:**
```
Total: ₹5,000
You: 60% = ₹3,000
Partner: 40% = ₹2,000
```

---

## 📊 Balance Tracking

### Who Owes Whom

```
┌─────────────────────────────────┐
│  Expense Balances                │
│                                  │
│  You owe Partner: ₹2,500         │
│  (Groceries: ₹1,500)             │
│  (Utilities: ₹1,000)             │
│                                  │
│  Partner owes You: ₹500          │
│  (Rent: ₹500)                    │
│                                  │
│  Net: You owe ₹2,000             │
│                                  │
│  [Settle Up] [View Details]      │
└─────────────────────────────────┘
```

### Settlement

```
┌─────────────────────────────────┐
│  Settle Balance                  │
│                                  │
│  You owe Partner: ₹2,000         │
│                                  │
│  Amount to pay                   │
│  [₹2,000________]                │
│                                  │
│  Payment method                  │
│  [UPI] [Cash] [Bank Transfer]    │
│                                  │
│  [Cancel]  [Mark as Paid]        │
└─────────────────────────────────┘
```

---

## 🔐 Privacy & Permissions

### What's Shared vs Personal

**Shared (Visible to All):**
- Shared account expenses
- Shared income
- Shared investments
- Combined health score (if merged)

**Personal (Private):**
- Personal expenses
- Personal income
- Personal investments
- Personal health score (if not merged)

### Role Permissions

**Viewer:**
- ✅ Can see shared finances
- ✅ Can see combined health score
- ❌ Cannot add/edit expenses
- ❌ Cannot invite members

**Editor:**
- ✅ Can see shared finances
- ✅ Can add/edit shared expenses
- ✅ Can see combined health score
- ❌ Cannot delete account
- ❌ Cannot change roles

**Owner:**
- ✅ All Editor permissions
- ✅ Can invite/remove members
- ✅ Can change roles
- ✅ Can delete account
- ✅ Can modify account settings

---

## 🎯 Health Score Integration

### Option 1: Merged (Combined)

**How it works:**
- Personal + Shared finances combined
- Single health score for both
- Shows breakdown: "Personal: ₹X, Shared: ₹Y"

**Use case:**
- Couples with joint finances
- Families with shared expenses
- Complete financial transparency

### Option 2: Separate

**How it works:**
- Personal and Shared tracked separately
- Two health scores
- User can toggle view

**Use case:**
- Roommates splitting bills
- Partial sharing
- Privacy concerns

---

## 🔄 E2E Encryption for Sharing

### Challenge
Shared data needs to be decryptable by multiple users, but we want E2E encryption.

### Solution: Shared Key Exchange

#### Method 1: Password-Based (Simple)
```
1. User A creates shared account
2. User A sets a "shared password"
3. User A shares password with User B (out of band)
4. Both users derive shared key from password
5. Shared data encrypted with shared key
```

**Pros:**
- Simple to implement
- No key exchange protocol needed

**Cons:**
- Requires out-of-band password sharing
- Less secure (password can be intercepted)

#### Method 2: Key Exchange Protocol (Secure)
```
1. User A creates shared account
2. User A generates shared encryption key
3. User A encrypts shared key with User B's public key
4. User B receives encrypted shared key
5. User B decrypts with their private key
6. Both users have shared key
7. Shared data encrypted with shared key
```

**Pros:**
- More secure
- No password sharing needed
- Industry standard

**Cons:**
- More complex
- Requires public/private key infrastructure

#### Method 3: Hybrid (Recommended)
```
1. User A creates shared account
2. User A generates shared key
3. User A sends invitation to User B
4. User B accepts invitation
5. System generates temporary access token
6. User A encrypts shared key with token
7. User B receives and decrypts
8. Both users have shared key
```

---

## 📱 Mobile Considerations

### Simplified Mobile View
- Swipe between Personal/Shared/Combined
- Quick expense entry
- Balance summary at top
- Push notifications for invitations

---

## 🎨 Visual Design

### Shared Account Card

```
┌─────────────────────────────────┐
│  👥 Family Expenses              │
│                                  │
│  Members: You, Partner            │
│  Role: Editor                    │
│                                  │
│  Combined Health: ₹15,000        │
│  Shared Expenses: ₹5,000         │
│                                  │
│  [View Account] [Settings]       │
└─────────────────────────────────┘
```

### Expense List (Shared)

```
┌─────────────────────────────────┐
│  Shared Expenses                │
│                                  │
│  Groceries - ₹5,000              │
│  Paid by: You                    │
│  Split: You (₹2,500) + Partner   │
│  [Settled]                       │
│                                  │
│  Rent - ₹20,000                  │
│  Paid by: Partner                │
│  Split: You (₹10,000) + Partner  │
│  [You owe ₹10,000]               │
└─────────────────────────────────┘
```

---

## 🚀 Implementation Priority

### Phase 1: Core (MVP)
- [ ] Create shared account
- [ ] Invite members
- [ ] Add shared expenses
- [ ] Basic balance tracking

### Phase 2: Enhanced
- [ ] Expense splitting
- [ ] Balance settlement
- [ ] Combined health score
- [ ] Role-based permissions

### Phase 3: Advanced
- [ ] E2E encryption for sharing
- [ ] Multiple shared accounts
- [ ] Expense categories
- [ ] Payment history

---

**Key Success Metrics:**
- Users create shared accounts
- Users actively use shared expenses
- Users find it helpful (feedback)
- Reduces financial conflicts (user reports)

