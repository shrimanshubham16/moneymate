import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { login, signup } from "./api";
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
import { Header } from "./components/Header";
import "./App.css";

function AuthForm({ onAuth }: { onAuth: (token: string) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<string[]>([]);

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
      const res = mode === "login" ? await login(username, password) : await signup(username, password);
      onAuth(res.access_token);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
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
          <h1>MoneyMate</h1>
          <p>Your Financial Companion</p>
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
            {loading ? "..." : mode === "login" ? "Login" : "Sign Up"}
          </button>
          <button
            type="button"
            onClick={() => { setMode(mode === "login" ? "signup" : "login"); setPasswordStrength([]); }}
            className="auth-switch"
          >
            {mode === "login" ? "Don't have an account? Sign Up" : "Already have an account? Login"}
          </button>
        </form>
      </motion.div>
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
          <Route path="/credit-cards" element={<CreditCardsPage token={token} />} />
          <Route path="/loans" element={<LoansPage token={token} />} />
          <Route path="/future-bombs" element={<FutureBombsPage token={token} />} />
          <Route path="/activities" element={<ActivitiesPage token={token} />} />
          <Route path="/alerts" element={<AlertsPage token={token} />} />
          <Route path="/dues" element={<DuesPage token={token} />} />
          <Route path="/current-month-expenses" element={<CurrentMonthExpensesPage token={token} />} />
          <Route path="/sip-expenses" element={<SIPExpensesPage token={token} />} />
          <Route path="/export" element={<ExportPage token={token} />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </ErrorBoundary>
    </div >
    </>
  );
}

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));

  const handleAuth = (newToken: string) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
    window.location.href = "/dashboard";
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken(null);
  };

  return (
    <BrowserRouter>
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
          <motion.div
            key="auth"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <AuthForm onAuth={handleAuth} />
          </motion.div>
        )}
      </AnimatePresence>
    </BrowserRouter>
  );
}
