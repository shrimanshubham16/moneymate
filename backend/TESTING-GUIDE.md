# 🧪 Supabase Migration Testing Guide

## Quick Start

### 1. Start the Backend Server

```bash
cd backend
npm run dev
```

The server should start on `http://localhost:12022`

### 2. Run Automated Tests

```bash
npm run test-endpoints
```

This will run a comprehensive test suite that checks:
- ✅ Supabase connection
- ✅ Health endpoint
- ✅ User signup/login
- ✅ Dashboard data fetching
- ✅ CRUD operations (incomes, expenses)
- ✅ Health calculations
- ✅ Preferences
- ✅ Activities
- ✅ Direct database queries

## Manual Testing Checklist

### Authentication Tests
- [ ] **Signup**: Create a new user
  ```bash
  curl -X POST http://localhost:12022/auth/signup \
    -H "Content-Type: application/json" \
    -d '{"username":"testuser","password":"Test123!@#"}'
  ```

- [ ] **Login**: Login with credentials
  ```bash
  curl -X POST http://localhost:12022/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"testuser","password":"Test123!@#"}'
  ```

- [ ] **Get Me**: Verify token works
  ```bash
  curl http://localhost:12022/auth/me \
    -H "Authorization: Bearer YOUR_TOKEN"
  ```

### Dashboard Tests
- [ ] **Get Dashboard**: Fetch all user data
  ```bash
  curl http://localhost:12022/dashboard \
    -H "Authorization: Bearer YOUR_TOKEN"
  ```

- [ ] **Verify Data**: Check that:
  - Incomes are returned
  - Fixed expenses are returned
  - Variable plans are returned
  - Investments are returned
  - Health score is calculated
  - Constraint score is present

### CRUD Tests

#### Incomes
- [ ] **Create Income**
  ```bash
  curl -X POST http://localhost:12022/planning/income \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"source":"Salary","amount":50000,"frequency":"monthly"}'
  ```

- [ ] **Get Incomes**: Verify created income appears
- [ ] **Update Income**: Modify an income
- [ ] **Delete Income**: Remove an income

#### Fixed Expenses
- [ ] **Create Fixed Expense**
- [ ] **Get Fixed Expenses**: Verify created expense appears
- [ ] **Update Fixed Expense**
- [ ] **Delete Fixed Expense**

#### Variable Expenses
- [ ] **Create Variable Plan**
- [ ] **Add Actual Expense** to a plan
- [ ] **Get Variable Expenses**: Verify plan and actuals
- [ ] **Update Variable Plan**
- [ ] **Delete Variable Plan**

### Health & Calculations
- [ ] **Get Health Details**: Verify calculation
  ```bash
  curl http://localhost:12022/health/details \
    -H "Authorization: Bearer YOUR_TOKEN"
  ```

- [ ] **Verify Health Formula**: Check that:
  - Total income is correct
  - Payments made are tracked
  - Unpaid obligations are calculated
  - Health category is correct

### Preferences
- [ ] **Get Preferences**: Should return default or user preferences
- [ ] **Update Preferences**: Change month start day
- [ ] **Verify Persistence**: Check preferences persist across requests

### Credit Cards
- [ ] **Create Credit Card**
- [ ] **Get Credit Cards**
- [ ] **Make Payment**
- [ ] **Update Bill Amount**
- [ ] **Reset Billing**

### Activities
- [ ] **Get Activities**: Should show user's activity log
- [ ] **Verify Activities**: Check that CRUD operations create activities

## Database Verification

### Check Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **Table Editor**
3. Verify data in tables:
   - `users` - Should have test users
   - `incomes` - Should have created incomes
   - `fixed_expenses` - Should have created expenses
   - `variable_expense_plans` - Should have plans
   - `variable_expense_actuals` - Should have actuals
   - `constraint_scores` - Should have per-user scores
   - `user_preferences` - Should have preferences

### Direct Database Query Test

```bash
npm run test-supabase
```

This tests direct database connectivity.

## Common Issues & Solutions

### Issue: "Connection failed"
- **Solution**: Check `.env` file has correct Supabase credentials
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set

### Issue: "401 Unauthorized"
- **Solution**: Token might be expired or invalid
- Try logging in again to get a fresh token

### Issue: "404 Not Found"
- **Solution**: Check that the endpoint path is correct
- Verify server is running on the correct port

### Issue: "Data not persisting"
- **Solution**: Check Supabase connection
- Verify database schema is created
- Check for errors in server logs

## Performance Testing

### Load Test (Optional)

```bash
# Install Apache Bench (if not installed)
# macOS: brew install httpd
# Linux: apt-get install apache2-utils

# Test dashboard endpoint
ab -n 100 -c 10 -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:12022/dashboard
```

## Expected Results

After successful migration:
- ✅ All endpoints return data from Supabase
- ✅ Data persists across server restarts
- ✅ Health calculations are accurate
- ✅ CRUD operations work correctly
- ✅ No errors in server logs
- ✅ Database queries are fast (< 200ms)

## Next Steps

Once all tests pass:
1. ✅ Remove maintenance mode from frontend
2. ✅ Deploy to production
3. ✅ Monitor for any issues
4. ✅ Remove old JSON file storage code (optional)

