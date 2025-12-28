import { motion } from "framer-motion";
import "./ProgressBar.css";

interface ProgressBarProps {
  current: number;
  target: number;
  label?: string;
  showPercentage?: boolean;
  color?: "green" | "blue" | "amber" | "red";
  height?: "small" | "medium" | "large";
}

export function ProgressBar({ 
  current, 
  target, 
  label, 
  showPercentage = true,
  color = "blue",
  height = "medium"
}: ProgressBarProps) {
  const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const isOverBudget = current > target;
  
  // Auto color based on percentage
  let barColor = color;
  if (isOverBudget) {
    barColor = "red";
  } else if (percentage > 90) {
    barColor = "amber";
  } else if (percentage > 70) {
    barColor = "blue";
  } else {
    barColor = "green";
  }

  return (
    <div className="progress-bar-container">
      {label && (
        <div className="progress-label">
          <span>{label}</span>
          {showPercentage && (
            <span className={`progress-percentage ${isOverBudget ? 'over-budget' : ''}`}>
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}
      <div className={`progress-track ${height}`}>
        <motion.div
          className={`progress-fill ${barColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(percentage, 100)}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
        {isOverBudget && (
          <motion.div
            className="progress-overflow"
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(percentage - 100, 100)}%` }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
          />
        )}
      </div>
      <div className="progress-amounts">
        <span className="current">₹{current.toLocaleString("en-IN")}</span>
        <span className="target">of ₹{target.toLocaleString("en-IN")}</span>
      </div>
    </div>
  );
}

