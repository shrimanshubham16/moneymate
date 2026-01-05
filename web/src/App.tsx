import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { login, signup, fetchSalt } from "./api";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { DashboardPage } from "./pages/DashboardPage";
import { SettingsPage } from "./pages/SettingsPage";
import { PlanFinancesPage } from "./pages/PlanFinancesPage";
import { FixedExpensesPage } from "./pages/FixedExpensesPage";
import { VariableExpensesPage } from "./pages/VariableExpensesPage";
import { InvestmentsPage } from "./pages/InvestmentsPage";
import { InvestmentsManagementPage } from "./pages/InvestmentsManagementPage";
import { CreditCardsPage } from "./pages/CreditCardsPage";
import { CreditCardsManagementPage } from "./pages/CreditCardsManagementPage";
import { LoansPage } from "./pages/LoansPage";
import { FutureBombsPage } from "./pages/FutureBombsPage";
import { ActivitiesPage } from "./pages/ActivitiesPage";
import { AlertsPage } from "./pages/AlertsPage";
import { DuesPage } from "./pages/DuesPage";
import { CurrentMonthExpensesPage } from "./pages/CurrentMonthExpensesPage";
import { SIPExpensesPage } from "./pages/SIPExpensesPage";
import { AccountPage } from "./pages/AccountPage";
import { AboutPage } from "./pages/AboutPage";
import { SharingPage } from "./pages/SharingPage";
import { SupportPage } from "./pages/SupportPage";
import { ExportPage } from "./pages/ExportPage";
import { IncomePage } from "./pages/IncomePage";
import { PreferencesPage } from "./pages/PreferencesPage";
import { HealthDetailsPage } from "./pages/HealthDetailsPage";
import { PrivacyPage } from "./pages/PrivacyPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { Header } from "./components/Header";
import { MaintenanceNotice } from "./components/MaintenanceNotice";
import { RecoveryKeyModal } from "./components/RecoveryKeyModal";
import { EmailVerificationModal } from "./components/EmailVerificationModal";
import { useCrypto } from "./contexts/CryptoContext";
import { deriveKey, generateRecoveryKey, generateSalt, hashRecoveryKey, saltFromBase64 } from "./lib/crypto";
import "./App.css";

// Enable maintenance mode - set to false when migration is complete
const MAINTENANCE_MODE = false;

function AuthForm({ onAuth, onForgotPassword }: { onAuth: (token: string) => void; onForgotPassword: () => void }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<string[]>([]);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [recoveryKey, setRecoveryKey] = useState<string | null>(null);
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [devVerificationCode, setDevVerificationCode] = useState<string | null>(null);
  const cryptoCtx = useCrypto();

  const handlePasswordChange = (newPassword: string) => {
    setPassword(newPassword);
    if (mode === "signup" && newPassword.length > 0) {
      const requirements = [];
      if (newPassword.length < 8) requirements.push("At least 8 characters");
      if (!/[A-Z]/.test(newPassword)) requirements.push("One uppercase letter");
      if (!/[a-z]/.test(newPassword)) requirements.push("One lowercase letter");
      if (!/[0-9]/.test(newPassword)) requirements.push("One number");
      if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) requirements.push("One special character");
      setPasswordStrength(requirements);
    } else {
      setPasswordStrength([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      let encryptionSalt: string | undefined;

      if (mode === "signup") {
        // Validate email if provided
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          setError("Invalid email format");
          setLoading(false);
          return;
        }
        
        const { b64: saltB64 } = generateSalt();
        encryptionSalt = saltB64;
        const newRecoveryKey = generateRecoveryKey();
        const recoveryKeyHash = await hashRecoveryKey(newRecoveryKey);
        const res = await signup(username, password, encryptionSalt, recoveryKeyHash, email || undefined);
        const key = await deriveKey(password, saltFromBase64(encryptionSalt));
        cryptoCtx.setKey(key, encryptionSalt);
        
        // Show recovery key modal before completing auth
        setRecoveryKey(newRecoveryKey);
        setPendingToken(res.access_token);
        setPendingEmail(email || null);
        setDevVerificationCode(res._dev_verification_code || null);
        setShowRecoveryModal(true);
        setLoading(false);
        return; // Don't complete auth yet - wait for modal close
      } else {
        const res = await login(username, password);
        encryptionSalt = res.encryption_salt;
        if (!encryptionSalt) {
          const saltRes = await fetchSalt(username);
          encryptionSalt = saltRes.encryption_salt;
        }
        if (!encryptionSalt) {
          throw new Error("Encryption salt not found for user");
        }
        const key = await deriveKey(password, saltFromBase64(encryptionSalt));
        cryptoCtx.setKey(key, encryptionSalt);
        onAuth(res.access_token);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleRecoveryModalClose = () => {
    setShowRecoveryModal(false);
    setRecoveryKey(null);
    
    // If email was provided, show verification modal
    if (pendingEmail && pendingToken) {
      setShowEmailVerification(true);
    } else if (pendingToken) {
      // No email, just complete auth
      onAuth(pendingToken);
      setPendingToken(null);
    }
  };
  
  const handleEmailVerificationClose = (verified: boolean) => {
    setShowEmailVerification(false);
    setPendingEmail(null);
    setDevVerificationCode(null);
    if (pendingToken) {
      onAuth(pendingToken);
      setPendingToken(null);
    }
  };

  return (
    <div className="auth-container">
      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="auth-header">
          <h1>FinFlow</h1>
          <p>Your Financial Companion</p>
        </div>
        
        {/* E2E Encryption Badge */}
        <div className="privacy-badge">
          <svg className="badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <div className="badge-content">
            <strong>End-to-End Encrypted</strong>
            <small>Your data encrypted on YOUR device. Only you can read it.</small>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              maxLength={20}
              pattern="[a-zA-Z0-9_]+"
              placeholder="your_unique_username"
              title="Only letters, numbers, and underscores allowed"
            />
            {mode === "signup" && (
              <small className="help-text">3-20 characters, letters, numbers, underscores only. Username is permanent.</small>
            )}
          </div>
          
          {mode === "signup" && (
            <div className="form-group">
              <label>Email <span className="optional-label">(recommended for recovery)</span></label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
              />
              <small className="help-text">
                Email helps recover your account if you forget your password. 
                You'll also receive a 24-word recovery key as backup.
              </small>
            </div>
          )}
          
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => handlePasswordChange(e.target.value)}
              required
              minLength={mode === "signup" ? 8 : 1}
              placeholder="••••••••"
            />
            {mode === "signup" && passwordStrength.length > 0 && (
              <div className="password-requirements">
                <small>Password must have:</small>
                <ul>
                  {passwordStrength.map((req, i) => (
                    <li key={i}>{req}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          {error && (
            <motion.div
              className="error-message"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {error}
            </motion.div>
          )}
          <button type="submit" disabled={loading || (mode === "signup" && passwordStrength.length > 0)} className="auth-submit">
            {loading ? (
              <span className="auth-loading">
                <span className="spinner"></span>
                <span>Processing...</span>
              </span>
            ) : mode === "login" ? "Login" : "Sign Up"}
          </button>
          
          {mode === "login" && (
            <button
              type="button"
              onClick={onForgotPassword}
              className="auth-forgot-password"
            >
              Forgot password?
            </button>
          )}
          
          <button
            type="button"
            onClick={() => { setMode(mode === "login" ? "signup" : "login"); setPasswordStrength([]); setEmail(""); }}
            className="auth-switch"
          >
            {mode === "login" ? "Don't have an account? Sign Up" : "Already have an account? Login"}
          </button>
        </form>
      </motion.div>
      
      {/* Recovery Key Modal - shown after signup */}
      {showRecoveryModal && recoveryKey && pendingToken && (
        <RecoveryKeyModal
          recoveryKey={recoveryKey}
          onClose={handleRecoveryModalClose}
        />
      )}
      
      {/* Email Verification Modal - shown after recovery key saved */}
      {showEmailVerification && pendingEmail && (
        <EmailVerificationModal
          email={pendingEmail}
          devCode={devVerificationCode}
          onClose={handleEmailVerificationClose}
        />
      )}
    </div>
  );
}

function AppRoutes({ token, onLogout }: { token: string; onLogout: () => void }) {
  return (
    <>
      <Header />
      <div className="app-content">
        <Routes>
          <Route path="/dashboard" element={<DashboardPage token={token} />} />
          <Route path="/health" element={<HealthDetailsPage token={token} />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/plan-finances" element={<PlanFinancesPage token={token} />} />
          <Route path="/settings/plan-finances/fixed" element={<FixedExpensesPage token={token} />} />
          <Route path="/settings/plan-finances/variable" element={<VariableExpensesPage token={token} />} />
          <Route path="/settings/plan-finances/investments" element={<InvestmentsManagementPage token={token} />} />
          <Route path="/settings/plan-finances/income" element={<IncomePage token={token} />} />
          <Route path="/settings/account" element={<AccountPage token={token} onLogout={onLogout} />} />
          <Route path="/settings/about" element={<AboutPage />} />
          <Route path="/settings/privacy" element={<PrivacyPage />} />
          <Route path="/settings/sharing" element={<SharingPage token={token} />} />
          <Route path="/settings/support" element={<SupportPage />} />
          <Route path="/settings/preferences" element={<PreferencesPage token={token} />} />
          <Route path="/settings/credit-cards" element={<CreditCardsManagementPage token={token} />} />
          <Route path="/settings/manage-debts/credit-cards" element={<CreditCardsManagementPage token={token} />} />
          <Route path="/investments" element={<InvestmentsPage token={token} />} />
          <Route path="/alerts" element={<AlertsPage token={token} />} />
          <Route path="/credit-cards" element={<CreditCardsManagementPage token={token} />} />
          <Route path="/loans" element={<LoansPage token={token} />} />
          <Route path="/future-bombs" element={<FutureBombsPage token={token} />} />
          <Route path="/activities" element={<ActivitiesPage token={token} />} />
          <Route path="/alerts" element={<AlertsPage token={token} />} />
          <Route path="/dues" element={<DuesPage token={token} />} />
          <Route path="/current-month-expenses" element={<CurrentMonthExpensesPage token={token} />} />
          <Route path="/sip-expenses" element={<SIPExpensesPage token={token} />} />
          <Route path="/export" element={<ExportPage token={token} />} />
          <Route path="/fixed-expenses" element={<FixedExpensesPage token={token} />} />
          <Route path="/variable-expenses" element={<VariableExpensesPage token={token} />} />          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>

    </div>
    </>
  );
}

export default function App() {
  const cryptoCtx = useCrypto();
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const handleAuth = (newToken: string) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
    window.location.href = "/dashboard";
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    cryptoCtx.clearKey();
    setToken(null);
  };

  return (
    <BrowserRouter>
      {MAINTENANCE_MODE && <MaintenanceNotice />}
      <AnimatePresence mode="wait" initial={false}>
        {token ? (
          <motion.div
            key="app"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <AppRoutes token={token} onLogout={handleLogout} />
          </motion.div>
        ) : showForgotPassword ? (
          <motion.div
            key="forgot"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <ForgotPasswordPage onBack={() => setShowForgotPassword(false)} />
          </motion.div>
        ) : (
          <motion.div
            key="auth"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <AuthForm onAuth={handleAuth} onForgotPassword={() => setShowForgotPassword(true)} />
          </motion.div>
        )}
      </AnimatePresence>
    </BrowserRouter>
  );
}
