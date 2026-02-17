import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FaMoneyBillWave, FaEdit, FaTrashAlt, FaSync, FaUserCircle, FaLock, FaUsers } from "react-icons/fa";
import { useEncryptedApiCalls } from "../hooks/useEncryptedApiCalls";
import { useSharedView } from "../hooks/useSharedView";
import { SkeletonLoader } from "../components/SkeletonLoader";
import { EmptyState } from "../components/EmptyState";
import { StatusBadge } from "../components/StatusBadge";
import { ProgressBar } from "../components/ProgressBar";
import { PageInfoButton } from "../components/PageInfoButton";
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
    start_date: new Date().toISOString().split("T")[0],
    end_date: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    is_sip_flag: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);  // Prevent multiple submissions
  const hasFetchedRef = useRef(false); // Prevent double fetch in React Strict Mode
  const lastViewRef = useRef<string>(""); // Track view changes
  
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
    console.log("💾 Submitting form with is_sip_flag:", formData.is_sip_flag);
    
    const expenseData = {
      name: formData.name,
      amount: Number(formData.amount),
      frequency: formData.frequency,
      category: formData.category,
      start_date: formData.start_date,
      end_date: formData.end_date,
      is_sip_flag: formData.is_sip_flag
    };
    
    // OPTIMISTIC UPDATE: Add/update immediately in UI
    const tempId = `temp-${Date.now()}`;
    const optimisticExpense = {
      id: editingId || tempId,
      ...expenseData,
      startDate: formData.start_date,
      endDate: formData.end_date,
      paid: false
    };
    
    if (editingId) {
      // Update existing
      setExpenses(prev => prev.map(exp => exp.id === editingId ? optimisticExpense : exp));
    } else {
      // Add new
      setExpenses(prev => [optimisticExpense, ...prev]);
    }
    
    // Close form immediately
    setShowForm(false);
    setEditingId(null);
    setFormData({
      name: "",
      amount: "",
      frequency: "monthly",
      category: "General",
      start_date: new Date().toISOString().split("T")[0],
      end_date: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      is_sip_flag: false
    });
    setIsSubmitting(false);
    
    try {
      let response;
      if (editingId) {
        response = await api.updateFixedExpense(token, editingId, expenseData);
        console.log("✅ Update response:", response);
      } else {
        response = await api.createFixedExpense(token, expenseData);
        console.log("✅ Create response:", response);
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
    console.log("Editing expense:", expense);
    console.log("ℹ️ is_sip_flag value:", expense.is_sip_flag);
    setEditingId(expense.id);
    setFormData({
      name: expense.name,
      amount: expense.amount.toString(),
      frequency: expense.frequency,
      category: expense.category,
      start_date: expense.startDate || new Date().toISOString().split("T")[0],
      end_date: expense.endDate || new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      is_sip_flag: expense.is_sip_flag || false
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    showConfirm("Delete this expense?", async () => {
      try {
        await api.deleteFixedExpense(token, id);
        setExpenses(prev => prev.filter(e => e.id !== id));
        invalidateDashboardCache();
        await loadExpenses();
      } catch (e: any) {
        showAlert(e.message);
        await loadExpenses();
      }
    });
  };

  const categories = [
    "General", "Housing", "Food", "Transport", "Utilities", "Insurance", "Loan",
    "Education", "Healthcare", "Entertainment", "Shopping", "Personal Care", "Subscriptions"
  ];

  return (
    <div className="fixed-expenses-page">
      <div className="page-header">
        <button className="back-button" onClick={() => navigate("/settings/plan-finances")}>
          ← Back
        </button>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <h1>Fixed Expenses</h1>
          <PageInfoButton
            title="Fixed Expenses"
            description="Track your recurring monthly expenses like rent, subscriptions, insurance, and other regular payments. These are expenses that remain constant each month."
            impact="Fixed expenses are automatically deducted from your available funds and directly impact your health score. Unpaid fixed expenses reduce your financial health, so it's important to mark them as paid when you make payments."
            howItWorks={[
              "Add fixed expenses with amount, frequency, and category",
              "Mark expenses as paid when you make payments to update your available funds",
              "Expenses with 'Loan' category automatically appear in your Loans widget",
              "Use SIP flag for expenses that are Systematic Investment Plans",
              "Set start and end dates for time-bound expenses"
            ]}
          />
        </div>
        <button className="add-button" onClick={() => {
          setEditingId(null);
          setFormData({
            name: "",
            amount: "",
            frequency: "monthly",
            category: "General",
            start_date: new Date().toISOString().split("T")[0],
            end_date: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
            is_sip_flag: false
          });
          setShowForm(true);
        }}>
          + Add New Fixed Expense
        </button>
      </div>

      {showForm && (
        <motion.div
          className="expense-form-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="expense-form">
            <h2>{editingId ? "Update" : "Add"} Fixed Expense</h2>
            <form onSubmit={handleSubmit}>
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
                  <label>Starting From *</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Till *</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    required
                  />
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
                      console.log("🔘 Toggle clicked! Old:", formData.is_sip_flag, "New:", newValue);
                      setFormData({ ...formData, is_sip_flag: newValue });
                    }}
                  >
                    <span className="toggle-slider"></span>
                  </button>
                </div>
              )}
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

      {/* Combined View Banner */}
      {isSharedView && (
        <div className="combined-view-banner">
          <FaUsers style={{ marginRight: 8 }} />
          <span>Combined View: Showing merged finances from shared members</span>
        </div>
      )}

      {loading ? (
        <SkeletonLoader type="list" count={5} />
      ) : expenses.length === 0 ? (
        <EmptyState
          icon={<FaMoneyBillWave size={80} />}
          title="No Fixed Expenses Yet"
          description="Add your recurring expenses like rent, utilities, and subscriptions to track your monthly commitments"
          actionLabel="Add First Fixed Expense"
          onAction={() => {
            setEditingId(null);
            setFormData({
              name: "",
              amount: "",
              frequency: "monthly",
              category: "General",
              start_date: new Date().toISOString().split("T")[0],
              end_date: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
              is_sip_flag: false
            });
            setShowForm(true);
          }}
        />
      ) : (
        <div className="expenses-list">
          {expenses.map((expense, index) => {
            const itemUserId = expense.userId || expense.user_id;
            const isOwn = isOwnItem(itemUserId);
            const displayName = isOwn ? expense.name : formatSharedField(expense.name, isOwn);
            const displayAmount = isOwn ? expense.amount : (expense.amount || 0);
            
            return (
              <motion.div
                key={expense.id}
                className={`expense-card ${isSharedView && !isOwn ? 'shared-item' : ''}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="expense-info">
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
                  <div className="expense-details">
                    <span>₹{displayAmount.toLocaleString("en-IN")}</span>
                    <span>{expense.frequency}</span>
                    <span>{expense.category}</span>
                    {expense.is_sip_flag && <StatusBadge status="active" size="small" label="SIP" icon={<FaSync size={12} />} />}
                    {expense.paid && <StatusBadge status="paid" size="small" />}
                    {/* Show accumulated funds for SIPs */}
                    {expense.is_sip_flag && (expense.accumulatedFunds || expense.accumulated_funds || 0) > 0 && (
                      <span style={{ color: '#10b981', fontWeight: 600 }}>
                        Accumulated: ₹{Math.round(expense.accumulatedFunds || expense.accumulated_funds || 0).toLocaleString("en-IN")}
                      </span>
                    )}
                  </div>
                </div>
                <div className="expense-actions">
                  {/* Only show edit/delete for user's own items */}
                  {isOwn ? (
                    <>
                      <button onClick={() => handleEdit(expense)} title="Edit" aria-label="Edit expense">
                        <FaEdit />
                      </button>
                      <button onClick={() => handleDelete(expense.id)} className="delete-btn" title="Delete" aria-label="Delete expense">
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
          })}
        </div>
      )}
      <AppModalRenderer modal={modal} closeModal={closeModal} confirmAndClose={confirmAndClose} />
    </div>
  );
}
