/**
 * SharedViewBanner — A reusable banner that indicates the user is viewing shared data.
 * Reads `finflow_selected_view` from localStorage and renders an informational strip.
 * Import into any data page that supports sharing.
 */
import { FaUsers, FaUserCircle, FaArrowLeft } from "react-icons/fa";

interface SharedViewBannerProps {
  /** Name/username of the shared member being viewed (for specific-user view) */
  partnerName?: string;
  /** Callback to switch back to "My Finances" */
  onSwitchBack?: () => void;
}

export function SharedViewBanner({ partnerName, onSwitchBack }: SharedViewBannerProps) {
  const selectedView = localStorage.getItem("finflow_selected_view") || "me";
  if (selectedView === "me") return null;

  const isMerged = selectedView === "merged";
  const label = isMerged
    ? "Combined (Shared) View"
    : `Viewing ${partnerName || "Partner"}'s Finances`;

  const handleSwitchBack = () => {
    if (onSwitchBack) {
      onSwitchBack();
    } else {
      localStorage.setItem("finflow_selected_view", "me");
      window.location.reload();
    }
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 16px",
        background: "linear-gradient(90deg, rgba(99,102,241,0.15), rgba(139,92,246,0.10))",
        borderRadius: 8,
        marginBottom: 12,
        border: "1px solid rgba(99,102,241,0.25)",
        fontSize: 13,
        color: "#a5b4fc",
      }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {isMerged ? <FaUsers size={14} /> : <FaUserCircle size={14} />}
        {label}
      </span>
      <button
        onClick={handleSwitchBack}
        style={{
          background: "none",
          border: "1px solid rgba(99,102,241,0.4)",
          borderRadius: 6,
          color: "#818cf8",
          fontSize: 12,
          cursor: "pointer",
          padding: "3px 10px",
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        <FaArrowLeft size={10} /> My Finances
      </button>
    </div>
  );
}
