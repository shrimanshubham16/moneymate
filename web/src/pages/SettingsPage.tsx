import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FaUser, FaCreditCard, FaHandshake, FaPalette, FaInfoCircle, FaChartLine, FaCog, FaShieldAlt } from "react-icons/fa";
import { StatusBadge } from "../components/StatusBadge";
import { IntroModal } from "../components/IntroModal";
import { useIntroModal } from "../hooks/useIntroModal";
import "./SettingsPage.css";

export function SettingsPage() {
  const navigate = useNavigate();
  const { showIntro, closeIntro } = useIntroModal("settings");

  const settingsItems = [
    { id: "account", title: "Account", icon: <FaUser size={32} />, description: "Manage username and profile" },
    { id: "preferences", title: "Billing Preferences", icon: <FaCog size={32} />, description: "Set month start day & currency" },
    { 
      id: "sharing", 
      title: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          Sharing
          <StatusBadge status="info" size="small" label="BETA" />
        </div>
      ), 
      icon: <FaHandshake size={32} />, 
      description: "Share account and manage members" 
    },
    { id: "plan-finances", title: "Plan Finances", icon: <FaChartLine size={32} />, description: "Plan income, expenses, and investments" },
    { id: "credit-cards", title: "Credit Cards", icon: <FaCreditCard size={32} />, description: "Manage credit card bills" },
    { id: "privacy", title: "Privacy & Security", icon: <FaShieldAlt size={32} />, description: "How we protect your financial data" },
    { id: "support", title: "Support", icon: <FaPalette size={32} />, description: "Get help and contact support" },
    { id: "about", title: "About", icon: <FaInfoCircle size={32} />, description: "About FinFlow and usage guide" }
  ];

  return (
    <div className="settings-page">
      <IntroModal
        isOpen={showIntro}
        onClose={closeIntro}
        title="Settings & Configuration"
        description="Customize your FinFlow experience. Manage your account, set financial preferences, share with family, and configure everything to match your needs."
        tips={[
          "Account settings let you update your profile and password",
          "Billing Preferences sets your month start day for calculations",
          "Sharing allows you to merge finances with family members",
          "Plan Finances is where you set up recurring income and expenses"
        ]}
      />
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

