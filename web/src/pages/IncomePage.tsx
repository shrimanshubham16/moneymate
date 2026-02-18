import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FaMoneyBillWave, FaPlus, FaEdit, FaLock, FaUserCircle, FaChartLine, FaToggleOn, FaToggleOff, FaSync, FaCheckCircle, FaInfoCircle, FaTimesCircle } from "react-icons/fa";
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

interface StockQuoteResult {
  ticker: string;
  name: string;
  price: number;
  currency: string;
  exchange: string;
  convertedPrice?: number;
  conversionRate?: number;
  convertedCurrency?: string;
}

export function IncomePage({ token }: IncomePageProps) {
  const navigate = useNavigate();
  const api = useEncryptedApiCalls();
  const [incomes, setIncomes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [userCurrency, setUserCurrency] = useState("INR");
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
    rsuStockPrice: "",
    rsuTaxRate: "33",
    rsuExpectedDecline: "20",
    rsuConversionRate: ""
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const hasFetchedRef = useRef(false);
  const lastViewRef = useRef<string>("");

  // Stock verification state
  const [verifying, setVerifying] = useState(false);
  const [verifiedQuote, setVerifiedQuote] = useState<StockQuoteResult | null>(null);
  const [verifiedTicker, setVerifiedTicker] = useState<string>("");
  const [showRsuInfo, setShowRsuInfo] = useState(false);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

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
      // Get user currency from preferences
      if (res.data.preferences?.currency) {
        setUserCurrency(res.data.preferences.currency);
      }
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
      rsuCurrency: "USD", rsuStockPrice: "", rsuTaxRate: "33",
      rsuExpectedDecline: "20", rsuConversionRate: ""
    });
    setVerifiedQuote(null);
    setVerifiedTicker("");
  };

  // Calculate net annual shares after tax
  const getNetAnnualShares = () => {
    const grantCount = parseFloat(form.rsuGrantCount) || 0;
    const taxRate = parseFloat(form.rsuTaxRate) || 0;
    return Math.round(grantCount * (1 - taxRate / 100));
  };

  // Get stock price in user currency
  const getPriceInUserCurrency = () => {
    const stockPrice = parseFloat(form.rsuStockPrice) || 0;
    const conversionRate = parseFloat(form.rsuConversionRate) || 0;
    if (form.rsuCurrency === userCurrency || conversionRate === 0) return stockPrice;
    return stockPrice * conversionRate;
  };

  // Calculate monthly income from RSU fields (after tax, in user currency)
  const calculateRsuMonthly = () => {
    const netShares = getNetAnnualShares();
    const priceInUserCur = getPriceInUserCurrency();
    if (netShares === 0 || priceInUserCur === 0) return 0;
    return (netShares * priceInUserCur) / 12;
  };

  // Calculate conservative annual (for bombs display)
  const calculateConservativeAnnual = () => {
    const netShares = getNetAnnualShares();
    const priceInUserCur = getPriceInUserCurrency();
    const decline = parseFloat(form.rsuExpectedDecline) || 0;
    if (netShares === 0 || priceInUserCur === 0) return 0;
    return netShares * priceInUserCur * (1 - decline / 100);
  };

  // Verify stock via Yahoo Finance
  const handleVerifyStock = async () => {
    if (!form.rsuTicker.trim()) return;
    setVerifying(true);
    setVerifiedQuote(null);
    try {
      const res = await api.fetchStockQuote(token, form.rsuTicker.trim(), userCurrency);
      const quote = res.data;
      setVerifiedQuote(quote);
      setVerifiedTicker(form.rsuTicker.trim().toUpperCase());
    } catch (e: any) {
      setErrorMsg("Could not verify stock: " + e.message);
    } finally {
      setVerifying(false);
    }
  };

  // Confirm verified stock
  const handleConfirmStock = () => {
    if (!verifiedQuote) return;
    const updates: any = {
      rsuStockPrice: String(verifiedQuote.price),
      rsuCurrency: verifiedQuote.currency
    };
    if (verifiedQuote.conversionRate) {
      updates.rsuConversionRate = String(verifiedQuote.conversionRate);
    } else {
      updates.rsuConversionRate = "";
    }
    setForm(prev => ({ ...prev, ...updates }));
  };

  // Refresh price for an existing RSU income card
  const handleRefreshPrice = async (income: any) => {
    if (!income.rsuTicker) return;
    setRefreshingId(income.id);
    try {
      const res = await api.fetchStockQuote(token, income.rsuTicker, userCurrency);
      const quote = res.data;
      const taxRate = income.rsuTaxRate ?? 33;
      const netShares = Math.round((income.rsuGrantCount || 0) * (1 - taxRate / 100));
      const priceInUserCur = quote.conversionRate ? quote.price * quote.conversionRate : quote.price;
      const newAmount = (netShares * priceInUserCur) / 12;

      // Optimistic update on the card immediately
      setIncomes(prev => prev.map(inc => inc.id === income.id ? {
        ...inc,
        amount: Math.round(newAmount * 100) / 100,
        rsuStockPrice: quote.price,
        rsuConversionRate: quote.conversionRate || inc.rsuConversionRate
      } : inc));

      await api.updateIncome(token, income.id, {
        amount: Math.round(newAmount * 100) / 100,
        rsu_stock_price: quote.price,
        rsu_conversion_rate: quote.conversionRate || undefined
      });
      invalidateDashboardCache();
      loadIncomes(); // background refresh
    } catch (e: any) {
      setErrorMsg("Failed to refresh price: " + e.message);
    } finally {
      setRefreshingId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isRsu = form.incomeType === "rsu";
    
    let amount = Number(form.amount);
    if (isRsu) {
      amount = calculateRsuMonthly();
      if (amount === 0) {
        setErrorMsg("Please fill in RSU grant count and verify stock price to calculate income.");
        return;
      }
      amount = Math.round(amount * 100) / 100;
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
      payload.rsu_tax_rate = parseFloat(form.rsuTaxRate) || 33;
      payload.rsu_expected_decline = parseFloat(form.rsuExpectedDecline) || 20;
      if (form.rsuConversionRate) {
        payload.rsu_conversion_rate = parseFloat(form.rsuConversionRate);
      }
    }

    // Build optimistic income object for instant UI
    const tempId = `temp-${Date.now()}`;
    const optimisticIncome: any = {
      id: editingId || tempId,
      source: form.source,
      amount,
      frequency: isRsu ? "monthly" : form.frequency,
      includeInHealth: form.includeInHealth,
      incomeType: form.incomeType,
      ...(isRsu ? {
        rsuTicker: form.rsuTicker,
        rsuGrantCount: parseInt(form.rsuGrantCount),
        rsuVestingSchedule: form.rsuVestingSchedule,
        rsuCurrency: form.rsuCurrency,
        rsuStockPrice: parseFloat(form.rsuStockPrice),
        rsuTaxRate: parseFloat(form.rsuTaxRate) || 33,
        rsuExpectedDecline: parseFloat(form.rsuExpectedDecline) || 20,
        rsuConversionRate: form.rsuConversionRate ? parseFloat(form.rsuConversionRate) : undefined
      } : {})
    };

    // Optimistic update: show item immediately
    if (editingId) {
      setIncomes(prev => prev.map(inc => inc.id === editingId ? { ...inc, ...optimisticIncome } : inc));
    } else {
      setIncomes(prev => [optimisticIncome, ...prev]);
    }

    // Close form immediately
    const prevEditingId = editingId;
    setShowForm(false);
    setEditingId(null);
    resetForm();

    try {
      if (prevEditingId && isFeatureEnabled("income_update_btn")) {
        await api.updateIncome(token, prevEditingId, payload);
      } else {
        const res = await api.createIncome(token, payload);
        // Replace temp item with real server response
        if (res?.data) {
          setIncomes(prev => prev.map(inc => inc.id === tempId ? { ...inc, ...res.data, id: res.data.id } : inc));
        }
      }
      invalidateDashboardCache();
      // Background refresh — fire-and-forget (don't await)
      loadIncomes();
    } catch (e: any) {
      setErrorMsg(e.message);
      // Rollback optimistic update
      if (prevEditingId) {
        loadIncomes();
      } else {
        setIncomes(prev => prev.filter(inc => inc.id !== tempId));
      }
    }
  };

  const handleDelete = async (id: string) => {
    setConfirmDeleteId(null);
    // Optimistic removal
    const prevIncomes = incomes;
    setIncomes(prev => prev.filter(inc => inc.id !== id));
    try {
      await api.deleteIncome(token, id);
      invalidateDashboardCache();
      loadIncomes(); // background refresh
    } catch (e: any) {
      setErrorMsg(e.message);
      setIncomes(prevIncomes); // rollback
    }
  };

  const handleToggleHealth = async (income: any) => {
    try {
      const newValue = !income.includeInHealth;
      await api.updateIncome(token, income.id, { include_in_health: newValue });
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

  const formatCurrency = (val: number, currency?: string) => {
    const cur = currency || userCurrency;
    if (cur === 'INR') return `₹${Math.round(val).toLocaleString('en-IN')}`;
    if (cur === 'USD') return `$${Math.round(val).toLocaleString('en-US')}`;
    if (cur === 'EUR') return `€${Math.round(val).toLocaleString('en-US')}`;
    if (cur === 'GBP') return `£${Math.round(val).toLocaleString('en-US')}`;
    return `${cur} ${Math.round(val).toLocaleString()}`;
  };

  // Ticker changed - reset verification
  const handleTickerChange = (value: string) => {
    setForm(prev => ({ ...prev, rsuTicker: value.toUpperCase() }));
    if (value.toUpperCase() !== verifiedTicker) {
      setVerifiedQuote(null);
      setVerifiedTicker("");
    }
  };

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
                "For RSU income: enter ticker, verify with live Yahoo Finance price, set tax withholding %",
                "RSU prices and forex rates auto-refresh on every dashboard load",
                "Toggle 'Include in Health' to control whether each income affects your health score",
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
          <p className="amount">{formatCurrency(totalMonthlyIncome)}</p>
        </div>
        <div className="summary-card">
          <h3>Health-Included Income</h3>
          <p className="amount" style={{ color: healthIncomeTotal < totalMonthlyIncome ? '#f59e0b' : '#10b981' }}>
            {formatCurrency(healthIncomeTotal)}
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
                const taxRate = income.rsuTaxRate ?? 33;
                const netShares = isRsu ? Math.round((income.rsuGrantCount || 0) * (1 - taxRate / 100)) : 0;
                return (
                  <div key={income.id} className={`income-card ${!isOwn ? "shared-item" : ""} ${excludedFromHealth ? "excluded-from-health" : ""}`}>
                    <div className="income-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
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
                        {/* Refresh price for RSU */}
                        {isOwn && isRsu && income.rsuTicker && (
                          <button
                            className="refresh-price-btn"
                            onClick={() => handleRefreshPrice(income)}
                            disabled={refreshingId === income.id}
                            title="Refresh stock price"
                          >
                            <FaSync size={12} className={refreshingId === income.id ? "spinning" : ""} />
                          </button>
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
                                    rsuStockPrice: income.rsuStockPrice ? String(income.rsuStockPrice) : "",
                                    rsuTaxRate: income.rsuTaxRate != null ? String(income.rsuTaxRate) : "33",
                                    rsuExpectedDecline: income.rsuExpectedDecline != null ? String(income.rsuExpectedDecline) : "20",
                                    rsuConversionRate: income.rsuConversionRate ? String(income.rsuConversionRate) : ""
                                  });
                                  // If editing, mark ticker as already verified
                                  if (income.rsuTicker) setVerifiedTicker(income.rsuTicker);
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
                      <p className="amount">{formatCurrency(income.amount || 0)}</p>
                      <p className="frequency">{income.frequency}</p>
                      {isRsu && income.rsuTicker && (
                        <div className="rsu-card-info">
                          <span>{income.rsuTicker} · {income.rsuGrantCount} shares/yr · {netShares} net (after {taxRate}% tax)</span>
                          <span>{income.rsuCurrency} {income.rsuStockPrice}/share
                            {income.rsuConversionRate && ` · 1 ${income.rsuCurrency} = ${income.rsuConversionRate} ${userCurrency}`}
                          </span>
                          {income.rsuPriceUpdatedAt && (
                            <span style={{ fontSize: 10, opacity: 0.5 }}>
                              Price updated: {new Date(income.rsuPriceUpdatedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
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
                    {/* RSU Section Header with Info Tooltip */}
                    <div className="rsu-section-header">
                      <span className="rsu-section-title">RSU Details</span>
                      <button
                        type="button"
                        className="rsu-info-btn"
                        onClick={() => setShowRsuInfo(!showRsuInfo)}
                        title="How RSU income is calculated"
                      >
                        <FaInfoCircle size={14} />
                      </button>
                    </div>

                    {/* RSU Info Tooltip */}
                    {showRsuInfo && (
                      <div className="rsu-info-tooltip">
                        <p><strong>How RSU income is calculated:</strong></p>
                        <p>When RSUs vest, your company withholds shares for tax. <strong>Net shares = Gross shares × (1 − Tax Rate%)</strong>.</p>
                        <p><em>Example: 400 shares/year, quarterly vesting, 33% tax = 100 gross/quarter → 67 net/quarter (268 net/year)</em></p>
                        <p>If your stock is priced in a different currency, FinFlow auto-converts using live forex rates (e.g. USD → INR). The rate refreshes on every dashboard load.</p>
                        <p>For Future Bomb planning, an additional <strong>Expected Decline %</strong> is applied to conservatively estimate sell proceeds.</p>
                        <p><strong>Monthly income = (Net annual shares × Stock Price × Conversion Rate) ÷ 12</strong></p>
                      </div>
                    )}

                    {/* Ticker + Verify */}
                    <div className="form-group">
                      <label>Stock Ticker</label>
                      <div className="ticker-verify-row">
                        <input
                          type="text"
                          value={form.rsuTicker}
                          onChange={(e) => handleTickerChange(e.target.value)}
                          required
                          placeholder="GOOGL"
                          style={{ flex: 1 }}
                        />
                        <button
                          type="button"
                          className={`verify-stock-btn ${verifiedQuote && verifiedTicker === form.rsuTicker ? 'verified' : ''}`}
                          onClick={handleVerifyStock}
                          disabled={verifying || !form.rsuTicker.trim()}
                        >
                          {verifying ? (
                            <><FaSync className="spinning" size={12} /> Verifying...</>
                          ) : verifiedQuote && verifiedTicker === form.rsuTicker ? (
                            <><FaCheckCircle size={12} /> Verified</>
                          ) : (
                            <><FaChartLine size={12} /> Verify Stock</>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Verification Result */}
                    {verifiedQuote && verifiedTicker === form.rsuTicker && (
                      <div className="stock-verify-result">
                        <div className="verify-result-header">
                          <FaCheckCircle color="#10b981" />
                          <span className="verify-stock-name">{verifiedQuote.name}</span>
                          <span className="verify-exchange">{verifiedQuote.exchange}</span>
                        </div>
                        <div className="verify-price-row">
                          <span className="verify-price">
                            {formatCurrency(verifiedQuote.price, verifiedQuote.currency)}/share
                          </span>
                          {verifiedQuote.convertedPrice && (
                            <span className="verify-converted">
                              ≈ {formatCurrency(verifiedQuote.convertedPrice, verifiedQuote.convertedCurrency)}
                            </span>
                          )}
                        </div>
                        {verifiedQuote.conversionRate && (
                          <div className="verify-forex">
                            1 {verifiedQuote.currency} = {verifiedQuote.conversionRate.toFixed(2)} {verifiedQuote.convertedCurrency} (live)
                          </div>
                        )}
                        {form.rsuStockPrice !== String(verifiedQuote.price) && (
                          <button type="button" className="confirm-stock-btn" onClick={handleConfirmStock}>
                            <FaCheckCircle size={12} /> Use This Price
                          </button>
                        )}
                        {form.rsuStockPrice === String(verifiedQuote.price) && (
                          <div className="verify-confirmed">Price applied ✓</div>
                        )}
                      </div>
                    )}

                    <div className="form-group">
                      <label>Annual Grant Count (shares/year)</label>
                      <input
                        type="number"
                        value={form.rsuGrantCount}
                        onChange={(e) => setForm({ ...form, rsuGrantCount: e.target.value })}
                        required
                        min="1"
                        placeholder="400"
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
                          placeholder="175.00"
                        />
                      </div>
                    </div>

                    {/* Tax Rate + Expected Decline */}
                    <div className="form-row">
                      <div className="form-group" style={{ flex: 1 }}>
                        <label>Tax Withheld on Vesting (%)</label>
                        <input
                          type="number"
                          value={form.rsuTaxRate}
                          onChange={(e) => setForm({ ...form, rsuTaxRate: e.target.value })}
                          min="0"
                          max="60"
                          step="1"
                          placeholder="33"
                        />
                      </div>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label>Expected Decline for Bombs (%)</label>
                        <input
                          type="number"
                          value={form.rsuExpectedDecline}
                          onChange={(e) => setForm({ ...form, rsuExpectedDecline: e.target.value })}
                          min="0"
                          max="50"
                          step="1"
                          placeholder="20"
                        />
                      </div>
                    </div>
                    
                    {/* Calculated Preview - 3 lines */}
                    {(parseFloat(form.rsuGrantCount) > 0 && parseFloat(form.rsuStockPrice) > 0) && (
                      <div className="rsu-calc-preview">
                        <div className="preview-line gross">
                          <span className="preview-label">Gross</span>
                          <span className="preview-value">
                            {form.rsuGrantCount} shares/yr × {formatCurrency(parseFloat(form.rsuStockPrice) || 0, form.rsuCurrency)}
                            {form.rsuConversionRate && ` (${formatCurrency(getPriceInUserCurrency())})`}
                            {" = "}
                            {formatCurrency((parseFloat(form.rsuGrantCount) || 0) * getPriceInUserCurrency())}/yr
                          </span>
                        </div>
                        <div className="preview-line after-tax">
                          <span className="preview-label">After Tax ({100 - (parseFloat(form.rsuTaxRate) || 33)}%)</span>
                          <span className="preview-value highlight">
                            {getNetAnnualShares()} net shares × {formatCurrency(getPriceInUserCurrency())} = {formatCurrency(getNetAnnualShares() * getPriceInUserCurrency())}/yr = <strong>{formatCurrency(calculateRsuMonthly())}/mo</strong>
                          </span>
                        </div>
                        <div className="preview-line conservative">
                          <span className="preview-label">Conservative (for bombs)</span>
                          <span className="preview-value">
                            {getNetAnnualShares()} shares × {formatCurrency(getPriceInUserCurrency() * (1 - (parseFloat(form.rsuExpectedDecline) || 20) / 100))} (-{form.rsuExpectedDecline || 20}%) = {formatCurrency(calculateConservativeAnnual())}/yr
                          </span>
                        </div>
                        {form.rsuConversionRate && (
                          <div className="preview-forex-note">
                            1 {form.rsuCurrency} = {parseFloat(form.rsuConversionRate).toFixed(2)} {userCurrency} (live rate — auto-refreshed)
                          </div>
                        )}
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
