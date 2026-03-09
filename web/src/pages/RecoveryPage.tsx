import { useState } from "react";
import { motion } from "framer-motion";
import { recoverWithKey, fetchSalt, updateWrappedKeys } from "../api";
import { useCrypto } from "../contexts/CryptoContext";
import { deriveKey, saltFromBase64, unwrapKey, wrapKey, generateSalt } from "../lib/crypto";
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
      const phraseNormalized = recoveryKey.trim().toLowerCase();
      const res = await recoverWithKey(username.trim(), phraseNormalized, newPassword);
      const salt = res.encryption_salt || (await fetchSalt(username)).encryption_salt;
      if (!salt) throw new Error("Missing encryption salt");

      let masterKey: CryptoKey;
      let activeWrapSalt: string | undefined;

      if (res.wrap_salt && res.wrapped_key_recovery && res.wrapped_key_recovery_iv) {
        // Key-wrapping mode: unwrap KEK from recovery-wrapped blob
        const recoveryWK = await deriveKey(phraseNormalized, saltFromBase64(salt));
        masterKey = await unwrapKey(res.wrapped_key_recovery, res.wrapped_key_recovery_iv, recoveryWK);
        activeWrapSalt = res.wrap_salt;

        // Atomically re-wrap KEK with new password AND update password_hash on the server
        const passwordWK = await deriveKey(newPassword, saltFromBase64(res.wrap_salt));
        const newWrappedPwd = await wrapKey(masterKey, passwordWK);
        await updateWrappedKeys(res.access_token, {
          wrappedKeyPassword: newWrappedPwd.ciphertext,
          wrappedKeyPasswordIv: newWrappedPwd.iv,
          newPassword: newPassword,
        });
        console.log('[RECOVERY] KEK unwrapped and re-wrapped with new password');
      } else {
        // Legacy mode: derive key from new password (old data NOT recoverable)
        masterKey = await deriveKey(newPassword, saltFromBase64(salt));

        // Silently migrate to key wrapping for future recovery protection
        try {
          const { b64: wrapSaltB64 } = generateSalt();
          const passwordWK = await deriveKey(newPassword, saltFromBase64(wrapSaltB64));
          const wrapped = await wrapKey(masterKey, passwordWK);
          await updateWrappedKeys(res.access_token, {
            wrapSalt: wrapSaltB64,
            wrappedKeyPassword: wrapped.ciphertext,
            wrappedKeyPasswordIv: wrapped.iv,
          });
          activeWrapSalt = wrapSaltB64;
        } catch (migrationErr) {
          console.warn('[RECOVERY] Silent migration failed (non-fatal):', migrationErr);
        }
      }

      await cryptoCtx.setKey(masterKey, salt, activeWrapSalt);
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
