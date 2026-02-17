import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { FaCheckCircle, FaExclamationCircle, FaExclamationTriangle, FaTimesCircle, FaEye, FaEyeSlash, FaLock } from "react-icons/fa";
import { AppEmoji } from "./AppEmoji";
import "./HealthIndicator.css";

type HealthCategory = "good" | "ok" | "not well" | "worrisome" | "unavailable";

interface HealthIndicatorProps {
  category: HealthCategory;
  remaining: number | null;
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
  },
  unavailable: {
    icon: FaLock,
    color: "#6b7280",
    bgGradient: "linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)",
    message: "User hasn't synced their data yet. E2E encrypted."
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
      case "unavailable": return { glow: "#6b7280", bg: "radial-gradient(circle at 30% 20%, #6b7280 0%, #1f2937 70%)", ring: "#9ca3af", text: "#e5e7eb" };
      default: return { glow: "#ef4444", bg: "radial-gradient(circle at 30% 20%, #ef4444 0%, #2b0c0c 70%)", ring: "#f87171", text: "#ffe0e0" };
    }
  }, [category]);

  const config = healthConfig[category] || healthConfig.unavailable;
  const HealthIcon = config.icon;
  const isUnavailable = category === "unavailable" || remaining === null;
  const isPositive = !isUnavailable && (remaining || 0) > 0;
  // Ensure integer display (backend already returns integer, but round here for safety)
  const displayAmount = isUnavailable ? 0 : Math.round(Math.abs(remaining || 0));

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
              {isHidden ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
          <div className="hud-score" style={{ color: theme.text }}>
            {isUnavailable 
              ? <><AppEmoji name="lock" /> Private</>
              : isHidden 
                ? "••••••" 
                : `${isPositive ? "₹" : "-₹"}${displayAmount.toLocaleString("en-IN")}`}
          </div>
        </div>
      </div>

      <div className="health-message">{config.message}</div>
    </motion.div>
  );
}

