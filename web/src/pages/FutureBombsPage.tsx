import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FaUserCircle, FaLock } from "react-icons/fa";
import { useEncryptedApiCalls } from "../hooks/useEncryptedApiCalls";
import { useSharedView } from "../hooks/useSharedView";
import { SharedViewBanner } from "../components/SharedViewBanner";
import { SkeletonLoader } from "../components/SkeletonLoader";
import { PageInfoButton } from "../components/PageInfoButton";
import { useAppModal } from "../hooks/useAppModal";
import { AppModalRenderer } from "../components/AppModalRenderer";
import "./FutureBombsPage.css";

interface FutureBombsPageProps {
  token: string;
}

export function FutureBombsPage({ token }: FutureBombsPageProps) {
  const navigate = useNavigate();
  const api = useEncryptedApiCalls();
  const { modal, showAlert, closeModal, confirmAndClose } = useAppModal();
  const [bombs, setBombs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const hasFetchedRef = useRef(false);
  const lastViewRef = useRef<string>("");

  // Shared view support
  const { selectedView, isSharedView, getViewParam, getOwnerName, isOwnItem } = useSharedView(token);

  useEffect(() => {
    if (hasFetchedRef.current && lastViewRef.current === selectedView) return;
    hasFetchedRef.current = true;
    lastViewRef.current = selectedView;
    loadBombs();
  }, [selectedView]);

  const loadBombs = async () => {
    try {
      // FIX: Use current date instead of hardcoded date, pass view param
      const res = await api.fetchDashboard(token, new Date().toISOString(), getViewParam());
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
        <h1>
          Future Bombs
          <PageInfoButton
            title="Future Bombs"
            description="Future Bombs are big-ticket expenses heading your way — think vacations, home renovations, weddings, or large purchases. This page helps you prepare for them before they hit."
            impact="Each bomb has a monthly savings target calculated automatically. The preparedness meter shows how ready you are. Being unprepared can blow a hole in your finances when the due date arrives."
            howItWorks={[
              "Each bomb tracks total amount, saved amount, and target date",
              "The preparedness ratio (saved ÷ total) is shown as a progress bar",
              "Critical (<40%), Warning (<70%), and OK zones help you prioritise",
              "Monthly equivalent tells you how much to save each month to be ready"
            ]}
          />
        </h1>
        {!isSharedView && (
          <button className="add-button" onClick={() => showAlert("Future Bomb creation coming soon! For now, they are automatically tracked from your planned expenses.")}>
            + Add Future Bomb
          </button>
        )}
      </div>

      <SharedViewBanner />

      {loading ? <SkeletonLoader type="card" count={3} /> : bombs.length === 0 ? (
        <div className="empty-state">No future bombs. Add upcoming liabilities to track them!</div>
      ) : (
        <div className="bombs-list">
          {bombs.map((bomb, index) => {
            const severity = getSeverity(bomb);
            const dueDate = new Date(bomb.dueDate);
            const daysUntil = Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
            const bombUserId = bomb.userId || bomb.user_id;
            const isOwn = !bombUserId || isOwnItem(bombUserId);
            return (
              <motion.div
                key={bomb.id}
                className={`bomb-card ${severity} ${!isOwn ? "shared-item" : ""}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="bomb-header">
                  <h3>{bomb.name}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {isSharedView && (
                      <span style={{ fontSize: 11, color: isOwn ? '#10b981' : '#8b5cf6', display: 'flex', alignItems: 'center', gap: 4 }}>
                        {isOwn ? <FaUserCircle size={12} /> : <FaLock size={12} />}
                        {getOwnerName(bombUserId)}
                      </span>
                    )}
                    <span className={`severity-badge ${severity}`}>
                      {severity === "critical" ? "🔴 Critical" : severity === "warn" ? "🟡 Warning" : "🟢 OK"}
                    </span>
                  </div>
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
      <AppModalRenderer modal={modal} closeModal={closeModal} confirmAndClose={confirmAndClose} />
    </div>
  );
}
