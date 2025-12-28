# MoneyMate Testing Guide

## 🚀 Quick Access

**Frontend**: http://localhost:5173  
**Backend API**: http://localhost:12022

---

## 🧪 Test Scenarios

### 1. **Test Weak Password Rejection**

**Steps**:
1. Go to http://localhost:5173
2. You should see the signup form
3. Enter username: `testuser`
4. Enter password: `test1234`
5. **Expected**: Yellow warning box shows missing requirements:
   - "One uppercase letter"
   - "One special character"
6. Signup button should be **disabled**

### 2. **Test Strong Password Success**

**Steps**:
1. Clear the password field
2. Enter password: `Test@1234`
3. **Expected**: No warning, requirements satisfied
4. Click "Sign Up"
5. **Expected**: Successfully logged in, redirected to dashboard

### 3. **Test Account Lockout**

**Steps**:
1. Logout (if logged in)
2. Click "Already have an account? Login"
3. Enter username: `testuser`
4. Enter WRONG password: `wrong123`
5. Click "Login"
6. **Expected**: Error message "Invalid credentials. 2 attempts remaining"

7. Try again with wrong password
8. **Expected**: "Invalid credentials. 1 attempt remaining"

9. Try third time with wrong password
10. **Expected**: "Account locked for 10 minutes"

11. Try to login again
12. **Expected**: "Account temporarily locked. Try again in X seconds"

13. Wait 10 minutes (or modify backend timeout for testing)
14. **Expected**: Can login again with correct password

### 4. **Test Export Functionality**

**Steps**:
1. Login with valid credentials
2. On dashboard, look for green "📥 Export" button in top right
3. Click the Export button
4. **Expected**: Navigate to /export page
5. Click the large "📥 Export Data" button
6. **Expected**: JSON file downloads to your Downloads folder
7. **Filename**: `moneymate-export-YYYY-MM-DD.json`

8. Open the JSON file in a text editor
9. **Expected**: See structured JSON with:
   - exportDate
   - user (id, username)
   - health
   - constraintScore
   - incomes
   - fixedExpenses
   - variableExpenses
   - investments
   - futureBombs
   - creditCards
   - loans
   - activities (last 50)
   - alerts
   - summary (totals and calculations)

### 5. **Test Username Requirements**

**Steps**:
1. Try to signup with username: `ab` (too short)
2. **Expected**: Browser validation error (min 3 characters)

3. Try username: `test user` (contains space)
4. **Expected**: Browser validation error (invalid characters)

5. Try username: `test-user` (contains hyphen)
6. **Expected**: Browser validation error (only letters, numbers, underscores)

7. Try username: `valid_user123` (valid)
8. **Expected**: Proceeds to password validation

### 6. **Test Duplicate Username**

**Steps**:
1. Signup with username: `duplicate_test` and password: `Test@1234`
2. **Expected**: Success
3. Logout
4. Try to signup again with same username: `duplicate_test`
5. **Expected**: Error "Username already exists"

### 7. **Test Username-Only Sharing**

**Steps**:
1. Login
2. Go to Settings → Sharing
3. Click "Bring Aboard a Companion"
4. **Expected**: Form shows "Username" field (not email)
5. Enter another user's username
6. Select role (Editor/Viewer)
7. **Expected**: Sharing request sent successfully

---

## 🔍 API Testing (cURL)

### Test Weak Password
```bash
curl -X POST http://localhost:12022/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"weaktest","password":"test123"}'
```
**Expected**: 400 error with password requirements list

### Test Strong Password Signup
```bash
curl -X POST http://localhost:12022/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"strongtest","password":"Strong@123"}'
```
**Expected**: 201 success with access_token and user object

### Test Login Failures (Account Lockout)
```bash
# First attempt
curl -X POST http://localhost:12022/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"strongtest","password":"wrong"}'

# Expected: 401 with "remainingAttempts": 2

# Second attempt
curl -X POST http://localhost:12022/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"strongtest","password":"wrong"}'

# Expected: 401 with "remainingAttempts": 1

# Third attempt
curl -X POST http://localhost:12022/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"strongtest","password":"wrong"}'

# Expected: 423 (Locked) with "lockoutTime": 600

# Fourth attempt (during lockout)
curl -X POST http://localhost:12022/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"strongtest","password":"Strong@123"}'

# Expected: 423 (Locked) with "remainingTime" in seconds
```

### Test Successful Login
```bash
curl -X POST http://localhost:12022/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"strongtest","password":"Strong@123"}'
```
**Expected**: 200 success with access_token

### Test Export (Replace TOKEN)
```bash
TOKEN="your-token-here"

curl -X GET http://localhost:12022/export/finances \
  -H "Authorization: Bearer $TOKEN" \
  -o export.json

# View the exported file
cat export.json | jq .
```
**Expected**: JSON file with all financial data

---

## 📊 Validation Checklist

### Password Validation
- [ ] Min 8 characters enforced
- [ ] Uppercase letter required
- [ ] Lowercase letter required
- [ ] Number required
- [ ] Special character required
- [ ] Real-time feedback shown
- [ ] Signup button disabled until valid

### Username Validation
- [ ] Min 3 characters enforced
- [ ] Max 20 characters enforced
- [ ] Only alphanumeric + underscore allowed
- [ ] Unique username enforced
- [ ] Clear error messages

### Account Lockout
- [ ] First failure shows "2 attempts remaining"
- [ ] Second failure shows "1 attempt remaining"
- [ ] Third failure locks account
- [ ] Lockout message shows remaining time
- [ ] Can't login during lockout
- [ ] Auto-unlocks after 10 minutes
- [ ] Successful login resets counter

### Export Feature
- [ ] Export button visible on dashboard
- [ ] Export page loads correctly
- [ ] Export button triggers download
- [ ] JSON file downloads successfully
- [ ] Filename includes date
- [ ] JSON is valid and readable
- [ ] All data sections present
- [ ] Summary calculations correct

---

## 🐛 Common Issues & Fixes

### Issue: Backend not responding
**Fix**:
```bash
lsof -ti:12022 | xargs kill -9
cd MoneyMate/backend && npm run dev
```

### Issue: Frontend not loading
**Fix**:
```bash
lsof -ti:5173 | xargs kill -9
cd MoneyMate/web && npm run dev
```

### Issue: CORS errors
**Fix**: Backend has CORS enabled. Restart backend if you see CORS errors.

### Issue: "Invalid credentials" on correct password
**Fix**: Account might be locked. Wait 10 minutes or check backend console for failed login records.

### Issue: Export downloads empty file
**Fix**: Check that you're logged in and have data in your account. Check browser console for errors.

---

## ✅ Expected Test Results

### All Tests Passing
```
✅ Weak password rejected
✅ Strong password accepted
✅ Account locks after 3 failures
✅ Lockout timer displays correctly
✅ Account unlocks after 10 minutes
✅ Export button accessible
✅ Export downloads JSON file
✅ JSON contains all data
✅ Username validation works
✅ Duplicate username rejected
✅ No email field in forms
✅ Sharing uses username only
```

---

## 🎯 Performance Expectations

- **Signup**: < 200ms
- **Login**: < 200ms
- **Export**: < 500ms (depends on data size)
- **Page load**: < 1s
- **Navigation**: < 100ms

---

## 📝 Notes

1. **Password**: Requirements are enforced both client-side (UI) and server-side (API)
2. **Lockout**: Tracked per username, not per IP (for demo purposes)
3. **Export**: Includes only your own data (multi-user safe)
4. **Token**: JWT token stored in localStorage (persists across page reloads)

---

## 🎉 Success Criteria

If all tests pass, you should be able to:
- ✅ Only signup with strong passwords
- ✅ See clear feedback on password requirements
- ✅ Experience account lockout after 3 failures
- ✅ Export complete financial data as JSON
- ✅ Login using only username (no email)
- ✅ Share finances using username

**Happy Testing!** 🚀

