# Fix: "Unauthorized" Error When Adding Expenses

## 🐛 Issue
Getting "Unauthorized" error when trying to add expenses after login.

## 🔍 Root Cause
The issue occurs when:
1. Token is not saved in localStorage after login
2. Token is cleared on page reload
3. Backend restarted and tokens were cleared (in-memory storage)

## ✅ Quick Fix

### Option 1: Logout and Login Again (Recommended)
1. Click **Logout** button (Settings → Account → Logout)
2. **Signup/Login** again
3. Token will be fresh and valid
4. Try adding expense again ✅

### Option 2: Check Token in Browser
1. Open browser **DevTools** (F12 or Right-click → Inspect)
2. Go to **Console** tab
3. Type: `localStorage.getItem('token')`
4. Press Enter
5. **If null**: You need to login again
6. **If shows token**: Backend was restarted, login again

### Option 3: Hard Refresh
1. Press **Ctrl+Shift+R** (Windows/Linux) or **Cmd+Shift+R** (Mac)
2. This clears cache and reloads
3. You'll be at login screen
4. Login again ✅

## 🔧 Why This Happens

### Backend Uses In-Memory Token Storage
- Tokens are stored in RAM (not database)
- When backend restarts → all tokens are cleared
- This is **by design** for demo/development
- In production, tokens would be in database or Redis

### Token Lifecycle
```
1. User logs in → Backend creates token → Frontend saves to localStorage
2. User makes request → Frontend sends token → Backend validates
3. Backend restarts → All tokens cleared from memory
4. User makes request → Token no longer valid → 401 Unauthorized
```

## 🛠️ Permanent Fix (For Development)

### Make Backend Tokens Persistent Across Restarts

**File**: `backend/src/auth.ts`

Add token persistence:

```typescript
import fs from 'fs';
import path from 'path';

const TOKEN_FILE = path.join(__dirname, '../../.tokens.json');

// Load tokens on startup
function loadTokens() {
  try {
    if (fs.existsSync(TOKEN_FILE)) {
      const data = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf-8'));
      Object.entries(data).forEach(([token, user]) => {
        tokens.set(token, user as AuthToken);
      });
      console.log(`Loaded ${tokens.size} tokens from disk`);
    }
  } catch (e) {
    console.error('Failed to load tokens:', e);
  }
}

// Save tokens to disk
function saveTokens() {
  try {
    const data = Object.fromEntries(tokens);
    fs.writeFileSync(TOKEN_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Failed to save tokens:', e);
  }
}

// Call loadTokens on startup
loadTokens();

// Update issueToken to save
function issueToken(userId: string, username: string): string {
  const token = randomUUID();
  tokens.set(token, { userId, username });
  saveTokens(); // Save to disk
  return token;
}
```

**Note**: This is for development only. Production should use proper session management.

## 🧪 Test the Fix

### Test 1: Login and Add Expense
```bash
# 1. Login
curl -X POST http://localhost:12022/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"Test@1234"}'

# Copy the access_token from response

# 2. Add expense (replace TOKEN)
curl -X POST http://localhost:12022/planning/income \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"source":"Salary","amount":50000,"frequency":"monthly"}'

# Expected: Success with data
```

### Test 2: Verify Token in Browser
1. Open http://localhost:5173
2. Login
3. Open DevTools → Console
4. Run: `localStorage.getItem('token')`
5. Should show a UUID token
6. Try adding expense
7. Should work ✅

## 📋 Checklist

- [ ] Logged out completely
- [ ] Logged in again
- [ ] Token exists in localStorage
- [ ] Backend is running (http://localhost:12022)
- [ ] Frontend is running (http://localhost:5173)
- [ ] Try adding expense again

## 🚀 Prevention

### For Users
1. **Don't restart backend** during active session
2. If backend restarts → **logout and login again**
3. Keep browser tab open (don't close)

### For Developers
1. Implement token persistence (see above)
2. Use Redis for token storage
3. Implement refresh tokens
4. Add token expiry and renewal

---

## ✅ Solution Summary

**Immediate Fix**: Logout → Login → Try Again

**Why**: Backend restart cleared in-memory tokens

**Prevention**: Implement persistent token storage or use database

---

**Try logging out and logging in again - that should fix the Unauthorized error!** 🎉

