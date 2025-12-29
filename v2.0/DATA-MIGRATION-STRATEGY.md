# 🔄 Data Migration Strategy - Zero Data Loss Guarantee

## 🎯 Core Principle

**NO USER DATA WILL BE LOST** - All existing data will be safely migrated to the new v2.0 storage format.

---

## 📊 Current Data Structure (v1.2)

### Current Storage
```
data/
└── finflow-data.json
    ├── users: User[]
    ├── incomes: Income[]
    ├── fixedExpenses: FixedExpense[]
    ├── variableExpenses: VariableExpense[]
    ├── investments: Investment[]
    ├── creditCards: CreditCard[]
    ├── activities: Activity[]
    └── ...
```

### Current Data Format
```typescript
// All data in single JSON file
{
  "users": [
    {
      "id": "user1",
      "username": "shrimanshubham",
      "passwordHash": "...",
      "createdAt": "2025-01-01T00:00:00Z"
    }
  ],
  "incomes": [
    {
      "id": "income1",
      "userId": "user1",
      "name": "Salary",
      "amount": 50000,
      "frequency": "monthly"
    }
  ],
  // ... all other entities
}
```

---

## 🏗️ New v2.0 Data Structure

### New Storage (Per-User Files)
```
data/
├── users/
│   ├── user1/
│   │   ├── data.json (encrypted)
│   │   ├── backup-20250115-120000.json
│   │   └── wal.log
│   ├── user2/
│   │   └── ...
│   └── ...
├── migrations/
│   ├── v2.0-migration-20250115-120000.json
│   └── rollback-v2.0-20250115-120000.json
└── global/
    └── metadata.json
```

### New Data Format (Encrypted)
```typescript
// Per-user encrypted file
{
  "version": "2.0",
  "userId": "user1",
  "encrypted": true,
  "data": {
    "incomes": [
      {
        "id": "income1",
        "name_encrypted": "base64...",
        "name_iv": "base64...",
        "amount_encrypted": "base64...",
        "amount_iv": "base64...",
        "frequency": "monthly" // Not encrypted
      }
    ],
    // ... all other entities
  }
}
```

---

## 🔄 Migration Process (Step-by-Step)

### Phase 1: Pre-Migration (Safety First)

#### Step 1.1: Create Full Backup
```typescript
async function createPreMigrationBackup() {
  const timestamp = new Date().toISOString();
  const backupPath = `data/backups/pre-v2.0-${timestamp}.json`;
  
  // Copy entire current data file
  const currentData = await readFile('data/finflow-data.json');
  await writeFile(backupPath, JSON.stringify(currentData, null, 2));
  
  // Also create a compressed backup
  await compressFile(backupPath, `${backupPath}.gz`);
  
  return backupPath;
}
```

**Safety Check:**
- ✅ Backup created before any changes
- ✅ Backup stored in separate location
- ✅ Backup can be restored manually if needed

#### Step 1.2: Validate Current Data
```typescript
async function validateCurrentData() {
  const data = await loadCurrentData();
  
  // Validate structure
  assert(data.users, "Users array missing");
  assert(data.incomes, "Incomes array missing");
  // ... validate all required arrays
  
  // Validate data integrity
  for (const income of data.incomes) {
    assert(income.userId, "Income missing userId");
    assert(data.users.find(u => u.id === income.userId), "Orphaned income");
  }
  // ... validate all relationships
  
  return { valid: true, userCount: data.users.length };
}
```

**Safety Check:**
- ✅ All data is valid before migration
- ✅ No orphaned records
- ✅ All relationships intact

---

### Phase 2: Dual-Write Period (Zero Risk)

#### Step 2.1: Implement Dual Write
```typescript
async function writeData(userId: string, entity: string, data: any) {
  // Write to OLD format (v1.2)
  await writeToOldFormat(userId, entity, data);
  
  // Write to NEW format (v2.0)
  await writeToNewFormat(userId, entity, data);
  
  // Validate both writes succeeded
  const oldData = await readFromOldFormat(userId, entity);
  const newData = await readFromNewFormat(userId, entity);
  
  if (!dataMatches(oldData, newData)) {
    throw new Error("Dual write validation failed");
  }
}
```

**Duration:** 1-2 weeks  
**Purpose:** Ensure new format works correctly before switching

**Safety Check:**
- ✅ Both formats stay in sync
- ✅ Can rollback to old format anytime
- ✅ Validation ensures data integrity

#### Step 2.2: Read from Old Format (During Dual Write)
```typescript
async function readData(userId: string, entity: string) {
  // During dual-write period, read from OLD format
  return await readFromOldFormat(userId, entity);
}
```

**Safety Check:**
- ✅ No disruption to users
- ✅ Old format remains source of truth
- ✅ New format is tested in parallel

---

### Phase 3: Gradual Migration (User-by-User)

#### Step 3.1: Migrate Single User
```typescript
async function migrateUser(userId: string) {
  // 1. Create user directory
  await createUserDirectory(userId);
  
  // 2. Load user data from old format
  const userData = await loadUserDataFromOldFormat(userId);
  
  // 3. Encrypt user data
  const encryptionKey = await deriveKeyFromPassword(userData.password);
  const encryptedData = await encryptUserData(userData, encryptionKey);
  
  // 4. Write to new format
  await writeUserDataToNewFormat(userId, encryptedData);
  
  // 5. Validate migration
  const migratedData = await readUserDataFromNewFormat(userId, encryptionKey);
  if (!dataMatches(userData, migratedData)) {
    throw new Error("Migration validation failed");
  }
  
  // 6. Mark user as migrated
  await markUserAsMigrated(userId);
  
  return { success: true, userId };
}
```

**Safety Check:**
- ✅ Each user migrated individually
- ✅ Validation after each migration
- ✅ Can rollback per user if needed

#### Step 3.2: Migration on Login (Recommended)
```typescript
async function handleUserLogin(username: string, password: string) {
  const user = await findUser(username);
  
  // Check if user needs migration
  if (!user.migrated) {
    try {
      // Migrate user data
      await migrateUser(user.id);
      
      // Update user record
      await markUserAsMigrated(user.id);
    } catch (error) {
      // Log error but don't block login
      console.error("Migration failed for user:", user.id, error);
      // User can still use old format
    }
  }
  
  // Continue with normal login
  return await authenticateUser(username, password);
}
```

**Benefits:**
- ✅ Migrates users gradually
- ✅ No downtime
- ✅ Users migrate on their own schedule
- ✅ Failed migrations don't block access

#### Step 3.3: Batch Migration (Optional)
```typescript
async function batchMigrateUsers(userIds: string[]) {
  const results = [];
  
  for (const userId of userIds) {
    try {
      const result = await migrateUser(userId);
      results.push({ userId, success: true, result });
    } catch (error) {
      results.push({ userId, success: false, error: error.message });
      // Continue with next user
    }
  }
  
  return results;
}
```

**Use Case:** Migrate all users at once (for testing)

---

### Phase 4: Encryption Migration

#### Step 4.1: Encrypt Existing Data
```typescript
async function encryptUserData(userData: UserData, encryptionKey: CryptoKey) {
  const encrypted: EncryptedUserData = {
    version: "2.0",
    userId: userData.userId,
    encrypted: true,
    data: {
      incomes: await Promise.all(
        userData.incomes.map(income => encryptIncome(income, encryptionKey))
      ),
      fixedExpenses: await Promise.all(
        userData.fixedExpenses.map(exp => encryptFixedExpense(exp, encryptionKey))
      ),
      // ... encrypt all entities
    }
  };
  
  return encrypted;
}
```

#### Step 4.2: Encrypt on Next Login
```typescript
async function encryptOnLogin(userId: string, password: string) {
  // Derive encryption key from password
  const encryptionKey = await deriveKeyFromPassword(password);
  
  // Load plaintext data
  const plaintextData = await loadUserDataFromOldFormat(userId);
  
  // Encrypt data
  const encryptedData = await encryptUserData(plaintextData, encryptionKey);
  
  // Write encrypted data
  await writeUserDataToNewFormat(userId, encryptedData);
  
  // Mark as encrypted
  await markUserAsEncrypted(userId);
}
```

**Safety Check:**
- ✅ Encryption happens on login (user provides password)
- ✅ Original data kept until encryption verified
- ✅ Can rollback if encryption fails

---

### Phase 5: Cutover (Switch to New Format)

#### Step 5.1: Switch Read to New Format
```typescript
async function readData(userId: string, entity: string) {
  const user = await getUser(userId);
  
  if (user.migrated) {
    // Read from NEW format
    return await readFromNewFormat(userId, entity);
  } else {
    // Read from OLD format (fallback)
    return await readFromOldFormat(userId, entity);
  }
}
```

**Safety Check:**
- ✅ Gradual cutover (user-by-user)
- ✅ Fallback to old format if needed
- ✅ No disruption to users

#### Step 5.2: Stop Writing to Old Format
```typescript
async function writeData(userId: string, entity: string, data: any) {
  const user = await getUser(userId);
  
  if (user.migrated) {
    // Write only to NEW format
    await writeToNewFormat(userId, entity, data);
  } else {
    // Still write to OLD format (during migration)
    await writeToOldFormat(userId, entity, data);
  }
}
```

**Timeline:** After 95%+ users migrated

---

### Phase 6: Cleanup (After All Users Migrated)

#### Step 6.1: Archive Old Data
```typescript
async function archiveOldData() {
  const timestamp = new Date().toISOString();
  const archivePath = `data/archives/v1.2-${timestamp}.json`;
  
  // Move old data file to archive
  await moveFile('data/finflow-data.json', archivePath);
  
  // Keep for 90 days before deletion
  await scheduleDeletion(archivePath, 90);
}
```

**Safety Check:**
- ✅ Old data archived (not deleted)
- ✅ Can restore if needed
- ✅ Kept for 90 days minimum

---

## 🛡️ Rollback Strategy

### Per-User Rollback
```typescript
async function rollbackUser(userId: string) {
  // 1. Load backup
  const backup = await loadUserBackup(userId);
  
  // 2. Restore to old format
  await restoreUserToOldFormat(userId, backup);
  
  // 3. Mark user as not migrated
  await markUserAsNotMigrated(userId);
  
  // 4. Log rollback
  await logRollback(userId, "User requested rollback");
}
```

### Full System Rollback
```typescript
async function rollbackSystem() {
  // 1. Load pre-migration backup
  const backup = await loadPreMigrationBackup();
  
  // 2. Restore old data file
  await restoreOldDataFile(backup);
  
  // 3. Update code to use old format
  await switchToOldFormat();
  
  // 4. Notify users
  await notifyUsers("System rolled back to previous version");
}
```

---

## ✅ Migration Validation

### Validation Checks
```typescript
async function validateMigration(userId: string) {
  // 1. Load old data
  const oldData = await loadUserDataFromOldFormat(userId);
  
  // 2. Load new data
  const encryptionKey = await deriveKeyFromPassword(oldData.password);
  const newData = await decryptUserData(
    await readUserDataFromNewFormat(userId),
    encryptionKey
  );
  
  // 3. Compare
  const checks = {
    userCount: oldData.incomes.length === newData.incomes.length,
    incomeTotal: calculateTotal(oldData.incomes) === calculateTotal(newData.incomes),
    expenseTotal: calculateTotal(oldData.fixedExpenses) === calculateTotal(newData.fixedExpenses),
    // ... all entities
  };
  
  if (!Object.values(checks).every(v => v)) {
    throw new Error("Migration validation failed");
  }
  
  return { valid: true, checks };
}
```

---

## 📋 Migration Checklist

### Pre-Migration
- [ ] Create full backup of `data/finflow-data.json`
- [ ] Validate current data integrity
- [ ] Test migration on dummy data
- [ ] Create rollback plan

### During Migration
- [ ] Implement dual-write (1-2 weeks)
- [ ] Monitor for errors
- [ ] Validate migrated data
- [ ] Test with small user group

### Post-Migration
- [ ] Verify all users migrated
- [ ] Archive old data
- [ ] Monitor for issues
- [ ] Keep old format code for 30 days

---

## 🚨 Risk Mitigation

### Risk 1: Data Loss During Migration
**Mitigation:**
- ✅ Full backup before migration
- ✅ Dual-write period
- ✅ Per-user validation
- ✅ Rollback capability

### Risk 2: Encryption Key Loss
**Mitigation:**
- ✅ Key derived from password (user controls)
- ✅ Clear warnings about password recovery
- ✅ Migration only on login (user provides password)

### Risk 3: Migration Failure
**Mitigation:**
- ✅ Per-user migration (isolated failures)
- ✅ Fallback to old format
- ✅ Detailed error logging
- ✅ Manual migration tool

### Risk 4: Performance Impact
**Mitigation:**
- ✅ Gradual migration (user-by-user)
- ✅ Background migration
- ✅ No downtime
- ✅ Monitor performance

---

## 📊 Migration Status Tracking

```typescript
type MigrationStatus = {
  totalUsers: number;
  migratedUsers: number;
  failedMigrations: number;
  migrationProgress: number; // percentage
  lastMigration: string; // timestamp
  errors: MigrationError[];
}

async function getMigrationStatus(): Promise<MigrationStatus> {
  const users = await getAllUsers();
  const migrated = users.filter(u => u.migrated);
  const failed = await getFailedMigrations();
  
  return {
    totalUsers: users.length,
    migratedUsers: migrated.length,
    failedMigrations: failed.length,
    migrationProgress: (migrated.length / users.length) * 100,
    lastMigration: migrated.sort((a, b) => 
      new Date(b.migratedAt).getTime() - new Date(a.migratedAt).getTime()
    )[0]?.migratedAt || null,
    errors: failed
  };
}
```

---

## 🎯 Success Criteria

### Migration Complete When:
- ✅ 100% of users migrated
- ✅ All data validated
- ✅ Zero data loss
- ✅ Zero user complaints
- ✅ Performance maintained or improved

### Migration Safe When:
- ✅ Backup created
- ✅ Dual-write working
- ✅ Validation passing
- ✅ Rollback tested
- ✅ Monitoring in place

---

## 📝 Summary

**GUARANTEE: NO USER DATA WILL BE LOST**

1. **Full Backup** - Created before any changes
2. **Dual-Write Period** - Both formats stay in sync
3. **Gradual Migration** - User-by-user, on login
4. **Validation** - Every migration validated
5. **Rollback** - Can revert anytime
6. **Archive** - Old data kept for 90 days

**Users will experience:**
- ✅ No downtime
- ✅ No data loss
- ✅ Seamless transition
- ✅ Automatic migration on login

---

**Ready to migrate safely!** 🚀

