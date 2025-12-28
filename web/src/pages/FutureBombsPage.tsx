import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { fetchDashboard } from "../api";
import "./FutureBombsPage.css";

interface FutureBombsPageProps {
  token: string;
}

export function FutureBombsPage({ token }: FutureBombsPageProps) {
  const navigate = useNavigate();
  const [bombs, setBombs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBombs();
  }, []);

  const loadBombs = async () => {
    try {
      const res = await fetchDashboard(token, "2025-01-15T00:00:00Z");
      setBombs(res.data.futureBombs || []);
    } catch (e) {
      console.error("Failed to load future bombs:", e);
    } finally {
      setLoading(false);
    }
  };

  const getSeverity = (bomb: any) => {
    if (bomb.preparednessRatio < 0.4) return "critical";
    if (bomb.preparednessRatio < 0.7) return "warn";
    return "ok";
  };

  return (
    <div className="future-bombs-page">
      <div className="page-header">
        <button className="back-button" onClick={() => navigate("/dashboard")}>← Back</button>
        <h1>Future Bombs</h1>
        <button className="add-button" onClick={() => alert("Future Bomb creation coming soon! For now, they are automatically tracked from your planned expenses.")}>
          + Add Future Bomb
        </button>
      </div>
      {loading ? <div>Loading...</div> : bombs.length === 0 ? (
        <div className="empty-state">No future bombs. Add upcoming liabilities to track them!</div>
      ) : (
        <div className="bombs-list">
          {bombs.map((bomb, index) => {
            const severity = getSeverity(bomb);
            const dueDate = new Date(bomb.dueDate);
            const daysUntil = Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
            return (
              <motion.div
                key={bomb.id}
                className={`bomb-card ${severity}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="bomb-header">
                  <h3>{bomb.name}</h3>
                  <span className={`severity-badge ${severity}`}>
                    {severity === "critical" ? "🔴 Critical" : severity === "warn" ? "🟡 Warning" : "🟢 OK"}
                  </span>
                </div>
                <div className="bomb-details">
                  <div className="detail-item">
                    <span className="label">Due Date</span>
                    <span className="value">{dueDate.toLocaleDateString()} ({daysUntil} days)</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Total Amount</span>
                    <span className="value">₹{bomb.totalAmount.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Saved</span>
                    <span className="value">₹{bomb.savedAmount.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Monthly Equivalent</span>
                    <span className="value">₹{Math.round(bomb.monthlyEquivalent).toLocaleString("en-IN")}/month</span>
                  </div>
                </div>
                <div className="preparedness-meter">
                  <div className="meter-label">Preparedness</div>
                  <div className="meter-bar">
                    <motion.div
                      className="meter-fill"
                      style={{ width: `${bomb.preparednessRatio * 100}%`, backgroundColor: severity === "critical" ? "#ef4444" : severity === "warn" ? "#f59e0b" : "#10b981" }}
                      initial={{ width: 0 }}
                      animate={{ width: `${bomb.preparednessRatio * 100}%` }}
                      transition={{ duration: 1, delay: index * 0.1 }}
                    />
                  </div>
                  <div className="meter-value">{(bomb.preparednessRatio * 100).toFixed(0)}%</div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

