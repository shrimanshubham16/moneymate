import { useState, useEffect, useRef, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaLock, FaShieldAlt, FaKey, FaCheckCircle,
  FaExclamationTriangle, FaDownload, FaLockOpen,
  FaUpload, FaCamera, FaSignOutAlt, FaFingerprint,
  FaInfoCircle, FaUserShield, FaChevronRight
} from "react-icons/fa";
import { SkeletonLoader } from "../components/SkeletonLoader";
import { useCrypto } from "../contexts/CryptoContext";
import { deriveKey, saltFromBase64, generateSalt } from "../lib/crypto";
import { reEncryptAllData, ReEncryptionProgress } from "../services/reEncryptionService";
import { supabase } from "../lib/supabase";
import { RecoveryKeyModal } from "../components/RecoveryKeyModal";
import "./AccountPage.css";

// ── Recovery key generation ─────────────────────────
const WORD_LIST = [
  'abandon','ability','able','about','above','absent','absorb','abstract',
  'absurd','abuse','access','accident','account','accuse','achieve','acid',
  'acoustic','acquire','across','action','actor','actress','actual','adapt',
  'add','addict','address','adjust','admit','adult','advance','advice',
  'aerobic','affair','afford','afraid','again','age','agent','agree',
  'ahead','aim','air','airport','aisle','alarm','album','alcohol',
  'alert','alien','all','alley','allow','almost','alone','alpha',
  'already','also','alter','always','amateur','amazing','among','amount',
  'anchor','ancient','anger','angle','angry','animal','ankle','announce',
  'annual','answer','antenna','antique','anxiety','any','apart','apology',
  'appear','apple','approve','april','arch','arctic','area','arena',
  'argue','arm','armed','armor','army','around','arrange','arrest',
  'arrive','arrow','art','artist','artwork','ask','aspect','assault',
  'asset','assist','assume','asthma','athlete','atom','attack','attend',
  'attitude','attract','auction','audit','august','aunt','author','auto',
  'autumn','average','avocado','avoid','awake','aware','away','awesome',
  'balance','ball','bamboo','banana','banner','bar','barely','bargain',
  'barrel','base','basic','basket','battle','beach','bean','beauty',
  'become','beef','before','begin','behave','behind','believe','below',
  'belt','bench','benefit','best','betray','better','between','beyond',
  'bicycle','bid','bike','bind','biology','bird','birth','bitter',
  'black','blade','blame','blanket','blast','bleak','bless','blind',
  'blood','blossom','blouse','blue','blur','blush','board','boat',
  'body','boil','bomb','bone','bonus','book','boost','border',
  'boring','borrow','boss','bottom','bounce','box','boy','bracket',
  'brain','brand','brass','brave','bread','breeze','brick','bridge',
  'brief','bright','bring','brisk','broken','bronze','broom','brother',
  'brown','brush','bubble','buddy','budget','buffalo','build','bulb',
  'bulk','bullet','bundle','bunker','burden','burger','burst','bus',
  'business','busy','butter','buyer','buzz','cabbage','cabin','cable',
  'cactus','cage','cake','call','calm','camera','camp','can',
  'canal','cancel','candy','cannon','canoe','canvas','canyon','capable'
];

function generateRecoveryMnemonic(): string {
  const words: string[] = [];
  const randomValues = crypto.getRandomValues(new Uint32Array(24));
  for (let i = 0; i < 24; i++) {
    words.push(WORD_LIST[randomValues[i] % WORD_LIST.length]);
  }
  return words.join(' ');
}

// ── API base URL ────────────────────────────────────
function getBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) return envUrl;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (supabaseUrl) {
    const base = supabaseUrl.replace('/rest/v1', '').replace(/\/$/, '');
    return `${base}/functions/v1/api`;
  }
  return 'https://eklennfapovprkebdsml.supabase.co/functions/v1/api';
}
const BASE_URL = getBaseUrl();

// ── Supabase project URL (for storage) ─────────────
function getSupabaseProjectUrl(): string {
  const url = import.meta.env.VITE_SUPABASE_URL;
  if (url) return url.replace('/rest/v1', '').replace(/\/$/, '');
  return 'https://eklennfapovprkebdsml.supabase.co';
}

interface AccountPageProps {
  token: string;
  onLogout: () => void;
}

export function AccountPage({ token, onLogout }: AccountPageProps) {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchUser = async () => {
    try {
      const response = await fetch(`${BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data.data);
      }
    } catch (e) {
      console.error("Failed to fetch user:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUser(); }, [token]);

  // ── Avatar upload ───────────────────────────────
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('Image must be under 2MB');
      return;
    }

    setAvatarUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const filePath = `${user.id}/avatar.${ext}`;

      // Upload to Supabase Storage
      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true, contentType: file.type });

      if (uploadErr) throw uploadErr;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const avatarUrl = urlData.publicUrl + `?t=${Date.now()}`; // cache-bust

      // Update backend
      const resp = await fetch(`${BASE_URL}/user/avatar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ avatar_url: avatarUrl })
      });
      if (!resp.ok) throw new Error('Failed to save avatar URL');

      setUser((prev: any) => ({ ...prev, avatar_url: avatarUrl }));
    } catch (err: any) {
      console.error('Avatar upload error:', err);
      alert('Failed to upload avatar: ' + (err.message || 'Unknown error'));
    } finally {
      setAvatarUploading(false);
      // Reset input so same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '—';
  const isEncrypted = !!user?.encryption_salt;

  if (loading) {
    return <div className="account-page"><SkeletonLoader type="card" count={3} /></div>;
  }

  return (
    <div className="account-page">
      {/* Header */}
      <div className="page-header">
        <button className="back-button" onClick={() => navigate("/settings")}>← Back</button>
        <h1>Account</h1>
      </div>

      {/* ── Profile Hero ───────────────────────── */}
      <motion.div
        className="account-profile-hero"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="avatar-wrapper">
          <div className="avatar-circle">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="avatar" />
            ) : (
              user?.username?.charAt(0).toUpperCase() || "U"
            )}
          </div>
          <button
            className={`avatar-upload-btn ${avatarUploading ? 'uploading' : ''}`}
            onClick={handleAvatarClick}
            disabled={avatarUploading}
            title="Upload photo"
          >
            <FaCamera />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleAvatarUpload}
          />
        </div>

        <h2 className="profile-username">
          <span className="profile-username-at">@</span>{user?.username || "User"}
        </h2>

        <div className="profile-meta-row">
          <span className="profile-meta-chip">
            <FaFingerprint /> Member since {memberSince}
          </span>
          <span className={`profile-meta-chip ${isEncrypted ? 'encrypted' : ''}`}>
            {isEncrypted ? <FaLock /> : <FaLockOpen />}
            {isEncrypted ? 'E2E Encrypted' : 'Not Encrypted'}
          </span>
        </div>
      </motion.div>

      {/* ── Account Details ────────────────────── */}
      <motion.div
        className="account-section-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06 }}
      >
        <div className="section-card-header">
          <div className="section-card-icon security"><FaUserShield /></div>
          <div>
            <h3 className="section-card-title">Account Details</h3>
            <p className="section-card-subtitle">Your identity on FinFlow</p>
          </div>
        </div>
        <div className="account-detail-grid">
          <div className="account-detail-row">
            <span className="account-detail-label">Username</span>
            <span className="account-detail-value">@{user?.username || "—"}</span>
          </div>
          <div className="account-detail-row">
            <span className="account-detail-label">User ID</span>
            <span className="account-detail-value" style={{ fontSize: 11 }}>
              {user?.id || "—"}
            </span>
          </div>
          <div className="account-detail-row">
            <span className="account-detail-label">Member Since</span>
            <span className="account-detail-value">{memberSince}</span>
          </div>
        </div>
      </motion.div>

      {/* ── Password Reset ─────────────────────── */}
      <motion.div
        className="account-section-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.10 }}
      >
        <PasswordResetCard token={token} />
      </motion.div>

      {/* ── Encryption Settings ────────────────── */}
      <motion.div
        className="account-section-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.14 }}
      >
        <EncryptionSettingsCard token={token} user={user} />
      </motion.div>

      {/* ── Logout ─────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18 }}
        style={{ marginBottom: 16 }}
      >
        <button className="account-action-btn danger" onClick={onLogout}>
          <FaSignOutAlt /> Sign Out
        </button>
      </motion.div>

      {/* ── Info Footer ────────────────────────── */}
      <motion.div
        className="account-info-footer"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.22 }}
      >
        <h4><FaInfoCircle /> About Your Account</h4>
        <p>
          Your username is <strong style={{ color: '#E8ECF8' }}>immutable</strong> — it cannot be
          changed after signup. This ensures consistency across shared accounts and activity logs.
        </p>
        <p>
          Avatar images are stored securely and visible to your shared users. Max size: 2 MB.
        </p>
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// Encryption Settings Card
// ═══════════════════════════════════════════════════════
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
    setIsEncrypted(!!user?.encryption_salt);
  }, [user]);

  const handleEnableEncryption = async () => {
    if (!password) { setError("Please enter your password"); return; }
    setLoading(true);
    setError(null);
    try {
      const { raw: salt, b64: saltB64 } = generateSalt();
      const mnemonic = generateRecoveryMnemonic();
      const words = mnemonic.split(' ');
      const encryptionKey = await deriveKey(password, salt);
      const encoder = new TextEncoder();
      const recoveryKeyHash = await crypto.subtle.digest('SHA-256', encoder.encode(mnemonic));
      const recoveryHashB64 = btoa(String.fromCharCode(...new Uint8Array(recoveryKeyHash)));

      setEncryptionProgress({ phase: 'Updating account...', current: 0, total: 3 });

      const response = await fetch(`${BASE_URL}/user/enable-encryption`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ encryption_salt: saltB64, recovery_key_hash: recoveryHashB64, password })
      });
      if (!response.ok) {
        const err = await response.json();
        const errorMsg = typeof err.error === 'string' ? err.error : (err.error?.message || err.message || 'Failed');
        throw new Error(errorMsg);
      }

      setEncryptionProgress({ phase: 'Setting up encryption...', current: 1, total: 3 });
      cryptoCtx.setKey(encryptionKey, saltB64);

      setEncryptionProgress({ phase: 'Encrypting existing data...', current: 2, total: 3 });
      await reEncryptAllData(password, password, saltB64, token, (progress) => {
        setEncryptionProgress({
          phase: progress.phase === 'encrypting' ? `Encrypting ${progress.entityType}...` : progress.phase,
          current: progress.current,
          total: progress.total
        });
      });

      setEncryptionProgress({ phase: 'Complete!', current: 3, total: 3 });
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

  return (
    <>
      <div className="section-card-header">
        <div className="section-card-icon encryption"><FaShieldAlt /></div>
        <div style={{ flex: 1 }}>
          <h3 className="section-card-title">Data Encryption</h3>
          <p className="section-card-subtitle">End-to-end protection</p>
        </div>
        <span className={`encryption-badge ${isEncrypted ? 'enabled' : 'disabled'}`}>
          {isEncrypted ? <><FaCheckCircle /> Enabled</> : <><FaExclamationTriangle /> Off</>}
        </span>
      </div>

      {isEncrypted ? (
        <>
          <div className="encryption-features">
            <div className="encryption-feature"><FaCheckCircle /> AES-256-GCM encryption</div>
            <div className="encryption-feature"><FaCheckCircle /> Only you can decrypt your data</div>
            <div className="encryption-feature"><FaCheckCircle /> Even FinFlow cannot read your finances</div>
          </div>
          <div className="recovery-warning-card">
            <FaKey />
            <p><strong>Important:</strong> Keep your 24-word recovery key safe. You'll need it if you forget your password.</p>
          </div>
        </>
      ) : (
        <>
          <p style={{ color: '#8B95B0', fontSize: 14, margin: '0 0 16px', lineHeight: 1.6 }}>
            Enable end-to-end encryption to protect your financial data with military-grade security.
            No one — not even us — can read your data.
          </p>

          {!showPasswordPrompt ? (
            <button className="account-action-btn primary" onClick={() => setShowPasswordPrompt(true)}>
              <FaLock /> Enable Encryption
            </button>
          ) : (
            <div className="enc-password-prompt">
              <p className="prompt-info">Enter your password to enable encryption:</p>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                disabled={loading}
              />
              {error && <p className="error-message" style={{ color: '#f87171', fontSize: 13, margin: '0 0 12px' }}>{error}</p>}

              {encryptionProgress && (
                <div className="enc-progress">
                  <p>{encryptionProgress.phase}</p>
                  <div className="enc-progress-bar">
                    <div className="enc-progress-fill" style={{ width: `${(encryptionProgress.current / encryptionProgress.total) * 100}%` }} />
                  </div>
                </div>
              )}

              <div className="form-btn-row">
                <button
                  className="account-action-btn ghost"
                  onClick={() => { setShowPasswordPrompt(false); setPassword(""); setError(null); }}
                  disabled={loading}
                >Cancel</button>
                <button
                  className="account-action-btn primary"
                  onClick={handleEnableEncryption}
                  disabled={loading || !password}
                >{loading ? "Enabling..." : "Enable"}</button>
              </div>
            </div>
          )}
        </>
      )}

      {showRecoveryModal && (
        <RecoveryKeyModal
          recoveryKey={recoveryKey.join(' ')}
          onClose={() => { setShowRecoveryModal(false); setRecoveryKey([]); }}
        />
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════
// Password Reset Card
// ═══════════════════════════════════════════════════════
function PasswordResetCard({ token }: { token: string }) {
  const cryptoCtx = useCrypto();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);
  const [reEncryptProgress, setReEncryptProgress] = useState<ReEncryptionProgress | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [passwordStrength, setPasswordStrength] = useState<string[]>([]);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const handlePasswordChange = (newPassword: string) => {
    setFormData({ ...formData, newPassword });
    if (newPassword.length > 0) {
      const reqs: string[] = [];
      if (newPassword.length < 8) reqs.push("At least 8 characters");
      if (!/[A-Z]/.test(newPassword)) reqs.push("One uppercase letter");
      if (!/[a-z]/.test(newPassword)) reqs.push("One lowercase letter");
      if (!/[0-9]/.test(newPassword)) reqs.push("One number");
      if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) reqs.push("One special character");
      setPasswordStrength(reqs);
    } else {
      setPasswordStrength([]);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setReEncryptProgress(null);

    if (formData.newPassword !== formData.confirmPassword) {
      setMessage({ type: "error", text: "New passwords do not match" }); return;
    }
    if (passwordStrength.length > 0) {
      setMessage({ type: "error", text: "Password does not meet all requirements" }); return;
    }
    if (formData.newPassword === formData.currentPassword) {
      setMessage({ type: "error", text: "New password must be different" }); return;
    }

    setLoading(true);
    try {
      if (cryptoCtx.encryptionSalt) {
        setMessage({ type: "success", text: "Re-encrypting your data with new password..." });
        await reEncryptAllData(
          formData.currentPassword, formData.newPassword,
          cryptoCtx.encryptionSalt, token,
          (progress) => {
            setReEncryptProgress(progress);
            if (progress.phase === 'error') throw new Error(progress.error || 'Re-encryption failed');
          }
        );
        const salt = saltFromBase64(cryptoCtx.encryptionSalt);
        const newKey = await deriveKey(formData.newPassword, salt);
        cryptoCtx.setKey(newKey, cryptoCtx.encryptionSalt);
      }

      const response = await fetch(`${BASE_URL}/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: formData.currentPassword, newPassword: formData.newPassword })
      });
      const data = await response.json();

      if (response.ok) {
        setShowSuccessToast(true);
        setFormData({ currentPassword: "", newPassword: "", confirmPassword: "" });
        setPasswordStrength([]);
        setReEncryptProgress(null);
        setShowForm(false);
        setTimeout(() => { window.location.href = "/"; }, 3000);
      } else {
        setMessage({ type: "error", text: data.error?.message || "Failed to update password" });
      }
    } catch (e: any) {
      setMessage({ type: "error", text: e.message || "Network error" });
    } finally {
      setLoading(false);
      setReEncryptProgress(null);
    }
  };

  return (
    <>
      <div className="section-card-header">
        <div className="section-card-icon password"><FaKey /></div>
        <div style={{ flex: 1 }}>
          <h3 className="section-card-title">Password</h3>
          <p className="section-card-subtitle">Keep your account secure</p>
        </div>
        {!showForm && (
          <button className="account-action-btn ghost" style={{ width: 'auto', padding: '8px 16px', fontSize: 13 }} onClick={() => setShowForm(true)}>
            Change <FaChevronRight style={{ fontSize: 10, marginLeft: 4 }} />
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="account-password-form">
          <div className="form-group">
            <label>Current Password</label>
            <input type="password" value={formData.currentPassword}
              onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
              required disabled={loading} placeholder="••••••••" />
          </div>
          <div className="form-group">
            <label>New Password</label>
            <input type="password" value={formData.newPassword}
              onChange={(e) => handlePasswordChange(e.target.value)}
              required minLength={8} disabled={loading} placeholder="••••••••" />
            {passwordStrength.length > 0 && (
              <div className="pwd-requirements">
                <small>Password must have:</small>
                <ul>{passwordStrength.map((r, i) => <li key={i}>{r}</li>)}</ul>
              </div>
            )}
          </div>
          <div className="form-group">
            <label>Confirm New Password</label>
            <input type="password" value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              required minLength={8} disabled={loading} placeholder="••••••••" />
          </div>

          {message && (
            <div className={`form-message ${message.type}`}>
              {message.type === 'error' ? <FaExclamationTriangle /> : <FaCheckCircle />}
              {message.text}
            </div>
          )}

          {reEncryptProgress && reEncryptProgress.phase !== 'complete' && reEncryptProgress.phase !== 'error' && (
            <div className="reencrypt-progress">
              <div className="progress-label">
                {reEncryptProgress.phase === 'deriving_keys' && <><FaKey /> Deriving encryption keys...</>}
                {reEncryptProgress.phase === 'fetching_data' && <><FaDownload /> Fetching your data...</>}
                {reEncryptProgress.phase === 'decrypting' && <><FaLockOpen /> Decrypting {reEncryptProgress.entityType || 'data'}...</>}
                {reEncryptProgress.phase === 're_encrypting' && <><FaLock /> Re-encrypting {reEncryptProgress.entityType || 'data'}...</>}
                {reEncryptProgress.phase === 'uploading' && <><FaUpload /> Uploading {reEncryptProgress.entityType || 'data'}...</>}
              </div>
              {reEncryptProgress.total > 0 && (
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${(reEncryptProgress.current / reEncryptProgress.total) * 100}%` }} />
                </div>
              )}
              <div className="progress-count">{reEncryptProgress.current} / {reEncryptProgress.total}</div>
            </div>
          )}

          <div className="form-btn-row">
            <button type="button" className="account-action-btn ghost"
              onClick={() => { setShowForm(false); setFormData({ currentPassword: "", newPassword: "", confirmPassword: "" }); setMessage(null); }}
              disabled={loading}>Cancel</button>
            <button type="submit" className="account-action-btn primary" disabled={loading}>
              {loading ? "Updating..." : "Update Password"}
            </button>
          </div>
        </form>
      )}

      <AnimatePresence>
        {showSuccessToast && (
          <motion.div className="success-toast"
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ duration: 0.3 }}>
            <div className="toast-content">
              <span className="toast-icon">✓</span>
              <span className="toast-message">Password updated! Redirecting...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
