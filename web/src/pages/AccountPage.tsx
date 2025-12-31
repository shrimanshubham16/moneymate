import { useState, useEffect, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import "./AccountPage.css";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:12022";

interface AccountPageProps {
  token: string;
  onLogout: () => void;
}

export function AccountPage({ token, onLogout }: AccountPageProps) {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch user info from API
    const fetchUser = async () => {
      try {
        // #region agent log
        console.log('[DEBUG_ACCOUNT_H1_H2_H3] Fetching user from /auth/me', { baseUrl: BASE_URL, hasToken: !!token, tokenPrefix: token?.substring(0, 20) });
        // #endregion
        const response = await fetch(`${BASE_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        // #region agent log
        console.log('[DEBUG_ACCOUNT_H2_H4] Response received', { ok: response.ok, status: response.status, statusText: response.statusText });
        // #endregion
        if (response.ok) {
          const data = await response.json();
          // #region agent log
          console.log('[DEBUG_ACCOUNT_H1_H5] Response data parsed', { 
            rawData: data, 
            hasUser: !!data.user, 
            hasData: !!data.data, 
            userPath: data.user, 
            dataPath: data.data,
            keys: Object.keys(data)
          });
          // #endregion
          setUser(data.user);
          // #region agent log
          console.log('[DEBUG_ACCOUNT_H1] User state set to data.user', { userSet: data.user });
          // #endregion
        }
      } catch (e) {
        console.error("Failed to fetch user:", e);
        // #region agent log
        console.error('[DEBUG_ACCOUNT_H2_H3_H4] Error fetching user', { error: String(e), errorObj: e });
        // #endregion
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [token]);

  if (loading) {
    return <div className="account-page"><div className="loading">Loading...</div></div>;
  }

  return (
    <div className="account-page">
      <div className="page-header">
        <button className="back-button" onClick={() => navigate("/settings")}>← Back</button>
        <h1>Account</h1>
      </div>

      <motion.div
        className="account-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="profile-section">
          <div className="profile-avatar">
            {user?.username?.charAt(0).toUpperCase() || "U"}
          </div>
          <div className="profile-info">
            <h2>@{user?.username || "User"}</h2>
            <span className="immutable-badge">Username is immutable (set once)</span>
          </div>
        </div>

        <div className="account-details">
          <div className="detail-item">
            <span className="label">User ID</span>
            <span className="value">{user?.id || "N/A"}</span>
          </div>
        </div>

        <button className="logout-button" onClick={onLogout}>
          Logout
        </button>
      </motion.div>

      {/* Password Reset Section */}
      <PasswordResetCard token={token} />

      <motion.div
        className="info-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h3>About Your Account</h3>
        <p>
          Your username is <strong>immutable</strong> and cannot be changed after signup.
          This ensures consistency across shared accounts and activity logs.
        </p>
        <p>
          Need help? Visit the Support section in Settings.
        </p>
      </motion.div>
    </div>
  );
}

// Password Reset Component
function PasswordResetCard({ token }: { token: string }) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [passwordStrength, setPasswordStrength] = useState<string[]>([]);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const handlePasswordChange = (newPassword: string) => {
    setFormData({ ...formData, newPassword });
    if (newPassword.length > 0) {
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);

    // Validation
    if (formData.newPassword !== formData.confirmPassword) {
      setMessage({ type: "error", text: "New passwords do not match" });
      return;
    }

    if (passwordStrength.length > 0) {
      setMessage({ type: "error", text: "Password does not meet all requirements" });
      return;
    }

    if (formData.newPassword === formData.currentPassword) {
      setMessage({ type: "error", text: "New password must be different from current password" });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/auth/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword
        })
      });

      const data = await response.json();

      if (response.ok) {
        setShowSuccessToast(true);
        setFormData({ currentPassword: "", newPassword: "", confirmPassword: "" });
        setPasswordStrength([]);
        setShowForm(false);

        // Auto-logout after 3 seconds
        setTimeout(() => {
          window.location.href = "/";
        }, 3000);
      } else {
        setMessage({
          type: "error",
          text: data.error?.message || "Failed to update password"
        });
      }
    } catch (e) {
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="account-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      {!showForm ? (
        <button
          className="change-password-button"
          onClick={() => setShowForm(true)}
        >
          Change Password
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="password-reset-form">
          <div className="form-group">
            <label>Current Password *</label>
            <input
              type="password"
              value={formData.currentPassword}
              onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>New Password *</label>
            <input
              type="password"
              value={formData.newPassword}
              onChange={(e) => handlePasswordChange(e.target.value)}
              required
              minLength={8}
              disabled={loading}
            />
            {passwordStrength.length > 0 && (
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

          <div className="form-group">
            <label>Confirm New Password *</label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              required
              minLength={8}
              disabled={loading}
            />
          </div>

          {message && (
            <div className={`message ${message.type}`}>
              {message.text}
            </div>
          )}

          <div className="form-actions">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setFormData({ currentPassword: "", newPassword: "", confirmPassword: "" });
                setMessage(null);
              }}
              disabled={loading}
            >
              Cancel
            </button>
            <button type="submit" disabled={loading}>
              {loading ? "Updating..." : "Update Password"}
            </button>
          </div>
        </form>
      )}

      {/* Success Toast */}
      <AnimatePresence>
        {showSuccessToast && (
          <motion.div
            className="success-toast"
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ duration: 0.3 }}
          >
            <div className="toast-content">
              <span className="toast-icon">✓</span>
              <span className="toast-message">Password updated successfully!</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
