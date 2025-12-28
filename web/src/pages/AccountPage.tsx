import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
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
          setUser(data.user);
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);

    // Validation
    if (formData.newPassword !== formData.confirmPassword) {
      setMessage({ type: "error", text: "New passwords do not match" });
      return;
    }

    if (formData.newPassword.length < 8) {
      setMessage({ type: "error", text: "New password must be at least 8 characters" });
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
        setMessage({ type: "success", text: "Password updated successfully! Please log in again." });
        setFormData({ currentPassword: "", newPassword: "", confirmPassword: "" });
        setShowForm(false);

        // Auto-logout after 2 seconds
        setTimeout(() => {
          window.location.href = "/";
        }, 2000);
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
      <h3>Change Password</h3>

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
              onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
              required
              minLength={8}
              disabled={loading}
            />
            <small>Minimum 8 characters</small>
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
    </motion.div>
  );
}
