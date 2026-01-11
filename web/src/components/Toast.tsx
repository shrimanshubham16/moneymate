import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import "./Toast.css";

interface ToastProps {
  message: string;
  show: boolean;
  onClose: () => void;
  type?: "success" | "error" | "info";
  duration?: number;
}

export function Toast({ message, show, onClose, type = "success", duration = 3000 }: ToastProps) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration, onClose]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className={`toast toast-${type}`}
          initial={{ opacity: 0, y: -50, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.8 }}
          transition={{ duration: 0.3 }}
        >
          <div className="toast-content">
            {type === "success" && "🎉 "}
            {type === "error" && "❌ "}
            {type === "info" && "ℹ️ "}
            {message}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}


