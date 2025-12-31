# 🔐 End-to-End Encryption Implementation Plan

**Date**: January 31, 2025  
**Status**: Planning Phase  
**Current State**: Infrastructure exists, but encryption is NOT active

---

## 📊 Current State Analysis

### ✅ What's Already Built
1. **Crypto Infrastructure** (`web/src/lib/crypto.ts`):
   - ✅ `deriveKey()` - PBKDF2 key derivation from password
   - ✅ `encryptString()` / `decryptString()` - AES-GCM encryption
   - ✅ `generateRecoveryKey()` - BIP39 mnemonic recovery keys
   - ✅ `generateSalt()` / `saltFromBase64()` - Salt management

2. **Field-Level Encryption** (`web/src/utils/fieldEncryption.ts`):
   - ✅ `encryptEntity()` / `decryptEntity()` - Field-level encryption helpers
   - ✅ `SENSITIVE_FIELDS` - Mapping of fields to encrypt per entity type

3. **Crypto Context** (`web/src/contexts/CryptoContext.tsx`):
   - ✅ `CryptoProvider` - React context for encryption key
   - ✅ `useCrypto()` hook - Access to encryption key
   - ✅ Key derived on login/signup

4. **Backend Support** (`supabase/functions/api/index.ts`):
   - ✅ `encryption_salt` stored per user
   - ✅ `recovery_key_hash` stored for recovery key verification
   - ✅ Database schema supports encrypted fields (`*_encrypted`, `*_iv` columns)

### ❌ What's Missing
1. **Frontend Encryption Integration**:
   - ❌ API calls don't encrypt payloads (optional `cryptoKey?` parameter unused)
   - ❌ API responses don't decrypt encrypted fields
   - ❌ No automatic encryption/decryption in data flow

2. **Database Schema**:
   - ❌ Encrypted field columns (`*_encrypted`, `*_iv`) don't exist yet
   - ❌ Need migration to add encrypted columns

3. **Backend Decryption**:
   - ❌ Edge Function doesn't decrypt data (currently stores plaintext)
   - ❌ Need to handle both encrypted and plaintext (migration period)

4. **Data Migration**:
   - ❌ No migration script for existing users
   - ❌ No backward compatibility handling

---

## 🎯 Implementation Strategy

### **Phase 1: Database Schema Migration** (Day 1)
**Goal**: Add encrypted field columns to all tables

**Tables to Migrate**:
- `incomes` - `name_encrypted`, `name_iv`, `amount_encrypted`, `amount_iv`
- `fixed_expenses` - `name_encrypted`, `name_iv`, `amount_encrypted`, `amount_iv`
- `variable_expense_plans` - `name_encrypted`, `name_iv`, `planned_encrypted`, `planned_iv`
- `variable_expense_actuals` - `amount_encrypted`, `amount_iv`, `justification_encrypted`, `justification_iv`, `subcategory_encrypted`, `subcategory_iv`
- `investments` - `name_encrypted`, `name_iv`, `monthly_amount_encrypted`, `monthly_amount_iv`, `goal_encrypted`, `goal_iv`
- `credit_cards` - `name_encrypted`, `name_iv`, `bill_amount_encrypted`, `bill_amount_iv`, `paid_amount_encrypted`, `paid_amount_iv`, `current_expenses_encrypted`, `current_expenses_iv`
- `activities` - `payload_encrypted`, `payload_iv` (optional, payload is JSON)

**Migration SQL**:
```sql
-- Example for incomes table
ALTER TABLE incomes 
  ADD COLUMN name_encrypted TEXT,
  ADD COLUMN name_iv TEXT,
  ADD COLUMN amount_encrypted TEXT,
  ADD COLUMN amount_iv TEXT;

-- Repeat for all tables...
```

**Risk**: Low - Adding columns doesn't break existing data

---

### **Phase 2: Frontend Encryption Integration** (Day 2-3)
**Goal**: Encrypt data before sending to API, decrypt on receive

#### **2.1: Update API Layer** (`web/src/api.ts`)

**Current State**:
```typescript
async function buildBody(data: any, cryptoKey?: CryptoKey): Promise<string> {
  if (!cryptoKey) return JSON.stringify(data);  // ❌ Encryption disabled
  const encrypted = await encryptString(JSON.stringify(data), cryptoKey);
  return JSON.stringify({ payload: encrypted.ciphertext, iv: encrypted.iv });
}
```

**New Implementation**:
```typescript
import { useCrypto } from '../contexts/CryptoContext';
import { encryptEntity, decryptEntity, SENSITIVE_FIELDS } from '../utils/fieldEncryption';

// Get crypto key from context (need to pass it through)
async function buildBody(data: any, cryptoKey: CryptoKey | null, entityType: keyof typeof SENSITIVE_FIELDS): Promise<string> {
  if (!cryptoKey) {
    // During migration: send plaintext if no key
    return JSON.stringify(data);
  }
  
  // Encrypt sensitive fields only
  const encrypted = await encryptEntity(data, SENSITIVE_FIELDS[entityType], cryptoKey);
  return JSON.stringify(encrypted);
}
```

**Update All API Functions**:
- `createIncome()` → Use `buildBody(data, cryptoKey, 'income')`
- `createFixedExpense()` → Use `buildBody(data, cryptoKey, 'expense')`
- `addVariableActual()` → Use `buildBody(data, cryptoKey, 'variableActual')`
- etc.

#### **2.2: Update Response Decryption**

**Create Decryption Helper**:
```typescript
// web/src/utils/responseDecryption.ts
import { decryptEntity, SENSITIVE_FIELDS } from './fieldEncryption';

export async function decryptResponse<T>(
  response: T,
  entityType: keyof typeof SENSITIVE_FIELDS,
  cryptoKey: CryptoKey | null
): Promise<T> {
  if (!cryptoKey) return response; // During migration: return plaintext
  
  if (Array.isArray(response)) {
    return Promise.all(
      response.map(item => decryptEntity(item, SENSITIVE_FIELDS[entityType], cryptoKey))
    ) as Promise<T>;
  }
  
  return decryptEntity(response, SENSITIVE_FIELDS[entityType], cryptoKey);
}
```

**Update API Response Handlers**:
```typescript
export async function fetchDashboard(token: string, asOf?: string, cryptoKey?: CryptoKey) {
  const query = asOf ? `?today=${encodeURIComponent(asOf)}` : "";
  const res = await request<{ data: any }>(`/dashboard${query}`, { method: "GET" }, token);
  
  // Decrypt all entities in dashboard response
  if (cryptoKey) {
    res.data.incomes = await decryptResponse(res.data.incomes, 'income', cryptoKey);
    res.data.fixedExpenses = await decryptResponse(res.data.fixedExpenses, 'expense', cryptoKey);
    // ... etc
  }
  
  return res;
}
```

#### **2.3: Update All Pages to Use Crypto Key**

**Pattern**:
```typescript
import { useCrypto } from '../contexts/CryptoContext';

function SomePage({ token }: Props) {
  const { key: cryptoKey } = useCrypto();
  
  const handleCreate = async () => {
    await createIncome(token, data, cryptoKey);  // Pass cryptoKey
  };
  
  const loadData = async () => {
    const res = await fetchDashboard(token, date, cryptoKey);  // Pass cryptoKey
    // Data is automatically decrypted
  };
}
```

**Files to Update**:
- `DashboardPage.tsx`
- `FixedExpensesPage.tsx`
- `VariableExpensesPage.tsx`
- `InvestmentsPage.tsx`
- `CreditCardsPage.tsx`
- `LoansPage.tsx`
- `IncomePage.tsx`
- All other pages that create/read financial data

**Risk**: Medium - Need to ensure cryptoKey is available everywhere

---

### **Phase 3: Backend Encryption Support** (Day 4)
**Goal**: Edge Function stores encrypted data, handles both encrypted/plaintext

#### **3.1: Update Edge Function to Store Encrypted Fields**

**Current State** (`supabase/functions/api/index.ts`):
```typescript
// Stores plaintext
const { data, error } = await supabase.from('incomes')
  .insert({ user_id: userId, name: body.name, amount: body.amount });
```

**New Implementation**:
```typescript
// Check if data is encrypted (has *_encrypted fields) or plaintext
function isEncrypted(data: any): boolean {
  return Object.keys(data).some(key => key.endsWith('_encrypted'));
}

// Store as-is (encrypted or plaintext)
const insertData = isEncrypted(body) 
  ? { user_id: userId, ...body }  // Encrypted fields already present
  : { user_id: userId, name: body.name, amount: body.amount };  // Plaintext (migration)

const { data, error } = await supabase.from('incomes').insert(insertData);
```

#### **3.2: Update All CRUD Endpoints**

**Pattern for Each Endpoint**:
1. Check if request has encrypted fields
2. Store encrypted fields if present, otherwise store plaintext
3. Return data as-is (encrypted or plaintext)

**Endpoints to Update**:
- `POST /planning/income`
- `PUT /planning/income/:id`
- `POST /planning/fixed-expenses`
- `PUT /planning/fixed-expenses/:id`
- `POST /planning/variable-expenses`
- `POST /planning/variable-expenses/:id/actuals`
- `POST /planning/investments`
- `PUT /planning/investments/:id`
- `POST /debts/credit-cards`
- `PUT /debts/credit-cards/:id`
- `GET /dashboard` (return encrypted if stored encrypted)
- etc.

**Risk**: Medium - Need to handle both formats during migration

---

### **Phase 4: Data Migration** (Day 5)
**Goal**: Migrate existing plaintext data to encrypted format

#### **4.1: Migration Script**

**Create Migration Endpoint** (`supabase/functions/api/index.ts`):
```typescript
if (path === '/migrate/encrypt-data' && method === 'POST') {
  // This endpoint requires user to be logged in
  // User must provide password to derive encryption key
  
  const { password } = await req.json();
  
  // Derive encryption key
  const { data: user } = await supabase.from('users')
    .select('encryption_salt').eq('id', userId).single();
  
  if (!user?.encryption_salt) {
    return error('Encryption salt not found', 400);
  }
  
  // This is tricky - we need to encrypt on client side!
  // Better approach: Migration happens client-side
  return json({ message: 'Migration should happen client-side' });
}
```

#### **4.2: Client-Side Migration**

**Create Migration Component** (`web/src/pages/MigrationPage.tsx`):
```typescript
export function MigrationPage({ token }: Props) {
  const { key: cryptoKey } = useCrypto();
  const [status, setStatus] = useState<'idle' | 'migrating' | 'done'>('idle');
  
  const migrateData = async () => {
    setStatus('migrating');
    
    // 1. Fetch all plaintext data
    const dashboard = await fetchDashboard(token);
    
    // 2. Encrypt each entity
    const encryptedIncomes = await encryptEntities(
      dashboard.data.incomes,
      SENSITIVE_FIELDS.income,
      cryptoKey!
    );
    
    // 3. Update each entity with encrypted fields
    for (const income of encryptedIncomes) {
      await updateIncome(token, income.id, income, cryptoKey!);
    }
    
    // Repeat for all entity types...
    
    setStatus('done');
  };
  
  return (
    <div>
      <h1>Migrate to E2E Encryption</h1>
      <button onClick={migrateData}>Start Migration</button>
      {status === 'migrating' && <p>Migrating data...</p>}
      {status === 'done' && <p>Migration complete!</p>}
    </div>
  );
}
```

**Risk**: High - If migration fails, data could be lost. Need rollback strategy.

---

## ⚠️ Breaking Changes & Risks

### **1. Data Loss Risk** 🔴 HIGH
**Scenario**: Migration fails mid-way, leaving some data encrypted and some plaintext.

**Mitigation**:
- ✅ **Backup before migration**: Export all data first
- ✅ **Gradual migration**: Migrate one entity type at a time
- ✅ **Rollback capability**: Keep plaintext fields during migration period
- ✅ **Verification**: After migration, verify all data is accessible

### **2. Password Loss = Data Loss** 🔴 HIGH
**Scenario**: User forgets password, cannot decrypt data.

**Mitigation**:
- ✅ **Recovery Key**: Already implemented (BIP39 mnemonic)
- ✅ **Recovery Key UI**: Show recovery key prominently on signup
- ✅ **Recovery Key Verification**: Allow users to verify they saved it
- ✅ **Warning Messages**: Clear warnings about password recovery

### **3. Performance Degradation** 🟡 MEDIUM
**Scenario**: Encryption/decryption adds latency to API calls.

**Mitigation**:
- ✅ **Field-Level Encryption**: Only encrypt sensitive fields, not entire objects
- ✅ **Client-Side Caching**: Cache decrypted data in memory
- ✅ **Parallel Encryption**: Use Web Workers for encryption (if needed)
- ✅ **Benchmark**: Measure performance impact (target: <100ms overhead)

### **4. Sharing Feature Breaks** 🔴 HIGH
**Scenario**: Shared accounts can't decrypt each other's data.

**Mitigation**:
- ✅ **Key Exchange**: Implement secure key sharing mechanism
- ✅ **Shared Encryption Key**: Generate shared key for shared accounts
- ✅ **Phase 1**: Disable sharing during E2E rollout, re-enable after key exchange implemented

### **5. Export Feature Breaks** 🟡 MEDIUM
**Scenario**: Exported data is encrypted, user can't read it.

**Mitigation**:
- ✅ **Client-Side Export**: Decrypt before exporting
- ✅ **Export Endpoint**: Return decrypted data (user is authenticated)

### **6. Health Score Calculations** 🟡 MEDIUM
**Scenario**: Backend can't calculate health score from encrypted data.

**Mitigation**:
- ✅ **Client-Side Calculation**: Move health score calculation to frontend
- ✅ **Cached Scores**: Store calculated scores in database (not encrypted)
- ✅ **Background Jobs**: Calculate scores client-side, sync to backend

### **7. Search/Filter Breaks** 🔴 HIGH
**Scenario**: Can't search by name if names are encrypted.

**Mitigation**:
- ✅ **Client-Side Search**: Search decrypted data in memory
- ✅ **Encrypted Search**: Use searchable encryption (complex, future enhancement)
- ✅ **Index Fields**: Keep non-sensitive fields (category, status) unencrypted for filtering

### **8. Analytics Breaks** 🟡 MEDIUM
**Scenario**: Can't generate analytics from encrypted data.

**Mitigation**:
- ✅ **Client-Side Analytics**: Calculate analytics client-side
- ✅ **Aggregated Data**: Store aggregated metrics (not encrypted) for analytics

---

## 🚀 Rollout Plan

### **Phase 1: Preparation** (Week 1)
- [ ] Add encrypted columns to database schema
- [ ] Update Edge Function to handle both encrypted/plaintext
- [ ] Create migration script
- [ ] Test with test user account

### **Phase 2: Frontend Integration** (Week 2)
- [ ] Update API layer to encrypt/decrypt
- [ ] Update all pages to use crypto key
- [ ] Test encryption/decryption flow
- [ ] Performance testing

### **Phase 3: Gradual Rollout** (Week 3)
- [ ] Enable E2E for new users only (feature flag)
- [ ] Monitor for issues
- [ ] Fix bugs
- [ ] Enable for existing users (opt-in)

### **Phase 4: Full Migration** (Week 4)
- [ ] Migrate all existing users
- [ ] Remove plaintext support
- [ ] Update documentation
- [ ] Announce E2E encryption

---

## 📋 Testing Checklist

### **Unit Tests**
- [ ] Encryption/decryption functions
- [ ] Field-level encryption helpers
- [ ] Key derivation
- [ ] Recovery key generation/validation

### **Integration Tests**
- [ ] Create income with encryption
- [ ] Read income with decryption
- [ ] Update income (re-encrypt)
- [ ] Delete income
- [ ] Dashboard loads with decryption
- [ ] Export with decryption

### **Migration Tests**
- [ ] Migrate plaintext → encrypted
- [ ] Verify all data accessible after migration
- [ ] Rollback if migration fails
- [ ] Handle partial migration

### **Performance Tests**
- [ ] Encryption overhead < 100ms per request
- [ ] Decryption overhead < 50ms per response
- [ ] Dashboard load time < 2s (with encryption)
- [ ] Memory usage acceptable

### **Security Tests**
- [ ] Encrypted data not readable without key
- [ ] Recovery key works
- [ ] Password change re-encrypts data
- [ ] No plaintext leakage in logs

---

## 🎯 Success Criteria

1. ✅ **All sensitive fields encrypted** (names, amounts, descriptions)
2. ✅ **Zero data loss** during migration
3. ✅ **Performance impact < 10%** (load times)
4. ✅ **100% backward compatibility** during migration period
5. ✅ **Recovery key works** for password recovery
6. ✅ **All features work** (export, sharing, analytics - with adaptations)

---

## 📝 Next Steps

1. **Review this plan** with team
2. **Create database migration** SQL scripts
3. **Implement Phase 1** (database schema)
4. **Test with single user** before full rollout
5. **Iterate based on feedback**

---

## 🔗 Related Files

- `web/src/lib/crypto.ts` - Core encryption functions
- `web/src/utils/fieldEncryption.ts` - Field-level encryption
- `web/src/contexts/CryptoContext.tsx` - React context
- `web/src/api.ts` - API layer (needs encryption integration)
- `supabase/functions/api/index.ts` - Edge Function (needs encrypted field support)
- `supabase/migrations/` - Database migrations (need to add encrypted columns)

---

**Last Updated**: January 31, 2025

