import { FaCheckCircle, FaTimesCircle, FaExclamationTriangle, FaInfoCircle, FaLock, FaTools, FaBell, FaMagic, FaRedo } from "react-icons/fa";
import "./AppEmoji.css";

type EmojiName = "success" | "error" | "warning" | "info" | "lock" | "maintenance" | "notify" | "celebrate" | "refresh";

const ICONS: Record<EmojiName, React.ComponentType<{ size?: number; color?: string }>> = {
  success: FaCheckCircle,
  error: FaTimesCircle,
  warning: FaExclamationTriangle,
  info: FaInfoCircle,
  lock: FaLock,
  maintenance: FaTools,
  notify: FaBell,
  celebrate: FaMagic,
  refresh: FaRedo,
};

export function AppEmoji({ name, size = 18, color }: { name: EmojiName; size?: number; color?: string }) {
  const Icon = ICONS[name];
  return <Icon size={size} color={color} className="app-emoji-icon" />;
}
