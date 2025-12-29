# 🏗️ FinFlow v2.0 - Architecture & System Design

**Branch:** `feature/v2.0-development`  
**Status:** Planning Phase  
**Priority:** Performance & Zero Data Loss

---

## 🎯 Core Principles

### 1. **Zero Data Loss**
- All data operations must be atomic
- Write-ahead logging (WAL) for critical operations
- Automatic backups before major operations
- Data migration with rollback capability
- Transaction support for multi-step operations

### 2. **Performance First**
- Code splitting and lazy loading
- Database optimization (if we move to DB)
- Caching strategies
- Optimistic UI updates
- Background sync

### 3. **Security & Privacy**
- End-to-end encryption (E2E)
- Zero-knowledge architecture
- Client-side key derivation
- Encrypted data storage
- Secure key management

---

## 📊 Current Architecture Analysis

### Current State (v1.2)
- **Storage:** Single JSON file (`data/finflow-data.json`)
- **Backend:** Node.js/Express with file-based persistence
- **Frontend:** React/Vite, monolithic bundle (~1.1MB)
- **Encryption:** None (plain text)
- **Data Loss Risk:** High (single file, no backups, no transactions)

### Problems
1. **Single Point of Failure:** One JSON file = risk of corruption
2. **No Transactions:** Multi-step operations can fail mid-way
3. **No Backups:** Data loss is permanent
4. **Large Bundle:** 1.1MB JavaScript = slow load times
5. **No Encryption:** Data is plain text
6. **Synchronous I/O:** Blocks on every save

---

## 🏛️ Proposed v2.0 Architecture

### Option A: Enhanced File-Based (Recommended for v2.0)

**Why:** Minimal migration risk, can implement E2E encryption, add safety features

#### Storage Architecture
```
data/
├── users/
│   ├── {userId}/
│   │   ├── data.json (encrypted)
│   │   ├── backup-{timestamp}.json
│   │   └── wal.log (write-ahead log)
│   └── ...
├── migrations/
│   └── v2.0-migration-{timestamp}.json
└── global/
    └── metadata.json
```

#### Key Features
- **Per-User Files:** Isolated storage per user
- **Write-Ahead Logging:** All writes logged before commit
- **Automatic Backups:** Before every write operation
- **Atomic Writes:** Use temp file + rename pattern
- **Encryption:** Client-side encryption before storage

#### Pros
- ✅ Zero migration risk (can migrate gradually)
- ✅ Easy to implement
- ✅ Maintains current simplicity
- ✅ Can add E2E encryption
- ✅ Per-user isolation

#### Cons
- ⚠️ Still file-based (scaling limits)
- ⚠️ No concurrent write handling
- ⚠️ File system dependency

---

### Option B: SQLite Database (Future Consideration)

**Why:** Better for transactions, concurrent access, queries

#### Storage Architecture
```
data/
├── finflow.db (SQLite database)
├── backups/
│   └── finflow-{timestamp}.db
└── wal/
    └── finflow-wal.db
```

#### Key Features
- **ACID Transactions:** Guaranteed data integrity
- **Concurrent Access:** SQLite handles locking
- **Query Optimization:** Indexed queries
- **Backup Support:** Built-in backup utilities
- **Encryption:** SQLCipher for encrypted storage

#### Pros
- ✅ ACID transactions
- ✅ Better performance for queries
- ✅ Concurrent access support
- ✅ Industry standard

#### Cons
- ⚠️ Migration complexity
- ⚠️ Additional dependency
- ⚠️ More complex setup

---

## 🔐 E2E Encryption Architecture

### Key Derivation
```typescript
// Frontend: Derive encryption key from user password
async function deriveKey(password: string, username: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + username);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return await crypto.subtle.importKey(
    'raw',
    hash,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}
```

### Encryption Flow
```
User Input → Encrypt (Client) → Send Encrypted → Store Encrypted
                                    ↓
                            Server Never Sees Plaintext
```

### Data Model (Encrypted)
```typescript
// All sensitive fields encrypted
type EncryptedIncome = {
  id: string;
  userId: string;
  name_encrypted: string;  // Base64 encrypted
  name_iv: string;          // Initialization vector
  amount_encrypted: string;
  amount_iv: string;
  // ... metadata (not encrypted)
  frequency: "monthly" | "quarterly" | "yearly";
  createdAt: string;
}
```

### Key Management
- **Storage:** Key never stored, derived on login
- **Memory:** Key stored in memory only (cleared on logout)
- **Recovery:** Not possible (by design for E2E)

---

## 💣 Future Bomb Feature - User-First Approach

### User Problem Analysis

**Scenario:** User needs to save ₹50,000 for insurance due in 6 months

**Current Mental Model:**
1. "I need ₹50,000 in 6 months"
2. "That's ₹8,333 per month"
3. "Can I afford ₹8,333/month?"
4. "Where will I get this money?"
5. "Should I start saving now?"

**User Questions:**
- How much should I save monthly?
- When should I start?
- Will this affect my current month's health score?
- What if I can't save enough?
- Can I track progress?

### Proposed UX Flow

#### Step 1: Discovery
**Trigger:** User thinks "I have a big expense coming"

**Entry Points:**
- Dashboard widget: "Upcoming Large Expenses?"
- Settings: "Plan for Future Expenses"
- Health page: "Worried about future expenses?"

#### Step 2: Input
**Simple Form:**
```
What's the expense? [________________]
When is it due?     [Date Picker]
How much total?     [₹________]
```

**Smart Suggestions:**
- "Based on your income, you should save ₹X/month"
- "If you start now, you'll have ₹Y saved by due date"
- "This will reduce your monthly health score by ₹Z"

#### Step 3: Planning
**Visual Timeline:**
```
Today ──────────────── Due Date
  │                      │
  │  Save ₹8,333/month  │
  │  Total: ₹50,000     │
  └──────────────────────┘
```

**Options:**
- Auto-deduct from health score (recommended)
- Manual tracking (user controls)
- SIP-style (like fixed expenses)

#### Step 4: Tracking
**Dashboard Widget:**
- Progress bar: "Insurance: 60% saved (₹30,000 / ₹50,000)"
- Time remaining: "3 months left"
- Monthly contribution: "₹8,333/month"

**Alerts:**
- "You're behind on savings goal"
- "Great! You're ahead of schedule"
- "Only 1 month left, you need ₹X more"

### Technical Implementation

```typescript
type FutureBomb = {
  id: string;
  userId: string;
  name: string; // Encrypted
  dueDate: string;
  totalAmount: number; // Encrypted
  savedAmount: number; // Encrypted
  monthlyContribution: number; // Calculated
  autoDeduct: boolean; // Affects health score?
  status: "on-track" | "behind" | "ahead" | "completed";
  createdAt: string;
}
```

### Health Score Integration
- If `autoDeduct: true`: Reduces available funds monthly
- If `autoDeduct: false`: Shows as separate tracking
- Progress affects health score calculation

---

## 👥 Sharing Feature - User-First Approach

### User Problem Analysis

**Scenario:** Family wants to track shared expenses (rent, groceries, utilities)

**Current Mental Model:**
1. "We share expenses"
2. "Who paid what?"
3. "How much do I owe?"
4. "How much am I owed?"
5. "What's our combined financial health?"

**User Questions:**
- How do we share expenses?
- Can I see their finances?
- How do we split bills?
- What if someone doesn't pay?
- Can we merge our health scores?

### Proposed UX Flow

#### Step 1: Invitation
**Entry Point:** Settings → Sharing → "Share with Family/Friends"

**Simple Flow:**
```
1. Enter their username/email
2. Choose role: Viewer / Editor
3. Choose merge: Yes / No
4. Send invite
```

**Roles:**
- **Viewer:** Can see shared finances, cannot edit
- **Editor:** Can add/edit shared expenses
- **Owner:** Full control (inviter)

**Merge Options:**
- **Yes:** Combined health score, shared expenses affect both
- **No:** Separate tracking, just visibility

#### Step 2: Shared Account
**Concept:** "Shared Account" separate from personal account

**Shared Entities:**
- Shared Income (e.g., "Family Income")
- Shared Expenses (e.g., "Rent", "Groceries")
- Shared Investments
- Shared Credit Cards

**Personal Entities:**
- Personal income
- Personal expenses
- Personal investments
- Personal credit cards

#### Step 3: Dashboard View
**Toggle:** "Personal" / "Shared" / "Combined"

**Combined View:**
- Combined health score
- All expenses together
- Split view: "You: ₹X, Shared: ₹Y"

#### Step 4: Expense Splitting
**When adding shared expense:**
```
Expense: Groceries - ₹5,000
Split: [You: ₹2,500] [Them: ₹2,500]
       [Equal] [Custom] [Percentage]
```

**Tracking:**
- "You paid: ₹3,000"
- "They paid: ₹2,000"
- "Balance: You owe ₹500"

### Technical Implementation

#### E2E Encryption Challenge
**Problem:** Shared data needs to be decryptable by multiple users

**Solution:** Shared encryption key derived from shared secret

```typescript
// Shared account key derivation
async function deriveSharedKey(
  user1Password: string,
  user2Password: string,
  sharedAccountId: string
): Promise<CryptoKey> {
  // Combine both passwords + account ID
  const combined = user1Password + user2Password + sharedAccountId;
  // Derive key
  // Both users must know each other's passwords (or use key exchange)
}
```

**Alternative:** Key Exchange Protocol
1. User A creates shared account
2. User A generates shared key
3. User A encrypts shared key with User B's public key
4. User B decrypts shared key with their private key
5. Both users can decrypt shared data

#### Data Model
```typescript
type SharedAccount = {
  id: string;
  name: string; // Encrypted with shared key
  createdBy: string;
  sharedKey_encrypted: string; // Encrypted with each user's key
  members: SharedMember[];
}

type SharedMember = {
  id: string;
  userId: string;
  sharedAccountId: string;
  role: "owner" | "editor" | "viewer";
  mergeFinances: boolean;
  joinedAt: string;
}

type SharedExpense = {
  id: string;
  sharedAccountId: string;
  name_encrypted: string;
  amount_encrypted: string;
  paidBy: string; // userId
  split: { userId: string; amount: number }[]; // Encrypted
}
```

---

## ⚡ Performance Optimization

### 1. Code Splitting

#### Route-Based Splitting
```typescript
// Lazy load routes
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const HealthDetailsPage = lazy(() => import("./pages/HealthDetailsPage"));
// ... etc
```

#### Component Splitting
```typescript
// Heavy components
const Charts = lazy(() => import("./components/Charts"));
const ExportPage = lazy(() => import("./pages/ExportPage"));
```

#### Expected Impact
- **Initial Bundle:** ~300KB (down from 1.1MB)
- **Load Time:** <2s (down from 5-8s)
- **Time to Interactive:** <3s

### 2. Caching Strategy

#### Frontend Caching
- **Dashboard Data:** Cache for 30s (stale-while-revalidate)
- **Static Assets:** Long-term cache (1 year)
- **API Responses:** Cache with ETags

#### Backend Caching
- **Health Score:** Cache per user (invalidate on data change)
- **Computed Values:** Cache monthly equivalents

### 3. Database Optimization (If Moving to SQLite)

#### Indexes
```sql
CREATE INDEX idx_incomes_userid ON incomes(userId);
CREATE INDEX idx_expenses_userid ON expenses(userId);
CREATE INDEX idx_expenses_date ON expenses(createdAt);
```

#### Query Optimization
- Batch operations
- Pagination for large datasets
- Selective field loading

---

## 🎨 UI/UX Upgrades

### Theme System Architecture

#### Theme Structure
```typescript
type Theme = {
  id: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
    accent: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  animations: {
    pageTransition: string;
    buttonHover: string;
  };
  effects: {
    background: string; // Matrix rain, anime particles, etc.
    loader: string; // Matrix, anime, etc.
  };
}
```

#### Available Themes

**1. Matrix Theme**
- Colors: Black, Matrix Green (#00ff41)
- Fonts: Monospace
- Effects: Matrix rain background
- Loader: Matrix loader (already implemented)
- Animations: Glitch effects, digital transitions

**2. Anime Theme**
- Colors: Vibrant, pastel palette
- Fonts: Rounded, friendly
- Effects: Particle animations, sakura petals
- Loader: Anime-style spinner
- Animations: Bounce, fade, slide

**3. Default Theme (Current)**
- Keep existing CRED/Blissy design
- Option to switch back

#### Theme Implementation
```typescript
// Theme context
const ThemeContext = createContext<Theme>();

// Theme provider
function ThemeProvider({ children }) {
  const [theme, setTheme] = useState<Theme>(getStoredTheme());
  
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <div className={`app theme-${theme.id}`}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}
```

---

## 📋 Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Create v2.0 branch
- [ ] Implement write-ahead logging
- [ ] Add automatic backups
- [ ] Implement atomic writes
- [ ] Add data migration framework

### Phase 2: E2E Encryption (Week 3-4)
- [ ] Key derivation from password
- [ ] Client-side encryption service
- [ ] Encrypted data model
- [ ] Migration from plaintext to encrypted
- [ ] Key management

### Phase 3: Performance (Week 5)
- [ ] Code splitting (routes)
- [ ] Lazy loading components
- [ ] Caching strategy
- [ ] Bundle optimization

### Phase 4: Future Bomb (Week 6-7)
- [ ] User research & UX design
- [ ] Future bomb data model
- [ ] Dashboard integration
- [ ] Progress tracking
- [ ] Alerts system

### Phase 5: Sharing (Week 8-10)
- [ ] User research & UX design
- [ ] Shared account model
- [ ] Key exchange protocol
- [ ] Shared expense splitting
- [ ] Combined health score

### Phase 6: UI/UX Upgrades (Week 11-12)
- [ ] Theme system architecture
- [ ] Matrix theme implementation
- [ ] Anime theme implementation
- [ ] Theme switcher UI
- [ ] Animation library

---

## 🔒 Data Loss Prevention Strategy

### 1. Write-Ahead Logging (WAL)
```typescript
// Before every write
function writeWithWAL(userId: string, data: any) {
  // 1. Write to WAL
  appendToWAL(userId, data);
  
  // 2. Write to main file
  writeToFile(userId, data);
  
  // 3. Clear WAL on success
  clearWAL(userId);
}
```

### 2. Automatic Backups
```typescript
// Before every write operation
function backupBeforeWrite(userId: string) {
  const timestamp = Date.now();
  const backupPath = `data/users/${userId}/backup-${timestamp}.json`;
  copyFile(getDataPath(userId), backupPath);
  
  // Keep only last 5 backups
  cleanupOldBackups(userId, 5);
}
```

### 3. Atomic Writes
```typescript
// Use temp file + rename pattern
function atomicWrite(userId: string, data: any) {
  const tempPath = getDataPath(userId) + '.tmp';
  const finalPath = getDataPath(userId);
  
  // Write to temp
  writeFileSync(tempPath, JSON.stringify(data));
  
  // Atomic rename (OS-level)
  renameSync(tempPath, finalPath);
}
```

### 4. Transaction Support
```typescript
// Multi-step operations
function transaction(operations: Operation[]) {
  const rollback: Operation[] = [];
  
  try {
    for (const op of operations) {
      const backup = executeOperation(op);
      rollback.push(backup);
    }
    commit();
  } catch (error) {
    // Rollback all operations
    for (const op of rollback.reverse()) {
      rollbackOperation(op);
    }
    throw error;
  }
}
```

### 5. Data Validation
```typescript
// Validate before write
function validateData(data: any): boolean {
  // Schema validation
  // Integrity checks
  // Consistency checks
  return isValid;
}
```

---

## 📊 Performance Targets

### Load Time
- **Current:** 5-8 seconds (1.1MB bundle)
- **Target:** <2 seconds (300KB initial bundle)
- **Improvement:** 75% faster

### Time to Interactive
- **Current:** 8-10 seconds
- **Target:** <3 seconds
- **Improvement:** 70% faster

### API Response Time
- **Current:** 200-500ms
- **Target:** <100ms (with caching)
- **Improvement:** 80% faster

---

## 🚀 Migration Strategy

### From v1.2 to v2.0

#### Step 1: Dual Write
- Write to both old and new format
- Read from old format
- Validate both formats match

#### Step 2: Gradual Migration
- Migrate users in batches
- Test with small user group first
- Monitor for errors

#### Step 3: Encryption Migration
- For existing users: Re-encrypt on next login
- For new users: Encrypt from start
- Provide migration tool

#### Step 4: Rollback Plan
- Keep v1.2 code for 1 month
- Ability to rollback per user
- Data format compatibility

---

## 📝 Next Steps

1. **Review this architecture plan**
2. **Decide on storage approach** (File-based vs SQLite)
3. **Create detailed feature specs** for Future Bomb and Sharing
4. **Design E2E encryption key exchange** for sharing
5. **Create UI mockups** for new features
6. **Start Phase 1 implementation**

---

**Remember:** User experience first, then technical implementation. 🚀

