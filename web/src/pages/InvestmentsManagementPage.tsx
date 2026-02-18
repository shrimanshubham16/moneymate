import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FaEdit, FaPause, FaPlay, FaTrashAlt, FaWallet, FaUserCircle, FaLock, FaExclamationTriangle, FaShieldAlt, FaPlus } from "react-icons/fa";
import { MdTrendingUp } from "react-icons/md";
import { useEncryptedApiCalls } from "../hooks/useEncryptedApiCalls";
import { useSharedView } from "../hooks/useSharedView";
import { SharedViewBanner } from "../components/SharedViewBanner";
import { SkeletonLoader } from "../components/SkeletonLoader";
import { EmptyState } from "../components/EmptyState";
import { Modal } from "../components/Modal";
import { useAppModal } from "../hooks/useAppModal";
import { AppModalRenderer } from "../components/AppModalRenderer";
import { invalidateDashboardCache } from "../utils/cacheInvalidation";
import "./InvestmentsManagementPage.css";

interface InvestmentsManagementPageProps {
  token: string;
}

export function InvestmentsManagementPage({ token }: InvestmentsManagementPageProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { modal, showAlert, showConfirm, closeModal, confirmAndClose } = useAppModal();
  const api = useEncryptedApiCalls();
  const [investments, setInvestments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    goal: "",
    monthlyAmount: "",
    status: "active" as "active" | "paused",
    isPriority: false
  });

  // Wallet update modal state
  const [walletModal, setWalletModal] = useState<{ isOpen: boolean; investmentId: string; investmentName: string; currentFund: number }>({
    isOpen: false, investmentId: "", investmentName: "", currentFund: 0
  });
  const [walletAmount, setWalletAmount] = useState("");
  
  // Shared view support
  const { selectedView, isSharedView, getViewParam, getOwnerName, isOwnItem, formatSharedField } = useSharedView(token);
  const hasFetchedRef = useRef(false);
  const lastViewRef = useRef<string>("");

  useEffect(() => {
    if (hasFetchedRef.current && lastViewRef.current === selectedView) return;
    hasFetchedRef.current = true;
    lastViewRef.current = selectedView;
    loadInvestments();
  }, [selectedView]);

  // Auto-open edit form if ?edit=id is in URL
  useEffect(() => {
    const editId = searchParams.get("edit");
    if (editId && investments.length > 0) {
      const inv = investments.find(i => i.id === editId);
      if (inv) {
        handleEdit(inv);
      }
    }
  }, [searchParams, investments]);

  const loadInvestments = async () => {
    try {
      const res = await api.fetchDashboard(token, new Date().toISOString(), getViewParam());
      setInvestments(res.data.investments || []);
    } catch (e) {
      console.error("Failed to load investments:", e);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: "", goal: "", monthlyAmount: "", status: "active", isPriority: false });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const investmentData = {
      name: formData.name,
      goal: formData.goal,
      monthlyAmount: Number(formData.monthlyAmount),
      status: formData.status,
      isPriority: formData.isPriority
    };
    
    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    const optimisticInvestment = {
      id: editingId || tempId,
      ...investmentData,
      savedAmount: 0,
      accumulatedFunds: 0,
      paid: false
    };
    
    if (editingId) {
      setInvestments(prev => prev.map(inv => inv.id === editingId ? { ...inv, ...optimisticInvestment } : inv));
    } else {
      setInvestments(prev => [optimisticInvestment, ...prev]);
    }
    
    resetForm();
    
    try {
      let response;
      if (editingId) {
        response = await api.updateInvestment(token, editingId, investmentData);
      } else {
        response = await api.createInvestment(token, investmentData);
        if (response?.data) {
          setInvestments(prev => prev.map(inv => inv.id === tempId ? response.data : inv));
        }
      }
      invalidateDashboardCache();
      loadInvestments();
    } catch (e: any) {
      showAlert(e.message);
      if (editingId) {
        loadInvestments();
      } else {
        setInvestments(prev => prev.filter(inv => inv.id !== tempId));
      }
    }
  };

  const handleEdit = (investment: any) => {
    setEditingId(investment.id);
    setFormData({
      name: investment.name,
      goal: investment.goal,
      monthlyAmount: (investment.monthlyAmount ?? investment.monthly_amount ?? 0).toString(),
      status: investment.status,
      isPriority: investment.isPriority || false
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    showConfirm("Delete this investment? This action cannot be undone.", async () => {
      try {
        setInvestments(prev => prev.filter(inv => inv.id !== id));
        await api.deleteInvestment(token, id);
        invalidateDashboardCache();
        loadInvestments();
      } catch (e: any) {
        showAlert(e.message);
        loadInvestments();
      }
    });
  };

  const handleTogglePause = async (inv: any) => {
    if (inv.isPriority && inv.status === "active") {
      showAlert("This investment is marked as Critical and cannot be paused. Edit it to remove the Critical tag first.");
      return;
    }
    try {
      const newStatus = inv.status === "active" ? "paused" : "active";
      setInvestments(prev => prev.map(i => i.id === inv.id ? { ...i, status: newStatus } : i));
      if (inv.status === "active") {
        await api.pauseInvestment(token, inv.id);
      } else {
        await api.resumeInvestment(token, inv.id);
      }
      invalidateDashboardCache();
      loadInvestments();
    } catch (e: any) {
      showAlert(e.message);
    }
  };

  return (
    <div className="inv-mgmt-page">
      <div className="page-header">
        <button className="back-button" onClick={() => navigate("/settings/plan-finances")}>← Back</button>
        <h1>Manage Investments</h1>
        {!isSharedView && (
          <button className="add-button" onClick={() => {
            resetForm();
            setShowForm(true);
          }}>
            <FaPlus size={12} /> Add Investment
          </button>
        )}
      </div>

      {/* ── Investment Form Modal ─────────────── */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            className="inv-form-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={resetForm}
          >
            <motion.div 
              className="inv-form-card"
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="inv-form-header">
                <h2>{editingId ? "Update" : "Add"} Investment</h2>
                <button className="inv-form-close" onClick={resetForm}>✕</button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="inv-form-grid">
                  <div className="inv-field">
                    <label>Investment Name</label>
                    <input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      placeholder="e.g. SIP Mutual Fund, PPF, NPS"
                    />
                  </div>

                  <div className="inv-field">
                    <label>Goal</label>
                    <input
                      value={formData.goal}
                      onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                      required
                      placeholder="e.g. Retirement, Education, House"
                    />
                  </div>

                  <div className="inv-field-row">
                    <div className="inv-field">
                      <label>Monthly Amount (₹)</label>
                      <input
                        type="number"
                        value={formData.monthlyAmount}
                        onChange={(e) => setFormData({ ...formData, monthlyAmount: e.target.value })}
                        required
                        min="1"
                        placeholder="10000"
                      />
                    </div>
                    <div className="inv-field">
                      <label>Status</label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as "active" | "paused" })}
                      >
                        <option value="active">Active</option>
                        <option value="paused">Paused</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* ── Critical Investment Toggle ─────── */}
                <div 
                  className={`inv-critical-toggle ${formData.isPriority ? "active" : ""}`}
                  onClick={() => setFormData({ ...formData, isPriority: !formData.isPriority })}
                >
                  <div className="inv-critical-left">
                    <div className={`inv-critical-icon ${formData.isPriority ? "active" : ""}`}>
                      <FaShieldAlt size={16} />
                    </div>
                    <div className="inv-critical-text">
                      <span className="inv-critical-label">Critical Investment</span>
                      <span className="inv-critical-desc">
                        {formData.isPriority 
                          ? "This investment is protected — it will never be suggested for pausing."
                          : "Enable to protect this investment from being suggested for pausing in Future Bombs."
                        }
                      </span>
                    </div>
                  </div>
                  <div className={`inv-critical-switch ${formData.isPriority ? "on" : ""}`}>
                    <div className="inv-critical-knob" />
                  </div>
                </div>

                <div className="inv-form-actions">
                  <button type="button" className="inv-btn-cancel" onClick={resetForm}>
                    Cancel
                  </button>
                  <button type="submit" className="inv-btn-submit">
                    {editingId ? "Update" : "Add"} Investment
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <SharedViewBanner />

      {loading ? (
        <SkeletonLoader type="card" count={3} />
      ) : investments.length === 0 ? (
        <EmptyState
          icon={<MdTrendingUp size={80} />}
          title="No Investments Yet"
          description="Start tracking your SIPs, mutual funds, stocks, or savings plans"
          actionLabel={isSharedView ? undefined : "Add First Investment"}
          onAction={isSharedView ? undefined : () => { resetForm(); setShowForm(true); }}
        />
      ) : (
        <div className="inv-list">
          {investments.map((inv, index) => {
            const itemUserId = inv.userId || inv.user_id;
            const isOwn = !itemUserId || isOwnItem(itemUserId);
            const displayName = isOwn ? inv.name : formatSharedField(inv.name, isOwn);
            const displayGoal = isOwn ? inv.goal : formatSharedField(inv.goal, isOwn);
            const monthlyVal = parseFloat(inv.monthlyAmount ?? inv.monthly_amount ?? 0);
            const accumVal = Math.round(inv.accumulatedFunds || inv.accumulated_funds || 0);
            
            return (
              <motion.div
                key={inv.id}
                className={`inv-card ${isSharedView && !isOwn ? "shared" : ""} ${inv.isPriority ? "critical" : ""}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
              >
                <div className="inv-card-body">
                  <div className="inv-card-top">
                    <div className="inv-card-name-row">
                      <h3>{displayName}</h3>
                      {inv.isPriority && (
                        <span className="inv-critical-badge">
                          <FaShieldAlt size={9} /> Critical
                        </span>
                      )}
                      {isSharedView && (
                        <span className={`inv-owner-badge ${isOwn ? "own" : "shared"}`}>
                          <FaUserCircle size={11} />
                          {getOwnerName(itemUserId)}
                        </span>
                      )}
                    </div>
                    <span className="inv-card-goal">Goal: {displayGoal}</span>
                  </div>

                  <div className="inv-card-stats">
                    <div className="inv-stat">
                      <span className="inv-stat-label">Monthly</span>
                      <span className="inv-stat-value">₹{isNaN(monthlyVal) ? "0" : monthlyVal.toLocaleString("en-IN")}</span>
                    </div>
                    {accumVal > 0 && (
                      <div className="inv-stat">
                        <span className="inv-stat-label">Saved</span>
                        <span className="inv-stat-value green">₹{accumVal.toLocaleString("en-IN")}</span>
                      </div>
                    )}
                    <div className="inv-stat">
                      <span className="inv-stat-label">Status</span>
                      <span className={`inv-status-pill ${inv.status}`}>
                        {inv.status === "active" ? "Active" : "Paused"}
                      </span>
                    </div>
                    <div className="inv-stat">
                      <span className="inv-stat-label">This Month</span>
                      {inv.paid 
                        ? <span className="inv-paid-pill">✓ Paid</span>
                        : <span className="inv-unpaid-pill"><FaExclamationTriangle size={10} /> Unpaid</span>
                      }
                    </div>
                  </div>
                </div>

                <div className="inv-card-actions">
                  {isOwn ? (
                    <>
                      <button className="inv-action-btn wallet" onClick={() => {
                        const cf = inv.accumulatedFunds || inv.accumulated_funds || 0;
                        setWalletModal({ isOpen: true, investmentId: inv.id, investmentName: inv.name, currentFund: cf });
                        setWalletAmount(Math.round(cf).toString());
                      }} title="Update Fund">
                        <FaWallet />
                      </button>
                      <button className="inv-action-btn edit" onClick={() => handleEdit(inv)} title="Edit">
                        <FaEdit />
                      </button>
                      <button 
                        className={`inv-action-btn pause ${inv.isPriority && inv.status === "active" ? "locked" : ""}`}
                        onClick={() => handleTogglePause(inv)}
                        title={inv.isPriority && inv.status === "active" ? "Critical — cannot pause" : inv.status === "active" ? "Pause" : "Resume"}
                      >
                        {inv.status === "active" ? <FaPause /> : <FaPlay />}
                      </button>
                      <button className="inv-action-btn delete" onClick={() => handleDelete(inv.id)} title="Delete">
                        <FaTrashAlt />
                      </button>
                    </>
                  ) : (
                    <span className="inv-readonly"><FaLock size={11} /> View Only</span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Wallet Update Modal */}
      {walletModal.isOpen && (
        <Modal
          isOpen={walletModal.isOpen}
          onClose={() => { setWalletModal({ isOpen: false, investmentId: "", investmentName: "", currentFund: 0 }); setWalletAmount(""); }}
          title={`Update Fund — ${walletModal.investmentName}`}
          size="sm"
          footer={
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => { setWalletModal({ isOpen: false, investmentId: "", investmentName: "", currentFund: 0 }); setWalletAmount(""); }}
                className="inv-btn-cancel"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const amount = parseFloat(walletAmount);
                  if (isNaN(amount)) { showAlert("Please enter a valid amount."); return; }
                  try {
                    await api.updateInvestment(token, walletModal.investmentId, { accumulatedFunds: amount });
                    invalidateDashboardCache();
                    setInvestments(prev => prev.map(i => i.id === walletModal.investmentId ? { ...i, accumulatedFunds: amount } : i));
                    setWalletModal({ isOpen: false, investmentId: "", investmentName: "", currentFund: 0 });
                    setWalletAmount("");
                    loadInvestments();
                  } catch (e: any) { showAlert("Failed to update: " + e.message); }
                }}
                className="inv-btn-submit"
              >
                Update
              </button>
            </div>
          }
        >
          <p style={{ margin: "0 0 12px", color: "var(--text-secondary)" }}>
            Current: ₹{Math.round(walletModal.currentFund).toLocaleString("en-IN")}
          </p>
          <input
            type="number"
            value={walletAmount}
            onChange={(e) => setWalletAmount(e.target.value)}
            placeholder="Enter new amount"
            className="inv-wallet-input"
            autoFocus
          />
        </Modal>
      )}

      <AppModalRenderer modal={modal} closeModal={closeModal} confirmAndClose={confirmAndClose} />
    </div>
  );
}
