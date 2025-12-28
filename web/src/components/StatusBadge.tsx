import "./StatusBadge.css";

interface StatusBadgeProps {
  status: "active" | "paused" | "paid" | "unpaid" | "overdue" | "pending" | "completed";
  icon?: string;
  label?: string;
  size?: "small" | "medium" | "large";
}

export function StatusBadge({ status, icon, label, size = "medium" }: StatusBadgeProps) {
  const config = {
    active: { icon: "●", label: "Active", color: "green" },
    paused: { icon: "⏸", label: "Paused", color: "amber" },
    paid: { icon: "✓", label: "Paid", color: "green" },
    unpaid: { icon: "○", label: "Unpaid", color: "gray" },
    overdue: { icon: "!", label: "Overdue", color: "red" },
    pending: { icon: "⏱", label: "Pending", color: "blue" },
    completed: { icon: "✓", label: "Completed", color: "green" }
  };

  const { icon: defaultIcon, label: defaultLabel, color } = config[status];

  return (
    <span className={`status-badge ${color} ${size}`}>
      <span className="badge-icon">{icon || defaultIcon}</span>
      <span className="badge-label">{label || defaultLabel}</span>
    </span>
  );
}

