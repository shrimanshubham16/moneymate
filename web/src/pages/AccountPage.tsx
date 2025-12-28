import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { login } from "../api";
import "./AccountPage.css";

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
        const response = await fetch("http://localhost:12022/auth/me", {
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

      <motion.div
        className="info-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
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

