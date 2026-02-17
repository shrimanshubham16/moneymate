import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FaBell, FaArrowLeft, FaCheck } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useEncryptedApiCalls } from "../hooks/useEncryptedApiCalls";
import "./NotificationSettingsPage.css";

interface NotificationPreferences {
  inApp: {
    sharing: boolean;
    payments: boolean;
    budgetAlerts: boolean;
    system: boolean;
  };
}

const defaultPreferences: NotificationPreferences = {
  inApp: {
    sharing: true,
    payments: true,
    budgetAlerts: true,
    system: true
  }
};

interface NotificationSettingsPageProps {
  token: string;
}

export function NotificationSettingsPage({ token }: NotificationSettingsPageProps) {
  const navigate = useNavigate();
  const api = useEncryptedApiCalls();
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Fetch preferences on mount
  useEffect(() => {
    const fetchPreferences = async () => {
      if (!token) return;
      try {
        const data = await api.getNotificationPreferences(token);
        if (data?.inApp) setPreferences({ inApp: data.inApp });
      } catch (e) {
        console.error("Failed to fetch preferences:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchPreferences();
  }, [token]);

  // Save preferences
  const savePreferences = async () => {
    if (!token) return;
    
    setSaving(true);
    try {
      await api.updateNotificationPreferences(token, preferences);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error("Failed to save preferences:", e);
    } finally {
      setSaving(false);
    }
  };

  // Toggle handlers
  const toggleInApp = (key: keyof typeof preferences.inApp) => {
    setPreferences(prev => ({
      ...prev,
      inApp: { ...prev.inApp, [key]: !prev.inApp[key] }
    }));
  };

  if (loading) {
    return (
      <div className="notification-settings-page">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  return (
    <motion.div 
      className="notification-settings-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="page-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          <FaArrowLeft /> Back
        </button>
        <h1>Notification Settings</h1>
        <button 
          className={`save-button ${saved ? "saved" : ""}`}
          onClick={savePreferences}
          disabled={saving}
        >
          {saved ? <><FaCheck /> Saved</> : saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      <div className="settings-content">
        {/* In-App Notifications */}
        <section className="settings-section">
          <div className="section-header">
            <FaBell className="section-icon" />
            <div>
              <h2>In-App Notifications</h2>
              <p>Notifications shown within the app</p>
            </div>
          </div>

          <div className="settings-list">
            <div className="setting-item">
              <div className="setting-info">
                <span className="setting-label">Sharing Requests</span>
                <span className="setting-description">When someone wants to share finances with you</span>
              </div>
              <label className="toggle">
                <input 
                  type="checkbox" 
                  checked={preferences.inApp.sharing}
                  onChange={() => toggleInApp("sharing")}
                />
                <span className="toggle-slider" />
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <span className="setting-label">Payment Reminders</span>
                <span className="setting-description">Upcoming bills and payment due dates</span>
              </div>
              <label className="toggle">
                <input 
                  type="checkbox" 
                  checked={preferences.inApp.payments}
                  onChange={() => toggleInApp("payments")}
                />
                <span className="toggle-slider" />
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <span className="setting-label">Budget Alerts</span>
                <span className="setting-description">Overspending warnings and budget updates</span>
              </div>
              <label className="toggle">
                <input 
                  type="checkbox" 
                  checked={preferences.inApp.budgetAlerts}
                  onChange={() => toggleInApp("budgetAlerts")}
                />
                <span className="toggle-slider" />
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <span className="setting-label">System Notifications</span>
                <span className="setting-description">Important updates and announcements</span>
              </div>
              <label className="toggle">
                <input 
                  type="checkbox" 
                  checked={preferences.inApp.system}
                  onChange={() => toggleInApp("system")}
                />
                <span className="toggle-slider" />
              </label>
            </div>
          </div>
        </section>
      </div>
    </motion.div>
  );
}
