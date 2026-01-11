# 🔐 E2E Encryption Architecture & Implementation Details

**Date**: January 31, 2025  
**Status**: Implementation Guide

---

## 📋 Table of Contents

1. [How Encryption/Decryption Works](#how-encryptiondecryption-works)
2. [How Calculations & Display Work](#how-calculations--display-work)
3. [Password Change Impact](#password-change-impact)
4. [Data Flow Diagrams](#data-flow-diagrams)
5. [Implementation Status](#implementation-status)

---

## 🔐 How Encryption/Decryption Works

### **1. Key Derivation (Signup/Login)**

**Process:**
```
User Password + Salt (server-stored) → PBKDF2 → AES-256-GCM Key
```

**Code Flow:**
```typescript
// During Signup (App.tsx)
1. Generate random salt: generateSalt() → { raw: Uint8Array, b64: string }
2. Store salt on server: encryption_salt column in users table
3. Derive key: deriveKey(password, salt) → CryptoKey
4. Store key in React context: cryptoCtx.setKey(key, salt)

// During Login (App.tsx)
1. Fetch salt from server: GET /auth/salt/{username}
2. Derive same key: deriveKey(password, salt) → CryptoKey
3. Store key in React context: cryptoCtx.setKey(key, salt)
```

**Key Properties:**
- ✅ **Deterministic**: Same password + salt = same key
- ✅ **Non-extractable**: Key cannot be exported (browser security)
- ✅ **Unique per user**: Each user has unique salt
- ✅ **PBKDF2**: 100,000 iterations (slow brute-force)

### **2. Field-Level Encryption (Sending Data)**

**Process:**
```
Plaintext Field → AES-256-GCM → { ciphertext, iv }
```

**Code Flow:**
```typescript
// useEncryptedApi.ts - encrypt()
1. Check if encryption enabled: key !== null
2. For each sensitive field (name, amount, etc.):
   a. Convert to string: String(value)
   b. Encrypt: encryptString(value, key) → { ciphertext, iv }
   c. Store as: fieldName_enc, fieldName_iv
   d. Keep original for backward compatibility (during migration)
3. Send encrypted payload to server
```

**Example:**
```typescript
// Before encryption
{
  name: "Salary",
  amount: 50000,
  frequency: "monthly"
}

// After encryption
{
  name: "Salary",                    // Plaintext (backward compat)
  name_enc: "aB3xY9...",            // Encrypted
  name_iv: "zM8kL2...",              // IV
  amount: 50000,                     // Plaintext (backward compat)
  amount_enc: "pQ7rT4...",           // Encrypted
  amount_iv: "nV5wX1...",            // IV
  frequency: "monthly"               // Not encrypted (not sensitive)
}
```

**Sensitive Fields:**
- `name`, `amount`, `planned`, `description`, `justification`
- `source`, `goal`, `limit`, `bill_amount`, `paid_amount`
- `monthly_amount`, `total_amount`, `saved_amount`

### **3. Field-Level Decryption (Receiving Data)**

**Process:**
```
{ ciphertext, iv } → AES-256-GCM → Plaintext Field
```

**Code Flow:**
```typescript
// useEncryptedApi.ts - decrypt()
1. Check if encryption enabled: key !== null
2. For each field ending in "_enc":
   a. Find IV: fieldName_iv
   b. Decrypt: decryptString(ciphertext, iv, key) → plaintext
   c. Parse type: number if numeric, string otherwise
   d. Store as: fieldName (decrypted value)
   e. Remove: fieldName_enc, fieldName_iv
3. Return decrypted object
```

**Example:**
```typescript
// Server response (encrypted)
{
  name_enc: "aB3xY9...",
  name_iv: "zM8kL2...",
  amount_enc: "pQ7rT4...",
  amount_iv: "nV5wX1...",
  frequency: "monthly"
}

// After decryption (client-side)
{
  name: "Salary",
  amount: 50000,
  frequency: "monthly"
}
```

---

## 🧮 How Calculations & Display Work

### **Current Approach: Client-Side Processing**

**Why Client-Side?**
- Server cannot decrypt (doesn't have password)
- All calculations must happen after decryption
- Results encrypted before display/storage

### **1. Dashboard Data Flow**

```
┌─────────────┐
│   Server    │
│  (Encrypted)│
└──────┬──────┘
       │ GET /dashboard
       │ { incomes: [{name_enc: "...", amount_enc: "..."}], ... }
       ▼
┌─────────────┐
│   Client    │
│  (Decrypt)  │
└──────┬──────┘
       │ decrypt() → { incomes: [{name: "Salary", amount: 50000}], ... }
       ▼
┌─────────────┐
│   Client    │
│ (Calculate) │
└──────┬──────┘
       │ Calculate totals, health score, etc.
       │ { totalIncome: 50000, healthScore: 75, ... }
       ▼
┌─────────────┐
│   Client    │
│  (Display)  │
└─────────────┘
```

**Code Flow:**
```typescript
// DashboardPage.tsx
1. Fetch dashboard: await fetchDashboard()
2. Decrypt response: await decrypt(dashboardData)
3. Calculate totals: sum(decrypted.incomes.map(i => i.amount))
4. Display: render totals, charts, etc.
```

### **2. Health Score Calculation**

**Before (Server-Side):**
```sql
-- PostgreSQL function calculate_full_health()
SELECT SUM(amount) FROM fixed_expenses WHERE user_id = $1;
```

**After (Client-Side):**
```typescript
// HealthDetailsPage.tsx
1. Fetch dashboard: await fetchDashboard()
2. Decrypt: await decrypt(dashboardData)
3. Calculate:
   - totalFixed = sum(decrypted.fixedExpenses.map(e => e.amount))
   - totalInvestments = sum(decrypted.investments.map(i => i.monthlyAmount))
   - healthScore = (income - obligations) / income * 100
4. Display: render health breakdown
```

### **3. Dues Calculation**

**Before (Server-Side):**
```sql
-- PostgreSQL function get_dashboard_data()
SELECT * FROM investments WHERE user_id = $1 AND paid = false;
```

**After (Client-Side):**
```typescript
// DuesPage.tsx
1. Fetch dashboard: await fetchDashboard()
2. Decrypt: await decrypt(dashboardData)
3. Filter & Calculate:
   - unpaidInvestments = decrypted.investments.filter(i => !i.paid)
   - totalDues = sum(unpaidInvestments.map(i => i.monthlyAmount))
4. Display: render dues list
```

### **4. Creating/Updating Data**

```
┌─────────────┐
│   Client    │
│  (User Input)│
└──────┬──────┘
       │ { name: "New Expense", amount: 1000 }
       ▼
┌─────────────┐
│   Client    │
│  (Encrypt)  │
└──────┬──────┘
       │ encrypt() → { name_enc: "...", amount_enc: "..." }
       ▼
┌─────────────┐
│   Server    │
│  (Store)    │
└─────────────┘
```

**Code Flow:**
```typescript
// FixedExpensesPage.tsx - handleSubmit()
1. User enters: { name: "Netflix", amount: 500 }
2. Encrypt: await encrypt({ name: "Netflix", amount: 500 })
   → { name_enc: "...", amount_enc: "...", name: "Netflix", amount: 500 }
3. Send to API: POST /planning/fixed-expenses
4. Server stores encrypted fields
5. Refresh dashboard (decrypts on fetch)
```

---

## 🔑 Password Change Impact

### **The Problem**

**Current State:**
- Encryption key = `deriveKey(oldPassword, salt)`
- All data encrypted with old key
- New password → new key → **cannot decrypt old data!**

### **Solution: Re-Encryption Flow**

**Option A: Re-Encrypt All Data (Recommended)**

```
1. User changes password
2. Derive OLD key: deriveKey(oldPassword, salt)
3. Derive NEW key: deriveKey(newPassword, salt)
4. Fetch ALL encrypted data
5. Decrypt with OLD key
6. Re-encrypt with NEW key
7. Update all records on server
8. Update salt (optional, can keep same)
```

**Implementation:**
```typescript
// PasswordChangeModal.tsx
async function handlePasswordChange(oldPassword: string, newPassword: string) {
  // 1. Verify old password
  await verifyPassword(oldPassword);
  
  // 2. Derive keys
  const oldKey = await deriveKey(oldPassword, currentSalt);
  const newKey = await deriveKey(newPassword, currentSalt);
  
  // 3. Fetch all encrypted data
  const allData = await fetchAllUserData();
  
  // 4. Re-encrypt each entity
  const reEncrypted = await Promise.all(
    allData.map(async (entity) => {
      // Decrypt with old key
      const decrypted = await decryptEntity(entity, sensitiveFields, oldKey);
      // Re-encrypt with new key
      return await encryptEntity(decrypted, sensitiveFields, newKey);
    })
  );
  
  // 5. Update all records
  await Promise.all(
    reEncrypted.map(entity => updateEntity(entity))
  );
  
  // 6. Update password hash on server
  await updatePassword(newPassword);
  
  // 7. Update context with new key
  cryptoCtx.setKey(newKey, currentSalt);
}
```

**Option B: Recovery Key Re-Encryption**

If user forgot old password but has recovery key:

```
1. User provides recovery key
2. Derive recovery key: deriveKeyFromRecoveryKey(recoveryKey)
3. Decrypt all data with recovery key
4. Re-encrypt with new password key
5. Update all records
```

**Implementation:**
```typescript
// RecoveryKeyReEncryption.ts
async function reEncryptWithRecoveryKey(
  recoveryKey: string,
  newPassword: string
) {
  // 1. Derive recovery key (different derivation)
  const recoveryDerivedKey = await deriveKeyFromRecoveryKey(recoveryKey);
  
  // 2. Fetch all data
  const allData = await fetchAllUserData();
  
  // 3. Decrypt with recovery key
  const decrypted = await Promise.all(
    allData.map(e => decryptEntity(e, sensitiveFields, recoveryDerivedKey))
  );
  
  // 4. Re-encrypt with new password
  const newKey = await deriveKey(newPassword, currentSalt);
  const reEncrypted = await Promise.all(
    decrypted.map(e => encryptEntity(e, sensitiveFields, newKey))
  );
  
  // 5. Update all records
  await Promise.all(reEncrypted.map(e => updateEntity(e)));
}
```

### **Edge Cases**

**1. User Forgets Password & Recovery Key**
- ❌ **Data Loss**: Cannot decrypt data
- ⚠️ **Warning**: Show clear warning during signup
- 💡 **Mitigation**: Encourage users to save recovery key

**2. Partial Re-Encryption Failure**
- ⚠️ **Risk**: Some data encrypted with old key, some with new
- 💡 **Solution**: Transaction-like batch update with rollback

**3. Concurrent Updates During Re-Encryption**
- ⚠️ **Risk**: User updates data while re-encrypting
- 💡 **Solution**: Lock user account during re-encryption

---

## 📊 Data Flow Diagrams

### **Signup Flow**

```
┌──────────┐
│  User    │
│ Signup   │
└────┬─────┘
     │ username, password
     ▼
┌──────────┐
│  Client  │
└────┬─────┘
     │ 1. generateSalt()
     │ 2. generateRecoveryKey()
     │ 3. deriveKey(password, salt)
     │ 4. hashRecoveryKey(recoveryKey)
     ▼
┌──────────┐
│  Server  │
└────┬─────┘
     │ POST /auth/signup
     │ { username, passwordHash, encryptionSalt, recoveryKeyHash }
     │
     │ Store:
     │ - password_hash (bcrypt)
     │ - encryption_salt (plaintext)
     │ - recovery_key_hash (SHA-256)
     ▼
┌──────────┐
│  Client  │
└────┬─────┘
     │ Show RecoveryKeyModal
     │ User saves 24-word mnemonic
     │ Store key in context
     ▼
┌──────────┐
│  Ready   │
└──────────┘
```

### **Login Flow**

```
┌──────────┐
│  User    │
│  Login   │
└────┬─────┘
     │ username, password
     ▼
┌──────────┐
│  Server  │
└────┬─────┘
     │ POST /auth/login
     │ Verify password_hash
     │ Return: { access_token, encryption_salt }
     ▼
┌──────────┐
│  Client  │
└────┬─────┘
     │ 1. deriveKey(password, salt)
     │ 2. Store key in CryptoContext
     │ 3. Navigate to dashboard
     ▼
┌──────────┐
│ Dashboard│
└────┬─────┘
     │ Fetch data → Decrypt → Display
     ▼
┌──────────┐
│  Ready   │
└──────────┘
```

### **Create Expense Flow**

```
┌──────────┐
│  User    │
│  Input   │
└────┬─────┘
     │ { name: "Netflix", amount: 500 }
     ▼
┌──────────┐
│  Client  │
└────┬─────┘
     │ encrypt({ name: "Netflix", amount: 500 })
     │ → { name_enc: "...", amount_enc: "...", name: "Netflix", amount: 500 }
     ▼
┌──────────┐
│  Server  │
└────┬─────┘
     │ POST /planning/fixed-expenses
     │ Store encrypted fields
     │ Return: { id: "...", name_enc: "...", amount_enc: "..." }
     ▼
┌──────────┐
│  Client  │
└────┬─────┘
     │ decrypt(response)
     │ → { id: "...", name: "Netflix", amount: 500 }
     │ Update UI
     ▼
┌──────────┐
│  Updated │
└──────────┘
```

---

## ✅ Implementation Status

### **✅ Completed**

1. **Crypto Infrastructure** (`web/src/lib/crypto.ts`)
   - ✅ `deriveKey()` - PBKDF2 key derivation
   - ✅ `encryptString()` / `decryptString()` - AES-256-GCM
   - ✅ `generateRecoveryKey()` - BIP39 mnemonic
   - ✅ `generateSalt()` / `saltFromBase64()` - Salt management

2. **Field Encryption** (`web/src/utils/fieldEncryption.ts`)
   - ✅ `encryptEntity()` / `decryptEntity()` - Field-level encryption
   - ✅ `SENSITIVE_FIELDS` - Field mapping

3. **Crypto Context** (`web/src/contexts/CryptoContext.tsx`)
   - ✅ `CryptoProvider` - React context
   - ✅ `useCrypto()` hook

4. **Encrypted API Hook** (`web/src/hooks/useEncryptedApi.ts`)
   - ✅ `encrypt()` / `decrypt()` - Automatic encryption/decryption
   - ✅ Recursive object processing

5. **Signup Flow** (`web/src/App.tsx`)
   - ✅ Generate salt & recovery key
   - ✅ Derive key on signup
   - ✅ Show RecoveryKeyModal

### **❌ TODO**

1. **Database Schema**
   - ❌ Add encrypted columns (`*_encrypted`, `*_iv`) to all tables
   - ❌ Migration script for schema changes

2. **API Integration**
   - ❌ Wire `useEncryptedApi` into all API calls
   - ❌ Update `api.ts` to use encryption hook
   - ❌ Backend to store encrypted fields

3. **Client-Side Calculations**
   - ❌ Move health score calculation to client
   - ❌ Move dues calculation to client
   - ❌ Move dashboard totals to client

4. **Password Change**
   - ❌ Implement re-encryption flow
   - ❌ Recovery key re-encryption
   - ❌ Password change UI

5. **Testing**
   - ❌ E2E encryption tests
   - ❌ Re-encryption tests
   - ❌ Migration tests

---

## 🎯 Next Steps

1. **Phase 1**: Database schema migration
2. **Phase 2**: Wire encryption into API layer
3. **Phase 3**: Move calculations to client-side
4. **Phase 4**: Implement password change flow
5. **Phase 5**: Testing & migration

---

## 📝 Key Takeaways

1. **Encryption Key**: Derived from password + salt (PBKDF2)
2. **Salt**: Stored server-side (not secret, unique per user)
3. **Field-Level**: Only sensitive fields encrypted (amounts, names)
4. **Client-Side**: All calculations happen after decryption
5. **Password Change**: Requires re-encryption of all data
6. **Recovery Key**: Backup method to decrypt if password forgotten
