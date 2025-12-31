import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./SplashScreen.css";

interface SplashScreenProps {
  isLoading: boolean;
  progress: number; // 0-100
}

export function SplashScreen({ isLoading, progress }: SplashScreenProps) {
  const [stage, setStage] = useState<"connecting" | "loading" | "ready">("connecting");

  useEffect(() => {
    if (progress < 30) {
      setStage("connecting");
    } else if (progress < 90) {
      setStage("loading");
    } else {
      setStage("ready");
    }
  }, [progress]);

  const getMessage = () => {
    switch (stage) {
      case "connecting":
        return "Connecting to server...";
      case "loading":
        return "Loading your data...";
      case "ready":
        return "Almost there...";
    }
  };

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          className="splash-screen"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="splash-content">
            {/* Logo/Brand */}
            <motion.div
              className="splash-logo"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <div className="logo-icon">💰</div>
              <h1 className="logo-text">FinFlow</h1>
            </motion.div>

            {/* Progress Message */}
            <motion.div
              className="splash-message"
              key={stage}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {getMessage()}
            </motion.div>

            {/* Progress Bar */}
            <div className="splash-progress-container">
              <motion.div
                className="splash-progress-bar"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            </div>

            {/* Animated Dots */}
            <div className="splash-dots">
              <motion.span
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
              >
                •
              </motion.span>
              <motion.span
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
              >
                •
              </motion.span>
              <motion.span
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 1 }}
              >
                •
              </motion.span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

