import { useState } from 'react';
import { motion } from 'framer-motion';
import { verifyEmail, resendVerificationCode } from '../api';
import './EmailVerificationModal.css';

interface EmailVerificationModalProps {
  email: string;
  devCode?: string | null;
  onClose: (verified: boolean) => void;
}

export function EmailVerificationModal({ email, devCode, onClose }: EmailVerificationModalProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const handleVerify = async () => {
    if (!code || code.length !== 6) {
      setError('Please enter the 6-digit verification code');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      await verifyEmail(email, code);
      setSuccess(true);
      setTimeout(() => onClose(true), 1500);
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    
    setLoading(true);
    setError(null);
    
    try {
      await resendVerificationCode(email);
      setResendCooldown(60);
      const interval = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    onClose(false);
  };

  return (
    <div className="email-verification-overlay">
      <motion.div 
        className="email-verification-modal"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="email-verification-header">
          <div className="email-icon">📧</div>
          <h2>Verify Your Email</h2>
          <p>We sent a 6-digit code to <strong>{email}</strong></p>
        </div>

        {/* Dev mode: show code */}
        {devCode && (
          <div className="dev-code-notice">
            <small>🔧 Dev mode: Your code is <strong>{devCode}</strong></small>
          </div>
        )}

        <div className="verification-form">
          <input
            type="text"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            className="verification-code-input"
            disabled={loading || success}
          />
          
          {error && <div className="verification-error">{error}</div>}
          
          {success ? (
            <div className="verification-success">
              ✅ Email verified successfully!
            </div>
          ) : (
            <>
              <button 
                onClick={handleVerify} 
                disabled={loading || code.length !== 6}
                className="verify-button"
              >
                {loading ? 'Verifying...' : 'Verify Email'}
              </button>
              
              <div className="verification-actions">
                <button 
                  onClick={handleResend}
                  disabled={loading || resendCooldown > 0}
                  className="resend-button"
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                </button>
                
                <button 
                  onClick={handleSkip}
                  className="skip-button"
                  disabled={loading}
                >
                  Skip for now
                </button>
              </div>
            </>
          )}
        </div>

        <div className="email-verification-note">
          <p>💡 Verifying your email allows account recovery if you forget your password.</p>
        </div>
      </motion.div>
    </div>
  );
}

