import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaCog, FaCalendar, FaMoneyBillWave, FaClock, FaSave, FaExclamationTriangle } from "react-icons/fa";
import { getUserPreferences, updateUserPreferences } from "../api";
import { SkeletonLoader } from "../components/SkeletonLoader";
import "./PreferencesPage.css";

interface PreferencesPageProps {
  token: string;
}

export function PreferencesPage({ token }: PreferencesPageProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState({
    monthStartDay: 1,
    currency: "INR",
    timezone: "Asia/Kolkata"
  });

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const res = await getUserPreferences(token);
      setPreferences(res.data);
    } catch (e) {
      console.error("Failed to load preferences:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateUserPreferences(token, preferences);
      alert("Preferences saved successfully! Your billing cycle will be updated.");
      navigate("/settings");
    } catch (e: any) {
      alert("Failed to save preferences: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const dayOptions = Array.from({ length: 28 }, (_, i) => i + 1);

  return (
    <div className="preferences-page">
      <div className="page-header">
        <button className="back-button" onClick={() => navigate("/settings")}>
          ← Back
        </button>
        <h1><FaCog style={{ marginRight: 8, verticalAlign: 'middle' }} />Billing Preferences</h1>
      </div>

      {loading ? (
        <SkeletonLoader type="card" count={2} />
      ) : (
        <div className="preferences-content">
          <div className="preference-card">
            <div className="preference-header">
              <h2><FaCalendar style={{ marginRight: 8, verticalAlign: 'middle' }} /> Month Start Day</h2>
              <p className="preference-description">
                Choose which day of the month your billing cycle starts. This determines when:
              </p>
              <ul className="preference-features">
                <li>Fixed expenses become due</li>
                <li>Investment payments reset</li>
                <li>Loan EMIs are tracked</li>
                <li>Payment checkboxes reset</li>
              </ul>
            </div>

            <div className="preference-control">
              <label htmlFor="monthStartDay">Your billing cycle starts on day:</label>
              <select
                id="monthStartDay"
                value={preferences.monthStartDay}
                onChange={(e) => setPreferences({ ...preferences, monthStartDay: Number(e.target.value) })}
                className="day-selector"
              >
                {dayOptions.map(day => (
                  <option key={day} value={day}>
                    {day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'} of every month
                  </option>
                ))}
              </select>
            </div>

            <div className="preference-example">
              <h3>Example:</h3>
              <p>
                If you select <strong>1st</strong>: Your month runs from 1st to 31st/30th<br />
                If you select <strong>15th</strong>: Your month runs from 15th to 14th of next month<br />
                If you select <strong>25th</strong>: Your month runs from 25th to 24th of next month
              </p>
            </div>
          </div>

          <div className="preference-card">
            <h2><FaMoneyBillWave style={{ marginRight: 8, verticalAlign: 'middle' }} /> Currency</h2>
            <div className="preference-control">
              <label htmlFor="currency">Display currency:</label>
              <select
                id="currency"
                value={preferences.currency}
                onChange={(e) => setPreferences({ ...preferences, currency: e.target.value })}
              >
                <option value="INR">₹ Indian Rupee (INR)</option>
                <option value="USD">$ US Dollar (USD)</option>
                <option value="EUR">€ Euro (EUR)</option>
                <option value="GBP">£ British Pound (GBP)</option>
              </select>
            </div>
          </div>

          <div className="preference-card">
            <h2><FaClock style={{ marginRight: 8, verticalAlign: 'middle' }} /> Timezone</h2>
            <div className="preference-control">
              <label htmlFor="timezone">Your timezone:</label>
              <select
                id="timezone"
                value={preferences.timezone}
                onChange={(e) => setPreferences({ ...preferences, timezone: e.target.value })}
              >
                <option value="Asia/Kolkata">India (Asia/Kolkata)</option>
                <option value="America/New_York">US Eastern (America/New_York)</option>
                <option value="America/Los_Angeles">US Pacific (America/Los_Angeles)</option>
                <option value="Europe/London">UK (Europe/London)</option>
                <option value="Asia/Tokyo">Japan (Asia/Tokyo)</option>
              </select>
            </div>
          </div>

          <div className="save-section">
            <button
              className="save-button"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving..." : <><FaSave style={{ marginRight: 8 }} /> Save Preferences</>}
            </button>
          </div>

          <div className="warning-box">
            <h3><FaExclamationTriangle style={{ marginRight: 8, verticalAlign: 'middle' }} /> Important Notes:</h3>
            <ul>
              <li>Changing the month start day will reset all payment tracking</li>
              <li>Choose a day between 1-28 to avoid issues with shorter months</li>
              <li>Your current dues and payments will be recalculated based on the new cycle</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

