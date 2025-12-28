import { motion } from "framer-motion";
import "./DashboardWidget.css";

interface DashboardWidgetProps {
  title: string;
  value: string | number;
  subtitle?: string | React.ReactNode;
  icon?: React.ReactNode;
  onClick?: () => void;
  color?: string;
  trend?: "up" | "down" | "neutral";
}

export function DashboardWidget({ title, value, subtitle, icon, onClick, color, trend }: DashboardWidgetProps) {
  return (
    <motion.div
      className="dashboard-widget"
      onClick={onClick}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      style={{ cursor: onClick ? "pointer" : "default" }}
    >
      <div className="widget-header">
        {icon && <span className="widget-icon">{icon}</span>}
        <h3 className="widget-title">{title}</h3>
      </div>
      <div className="widget-value" style={{ color }}>
        {value}
      </div>
      {subtitle && <div className="widget-subtitle">{subtitle}</div>}
      {trend && (
        <div className={`widget-trend ${trend}`}>
          {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"}
        </div>
      )}
    </motion.div>
  );
}

