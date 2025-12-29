# 🔐 Encryption Implementation Plan

**Date**: December 29, 2024  
**Status**: Planning Phase  
**Decision Required**: Server-Side Encryption (v1.3) vs End-to-End Encryption (v2.0)

---

## 📊 Current State Analysis

### Data Storage Architecture
- **Storage Method**: Single JSON file (`data/finflow-data.json`)
- **Format**: Plain text JSON
- **Location**: Backend server file system
- **Persistence**: Synchronous file I/O (`fs.readFileSync`, `fs.writeFileSync`)
- **Data Structure**: All user data in one `Store` object

### Sensitive Data Fields
All financial data is currently stored in plain text:
- **User Data**: `username`, `passwordHash` (already hashed)
- **Income**: `name`, `amount`, `category`, `frequency`
- **Fixed Expenses**: `name`, `amount`, `category`, `frequency`
- **Variable Expenses**: `name`, `planned`, `amount`, `subcategory`, `justification`
- **Investments**: `name`, `monthlyAmount`, `goal`
- **Credit Cards**: `name`, `billAmount`, `paidAmount`, `currentExpenses`
- **Loans**: `name`, `principal`, `emi`, `remainingTenureMonths`
- **Activities**: `payload` (contains financial details)
- **Future Bombs**: `name`, `totalAmount`, `savedAmount`

### Current Security
✅ **HTTPS** (in transit)  
✅ **Password Hashing** (SHA-256)  
✅ **JWT Authentication**  
✅ **User Data Isolation**  
❌ **Encryption at Rest** (NOT implemented)  
❌ **End-to-End Encryption** (NOT implemented)

---

## 🎯 Option 1: Server-Side Encryption (v1.3)

### Overview
Encrypt sensitive data on the server before storing to disk. The server has access to the encryption key, so it can decrypt data for processing.

### Implementation Approach

#### 1. **Encryption Strategy**
- Use **AES-256-GCM** (Authenticated Encryption)
- Generate a **master encryption key** (stored in environment variable)
- Each field encrypted separately with unique IV (Initialization Vector)
- Store encrypted data + IV in JSON

#### 2. **Data Model Changes**
```typescript
// Before
export type Income = {
  id: string;
  userId: string;
  name: string;
  amount: number;
  // ...
};

// After (Hybrid - support both during migration)
export type Income = {
  id: string;
  userId: string;
  // Plaintext (legacy)
  name?: string;
  amount?: number;
  // Encrypted (new)
  name_encrypted?: string;
  name_iv?: string;
  amount_encrypted?: string;
  amount_iv?: string;
  // ...
};
```

#### 3. **Encryption Service**
```typescript
// backend/src/encryption.ts
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!; // 32-byte key from env
const ALGORITHM = 'aes-256-gcm';

export function encryptField(value: string): { encrypted: string; iv: string } {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  
  let encrypted = cipher.update(value, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted: encrypted + ':' + authTag.toString('hex'),
    iv: iv.toString('hex')
  };
}

export function decryptField(encrypted: string, iv: string): string {
  const [encryptedData, authTagHex] = encrypted.split(':');
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    Buffer.from(iv, 'hex')
  );
  
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
```

#### 4. **Store Layer Changes**
```typescript
// Modify saveStateToDisk() to encrypt sensitive fields
function saveStateToDisk() {
  const encryptedState = {
    ...state,
    incomes: state.incomes.map(encryptIncome),
    fixedExpenses: state.fixedExpenses.map(encryptFixedExpense),
    // ... encrypt all sensitive entities
  };
  fs.writeFileSync(DATA_FILE, JSON.stringify(encryptedState, null, 2));
}

// Modify loadStateFromDisk() to decrypt
function loadStateFromDisk(): Store {
  const rawData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  return {
    ...rawData,
    incomes: rawData.incomes.map(decryptIncome),
    // ... decrypt all sensitive entities
  };
}
```

#### 5. **API Layer Changes**
- **No changes needed** - API continues to work with decrypted data
- Encryption/decryption happens transparently in store layer

### Pros ✅
- **Easier Implementation**: ~2-3 days of work
- **Maintains Features**: All current features work (sharing, analytics, etc.)
- **Password Recovery**: Still possible
- **Server-Side Processing**: Health score calculations, exports work seamlessly
- **Backward Compatible**: Can migrate existing data gradually
- **No Frontend Changes**: All encryption logic in backend

### Cons ❌
- **Developer Can Still Decrypt**: Server has the key, so developer can technically decrypt
- **Single Point of Failure**: If encryption key is compromised, all data is at risk
- **Not True "Zero-Knowledge"**: Server can see decrypted data

### Migration Strategy
1. **Phase 1**: Add encryption functions, support both plaintext and encrypted
2. **Phase 2**: Encrypt new data on write
3. **Phase 3**: Migrate existing data (background job)
4. **Phase 4**: Remove plaintext support

### Breaking Changes
- **None** - Fully backward compatible during migration

---

## 🎯 Option 2: End-to-End Encryption (v2.0)

### Overview
Encrypt data on the client (browser) before sending to server. Server never sees plaintext. User's password derives the encryption key.

### Implementation Approach

#### 1. **Key Derivation**
```typescript
// Frontend: Derive encryption key from user password
import { deriveKeyFromPassword } from './crypto-utils';

// On login/signup
const encryptionKey = await deriveKeyFromPassword(password, username);
// Store in memory (never send to server)
```

#### 2. **Client-Side Encryption**
```typescript
// Frontend: Encrypt before sending to API
async function addIncome(income: Income) {
  const encryptedIncome = {
    ...income,
    name: await encrypt(income.name, encryptionKey),
    amount: await encrypt(income.amount.toString(), encryptionKey),
  };
  
  await api.post('/incomes', encryptedIncome);
}
```

#### 3. **Server Storage**
```typescript
// Backend: Store encrypted data as-is
// No decryption on server
export type Income = {
  id: string;
  userId: string;
  name_encrypted: string;  // Always encrypted
  amount_encrypted: string; // Always encrypted
  name_iv: string;
  amount_iv: string;
  // ...
};
```

#### 4. **Client-Side Decryption**
```typescript
// Frontend: Decrypt after receiving from API
async function getIncomes() {
  const encryptedIncomes = await api.get('/incomes');
  
  return encryptedIncomes.map(async (income) => ({
    ...income,
    name: await decrypt(income.name_encrypted, encryptionKey, income.name_iv),
    amount: parseFloat(await decrypt(income.amount_encrypted, encryptionKey, income.amount_iv)),
  }));
}
```

#### 5. **Server-Side Calculations**
**Problem**: Health score, exports, analytics need decrypted data  
**Solutions**:
- **Option A**: Calculate on client (send all data, calculate in browser)
- **Option B**: Use homomorphic encryption (complex, not practical)
- **Option C**: Hybrid - encrypt sensitive fields, keep calculated fields plaintext

### Pros ✅
- **True Zero-Knowledge**: Developer cannot decrypt user data
- **Highest Privacy**: Even if server is compromised, data is safe
- **User Trust**: Maximum transparency and security

### Cons ❌
- **Complex Implementation**: ~2-3 weeks of work
- **No Password Recovery**: If user forgets password, data is lost forever
- **Limited Server Features**: Health score, exports need client-side calculation
- **Sharing Complexity**: Sharing requires key exchange mechanism
- **Performance**: Encryption/decryption on every API call
- **Frontend Changes**: Major refactoring needed
- **Migration Complexity**: Existing users need to re-encrypt with new keys

### Breaking Changes
- **Major**: All API responses change (encrypted format)
- **Major**: Frontend must handle encryption/decryption
- **Major**: Existing data migration required
- **Major**: Sharing feature needs redesign

---

## 📊 Comparison Matrix

| Feature | Server-Side (v1.3) | E2E (v2.0) |
|---------|-------------------|------------|
| **Implementation Time** | 2-3 days | 2-3 weeks |
| **Developer Can Decrypt** | Yes (with key) | No |
| **Password Recovery** | ✅ Yes | ❌ No |
| **Server-Side Calculations** | ✅ Seamless | ❌ Must be client-side |
| **Sharing Feature** | ✅ Works | ⚠️ Needs key exchange |
| **Export Feature** | ✅ Works | ⚠️ Client-side only |
| **Analytics** | ✅ Possible | ❌ Not possible |
| **Backward Compatible** | ✅ Yes | ❌ No |
| **Frontend Changes** | ❌ None | ✅ Major refactor |
| **User Experience** | ✅ Same | ⚠️ Slightly slower |
| **Migration Complexity** | ✅ Easy | ❌ Complex |

---

## 🎯 Recommendation

### **Start with Server-Side Encryption (v1.3)**

**Reasoning:**
1. **Pragmatic Approach**: Achieves 80% of security benefit with 20% of effort
2. **Feature Preservation**: All current features continue to work
3. **User Experience**: No disruption to existing users
4. **Foundation for E2E**: Can migrate to E2E later if needed
5. **Industry Standard**: Most apps (Mint, YNAB) use server-side encryption

### **Future Path to E2E (v2.0)**
- Offer E2E as **optional "Zero-Knowledge Mode"** for privacy-conscious users
- Users can opt-in, understanding they lose password recovery
- Keep server-side encryption as default for convenience

---

## 🚀 Implementation Plan: Server-Side Encryption

### Phase 1: Setup (Day 1)
1. ✅ Create encryption service (`backend/src/encryption.ts`)
2. ✅ Add `ENCRYPTION_KEY` to environment variables
3. ✅ Write unit tests for encrypt/decrypt functions
4. ✅ Update data types to support encrypted fields

### Phase 2: Core Implementation (Day 2)
1. ✅ Modify `saveStateToDisk()` to encrypt sensitive fields
2. ✅ Modify `loadStateFromDisk()` to decrypt
3. ✅ Create migration utility for existing data
4. ✅ Add feature flag: `ENABLE_ENCRYPTION=true`

### Phase 3: Testing & Migration (Day 3)
1. ✅ Test with fresh data (encrypted from start)
2. ✅ Test migration of existing data
3. ✅ Verify all API endpoints work correctly
4. ✅ Performance testing (encryption overhead)
5. ✅ Deploy to staging

### Phase 4: Production Rollout
1. ✅ Enable encryption on production
2. ✅ Run migration script for existing users
3. ✅ Monitor for issues
4. ✅ Update privacy policy

### Files to Modify
- `backend/src/store.ts` - Add encryption/decryption
- `backend/src/mockData.ts` - Update types
- `backend/src/encryption.ts` - **NEW** encryption service
- `.env.example` - Add `ENCRYPTION_KEY`
- `PRIVACY-POLICY.md` - Update to reflect encryption

### Fields to Encrypt
**High Priority (Financial Data):**
- Income: `name`, `amount`
- Fixed Expense: `name`, `amount`
- Variable Expense: `name`, `planned`, `amount`, `justification`, `subcategory`
- Investment: `name`, `monthlyAmount`, `goal`
- Credit Card: `name`, `billAmount`, `paidAmount`, `currentExpenses`
- Loan: `name`, `principal`, `emi`
- Future Bomb: `name`, `totalAmount`, `savedAmount`

**Low Priority (Less Sensitive):**
- Activity: `payload` (contains financial details)
- User: `username` (already public, but can encrypt for consistency)

**Don't Encrypt:**
- IDs, timestamps, status flags
- Calculated fields (health score, monthly equivalents)
- Metadata (frequency, category enums)

---

## ⚠️ Risks & Mitigation

### Risk 1: Encryption Key Loss
**Impact**: All data becomes unreadable  
**Mitigation**: 
- Store key in secure environment variable
- Document key rotation process
- Backup key in secure location (password manager)

### Risk 2: Performance Degradation
**Impact**: Slower save/load operations  
**Mitigation**:
- Benchmark before/after
- Use async encryption if needed
- Cache decrypted data in memory

### Risk 3: Migration Failures
**Impact**: Data corruption or loss  
**Mitigation**:
- Test migration on staging first
- Backup data before migration
- Rollback plan ready

### Risk 4: Breaking Existing Features
**Impact**: API endpoints fail  
**Mitigation**:
- Comprehensive testing
- Feature flag for gradual rollout
- Monitor error logs

---

## 📝 Next Steps

1. **Review this plan** with team/stakeholders
2. **Make decision**: Server-side vs E2E
3. **If Server-side**: Proceed with Phase 1 implementation
4. **If E2E**: Create detailed E2E implementation plan
5. **Set timeline**: Target completion date

---

## 🔗 References

- [Node.js Crypto Documentation](https://nodejs.org/api/crypto.html)
- [AES-256-GCM Best Practices](https://cryptobook.nakov.com/symmetric-key-ciphers/aes-encryption-decryption)
- [OWASP Encryption Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)

