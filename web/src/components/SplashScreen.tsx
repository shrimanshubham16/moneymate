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

  // Money symbols for the swirl
  const moneySymbols = ['₹', '$', '€', '£', '¥', '₿'];
  
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
            {/* Psychedelic Neon Money Swirl */}
            <div className="money-swirl-container">
              {/* Outer Ring */}
              {moneySymbols.map((symbol, index) => (
                <motion.div
                  key={`outer-${index}`}
                  className="money-symbol outer-ring"
                  style={{
                    '--rotation': `${index * 60}deg`,
                    '--delay': `${index * 0.15}s`
                  } as any}
                  animate={{
                    rotate: [0, 360],
                    scale: [1, 1.2, 1],
                    opacity: [0.6, 1, 0.6]
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "linear",
                    delay: index * 0.15
                  }}
                >
                  {symbol}
                </motion.div>
              ))}
              
              {/* Middle Ring */}
              {moneySymbols.map((symbol, index) => (
                <motion.div
                  key={`middle-${index}`}
                  className="money-symbol middle-ring"
                  style={{
                    '--rotation': `${index * 60 + 30}deg`,
                    '--delay': `${index * 0.12}s`
                  } as any}
                  animate={{
                    rotate: [0, -360],
                    scale: [1, 1.3, 1],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "linear",
                    delay: index * 0.12
                  }}
                >
                  {symbol}
                </motion.div>
              ))}
              
              {/* Inner Ring */}
              {moneySymbols.slice(0, 4).map((symbol, index) => (
                <motion.div
                  key={`inner-${index}`}
                  className="money-symbol inner-ring"
                  style={{
                    '--rotation': `${index * 90}deg`,
                    '--delay': `${index * 0.1}s`
                  } as any}
                  animate={{
                    rotate: [0, 360],
                    scale: [1, 1.4, 1],
                    opacity: [0.4, 1, 0.4]
                  }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    ease: "linear",
                    delay: index * 0.1
                  }}
                >
                  {symbol}
                </motion.div>
              ))}
              
              {/* Center Glow */}
              <motion.div
                className="center-glow"
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.3, 0.6, 0.3]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            </div>

            {/* Brand */}
            <motion.h1
              className="splash-brand"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              FinFlow
            </motion.h1>

            {/* Progress Message */}
            <motion.div
              className="splash-message"
              key={stage}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
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
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

