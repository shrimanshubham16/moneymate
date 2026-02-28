import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FaMobileAlt, FaMoneyBillWave, FaWallet, FaCreditCard, FaHistory, FaReceipt, FaChartPie, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useEncryptedApiCalls } from "../hooks/useEncryptedApiCalls";
import { useSharedView } from "../hooks/useSharedView";
import { SharedViewBanner } from "../components/SharedViewBanner";
import { PageInfoButton } from "../components/PageInfoButton";
import { SkeletonLoader } from "../components/SkeletonLoader";
import "./CurrentMonthExpensesPage.css";

interface CurrentMonthExpensesPageProps {
  token: string;
}

export function CurrentMonthExpensesPage({ token }: CurrentMonthExpensesPageProps) {
  const navigate = useNavigate();
  const api = useEncryptedApiCalls();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const hasFetchedRef = useRef(false);
  const lastViewRef = useRef<string>("");
  const [currency, setCurrency] = useState("₹");

  // Month navigation
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() }; // 0-indexed month
  });

  const isCurrentMonth = useMemo(() => {
    const now = new Date();
    return viewMonth.year === now.getFullYear() && viewMonth.month === now.getMonth();
  }, [viewMonth]);

  const monthLabel = useMemo(() => {
    const d = new Date(viewMonth.year, viewMonth.month);
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [viewMonth]);

  // Shared view support
  const { selectedView, getViewParam } = useSharedView(token);

  useEffect(() => {
    hasFetchedRef.current = true;
    lastViewRef.current = selectedView;
    loadExpenses();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- loadExpenses uses stable api/token; refetch on selectedView/viewMonth change
  }, [selectedView, viewMonth]);

  const goToPrevMonth = () => {
    setViewMonth(prev => {
      const d = new Date(prev.year, prev.month - 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  const goToNextMonth = () => {
    if (isCurrentMonth) return;
    setViewMonth(prev => {
      const d = new Date(prev.year, prev.month + 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const monthDate = new Date(viewMonth.year, viewMonth.month, 15);
      const res = await api.fetchDashboard(token, monthDate.toISOString(), getViewParam());
      const expensesList: any[] = [];

      // Month boundaries
      const monthStart = new Date(viewMonth.year, viewMonth.month, 1);
      const monthEnd = new Date(viewMonth.year, viewMonth.month + 1, 0, 23, 59, 59, 999);

      // Currency
      const pref = res.data?.preferences;
      if (pref?.currency) {
        const sym: Record<string, string> = { INR: "₹", USD: "$", EUR: "€", GBP: "£" };
        setCurrency(sym[pref.currency] || pref.currency);
      }

      // Fixed expenses
      res.data.fixedExpenses?.forEach((exp: any) => {
        const monthly = exp.frequency === "monthly" ? exp.amount :
                       exp.frequency === "quarterly" ? exp.amount / 3 :
                       exp.amount / 12;
        expensesList.push({
          id: exp.id,
          name: exp.name,
          category: exp.category || "Uncategorized",
          type: "Fixed",
          amount: Math.round(monthly),
          status: exp.paid ? "completed" : "pending",
          dueDate: monthStart.toISOString().split("T")[0],
          subcategory: "Unspecified",
          paymentMode: "Cash"
        });
      });

      // Variable expenses with actuals — filter by viewed month
      res.data.variablePlans?.forEach((plan: any) => {
        const filteredActuals = (plan.actuals || []).filter((a: any) => {
          const d = new Date(a.incurredAt);
          return d >= monthStart && d <= monthEnd;
        });

        const actualsBySubcategory: any = {};
        filteredActuals.forEach((actual: any) => {
          const subcategory = actual.subcategory || "Unspecified";
          const paymentMode = actual.paymentMode || "Cash";
          if (!actualsBySubcategory[subcategory]) actualsBySubcategory[subcategory] = {};
          if (!actualsBySubcategory[subcategory][paymentMode]) actualsBySubcategory[subcategory][paymentMode] = [];
          actualsBySubcategory[subcategory][paymentMode].push(actual);
        });

        Object.entries(actualsBySubcategory).forEach(([subcategory, modes]: [string, any]) => {
          Object.entries(modes).forEach(([paymentMode, actuals]: [string, any]) => {
            const total = (actuals as any[]).reduce((sum, a) => sum + a.amount, 0);
            expensesList.push({
              id: `${plan.id}-${subcategory}-${paymentMode}`,
              name: plan.name,
              category: plan.category || "Uncategorized",
              subcategory,
              paymentMode,
              type: "Variable",
              amount: total,
              planned: plan.planned,
              status: total >= plan.planned ? "over" : total > 0 ? "partial" : "none",
              pctUsed: plan.planned > 0 ? Math.round((total / plan.planned) * 100) : 0,
              actuals: actuals
            });
          });
        });

        if (filteredActuals.length === 0) {
          expensesList.push({
            id: plan.id,
            name: plan.name,
            category: plan.category || "Uncategorized",
            subcategory: "Unspecified",
            paymentMode: "Cash",
            type: "Variable",
            amount: 0,
            planned: plan.planned,
            status: "none",
            pctUsed: 0
          });
        }
      });

      // Build grouped structure
      const grouped = expensesList.reduce((acc: any, exp: any) => {
        if (!acc[exp.category]) acc[exp.category] = {};
        const sub = exp.subcategory || "Unspecified";
        if (!acc[exp.category][sub]) acc[exp.category][sub] = {};
        const mode = exp.paymentMode || "Cash";
        if (!acc[exp.category][sub][mode]) acc[exp.category][sub][mode] = [];
        acc[exp.category][sub][mode].push(exp);
        return acc;
      }, {});

      const displayData = Object.entries(grouped).map(([category, subcategories]: [string, any]) => {
        const subcategoryData = Object.entries(subcategories).map(([subcategory, modes]: [string, any]) => {
          const modeData = Object.entries(modes).map(([paymentMode, items]: [string, any]) => {
            const total = (items as any[]).reduce((sum: number, i: any) => sum + i.amount, 0);
            return { paymentMode, items, total };
          });
          const subcategoryTotal = modeData.reduce((sum, m) => sum + m.total, 0);
          return { subcategory, modes: modeData, total: subcategoryTotal };
        });
        const categoryTotal = subcategoryData.reduce((sum, s) => sum + s.total, 0);
        return { category, subcategories: subcategoryData, total: categoryTotal };
      });

      setExpenses(displayData);
    } catch (e) {
      console.error("Failed to load expenses:", e);
    } finally {
      setLoading(false);
    }
  };

  const getPaymentModeInfo = (mode: string) => {
    switch (mode) {
      case "UPI":
        return { icon: <FaMobileAlt size={12} />, color: "#60a5fa", label: "UPI", cls: "mode-upi" };
      case "Cash":
        return { icon: <FaMoneyBillWave size={12} />, color: "#34d399", label: "Cash", cls: "mode-cash" };
      case "ExtraCash":
        return { icon: <FaWallet size={12} />, color: "#a78bfa", label: "Extra Cash", cls: "mode-extra" };
      case "CreditCard":
        return { icon: <FaCreditCard size={12} />, color: "#f59e0b", label: "Credit Card", cls: "mode-cc" };
      default:
        return { icon: <FaMoneyBillWave size={12} />, color: "#94a3b8", label: mode, cls: "mode-default" };
    }
  };

  // Compute chart data + payment mode summary
  const { paymentModeChartData, categoryChartData, subcategoryChartData, paymentModeSummary } = useMemo(() => {
    if (expenses.length === 0) return { paymentModeChartData: [], categoryChartData: [], subcategoryChartData: [], paymentModeSummary: [] };

    const paymentModeData: Record<string, number> = {};
    expenses.forEach(cg => {
      cg.subcategories.forEach((sg: any) => {
        sg.modes.forEach((mg: any) => {
          paymentModeData[mg.paymentMode] = (paymentModeData[mg.paymentMode] || 0) + mg.total;
        });
      });
    });

    const pmChartData = Object.entries(paymentModeData).map(([name, value]) => ({
      name: getPaymentModeInfo(name).label,
      value: value as number,
      color: getPaymentModeInfo(name).color
    }));

    const pmSummary = Object.entries(paymentModeData)
      .filter(([_, v]) => v > 0)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .map(([name, value]) => ({ ...getPaymentModeInfo(name), amount: value as number }));

    const catChartData = expenses.map(cg => ({
      name: cg.category,
      amount: cg.total
    }));

    const subChartData = selectedCategory
      ? expenses.find(cg => cg.category === selectedCategory)?.subcategories.map((sub: any) => ({
          name: sub.subcategory,
          amount: sub.total
        })) || []
      : [];

    return { paymentModeChartData: pmChartData, categoryChartData: catChartData, subcategoryChartData: subChartData, paymentModeSummary: pmSummary };
  }, [expenses, selectedCategory]);

  // Totals
  const grandTotal = expenses.reduce((sum, cg) => sum + cg.total, 0);
  const fixedTotal = expenses.reduce((sum, cg) => sum + cg.subcategories.reduce((s2: number, sg: any) =>
    s2 + sg.modes.reduce((s3: number, mg: any) =>
      s3 + mg.items.filter((i: any) => i.type === "Fixed").reduce((s4: number, i: any) => s4 + i.amount, 0), 0), 0), 0);
  const variableTotal = grandTotal - fixedTotal;

  const getStatusInfo = (item: any) => {
    if (item.type === "Fixed") {
      return item.status === "completed"
        ? { label: "Paid", cls: "status-paid" }
        : { label: "Due", cls: "status-due" };
    }
    // Variable
    if (item.status === "over") return { label: `${item.pctUsed}% — Over`, cls: "status-over" };
    if (item.status === "partial") return { label: `${item.pctUsed}% used`, cls: "status-partial" };
    return { label: "No spend", cls: "status-none" };
  };

  return (
    <div className="current-month-expenses-page">
      <div className="page-header">
        <button className="back-button" onClick={() => navigate("/dashboard")}>← Back</button>
        <h1><FaReceipt style={{ marginRight: 10, verticalAlign: 'middle' }} />Expenses</h1>
        <PageInfoButton
          title="Monthly Expenses"
          description="Every rupee you've spent, organised by category, subcategory, and payment mode. Navigate between months to compare and spot trends."
          impact="Understanding where your money goes is the first step to controlling it. This view combines fixed and variable expenses into one unified picture."
          howItWorks={[
            "Navigate months with ‹ › arrows — compare spending over time",
            "Expenses are grouped by Category → Subcategory → Payment Mode",
            "Variable expenses show % of plan used with colour-coded progress bars",
            "Tap a bar in the chart to drill into subcategories",
            "UPI/Cash reduces available funds; Extra Cash & Credit Card don't"
          ]}
        />
      </div>

      <SharedViewBanner />

      {/* ── Month Navigator ── */}
      <div className="cme-month-nav">
        <button className="cme-month-arrow" onClick={goToPrevMonth}>
          <FaChevronLeft />
        </button>
        <span className="cme-month-label">{monthLabel}</span>
        <button
          className={`cme-month-arrow${isCurrentMonth ? ' disabled' : ''}`}
          onClick={goToNextMonth}
          disabled={isCurrentMonth}
        >
          <FaChevronRight />
        </button>
        {isCurrentMonth && <span className="cme-month-badge">Current</span>}
      </div>

      {loading ? <SkeletonLoader type="card" count={4} /> : expenses.length === 0 ? (
        <div className="cme-empty-state">
          <FaChartPie size={56} color="#60a5fa" />
          <h3>No Expenses</h3>
          <p>{isCurrentMonth
            ? "Nothing spent this month so far. When you log payments — fixed or variable — they'll appear here beautifully categorised."
            : `No expense data found for ${monthLabel}.`
          }</p>
        </div>
      ) : (
        <>
          {/* Summary Hero */}
          <div className="cme-summary-hero">
            <div className="cme-hero-main">
              <div className="cme-hero-label">Total Spent</div>
              <div className="cme-hero-amount">{currency}{grandTotal.toLocaleString("en-IN")}</div>
            </div>
            <div className="cme-hero-stats">
              <div className="cme-hero-stat">
                <span className="cme-stat-label">Fixed</span>
                <span className="cme-stat-value stat-fixed">{currency}{fixedTotal.toLocaleString("en-IN")}</span>
              </div>
              <div className="cme-hero-stat">
                <span className="cme-stat-label">Variable</span>
                <span className="cme-stat-value stat-variable">{currency}{variableTotal.toLocaleString("en-IN")}</span>
              </div>
              <div className="cme-hero-stat">
                <span className="cme-stat-label">Categories</span>
                <span className="cme-stat-value stat-categories">{expenses.length}</span>
              </div>
            </div>
          </div>

          {/* ── Payment Mode Summary Strip ── */}
          {paymentModeSummary.length > 0 && (
            <div className="cme-mode-strip">
              {paymentModeSummary.map(pm => (
                <div key={pm.label} className={`cme-mode-pill ${pm.cls}`}>
                  {pm.icon}
                  <span className="cme-mode-pill-label">{pm.label}</span>
                  <span className="cme-mode-pill-amount" style={{ color: pm.color }}>{currency}{pm.amount.toLocaleString("en-IN")}</span>
                </div>
              ))}
            </div>
          )}

          {/* Charts */}
          {paymentModeChartData.length > 0 && (
            <div className="cme-chart-grid">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="cme-chart-card"
              >
                <div className="cme-chart-header">
                  <h3 className="cme-chart-title">Payment Mode Split</h3>
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={paymentModeChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={95}
                      innerRadius={45}
                      fill="#8884d8"
                      dataKey="value"
                      strokeWidth={2}
                      stroke="rgba(0,0,0,0.3)"
                    >
                      {paymentModeChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => `${currency}${value.toLocaleString("en-IN")}`}
                      contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid rgba(184,193,236,0.12)', borderRadius: 8 }}
                      labelStyle={{ color: 'var(--text-primary)' }}
                      itemStyle={{ color: 'var(--text-secondary)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="cme-chart-card"
              >
                <div className="cme-chart-header">
                  <h3 className="cme-chart-title">
                    {selectedCategory ? `${selectedCategory} — Subcategories` : 'By Category'}
                  </h3>
                  {selectedCategory && (
                    <button
                      onClick={() => setSelectedCategory(null)}
                      className="cme-chart-back-btn"
                    >
                      ← All Categories
                    </button>
                  )}
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={selectedCategory ? subcategoryChartData : categoryChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(184,193,236,0.08)" />
                    <XAxis
                      dataKey="name"
                      angle={-35}
                      textAnchor="end"
                      height={70}
                      tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
                    />
                    <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} />
                    <Tooltip
                      formatter={(value: number) => `${currency}${value.toLocaleString("en-IN")}`}
                      contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid rgba(184,193,236,0.12)', borderRadius: 8 }}
                      labelStyle={{ color: 'var(--text-primary)' }}
                      itemStyle={{ color: 'var(--text-secondary)' }}
                    />
                    <Bar
                      dataKey="amount"
                      fill={selectedCategory ? "#a78bfa" : "#3b82f6"}
                      radius={[6, 6, 0, 0]}
                    >
                      {(selectedCategory ? subcategoryChartData : categoryChartData).map((entry: any, index: number) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={selectedCategory ? "#a78bfa" : "#3b82f6"}
                          style={{ cursor: selectedCategory ? 'default' : 'pointer' }}
                          onClick={() => {
                            if (!selectedCategory && entry.name) {
                              setSelectedCategory(entry.name);
                            }
                          }}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                {!selectedCategory && (
                  <p className="cme-chart-hint">
                    Tap a bar to drill into subcategories
                  </p>
                )}
              </motion.div>
            </div>
          )}

          {/* Category Sections */}
          <div className="cme-categories">
            {expenses.map((categoryGroup, catIdx) => (
              <motion.div
                key={categoryGroup.category}
                className="cme-category-section"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: catIdx * 0.06 }}
              >
                <div className="cme-category-header">
                  <h2>{categoryGroup.category}</h2>
                  <span className="cme-category-total">{currency}{categoryGroup.total.toLocaleString("en-IN")}</span>
                </div>

                {categoryGroup.subcategories.map((subcategoryGroup: any) => (
                  <div key={`${categoryGroup.category}-${subcategoryGroup.subcategory}`} className="cme-subcategory">
                    {(categoryGroup.subcategories.length > 1 || subcategoryGroup.subcategory !== "Unspecified") && (
                      <div className="cme-subcategory-header">
                        <span className="cme-subcategory-name">{subcategoryGroup.subcategory}</span>
                        <span className="cme-subcategory-total">
                          ({currency}{subcategoryGroup.total.toLocaleString("en-IN")})
                        </span>
                      </div>
                    )}

                    {subcategoryGroup.modes.map((modeGroup: any) => {
                      const paymentInfo = getPaymentModeInfo(modeGroup.paymentMode);
                      return (
                        <div key={`${categoryGroup.category}-${subcategoryGroup.subcategory}-${modeGroup.paymentMode}`} className="cme-mode-group">
                          {subcategoryGroup.modes.length > 1 && (
                            <div className="cme-mode-header">
                              <div className={`cme-mode-icon ${paymentInfo.cls}`}>{paymentInfo.icon}</div>
                              <span className="cme-mode-label" style={{ color: paymentInfo.color }}>{paymentInfo.label}</span>
                              <span className="cme-mode-total">{currency}{modeGroup.total.toLocaleString("en-IN")}</span>
                            </div>
                          )}

                          {modeGroup.items.map((item: any) => {
                            const statusInfo = getStatusInfo(item);
                            return (
                              <div key={item.id} className="cme-expense-item">
                                <div className="cme-expense-info">
                                  <h4 className="cme-expense-name">{item.name}</h4>
                                  <div className="cme-expense-meta">
                                    <span className={`cme-expense-type-badge ${item.type === "Fixed" ? "type-fixed" : "type-variable"}`}>
                                      {item.type}
                                    </span>
                                    {subcategoryGroup.modes.length === 1 && (
                                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: paymentInfo.color, fontSize: '0.72rem', fontWeight: 600 }}>
                                        {paymentInfo.icon} {paymentInfo.label}
                                      </span>
                                    )}
                                    {item.planned > 0 && (
                                      <span className="cme-expense-planned">
                                        Plan: {currency}{item.planned.toLocaleString("en-IN")}
                                      </span>
                                    )}
                                  </div>
                                  {/* Enhanced overspend bar with percentage */}
                                  {item.type === "Variable" && item.planned > 0 && (
                                    <div className="cme-progress-row">
                                      <div className="cme-overspend-bar">
                                        <div
                                          className="cme-overspend-fill"
                                          style={{
                                            width: `${Math.min(item.pctUsed || 0, 100)}%`,
                                            background: (item.pctUsed || 0) > 100
                                              ? '#ef4444'
                                              : (item.pctUsed || 0) > 80
                                                ? '#f59e0b'
                                                : '#10b981'
                                          }}
                                        />
                                      </div>
                                      <span className={`cme-pct-label ${(item.pctUsed || 0) > 100 ? 'over' : (item.pctUsed || 0) > 80 ? 'warn' : 'ok'}`}>
                                        {item.pctUsed || 0}%
                                      </span>
                                    </div>
                                  )}
                                </div>
                                <div className="cme-expense-right">
                                  <span className="cme-expense-amount">{currency}{item.amount.toLocaleString("en-IN")}</span>
                                  <span className={`cme-expense-status ${statusInfo.cls}`}>
                                    {statusInfo.label}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </motion.div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
