# 🚀 Quick Test Guide

## Step 1: Start the Server

```bash
cd backend
npm run dev
```

Wait for: `🚀 FinFlow backend listening on port 12022`

## Step 2: Run Automated Tests

In a **new terminal**, run:

```bash
cd backend
npm run test-endpoints
```

This will automatically test:
- ✅ Supabase connection
- ✅ Health endpoint
- ✅ User signup & login
- ✅ Dashboard data
- ✅ CRUD operations
- ✅ Health calculations
- ✅ Preferences
- ✅ Activities

## Step 3: Manual Quick Test

### Test Signup & Login

```bash
# Signup
curl -X POST http://localhost:12022/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"Test123!@#"}'

# Login (save the token from response)
curl -X POST http://localhost:12022/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"Test123!@#"}'
```

### Test Dashboard (replace YOUR_TOKEN)

```bash
curl http://localhost:12022/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test Create Income

```bash
curl -X POST http://localhost:12022/planning/income \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"source":"Test Salary","amount":50000,"frequency":"monthly"}'
```

## Expected Results

✅ All tests should pass  
✅ Data should appear in Supabase dashboard  
✅ No errors in server logs  

## If Tests Fail

1. Check `.env` file has Supabase credentials
2. Verify server is running
3. Check Supabase connection: `npm run test-supabase`
4. See `TESTING-GUIDE.md` for detailed troubleshooting



