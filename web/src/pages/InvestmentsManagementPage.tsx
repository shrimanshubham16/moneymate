import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { fetchDashboard, createInvestment, updateInvestment, deleteInvestment, pauseInvestment, resumeInvestment } from "../api";
import "./InvestmentsManagementPage.css";

interface InvestmentsManagementPageProps {
  token: string;
}

export function InvestmentsManagementPage({ token }: InvestmentsManagementPageProps) {
  const navigate = useNavigate();
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

  useEffect(() => {
    loadInvestments();
  }, []);

  const loadInvestments = async () => {
    try {
      const res = await fetchDashboard(token, "2025-01-15T00:00:00Z");
      setInvestments(res.data.investments || []);
    } catch (e) {
      console.error("Failed to load investments:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateInvestment(token, editingId, {
          name: formData.name,
          goal: formData.goal,
          monthlyAmount: Number(formData.monthlyAmount),
          status: formData.status
        });
      } else {
        await createInvestment(token, {
          name: formData.name,
          goal: formData.goal,
          monthlyAmount: Number(formData.monthlyAmount),
          status: formData.status
        });
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({ name: "", goal: "", monthlyAmount: "", status: "active" });
      await loadInvestments();
    } catch (e: any) {
      alert(e.message);
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
      await deleteInvestment(token, id);
      await loadInvestments();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleTogglePause = async (inv: any) => {
    try {
      if (inv.status === "active") {
        await pauseInvestment(token, inv.id);
      } else {
        await resumeInvestment(token, inv.id);
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

      {loading ? (
        <div className="loading">Loading...</div>
      ) : (
        <div className="investments-list">
          {investments.length === 0 ? (
            <div className="empty-state">No investments. Add one to get started!</div>
          ) : (
            investments.map((inv, index) => (
              <motion.div
                key={inv.id}
                className="investment-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="investment-info">
                  <h3>{inv.name}</h3>
                  <div className="investment-details">
                    <span>Goal: {inv.goal}</span>
                    <span>₹{inv.monthlyAmount.toLocaleString("en-IN")}/month</span>
                    <span className={`status ${inv.status}`}>
                      {inv.status === "active" ? "● Active" : "⏸ Paused"}
                    </span>
                    {inv.paid && <span className="paid-badge">✓ Paid</span>}
                  </div>
                </div>
                <div className="investment-actions">
                  <button onClick={() => handleEdit(inv)}>Edit</button>
                  <button onClick={() => handleTogglePause(inv)}>
                    {inv.status === "active" ? "Pause" : "Resume"}
                  </button>
                  <button onClick={() => handleDelete(inv.id)} className="delete-btn">
                    Delete
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

