import { motion, AnimatePresence } from "framer-motion";
import { FaTimes, FaBolt, FaArrowRight } from "react-icons/fa";
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
          className="pim-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onClose}
        >
          <motion.div
            className="pim-card"
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.97 }}
            transition={{ type: "spring", damping: 30, stiffness: 340, mass: 0.8 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Shimmer accent bar */}
            <div className="pim-accent-bar" />

            {/* Close */}
            <button
              className="pim-close"
              onClick={onClose}
              aria-label="Close"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              <FaTimes size={14} />
            </button>

            {/* Scrollable content */}
            <div className="pim-scroll">
              {/* Title */}
              <div className="pim-title-zone">
                <h2 className="pim-title" style={{ color: "#ffffff" }}>{title}</h2>
              </div>

              {/* Description */}
              <p className="pim-desc" style={{ color: "rgba(255,255,255,0.78)" }}>
                {description}
              </p>

              {/* Impact card */}
              {impact && (
                <motion.div
                  className="pim-impact"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15, duration: 0.35 }}
                >
                  <div className="pim-impact-icon">
                    <FaBolt size={13} style={{ color: "#00D9FF" }} />
                  </div>
                  <div className="pim-impact-content">
                    <span className="pim-impact-label" style={{ color: "#00D9FF" }}>
                      Why it matters
                    </span>
                    <p style={{ color: "rgba(255,255,255,0.7)" }}>{impact}</p>
                  </div>
                </motion.div>
              )}

              {/* Steps timeline */}
              {howItWorks && howItWorks.length > 0 && (
                <div className="pim-steps">
                  <div className="pim-steps-header" style={{ color: "rgba(255,255,255,0.45)" }}>
                    HOW IT WORKS
                  </div>
                  <div className="pim-timeline">
                    {howItWorks.map((step, i) => (
                      <motion.div
                        key={i}
                        className="pim-step"
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 + i * 0.06, duration: 0.3 }}
                      >
                        <div className="pim-step-rail">
                          <div className="pim-step-dot">{i + 1}</div>
                          {i < howItWorks.length - 1 && <div className="pim-step-line" />}
                        </div>
                        <p className="pim-step-text" style={{ color: "rgba(255,255,255,0.72)" }}>
                          {step}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pim-footer">
              <button className="pim-cta" onClick={onClose}>
                <span style={{ color: "#0a0e27" }}>Got it</span>
                <FaArrowRight size={12} style={{ color: "#0a0e27" }} />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
