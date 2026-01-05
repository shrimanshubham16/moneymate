import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FaBell, FaExclamationTriangle, FaInfoCircle, FaCheckCircle } from "react-icons/fa";
import { MdAccountBalanceWallet } from "react-icons/md";
import { useEncryptedApiCalls } from "../hooks/useEncryptedApiCalls";
import "./AlertsPage.css";

interface AlertsPageProps {
  token: string;
}

export function AlertsPage({ token }: AlertsPageProps) {
  const navigate = useNavigate();
  const api = useEncryptedApiCalls();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      const res = await api.fetchAlerts(token);
      setAlerts(res.data || []);
    } catch (e) {
      console.error("Failed to load alerts:", e);
    } finally {
      setLoading(false);
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "overspend":
      case "missed_investment":
      case "missed_sip":
        return <FaExclamationTriangle className="alert-icon warning" />;
      case "info":
        return <FaInfoCircle className="alert-icon info" />;
      case "success":
        return <FaCheckCircle className="alert-icon success" />;
      default:
        return <FaBell className="alert-icon default" />;
    }
  };

  const getAlertClass = (type: string) => {
    switch (type) {
      case "overspend":
      case "missed_investment":
      case "missed_sip":
        return "alert-card warning";
      case "info":
        return "alert-card info";
      case "success":
        return "alert-card success";
      default:
        return "alert-card default";
    }
  };

  return (
    <div className="alerts-page">
      <div className="page-header">
        <button 
          className="logo-button" 
          onClick={() => navigate("/dashboard")}
          title="Go to Dashboard"
        >
          <span className="logo-icon"><MdAccountBalanceWallet size={32} /></span>
          <span className="logo-text">FinFlow</span>
        </button>
        <div className="header-actions">
          <button className="settings-button" onClick={() => navigate("/settings")}>
            <MdAccountBalanceWallet style={{ marginRight: 6 }} /> Settings
          </button>
        </div>
      </div>

      <div className="alerts-header">
        <h1><FaBell /> Alerts & Notifications</h1>
        <p className="subtitle">Stay on top of your financial activity</p>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="spinner" />
          <p>Loading alerts...</p>
        </div>
      ) : alerts.length === 0 ? (
        <motion.div
          className="empty-state"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <FaBell size={80} color="#cbd5e0" />
          <h2>No Alerts</h2>
          <p>You're all caught up! Check back later for new notifications.</p>
        </motion.div>
      ) : (
        <motion.div
          className="alerts-list"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {alerts.map((alert, index) => (
            <motion.div
              key={alert.id || index}
              className={getAlertClass(alert.type)}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <div className="alert-icon-container">
                {getAlertIcon(alert.type)}
              </div>
              <div className="alert-content">
                <h3 className="alert-title">{alert.title || alert.message}</h3>
                {alert.details && <p className="alert-details">{alert.details}</p>}
                <span className="alert-timestamp">
                  {new Date(alert.createdAt || alert.timestamp || Date.now()).toLocaleString("en-IN", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

