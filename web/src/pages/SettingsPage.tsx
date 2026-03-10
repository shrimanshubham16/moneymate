import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FaUser, FaCreditCard, FaHandshake, FaPalette, FaInfoCircle, FaChartLine, FaCog, FaShieldAlt, FaBell, FaHeadset } from "react-icons/fa";
import { IntroModal } from "../components/IntroModal";
import { useIntroModal } from "../hooks/useIntroModal";
import "./SettingsPage.css";

export function SettingsPage() {
  const navigate = useNavigate();
  const { showIntro, closeIntro } = useIntroModal("settings");

  // Sections ordered by user visit frequency: finances → preferences → account → help
  const settingsSections = [
    {
      title: "Your Finances",
      items: [
        { id: "plan-finances", title: "Plan Finances", icon: <FaChartLine size={32} />, description: "Income, expenses, investments — all in one place" },
        { id: "credit-cards", title: "Credit Cards", icon: <FaCreditCard size={32} />, description: "Track bills and manage card payments" },
        { 
          id: "sharing", 
          title: "Sharing", 
          icon: <FaHandshake size={32} />, 
          description: "Share finances with family or partners" 
        },
      ]
    },
    {
      title: "App Settings",
      items: [
        { id: "preferences", title: "Billing & Currency", icon: <FaCog size={32} />, description: "Month start day, currency, and billing cycle" },
        { id: "theme", title: "Themes", icon: <FaPalette size={32} />, description: "Switch between Dark and Light mode" },
        { id: "notifications", title: "Notifications", icon: <FaBell size={32} />, description: "Control alerts and smart reminders" },
      ]
    },
    {
      title: "Account",
      items: [
        { id: "account", title: "Profile & Security", icon: <FaUser size={32} />, description: "Username, password, and recovery key" },
        { id: "privacy", title: "Privacy", icon: <FaShieldAlt size={32} />, description: "How your financial data stays protected" },
      ]
    },
    {
      title: "Help & Info",
      items: [
        { id: "support", title: "Support", icon: <FaHeadset size={32} />, description: "Get help or report an issue" },
        { id: "about", title: "About FinFlow", icon: <FaInfoCircle size={32} />, description: "Version, features, and usage guide" }
      ]
    }
  ];

  return (
    <div className="settings-page">
      <IntroModal
        isOpen={showIntro}
        onClose={closeIntro}
        title="Settings & Configuration"
        description="Make FinFlow work the way you want. Manage your account security, set billing preferences, share finances with family, customise themes, and configure every aspect of your experience."
        tips={[
          "Plan Finances — manage income, expenses, investments, and future bombs",
          "Billing & Currency — set the day your cycle starts and your preferred currency",
          "Sharing — invite family or partners to see a combined financial view",
          "Themes — switch between Dark and Light mode",
          "Profile & Security — update password and download your recovery key"
        ]}
      />
      <div className="settings-header">
        <button className="back-button" onClick={() => navigate("/dashboard")}>
          ← Back
        </button>
        <h1>Settings</h1>
      </div>

      {settingsSections.map((section, sectionIdx) => (
        <div key={section.title} className="settings-section-block">
          <h2 className="settings-section-title">{section.title}</h2>
          <div className="settings-grid">
            {section.items.map((item, index) => (
              <motion.div
                key={item.id}
                className="settings-item"
                onClick={() => navigate(`/settings/${typeof item.id === 'string' ? item.id : ''}`)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (sectionIdx * 0.1) + index * 0.05 }}
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
      ))}
    </div>
  );
}

