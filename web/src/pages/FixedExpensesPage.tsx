import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FaMoneyBillWave } from "react-icons/fa";
import { fetchDashboard, createFixedExpense, updateFixedExpense, deleteFixedExpense } from "../api";
import { SkeletonLoader } from "../components/SkeletonLoader";
import { EmptyState } from "../components/EmptyState";
import { StatusBadge } from "../components/StatusBadge";
import { ProgressBar } from "../components/ProgressBar";
import "./FixedExpensesPage.css";

interface FixedExpensesPageProps {
  token: string;
}

export function FixedExpensesPage({ token }: FixedExpensesPageProps) {
  const navigate = useNavigate();
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

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    try {
      const res = await fetchDashboard(token, "2025-01-15T00:00:00Z");
      console.log("📊 Dashboard response fixedExpenses:", res.data.fixedExpenses);
      setExpenses(res.data.fixedExpenses || []);
    } catch (e) {
      console.error("Failed to load expenses:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("💾 Submitting form with is_sip_flag:", formData.is_sip_flag);
    try {
      if (editingId) {
        const response = await updateFixedExpense(token, editingId, {
          name: formData.name,
          amount: Number(formData.amount),
          frequency: formData.frequency,
          category: formData.category,
          start_date: formData.start_date,
          end_date: formData.end_date,
          is_sip_flag: formData.is_sip_flag
        });
        console.log("✅ Update response:", response);
      } else {
        const response = await createFixedExpense(token, {
          name: formData.name,
          amount: Number(formData.amount),
          frequency: formData.frequency,
          category: formData.category,
          start_date: formData.start_date,
          end_date: formData.end_date,
          is_sip_flag: formData.is_sip_flag
        });
        console.log("✅ Create response:", response);
      }
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
      await loadExpenses();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleEdit = (expense: any) => {
    console.log("✏️ Editing expense:", expense);
    console.log("🔧 is_sip_flag value:", expense.is_sip_flag);
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
    if (!confirm("Delete this expense?")) return;
    try {
      await deleteFixedExpense(token, id);
      await loadExpenses();
    } catch (e: any) {
      alert(e.message);
    }
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
        <h1>Fixed Expenses</h1>
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
                <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }}>
                  Cancel
                </button>
                <button type="submit">{editingId ? "Update" : "Add"}</button>
              </div>
            </form>
          </div>
        </motion.div>
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
          {expenses.map((expense, index) => (
            <motion.div
              key={expense.id}
              className="expense-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <div className="expense-info">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3>{expense.name}</h3>
                    <div className="expense-details">
                      <span>₹{expense.amount.toLocaleString("en-IN")}</span>
                      <span>{expense.frequency}</span>
                      <span>{expense.category}</span>
                      {expense.is_sip_flag && <StatusBadge status="active" size="small" label="SIP" icon="🔄" />}
                      {expense.paid && <StatusBadge status="paid" size="small" />}
                    </div>
                  </div>
                  <div className="expense-actions">
                    <button onClick={() => handleEdit(expense)} title="Edit" aria-label="Edit expense">✏️</button>
                    <button onClick={() => handleDelete(expense.id)} className="delete-btn" title="Delete" aria-label="Delete expense">🗑️</button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

