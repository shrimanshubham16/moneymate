import { useState } from "react";
import { motion } from "framer-motion";
import { recoverWithKey, login, fetchSalt } from "../api";
import { useCrypto } from "../contexts/CryptoContext";
import { deriveKey, saltFromBase64 } from "../lib/crypto";
import "./RecoveryPage.css";

interface RecoveryPageProps {
  onBack: () => void;
}

export function RecoveryPage({ onBack }: RecoveryPageProps) {
  const cryptoCtx = useCrypto();
  const [username, setUsername] = useState("");
  const [recoveryKey, setRecoveryKey] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleRecover = async () => {
    setError(null);
    setSuccess(null);
    if (!username || username.trim().length < 3) {
      setError("Enter your username (3+ characters)");
      return;
    }
    const words = recoveryKey.trim().toLowerCase().split(/\s+/);
    if (words.length !== 24) {
      setError(`Recovery key must be 24 words (you entered ${words.length})`);
      return;
    }
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const res = await recoverWithKey(username.trim(), recoveryKey.trim().toLowerCase(), newPassword);
      const salt = res.encryption_salt || (await fetchSalt(username)).encryption_salt;
      if (!salt) throw new Error("Missing encryption salt");
      const key = await deriveKey(newPassword, saltFromBase64(salt));
      await cryptoCtx.setKey(key, salt);
      localStorage.setItem("token", res.access_token);
      setSuccess("Recovery successful! Redirecting to dashboard...");
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 800);
    } catch (err: any) {
      setError(err.message || "Recovery failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="recovery-page">
      <motion.div
        className="recovery-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <button className="back-button" onClick={onBack}>← Back to Login</button>
        <h1>Recover Account</h1>
        <p>Use your 24-word recovery key to set a new password.</p>

        <div className="form-group">
          <label>Username</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="your_username"
          />
        </div>

        <div className="form-group">
          <label>Recovery Key (24 words)</label>
          <textarea
            value={recoveryKey}
            onChange={(e) => setRecoveryKey(e.target.value)}
            placeholder="word1 word2 ... word24"
            rows={3}
          />
          <small className="help-text">Use the exact 24-word phrase you saved at signup.</small>
        </div>

        <div className="form-group">
          <label>New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="••••••••"
            minLength={8}
          />
        </div>
        <div className="form-group">
          <label>Confirm New Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            minLength={8}
          />
        </div>

        {error && <div className="error-text">{error}</div>}
        {success && <div className="success-text">{success}</div>}

        <button className="primary-button" onClick={handleRecover} disabled={loading}>
          {loading ? "Recovering..." : "Recover Account"}
        </button>
      </motion.div>
    </div>
  );
}
