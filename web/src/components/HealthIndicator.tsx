import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { FaCheckCircle, FaExclamationCircle, FaExclamationTriangle, FaTimesCircle, FaEye, FaEyeSlash } from "react-icons/fa";
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
  const [isHidden, setIsHidden] = useState<boolean>(true);
  const [isMouthOpen, setIsMouthOpen] = useState<boolean>(false);

  useEffect(() => {
    const saved = localStorage.getItem("finflow_health_hidden");
    if (saved !== null) {
      setIsHidden(saved === "true");
    }
  }, []);

  const toggleHidden = () => {
    const next = !isHidden;
    setIsHidden(next);
    localStorage.setItem("finflow_health_hidden", String(next));
  };

  const theme = useMemo(() => {
    switch (category) {
      case "good": return { glow: "#10b981", bg: "linear-gradient(135deg, #0f172a, #0b1b29)", mouth: "#10b981" };
      case "ok": return { glow: "#f59e0b", bg: "linear-gradient(135deg, #1f1305, #2a1d0c)", mouth: "#f59e0b" };
      case "not well": return { glow: "#f97316", bg: "linear-gradient(135deg, #2a1106, #3a1a0a)", mouth: "#f97316" };
      default: return { glow: "#ef4444", bg: "linear-gradient(135deg, #2b0c0c, #3c1515)", mouth: "#ef4444" };
    }
  }, [category]);

  const config = healthConfig[category];
  const HealthIcon = config.icon;
  const isPositive = remaining > 0;
  // Ensure integer display (backend already returns integer, but round here for safety)
  const displayAmount = Math.round(Math.abs(remaining));

  return (
    <motion.div
      className="health-indicator"
      onClick={() => {
        setIsMouthOpen(!isMouthOpen);
        if (onClick) onClick();
      }}
      style={{ background: theme.bg, cursor: "pointer", boxShadow: `0 12px 40px ${theme.glow}44` }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
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

      <div className="health-mouth" style={{ boxShadow: `0 0 20px ${theme.glow}55` }}>
        <motion.div
          className="mouth-top"
          style={{ background: theme.mouth }}
          animate={{ y: isMouthOpen ? -6 : 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 18 }}
        />
        <motion.div
          className="mouth-bottom"
          style={{ background: theme.mouth }}
          animate={{ y: isMouthOpen ? 6 : 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 18 }}
        />
        <motion.div
          className="mouth-inner"
          animate={{ height: isMouthOpen ? 46 : 12, opacity: isHidden ? 0.3 : 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
        >
          <button className="health-eye" onClick={(e) => { e.stopPropagation(); toggleHidden(); }}>
            {isHidden ? <FaEyeSlash /> : <FaEye />}
          </button>
          <motion.span
            className="mouth-score"
            animate={{ opacity: isHidden ? 0 : 1, scale: isHidden ? 0.9 : 1 }}
            transition={{ duration: 0.2 }}
          >
            {isHidden ? "•••••" : `${isPositive ? "₹" : "-₹"}${displayAmount.toLocaleString("en-IN")}`}
          </motion.span>
        </motion.div>
        <motion.div
          className="mouth-sparkles"
          style={{ borderColor: theme.glow }}
          animate={{ opacity: isMouthOpen && !isHidden ? [0.2, 0.7, 0.2] : 0 }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="health-message">{isHidden ? "Tap eye to reveal privately" : config.message}</div>
    </motion.div>
  );
}

