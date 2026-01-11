# 🔄 Supabase Migration Plan

## Status: In Progress

### ✅ Completed
1. ✅ Created Supabase database schema
2. ✅ Migrated all data to Supabase (12 users, 105 records)
3. ✅ Created `supabase-db.ts` - Database access layer
4. ✅ Created `store-supabase.ts` - Compatibility layer

### ⏳ In Progress
5. ⏳ Update `auth.ts` to use Supabase (async)
6. ⏳ Update `preferences.ts` to use Supabase (async)
7. ⏳ Update `server.ts` endpoints to use Supabase queries
8. ⏳ Update `alerts.ts` to use Supabase
9. ⏳ Update `mergedFinances.ts` to use Supabase

### 📋 Migration Strategy

#### Phase 1: Update Core Functions (ASYNC)
- **Issue**: Current `store.ts` functions are synchronous, but Supabase is async
- **Solution**: Update all functions to be async and update all callers

#### Phase 2: Update Auth
- Replace `getUserByUsername()` with async Supabase call
- Replace `createUser()` with async Supabase call
- Update `updateUserPassword()` to use Supabase

#### Phase 3: Update Preferences
- Replace `getUserPreferences()` with async Supabase call
- Replace `updateUserPreferences()` with async Supabase call

#### Phase 4: Update Server Endpoints
- Update `/dashboard` endpoint to use async Supabase queries
- Update all CRUD endpoints (incomes, expenses, etc.)
- Update all filtering to use Supabase queries instead of `getStore()`

#### Phase 5: Testing
- Test all endpoints
- Verify data integrity
- Test with real user data

---

## Critical Changes Needed

### 1. All Store Functions → Async
```typescript
// OLD (sync)
const user = getUserByUsername(username);

// NEW (async)
const user = await getUserByUsername(username);
```

### 2. Server Endpoints → Async
```typescript
// OLD
app.get("/dashboard", requireAuth, (req, res) => {
  const store = getStore();
  const userIncomes = store.incomes.filter(i => i.userId === userId);
  // ...
});

// NEW
app.get("/dashboard", requireAuth, async (req, res) => {
  const userIncomes = await db.getIncomesByUserId(userId);
  // ...
});
```

### 3. Replace getStore() Calls
- Instead of: `const store = getStore(); store.incomes.filter(...)`
- Use: `const incomes = await db.getIncomesByUserId(userId);`

---

## Files to Update

1. ✅ `supabase-db.ts` - Created
2. ✅ `store-supabase.ts` - Created (compatibility layer)
3. ⏳ `auth.ts` - Update to async
4. ⏳ `preferences.ts` - Update to async
5. ⏳ `server.ts` - Update all endpoints
6. ⏳ `alerts.ts` - Update constraint score access
7. ⏳ `mergedFinances.ts` - Update shared account queries
8. ⏳ `logic.ts` - Update if it uses getStore()

---

## Next Steps

1. Update `auth.ts` to use async Supabase functions
2. Update `preferences.ts` to use async Supabase functions
3. Update `server.ts` endpoints one by one
4. Test each endpoint after updating
5. Remove old `store.ts` file once migration is complete

---

**Note**: This is a breaking change - all functions become async. We need to update all callers.


