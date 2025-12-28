import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FaUser, FaCreditCard, FaHandshake, FaPalette, FaInfoCircle, FaChartLine, FaCog } from "react-icons/fa";
import "./SettingsPage.css";

export function SettingsPage() {
  const navigate = useNavigate();

  const settingsItems = [
    { id: "account", title: "Account", icon: <FaUser size={32} />, description: "Manage username and profile" },
    { id: "preferences", title: "Billing Preferences", icon: <FaCog size={32} />, description: "Set month start day & currency" },
    { id: "sharing", title: "Sharing", icon: <FaHandshake size={32} />, description: "Share account and manage members" },
    { id: "plan-finances", title: "Plan Finances", icon: <FaChartLine size={32} />, description: "Plan income, expenses, and investments" },
    { id: "credit-cards", title: "Credit Cards", icon: <FaCreditCard size={32} />, description: "Manage credit card bills" },
    { id: "support", title: "Support", icon: <FaPalette size={32} />, description: "Get help and contact support" },
    { id: "about", title: "About", icon: <FaInfoCircle size={32} />, description: "About MoneyMate and usage guide" }
  ];

  return (
    <div className="settings-page">
      <div className="settings-header">
        <button className="back-button" onClick={() => navigate("/dashboard")}>
          ← Back
        </button>
        <h1>Settings</h1>
      </div>

      <div className="settings-grid">
        {settingsItems.map((item, index) => (
          <motion.div
            key={item.id}
            className="settings-item"
            onClick={() => navigate(`/settings/${item.id}`)}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.05, y: -4 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="settings-icon">{item.icon}</div>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
            <div className="settings-arrow">→</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

