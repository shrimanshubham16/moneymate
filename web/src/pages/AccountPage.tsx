import { useState, useEffect, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FaLock, FaShieldAlt, FaKey, FaCheckCircle, FaExclamationTriangle, FaDownload, FaLockOpen, FaUpload } from "react-icons/fa";
import { SkeletonLoader } from "../components/SkeletonLoader";
import { useCrypto } from "../contexts/CryptoContext";
import { deriveKey, saltFromBase64, generateSalt } from "../lib/crypto";
import { reEncryptAllData, ReEncryptionProgress } from "../services/reEncryptionService";

// Simple recovery key generation (24 random words from a word list)
const WORD_LIST = [
  'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract',
  'absurd', 'abuse', 'access', 'accident', 'account', 'accuse', 'achieve', 'acid',
  'acoustic', 'acquire', 'across', 'action', 'actor', 'actress', 'actual', 'adapt',
  'add', 'addict', 'address', 'adjust', 'admit', 'adult', 'advance', 'advice',
  'aerobic', 'affair', 'afford', 'afraid', 'again', 'age', 'agent', 'agree',
  'ahead', 'aim', 'air', 'airport', 'aisle', 'alarm', 'album', 'alcohol',
  'alert', 'alien', 'all', 'alley', 'allow', 'almost', 'alone', 'alpha',
  'already', 'also', 'alter', 'always', 'amateur', 'amazing', 'among', 'amount',
  'anchor', 'ancient', 'anger', 'angle', 'angry', 'animal', 'ankle', 'announce',
  'annual', 'answer', 'antenna', 'antique', 'anxiety', 'any', 'apart', 'apology',
  'appear', 'apple', 'approve', 'april', 'arch', 'arctic', 'area', 'arena',
  'argue', 'arm', 'armed', 'armor', 'army', 'around', 'arrange', 'arrest',
  'arrive', 'arrow', 'art', 'artist', 'artwork', 'ask', 'aspect', 'assault',
  'asset', 'assist', 'assume', 'asthma', 'athlete', 'atom', 'attack', 'attend',
  'attitude', 'attract', 'auction', 'audit', 'august', 'aunt', 'author', 'auto',
  'autumn', 'average', 'avocado', 'avoid', 'awake', 'aware', 'away', 'awesome',
  'balance', 'ball', 'bamboo', 'banana', 'banner', 'bar', 'barely', 'bargain',
  'barrel', 'base', 'basic', 'basket', 'battle', 'beach', 'bean', 'beauty',
  'become', 'beef', 'before', 'begin', 'behave', 'behind', 'believe', 'below',
  'belt', 'bench', 'benefit', 'best', 'betray', 'better', 'between', 'beyond',
  'bicycle', 'bid', 'bike', 'bind', 'biology', 'bird', 'birth', 'bitter',
  'black', 'blade', 'blame', 'blanket', 'blast', 'bleak', 'bless', 'blind',
  'blood', 'blossom', 'blouse', 'blue', 'blur', 'blush', 'board', 'boat',
  'body', 'boil', 'bomb', 'bone', 'bonus', 'book', 'boost', 'border',
  'boring', 'borrow', 'boss', 'bottom', 'bounce', 'box', 'boy', 'bracket',
  'brain', 'brand', 'brass', 'brave', 'bread', 'breeze', 'brick', 'bridge',
  'brief', 'bright', 'bring', 'brisk', 'broken', 'bronze', 'broom', 'brother',
  'brown', 'brush', 'bubble', 'buddy', 'budget', 'buffalo', 'build', 'bulb',
  'bulk', 'bullet', 'bundle', 'bunker', 'burden', 'burger', 'burst', 'bus',
  'business', 'busy', 'butter', 'buyer', 'buzz', 'cabbage', 'cabin', 'cable',
  'cactus', 'cage', 'cake', 'call', 'calm', 'camera', 'camp', 'can',
  'canal', 'cancel', 'candy', 'cannon', 'canoe', 'canvas', 'canyon', 'capable'
];

function generateRecoveryMnemonic(): string {
  const words: string[] = [];
  const randomValues = crypto.getRandomValues(new Uint32Array(24));
  for (let i = 0; i < 24; i++) {
    words.push(WORD_LIST[randomValues[i] % WORD_LIST.length]);
  }
  return words.join(' ');
}
import { RecoveryKeyModal } from "../components/RecoveryKeyModal";
import "./AccountPage.css";

// Get the correct API URL
function getBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) return envUrl;
  
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (supabaseUrl) {
    // Convert Supabase URL to Edge Function URL
    const base = supabaseUrl.replace('/rest/v1', '').replace(/\/$/, '');
    return `${base}/functions/v1/api`;
  }
  
  // Fallback for production
  return 'https://eklennfapovprkebdsml.supabase.co/functions/v1/api';
}

const BASE_URL = getBaseUrl();

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

      {/* Encryption Settings */}
      <EncryptionSettingsCard token={token} user={user} />

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

// Encryption Settings Card
function EncryptionSettingsCard({ token, user }: { token: string; user: any }) {
  const cryptoCtx = useCrypto();
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryKey, setRecoveryKey] = useState<string[]>([]);
  const [password, setPassword] = useState("");
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [encryptionProgress, setEncryptionProgress] = useState<{ phase: string; current: number; total: number } | null>(null);

  useEffect(() => {
    // Check if user has encryption enabled
    const hasEncryption = !!user?.encryption_salt;
    console.log('[ENCRYPTION_STATUS] User encryption_salt:', user?.encryption_salt, 'isEncrypted:', hasEncryption);
    setIsEncrypted(hasEncryption);
  }, [user]);

  const handleEnableEncryption = async () => {
    if (!password) {
      setError("Please enter your password to enable encryption");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Generate new salt and recovery key
      const { raw: salt, b64: saltB64 } = generateSalt();
      const mnemonic = generateRecoveryMnemonic();
      const words = mnemonic.split(' ');
      
      // Derive encryption key from password
      const encryptionKey = await deriveKey(password, salt);
      
      // Generate recovery key hash (for verification during recovery)
      const encoder = new TextEncoder();
      const recoveryKeyHash = await crypto.subtle.digest('SHA-256', encoder.encode(mnemonic));
      const recoveryHashB64 = btoa(String.fromCharCode(...new Uint8Array(recoveryKeyHash)));
      
      setEncryptionProgress({ phase: 'Updating account...', current: 0, total: 3 });
      
      // Update user profile with encryption settings
      const response = await fetch(`${BASE_URL}/user/enable-encryption`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          encryption_salt: saltB64,
          recovery_key_hash: recoveryHashB64,
          password: password
        })
      });
      
      if (!response.ok) {
        const err = await response.json();
        console.error('[ENABLE_ENCRYPTION] Server error:', JSON.stringify(err, null, 2));
        // Handle nested error object
        const errorMsg = typeof err.error === 'string' ? err.error : 
                        (err.error?.message || err.message || 'Failed to enable encryption');
        throw new Error(errorMsg);
      }
      
      setEncryptionProgress({ phase: 'Setting up encryption...', current: 1, total: 3 });
      
      // Set crypto context
      cryptoCtx.setKey(encryptionKey, saltB64);
      
      setEncryptionProgress({ phase: 'Encrypting existing data...', current: 2, total: 3 });
      
      // Re-encrypt existing data (if any)
      // This will encrypt all plaintext data with the new key
      await reEncryptAllData(
        password,
        password, // Same password since we're just enabling encryption
        saltB64,
        token,
        (progress) => {
          setEncryptionProgress({
            phase: progress.phase === 'encrypting' ? `Encrypting ${progress.entityType}...` : progress.phase,
            current: progress.current,
            total: progress.total
          });
        }
      );
      
      setEncryptionProgress({ phase: 'Complete!', current: 3, total: 3 });
      
      // Show recovery key modal
      setRecoveryKey(words);
      setShowRecoveryModal(true);
      setShowPasswordPrompt(false);
      setPassword("");
      setIsEncrypted(true);
      
    } catch (e: any) {
      setError(e.message || 'Failed to enable encryption');
    } finally {
      setLoading(false);
      setEncryptionProgress(null);
    }
  };

  const handleRecoveryModalClose = () => {
    setShowRecoveryModal(false);
    setRecoveryKey([]);
  };

  return (
    <motion.div
      className="security-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
    >
      <div className="card-header-row">
        <h3><FaShieldAlt style={{ marginRight: 8 }} />Data Encryption</h3>
        {isEncrypted ? (
          <span className="encryption-status enabled">
            <FaCheckCircle /> Enabled
          </span>
        ) : (
          <span className="encryption-status disabled">
            <FaExclamationTriangle /> Not Enabled
          </span>
        )}
      </div>

      {isEncrypted ? (
        <div className="encryption-info">
          <p><FaLock style={{ marginRight: 6 }} />Your data is protected with <strong>end-to-end encryption</strong>.</p>
          <ul>
            <li>AES-256-GCM encryption</li>
            <li>Only you can decrypt your data</li>
            <li>Even FinFlow cannot read your finances</li>
          </ul>
          <p className="recovery-reminder">
            <FaKey style={{ marginRight: 6 }} />
            <strong>Important:</strong> Keep your 24-word recovery key safe. You'll need it if you forget your password.
          </p>
        </div>
      ) : (
        <div className="encryption-enable">
          <p>Enable end-to-end encryption to protect your financial data with military-grade security.</p>
          
          {!showPasswordPrompt ? (
            <button 
              className="enable-encryption-btn"
              onClick={() => setShowPasswordPrompt(true)}
            >
              <FaLock style={{ marginRight: 8 }} />
              Enable Encryption
            </button>
          ) : (
            <div className="password-prompt">
              <p className="prompt-info">Enter your password to enable encryption:</p>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                disabled={loading}
              />
              {error && <p className="error-message">{error}</p>}
              
              {encryptionProgress && (
                <div className="encryption-progress">
                  <p>{encryptionProgress.phase}</p>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${(encryptionProgress.current / encryptionProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}
              
              <div className="prompt-actions">
                <button 
                  onClick={() => {
                    setShowPasswordPrompt(false);
                    setPassword("");
                    setError(null);
                  }}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button 
                  className="primary"
                  onClick={handleEnableEncryption}
                  disabled={loading || !password}
                >
                  {loading ? "Enabling..." : "Enable Encryption"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recovery Key Modal */}
      {showRecoveryModal && (
        <RecoveryKeyModal
          recoveryKey={recoveryKey.join(' ')}
          onClose={handleRecoveryModalClose}
        />
      )}
    </motion.div>
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
                {reEncryptProgress.phase === 'deriving_keys' && <><FaKey style={{ marginRight: 6 }} /> Deriving encryption keys...</>}
                {reEncryptProgress.phase === 'fetching_data' && <><FaDownload style={{ marginRight: 6 }} /> Fetching your data...</>}
                {reEncryptProgress.phase === 'decrypting' && <><FaLockOpen style={{ marginRight: 6 }} /> Decrypting {reEncryptProgress.entityType || 'data'}...</>}
                {reEncryptProgress.phase === 're_encrypting' && <><FaLock style={{ marginRight: 6 }} /> Re-encrypting {reEncryptProgress.entityType || 'data'}...</>}
                {reEncryptProgress.phase === 'uploading' && <><FaUpload style={{ marginRight: 6 }} /> Uploading {reEncryptProgress.entityType || 'data'}...</>}
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
