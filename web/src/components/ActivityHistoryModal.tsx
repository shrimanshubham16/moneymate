import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaTimes, FaChartLine, FaMobileAlt, FaMoneyBillWave, FaWallet, FaCreditCard } from "react-icons/fa";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useEncryptedApiCalls } from "../hooks/useEncryptedApiCalls";
import { SkeletonLoader } from "./SkeletonLoader";
import "./ActivityHistoryModal.css";

interface ActivityHistoryModalProps {
  token: string;
  isOpen: boolean;
  onClose: () => void;
  selectedMonth: string | null; // Format: "YYYY-MM"
}

const CURRENCY_SYMBOLS: Record<string, string> = { INR: "₹", USD: "$", EUR: "€", GBP: "£" };

const getPaymentModeInfo = (mode: string) => {
  switch (mode) {
    case "UPI": return { icon: <FaMobileAlt size={11} />, color: "#60a5fa", label: "UPI", cls: "mode-upi" };
    case "Cash": return { icon: <FaMoneyBillWave size={11} />, color: "#34d399", label: "Cash", cls: "mode-cash" };
    case "ExtraCash": return { icon: <FaWallet size={11} />, color: "#a78bfa", label: "Extra Cash", cls: "mode-extra" };
    case "CreditCard": return { icon: <FaCreditCard size={11} />, color: "#f59e0b", label: "Credit Card", cls: "mode-cc" };
    default: return { icon: <FaMoneyBillWave size={11} />, color: "#94a3b8", label: mode, cls: "mode-default" };
  }
};

export function ActivityHistoryModal({ token, isOpen, selectedMonth, onClose }: ActivityHistoryModalProps) {
  const api = useEncryptedApiCalls();
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [currentMonth, setCurrentMonth] = useState<string>(selectedMonth || "");
  const [snapshotData, setSnapshotData] = useState<any>(null);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"snapshot" | "trends">("snapshot");
  const [currency, setCurrency] = useState("₹");

  useEffect(() => {
    if (!isOpen) return;
    loadAvailableMonths();
    loadTrendData();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && currentMonth) loadMonthSnapshot(currentMonth);
  }, [isOpen, currentMonth]);

  useEffect(() => {
    if (selectedMonth) setCurrentMonth(selectedMonth);
  }, [selectedMonth]);

  /* ── Load available months from activity log ── */
  const loadAvailableMonths = async () => {
    try {
      const res = await api.fetchActivity(token);
      const activities = res.data || [];
      const months = new Set<string>();
      activities.forEach((act: any) => {
        const d = new Date(act.createdAt);
        months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      });
      const sorted = Array.from(months).sort((a, b) => b.localeCompare(a));
      setAvailableMonths(sorted);
      if (!currentMonth && sorted.length > 0) setCurrentMonth(sorted[0]);
    } catch (e) {
      console.error("Failed to load available months:", e);
    }
  };

  /* ── Load snapshot for a specific month ── */
  const loadMonthSnapshot = async (month: string) => {
    setLoading(true);
    try {
      const [yearStr, monthNumStr] = month.split('-');
      const year = parseInt(yearStr);
      const monthNum = parseInt(monthNumStr);
      const monthStart = new Date(year, monthNum - 1, 1);
      const monthEnd = new Date(year, monthNum, 0, 23, 59, 59, 999);

      const dashRes = await api.fetchDashboard(token, monthStart.toISOString());

      // Currency
      const pref = dashRes.data?.preferences;
      if (pref?.currency) setCurrency(CURRENCY_SYMBOLS[pref.currency] || pref.currency);

      const expenses: any[] = [];

      // Fixed expenses
      (dashRes.data.fixedExpenses || []).forEach((exp: any) => {
        const monthly = exp.frequency === "monthly" ? exp.amount
          : exp.frequency === "quarterly" ? exp.amount / 3
          : exp.amount / 12;
        expenses.push({
          id: exp.id, name: exp.name,
          category: exp.category || "Uncategorized",
          subcategory: "Unspecified",
          paymentMode: "Cash",
          type: "Fixed",
          amount: Math.round(monthly),
          planned: Math.round(monthly),
          status: exp.paid ? "paid" : "due",
        });
      });

      // Variable expenses — filter actuals to the viewed month
      (dashRes.data.variablePlans || []).forEach((plan: any) => {
        const filtered = (plan.actuals || []).filter((a: any) => {
          const d = new Date(a.incurredAt);
          return d >= monthStart && d <= monthEnd;
        });

        const bySub: Record<string, Record<string, any[]>> = {};
        filtered.forEach((a: any) => {
          const sub = a.subcategory || "Unspecified";
          const mode = a.paymentMode || "Cash";
          if (!bySub[sub]) bySub[sub] = {};
          if (!bySub[sub][mode]) bySub[sub][mode] = [];
          bySub[sub][mode].push(a);
        });

        Object.entries(bySub).forEach(([sub, modes]) => {
          Object.entries(modes).forEach(([mode, actuals]) => {
            const total = actuals.reduce((s, a: any) => s + a.amount, 0);
            const pct = plan.planned > 0 ? Math.round((total / plan.planned) * 100) : 0;
            expenses.push({
              id: `${plan.id}-${sub}-${mode}`,
              name: plan.name,
              category: plan.category || "Uncategorized",
              subcategory: sub, paymentMode: mode,
              type: "Variable",
              amount: total, planned: plan.planned,
              pctUsed: pct,
              status: total >= plan.planned ? "over" : total > 0 ? "partial" : "none",
            });
          });
        });

        if (filtered.length === 0) {
          expenses.push({
            id: plan.id, name: plan.name,
            category: plan.category || "Uncategorized",
            subcategory: "Unspecified", paymentMode: "Cash",
            type: "Variable",
            amount: 0, planned: plan.planned,
            pctUsed: 0, status: "none",
          });
        }
      });

      // Build grouped view
      const grouped: Record<string, Record<string, Record<string, any[]>>> = {};
      expenses.forEach(e => {
        const cat = e.category;
        const sub = e.subcategory || "Unspecified";
        const mode = e.paymentMode || "Cash";
        if (!grouped[cat]) grouped[cat] = {};
        if (!grouped[cat][sub]) grouped[cat][sub] = {};
        if (!grouped[cat][sub][mode]) grouped[cat][sub][mode] = [];
        grouped[cat][sub][mode].push(e);
      });

      const categories = Object.entries(grouped).map(([cat, subs]) => {
        const subcats = Object.entries(subs).map(([sub, modes]) => {
          const modeData = Object.entries(modes).map(([mode, items]) => {
            const total = items.reduce((s, i) => s + i.amount, 0);
            return { paymentMode: mode, items, total };
          });
          const subTotal = modeData.reduce((s, m) => s + m.total, 0);
          return { subcategory: sub, modes: modeData, total: subTotal };
        });
        const catTotal = subcats.reduce((s, sc) => s + sc.total, 0);
        return { category: cat, subcategories: subcats, total: catTotal };
      });

      const grandTotal = categories.reduce((s, c) => s + c.total, 0);
      const fixedTotal = expenses.filter(e => e.type === "Fixed").reduce((s, e) => s + e.amount, 0);
      const variableTotal = grandTotal - fixedTotal;

      setSnapshotData({ month, categories, grandTotal, fixedTotal, variableTotal, expenses });
    } catch (e) {
      console.error("Failed to load month snapshot:", e);
      setSnapshotData(null);
    } finally {
      setLoading(false);
    }
  };

  /* ── Load trend data ── */
  const loadTrendData = async () => {
    try {
      const res = await api.fetchActivity(token);
      const activities = res.data || [];
      const monthly: Record<string, any> = {};

      activities.forEach((act: any) => {
        const d = new Date(act.createdAt);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!monthly[key]) monthly[key] = { month: key, fixed: 0, variable: 0, investments: 0, overspends: 0 };

        const p = act.payload || {};
        if (act.entity === 'fixed_expense' && p.amount) monthly[key].fixed += p.amount;
        else if (act.entity === 'variable_expense' && p.amount) monthly[key].variable += p.amount;
        else if (act.entity === 'investment' && p.monthlyAmount) monthly[key].investments += p.monthlyAmount;
        else if (act.action === 'overspend_detected') monthly[key].overspends += 1;
      });

      setTrendData(Object.values(monthly).sort((a: any, b: any) => a.month.localeCompare(b.month)));
    } catch (e) {
      console.error("Failed to load trend data:", e);
    }
  };

  const formatMonth = (m: string) => {
    const [y, mn] = m.split('-');
    return new Date(parseInt(y), parseInt(mn) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const getStatusInfo = (item: any) => {
    if (item.type === "Fixed") {
      return item.status === "paid" ? { label: "Paid", cls: "st-paid" } : { label: "Due", cls: "st-due" };
    }
    if (item.status === "over") return { label: `${item.pctUsed}% Over`, cls: "st-over" };
    if (item.status === "partial") return { label: `${item.pctUsed}%`, cls: "st-partial" };
    return { label: "No spend", cls: "st-none" };
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="ahm-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="ahm-panel"
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="ahm-header">
              <h2><FaChartLine style={{ marginRight: 8 }} />Activity History</h2>
              <button className="ahm-close" onClick={onClose}><FaTimes /></button>
            </div>

            {/* Tabs */}
            <div className="ahm-tabs">
              <button className={viewMode === "snapshot" ? "active" : ""} onClick={() => setViewMode("snapshot")}>
                Monthly Snapshot
              </button>
              <button className={viewMode === "trends" ? "active" : ""} onClick={() => setViewMode("trends")}>
                Trends
              </button>
            </div>

            {/* ── SNAPSHOT TAB ── */}
            {viewMode === "snapshot" && (
              <div className="ahm-snapshot">
                <div className="ahm-month-picker">
                  <label>Month</label>
                  <select
                    value={currentMonth}
                    onChange={(e) => setCurrentMonth(e.target.value)}
                  >
                    {availableMonths.map(m => (
                      <option key={m} value={m}>{formatMonth(m)}</option>
                    ))}
                  </select>
                </div>

                {loading ? <SkeletonLoader type="card" count={4} /> : snapshotData ? (
                  <>
                    {/* Summary Strip */}
                    <div className="ahm-summary-strip">
                      <div className="ahm-summary-cell">
                        <span className="ahm-sum-label">Total</span>
                        <span className="ahm-sum-value gradient">{currency}{snapshotData.grandTotal.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="ahm-summary-cell">
                        <span className="ahm-sum-label">Fixed</span>
                        <span className="ahm-sum-value blue">{currency}{snapshotData.fixedTotal.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="ahm-summary-cell">
                        <span className="ahm-sum-label">Variable</span>
                        <span className="ahm-sum-value purple">{currency}{snapshotData.variableTotal.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="ahm-summary-cell">
                        <span className="ahm-sum-label">Categories</span>
                        <span className="ahm-sum-value cyan">{snapshotData.categories.length}</span>
                      </div>
                    </div>

                    {/* Grouped Expenses */}
                    <div className="ahm-categories">
                      {snapshotData.categories.map((cg: any) => (
                        <div key={cg.category} className="ahm-cat-card">
                          <div className="ahm-cat-header">
                            <span className="ahm-cat-name">{cg.category}</span>
                            <span className="ahm-cat-total">{currency}{cg.total.toLocaleString("en-IN")}</span>
                          </div>

                          {cg.subcategories.map((sg: any) => (
                            <div key={`${cg.category}-${sg.subcategory}`} className="ahm-sub-group">
                              {(cg.subcategories.length > 1 || sg.subcategory !== "Unspecified") && (
                                <div className="ahm-sub-header">
                                  <span>{sg.subcategory}</span>
                                  <span className="ahm-sub-total">{currency}{sg.total.toLocaleString("en-IN")}</span>
                                </div>
                              )}

                              {sg.modes.map((mg: any) => {
                                const pm = getPaymentModeInfo(mg.paymentMode);
                                return (
                                  <div key={`${sg.subcategory}-${mg.paymentMode}`} className="ahm-mode-group">
                                    {sg.modes.length > 1 && (
                                      <div className="ahm-mode-header">
                                        <span className={`ahm-mode-icon ${pm.cls}`}>{pm.icon}</span>
                                        <span style={{ color: pm.color, fontSize: '0.78rem', fontWeight: 600 }}>{pm.label}</span>
                                        <span className="ahm-mode-total">{currency}{mg.total.toLocaleString("en-IN")}</span>
                                      </div>
                                    )}

                                    {mg.items.map((item: any) => {
                                      const si = getStatusInfo(item);
                                      return (
                                        <div key={item.id} className="ahm-item">
                                          <div className="ahm-item-info">
                                            <span className="ahm-item-name">{item.name}</span>
                                            <div className="ahm-item-meta">
                                              <span className={`ahm-type-badge ${item.type === "Fixed" ? "t-fixed" : "t-var"}`}>
                                                {item.type}
                                              </span>
                                              {sg.modes.length === 1 && (
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: pm.color, fontSize: '0.7rem', fontWeight: 600 }}>
                                                  {pm.icon} {pm.label}
                                                </span>
                                              )}
                                              {item.planned > 0 && item.type === "Variable" && (
                                                <span className="ahm-plan-label">Plan: {currency}{item.planned.toLocaleString("en-IN")}</span>
                                              )}
                                            </div>
                                            {item.type === "Variable" && item.planned > 0 && (
                                              <div className="ahm-bar-row">
                                                <div className="ahm-bar-track">
                                                  <div
                                                    className="ahm-bar-fill"
                                                    style={{
                                                      width: `${Math.min(item.pctUsed || 0, 100)}%`,
                                                      background: (item.pctUsed || 0) > 100 ? '#ef4444' : (item.pctUsed || 0) > 80 ? '#f59e0b' : '#10b981'
                                                    }}
                                                  />
                                                </div>
                                                <span className={`ahm-pct ${(item.pctUsed || 0) > 100 ? 'over' : (item.pctUsed || 0) > 80 ? 'warn' : 'ok'}`}>
                                                  {item.pctUsed || 0}%
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                          <div className="ahm-item-right">
                                            <span className="ahm-item-amount">{currency}{item.amount.toLocaleString("en-IN")}</span>
                                            <span className={`ahm-status ${si.cls}`}>{si.label}</span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="ahm-empty">
                    <FaChartLine size={40} color="rgba(184,193,236,0.25)" />
                    <p>No data available for this month</p>
                  </div>
                )}
              </div>
            )}

            {/* ── TRENDS TAB ── */}
            {viewMode === "trends" && (
              <div className="ahm-trends">
                <h3>Monthly Trends</h3>
                {trendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={380}>
                    <BarChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(184,193,236,0.08)" />
                      <XAxis
                        dataKey="month"
                        tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
                        tickFormatter={v => { const [y, m] = v.split('-'); return `${m}/${y.slice(2)}`; }}
                      />
                      <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} />
                      <Tooltip
                        formatter={(value: number, name: string) => [`${currency}${value.toLocaleString("en-IN")}`, name]}
                        contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid rgba(184,193,236,0.12)', borderRadius: 8 }}
                        labelStyle={{ color: 'var(--text-primary)' }}
                        itemStyle={{ color: 'var(--text-secondary)' }}
                      />
                      <Legend wrapperStyle={{ color: 'var(--text-secondary)' }} />
                      <Bar dataKey="fixed" fill="#60a5fa" name="Fixed" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="variable" fill="#a78bfa" name="Variable" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="investments" fill="#34d399" name="Investments" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="ahm-empty">
                    <FaChartLine size={40} color="rgba(184,193,236,0.25)" />
                    <p>No trend data available yet</p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
