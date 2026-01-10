import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FaEdit, FaPause, FaPlay, FaTrashAlt, FaWallet, FaUserCircle, FaLock, FaUsers } from "react-icons/fa";
import { useEncryptedApiCalls } from "../hooks/useEncryptedApiCalls";
import { useSharedView } from "../hooks/useSharedView";
import { SkeletonLoader } from "../components/SkeletonLoader";
import "./InvestmentsManagementPage.css";

interface InvestmentsManagementPageProps {
  token: string;
}

export function InvestmentsManagementPage({ token }: InvestmentsManagementPageProps) {
  const navigate = useNavigate();
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
      loadInvestments();
    } catch (e: any) {
      alert(e.message);
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
    if (!confirm("Delete this investment?")) return;
    try {
      await api.deleteInvestment(token, id);
      // Optimistic UI: Remove from state immediately
      setInvestments(prev => prev.filter(inv => inv.id !== id));
      await loadInvestments();
    } catch (e: any) {
      alert(e.message);
      await loadInvestments();
    }
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
      alert(e.message);
    }
  };

  return (
    <div className="investments-management-page">
      <div className="page-header">
        <button className="back-button" onClick={() => navigate("/settings/plan-finances")}>
          ← Back
        </button>
        <h1>Manage Investments</h1>
        <button className="add-button" onClick={() => {
          setEditingId(null);
          setFormData({ name: "", goal: "", monthlyAmount: "", status: "active" });
          setShowForm(true);
        }}>
          + Add Investment
        </button>
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

      {/* Combined View Banner */}
      {isSharedView && (
        <div className="combined-view-banner">
          <FaUsers style={{ marginRight: 8 }} />
          <span>Combined View: Showing merged finances from shared members</span>
        </div>
      )}

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
                      {!inv.paid && <span className="unpaid-badge">⚠ Not Paid</span>}
                    </div>
                  </div>
                  <div className="investment-actions">
                    {/* Only show edit actions for own items */}
                    {isOwn ? (
                      <>
                        <button 
                          className="icon-btn wallet-btn" 
                          onClick={async () => {
                            const newAmount = prompt(`Update available fund for ${inv.name}:\nCurrent: ₹${Math.round(inv.accumulatedFunds || inv.accumulated_funds || 0).toLocaleString("en-IN")}\n\nEnter new amount:`);
                            if (newAmount !== null && !isNaN(parseFloat(newAmount))) {
                              try {
                                await api.updateInvestment(token, inv.id, { accumulatedFunds: parseFloat(newAmount) });
                                await loadInvestments();
                              } catch (e: any) {
                                alert("Failed to update: " + e.message);
                              }
                            }
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
    </div>
  );
}

