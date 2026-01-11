import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FaBell, FaEnvelope, FaCalendarAlt, FaArrowLeft, FaCheck } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "./NotificationSettingsPage.css";

interface NotificationPreferences {
  inApp: {
    sharing: boolean;
    payments: boolean;
    budgetAlerts: boolean;
    system: boolean;
  };
  email: {
    sharing: boolean;
    payments: boolean;
    budgetAlerts: boolean;
    system: boolean;
  };
  digest: {
    enabled: boolean;
    frequency: "daily" | "weekly" | "monthly";
    day: number;
    time: string;
  };
}

const defaultPreferences: NotificationPreferences = {
  inApp: {
    sharing: true,
    payments: true,
    budgetAlerts: true,
    system: true
  },
  email: {
    sharing: true,
    payments: false,
    budgetAlerts: false,
    system: true
  },
  digest: {
    enabled: false,
    frequency: "weekly",
    day: 0,
    time: "09:00"
  }
};

export function NotificationSettingsPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const getApiUrl = () => {
    const envUrl = (import.meta as any).env?.VITE_API_URL;
    if (envUrl) return envUrl;
    const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
    if (supabaseUrl) return `${supabaseUrl}/functions/v1/api`;
    return "http://localhost:12022";
  };

  // Fetch preferences on mount
  useEffect(() => {
    const fetchPreferences = async () => {
      if (!token) return;
      try {
        const response = await fetch(`${getApiUrl()}/notifications/preferences`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.ok) {
          const { data } = await response.json();
          setPreferences(data);
        }
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
      const response = await fetch(`${getApiUrl()}/notifications/preferences`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(preferences)
      });
      
      if (response.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
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

  const toggleEmail = (key: keyof typeof preferences.email) => {
    setPreferences(prev => ({
      ...prev,
      email: { ...prev.email, [key]: !prev.email[key] }
    }));
  };

  const updateDigest = (updates: Partial<typeof preferences.digest>) => {
    setPreferences(prev => ({
      ...prev,
      digest: { ...prev.digest, ...updates }
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

        {/* Email Notifications */}
        <section className="settings-section">
          <div className="section-header">
            <FaEnvelope className="section-icon" />
            <div>
              <h2>Email Notifications</h2>
              <p>Notifications sent to your email</p>
            </div>
          </div>

          <div className="settings-list">
            <div className="setting-item">
              <div className="setting-info">
                <span className="setting-label">Sharing Requests</span>
                <span className="setting-description">Get emailed when someone sends a sharing request</span>
              </div>
              <label className="toggle">
                <input 
                  type="checkbox" 
                  checked={preferences.email.sharing}
                  onChange={() => toggleEmail("sharing")}
                />
                <span className="toggle-slider" />
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <span className="setting-label">Payment Reminders</span>
                <span className="setting-description">Email reminders for upcoming payments</span>
              </div>
              <label className="toggle">
                <input 
                  type="checkbox" 
                  checked={preferences.email.payments}
                  onChange={() => toggleEmail("payments")}
                />
                <span className="toggle-slider" />
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <span className="setting-label">Budget Alerts</span>
                <span className="setting-description">Email alerts when you're overspending</span>
              </div>
              <label className="toggle">
                <input 
                  type="checkbox" 
                  checked={preferences.email.budgetAlerts}
                  onChange={() => toggleEmail("budgetAlerts")}
                />
                <span className="toggle-slider" />
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <span className="setting-label">System Emails</span>
                <span className="setting-description">Important account updates and security alerts</span>
              </div>
              <label className="toggle">
                <input 
                  type="checkbox" 
                  checked={preferences.email.system}
                  onChange={() => toggleEmail("system")}
                />
                <span className="toggle-slider" />
              </label>
            </div>
          </div>
        </section>

        {/* Email Digest */}
        <section className="settings-section">
          <div className="section-header">
            <FaCalendarAlt className="section-icon" />
            <div>
              <h2>Email Digest</h2>
              <p>Scheduled summary of your finances</p>
            </div>
          </div>

          <div className="settings-list">
            <div className="setting-item">
              <div className="setting-info">
                <span className="setting-label">Enable Digest</span>
                <span className="setting-description">Receive periodic summaries of your financial health</span>
              </div>
              <label className="toggle">
                <input 
                  type="checkbox" 
                  checked={preferences.digest.enabled}
                  onChange={() => updateDigest({ enabled: !preferences.digest.enabled })}
                />
                <span className="toggle-slider" />
              </label>
            </div>

            {preferences.digest.enabled && (
              <>
                <div className="setting-item">
                  <div className="setting-info">
                    <span className="setting-label">Frequency</span>
                    <span className="setting-description">How often to receive digest emails</span>
                  </div>
                  <select 
                    className="setting-select"
                    value={preferences.digest.frequency}
                    onChange={(e) => updateDigest({ frequency: e.target.value as any })}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                {preferences.digest.frequency === "weekly" && (
                  <div className="setting-item">
                    <div className="setting-info">
                      <span className="setting-label">Day of Week</span>
                      <span className="setting-description">Which day to receive weekly digest</span>
                    </div>
                    <select 
                      className="setting-select"
                      value={preferences.digest.day}
                      onChange={(e) => updateDigest({ day: parseInt(e.target.value) })}
                    >
                      <option value={0}>Sunday</option>
                      <option value={1}>Monday</option>
                      <option value={2}>Tuesday</option>
                      <option value={3}>Wednesday</option>
                      <option value={4}>Thursday</option>
                      <option value={5}>Friday</option>
                      <option value={6}>Saturday</option>
                    </select>
                  </div>
                )}

                {preferences.digest.frequency === "monthly" && (
                  <div className="setting-item">
                    <div className="setting-info">
                      <span className="setting-label">Day of Month</span>
                      <span className="setting-description">Which day to receive monthly digest</span>
                    </div>
                    <select 
                      className="setting-select"
                      value={preferences.digest.day}
                      onChange={(e) => updateDigest({ day: parseInt(e.target.value) })}
                    >
                      {[...Array(28)].map((_, i) => (
                        <option key={i + 1} value={i + 1}>{i + 1}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="setting-item">
                  <div className="setting-info">
                    <span className="setting-label">Preferred Time</span>
                    <span className="setting-description">What time to receive the digest</span>
                  </div>
                  <input 
                    type="time"
                    className="setting-time"
                    value={preferences.digest.time}
                    onChange={(e) => updateDigest({ time: e.target.value })}
                  />
                </div>
              </>
            )}
          </div>
        </section>

        <div className="digest-preview">
          <h3>📊 What's in Your Digest?</h3>
          <ul>
            <li>✅ Health score summary and trends</li>
            <li>✅ Income vs. expenses overview</li>
            <li>✅ Upcoming bills and payments</li>
            <li>✅ Savings progress</li>
            <li>✅ Budget category breakdown</li>
          </ul>
        </div>
      </div>
    </motion.div>
  );
}
