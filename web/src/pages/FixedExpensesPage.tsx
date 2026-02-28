import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FaMoneyBillWave, FaEdit, FaTrashAlt, FaSync, FaUserCircle, FaWallet } from "react-icons/fa";
import { useEncryptedApiCalls } from "../hooks/useEncryptedApiCalls";
import { useSharedView } from "../hooks/useSharedView";
import { SharedViewBanner } from "../components/SharedViewBanner";
import { SkeletonLoader } from "../components/SkeletonLoader";
import { EmptyState } from "../components/EmptyState";
import { StatusBadge } from "../components/StatusBadge";
import { PageInfoButton } from "../components/PageInfoButton";
import { Modal } from "../components/Modal";
import { ClientCache } from "../utils/cache";
import { invalidateDashboardCache } from "../utils/cacheInvalidation";
import { useAppModal } from "../hooks/useAppModal";
import { AppModalRenderer } from "../components/AppModalRenderer";
import "./FixedExpensesPage.css";

interface FixedExpensesPageProps {
  token: string;
}

export function FixedExpensesPage({ token }: FixedExpensesPageProps) {
  const navigate = useNavigate();
  const api = useEncryptedApiCalls();
  const { modal, showAlert, showConfirm, closeModal, confirmAndClose } = useAppModal();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    amount: "",
    frequency: "monthly",
    category: "General",
    start_date: "",
    end_date: "",
    is_sip_flag: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sharedAggregates, setSharedAggregates] = useState<any[]>([]);
  const hasFetchedRef = useRef(false);
  const lastViewRef = useRef<string>("");

  // Wallet update modal for SIP expenses
  const [walletModal, setWalletModal] = useState<{ isOpen: boolean; expenseId: string; expenseName: string; currentFund: number }>({
    isOpen: false, expenseId: "", expenseName: "", currentFund: 0
  });
  const [walletAmount, setWalletAmount] = useState("");
  
  // Shared view support
  const { selectedView, isSharedView, getViewParam, getOwnerName, isOwnItem, formatSharedField } = useSharedView(token);

  useEffect(() => {
    // Prevent double fetch in React Strict Mode, but allow on view change
    if (hasFetchedRef.current && lastViewRef.current === selectedView) return;
    hasFetchedRef.current = true;
    lastViewRef.current = selectedView;
    loadExpenses();
  }, [selectedView]); // Re-fetch when view changes

  const loadExpenses = async () => {
    try {
      // Extract userId from token for cache
      let userId = 'unknown';
      try {
        const tokenPayload = JSON.parse(atob(token.split('.')[1]));
        userId = tokenPayload.userId;
      } catch (e) {
        console.error('[CACHE_ERROR] Failed to extract userId from token:', e);
      }

      // Skip cache for shared views
      if (!isSharedView) {
        const cached = ClientCache.get<any>('dashboard', userId);
        if (cached?.fixedExpenses) {
          setExpenses(cached.fixedExpenses);
          setLoading(false);
        }
      }
      
      // Fetch fresh data with view parameter
      const res = await api.fetchDashboard(token, new Date().toISOString(), getViewParam());
      setExpenses(res.data.fixedExpenses || []);
      setSharedAggregates(res.data.sharedUserAggregates || []);
      ClientCache.set('dashboard', res.data, userId);
    } catch (e) {
      console.error("Failed to load expenses:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return; // Prevent multiple submissions
    setIsSubmitting(true);
    
    const expenseData: any = {
      name: formData.name,
      amount: Number(formData.amount),
      frequency: formData.frequency,
      category: formData.category,
      is_sip_flag: formData.is_sip_flag
    };
    // Only send dates if the user actually set them; empty string → null on backend
    if (formData.start_date) expenseData.start_date = formData.start_date;
    else expenseData.start_date = "";
    if (formData.end_date) expenseData.end_date = formData.end_date;
    else expenseData.end_date = "";
    
    // OPTIMISTIC UPDATE: Add/update immediately in UI
    const tempId = `temp-${Date.now()}`;
    const optimisticExpense = {
      id: editingId || tempId,
      ...expenseData,
      startDate: formData.start_date || null,
      endDate: formData.end_date || null,
      paid: false
    };
    
    if (editingId) {
      setExpenses(prev => prev.map(exp => exp.id === editingId ? { ...exp, ...optimisticExpense } : exp));
    } else {
      setExpenses(prev => [optimisticExpense, ...prev]);
    }
    
    // Close form immediately
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: "", amount: "", frequency: "monthly", category: "General", start_date: "", end_date: "", is_sip_flag: false });
    setIsSubmitting(false);
    
    try {
      let response;
      if (editingId) {
        response = await api.updateFixedExpense(token, editingId, expenseData);
      } else {
        response = await api.createFixedExpense(token, expenseData);
        // Replace temp item with real one
        if (response?.data) {
          setExpenses(prev => prev.map(exp => exp.id === tempId ? { ...response.data, startDate: response.data.start_date, endDate: response.data.end_date } : exp));
        }
      }
      // Invalidate dashboard cache and background refresh
      invalidateDashboardCache();
      loadExpenses();
    } catch (e: any) {
      showAlert(e.message);
      // Rollback on error
      if (editingId) {
        loadExpenses(); // Reload original data
      } else {
        setExpenses(prev => prev.filter(exp => exp.id !== tempId));
      }
    }
  };

  const handleEdit = (expense: any) => {
    setEditingId(expense.id);
    setFormData({
      name: expense.name,
      amount: expense.amount.toString(),
      frequency: expense.frequency,
      category: expense.category,
      start_date: expense.startDate || expense.start_date || "",
      end_date: expense.endDate || expense.end_date || "",
      is_sip_flag: expense.is_sip_flag || false
    });
    setShowForm(true);
  };

  const handleWalletUpdate = async () => {
    const amount = parseFloat(walletAmount);
    if (isNaN(amount) || amount < 0) {
      showAlert("Please enter a valid amount.");
      return;
    }
    try {
      setExpenses(prev => prev.map(e => e.id === walletModal.expenseId ? { ...e, accumulatedFunds: amount, accumulated_funds: amount } : e));
      setWalletModal({ isOpen: false, expenseId: "", expenseName: "", currentFund: 0 });
      setWalletAmount("");
      await api.updateFixedExpense(token, walletModal.expenseId, { accumulated_funds: amount });
      invalidateDashboardCache();
      loadExpenses().catch(console.error);
    } catch (e: any) {
      loadExpenses().catch(console.error);
      showAlert("Failed to update: " + e.message);
    }
  };

  const handleDelete = async (id: string) => {
    showConfirm("Delete this expense?", async () => {
      const prevExpenses = expenses;
      setExpenses(prev => prev.filter(e => e.id !== id)); // optimistic removal
      try {
        await api.deleteFixedExpense(token, id);
        invalidateDashboardCache();
        loadExpenses(); // background refresh
      } catch (e: any) {
        showAlert(e.message);
        setExpenses(prevExpenses); // rollback
      }
    });
  };

  const categories = [
    "General", "Housing", "Food", "Transport", "Utilities", "Insurance", "Loan",
    "Education", "Healthcare", "Entertainment", "Shopping", "Personal Care", "Subscriptions"
  ];

  // Separate own vs shared items
  const ownExpenses = isSharedView
    ? expenses.filter(e => isOwnItem(e.userId || e.user_id))
    : expenses;
  const sharedExpenses = isSharedView
    ? expenses.filter(e => !isOwnItem(e.userId || e.user_id))
    : [];

  // Group shared expenses by user for aggregate banner
  // Prefer server-side aggregates (from user_aggregates table) — more reliable than summing encrypted items
  const sharedByUser = (() => {
    if (isSharedView && sharedAggregates.length > 0) {
      const result: Record<string, { username: string; total: number; count: number }> = {};
      for (const agg of sharedAggregates) {
        const uid = agg.user_id;
        result[uid] = {
          username: getOwnerName(uid),
          total: parseFloat(agg.total_fixed_monthly) || 0,
          count: sharedExpenses.filter(e => (e.userId || e.user_id) === uid).length
        };
      }
      return result;
    }
    return sharedExpenses.reduce<Record<string, { username: string; total: number; count: number }>>((acc, e) => {
      const uid = e.userId || e.user_id;
      if (!acc[uid]) acc[uid] = { username: getOwnerName(uid), total: 0, count: 0 };
      acc[uid].total += (e.amount || 0);
      acc[uid].count += 1;
      return acc;
    }, {});
  })();

  // Summary calculations (use ownExpenses for accurate own totals, full list for combined)
  const totalCommitted = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const paidExpenses = ownExpenses.filter(e => e.paid);
  const unpaidExpenses = ownExpenses.filter(e => !e.paid);
  const totalPaid = paidExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalUnpaid = unpaidExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const sipCount = ownExpenses.filter(e => e.is_sip_flag).length;

  return (
    <div className="fixed-expenses-page">
      <SharedViewBanner />

      <div className="page-header">
        <button className="back-button" onClick={() => navigate("/settings/plan-finances")}>
          ← Back
        </button>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <h1>Fixed Expenses</h1>
          <PageInfoButton
            title="Fixed Expenses"
            description="Your non-negotiable monthly commitments — rent, EMIs, subscriptions, insurance, and everything you pay like clockwork. Add them once and FinFlow tracks them every month automatically."
            impact="Fixed expenses are the backbone of your budget. They're deducted from your income before anything else to show your real available funds. Your health score counts all active fixed expenses whether paid or not — marking them as paid clears them from your Dues page so you know what's still outstanding."
            howItWorks={[
              "Add expenses with amount, frequency (monthly/quarterly/yearly), and category",
              "Monthly dues appear in the Dues page — mark them paid to clear them from outstanding dues",
              "Expenses with 'Loan' category auto-appear in the Loans widget on your dashboard",
              "Enable the SIP flag on periodic expenses to accumulate savings towards them",
              "Start/end dates let you track time-bound commitments like 12-month subscriptions"
            ]}
          />
        </div>
        {!isSharedView && (
          <button className="add-button" onClick={() => {
            setEditingId(null);
            setFormData({ name: "", amount: "", frequency: "monthly", category: "General", start_date: "", end_date: "", is_sip_flag: false });
            setShowForm(true);
          }}>
            + Add New Fixed Expense
          </button>
        )}
      </div>

      {/* Summary Strip */}
      {expenses.length > 0 && (
        <div className="fe-summary-strip">
          <div className="fe-summary-item">
            <span className="fe-summary-label">Total</span>
            <span className="fe-summary-value fe-total">₹{totalCommitted.toLocaleString("en-IN")}</span>
          </div>
          <div className="fe-summary-divider" />
          <div className="fe-summary-item">
            <span className="fe-summary-label">Paid ({paidExpenses.length})</span>
            <span className="fe-summary-value fe-paid">₹{totalPaid.toLocaleString("en-IN")}</span>
          </div>
          <div className="fe-summary-divider" />
          <div className="fe-summary-item">
            <span className="fe-summary-label">Unpaid ({unpaidExpenses.length})</span>
            <span className="fe-summary-value fe-unpaid">₹{totalUnpaid.toLocaleString("en-IN")}</span>
          </div>
          {sipCount > 0 && (
            <>
              <div className="fe-summary-divider" />
              <div className="fe-summary-item">
                <span className="fe-summary-label">SIPs</span>
                <span className="fe-summary-value fe-sip">{sipCount}</span>
              </div>
            </>
          )}
        </div>
      )}

      {showForm && !isSharedView && (
        <motion.div
          className="expense-form-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="expense-form">
            <h2>{editingId ? "Update" : "Add"} Fixed Expense</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-fields-scroll">
                <div className="form-group">
                  <label>Name *</label>
                  <input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Amount *</label>
                    <input
                      type="number"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Frequency *</label>
                    <select
                      value={formData.frequency}
                      onChange={(e) => {
                        const freq = e.target.value;
                        setFormData(prev => ({ ...prev, frequency: freq }));
                      }}
                    >
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Starting From <span className="optional-hint">(optional)</span></label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    />
                    <span className="field-hint">Leave empty = starts immediately</span>
                  </div>
                  <div className="form-group">
                    <label>Till <span className="optional-hint">(optional)</span></label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    />
                    <span className="field-hint">Leave empty = ongoing, no end date</span>
                  </div>
                </div>
                <div className="form-group">
                  <label>Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    required
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                {formData.frequency !== "monthly" && (
                  <div className="form-group sip-toggle-group">
                    <div className="sip-info">
                      <label className="sip-label">Enable SIP for this periodic expense</label>
                      <p className="sip-description">Accumulate funds monthly with potential growth instead of lump-sum payment</p>
                    </div>
                    <button
                      type="button"
                      className={`toggle-button ${formData.is_sip_flag ? "active" : ""}`}
                      onClick={() => {
                        const newValue = !formData.is_sip_flag;
                        setFormData({ ...formData, is_sip_flag: newValue });
                      }}
                    >
                      <span className="toggle-slider"></span>
                    </button>
                  </div>
                )}
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} disabled={isSubmitting}>
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : (editingId ? "Update" : "Add")}</button>
              </div>
            </form>
          </div>
        </motion.div>
      )}

      {/* Shared user aggregate banners */}
      {isSharedView && Object.keys(sharedByUser).length > 0 && (
        <div className="shared-aggregate-section">
          {Object.entries(sharedByUser).map(([uid, info]) => (
            <div key={uid} className="shared-aggregate-card">
              <div className="shared-aggregate-header">
                <FaUserCircle size={16} />
                <span className="shared-aggregate-name">{info.username}'s Fixed Expenses</span>
              </div>
              <div className="shared-aggregate-stats">
                <div className="shared-aggregate-stat">
                  <span className="stat-value">₹{Math.round(info.total).toLocaleString("en-IN")}</span>
                  <span className="stat-label">Total Monthly</span>
                </div>
                <div className="shared-aggregate-stat">
                  <span className="stat-value">{info.count}</span>
                  <span className="stat-label">Expenses</span>
                </div>
              </div>
              <p className="shared-aggregate-note">Individual items are encrypted — only totals are visible</p>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <SkeletonLoader type="list" count={5} />
      ) : ownExpenses.length === 0 && sharedExpenses.length === 0 ? (
        <EmptyState
          icon={<FaMoneyBillWave size={80} />}
          title="No Fixed Expenses Yet"
          description="Add your recurring expenses like rent, utilities, and subscriptions to track your monthly commitments"
          actionLabel="Add First Fixed Expense"
          onAction={() => {
            setEditingId(null);
            setFormData({ name: "", amount: "", frequency: "monthly", category: "General", start_date: "", end_date: "", is_sip_flag: false });
            setShowForm(true);
          }}
        />
      ) : ownExpenses.length === 0 && isSharedView ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 14 }}>
          You have no fixed expenses yet — shared member totals are shown above
        </div>
      ) : (
        <div className="expenses-list">
          {ownExpenses.map((expense, index) => {
            const displayName = expense.name;
            const displayAmount = expense.amount;
            
            return (
              <motion.div
                key={expense.id}
                className="expense-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="expense-info">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h3>{displayName}</h3>
                  </div>
                  <div className="expense-details">
                    <span>₹{displayAmount.toLocaleString("en-IN")}</span>
                    <span>{expense.frequency}</span>
                    <span>{expense.category}</span>
                    {expense.is_sip_flag && <StatusBadge status="active" size="small" label="SIP" icon={<FaSync size={12} />} />}
                    {expense.paid && <StatusBadge status="paid" size="small" />}
                    {/* Show dates if set */}
                    {(expense.startDate || expense.start_date) && (
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        From {new Date(expense.startDate || expense.start_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                      </span>
                    )}
                    {(expense.endDate || expense.end_date) && (
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        Till {new Date(expense.endDate || expense.end_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                      </span>
                    )}
                    {/* Show accumulated funds for SIPs */}
                    {expense.is_sip_flag && (expense.accumulatedFunds || expense.accumulated_funds || 0) > 0 && (
                      <span style={{ color: '#10b981', fontWeight: 600 }}>
                        Accumulated: ₹{Math.round(expense.accumulatedFunds || expense.accumulated_funds || 0).toLocaleString("en-IN")}
                      </span>
                    )}
                  </div>
                </div>
                <div className="expense-actions">
                  {/* Wallet button for SIP expenses */}
                  {expense.is_sip_flag && (
                    <button 
                      className="wallet-btn"
                      onClick={() => {
                        const currentFund = expense.accumulatedFunds || expense.accumulated_funds || 0;
                        setWalletModal({ isOpen: true, expenseId: expense.id, expenseName: expense.name, currentFund });
                        setWalletAmount(Math.round(currentFund).toString());
                      }}
                      title="Update Accumulated Fund"
                      aria-label="Update accumulated fund"
                    >
                      <FaWallet />
                    </button>
                  )}
                  <button onClick={() => handleEdit(expense)} title="Edit" aria-label="Edit expense">
                    <FaEdit />
                  </button>
                  <button onClick={() => handleDelete(expense.id)} className="delete-btn" title="Delete" aria-label="Delete expense">
                    <FaTrashAlt />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
      {/* Wallet Update Modal for SIP expenses */}
      {walletModal.isOpen && (
        <Modal
          isOpen={walletModal.isOpen}
          onClose={() => { setWalletModal({ isOpen: false, expenseId: "", expenseName: "", currentFund: 0 }); setWalletAmount(""); }}
          title={`Update Fund — ${walletModal.expenseName}`}
          size="sm"
          footer={
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => { setWalletModal({ isOpen: false, expenseId: "", expenseName: "", currentFund: 0 }); setWalletAmount(""); }}
                style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "var(--text-primary)", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={handleWalletUpdate}
                style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "var(--accent-cyan, #22d3ee)", color: "#041019", fontWeight: 700, cursor: "pointer" }}
              >
                Update
              </button>
            </div>
          }
        >
          <p style={{ margin: "0 0 12px", color: "var(--text-secondary)" }}>
            Current Accumulated: ₹{Math.round(walletModal.currentFund).toLocaleString("en-IN")}
          </p>
          <input
            type="number"
            value={walletAmount}
            onChange={(e) => setWalletAmount(e.target.value)}
            placeholder="Enter new accumulated amount"
            min="0"
            style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)", color: "var(--text-primary)", fontSize: 16 }}
            autoFocus
          />
        </Modal>
      )}

      <AppModalRenderer modal={modal} closeModal={closeModal} confirmAndClose={confirmAndClose} />
    </div>
  );
}
