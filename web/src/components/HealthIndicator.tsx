import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { FaCheckCircle, FaExclamationCircle, FaExclamationTriangle, FaTimesCircle, FaLock, FaShieldAlt } from "react-icons/fa";
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
  const [isRevealed, setIsRevealed] = useState<boolean>(false);

  useEffect(() => {
    const saved = localStorage.getItem("finflow_health_hidden");
    if (saved !== null) {
      setIsHidden(saved === "true");
    }
  }, []);

  const toggleHidden = () => {
    const next = !isHidden;
    setIsHidden(next);
    setIsRevealed(!next);
    localStorage.setItem("finflow_health_hidden", String(next));
  };

  const theme = useMemo(() => {
    switch (category) {
      case "good": return { glow: "#22d3ee", bg: "radial-gradient(circle at 30% 20%, #0ea5e9 0%, #0b1220 70%)", ring: "#22d3ee", text: "#e0faff" };
      case "ok": return { glow: "#f59e0b", bg: "radial-gradient(circle at 30% 20%, #f59e0b 0%, #1f1305 70%)", ring: "#fbbf24", text: "#fff3d4" };
      case "not well": return { glow: "#f97316", bg: "radial-gradient(circle at 30% 20%, #fb923c 0%, #2a1106 70%)", ring: "#fb923c", text: "#ffe4cc" };
      default: return { glow: "#ef4444", bg: "radial-gradient(circle at 30% 20%, #ef4444 0%, #2b0c0c 70%)", ring: "#f87171", text: "#ffe0e0" };
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
      onClick={onClick}
      style={{ background: theme.bg, cursor: "pointer", boxShadow: `0 12px 40px ${theme.glow}33` }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.99 }}
    >
      <div className="health-hud">
        <motion.div
          className="hud-ring outer"
          style={{ borderColor: theme.ring, boxShadow: `0 0 30px ${theme.glow}55` }}
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="hud-ring inner"
          style={{ borderColor: theme.ring }}
          animate={{ rotate: [360, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        />
        <div className="hud-center" onClick={(e) => { e.stopPropagation(); toggleHidden(); }}>
          <div className="hud-top-row">
            <HealthIcon size={32} color={theme.ring} />
            <span className="hud-category">{category.toUpperCase()}</span>
            <button className="hud-lock" onClick={(e) => { e.stopPropagation(); toggleHidden(); }}>
              {isHidden ? <FaLock /> : <FaShieldAlt />}
            </button>
          </div>
          <div className="hud-score" style={{ color: theme.text }}>
            {isHidden ? "••••••" : `${isPositive ? "₹" : "-₹"}${displayAmount.toLocaleString("en-IN")}`}
          </div>
          <div className="hud-subtext">Tap to {isHidden ? "reveal" : "hide"} · Privacy on-device</div>
        </div>
      </div>

      <div className="health-message">{isHidden ? "Encrypted view · tap shield to reveal" : config.message}</div>
    </motion.div>
  );
}

