import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FaChartBar } from "react-icons/fa";
import { fetchDashboard, createVariableExpensePlan, updateVariableExpensePlan, deleteVariableExpensePlan, addVariableActual } from "../api";
import { SkeletonLoader } from "../components/SkeletonLoader";
import { EmptyState } from "../components/EmptyState";
import { ProgressBar } from "../components/ProgressBar";
import "./VariableExpensesPage.css";

interface VariableExpensesPageProps {
  token: string;
}

export function VariableExpensesPage({ token }: VariableExpensesPageProps) {
  const navigate = useNavigate();
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
    justification: ""
  });

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const res = await fetchDashboard(token, "2025-01-15T00:00:00Z");
      setPlans(res.data.variablePlans || []);
    } catch (e) {
      console.error("Failed to load plans:", e);
    } finally {
      setLoading(false);
    }
  };

  const handlePlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateVariableExpensePlan(token, editingId, {
          name: planForm.name,
          planned: Number(planForm.planned),
          category: planForm.category,
          start_date: planForm.start_date,
          end_date: planForm.end_date
        });
      } else {
        await createVariableExpensePlan(token, {
          name: planForm.name,
          planned: Number(planForm.planned),
          category: planForm.category,
          start_date: planForm.start_date,
          end_date: planForm.end_date
        });
      }
      setShowPlanForm(false);
      setEditingId(null);
      await loadPlans();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleActualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanId) return;
    try {
      await addVariableActual(token, selectedPlanId, {
        amount: Number(actualForm.amount),
        incurred_at: "2025-01-15T00:00:00Z",
        justification: actualForm.justification || undefined
      });
      setShowActualForm(false);
      setActualForm({ amount: "", justification: "" });
      await loadPlans();
    } catch (e: any) {
      alert(e.message);
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
        <h1>Variable Expenses</h1>
        <button className="add-button" onClick={() => { setShowPlanForm(true); setEditingId(null); }}>
          + Add New Plan
        </button>
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
                <button type="button" onClick={() => setShowPlanForm(false)}>Cancel</button>
                <button type="submit">{editingId ? "Update" : "Add"}</button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}

      {showActualForm && (
        <motion.div className="modal-overlay" onClick={() => setShowActualForm(false)}>
          <motion.div className="modal-content" onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.9 }} animate={{ scale: 1 }}>
            <h2>Add Actual Expense</h2>
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
              </div>
              <div className="form-group">
                <label>Amount *</label>
                <input type="number" value={actualForm.amount} onChange={(e) => setActualForm({ ...actualForm, amount: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Justification (if overspend)</label>
                <textarea value={actualForm.justification} onChange={(e) => setActualForm({ ...actualForm, justification: e.target.value })} rows={3} />
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => setShowActualForm(false)}>Cancel</button>
                <button type="submit">Add</button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}

      <div className="actions-bar">
        <button className="secondary-button" onClick={() => setShowActualForm(true)}>
          + Add Actual Expense
        </button>
      </div>

      {loading ? (
        <SkeletonLoader type="list" count={5} />
      ) : plans.length === 0 ? (
        <EmptyState
          icon={<FaChartBar size={80} />}
          title="No Variable Expense Plans Yet"
          description="Track expenses that change monthly like groceries, entertainment, and shopping. Set budgets and monitor actual spending."
          actionLabel="Create First Plan"
          onAction={() => {
            setEditingId(null);
            setFormData({ name: "", planned: "", category: "General", start_date: "", end_date: "" });
            setShowForm(true);
          }}
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
                  <h3>{plan.name}</h3>
                  <div className="plan-actions">
                    <button onClick={() => { setEditingId(plan.id); setPlanForm({ ...planForm, name: plan.name, planned: plan.planned.toString(), category: plan.category }); setShowPlanForm(true); }}>
                      Update
                    </button>
                    <button className="delete-btn" onClick={() => { if (confirm("Delete?")) deleteVariableExpensePlan(token, plan.id).then(loadPlans); }}>
                      Delete
                    </button>
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
                      <span className="stat-value">₹{plan.planned.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Actual</span>
                      <span className={`stat-value ${overspend ? "overspend" : ""}`}>
                        ₹{plan.actualTotal.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Remaining</span>
                      <span className={`stat-value ${overspend ? "overspend" : "good"}`}>
                        {overspend ? "-" : ""}₹{Math.abs(plan.actualTotal - plan.planned).toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                </div>
                {plan.actuals && plan.actuals.length > 0 && (
                  <div className="actuals-list">
                    <h4>Actual Expenses:</h4>
                    {plan.actuals.map((actual: any) => (
                      <div key={actual.id} className="actual-item">
                        <span>₹{actual.amount.toLocaleString("en-IN")}</span>
                        <span>{new Date(actual.incurredAt).toLocaleDateString()}</span>
                        {actual.justification && <span className="justification">{actual.justification}</span>}
                      </div>
                    ))}
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

