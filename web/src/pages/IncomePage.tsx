import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FaMoneyBillWave, FaPlus, FaEdit, FaLock, FaUserCircle } from "react-icons/fa";
import { useEncryptedApiCalls } from "../hooks/useEncryptedApiCalls";
import { useSharedView } from "../hooks/useSharedView";
import { PageInfoButton } from "../components/PageInfoButton";
import { SharedViewBanner } from "../components/SharedViewBanner";
import { SkeletonLoader } from "../components/SkeletonLoader";
import { isFeatureEnabled } from "../features";
import { Modal } from "../components/Modal";
import { invalidateDashboardCache } from "../utils/cacheInvalidation";
import "./IncomePage.css";

interface IncomePageProps {
  token: string;
}

export function IncomePage({ token }: IncomePageProps) {
  const navigate = useNavigate();
  const api = useEncryptedApiCalls();
  const [incomes, setIncomes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    source: "",
    amount: "",
    frequency: "monthly"
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const hasFetchedRef = useRef(false);
  const lastViewRef = useRef<string>("");

  // Shared view support
  const { selectedView, isSharedView, getViewParam, getOwnerName, isOwnItem, formatSharedField } = useSharedView(token);

  useEffect(() => {
    if (hasFetchedRef.current && lastViewRef.current === selectedView) return;
    hasFetchedRef.current = true;
    lastViewRef.current = selectedView;
    loadIncomes();
  }, [selectedView]);

  const loadIncomes = async () => {
    try {
      const res = await api.fetchDashboard(token, new Date().toISOString(), getViewParam());
      setIncomes(res.data.incomes || []);
    } catch (e: any) {
      console.error("Failed to load incomes:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        source: form.source,
        amount: Number(form.amount),
        frequency: form.frequency
      };
      if (editingId && isFeatureEnabled("income_update_btn")) {
        await api.updateIncome(token, editingId, payload);
      } else {
        await api.createIncome(token, payload);
      }
      setShowForm(false);
      setEditingId(null);
      setForm({ source: "", amount: "", frequency: "monthly" });
      invalidateDashboardCache();
      await loadIncomes();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleDelete = async (id: string) => {
    setConfirmDeleteId(null);
    try {
      await api.deleteIncome(token, id);
      setIncomes(prev => prev.filter(inc => inc.id !== id));
      invalidateDashboardCache();
      await loadIncomes();
    } catch (e: any) {
      setErrorMsg(e.message);
      await loadIncomes();
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
              description="Everything starts here — your salary, freelance gigs, rental income, dividends, or any money coming in. FinFlow uses your total monthly income as the starting point to calculate everything: health score, available funds, and spending headroom."
              impact="Income is the foundation of your entire financial plan. Every rupee you add here increases your available funds and pushes your health score up. If something changes — a raise, a side gig, or a lost contract — update it here first."
              howItWorks={[
                "Add income sources with amount and frequency (monthly, quarterly, yearly)",
                "All incomes are auto-converted to monthly equivalents for health calculations",
                "Total monthly income minus all obligations = your available funds",
                "In shared view, you can see combined household income from all members",
                "Edit or remove sources anytime as your financial situation evolves"
              ]}
            />
          </div>
          {/* Only show Add button for own view */}
          {!isSharedView && (
            <button className="add-income-btn" onClick={() => { setShowForm(true); setEditingId(null); }}>
              <FaPlus style={{ marginRight: 6 }} />
              Add Income
            </button>
          )}
        </div>
      </div>

      {/* Shared view banner */}
      <SharedViewBanner />

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
        <SkeletonLoader type="list" count={5} />
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
              {incomes.map((income) => {
                const itemUserId = income.userId || income.user_id;
                const isOwn = !itemUserId || isOwnItem(itemUserId);
                return (
                  <div key={income.id} className={`income-card ${!isOwn ? "shared-item" : ""}`}>
                    <div className="income-header">
                      <h3>{formatSharedField(income.source, isOwn)}</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {isSharedView && (
                          <span className="owner-badge" style={{ fontSize: 11, color: isOwn ? '#10b981' : '#8b5cf6', display: 'flex', alignItems: 'center', gap: 4 }}>
                            {isOwn ? <FaUserCircle size={12} /> : <FaLock size={12} />}
                            {getOwnerName(itemUserId)}
                          </span>
                        )}
                        {isOwn ? (
                          <>
                            {isFeatureEnabled("income_update_btn") && (
                              <button
                                className="edit-btn"
                                onClick={() => {
                                  setEditingId(income.id);
                                  setForm({ source: income.source, amount: income.amount.toString(), frequency: income.frequency });
                                  setShowForm(true);
                                }}
                                title="Edit income source"
                              >
                                <FaEdit />
                              </button>
                            )}
                            <button
                              className="delete-btn"
                              onClick={() => setConfirmDeleteId(income.id)}
                              title="Delete income source"
                            >
                              ✕
                            </button>
                          </>
                        ) : (
                          <span style={{ fontSize: 11, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <FaLock size={10} /> View Only
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="income-details">
                      <p className="amount">₹{(income.amount || 0).toLocaleString()}</p>
                      <p className="frequency">{income.frequency}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {showForm && (
            <Modal
              isOpen={showForm}
              onClose={() => setShowForm(false)}
              title={editingId ? "Edit Income" : "Add Income"}
              footer={
                <>
                  <button onClick={() => setShowForm(false)}>Cancel</button>
                  <button type="submit" form="income-form" className="primary">
                    {editingId ? "Update Income" : "Add Income"}
                  </button>
                </>
              }
            >
              <form id="income-form" onSubmit={handleSubmit}>
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
              </form>
            </Modal>
          )}

          {confirmDeleteId && (
            <Modal
              isOpen={!!confirmDeleteId}
              onClose={() => setConfirmDeleteId(null)}
              title="Delete Income Source"
              footer={
                <>
                  <button onClick={() => setConfirmDeleteId(null)}>Cancel</button>
                  <button className="primary" style={{ background: '#ef4444' }} onClick={() => handleDelete(confirmDeleteId)}>Delete</button>
                </>
              }
            >
              <p>Are you sure you want to delete this income source? This action cannot be undone.</p>
            </Modal>
          )}

          {errorMsg && (
            <Modal
              isOpen={!!errorMsg}
              onClose={() => setErrorMsg(null)}
              title="Error"
              footer={
                <button className="primary" onClick={() => setErrorMsg(null)}>OK</button>
              }
            >
              <p>{errorMsg}</p>
            </Modal>
          )}
        </>
      )}
    </div>
  );
}
