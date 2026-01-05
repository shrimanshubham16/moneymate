# 🔐 E2E Encryption: Q&A Summary

**Date**: January 31, 2025

---

## Q: How are we encrypting and decrypting the data?

### **Encryption (Sending to Server)**

**Step-by-Step:**

1. **User Input** → Plaintext data
   ```typescript
   { name: "Salary", amount: 50000 }
   ```

2. **Field Detection** → Identify sensitive fields
   ```typescript
   // useEncryptedApi.ts
   SENSITIVE_FIELDS = ['name', 'amount', 'planned', ...]
   ```

3. **Encryption** → AES-256-GCM per field
   ```typescript
   // For each sensitive field:
   encryptString("Salary", cryptoKey)
   → { ciphertext: "aB3xY9...", iv: "zM8kL2..." }
   ```

4. **Payload Construction** → Add encrypted fields
   ```typescript
   {
     name: "Salary",              // Plaintext (backward compat)
     name_enc: "aB3xY9...",       // Encrypted
     name_iv: "zM8kL2...",       // IV
     amount: 50000,               // Plaintext
     amount_enc: "pQ7rT4...",     // Encrypted
     amount_iv: "nV5wX1..."       // IV
   }
   ```

5. **Send to Server** → POST/PUT with encrypted payload

**Code Location:**
- `web/src/hooks/useEncryptedApi.ts` → `encrypt()` function
- `web/src/lib/crypto.ts` → `encryptString()` function

---

### **Decryption (Receiving from Server)**

**Step-by-Step:**

1. **Receive Response** → Encrypted data from server
   ```typescript
   {
     name_enc: "aB3xY9...",
     name_iv: "zM8kL2...",
     amount_enc: "pQ7rT4...",
     amount_iv: "nV5wX1..."
   }
   ```

2. **Field Detection** → Find `*_enc` fields
   ```typescript
   // useEncryptedApi.ts
   if (field.endsWith('_enc')) {
     const originalField = field.slice(0, -4); // Remove '_enc'
   }
   ```

3. **Decryption** → AES-256-GCM per field
   ```typescript
   decryptString(ciphertext, iv, cryptoKey)
   → "Salary"
   ```

4. **Type Parsing** → Convert back to original type
   ```typescript
   const numValue = parseFloat(decrypted);
   result[originalField] = isNaN(numValue) ? decrypted : numValue;
   ```

5. **Clean Result** → Remove encrypted fields
   ```typescript
   {
     name: "Salary",
     amount: 50000
   }
   ```

**Code Location:**
- `web/src/hooks/useEncryptedApi.ts` → `decrypt()` function
- `web/src/lib/crypto.ts` → `decryptString()` function

---

## Q: How are we calculating and showing results to the user?

### **Current Approach: Client-Side Processing**

**Why Client-Side?**
- Server cannot decrypt (doesn't have password)
- All calculations must happen **after** decryption
- Results displayed directly (no re-encryption needed for display)

### **Dashboard Flow**

```
1. Fetch Dashboard Data
   ↓
   GET /dashboard
   Response: { incomes: [{name_enc: "...", amount_enc: "..."}], ... }
   
2. Decrypt All Data
   ↓
   await decrypt(dashboardData)
   Result: { incomes: [{name: "Salary", amount: 50000}], ... }
   
3. Calculate Totals (Client-Side)
   ↓
   totalIncome = sum(incomes.map(i => i.amount))
   totalExpenses = sum(expenses.map(e => e.amount))
   healthScore = (totalIncome - totalExpenses) / totalIncome * 100
   
4. Display Results
   ↓
   Render: "Total Income: ₹50,000", "Health Score: 75%"
```

**Code Example:**
```typescript
// DashboardPage.tsx
const { decrypt } = useEncryptedApi();

useEffect(() => {
  async function loadDashboard() {
    // 1. Fetch encrypted data
    const encrypted = await fetchDashboard();
    
    // 2. Decrypt
    const decrypted = await decrypt(encrypted);
    
    // 3. Calculate
    const totalIncome = decrypted.incomes.reduce((sum, i) => sum + i.amount, 0);
    const totalExpenses = decrypted.fixedExpenses.reduce((sum, e) => sum + e.amount, 0);
    const healthScore = ((totalIncome - totalExpenses) / totalIncome) * 100;
    
    // 4. Display
    setDashboardData({ ...decrypted, totalIncome, totalExpenses, healthScore });
  }
  loadDashboard();
}, []);
```

### **Health Score Calculation**

**Before (Server-Side SQL):**
```sql
SELECT SUM(amount) FROM fixed_expenses WHERE user_id = $1;
```

**After (Client-Side JavaScript):**
```typescript
// HealthDetailsPage.tsx
const decrypted = await decrypt(dashboardData);
const totalFixed = decrypted.fixedExpenses.reduce((sum, e) => sum + e.amount, 0);
const totalInvestments = decrypted.investments.reduce((sum, i) => sum + i.monthlyAmount, 0);
const healthScore = calculateHealth(decrypted);
```

### **Dues Calculation**

**Before (Server-Side SQL):**
```sql
SELECT * FROM investments WHERE user_id = $1 AND paid = false;
```

**After (Client-Side JavaScript):**
```typescript
// DuesPage.tsx
const decrypted = await decrypt(dashboardData);
const unpaidInvestments = decrypted.investments.filter(i => !i.paid);
const totalDues = unpaidInvestments.reduce((sum, i) => sum + i.monthlyAmount, 0);
```

### **Key Points:**

1. ✅ **All calculations happen client-side** after decryption
2. ✅ **No server-side processing** of encrypted data
3. ✅ **Results displayed directly** (no re-encryption for display)
4. ⚠️ **Performance**: Decryption happens on every fetch (cached in memory)

---

## Q: How is password change going to affect it?

### **The Problem**

**Current State:**
- Encryption key = `deriveKey(password, salt)`
- All data encrypted with **old password key**
- New password → new key → **CANNOT DECRYPT OLD DATA!**

**Example:**
```typescript
// Old password: "password123"
oldKey = deriveKey("password123", salt)
// Data encrypted with oldKey

// User changes to: "newpassword456"
newKey = deriveKey("newpassword456", salt)
// ❌ Cannot decrypt old data with newKey!
```

### **Solution: Re-Encryption Flow**

**Option 1: Re-Encrypt with Old Password (Recommended)**

```
1. User enters: currentPassword, newPassword
2. Verify: currentPassword matches
3. Derive OLD key: deriveKey(currentPassword, salt)
4. Derive NEW key: deriveKey(newPassword, salt)
5. Fetch ALL encrypted data from server
6. Decrypt with OLD key
7. Re-encrypt with NEW key
8. Update all records on server
9. Update password hash
10. Update context with NEW key
```

**Implementation:**
```typescript
// AccountPage.tsx - Enhanced handlePasswordChange()
async function handlePasswordChange(
  currentPassword: string,
  newPassword: string
) {
  // 1. Verify current password
  const isValid = await verifyPassword(currentPassword);
  if (!isValid) throw new Error("Current password incorrect");
  
  // 2. Derive keys
  const { encryptionSalt } = useCrypto();
  const oldKey = await deriveKey(currentPassword, saltFromBase64(encryptionSalt));
  const newKey = await deriveKey(newPassword, saltFromBase64(encryptionSalt));
  
  // 3. Fetch ALL encrypted data
  const allData = {
    incomes: await fetchIncomes(),
    fixedExpenses: await fetchFixedExpenses(),
    investments: await fetchInvestments(),
    creditCards: await fetchCreditCards(),
    // ... all other entities
  };
  
  // 4. Re-encrypt each entity type
  const { encrypt } = useEncryptedApi();
  
  // Temporarily switch to old key for decryption
  cryptoCtx.setKey(oldKey, encryptionSalt);
  const { decrypt } = useEncryptedApi();
  
  // Decrypt all with old key
  const decrypted = {
    incomes: await Promise.all(allData.incomes.map(i => decrypt(i))),
    fixedExpenses: await Promise.all(allData.fixedExpenses.map(e => decrypt(e))),
    // ... etc
  };
  
  // Switch to new key for encryption
  cryptoCtx.setKey(newKey, encryptionSalt);
  const { encrypt: encryptNew } = useEncryptedApi();
  
  // Re-encrypt all with new key
  const reEncrypted = {
    incomes: await Promise.all(decrypted.incomes.map(i => encryptNew(i))),
    fixedExpenses: await Promise.all(decrypted.fixedExpenses.map(e => encryptNew(e))),
    // ... etc
  };
  
  // 5. Update all records on server
  await Promise.all([
    ...reEncrypted.incomes.map(i => updateIncome(i)),
    ...reEncrypted.fixedExpenses.map(e => updateFixedExpense(e)),
    // ... etc
  ]);
  
  // 6. Update password hash
  await changePassword(currentPassword, newPassword);
  
  // 7. Update context (already done above)
  // cryptoCtx.setKey(newKey, encryptionSalt);
}
```

**Option 2: Re-Encrypt with Recovery Key**

If user forgot password but has recovery key:

```typescript
async function reEncryptWithRecoveryKey(
  recoveryKey: string,
  newPassword: string
) {
  // 1. Derive recovery key (different derivation method)
  const recoveryKeyDerived = await deriveKeyFromRecoveryKey(recoveryKey);
  
  // 2. Fetch all data
  const allData = await fetchAllUserData();
  
  // 3. Decrypt with recovery key
  const decrypted = await decryptAll(allData, recoveryKeyDerived);
  
  // 4. Re-encrypt with new password
  const newKey = await deriveKey(newPassword, salt);
  const reEncrypted = await encryptAll(decrypted, newKey);
  
  // 5. Update all records
  await updateAllRecords(reEncrypted);
  
  // 6. Update password
  await updatePassword(newPassword);
}
```

### **Edge Cases**

**1. User Forgets Password & Recovery Key**
- ❌ **Data Loss**: Cannot decrypt data
- ⚠️ **Warning**: Show clear warning during signup
- 💡 **Mitigation**: Encourage users to save recovery key

**2. Partial Re-Encryption Failure**
- ⚠️ **Risk**: Some data encrypted with old key, some with new
- 💡 **Solution**: Batch update with rollback on failure

**3. Concurrent Updates During Re-Encryption**
- ⚠️ **Risk**: User updates data while re-encrypting
- 💡 **Solution**: Lock user account during re-encryption (show "Re-encrypting..." message)

**4. Large Dataset**
- ⚠️ **Risk**: Re-encryption takes long time
- 💡 **Solution**: 
  - Show progress bar
  - Batch updates (100 records at a time)
  - Background processing

### **Current Status**

**❌ NOT IMPLEMENTED YET**

The current password change (`AccountPage.tsx`) only updates the password hash but **does NOT re-encrypt data**. This means:

1. ✅ Password hash updated
2. ❌ Data still encrypted with old key
3. ❌ User cannot decrypt data after password change
4. ⚠️ **CRITICAL**: Need to implement re-encryption before enabling E2E encryption

---

## 📊 Summary

### **Encryption/Decryption**
- ✅ **Encryption**: Field-level AES-256-GCM, happens before API calls
- ✅ **Decryption**: Field-level AES-256-GCM, happens after API responses
- ✅ **Key**: Derived from password + salt (PBKDF2)

### **Calculations & Display**
- ✅ **All calculations**: Client-side after decryption
- ✅ **Display**: Direct rendering of decrypted data
- ✅ **No server-side**: Server cannot decrypt, so no server-side calculations

### **Password Change**
- ❌ **NOT IMPLEMENTED**: Current code doesn't re-encrypt
- ⚠️ **REQUIRED**: Must implement re-encryption flow before enabling E2E
- 💡 **Solution**: Re-encrypt all data with new password key during password change

---

## 🎯 Next Steps

1. **Implement Re-Encryption Flow** (Critical)
2. **Wire Encryption into API Layer**
3. **Move Calculations to Client-Side**
4. **Add Progress Indicators** for re-encryption
5. **Test Edge Cases** (forgot password, partial failure, etc.)

