import { useState, useEffect, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { SkeletonLoader } from "../components/SkeletonLoader";
import { useCrypto } from "../contexts/CryptoContext";
import { deriveKey, saltFromBase64 } from "../lib/crypto";
import { reEncryptAllData, ReEncryptionProgress } from "../services/reEncryptionService";
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
        const response = await fetch(`${BASE_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          // Edge Function returns { data: userData }, not { user: userData }
          setUser(data.data);
        }
      } catch (e) {
        console.error("Failed to fetch user:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [token]);

  if (loading) {
    return <div className="account-page"><SkeletonLoader type="card" count={2} /></div>;
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

// Password Reset Component with E2E Re-encryption
function PasswordResetCard({ token }: { token: string }) {
  const cryptoCtx = useCrypto();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [loading, setLoading] = useState(false);
  const [reEncryptProgress, setReEncryptProgress] = useState<ReEncryptionProgress | null>(null);
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
    setReEncryptProgress(null);

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
      // E2E Encryption: Re-encrypt all data with new password key
      if (cryptoCtx.encryptionSalt) {
        setMessage({ type: "success", text: "Re-encrypting your data with new password..." });
        
        // Re-encrypt all data
        await reEncryptAllData(
          formData.currentPassword,
          formData.newPassword,
          cryptoCtx.encryptionSalt,
          token,
          (progress) => {
            setReEncryptProgress(progress);
            if (progress.phase === 'error') {
              throw new Error(progress.error || 'Re-encryption failed');
            }
          }
        );
        
        // Update crypto context with new key
        const salt = saltFromBase64(cryptoCtx.encryptionSalt);
        const newKey = await deriveKey(formData.newPassword, salt);
        cryptoCtx.setKey(newKey, cryptoCtx.encryptionSalt);
      }
      
      // Update password on server
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
        setReEncryptProgress(null);
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
    } catch (e: any) {
      setMessage({ type: "error", text: e.message || "Network error. Please try again." });
    } finally {
      setLoading(false);
      setReEncryptProgress(null);
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
          
          {/* Re-encryption Progress */}
          {reEncryptProgress && reEncryptProgress.phase !== 'complete' && reEncryptProgress.phase !== 'error' && (
            <div className="reencrypt-progress">
              <div className="progress-label">
                {reEncryptProgress.phase === 'deriving_keys' && '🔑 Deriving encryption keys...'}
                {reEncryptProgress.phase === 'fetching_data' && '📥 Fetching your data...'}
                {reEncryptProgress.phase === 'decrypting' && `🔓 Decrypting ${reEncryptProgress.entityType || 'data'}...`}
                {reEncryptProgress.phase === 're_encrypting' && `🔐 Re-encrypting ${reEncryptProgress.entityType || 'data'}...`}
                {reEncryptProgress.phase === 'uploading' && `📤 Uploading ${reEncryptProgress.entityType || 'data'}...`}
              </div>
              {reEncryptProgress.total > 0 && (
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${(reEncryptProgress.current / reEncryptProgress.total) * 100}%` }}
                  />
                </div>
              )}
              <div className="progress-count">
                {reEncryptProgress.current} / {reEncryptProgress.total}
              </div>
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
