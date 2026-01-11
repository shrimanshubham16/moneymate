import { motion } from "framer-motion";
import "./PsychedelicLoader.css";

interface PsychedelicLoaderProps {
  message?: string;
}

export function PsychedelicLoader({ message = "Loading..." }: PsychedelicLoaderProps) {
  return (
    <div className="psychedelic-loader-container">
      <div className="psychedelic-background">
        {/* Animated gradient orbs */}
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>
        <div className="orb orb-4"></div>
      </div>
      
      <div className="loader-content">
        {/* Spinning rings */}
        <div className="rings-container">
          <motion.div
            className="ring ring-outer"
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            className="ring ring-middle"
            animate={{ rotate: -360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            className="ring ring-inner"
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          />
          
          {/* Center pulse */}
          <motion.div
            className="center-pulse"
            animate={{ 
              scale: [1, 1.3, 1],
              opacity: [0.8, 1, 0.8]
            }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        
        {/* Loading text with wave effect */}
        <motion.div 
          className="loader-text"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {message.split('').map((char, i) => (
            <motion.span
              key={i}
              className="loader-char"
              animate={{ 
                y: [0, -8, 0],
                color: ['#00d4ff', '#ff00ff', '#00ff88', '#00d4ff']
              }}
              transition={{ 
                duration: 1.2,
                delay: i * 0.08,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              {char === ' ' ? '\u00A0' : char}
            </motion.span>
          ))}
        </motion.div>
        
        {/* Progress dots */}
        <div className="progress-dots">
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
              className="progress-dot"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.3, 1, 0.3],
                backgroundColor: ['#00d4ff', '#ff00ff', '#00ff88']
              }}
              transition={{
                duration: 1,
                delay: i * 0.15,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}


