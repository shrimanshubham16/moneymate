import { motion } from "framer-motion";
import "./EmptyState.css";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction
}: EmptyStateProps) {
  return (
    <motion.div
      className="empty-state"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {icon && <div className="empty-state-icon-wrapper">{icon}</div>}
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-description">{description}</p>
      {(actionLabel || secondaryActionLabel) && (
        <div className="empty-state-actions">
          {actionLabel && onAction && (
            <button className="empty-state-action primary" onClick={onAction}>
              {actionLabel}
            </button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <button className="empty-state-action secondary" onClick={onSecondaryAction}>
              {secondaryActionLabel}
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}

