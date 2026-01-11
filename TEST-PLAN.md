# FinFlow Test Plan

## Overview
Comprehensive test coverage for FinFlow application ensuring all features work correctly and regressions are caught before deployment.

---

## 1. API Tests (Backend - Supabase Edge Functions)

### 1.1 Authentication
| Test ID | Endpoint | Method | Description | Priority |
|---------|----------|--------|-------------|----------|
| AUTH-001 | `/auth/signup` | POST | Create new user with valid data | P0 |
| AUTH-002 | `/auth/signup` | POST | Reject invalid username (<3 chars) | P0 |
| AUTH-003 | `/auth/signup` | POST | Reject invalid password (<8 chars) | P0 |
| AUTH-004 | `/auth/signup` | POST | Reject duplicate username | P0 |
| AUTH-005 | `/auth/signup` | POST | Return encryption_salt on success | P0 |
| AUTH-006 | `/auth/login` | POST | Login with valid credentials | P0 |
| AUTH-007 | `/auth/login` | POST | Reject invalid credentials | P0 |
| AUTH-008 | `/auth/login` | POST | Return encryption_salt on success | P0 |
| AUTH-009 | `/auth/login` | POST | Account lockout after 5 failed attempts | P1 |
| AUTH-010 | `/auth/salt/:username` | GET | Return salt for existing user | P0 |
| AUTH-011 | `/auth/me` | GET | Return user profile with token | P0 |
| AUTH-012 | `/auth/verify-email` | POST | Verify email with correct code | P1 |
| AUTH-013 | `/auth/forgot-password` | POST | Send reset code to email | P1 |
| AUTH-014 | `/auth/reset-password` | POST | Reset password with valid code + recovery key | P1 |

### 1.2 Incomes
| Test ID | Endpoint | Method | Description | Priority |
|---------|----------|--------|-------------|----------|
| INC-001 | `/planning/income` | POST | Create income with plaintext | P0 |
| INC-002 | `/planning/income` | POST | Create income with encrypted fields | P0 |
| INC-003 | `/planning/income` | POST | Store [encrypted] when no plaintext | P0 |
| INC-004 | `/planning/income/:id` | PUT | Update income | P0 |
| INC-005 | `/planning/income/:id` | DELETE | Delete income | P0 |
| INC-006 | `/dashboard` | GET | Return incomes in response | P0 |

### 1.3 Fixed Expenses
| Test ID | Endpoint | Method | Description | Priority |
|---------|----------|--------|-------------|----------|
| FIX-001 | `/planning/fixed-expenses` | POST | Create fixed expense | P0 |
| FIX-002 | `/planning/fixed-expenses` | POST | Create with is_sip_flag=true | P0 |
| FIX-003 | `/planning/fixed-expenses` | POST | Create with encrypted fields | P0 |
| FIX-004 | `/planning/fixed-expenses/:id` | PUT | Update fixed expense | P0 |
| FIX-005 | `/planning/fixed-expenses/:id` | DELETE | Delete fixed expense | P0 |

### 1.4 Variable Expenses
| Test ID | Endpoint | Method | Description | Priority |
|---------|----------|--------|-------------|----------|
| VAR-001 | `/planning/variable-expenses` | POST | Create variable plan | P0 |
| VAR-002 | `/planning/variable-expenses/:id/actuals` | POST | Add actual expense | P0 |
| VAR-003 | `/planning/variable-expenses/:id/actuals` | POST | Add with credit card payment | P1 |
| VAR-004 | `/planning/variable-expenses/:id` | DELETE | Delete plan | P0 |

### 1.5 Investments
| Test ID | Endpoint | Method | Description | Priority |
|---------|----------|--------|-------------|----------|
| INV-001 | `/planning/investments` | POST | Create investment | P0 |
| INV-002 | `/planning/investments/:id` | PUT | Update investment | P0 |
| INV-003 | `/planning/investments/:id/pause` | POST | Pause investment | P0 |
| INV-004 | `/planning/investments/:id/resume` | POST | Resume investment | P0 |
| INV-005 | `/planning/investments/:id` | DELETE | Delete investment | P0 |

### 1.6 Credit Cards
| Test ID | Endpoint | Method | Description | Priority |
|---------|----------|--------|-------------|----------|
| CC-001 | `/debts/credit-cards` | GET | List credit cards | P0 |
| CC-002 | `/debts/credit-cards` | POST | Create credit card | P0 |
| CC-003 | `/debts/credit-cards/:id` | PUT | Update credit card | P0 |
| CC-004 | `/debts/credit-cards/:id/payments` | POST | Make payment | P0 |
| CC-005 | `/debts/credit-cards/:id` | DELETE | Delete credit card | P0 |

### 1.7 Loans
| Test ID | Endpoint | Method | Description | Priority |
|---------|----------|--------|-------------|----------|
| LOAN-001 | `/debts/loans` | GET | List loans | P0 |
| LOAN-002 | `/debts/loans` | POST | Create loan | P0 |
| LOAN-003 | `/debts/loans/:id` | DELETE | Delete loan | P0 |

### 1.8 Payments & Dues
| Test ID | Endpoint | Method | Description | Priority |
|---------|----------|--------|-------------|----------|
| PAY-001 | `/payments/mark-paid` | POST | Mark fixed expense as paid | P0 |
| PAY-002 | `/payments/mark-paid` | POST | Mark investment as paid | P0 |
| PAY-003 | `/payments/mark-unpaid` | POST | Mark as unpaid | P0 |
| PAY-004 | `/payments/status` | GET | Get payment status | P0 |

### 1.9 Dashboard & Health
| Test ID | Endpoint | Method | Description | Priority |
|---------|----------|--------|-------------|----------|
| DASH-001 | `/dashboard` | GET | Return all dashboard data | P0 |
| DASH-002 | `/dashboard` | GET | Include health score | P0 |
| DASH-003 | `/health/details` | GET | Return detailed health breakdown | P0 |

### 1.10 User Profile & Encryption
| Test ID | Endpoint | Method | Description | Priority |
|---------|----------|--------|-------------|----------|
| USER-001 | `/user/profile` | GET | Return user profile | P0 |
| USER-002 | `/user/enable-encryption` | POST | Enable encryption | P0 |
| USER-003 | `/user/password` | PUT | Change password | P0 |

---

## 2. Frontend Unit Tests

### 2.1 Crypto Functions
| Test ID | Function | Description | Priority |
|---------|----------|-------------|----------|
| CRYPTO-001 | `deriveKey` | Derive key from password + salt | P0 |
| CRYPTO-002 | `encryptString` | Encrypt a string | P0 |
| CRYPTO-003 | `decryptString` | Decrypt a string | P0 |
| CRYPTO-004 | `encryptObjectFields` | Encrypt sensitive fields in object | P0 |
| CRYPTO-005 | `decryptObjectFields` | Decrypt sensitive fields in object | P0 |
| CRYPTO-006 | `generateSalt` | Generate random salt | P0 |
| CRYPTO-007 | `generateRecoveryKey` | Generate 24-word recovery key | P0 |

### 2.2 CryptoContext
| Test ID | Description | Priority |
|---------|-------------|----------|
| CTX-001 | Key is null initially | P0 |
| CTX-002 | setKey updates key state | P0 |
| CTX-003 | clearKey sets key to null | P0 |
| CTX-004 | Key persists across re-renders | P0 |

### 2.3 useEncryptedApiCalls Hook
| Test ID | Description | Priority |
|---------|-------------|----------|
| HOOK-001 | Returns all API functions | P0 |
| HOOK-002 | Passes key to API calls when present | P0 |
| HOOK-003 | Passes undefined when key is null | P0 |

---

## 3. E2E UI Tests (Playwright)

### 3.1 Authentication Flow
| Test ID | Flow | Description | Priority |
|---------|------|-------------|----------|
| E2E-AUTH-001 | Signup | Complete signup with email | P0 |
| E2E-AUTH-002 | Signup | Recovery key modal appears | P0 |
| E2E-AUTH-003 | Login | Login with valid credentials | P0 |
| E2E-AUTH-004 | Login | Encryption key is set after login | P0 |
| E2E-AUTH-005 | Logout | Key is cleared on logout | P0 |

### 3.2 Income Management
| Test ID | Flow | Description | Priority |
|---------|------|-------------|----------|
| E2E-INC-001 | Create | Add new income source | P0 |
| E2E-INC-002 | Create | Data is encrypted in DB | P0 |
| E2E-INC-003 | Read | Income displays correctly | P0 |
| E2E-INC-004 | Update | Edit income | P0 |
| E2E-INC-005 | Delete | Delete income | P0 |

### 3.3 Dashboard
| Test ID | Flow | Description | Priority |
|---------|------|-------------|----------|
| E2E-DASH-001 | Load | Dashboard loads with data | P0 |
| E2E-DASH-002 | Health | Health score displays | P0 |
| E2E-DASH-003 | Dues | Dues widget shows correct items | P0 |

### 3.4 Dues & Payments
| Test ID | Flow | Description | Priority |
|---------|------|-------------|----------|
| E2E-DUE-001 | List | Dues page shows all obligations | P0 |
| E2E-DUE-002 | Pay | Mark item as paid | P0 |
| E2E-DUE-003 | Pay | Health score updates after payment | P0 |

### 3.5 Encryption
| Test ID | Flow | Description | Priority |
|---------|------|-------------|----------|
| E2E-ENC-001 | Verify | New data is encrypted in DB | P0 |
| E2E-ENC-002 | Verify | Encrypted data decrypts correctly | P0 |
| E2E-ENC-003 | Password | Re-encryption on password change | P1 |

---

## 4. Test Execution Strategy

### Pre-commit Checks
```bash
npm run test:api      # Run all API tests
npm run test:unit     # Run frontend unit tests
npm run test:e2e      # Run Playwright E2E tests (headless)
```

### CI/CD Pipeline
1. On PR: Run API + Unit tests
2. On merge to main: Run all tests including E2E
3. Before deploy: Full test suite must pass

### Test Data Management
- Use isolated test database/users
- Clean up test data after each test
- Use unique identifiers (timestamps) for test data

---

## 5. Known Issues to Test

### CRITICAL: Encryption Key Not Set (Current Bug)
- **Symptom**: `key present: false` in all logs
- **Root Cause**: Login flow not calling `cryptoCtx.setKey()`
- **Test**: E2E-AUTH-004 must verify key is set after login

---

## 6. Test Environment

### API Tests
- Direct HTTP calls to Supabase Edge Functions
- Use test user credentials
- Verify database state after operations

### UI Tests
- Playwright with Chromium
- Headless mode for CI
- Screenshots on failure

