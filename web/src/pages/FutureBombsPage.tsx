import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FaUserCircle, FaLock, FaBomb, FaEdit, FaTrashAlt, FaPause, FaShieldAlt, FaLightbulb, FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";
import { useEncryptedApiCalls } from "../hooks/useEncryptedApiCalls";
import { useSharedView } from "../hooks/useSharedView";
import { SharedViewBanner } from "../components/SharedViewBanner";
import { SkeletonLoader } from "../components/SkeletonLoader";
import { EmptyState } from "../components/EmptyState";
import { PageInfoButton } from "../components/PageInfoButton";
import { Modal } from "../components/Modal";
import { invalidateDashboardCache } from "../utils/cacheInvalidation";
import { useAppModal } from "../hooks/useAppModal";
import { AppModalRenderer } from "../components/AppModalRenderer";
import "./FutureBombsPage.css";

interface FutureBombsPageProps {
  token: string;
}

interface DefusalSuggestion {
  investmentId: string;
  name: string;
  monthlyAmount: number;
}

export function FutureBombsPage({ token }: FutureBombsPageProps) {
  const navigate = useNavigate();
  const api = useEncryptedApiCalls();
  const { modal, showAlert, showConfirm, closeModal, confirmAndClose } = useAppModal();
  const [bombs, setBombs] = useState<any[]>([]);
  const [investments, setInvestments] = useState<any[]>([]);
  const [availableFunds, setAvailableFunds] = useState(0);
  const [loading, setLoading] = useState(true);
  const hasFetchedRef = useRef(false);
  const lastViewRef = useRef<string>("");

  // Form modal state
  const [formModal, setFormModal] = useState<{ isOpen: boolean; editId?: string }>({ isOpen: false });
  const [formData, setFormData] = useState({ name: "", totalAmount: "", savedAmount: "0", dueDate: "" });

  // Shared view support
  const { selectedView, isSharedView, getViewParam, getOwnerName, isOwnItem } = useSharedView(token);

  useEffect(() => {
    if (hasFetchedRef.current && lastViewRef.current === selectedView) return;
    hasFetchedRef.current = true;
    lastViewRef.current = selectedView;
    loadData();
  }, [selectedView]);

  const loadData = async () => {
    try {
      const res = await api.fetchDashboard(token, new Date().toISOString(), getViewParam());
      const data = res.data;
      setBombs(data.futureBombs || []);
      setInvestments(data.investments || []);
      
      // Calculate available funds = income - fixed - investments - variable
      const health = data.health || {};
      setAvailableFunds(health.remaining || 0);
    } catch (e) {
      console.error("Failed to load data:", e);
    } finally {
      setLoading(false);
    }
  };

  // Compute smart defusal data for a bomb
  const getDefusalData = (bomb: any) => {
    const sipAmount = bomb.monthlyEquivalent || 0;
    const canAfford = sipAmount <= Math.max(0, availableFunds);
    const shortfall = Math.max(0, sipAmount - Math.max(0, availableFunds));
    
    // Find non-priority active investments sorted by amount descending
    const pausable = investments
      .filter((inv: any) => inv.status === 'active' && !inv.isPriority)
      .sort((a: any, b: any) => (b.monthlyAmount || 0) - (a.monthlyAmount || 0));
    
    // Greedily suggest investments to pause to cover shortfall
    const suggestions: DefusalSuggestion[] = [];
    let coveredAmount = 0;
    if (!canAfford && shortfall > 0) {
      for (const inv of pausable) {
        if (coveredAmount >= shortfall) break;
        suggestions.push({ investmentId: inv.id, name: inv.name, monthlyAmount: inv.monthlyAmount || 0 });
        coveredAmount += inv.monthlyAmount || 0;
      }
    }
    
    const canCoverWithPause = canAfford || coveredAmount >= shortfall;
    
    return { sipAmount, canAfford, shortfall, suggestions, canCoverWithPause, coveredAmount };
  };

  const getSeverity = (bomb: any) => {
    const { canAfford, canCoverWithPause } = getDefusalData(bomb);
    if (canAfford) return "ok";
    if (canCoverWithPause) return "warn";
    return "critical";
  };

  // Form handlers
  const openCreateForm = () => {
    setFormData({ name: "", totalAmount: "", savedAmount: "0", dueDate: "" });
    setFormModal({ isOpen: true });
  };

  const openEditForm = (bomb: any) => {
    setFormData({
      name: bomb.name || "",
      totalAmount: String(bomb.totalAmount || ""),
      savedAmount: String(bomb.savedAmount || "0"),
      dueDate: bomb.dueDate ? new Date(bomb.dueDate).toISOString().split("T")[0] : ""
    });
    setFormModal({ isOpen: true, editId: bomb.id });
  };

  const handleFormSubmit = async () => {
    if (!formData.name || !formData.totalAmount || !formData.dueDate) {
      showAlert("Please fill in all required fields (Name, Total Amount, Due Date).");
      return;
    }
    try {
      const payload = {
        name: formData.name,
        total_amount: parseFloat(formData.totalAmount),
        saved_amount: parseFloat(formData.savedAmount) || 0,
        due_date: formData.dueDate
      };
      if (formModal.editId) {
        await api.updateFutureBomb(token, formModal.editId, payload);
      } else {
        await api.createFutureBomb(token, payload);
      }
      invalidateDashboardCache();
      setFormModal({ isOpen: false });
      await loadData();
    } catch (e: any) {
      showAlert("Failed to save: " + e.message);
    }
  };

  const handleDelete = (bomb: any) => {
    showConfirm(`Delete "${bomb.name}"? This cannot be undone.`, async () => {
      try {
        await api.deleteFutureBomb(token, bomb.id);
        invalidateDashboardCache();
        await loadData();
      } catch (e: any) {
        showAlert("Failed to delete: " + e.message);
      }
    });
  };

  const handlePauseSuggested = async (suggestions: DefusalSuggestion[]) => {
    showConfirm(
      `Pause ${suggestions.length} investment(s) to free up ₹${suggestions.reduce((s, i) => s + i.monthlyAmount, 0).toLocaleString("en-IN")}/month? You can resume them anytime from the Investments page.`,
      async () => {
        try {
          for (const s of suggestions) {
            await api.pauseInvestment(token, s.investmentId);
          }
          invalidateDashboardCache();
          await loadData();
        } catch (e: any) {
          showAlert("Failed to pause investments: " + e.message);
        }
      }
    );
  };

  const handleUpdateSaved = async (bomb: any) => {
    const newSaved = prompt(`Update saved amount for "${bomb.name}"`, String(Math.round(bomb.savedAmount)));
    if (newSaved === null) return;
    const val = parseFloat(newSaved);
    if (isNaN(val)) { showAlert("Invalid amount"); return; }
    try {
      await api.updateFutureBomb(token, bomb.id, { saved_amount: val });
      invalidateDashboardCache();
      await loadData();
    } catch (e: any) {
      showAlert("Failed to update: " + e.message);
    }
  };

  return (
    <div className="future-bombs-page">
      <div className="page-header">
        <button className="back-button" onClick={() => navigate("/dashboard")}>← Back</button>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <h1>Future Bombs</h1>
          <PageInfoButton
            title="Future Bombs — Smart Defusal"
            description="Future Bombs are big-ticket expenses heading your way — vacations, home renovations, weddings, or large purchases. The Smart Defusal system calculates exactly how much you need to save monthly and suggests which non-priority investments to pause if needed."
            impact="Each bomb has a Defusal SIP — the monthly amount to save up 1 month before the due date. If you can't afford it from available funds, the app suggests pausing non-priority investments. Priority investments (marked with a star on the Investments page) are never suggested."
            howItWorks={[
              "Add a bomb with name, total amount, saved so far, and due date",
              "The app calculates monthly SIP needed to defuse it 1 month early",
              "Green = affordable from available funds, Yellow = needs pausing investments, Red = can't cover even after pausing all non-priority investments",
              "Click 'Pause Suggested' to instantly pause the recommended investments",
              "Update saved amount as you accumulate funds towards each bomb"
            ]}
          />
        </div>
        {!isSharedView && (
          <button className="add-button" onClick={openCreateForm}>
            + Add Future Bomb
          </button>
        )}
      </div>

      <SharedViewBanner />

      {loading ? <SkeletonLoader type="card" count={3} /> : bombs.length === 0 ? (
        <EmptyState
          icon={<FaBomb size={80} />}
          title="No Future Bombs"
          description="Track upcoming big expenses and let the Smart Defusal system help you prepare. Add your first bomb to get started."
          actionLabel={isSharedView ? undefined : "Add Future Bomb"}
          onAction={isSharedView ? undefined : openCreateForm}
        />
      ) : (
        <div className="bombs-list">
          {bombs.map((bomb, index) => {
            const severity = getSeverity(bomb);
            const defusal = getDefusalData(bomb);
            const dueDate = bomb.dueDate ? new Date(bomb.dueDate) : null;
            const daysUntil = dueDate ? Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;
            const bombUserId = bomb.userId || bomb.user_id;
            const isOwn = !bombUserId || isOwnItem(bombUserId);
            const prepPct = Math.round((bomb.preparednessRatio || 0) * 100);

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
                  <div className="bomb-header-right">
                    {isSharedView && (
                      <span style={{ fontSize: 11, color: isOwn ? '#10b981' : '#8b5cf6', display: 'flex', alignItems: 'center', gap: 4 }}>
                        {isOwn ? <FaUserCircle size={12} /> : <FaLock size={12} />}
                        {getOwnerName(bombUserId)}
                      </span>
                    )}
                    <span className={`severity-badge ${severity}`}>
                      {severity === "critical" ? "Critical" : severity === "warn" ? "Needs Action" : "On Track"}
                    </span>
                  </div>
                </div>

                <div className="bomb-details">
                  <div className="detail-item">
                    <span className="label">Due Date</span>
                    <span className="value">{dueDate ? dueDate.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" }) : "—"} ({daysUntil > 0 ? `${daysUntil}d left` : "Overdue"})</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Total Amount</span>
                    <span className="value">₹{Math.round(bomb.totalAmount || 0).toLocaleString("en-IN")}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Saved So Far</span>
                    <span className="value" style={{ cursor: isOwn ? 'pointer' : 'default', color: '#10b981' }} onClick={() => isOwn && handleUpdateSaved(bomb)}>
                      ₹{Math.round(bomb.savedAmount || 0).toLocaleString("en-IN")} {isOwn && <FaEdit size={10} style={{ opacity: 0.5 }} />}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Months to Defuse</span>
                    <span className="value">{bomb.defusalMonths || "—"} mo</span>
                  </div>
                </div>

                {/* Preparedness Meter */}
                <div className="preparedness-meter">
                  <div className="meter-label">Preparedness</div>
                  <div className="meter-bar">
                    <motion.div
                      className="meter-fill"
                      style={{
                        backgroundColor: severity === "critical" ? "#ef4444" : severity === "warn" ? "#f59e0b" : "#10b981"
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${prepPct}%` }}
                      transition={{ duration: 1, delay: index * 0.1 }}
                    />
                  </div>
                  <div className="meter-value" style={{ color: severity === "critical" ? "#f87171" : severity === "warn" ? "#fbbf24" : "#34d399" }}>
                    {prepPct}%
                  </div>
                </div>

                {/* Smart Defusal Panel */}
                <div className="defusal-panel">
                  <h4><FaLightbulb size={14} color="#f59e0b" /> Smart Defusal</h4>
                  <div className={`defusal-sip-amount ${defusal.canAfford ? 'affordable' : defusal.canCoverWithPause ? 'needs-pause' : 'unaffordable'}`}>
                    ₹{Math.round(defusal.sipAmount).toLocaleString("en-IN")}/month
                  </div>
                  
                  {defusal.canAfford ? (
                    <div className="defusal-status" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <FaCheckCircle color="#10b981" />
                      You can afford this SIP from your available funds. Stay on track!
                    </div>
                  ) : defusal.canCoverWithPause ? (
                    <>
                      <div className="defusal-status" style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                        <FaExclamationTriangle color="#f59e0b" style={{ marginTop: 2, flexShrink: 0 }} />
                        <span>Shortfall of ₹{Math.round(defusal.shortfall).toLocaleString("en-IN")}/mo. Consider pausing these non-priority investments:</span>
                      </div>
                      <div className="defusal-suggestions">
                        {defusal.suggestions.map(s => (
                          <div key={s.investmentId} className="defusal-suggestion-item">
                            <span className="inv-name"><FaPause size={10} /> {s.name}</span>
                            <span className="inv-amount">₹{Math.round(s.monthlyAmount).toLocaleString("en-IN")}/mo</span>
                          </div>
                        ))}
                      </div>
                      {isOwn && (
                        <button className="defusal-pause-btn" onClick={() => handlePauseSuggested(defusal.suggestions)}>
                          Pause Suggested ({defusal.suggestions.length}) — Free ₹{Math.round(defusal.coveredAmount).toLocaleString("en-IN")}/mo
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="defusal-status" style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                      <FaExclamationTriangle color="#ef4444" style={{ marginTop: 2, flexShrink: 0 }} />
                      <span>
                        Even pausing all non-priority investments won't cover this SIP. Consider extending the due date, increasing income, or reducing the target amount.
                        {defusal.suggestions.length > 0 && ` Pausing ${defusal.suggestions.length} investments would free ₹${Math.round(defusal.coveredAmount).toLocaleString("en-IN")}/mo but you still need ₹${Math.round(defusal.shortfall - defusal.coveredAmount).toLocaleString("en-IN")}/mo more.`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                {isOwn && (
                  <div className="bomb-actions">
                    <button onClick={() => openEditForm(bomb)}>
                      <FaEdit size={12} /> Edit
                    </button>
                    <button className="delete-action" onClick={() => handleDelete(bomb)}>
                      <FaTrashAlt size={12} /> Delete
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      {formModal.isOpen && (
        <Modal
          isOpen={formModal.isOpen}
          onClose={() => setFormModal({ isOpen: false })}
          title={formModal.editId ? "Edit Future Bomb" : "Add Future Bomb"}
          size="sm"
          footer={
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => setFormModal({ isOpen: false })}
                style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "var(--text-primary)", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={handleFormSubmit}
                style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "var(--accent-cyan, #22d3ee)", color: "#041019", fontWeight: 700, cursor: "pointer" }}
              >
                {formModal.editId ? "Update" : "Create"}
              </button>
            </div>
          }
        >
          <div className="bomb-form">
            <div className="form-group">
              <label>Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Vacation, Wedding, Car Down Payment"
                autoFocus
              />
            </div>
            <div className="form-group">
              <label>Total Amount *</label>
              <input
                type="number"
                value={formData.totalAmount}
                onChange={e => setFormData({ ...formData, totalAmount: e.target.value })}
                placeholder="e.g. 500000"
              />
            </div>
            <div className="form-group">
              <label>Saved So Far</label>
              <input
                type="number"
                value={formData.savedAmount}
                onChange={e => setFormData({ ...formData, savedAmount: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="form-group">
              <label>Due Date *</label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
          </div>
        </Modal>
      )}

      <AppModalRenderer modal={modal} closeModal={closeModal} confirmAndClose={confirmAndClose} />
    </div>
  );
}
