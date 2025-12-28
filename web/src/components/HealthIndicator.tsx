import { motion } from "framer-motion";
import { FaCheckCircle, FaExclamationCircle, FaExclamationTriangle, FaTimesCircle } from "react-icons/fa";
import "./HealthIndicator.css";

type HealthCategory = "good" | "ok" | "not well" | "worrisome";

interface HealthIndicatorProps {
  category: HealthCategory;
  remaining: number;
  onClick?: () => void;
}

const healthConfig = {
  good: {
    icon: FaCheckCircle,
    color: "#10b981",
    bgGradient: "linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)",
    message: "You're ahead. Keep the pace."
  },
  ok: {
    icon: FaExclamationCircle,
    color: "#f59e0b",
    bgGradient: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
    message: "Track your spends to stay in the green."
  },
  "not well": {
    icon: FaExclamationTriangle,
    color: "#f97316",
    bgGradient: "linear-gradient(135deg, #fed7aa 0%, #fdba74 100%)",
    message: "Tighten a bit. Shift some variable spends."
  },
  worrisome: {
    icon: FaTimesCircle,
    color: "#ef4444",
    bgGradient: "linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)",
    message: "You're short. Add notes on any extra spend."
  }
};

export function HealthIndicator({ category, remaining, onClick }: HealthIndicatorProps) {
  const config = healthConfig[category];
  const HealthIcon = config.icon;
  const isPositive = remaining > 0;
  // Ensure integer display (backend already returns integer, but round here for safety)
  const displayAmount = Math.round(Math.abs(remaining));

  return (
    <motion.div
      className="health-indicator"
      onClick={onClick}
      style={{ background: config.bgGradient, cursor: onClick ? "pointer" : "default" }}
      whileHover={onClick ? { scale: 1.05 } : {}}
      whileTap={onClick ? { scale: 0.95 } : {}}
      animate={{
        scale: [1, 1.02, 1],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    >
      <div className="health-emoji"><HealthIcon size={48} color={config.color} /></div>
      <div className="health-category">{category.toUpperCase()}</div>
      <div className="health-amount" style={{ color: config.color }}>
        {isPositive ? "₹" : "-₹"}
        {displayAmount.toLocaleString("en-IN")}
      </div>
      <div className="health-message">{config.message}</div>
      <motion.div
        className="health-pulse"
        style={{ borderColor: config.color }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.5, 0, 0.5]
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
    </motion.div>
  );
}

