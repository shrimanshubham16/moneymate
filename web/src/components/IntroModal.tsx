import { motion, AnimatePresence } from "framer-motion";
import { FaTimes, FaLightbulb } from "react-icons/fa";
import "./IntroModal.css";

interface IntroModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    description: string;
    tips?: string[];
}

export function IntroModal({ isOpen, onClose, title, description, tips }: IntroModalProps) {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="intro-modal-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            >
                <motion.div
                    className="intro-modal-content"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="intro-modal-header">
                        <div className="intro-icon">
                            <FaLightbulb size={32} />
                        </div>
                        <h2>{title}</h2>
                        <button className="intro-close-btn" onClick={onClose}>
                            <FaTimes size={20} />
                        </button>
                    </div>

                    <div className="intro-modal-body">
                        <p className="intro-description">{description}</p>

                        {tips && tips.length > 0 && (
                            <div className="intro-tips">
                                <h3>💡 Quick Tips:</h3>
                                <ul>
                                    {tips.map((tip, index) => (
                                        <li key={index}>{tip}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    <div className="intro-modal-footer">
                        <button className="intro-got-it-btn" onClick={onClose}>
                            Got it!
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
