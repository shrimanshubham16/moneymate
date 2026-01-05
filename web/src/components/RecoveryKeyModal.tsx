import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaKey, FaCopy, FaCheck, FaExclamationTriangle, FaLock } from "react-icons/fa";
import "./RecoveryKeyModal.css";

interface RecoveryKeyModalProps {
  recoveryKey: string;
  onClose: () => void;
}

export function RecoveryKeyModal({ recoveryKey, onClose }: RecoveryKeyModalProps) {
  const [copied, setCopied] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(recoveryKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (e) {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = recoveryKey;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const words = recoveryKey.split(" ");

  return (
    <AnimatePresence>
      <motion.div
        className="recovery-modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="recovery-modal-content"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
        >
          <div className="recovery-modal-header">
            <FaKey className="recovery-icon" />
            <h2>Your Recovery Key</h2>
          </div>

          <div className="recovery-warning">
            <FaExclamationTriangle />
            <div>
              <strong>IMPORTANT: Save this key NOW!</strong>
              <p>This 24-word recovery key is the ONLY way to recover your data if you forget your password. It will NOT be shown again.</p>
            </div>
          </div>

          <div className="recovery-key-container">
            <div className="recovery-key-grid">
              {words.map((word, i) => (
                <div key={i} className="recovery-word">
                  <span className="word-number">{i + 1}</span>
                  <span className="word-text">{word}</span>
                </div>
              ))}
            </div>
            
            <button className="copy-button" onClick={handleCopy}>
              {copied ? (
                <>
                  <FaCheck /> Copied!
                </>
              ) : (
                <>
                  <FaCopy /> Copy to Clipboard
                </>
              )}
            </button>
          </div>

          <div className="recovery-tips">
            <h4><FaLock /> Security Tips:</h4>
            <ul>
              <li>Write it down on paper and store in a safe place</li>
              <li>Use a password manager to store it securely</li>
              <li>Never share it with anyone</li>
              <li>Never enter it on any website except this app's recovery page</li>
            </ul>
          </div>

          <div className="recovery-confirm">
            <label className="confirm-checkbox">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              <span>I have saved my recovery key in a secure location</span>
            </label>
          </div>

          <button
            className="recovery-continue-btn"
            onClick={onClose}
            disabled={!confirmed}
          >
            Continue to App
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}



