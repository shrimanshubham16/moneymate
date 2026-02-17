import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FaEdit, FaPause, FaPlay, FaTrashAlt, FaWallet, FaUserCircle, FaLock, FaUsers, FaExclamationTriangle } from "react-icons/fa";
import { useEncryptedApiCalls } from "../hooks/useEncryptedApiCalls";
import { useSharedView } from "../hooks/useSharedView";
import { SharedViewBanner } from "../components/SharedViewBanner";
import { SkeletonLoader } from "../components/SkeletonLoader";
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
    status: "active" as "active" | "paused"
  });

  // Wallet update modal state (replaces prompt())
  const [walletModal, setWalletModal] = useState<{ isOpen: boolean; investmentId: string; investmentName: string; currentFund: number }>({
    isOpen: false, investmentId: "", investmentName: "", currentFund: 0
  });
  const [walletAmount, setWalletAmount] = useState("");
  
  // Shared view support
  const { selectedView, isSharedView, getViewParam, getOwnerName, isOwnItem, formatSharedField } = useSharedView(token);
  const hasFetchedRef = useRef(false); // Prevent double fetch in React Strict Mode
  const lastViewRef = useRef<string>(""); // Track view changes

  useEffect(() => {
    // Prevent double fetch in React Strict Mode, but allow on view change
    if (hasFetchedRef.current && lastViewRef.current === selectedView) return;
    hasFetchedRef.current = true;
    lastViewRef.current = selectedView;
    loadInvestments();
  }, [selectedView]); // Re-fetch when view changes

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const investmentData = {
      name: formData.name,
      goal: formData.goal,
      monthlyAmount: Number(formData.monthlyAmount),
      status: formData.status
    };
    
    // OPTIMISTIC UPDATE: Add/update immediately in UI
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
    
    // Close form immediately
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: "", goal: "", monthlyAmount: "", status: "active" });
    
    try {
      let response;
      if (editingId) {
        response = await api.updateInvestment(token, editingId, investmentData);
      } else {
        response = await api.createInvestment(token, investmentData);
        // Replace temp item with real one
        if (response?.data) {
          setInvestments(prev => prev.map(inv => inv.id === tempId ? response.data : inv));
        }
      }
      // Background refresh
      invalidateDashboardCache();
      loadInvestments();
    } catch (e: any) {
      showAlert(e.message);
      // Rollback on error
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
      monthlyAmount: investment.monthlyAmount.toString(),
      status: investment.status
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    showConfirm("Delete this investment?", async () => {
      try {
        await api.deleteInvestment(token, id);
        setInvestments(prev => prev.filter(inv => inv.id !== id));
        await loadInvestments();
      } catch (e: any) {
        showAlert(e.message);
        await loadInvestments();
      }
    });
  };

  const handleTogglePause = async (inv: any) => {
    try {
      if (inv.status === "active") {
        await api.pauseInvestment(token, inv.id);
      } else {
        await api.resumeInvestment(token, inv.id);
      }
      await loadInvestments();
    } catch (e: any) {
      showAlert(e.message);
    }
  };

  return (
    <div className="investments-management-page">
      <div className="page-header">
        <button className="back-button" onClick={() => navigate("/settings/plan-finances")}>
          ← Back
        </button>
        <h1>Manage Investments</h1>
        {!isSharedView && (
          <button className="add-button" onClick={() => {
            setEditingId(null);
            setFormData({ name: "", goal: "", monthlyAmount: "", status: "active" });
            setShowForm(true);
          }}>
            + Add Investment
          </button>
        )}
      </div>

      {showForm && (
        <motion.div
          className="form-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setShowForm(false)}
        >
          <div className="form-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingId ? "Update" : "Add"} Investment</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Investment Name *</label>
                <input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="Mutual Fund SIP"
                />
              </div>
              <div className="form-group">
                <label>Goal *</label>
                <input
                  value={formData.goal}
                  onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                  required
                  placeholder="Retirement, Education, etc."
                />
              </div>
              <div className="form-group">
                <label>Monthly Amount *</label>
                <input
                  type="number"
                  value={formData.monthlyAmount}
                  onChange={(e) => setFormData({ ...formData, monthlyAmount: e.target.value })}
                  required
                  min="0"
                  placeholder="10000"
                />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as "active" | "paused" })}
                >
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                </select>
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary">
                  {editingId ? "Update" : "Add"} Investment
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      )}

      <SharedViewBanner />

      {loading ? (
        <SkeletonLoader type="card" count={3} />
      ) : (
        <div className="investments-list">
          {investments.length === 0 ? (
            <div className="empty-state">No investments. Add one to get started!</div>
          ) : (
            investments.map((inv, index) => {
              const itemUserId = inv.userId || inv.user_id;
              const isOwn = isOwnItem(itemUserId);
              const displayName = isOwn ? inv.name : formatSharedField(inv.name, isOwn);
              const displayGoal = isOwn ? inv.goal : formatSharedField(inv.goal, isOwn);
              
              return (
                <motion.div
                  key={inv.id}
                  className={`investment-card ${isSharedView && !isOwn ? 'shared-item' : ''}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <div className="investment-info">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <h3>{displayName}</h3>
                      {/* Owner badge for shared views */}
                      {isSharedView && (
                        <span className={`owner-badge ${isOwn ? 'own' : 'shared'}`}>
                          <FaUserCircle size={12} style={{ marginRight: 4 }} />
                          {getOwnerName(itemUserId)}
                        </span>
                      )}
                    </div>
                    <div className="investment-details">
                      <span>Goal: {displayGoal}</span>
                      {(() => {
                        const monthlyVal = parseFloat(inv.monthlyAmount ?? inv.monthly_amount ?? 0);
                        const formatted = isNaN(monthlyVal) ? "0" : monthlyVal.toLocaleString("en-IN");
                        return <span>₹{formatted}/month</span>;
                      })()}
                      {(inv.accumulatedFunds || inv.accumulated_funds || 0) > 0 && (
                        <span className="accumulated-funds">
                          Saved: ₹{Math.round(inv.accumulatedFunds || inv.accumulated_funds || 0).toLocaleString("en-IN")}
                        </span>
                      )}
                      <span className={`status ${inv.status}`}>
                        {inv.status === "active" ? "● Active" : "⏸ Paused"}
                      </span>
                      {inv.paid && <span className="paid-badge">✓ Paid This Month</span>}
                      {!inv.paid && <span className="unpaid-badge"><FaExclamationTriangle style={{ marginRight: 4, fontSize: 12 }} /> Not Paid</span>}
                    </div>
                  </div>
                  <div className="investment-actions">
                    {/* Only show edit actions for own items */}
                    {isOwn ? (
                      <>
                        <button 
                          className="icon-btn wallet-btn" 
                          onClick={() => {
                            const currentFund = inv.accumulatedFunds || inv.accumulated_funds || 0;
                            setWalletModal({ isOpen: true, investmentId: inv.id, investmentName: inv.name, currentFund });
                            setWalletAmount(Math.round(currentFund).toString());
                          }}
                          title="Update Available Fund"
                        >
                          <FaWallet />
                        </button>
                        <button 
                          className="icon-btn edit-btn" 
                          onClick={() => handleEdit(inv)}
                          title="Edit"
                        >
                          <FaEdit />
                        </button>
                        <button 
                          className="icon-btn pause-btn" 
                          onClick={() => handleTogglePause(inv)}
                          title={inv.status === "active" ? "Pause" : "Resume"}
                        >
                          {inv.status === "active" ? <FaPause /> : <FaPlay />}
                        </button>
                        <button 
                          className="icon-btn delete-btn" 
                          onClick={() => handleDelete(inv.id)}
                          title="Delete"
                        >
                          <FaTrashAlt />
                        </button>
                      </>
                    ) : (
                      <span className="read-only-badge" title="View only - belongs to shared member">
                        <FaLock size={12} /> View Only
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      )}
      {/* Wallet Update Modal (replaces prompt()) */}
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
                style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "var(--text-primary)", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const amount = parseFloat(walletAmount);
                  if (isNaN(amount)) {
                    showAlert("Please enter a valid amount.");
                    return;
                  }
                  try {
                    await api.updateInvestment(token, walletModal.investmentId, { accumulatedFunds: amount });
                    invalidateDashboardCache();
                    setWalletModal({ isOpen: false, investmentId: "", investmentName: "", currentFund: 0 });
                    setWalletAmount("");
                    await loadInvestments();
                  } catch (e: any) {
                    showAlert("Failed to update: " + e.message);
                  }
                }}
                style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "var(--accent-cyan, #22d3ee)", color: "#041019", fontWeight: 700, cursor: "pointer" }}
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
            style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)", color: "var(--text-primary)", fontSize: 16 }}
            autoFocus
          />
        </Modal>
      )}
      <AppModalRenderer modal={modal} closeModal={closeModal} confirmAndClose={confirmAndClose} />
    </div>
  );
}
