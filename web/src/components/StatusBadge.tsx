import { FaCheckCircle, FaPause, FaCircle, FaExclamationCircle, FaClock, FaExclamationTriangle } from "react-icons/fa";
import "./StatusBadge.css";

interface StatusBadgeProps {
  status: "active" | "paused" | "paid" | "unpaid" | "overdue" | "pending" | "completed" | "error";
  icon?: React.ReactNode;
  label?: string;
  size?: "small" | "medium" | "large";
}

export function StatusBadge({ status, icon, label, size = "medium" }: StatusBadgeProps) {
  const config = {
    active: { icon: <FaCheckCircle size={size === "small" ? 12 : size === "large" ? 16 : 14} />, label: "Active", color: "green" },
    paused: { icon: <FaPause size={size === "small" ? 12 : size === "large" ? 16 : 14} />, label: "Paused", color: "amber" },
    paid: { icon: <FaCheckCircle size={size === "small" ? 12 : size === "large" ? 16 : 14} />, label: "Paid", color: "green" },
    unpaid: { icon: <FaCircle size={size === "small" ? 12 : size === "large" ? 16 : 14} />, label: "Unpaid", color: "gray" },
    overdue: { icon: <FaExclamationCircle size={size === "small" ? 12 : size === "large" ? 16 : 14} />, label: "Overdue", color: "red" },
    pending: { icon: <FaClock size={size === "small" ? 12 : size === "large" ? 16 : 14} />, label: "Pending", color: "blue" },
    completed: { icon: <FaCheckCircle size={size === "small" ? 12 : size === "large" ? 16 : 14} />, label: "Completed", color: "green" },
    error: { icon: <FaExclamationTriangle size={size === "small" ? 12 : size === "large" ? 16 : 14} />, label: "Error", color: "red" }
  };

  const { icon: defaultIcon, label: defaultLabel, color } = config[status];

  return (
    <span className={`status-badge ${color} ${size}`}>
      <span className="badge-icon">{icon || defaultIcon}</span>
      <span className="badge-label">{label || defaultLabel}</span>
    </span>
  );
}

