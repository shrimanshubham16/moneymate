import { motion, AnimatePresence } from "framer-motion";
import { FaTimes, FaInfoCircle, FaChartBar, FaCog } from "react-icons/fa";
import "./PageInfoModal.css";

interface PageInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  impact?: string;
  howItWorks?: string[];
}

export function PageInfoModal({
  isOpen,
  onClose,
  title,
  description,
  impact,
  howItWorks
}: PageInfoModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="page-info-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <motion.div
            className="page-info-modal-content"
            initial={{ scale: 0.92, opacity: 0, y: 24 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 24 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="page-info-modal-header">
              <div className="page-info-icon">
                <FaInfoCircle size={20} />
              </div>
              <h2 style={{ color: "#ffffff" }}>{title}</h2>
              <button className="page-info-close-btn" onClick={onClose} aria-label="Close">
                <FaTimes size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="page-info-modal-body">
              <p className="page-info-description" style={{ color: "rgba(255,255,255,0.8)" }}>
                {description}
              </p>

              {impact && (
                <div className="page-info-section impact">
                  <h3 style={{ color: "#00D9FF" }}>
                    <FaChartBar style={{ marginRight: 8, flexShrink: 0 }} />
                    Impact on Your Finances
                  </h3>
                  <p style={{ color: "rgba(255,255,255,0.72)" }}>{impact}</p>
                </div>
              )}

              {howItWorks && howItWorks.length > 0 && (
                <div className="page-info-section how-it-works">
                  <h3 style={{ color: "#A78BFA" }}>
                    <FaCog style={{ marginRight: 8, flexShrink: 0 }} />
                    How It Works
                  </h3>
                  <ul>
                    {howItWorks.map((item, index) => (
                      <li key={index} style={{ color: "rgba(255,255,255,0.72)" }}>
                        <span className="step-number">{index + 1}</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="page-info-modal-footer">
              <button className="page-info-got-it-btn" onClick={onClose}>
                Got it!
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
