import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FaMoneyBillWave, FaPlus, FaEdit, FaLock, FaUserCircle, FaChartLine, FaToggleOn, FaToggleOff, FaExternalLinkAlt } from "react-icons/fa";
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
    frequency: "monthly",
    incomeType: "regular" as "regular" | "rsu",
    includeInHealth: true,
    rsuTicker: "",
    rsuGrantCount: "",
    rsuVestingSchedule: "quarterly" as "monthly" | "quarterly" | "yearly",
    rsuCurrency: "USD",
    rsuStockPrice: ""
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

  const resetForm = () => {
    setForm({
      source: "", amount: "", frequency: "monthly",
      incomeType: "regular", includeInHealth: true,
      rsuTicker: "", rsuGrantCount: "", rsuVestingSchedule: "quarterly",
      rsuCurrency: "USD", rsuStockPrice: ""
    });
  };

  // Calculate monthly income from RSU fields
  const calculateRsuMonthly = () => {
    const grantCount = parseFloat(form.rsuGrantCount) || 0;
    const stockPrice = parseFloat(form.rsuStockPrice) || 0;
    if (grantCount === 0 || stockPrice === 0) return 0;
    
    const vestingPeriodsPerYear = form.rsuVestingSchedule === "monthly" ? 12 :
      form.rsuVestingSchedule === "quarterly" ? 4 : 1;
    const sharesPerVest = grantCount / vestingPeriodsPerYear;
    const annualValue = sharesPerVest * vestingPeriodsPerYear * stockPrice;
    return annualValue / 12; // Monthly equivalent in stock currency
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isRsu = form.incomeType === "rsu";
      
      // For RSU, calculate the amount automatically
      let amount = Number(form.amount);
      if (isRsu) {
        amount = calculateRsuMonthly();
        if (amount === 0) {
          setErrorMsg("Please fill in RSU grant count and stock price to calculate income.");
          return;
        }
      }

      const payload: any = {
        source: form.source,
        amount,
        frequency: isRsu ? "monthly" : form.frequency,
        include_in_health: form.includeInHealth,
        income_type: form.incomeType
      };

      if (isRsu) {
        payload.rsu_ticker = form.rsuTicker;
        payload.rsu_grant_count = parseInt(form.rsuGrantCount);
        payload.rsu_vesting_schedule = form.rsuVestingSchedule;
        payload.rsu_currency = form.rsuCurrency;
        payload.rsu_stock_price = parseFloat(form.rsuStockPrice);
      }

      if (editingId && isFeatureEnabled("income_update_btn")) {
        await api.updateIncome(token, editingId, payload);
      } else {
        await api.createIncome(token, payload);
      }
      setShowForm(false);
      setEditingId(null);
      resetForm();
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

  const handleToggleHealth = async (income: any) => {
    try {
      const newValue = !income.includeInHealth;
      await api.updateIncome(token, income.id, { include_in_health: newValue });
      // Optimistic update
      setIncomes(prev => prev.map(inc => inc.id === income.id ? { ...inc, includeInHealth: newValue } : inc));
      invalidateDashboardCache();
    } catch (e: any) {
      setErrorMsg("Failed to update: " + e.message);
    }
  };

  const totalMonthlyIncome = incomes.reduce((sum, income) => {
    const monthly = income.frequency === "monthly" ? income.amount :
                   income.frequency === "quarterly" ? income.amount / 3 :
                   income.amount / 12;
    return sum + monthly;
  }, 0);

  const healthIncomeTotal = incomes
    .filter(inc => inc.includeInHealth !== false)
    .reduce((sum, income) => {
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
              description="Everything starts here — your salary, freelance gigs, rental income, RSU grants, dividends, or any money coming in. FinFlow uses your total monthly income as the starting point to calculate everything: health score, available funds, and spending headroom."
              impact="Income is the foundation of your entire financial plan. Every rupee you add here increases your available funds and pushes your health score up. You can toggle any income source off from health calculations if you want to be conservative."
              howItWorks={[
                "Add income sources with amount and frequency (monthly, quarterly, yearly)",
                "For RSU income: enter ticker, grant count, vesting schedule, and stock price",
                "Toggle 'Include in Health' to control whether each income affects your health score",
                "All incomes are auto-converted to monthly equivalents for calculations",
                "In shared view, you can see combined household income from all members"
              ]}
            />
          </div>
          {!isSharedView && (
            <button className="add-income-btn" onClick={() => { setShowForm(true); setEditingId(null); resetForm(); }}>
              <FaPlus style={{ marginRight: 6 }} />
              Add Income
            </button>
          )}
        </div>
      </div>

      <SharedViewBanner />

      <div className="income-summary">
        <div className="summary-card">
          <h3>Total Monthly Income</h3>
          <p className="amount">₹{Math.round(totalMonthlyIncome).toLocaleString()}</p>
        </div>
        <div className="summary-card">
          <h3>Health-Included Income</h3>
          <p className="amount" style={{ color: healthIncomeTotal < totalMonthlyIncome ? '#f59e0b' : '#10b981' }}>
            ₹{Math.round(healthIncomeTotal).toLocaleString()}
          </p>
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
                const isRsu = income.incomeType === 'rsu';
                const excludedFromHealth = income.includeInHealth === false;
                return (
                  <div key={income.id} className={`income-card ${!isOwn ? "shared-item" : ""} ${excludedFromHealth ? "excluded-from-health" : ""}`}>
                    <div className="income-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <h3>{formatSharedField(income.source, isOwn)}</h3>
                        {isRsu && (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            fontSize: 10, fontWeight: 700, color: '#3b82f6',
                            background: 'rgba(59, 130, 246, 0.12)', padding: '2px 8px', borderRadius: 12,
                            border: '1px solid rgba(59, 130, 246, 0.25)', letterSpacing: '0.5px', textTransform: 'uppercase'
                          }}>
                            <FaChartLine size={10} /> RSU
                          </span>
                        )}
                        {excludedFromHealth && (
                          <span style={{
                            fontSize: 10, fontWeight: 600, color: '#6b7280',
                            background: 'rgba(107, 114, 128, 0.1)', padding: '2px 8px', borderRadius: 12,
                            border: '1px solid rgba(107, 114, 128, 0.2)'
                          }}>
                            Not in Health
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {isSharedView && (
                          <span className="owner-badge" style={{ fontSize: 11, color: isOwn ? '#10b981' : '#8b5cf6', display: 'flex', alignItems: 'center', gap: 4 }}>
                            {isOwn ? <FaUserCircle size={12} /> : <FaLock size={12} />}
                            {getOwnerName(itemUserId)}
                          </span>
                        )}
                        {isOwn && (
                          <button
                            className="health-toggle-btn"
                            onClick={() => handleToggleHealth(income)}
                            title={excludedFromHealth ? "Include in health calculation" : "Exclude from health calculation"}
                            style={{ color: excludedFromHealth ? '#6b7280' : '#10b981' }}
                          >
                            {excludedFromHealth ? <FaToggleOff size={20} /> : <FaToggleOn size={20} />}
                          </button>
                        )}
                        {isOwn ? (
                          <>
                            {isFeatureEnabled("income_update_btn") && (
                              <button
                                className="edit-btn"
                                onClick={() => {
                                  setEditingId(income.id);
                                  setForm({
                                    source: income.source,
                                    amount: income.amount.toString(),
                                    frequency: income.frequency,
                                    incomeType: income.incomeType || "regular",
                                    includeInHealth: income.includeInHealth !== false,
                                    rsuTicker: income.rsuTicker || "",
                                    rsuGrantCount: income.rsuGrantCount ? String(income.rsuGrantCount) : "",
                                    rsuVestingSchedule: income.rsuVestingSchedule || "quarterly",
                                    rsuCurrency: income.rsuCurrency || "USD",
                                    rsuStockPrice: income.rsuStockPrice ? String(income.rsuStockPrice) : ""
                                  });
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
                      {isRsu && income.rsuTicker && (
                        <p className="rsu-info" style={{ fontSize: 12, color: 'var(--text-tertiary, rgba(255,255,255,0.5))', marginTop: 4 }}>
                          {income.rsuTicker} · {income.rsuGrantCount} shares · {income.rsuVestingSchedule} vesting · {income.rsuCurrency} {income.rsuStockPrice}/share
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {showForm && (
            <Modal
              isOpen={showForm}
              onClose={() => { setShowForm(false); resetForm(); }}
              title={editingId ? "Edit Income" : "Add Income"}
              footer={
                <>
                  <button onClick={() => { setShowForm(false); resetForm(); }}>Cancel</button>
                  <button type="submit" form="income-form" className="primary">
                    {editingId ? "Update Income" : "Add Income"}
                  </button>
                </>
              }
            >
              <form id="income-form" onSubmit={handleSubmit}>
                {/* Income Type Toggle */}
                <div className="form-group">
                  <label>Income Type</label>
                  <div className="income-type-toggle">
                    <button
                      type="button"
                      className={`type-btn ${form.incomeType === 'regular' ? 'active' : ''}`}
                      onClick={() => setForm({ ...form, incomeType: 'regular' })}
                    >
                      Regular
                    </button>
                    <button
                      type="button"
                      className={`type-btn ${form.incomeType === 'rsu' ? 'active' : ''}`}
                      onClick={() => setForm({ ...form, incomeType: 'rsu' })}
                    >
                      <FaChartLine style={{ marginRight: 4 }} /> RSU
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label>{form.incomeType === 'rsu' ? 'Label (e.g., Company RSU)' : 'Source (e.g., Salary, Freelance)'}</label>
                  <input
                    type="text"
                    value={form.source}
                    onChange={(e) => setForm({ ...form, source: e.target.value })}
                    required
                    placeholder={form.incomeType === 'rsu' ? 'Google RSU' : 'Salary'}
                  />
                </div>

                {form.incomeType === 'regular' ? (
                  <>
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
                  </>
                ) : (
                  <>
                    {/* RSU Fields */}
                    <div className="form-group">
                      <label>
                        Stock Ticker
                        <a 
                          href={`https://www.google.com/finance/quote/${form.rsuTicker || 'AAPL'}:NASDAQ`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ marginLeft: 8, fontSize: 11, color: 'var(--accent-cyan, #22d3ee)' }}
                          title="Look up on Google Finance"
                        >
                          <FaExternalLinkAlt size={10} /> Look up
                        </a>
                      </label>
                      <input
                        type="text"
                        value={form.rsuTicker}
                        onChange={(e) => setForm({ ...form, rsuTicker: e.target.value.toUpperCase() })}
                        required
                        placeholder="GOOGL"
                      />
                    </div>
                    <div className="form-group">
                      <label>Annual Grant Count (shares/year)</label>
                      <input
                        type="number"
                        value={form.rsuGrantCount}
                        onChange={(e) => setForm({ ...form, rsuGrantCount: e.target.value })}
                        required
                        min="1"
                        placeholder="100"
                      />
                    </div>
                    <div className="form-group">
                      <label>Vesting Schedule</label>
                      <select
                        value={form.rsuVestingSchedule}
                        onChange={(e) => setForm({ ...form, rsuVestingSchedule: e.target.value as any })}
                      >
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                    </div>
                    <div className="form-row">
                      <div className="form-group" style={{ flex: 1 }}>
                        <label>Stock Currency</label>
                        <select
                          value={form.rsuCurrency}
                          onChange={(e) => setForm({ ...form, rsuCurrency: e.target.value })}
                        >
                          <option value="USD">USD</option>
                          <option value="EUR">EUR</option>
                          <option value="GBP">GBP</option>
                          <option value="INR">INR</option>
                          <option value="JPY">JPY</option>
                          <option value="CAD">CAD</option>
                          <option value="AUD">AUD</option>
                        </select>
                      </div>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label>Stock Price ({form.rsuCurrency}/share)</label>
                        <input
                          type="number"
                          value={form.rsuStockPrice}
                          onChange={(e) => setForm({ ...form, rsuStockPrice: e.target.value })}
                          required
                          min="0"
                          step="0.01"
                          placeholder="150.00"
                        />
                      </div>
                    </div>
                    
                    {/* Calculated preview */}
                    {calculateRsuMonthly() > 0 && (
                      <div style={{
                        marginTop: 12, padding: 12, borderRadius: 10,
                        background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)'
                      }}>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Calculated Monthly Income
                        </div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: '#10b981' }}>
                          {form.rsuCurrency} {calculateRsuMonthly().toLocaleString(undefined, { maximumFractionDigits: 2 })}/month
                        </div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
                          = {form.rsuGrantCount} shares/yr × {form.rsuCurrency} {form.rsuStockPrice}/share ÷ 12
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Include in Health Toggle */}
                <div className="form-group" style={{ marginTop: 16 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                    onClick={() => setForm({ ...form, includeInHealth: !form.includeInHealth })}
                  >
                    <span style={{ color: form.includeInHealth ? '#10b981' : '#6b7280' }}>
                      {form.includeInHealth ? <FaToggleOn size={24} /> : <FaToggleOff size={24} />}
                    </span>
                    Include in Health Calculation
                  </label>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-tertiary, rgba(255,255,255,0.4))' }}>
                    {form.includeInHealth
                      ? "This income will be counted in your health score."
                      : "This income will NOT affect your health score (conservative approach)."}
                  </p>
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
