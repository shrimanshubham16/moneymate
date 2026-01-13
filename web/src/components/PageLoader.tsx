/**
 * PageLoader - Full-page loading indicator with privacy-aware messaging
 * 
 * Shows while pages load data, with optional privacy context messaging
 */
import { motion } from "framer-motion";
import { AppEmoji } from "./AppEmoji";
import "./PageLoader.css";

interface PageLoaderProps {
  message?: string;
  showPrivacyNote?: boolean;
}

export function PageLoader({ message = "Loading...", showPrivacyNote = false }: PageLoaderProps) {
  return (
    <motion.div 
      className="page-loader"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="loader-content">
        <div className="loader-spinner">
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
        </div>
        <p className="loader-message">{message}</p>
        {showPrivacyNote && (
          <p className="loader-privacy-note">
            <AppEmoji name="lock" /> Your data is encrypted end-to-end
          </p>
        )}
      </div>
    </motion.div>
  );
}

/**
 * RefreshPrompt - Shown when intermittent issues occur
 * Provides a friendly way to refresh and explains the privacy trade-off
 */
interface RefreshPromptProps {
  onRefresh: () => void;
  issue?: string;
}

export function RefreshPrompt({ onRefresh, issue = "display issue" }: RefreshPromptProps) {
  return (
    <motion.div 
      className="refresh-prompt"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="refresh-icon">🔄</div>
      <h3>Quick Refresh Needed</h3>
      <p>
        We noticed a {issue}. This can happen occasionally with encrypted data.
      </p>
      <button className="refresh-button" onClick={onRefresh}>
        <span className="refresh-btn-icon">↻</span>
        Refresh Now
      </button>
      <p className="privacy-note">
        <span className="lock-icon"><AppEmoji name="lock" /></span>
        This is a known trade-off for end-to-end encryption that keeps your financial data private.
      </p>
    </motion.div>
  );
}
