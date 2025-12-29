import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaMoneyBillWave, FaPlus } from "react-icons/fa";
import { fetchDashboard, createIncome, deleteIncome } from "../api";
import { PageInfoButton } from "../components/PageInfoButton";
import "./IncomePage.css";

interface IncomePageProps {
  token: string;
}

export function IncomePage({ token }: IncomePageProps) {
  const navigate = useNavigate();
  const [incomes, setIncomes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    source: "",
    amount: "",
    frequency: "monthly"
  });

  useEffect(() => {
    loadIncomes();
  }, []);

  const loadIncomes = async () => {
    try {
      const res = await fetchDashboard(token, "2025-01-15T00:00:00Z");
      setIncomes(res.data.incomes || []);
    } catch (e) {
      console.error("Failed to load incomes:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createIncome(token, {
        source: form.source,
        amount: Number(form.amount),
        frequency: form.frequency
      });
      setShowForm(false);
      setForm({ source: "", amount: "", frequency: "monthly" });
      await loadIncomes();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this income source?")) return;
    try {
      await deleteIncome(token, id);
      await loadIncomes();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const totalMonthlyIncome = incomes.reduce((sum, income) => {
    const monthly = income.frequency === "monthly" ? income.amount :
                   income.frequency === "quarterly" ? income.amount / 3 :
                   income.amount / 12;
    return sum + monthly;
  }, 0);

  return (
    <div className="income-page">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate("/settings/plan-finances")}>
          ← Back
        </button>
        <div className="header-content">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <h1><FaMoneyBillWave style={{ marginRight: 8, verticalAlign: 'middle' }} />Income Sources</h1>
            <PageInfoButton
              title="Income Sources"
              description="Track all your income sources including salary, freelance work, investments, and other earnings. This is the foundation of your financial planning."
              impact="Your total monthly income directly affects your available funds and health score. Higher income means more money available for expenses, investments, and savings."
              howItWorks={[
                "Add income sources with their amounts and frequency (monthly, quarterly, yearly)",
                "The app automatically converts all incomes to monthly equivalents for calculations",
                "Your total monthly income is used to calculate available funds and health score",
                "You can edit or delete income sources anytime as your situation changes"
              ]}
            />
          </div>
          <button className="add-income-btn" onClick={() => setShowForm(true)}>
            <FaPlus style={{ marginRight: 6 }} />
            Add Income
          </button>
        </div>
      </div>

      <div className="income-summary">
        <div className="summary-card">
          <h3>Total Monthly Income</h3>
          <p className="amount">₹{Math.round(totalMonthlyIncome).toLocaleString()}</p>
        </div>
        <div className="summary-card">
          <h3>Income Sources</h3>
          <p className="count">{incomes.length}</p>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading...</div>
      ) : (
        <>
          {incomes.length === 0 && !showForm ? (
            <div className="empty-state-container">
              <div className="empty-state">
                <FaMoneyBillWave size={64} color="#8b5cf6" style={{ marginBottom: 16 }} />
                <p>No income sources yet. Add your first one!</p>
              </div>
            </div>
          ) : (
            <div className="income-list">
              {incomes.map((income) => (
                <div key={income.id} className="income-card">
                  <div className="income-header">
                    <h3>{income.source}</h3>
                    <button
                      className="delete-btn"
                      onClick={() => handleDelete(income.id)}
                      title="Delete income source"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="income-details">
                    <p className="amount">₹{income.amount.toLocaleString()}</p>
                    <p className="frequency">{income.frequency}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {showForm && (
            <div className="modal-overlay" onClick={() => setShowForm(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>Add New Income Source</h2>
                  <button onClick={() => setShowForm(false)}>✕</button>
                </div>
                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label>Source (e.g., Salary, Freelance, Business)</label>
                    <input
                      type="text"
                      value={form.source}
                      onChange={(e) => setForm({ ...form, source: e.target.value })}
                      required
                      placeholder="Salary"
                    />
                  </div>
                  <div className="form-group">
                    <label>Amount</label>
                    <input
                      type="number"
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                      required
                      min="0"
                      placeholder="50000"
                    />
                  </div>
                  <div className="form-group">
                    <label>Frequency</label>
                    <select
                      value={form.frequency}
                      onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                    >
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                  <div className="form-actions">
                    <button type="button" onClick={() => setShowForm(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="primary">
                      Add Income
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

