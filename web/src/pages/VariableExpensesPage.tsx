import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FaChartBar, FaShoppingCart, FaMobileAlt, FaMoneyBillWave, FaWallet, FaCreditCard, FaEdit, FaTrash } from "react-icons/fa";
import { useEncryptedApiCalls } from "../hooks/useEncryptedApiCalls";
import { SkeletonLoader } from "../components/SkeletonLoader";
import { EmptyState } from "../components/EmptyState";
import { ProgressBar } from "../components/ProgressBar";
import { PageInfoButton } from "../components/PageInfoButton";
import "./VariableExpensesPage.css";

interface VariableExpensesPageProps {
  token: string;
}

export function VariableExpensesPage({ token }: VariableExpensesPageProps) {
  const navigate = useNavigate();
  const api = useEncryptedApiCalls();
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
    subcategory: "Unspecified",  // v1.2: Default subcategory
    paymentMode: "Cash" as "UPI" | "Cash" | "ExtraCash" | "CreditCard",  // v1.2: Default payment mode
    creditCardId: "",  // v1.2: Credit card selection
    showNewSubcategory: false,  // v1.2: Show new subcategory input
    newSubcategory: ""  // v1.2: New subcategory input
  });
  const [userSubcategories, setUserSubcategories] = useState<string[]>(["Unspecified"]);  // v1.2: User's subcategories
  const [creditCards, setCreditCards] = useState<any[]>([]);  // v1.2: User's credit cards
  const [isSubmitting, setIsSubmitting] = useState(false);  // Prevent multiple submissions

  useEffect(() => {
    loadPlans();
    loadSubcategories();  // v1.2: Load subcategories
    loadCreditCards();  // v1.2: Load credit cards
  }, []);

  const loadPlans = async (forceRefresh = false) => {
    try {
      const res = await api.fetchDashboard(token, new Date().toISOString(), undefined, forceRefresh);
      // #region agent log - DEBUG: Log plans received from API
      fetch('http://127.0.0.1:7242/ingest/620c30bd-a4ac-4892-8325-a941881cbeee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'VariableExpensesPage.tsx:loadPlans',message:'plans received',data:{forceRefresh, plansCount: (res.data.variablePlans || []).length, plans: (res.data.variablePlans || []).map((p: any) => ({id: p.id, name: p.name, planned: p.planned, actualTotal: p.actualTotal, actualsCount: (p.actuals || []).length}))},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      setPlans(res.data.variablePlans || []);
    } catch (e) {
      console.error("Failed to load plans:", e);
    } finally {
      setLoading(false);
    }
  };

  // v1.2: Load user subcategories
  const loadSubcategories = async () => {
    try {
      const res = await api.getUserSubcategories(token);
      const subs = res.data || [];
      // Always ensure "Unspecified" is first in the list
      if (!subs.includes("Unspecified")) {
        setUserSubcategories(["Unspecified", ...subs]);
      } else {
        // Move "Unspecified" to the front
        setUserSubcategories(["Unspecified", ...subs.filter(s => s !== "Unspecified")]);
      }
    } catch (e) {
      console.error("Failed to load subcategories:", e);
      setUserSubcategories(["Unspecified"]);
    }
  };

  // v1.2: Load credit cards
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
    if (isSubmitting) return; // Prevent multiple submissions
    setIsSubmitting(true);
    
    const planData = {
      name: planForm.name,
      planned: Number(planForm.planned),
      category: planForm.category,
      start_date: planForm.start_date,
      end_date: planForm.end_date
    };
    
    // OPTIMISTIC UPDATE: Add/update immediately in UI
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
    
    // Close form immediately
    setShowPlanForm(false);
    setEditingId(null);
    setIsSubmitting(false);
    
    try {
      let response;
      if (editingId) {
        response = await api.updateVariableExpensePlan(token, editingId, planData);
      } else {
        response = await api.createVariablePlan(token, planData);
        // Replace temp item with real one
        if (response?.data) {
          setPlans(prev => prev.map(p => p.id === tempId ? { ...response.data, actuals: [], actualTotal: 0 } : p));
        }
      }
      // Background refresh with cache bypass
      loadPlans(true);
    } catch (e: any) {
      alert(e.message);
      // Rollback on error
      if (editingId) {
        loadPlans(true);
      } else {
        setPlans(prev => prev.filter(p => p.id !== tempId));
      }
    }
  };

  // v1.2: Handle adding new subcategory
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
        alert(e.message);
      }
    }
  };

  const handleActualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanId) return;
    if (isSubmitting) return; // Prevent multiple submissions
    
    // Validate plan still exists
    const planStillExists = plans.find(p => p.id === selectedPlanId);
    if (!planStillExists) {
      alert("This plan no longer exists. Refreshing plans...");
      await loadPlans(true);
      setShowActualForm(false);
      setSelectedPlanId(null);
      return;
    }
    
    // v1.2: Validate credit card selection
    if (actualForm.paymentMode === "CreditCard" && !actualForm.creditCardId) {
      alert("Please select a credit card");
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Optimistic UI update - add expense immediately to UI
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
      
      // Update credit card current expenses optimistically if applicable
      if (actualForm.paymentMode === "CreditCard" && actualForm.creditCardId) {
        setCreditCards(cards => cards.map(c => 
          c.id === actualForm.creditCardId 
            ? { ...c, currentExpenses: (c.currentExpenses || 0) + tempActual.amount }
            : c
        ));
      }
      
      // Close form immediately
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
      
      // Make API call in background
      await api.addVariableActual(token, selectedPlanId, {
        amount: Number(tempActual.amount),
        incurred_at: tempActual.incurredAt,
        justification: tempActual.justification || undefined,
        subcategory: tempActual.subcategory,
        payment_mode: tempActual.paymentMode,
        credit_card_id: tempActual.creditCardId
      });
      
      // Refresh data in PARALLEL after successful save (bypass cache)
      await Promise.all([loadPlans(true), loadCreditCards()]);

    } catch (e: any) {
      alert(e.message);
      // Revert optimistic update on error
      await loadPlans(true);
      await loadCreditCards();
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = [
    "General", "Food", "Groceries", "Transport", "Entertainment", "Shopping",
    "Personal Care", "Healthcare", "Education", "Utilities", "Other"
  ];

  return (
    <div className="variable-expenses-page">
      <div className="page-header">
        <button className="back-button" onClick={() => navigate("/dashboard")}>← Back</button>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <h1>Variable Expenses</h1>
          <PageInfoButton
            title="Variable Expenses"
            description="Plan and track your variable expenses like groceries, dining, entertainment, and shopping. These expenses can vary each month based on your spending habits."
            impact="Variable expenses are prorated based on remaining days in your billing cycle and directly affect your health score. Tracking actual expenses helps you stay within your planned budget and maintain financial health."
            howItWorks={[
              "Create expense plans with a planned amount and category",
              "Add actual expenses as you spend, with subcategory and payment mode",
              "Payment modes: UPI/Cash (reduces available funds), Extra Cash (doesn't reduce funds), Credit Card (billed later)",
              "The app calculates prorated amounts for remaining days in your billing cycle",
              "Track your spending against plans to stay within budget"
            ]}
          />
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="add-button" onClick={() => { setShowPlanForm(true); setEditingId(null); }}>
            + Add New Plan
          </button>
        </div>
      </div>

      {showPlanForm && (
        <motion.div className="modal-overlay" onClick={() => setShowPlanForm(false)}>
          <motion.div className="modal-content" onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.9 }} animate={{ scale: 1 }}>
            <h2>{editingId ? "Update" : "Add"} Variable Expense Plan</h2>
            <form onSubmit={handlePlanSubmit}>
              <div className="form-group">
                <label>Name *</label>
                <input value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Planned Amount *</label>
                  <input type="number" value={planForm.planned} onChange={(e) => setPlanForm({ ...planForm, planned: e.target.value })} required />
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
                <button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : (editingId ? "Update" : "Add")}</button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}

      {showActualForm && (
        <motion.div className="modal-overlay" onClick={() => setShowActualForm(false)}>
          <motion.div className="modal-content" onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.9 }} animate={{ scale: 1 }}>
            <h2>Add an Expense</h2>
            <form onSubmit={handleActualSubmit}>
              <div className="form-group">
                <label>Select Plan *</label>
                <select value={selectedPlanId || ""} onChange={(e) => setSelectedPlanId(e.target.value)} required>
                  <option value="">Select plan</option>
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} (planned ₹{p.planned.toLocaleString("en-IN")})
                    </option>
                  ))}
                </select>
                {plans.length === 0 && (
                  <small style={{ color: '#ef4444', display: 'block', marginTop: '4px' }}>
                    No expense plans available. Create a plan first before adding actual expenses.
                  </small>
                )}
              </div>
              <div className="form-group">
                <label>Amount *</label>
                <input type="number" value={actualForm.amount} onChange={(e) => setActualForm({ ...actualForm, amount: e.target.value })} required min="0" step="0.01" />
              </div>

              {/* v1.2: Subcategory Selection */}
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
                    <div style={{ display: 'flex', gap: '4px', flex: 1 }}>
                      <input
                        type="text"
                        placeholder="Enter new subcategory"
                        value={actualForm.newSubcategory}
                        onChange={(e) => setActualForm({ ...actualForm, newSubcategory: e.target.value })}
                        onBlur={handleAddSubcategory}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddSubcategory();
                          }
                        }}
                        style={{ flex: 1 }}
                        autoFocus
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* v1.2: Payment Mode Selection */}
              <div className="form-group">
                <label>Payment Mode *</label>
                <div className="payment-mode-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginTop: '8px' }}>
                  <div 
                    className="payment-mode-option" 
                    onClick={() => setActualForm({ ...actualForm, paymentMode: "UPI", creditCardId: "" })}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px', 
                      padding: '12px', 
                      border: `2px solid ${actualForm.paymentMode === "UPI" ? '#3b82f6' : '#e5e7eb'}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      backgroundColor: actualForm.paymentMode === "UPI" ? '#eff6ff' : 'transparent',
                      transition: 'all 0.2s'
                    }}
                  >
                    <FaMobileAlt size={20} />
                    <span>UPI</span>
                  </div>
                  <div 
                    className="payment-mode-option" 
                    onClick={() => setActualForm({ ...actualForm, paymentMode: "Cash", creditCardId: "" })}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px', 
                      padding: '12px', 
                      border: `2px solid ${actualForm.paymentMode === "Cash" ? '#3b82f6' : '#e5e7eb'}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      backgroundColor: actualForm.paymentMode === "Cash" ? '#eff6ff' : 'transparent',
                      transition: 'all 0.2s'
                    }}
                  >
                    <FaMoneyBillWave size={20} />
                    <span>Cash</span>
                  </div>
                  <div 
                    className="payment-mode-option" 
                    onClick={() => setActualForm({ ...actualForm, paymentMode: "ExtraCash", creditCardId: "" })}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px', 
                      padding: '12px', 
                      border: `2px solid ${actualForm.paymentMode === "ExtraCash" ? '#3b82f6' : '#e5e7eb'}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      backgroundColor: actualForm.paymentMode === "ExtraCash" ? '#eff6ff' : 'transparent',
                      transition: 'all 0.2s'
                    }}
                  >
                    <FaWallet size={20} />
                    <span>Extra Cash</span>
                    <small style={{ fontSize: '10px', color: '#6b7280' }}>(Doesn't affect funds)</small>
                  </div>
                  <div 
                    className="payment-mode-option" 
                    onClick={() => setActualForm({ ...actualForm, paymentMode: "CreditCard" })}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px', 
                      padding: '12px', 
                      border: `2px solid ${actualForm.paymentMode === "CreditCard" ? '#3b82f6' : '#e5e7eb'}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      backgroundColor: actualForm.paymentMode === "CreditCard" ? '#eff6ff' : 'transparent',
                      transition: 'all 0.2s'
                    }}
                  >
                    <FaCreditCard size={20} />
                    <span>Credit Card</span>
                    <small style={{ fontSize: '10px', color: '#6b7280' }}>(Billed later)</small>
                  </div>
                </div>
              </div>

              {/* v1.2: Credit Card Selection (conditional) */}
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
                <textarea value={actualForm.justification} onChange={(e) => setActualForm({ ...actualForm, justification: e.target.value })} rows={3} />
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => setShowActualForm(false)} disabled={isSubmitting}>Cancel</button>
                <button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Add"}</button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}

      <div className="actions-bar">
        <button className="secondary-button" onClick={() => setShowActualForm(true)}>
          + Add an Expense
        </button>
      </div>

      {loading ? (
        <SkeletonLoader type="list" count={5} />
      ) : plans.length === 0 ? (
        <EmptyState
          icon={<FaShoppingCart size={80} />}
          title="No Variable Expense Plans"
          description="Create plans to budget for groceries, dining, entertainment, and other variable monthly expenses"
          actionLabel="Create First Plan"
          onAction={() => setShowPlanForm(true)}
        />
      ) : (
        <div className="plans-list">
          {plans.map((plan, index) => {
            const overspend = plan.actualTotal > plan.planned;
            const percentUsed = plan.planned > 0 ? (plan.actualTotal / plan.planned) * 100 : 0;
            return (
              <motion.div
                key={plan.id}
                className={`plan-card ${overspend ? "overspend" : ""}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="plan-header">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <h3>{plan.name}</h3>
                    <div className="plan-actions">
                      <button onClick={() => { setEditingId(plan.id); setPlanForm({ ...planForm, name: plan.name, planned: plan.planned.toString(), category: plan.category }); setShowPlanForm(true); }} title="Edit" aria-label="Edit plan"><FaEdit size={16} /></button>
                      <button className="delete-btn" onClick={() => { if (confirm("Delete?")) api.deleteVariableExpensePlan(token, plan.id).then(() => loadPlans(true)); }} title="Delete" aria-label="Delete plan"><FaTrash size={16} /></button>
                    </div>
                  </div>
                </div>
                <div className="plan-stats">
                  <ProgressBar
                    current={plan.actualTotal}
                    target={plan.planned}
                    label={`Budget: ₹${plan.actualTotal.toLocaleString("en-IN")} of ₹${plan.planned.toLocaleString("en-IN")}`}
                    showPercentage={true}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, gap: 16 }}>
                    <div className="stat">
                      <span className="stat-label">Planned</span>
                      <span className={`stat-value ${plan.planned >= 100000 ? 'large-amount' : ''} ${plan.planned >= 1000000 ? 'extra-large-amount' : ''}`}>
                        ₹{plan.planned.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Actual</span>
                      <span className={`stat-value ${overspend ? "overspend" : ""} ${plan.actualTotal >= 100000 ? 'large-amount' : ''} ${plan.actualTotal >= 1000000 ? 'extra-large-amount' : ''}`}>
                        ₹{plan.actualTotal.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Remaining</span>
                      <span className={`stat-value ${overspend ? "overspend" : "good"} ${Math.abs(plan.actualTotal - plan.planned) >= 100000 ? 'large-amount' : ''} ${Math.abs(plan.actualTotal - plan.planned) >= 1000000 ? 'extra-large-amount' : ''}`}>
                        {overspend ? "-" : ""}₹{Math.abs(plan.actualTotal - plan.planned).toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                </div>
                {plan.actuals && plan.actuals.length > 0 && (
                  <div className="actuals-list">
                    <h4>Actual Expenses:</h4>
                    {plan.actuals.map((actual: any) => {
                      const paymentInfo = actual.paymentMode === "UPI" ? { icon: <FaMobileAlt size={12} />, label: "UPI", color: "#3b82f6" } :
                                        actual.paymentMode === "Cash" ? { icon: <FaMoneyBillWave size={12} />, label: "Cash", color: "#10b981" } :
                                        actual.paymentMode === "ExtraCash" ? { icon: <FaWallet size={12} />, label: "Extra Cash", color: "#8b5cf6" } :
                                        actual.paymentMode === "CreditCard" ? { icon: <FaCreditCard size={12} />, label: "Credit Card", color: "#f59e0b" } :
                                        { icon: <FaMoneyBillWave size={12} />, label: actual.paymentMode || "Cash", color: "#64748b" };
                      return (
                        <div key={actual.id} className="actual-item" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 'bold' }}>₹{actual.amount.toLocaleString("en-IN")}</span>
                          <span>{new Date(actual.incurredAt).toLocaleDateString()}</span>
                          {actual.subcategory && actual.subcategory !== "Unspecified" && (
                            <span style={{ 
                              backgroundColor: '#f3f4f6', 
                              padding: '2px 8px', 
                              borderRadius: '4px', 
                              fontSize: '12px',
                              color: '#4b5563'
                            }}>
                              {actual.subcategory}
                            </span>
                          )}
                          <span style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '4px',
                            color: paymentInfo.color,
                            fontSize: '12px',
                            fontWeight: '500'
                          }}>
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
    </div>
  );
}

