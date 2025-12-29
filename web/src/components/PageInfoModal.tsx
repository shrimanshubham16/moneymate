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
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="page-info-modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="page-info-modal-content"
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="page-info-modal-header">
            <div className="page-info-icon">
              <FaInfoCircle size={28} />
            </div>
            <h2>{title}</h2>
            <button className="page-info-close-btn" onClick={onClose} aria-label="Close">
              <FaTimes size={18} />
            </button>
          </div>

          <div className="page-info-modal-body">
            <p className="page-info-description">{description}</p>

            {impact && (
              <div className="page-info-section">
                <h3><FaChartBar style={{ marginRight: 8, verticalAlign: 'middle' }} />Impact on Your Finances</h3>
                <p>{impact}</p>
              </div>
            )}

            {howItWorks && howItWorks.length > 0 && (
              <div className="page-info-section">
                <h3><FaCog style={{ marginRight: 8, verticalAlign: 'middle' }} />How It Works</h3>
                <ul>
                  {howItWorks.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="page-info-modal-footer">
            <button className="page-info-got-it-btn" onClick={onClose}>
              Got it!
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

