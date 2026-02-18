import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FaChartBar, FaShoppingCart, FaMobileAlt, FaMoneyBillWave, FaWallet, FaCreditCard, FaEdit, FaTrash, FaUserCircle, FaLock } from "react-icons/fa";
import { useEncryptedApiCalls } from "../hooks/useEncryptedApiCalls";
import { useSharedView } from "../hooks/useSharedView";
import { SharedViewBanner } from "../components/SharedViewBanner";
import { SkeletonLoader } from "../components/SkeletonLoader";
import { EmptyState } from "../components/EmptyState";
import { ProgressBar } from "../components/ProgressBar";
import { PageInfoButton } from "../components/PageInfoButton";
import { useAppModal } from "../hooks/useAppModal";
import { AppModalRenderer } from "../components/AppModalRenderer";
import { invalidateDashboardCache } from "../utils/cacheInvalidation";
import "./VariableExpensesPage.css";

interface VariableExpensesPageProps {
  token: string;
}

export function VariableExpensesPage({ token }: VariableExpensesPageProps) {
  const navigate = useNavigate();
  const api = useEncryptedApiCalls();
  const { modal, showAlert, showConfirm, closeModal, confirmAndClose } = useAppModal();
  const { selectedView, isSharedView, getViewParam, getOwnerName, isOwnItem, formatSharedField } = useSharedView(token);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [showActualForm, setShowActualForm] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [planForm, setPlanForm] = useState({
    name: "",
    planned: "",
    category: "General",
    start_date: new Date().toISOString().split("T")[0],
    end_date: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  });
  const [actualForm, setActualForm] = useState({
    amount: "",
    justification: "",
    subcategory: "Unspecified",
    paymentMode: "Cash" as "UPI" | "Cash" | "ExtraCash" | "CreditCard",
    creditCardId: "",
    showNewSubcategory: false,
    newSubcategory: ""
  });
  const [userSubcategories, setUserSubcategories] = useState<string[]>(["Unspecified"]);
  const [creditCards, setCreditCards] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasFetchedRef = useRef(false);
  const lastViewRef = useRef<string>("");

  useEffect(() => {
    if (hasFetchedRef.current && lastViewRef.current === selectedView) return;
    hasFetchedRef.current = true;
    lastViewRef.current = selectedView;
    loadPlans();
    loadSubcategories();
    loadCreditCards();
  }, [selectedView]);

  const loadPlans = async (forceRefresh = false) => {
    try {
      const res = await api.fetchDashboard(token, new Date().toISOString(), getViewParam(), forceRefresh);
      setPlans(res.data.variablePlans || []);
    } catch (e) {
      console.error("Failed to load plans:", e);
    } finally {
      setLoading(false);
    }
  };

  const loadSubcategories = async () => {
    try {
      const res = await api.getUserSubcategories(token);
      const subs = res.data || [];
      if (!subs.includes("Unspecified")) {
        setUserSubcategories(["Unspecified", ...subs]);
      } else {
        setUserSubcategories(["Unspecified", ...subs.filter((s: string) => s !== "Unspecified")]);
      }
    } catch (e) {
      console.error("Failed to load subcategories:", e);
      setUserSubcategories(["Unspecified"]);
    }
  };

  const loadCreditCards = async () => {
    try {
      const res = await api.fetchCreditCards(token);
      setCreditCards(res.data || []);
    } catch (e) {
      console.error("Failed to load credit cards:", e);
    }
  };

  const handlePlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    const planData = {
      name: planForm.name,
      planned: Number(planForm.planned),
      category: planForm.category,
      start_date: planForm.start_date,
      end_date: planForm.end_date
    };
    
    const tempId = `temp-${Date.now()}`;
    const optimisticPlan = {
      id: editingId || tempId,
      ...planData,
      actuals: [],
      actualTotal: 0
    };
    
    if (editingId) {
      setPlans(prev => prev.map(p => p.id === editingId ? { ...p, ...optimisticPlan } : p));
    } else {
      setPlans(prev => [optimisticPlan, ...prev]);
    }
    
    setShowPlanForm(false);
    setEditingId(null);
    setIsSubmitting(false);
    
    try {
      let response: any;
      if (editingId) {
        response = await api.updateVariableExpensePlan(token, editingId, planData);
      } else {
        response = await api.createVariablePlan(token, planData);
        if (response?.data) {
          setPlans(prev => prev.map(p => p.id === tempId ? { ...response.data, actuals: [], actualTotal: 0 } : p));
        }
      }
      invalidateDashboardCache();
      loadPlans(true);
    } catch (e: any) {
      showAlert(e.message);
      if (editingId) {
        loadPlans(true);
      } else {
        setPlans(prev => prev.filter(p => p.id !== tempId));
      }
    }
  };

  const handleAddSubcategory = async () => {
    if (actualForm.newSubcategory.trim()) {
      try {
        const res = await api.addUserSubcategory(token, actualForm.newSubcategory.trim());
        setUserSubcategories(res.data.subcategories);
        setActualForm({ 
          ...actualForm, 
          subcategory: actualForm.newSubcategory.trim(), 
          showNewSubcategory: false,
          newSubcategory: "" 
        });
      } catch (e: any) {
        showAlert(e.message);
      }
    }
  };

  const handleActualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanId) return;
    if (isSubmitting) return;
    
    const planStillExists = plans.find(p => p.id === selectedPlanId);
    if (!planStillExists) {
      showAlert("This plan no longer exists. Refreshing plans...");
      await loadPlans(true);
      setShowActualForm(false);
      setSelectedPlanId(null);
      return;
    }
    
    if (actualForm.paymentMode === "CreditCard" && !actualForm.creditCardId) {
      showAlert("Please select a credit card");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const tempActual = {
        id: `temp-${Date.now()}`,
        amount: Number(actualForm.amount),
        incurredAt: new Date().toISOString(),
        justification: actualForm.justification || "",
        subcategory: actualForm.subcategory,
        paymentMode: actualForm.paymentMode,
        creditCardId: actualForm.paymentMode === "CreditCard" ? actualForm.creditCardId : undefined
      };
      
      setPlans(plans => plans.map(p => {
        if (p.id === selectedPlanId) {
          return {
            ...p,
            actuals: [...(p.actuals || []), tempActual],
            actualTotal: (p.actualTotal || 0) + tempActual.amount
          };
        }
        return p;
      }));
      
      if (actualForm.paymentMode === "CreditCard" && actualForm.creditCardId) {
        setCreditCards(cards => cards.map(c => 
          c.id === actualForm.creditCardId 
            ? { ...c, currentExpenses: (c.currentExpenses || 0) + tempActual.amount }
            : c
        ));
      }
      
      setShowActualForm(false);
      setActualForm({ 
        amount: "", 
        justification: "",
        subcategory: "Unspecified",
        paymentMode: "Cash",
        creditCardId: "",
        showNewSubcategory: false,
        newSubcategory: ""
      });
      setSelectedPlanId(null);
      
      await api.addVariableActual(token, selectedPlanId, {
        amount: Number(tempActual.amount),
        incurred_at: tempActual.incurredAt,
        justification: tempActual.justification || undefined,
        subcategory: tempActual.subcategory,
        payment_mode: tempActual.paymentMode,
        credit_card_id: tempActual.creditCardId
      });
      
      invalidateDashboardCache();
      // Background refresh — fire-and-forget
      Promise.all([loadPlans(true), loadCreditCards()]);

    } catch (e: any) {
      showAlert(e.message);
      loadPlans(true);
      loadCreditCards();
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = [
    "General", "Food", "Groceries", "Transport", "Entertainment", "Shopping",
    "Personal Care", "Healthcare", "Education", "Utilities", "Other"
  ];

  // Compute summary stats
  const totalPlanned = plans.reduce((sum, p) => sum + (p.planned || 0), 0);
  const totalSpent = plans.reduce((sum, p) => sum + (p.actualTotal || 0), 0);
  const totalRemaining = totalPlanned - totalSpent;
  const overspendCount = plans.filter(p => p.actualTotal > p.planned).length;

  const paymentModes = [
    { key: "UPI", label: "UPI", icon: <FaMobileAlt size={18} />, hint: null },
    { key: "Cash", label: "Cash", icon: <FaMoneyBillWave size={18} />, hint: null },
    { key: "ExtraCash", label: "Extra Cash", icon: <FaWallet size={18} />, hint: "Doesn't affect funds" },
    { key: "CreditCard", label: "Credit Card", icon: <FaCreditCard size={18} />, hint: "Billed later" }
  ];

  return (
    <div className="variable-expenses-page">
      <div className="page-header">
        <button className="back-button" onClick={() => navigate("/dashboard")}>← Back</button>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <h1><FaChartBar style={{ marginRight: 10, verticalAlign: 'middle' }} />Variable Expenses</h1>
          <PageInfoButton
            title="Variable Expenses"
            description="The money you spend differently every month — groceries, dining out, entertainment, shopping, transport. Create a plan for each category, then log actual spends as they happen to see exactly where your money goes."
            impact="Overspending on variable expenses is the #1 reason health scores drop. This page prorates your planned budgets across remaining days, so you always know if you're on track or heading towards an overspend."
            howItWorks={[
              "Create plans (e.g., Groceries ₹8,000/month) to set your budget ceiling",
              "Log actual expenses under each plan with amount, subcategory, and payment mode",
              "UPI/Cash reduces available funds instantly; Extra Cash doesn't; Credit Card defers to your card bill",
              "Spending over your plan triggers an overspend warning and bumps your constraint score",
              "Use the summary strip at the top to see total planned vs actual at a glance"
            ]}
          />
        </div>
        {!isSharedView && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="add-button" onClick={() => { setShowPlanForm(true); setEditingId(null); }}>
              + Add New Plan
            </button>
          </div>
        )}
      </div>

      <SharedViewBanner />

      {/* Summary Strip */}
      {!loading && plans.length > 0 && (
        <div className="ve-summary-strip">
          <div className="ve-summary-item">
            <span className="ve-summary-label">Total Planned</span>
            <span className="ve-summary-value ve-planned">₹{totalPlanned.toLocaleString("en-IN")}</span>
          </div>
          <div className="ve-summary-divider" />
          <div className="ve-summary-item">
            <span className="ve-summary-label">Total Spent</span>
            <span className={`ve-summary-value ${totalSpent > totalPlanned ? 've-overspent' : 've-spent'}`}>₹{totalSpent.toLocaleString("en-IN")}</span>
          </div>
          <div className="ve-summary-divider" />
          <div className="ve-summary-item">
            <span className="ve-summary-label">{totalRemaining >= 0 ? 'Remaining' : 'Overspent'}</span>
            <span className={`ve-summary-value ${totalRemaining >= 0 ? 've-remaining' : 've-overspent'}`}>
              {totalRemaining < 0 ? '-' : ''}₹{Math.abs(totalRemaining).toLocaleString("en-IN")}
            </span>
          </div>
          {overspendCount > 0 && (
            <>
              <div className="ve-summary-divider" />
              <div className="ve-summary-item">
                <span className="ve-summary-label">Overspent Plans</span>
                <span className="ve-summary-value ve-overspent">{overspendCount}</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Plan Form Modal */}
      {showPlanForm && !isSharedView && (
        <motion.div className="modal-overlay" onClick={() => setShowPlanForm(false)}>
          <motion.div className="modal-content" onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <h2>{editingId ? "Update" : "Add"} Variable Expense Plan</h2>
            <form onSubmit={handlePlanSubmit}>
              <div className="form-group">
                <label>Name *</label>
                <input value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} required placeholder="e.g. Groceries, Dining Out" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Planned Amount (₹) *</label>
                  <input type="number" value={planForm.planned} onChange={(e) => setPlanForm({ ...planForm, planned: e.target.value })} required min="1" placeholder="5000" />
                </div>
                <div className="form-group">
                  <label>Category *</label>
                  <select value={planForm.category} onChange={(e) => setPlanForm({ ...planForm, category: e.target.value })}>
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Starting From *</label>
                  <input type="date" value={planForm.start_date} onChange={(e) => setPlanForm({ ...planForm, start_date: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Till *</label>
                  <input type="date" value={planForm.end_date} onChange={(e) => setPlanForm({ ...planForm, end_date: e.target.value })} required />
                </div>
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => setShowPlanForm(false)} disabled={isSubmitting}>Cancel</button>
                <button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : (editingId ? "Update" : "Add Plan")}</button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}

      {/* Actual Expense Form Modal */}
      {showActualForm && !isSharedView && (
        <motion.div className="modal-overlay" onClick={() => setShowActualForm(false)}>
          <motion.div className="modal-content" onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <h2>Add an Expense</h2>
            <form onSubmit={handleActualSubmit}>
              <div className="form-group">
                <label>Select Plan *</label>
                <select value={selectedPlanId || ""} onChange={(e) => setSelectedPlanId(e.target.value)} required>
                  <option value="">Select plan</option>
                  {plans.filter(p => isOwnItem(p.userId || p.user_id)).map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} (planned ₹{(p.planned || 0).toLocaleString("en-IN")})
                    </option>
                  ))}
                </select>
                {plans.filter(p => isOwnItem(p.userId || p.user_id)).length === 0 && (
                  <small style={{ color: '#ef4444', display: 'block', marginTop: '4px' }}>
                    No expense plans available. Create a plan first before adding actual expenses.
                  </small>
                )}
              </div>
              <div className="form-group">
                <label>Amount (₹) *</label>
                <input type="number" value={actualForm.amount} onChange={(e) => setActualForm({ ...actualForm, amount: e.target.value })} required min="0" step="0.01" placeholder="0" />
              </div>

              {/* Subcategory Selection */}
              <div className="form-group">
                <label>Subcategory</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <select
                    value={actualForm.subcategory}
                    onChange={(e) => {
                      if (e.target.value === "__NEW__") {
                        setActualForm({ ...actualForm, showNewSubcategory: true, subcategory: "" });
                      } else {
                        setActualForm({ ...actualForm, subcategory: e.target.value, showNewSubcategory: false });
                      }
                    }}
                    style={{ flex: 1 }}
                  >
                    {userSubcategories.map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                    <option value="__NEW__">+ Add New Subcategory</option>
                  </select>
                  {actualForm.showNewSubcategory && (
                    <input
                      type="text"
                      placeholder="Enter new subcategory"
                      value={actualForm.newSubcategory}
                      onChange={(e) => setActualForm({ ...actualForm, newSubcategory: e.target.value })}
                      onBlur={handleAddSubcategory}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); handleAddSubcategory(); }
                      }}
                      style={{ flex: 1 }}
                      autoFocus
                    />
                  )}
                </div>
              </div>

              {/* Payment Mode Selection - now CSS-driven */}
              <div className="form-group">
                <label>Payment Mode *</label>
                <div className="payment-mode-grid">
                  {paymentModes.map(mode => (
                    <div
                      key={mode.key}
                      className={`payment-mode-option ${actualForm.paymentMode === mode.key ? 'selected' : ''}`}
                      onClick={() => setActualForm({ ...actualForm, paymentMode: mode.key as any, creditCardId: mode.key !== "CreditCard" ? "" : actualForm.creditCardId })}
                    >
                      {mode.icon}
                      <span>{mode.label}</span>
                      {mode.hint && <small>{mode.hint}</small>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Credit Card Selection (conditional) */}
              {actualForm.paymentMode === "CreditCard" && (
                <div className="form-group">
                  <label>Select Credit Card *</label>
                  <select
                    value={actualForm.creditCardId}
                    onChange={(e) => setActualForm({ ...actualForm, creditCardId: e.target.value })}
                    required
                  >
                    <option value="">Select credit card</option>
                    {creditCards.map(card => (
                      <option key={card.id} value={card.id}>
                        {card.name} {card.currentExpenses ? `(Current: ₹${card.currentExpenses.toLocaleString("en-IN")})` : ''}
                      </option>
                    ))}
                  </select>
                  {creditCards.length === 0 && (
                    <small style={{ color: '#ef4444', display: 'block', marginTop: '4px' }}>
                      No credit cards available. Add a credit card in Settings → Credit Cards first.
                    </small>
                  )}
                </div>
              )}

              <div className="form-group">
                <label>Justification (if overspend)</label>
                <textarea value={actualForm.justification} onChange={(e) => setActualForm({ ...actualForm, justification: e.target.value })} rows={3} placeholder="Why did you overspend?" />
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => setShowActualForm(false)} disabled={isSubmitting}>Cancel</button>
                <button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Add Expense"}</button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}

      {/* Add Expense Button */}
      {!isSharedView && (
        <div className="actions-bar">
          <button className="secondary-button" onClick={() => setShowActualForm(true)}>
            + Add an Expense
          </button>
        </div>
      )}

      {loading ? (
        <SkeletonLoader type="card" count={4} />
      ) : plans.length === 0 ? (
        <EmptyState
          icon={<FaShoppingCart size={56} />}
          title="No Variable Expense Plans"
          description="Create plans to budget for groceries, dining, entertainment, and other variable monthly expenses"
          actionLabel={isSharedView ? undefined : "Create First Plan"}
          onAction={isSharedView ? undefined : () => setShowPlanForm(true)}
        />
      ) : (
        <div className="plans-list">
          {plans.map((plan, index) => {
            const overspend = plan.actualTotal > plan.planned;
            const itemUserId = plan.userId || plan.user_id;
            const isOwn = isOwnItem(itemUserId);
            const displayName = formatSharedField(plan.name, isOwn);
            
            return (
              <motion.div
                key={plan.id}
                className={`plan-card ${overspend ? "overspend" : ""} ${isSharedView && !isOwn ? "shared-item" : ""}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="plan-header">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <h3>{displayName}</h3>
                      {isSharedView && (
                        <span className={`owner-badge ${isOwn ? 'own' : 'shared'}`}>
                          {isOwn ? <FaUserCircle size={12} style={{ marginRight: 4 }} /> : <FaLock size={12} style={{ marginRight: 4 }} />}
                          {getOwnerName(itemUserId)}
                        </span>
                      )}
                    </div>
                    <div className="plan-actions">
                      {isOwn ? (
                        <>
                          <button onClick={() => { setEditingId(plan.id); setPlanForm({ ...planForm, name: plan.name, planned: plan.planned.toString(), category: plan.category }); setShowPlanForm(true); }} title="Edit" aria-label="Edit plan"><FaEdit size={16} /></button>
                          <button className="delete-btn" onClick={() => showConfirm("Delete this variable plan?", () => { api.deleteVariableExpensePlan(token, plan.id).then(() => { invalidateDashboardCache(); loadPlans(true); }); })} title="Delete" aria-label="Delete plan"><FaTrash size={16} /></button>
                        </>
                      ) : (
                        <span className="read-only-badge" title="View only - belongs to shared member">
                          <FaLock size={12} /> View Only
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="plan-stats">
                  <ProgressBar
                    current={plan.actualTotal}
                    target={plan.planned}
                    label={`₹${(plan.actualTotal || 0).toLocaleString("en-IN")} / ₹${(plan.planned || 0).toLocaleString("en-IN")}`}
                    showPercentage={true}
                  />
                  <div className="ve-stats-row">
                    <div className="stat">
                      <span className="stat-label">Planned</span>
                      <span className="stat-value">₹{(plan.planned || 0).toLocaleString("en-IN")}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Actual</span>
                      <span className={`stat-value ${overspend ? "overspend" : ""}`}>₹{(plan.actualTotal || 0).toLocaleString("en-IN")}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">{overspend ? 'Over' : 'Left'}</span>
                      <span className={`stat-value ${overspend ? "overspend" : "good"}`}>
                        {overspend ? "-" : ""}₹{Math.abs((plan.actualTotal || 0) - (plan.planned || 0)).toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                </div>
                {plan.actuals && plan.actuals.length > 0 && (
                  <div className="actuals-list">
                    <h4>Recent Expenses</h4>
                    {plan.actuals.map((actual: any) => {
                      const paymentInfo = actual.paymentMode === "UPI" ? { icon: <FaMobileAlt size={12} />, label: "UPI", color: "#3b82f6" } :
                                        actual.paymentMode === "Cash" ? { icon: <FaMoneyBillWave size={12} />, label: "Cash", color: "#10b981" } :
                                        actual.paymentMode === "ExtraCash" ? { icon: <FaWallet size={12} />, label: "Extra Cash", color: "#8b5cf6" } :
                                        actual.paymentMode === "CreditCard" ? { icon: <FaCreditCard size={12} />, label: "Credit Card", color: "#f59e0b" } :
                                        { icon: <FaMoneyBillWave size={12} />, label: actual.paymentMode || "Cash", color: "var(--text-tertiary)" };
                      return (
                        <div key={actual.id} className="actual-item">
                          <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>₹{(actual.amount || 0).toLocaleString("en-IN")}</span>
                          <span>{new Date(actual.incurredAt).toLocaleDateString()}</span>
                          {actual.subcategory && actual.subcategory !== "Unspecified" && (
                            <span className="actual-subcategory-badge">{actual.subcategory}</span>
                          )}
                          <span className="actual-payment-tag" style={{ color: paymentInfo.color }}>
                            {paymentInfo.icon}
                            {paymentInfo.label}
                          </span>
                          {actual.justification && <span className="justification">{actual.justification}</span>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
      <AppModalRenderer modal={modal} closeModal={closeModal} confirmAndClose={confirmAndClose} />
    </div>
  );
}
