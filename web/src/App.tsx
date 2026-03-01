import { useState, useEffect, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { login, signup, fetchSalt } from "./api";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { DashboardPage } from "./pages/DashboardPage";
import { Header } from "./components/Header";
import { OfflineIndicator } from "./components/OfflineIndicator";
import { MaintenanceNotice } from "./components/MaintenanceNotice";
import { RecoveryKeyModal } from "./components/RecoveryKeyModal";

const SettingsPage = lazy(() => import("./pages/SettingsPage").then(m => ({ default: m.SettingsPage })));
const PlanFinancesPage = lazy(() => import("./pages/PlanFinancesPage").then(m => ({ default: m.PlanFinancesPage })));
const FixedExpensesPage = lazy(() => import("./pages/FixedExpensesPage").then(m => ({ default: m.FixedExpensesPage })));
const VariableExpensesPage = lazy(() => import("./pages/VariableExpensesPage").then(m => ({ default: m.VariableExpensesPage })));
const InvestmentsPage = lazy(() => import("./pages/InvestmentsPage").then(m => ({ default: m.InvestmentsPage })));
const InvestmentsManagementPage = lazy(() => import("./pages/InvestmentsManagementPage").then(m => ({ default: m.InvestmentsManagementPage })));
const CreditCardsPage = lazy(() => import("./pages/CreditCardsPage").then(m => ({ default: m.CreditCardsPage })));
const CreditCardsManagementPage = lazy(() => import("./pages/CreditCardsManagementPage").then(m => ({ default: m.CreditCardsManagementPage })));
const LoansPage = lazy(() => import("./pages/LoansPage").then(m => ({ default: m.LoansPage })));
const FutureBombsPage = lazy(() => import("./pages/FutureBombsPage").then(m => ({ default: m.FutureBombsPage })));
const ActivitiesPage = lazy(() => import("./pages/ActivitiesPage").then(m => ({ default: m.ActivitiesPage })));
const DuesPage = lazy(() => import("./pages/DuesPage").then(m => ({ default: m.DuesPage })));
const CurrentMonthExpensesPage = lazy(() => import("./pages/CurrentMonthExpensesPage").then(m => ({ default: m.CurrentMonthExpensesPage })));
const SIPExpensesPage = lazy(() => import("./pages/SIPExpensesPage").then(m => ({ default: m.SIPExpensesPage })));
const AccountPage = lazy(() => import("./pages/AccountPage").then(m => ({ default: m.AccountPage })));
const AboutPage = lazy(() => import("./pages/AboutPage").then(m => ({ default: m.AboutPage })));
const SharingPage = lazy(() => import("./pages/SharingPage").then(m => ({ default: m.SharingPage })));
const SupportPage = lazy(() => import("./pages/SupportPage").then(m => ({ default: m.SupportPage })));
const ExportPage = lazy(() => import("./pages/ExportPage").then(m => ({ default: m.ExportPage })));
const IncomePage = lazy(() => import("./pages/IncomePage").then(m => ({ default: m.IncomePage })));
const PreferencesPage = lazy(() => import("./pages/PreferencesPage").then(m => ({ default: m.PreferencesPage })));
const HealthDetailsPage = lazy(() => import("./pages/HealthDetailsPage").then(m => ({ default: m.HealthDetailsPage })));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage").then(m => ({ default: m.PrivacyPage })));
const NotificationSettingsPage = lazy(() => import("./pages/NotificationSettingsPage").then(m => ({ default: m.NotificationSettingsPage })));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage").then(m => ({ default: m.NotificationsPage })));
const ThemeSettingsPage = lazy(() => import("./pages/ThemeSettingsPage").then(m => ({ default: m.ThemeSettingsPage })));
const LandingPage = lazy(() => import("./pages/LandingPage").then(m => ({ default: m.LandingPage })));
const RecoveryPage = lazy(() => import("./pages/RecoveryPage").then(m => ({ default: m.RecoveryPage })));
const ChatroomPage = lazy(() => import("./pages/ChatroomPage").then(m => ({ default: m.ChatroomPage })));
import { useCrypto } from "./contexts/CryptoContext";
import { deriveKey, generateRecoveryKey, generateSalt, hashRecoveryKey, saltFromBase64 } from "./lib/crypto";
import "./App.css";
import { applyTheme, getCurrentTheme } from "./theme";

// Enable maintenance mode - set to false when migration is complete
const MAINTENANCE_MODE = false;

function AuthForm({ onAuth, onShowLanding, onRecovery }: { onAuth: (token: string) => void; onShowLanding: () => void; onRecovery: () => void }) {
  const authNavigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<string[]>([]);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryKey, setRecoveryKey] = useState<string | null>(null);
  const [pendingToken, setPendingToken] = useState<string | null>(null);
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
        if (password !== confirmPassword) {
          setError("Passwords do not match");
          setLoading(false);
          return;
        }

        const { b64: saltB64 } = generateSalt();
        encryptionSalt = saltB64;
        const newRecoveryKey = generateRecoveryKey();
        const recoveryKeyHash = await hashRecoveryKey(newRecoveryKey);
        const res = await signup(username, password, encryptionSalt, recoveryKeyHash);
        const key = await deriveKey(password, saltFromBase64(encryptionSalt));
        await cryptoCtx.setKey(key, encryptionSalt);
        console.log('[AUTH] Encryption key set for new user');

        // Show recovery key modal before completing auth
        setRecoveryKey(newRecoveryKey);
        setPendingToken(res.access_token);
        setShowRecoveryModal(true);
        setLoading(false);
        return; // Don't complete auth yet - wait for modal close
      } else {
        try {
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
          await cryptoCtx.setKey(key, encryptionSalt);
          onAuth(res.access_token);
        } catch (loginErr: any) {
          console.error('[LOGIN_ERROR]', loginErr);
          throw loginErr; // Re-throw to be caught by outer catch
        }
      }
    } catch (err: any) {
      console.error('[AUTH_ERROR]', err);
      setError(err.message || 'An error occurred during login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRecoveryModalClose = () => {
    setShowRecoveryModal(false);
    setRecoveryKey(null);

    // Complete auth directly after recovery key is saved
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
          <small className="free-tagline">Free forever. Privacy-first.</small>
        </div>

        {/* E2E Encryption Badge */}
        <div className="privacy-badge">
          <svg className="badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
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
              autoComplete={mode === "login" ? "username" : "new-username"}
            />
            {mode === "signup" && (
              <small className="help-text">3-20 characters, letters, numbers, underscores only. Username is permanent.</small>
            )}
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => handlePasswordChange(e.target.value)}
              required
              minLength={mode === "signup" ? 8 : 1}
              placeholder="••••••••"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
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
          {mode === "signup" && (
            <div className="form-group">
              <label>Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>
          )}
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
              onClick={onRecovery}
              className="auth-forgot-password"
            >
              Forgot password? Recover with recovery key
            </button>
          )}

          <button
            type="button"
            onClick={() => { setMode(mode === "login" ? "signup" : "login"); setPasswordStrength([]); }}
            className="auth-switch"
          >
            {mode === "login" ? "Don't have an account? Sign Up" : "Already have an account? Login"}
          </button>

          <button
            type="button"
            onClick={() => authNavigate('/what-is-finflow')}
            className="auth-landing-link"
          >
            What is FinFlow?
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
    </div>
  );
}

function AppRoutes({ token, onLogout }: { token: string; onLogout: () => void }) {
  // Apply persisted theme once on load
  useEffect(() => {
    applyTheme(getCurrentTheme());
  }, []);

  return (
    <>
      <OfflineIndicator />
      <Header token={token} />
      <div className="app-content">
        <Suspense fallback={<div className="page-loading"><div className="loading-spinner" /></div>}>
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
            <Route path="/settings/notifications" element={<NotificationSettingsPage token={token} />} />
            <Route path="/settings/theme" element={<ThemeSettingsPage />} />
            <Route path="/notifications" element={<NotificationsPage token={token} />} />
            <Route path="/settings/credit-cards" element={<CreditCardsManagementPage token={token} />} />
            <Route path="/settings/manage-debts/credit-cards" element={<CreditCardsManagementPage token={token} />} />
            <Route path="/investments" element={<InvestmentsPage token={token} />} />
            <Route path="/alerts" element={<Navigate to="/notifications" replace />} />
            <Route path="/credit-cards" element={<CreditCardsManagementPage token={token} />} />
            <Route path="/loans" element={<LoansPage token={token} />} />
            <Route path="/future-bombs" element={<FutureBombsPage token={token} />} />
            <Route path="/activities" element={<ActivitiesPage token={token} />} />
            <Route path="/dues" element={<DuesPage token={token} />} />
            <Route path="/current-month-expenses" element={<CurrentMonthExpensesPage token={token} />} />
            <Route path="/sip-expenses" element={<SIPExpensesPage token={token} />} />
            <Route path="/export" element={<ExportPage token={token} />} />
            <Route path="/fixed-expenses" element={<FixedExpensesPage token={token} />} />
            <Route path="/variable-expenses" element={<VariableExpensesPage token={token} />} />
            <Route path="/community" element={<ChatroomPage token={token} />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </div>
    </>
  );
}

export default function App() {
  const cryptoCtx = useCrypto();
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));

  // Check if we have a token but no encryption key (browser was closed)
  // With localStorage persistence for keys, this should rarely happen
  const needsReauth = token && !cryptoCtx.key && !cryptoCtx.isRestoring;

  const handleAuth = (newToken: string) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    cryptoCtx.clearKey();
    setToken(null);
  };

  // Force re-login if token exists but key is missing
  useEffect(() => {
    if (needsReauth) {
      localStorage.removeItem("token");
      setToken(null);
    }
  }, [needsReauth]);

  return (
    <BrowserRouter>
      {MAINTENANCE_MODE && <MaintenanceNotice />}
      <Suspense fallback={<div className="page-loading"><div className="loading-spinner" /></div>}>
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
          ) : (
            <Routes>
              <Route path="/what-is-finflow" element={
                <motion.div
                  key="landing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <LandingPage />
                </motion.div>
              } />
              <Route path="/recover" element={
                <motion.div
                  key="recovery"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <RecoveryPage onBack={() => window.location.href = '/'} />
                </motion.div>
              } />
              <Route path="*" element={
                <motion.div
                  key="auth"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <AuthForm
                    onAuth={handleAuth}
                    onShowLanding={() => { }}
                    onRecovery={() => window.location.href = '/recover'}
                  />
                </motion.div>
              } />
            </Routes>
          )}
        </AnimatePresence>
      </Suspense>
    </BrowserRouter>
  );
}
