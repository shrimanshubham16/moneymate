import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { forgotPassword, resetPassword } from '../api';
import './ForgotPasswordPage.css';
import { AppEmoji } from '../components/AppEmoji';

interface ForgotPasswordPageProps {
  onBack: () => void;
}

type Step = 'email' | 'verify' | 'success';

export function ForgotPasswordPage({ onBack }: ForgotPasswordPageProps) {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [recoveryKey, setRecoveryKey] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);

  const handleRequestReset = async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const res = await forgotPassword(email);
      if (res._dev_code) {
        setDevCode(res._dev_code);
      }
      setStep('verify');
    } catch (err: any) {
      // Don't reveal if email exists or not
      setStep('verify');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    // Validate
    if (!resetCode || resetCode.length !== 6) {
      setError('Please enter the 6-digit reset code');
      return;
    }
    
    if (!recoveryKey.trim()) {
      setError('Please enter your 24-word recovery key');
      return;
    }
    
    const words = recoveryKey.trim().toLowerCase().split(/\s+/);
    if (words.length !== 24) {
      setError(`Recovery key must be 24 words (you entered ${words.length})`);
      return;
    }
    
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      await resetPassword(email, resetCode, recoveryKey.trim().toLowerCase(), newPassword);
      setStep('success');
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-password-container">
      <motion.div
        className="forgot-password-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <button onClick={onBack} className="back-button">
          ← Back to Login
        </button>
        
        <div className="forgot-password-header">
          <h1>🔐 Password Recovery</h1>
          <p>Recover access to your account</p>
        </div>

        <AnimatePresence mode="wait">
          {step === 'email' && (
            <motion.div
              key="email-step"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="forgot-password-step"
            >
              <div className="step-indicator">
                <div className="step active">1</div>
                <div className="step-line"></div>
                <div className="step">2</div>
              </div>
              
              <h2>Step 1: Enter Your Email</h2>
              <p>We'll send you a verification code to your registered email address.</p>
              
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                />
              </div>
              
              {error && <div className="error-message">{error}</div>}
              
              <button 
                onClick={handleRequestReset}
                disabled={loading}
                className="primary-button"
              >
                {loading ? 'Sending...' : 'Send Reset Code'}
              </button>
            </motion.div>
          )}

          {step === 'verify' && (
            <motion.div
              key="verify-step"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="forgot-password-step"
            >
              <div className="step-indicator">
                <div className="step completed">✓</div>
                <div className="step-line completed"></div>
                <div className="step active">2</div>
              </div>
              
              <h2>Step 2: Verify & Reset</h2>
              <p>Enter your reset code, recovery key, and new password.</p>
              
              {/* Dev mode only: show code (hidden in production) */}
              {devCode && import.meta.env.DEV && (
                <div className="dev-code-notice">
                  🔧 Dev mode: Your reset code is <strong>{devCode}</strong>
                </div>
              )}
              
              <div className="form-group">
                <label>Reset Code (from email)</label>
                <input
                  type="text"
                  maxLength={6}
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="code-input"
                />
              </div>
              
              <div className="form-group">
                <label>Recovery Key (24 words)</label>
                <textarea
                  value={recoveryKey}
                  onChange={(e) => setRecoveryKey(e.target.value)}
                  placeholder="Enter your 24-word recovery phrase separated by spaces..."
                  rows={4}
                />
                <small className="help-text">
                  This is the backup phrase you saved when creating your account.
                </small>
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
                />
              </div>
              
              {error && <div className="error-message">{error}</div>}
              
              <button 
                onClick={handleResetPassword}
                disabled={loading}
                className="primary-button"
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
              
              <button 
                onClick={() => { setStep('email'); setError(null); }}
                className="secondary-button"
              >
                Start Over
              </button>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div
              key="success-step"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="forgot-password-step success-step"
            >
              <div className="success-icon">✅</div>
              <h2>Password Reset Successful!</h2>
              <p>Your password has been reset. You can now log in with your new password.</p>
              
              <button onClick={onBack} className="primary-button">
                Go to Login
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        
        <div className="forgot-password-info">
          <h3><AppEmoji name="info" /> Security Note</h3>
          <p>
            Password recovery requires both your email verification AND your 24-word recovery key. 
            This ensures that even if someone gains access to your email, they cannot access your 
            financial data without your recovery key.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

