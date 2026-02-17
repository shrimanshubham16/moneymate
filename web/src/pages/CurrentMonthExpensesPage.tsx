import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FaMobileAlt, FaMoneyBillWave, FaWallet, FaCreditCard, FaHistory, FaReceipt, FaChartPie } from "react-icons/fa";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useEncryptedApiCalls } from "../hooks/useEncryptedApiCalls";
import { useSharedView } from "../hooks/useSharedView";
import { SharedViewBanner } from "../components/SharedViewBanner";
import { PageInfoButton } from "../components/PageInfoButton";
import { SkeletonLoader } from "../components/SkeletonLoader";
import { ActivityHistoryModal } from "../components/ActivityHistoryModal";
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
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const hasFetchedRef = useRef(false);
  const lastViewRef = useRef<string>("");
  const [currency, setCurrency] = useState("₹");

  // Shared view support
  const { selectedView, getViewParam } = useSharedView(token);

  useEffect(() => {
    if (hasFetchedRef.current && lastViewRef.current === selectedView) return;
    hasFetchedRef.current = true;
    lastViewRef.current = selectedView;
    loadExpenses();
  }, [selectedView]);

  const loadExpenses = async () => {
    try {
      const res = await api.fetchDashboard(token, new Date().toISOString(), getViewParam());
      const today = new Date();
      const expensesList: any[] = [];

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
          dueDate: today.toISOString().split("T")[0],
          subcategory: "Unspecified",
          paymentMode: "Cash"
        });
      });

      // Variable expenses with actuals
      res.data.variablePlans?.forEach((plan: any) => {
        const actualsBySubcategory: any = {};

        (plan.actuals || []).forEach((actual: any) => {
          const subcategory = actual.subcategory || "Unspecified";
          const paymentMode = actual.paymentMode || "Cash";

          if (!actualsBySubcategory[subcategory]) {
            actualsBySubcategory[subcategory] = {};
          }
          if (!actualsBySubcategory[subcategory][paymentMode]) {
            actualsBySubcategory[subcategory][paymentMode] = [];
          }
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
              status: total >= plan.planned ? "completed" : "pending",
              actuals: actuals
            });
          });
        });

        if (!plan.actuals || plan.actuals.length === 0) {
          expensesList.push({
            id: plan.id,
            name: plan.name,
            category: plan.category || "Uncategorized",
            subcategory: "Unspecified",
            paymentMode: "Cash",
            type: "Variable",
            amount: 0,
            planned: plan.planned,
            status: "pending"
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

  // Compute chart data
  const prepareChartData = () => {
    const paymentModeData: Record<string, number> = {};
    expenses.forEach(cg => {
      cg.subcategories.forEach((sg: any) => {
        sg.modes.forEach((mg: any) => {
          paymentModeData[mg.paymentMode] = (paymentModeData[mg.paymentMode] || 0) + mg.total;
        });
      });
    });

    const paymentModeChartData = Object.entries(paymentModeData).map(([name, value]) => ({
      name: getPaymentModeInfo(name).label,
      value: value as number,
      color: getPaymentModeInfo(name).color
    }));

    const categoryChartData = expenses.map(cg => ({
      name: cg.category,
      amount: cg.total
    }));

    const subcategoryChartData = selectedCategory
      ? expenses.find(cg => cg.category === selectedCategory)?.subcategories.map((sub: any) => ({
          name: sub.subcategory,
          amount: sub.total
        })) || []
      : [];

    return { paymentModeChartData, categoryChartData, subcategoryChartData };
  };

  const chartData = expenses.length > 0 ? prepareChartData() : { paymentModeChartData: [], categoryChartData: [], subcategoryChartData: [] };
  const { paymentModeChartData, categoryChartData, subcategoryChartData } = chartData;

  // Totals
  const grandTotal = expenses.reduce((sum, cg) => sum + cg.total, 0);
  const fixedTotal = expenses.reduce((sum, cg) => sum + cg.subcategories.reduce((s2: number, sg: any) =>
    s2 + sg.modes.reduce((s3: number, mg: any) =>
      s3 + mg.items.filter((i: any) => i.type === "Fixed").reduce((s4: number, i: any) => s4 + i.amount, 0), 0), 0), 0);
  const variableTotal = grandTotal - fixedTotal;

  return (
    <div className="current-month-expenses-page">
      <div className="page-header">
        <button className="back-button" onClick={() => navigate("/dashboard")}>← Back</button>
        <h1><FaReceipt style={{ marginRight: 10, verticalAlign: 'middle' }} />Expenses</h1>
        <PageInfoButton
          title="Current Month Expenses"
          description="A single, beautiful breakdown of every rupee you've spent this month — organised by category, subcategory, and payment mode. Charts make patterns obvious. Use the History button to compare with previous months."
          impact="Understanding where your money goes is the first step to controlling it. This view combines fixed and variable expenses into one unified picture, so you can spot the categories that eat the most and adjust next month's plan."
          howItWorks={[
            "Expenses are grouped by Category → Subcategory → Payment Mode for easy drill-down",
            "UPI/Cash reduces available funds, Extra Cash doesn't, Credit Card defers to your card bill",
            "Interactive pie chart shows payment mode split; bar chart shows category-wise totals",
            "Click History to compare spending across previous months and spot trends",
            "Both fixed expense payments and variable expense actuals are included automatically"
          ]}
        />
        <button
          className="cme-history-btn"
          onClick={() => setShowHistoryModal(true)}
          title="View History"
        >
          <FaHistory />
        </button>
      </div>

      <SharedViewBanner />

      {loading ? <SkeletonLoader type="card" count={4} /> : expenses.length === 0 ? (
        <div className="cme-empty-state">
          <FaChartPie size={56} color="#60a5fa" />
          <h3>No Expenses Yet</h3>
          <p>Nothing spent this month so far. When you log payments — fixed or variable — they&apos;ll appear here beautifully categorised.</p>
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
                    {/* Show subcategory header only if more than 1 or if not "Unspecified" */}
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
                          {/* Show payment mode header if multiple modes */}
                          {subcategoryGroup.modes.length > 1 && (
                            <div className="cme-mode-header">
                              <div className={`cme-mode-icon ${paymentInfo.cls}`}>{paymentInfo.icon}</div>
                              <span className="cme-mode-label" style={{ color: paymentInfo.color }}>{paymentInfo.label}</span>
                              <span className="cme-mode-total">{currency}{modeGroup.total.toLocaleString("en-IN")}</span>
                            </div>
                          )}

                          {modeGroup.items.map((item: any) => (
                            <div key={item.id} className="cme-expense-item">
                              <div className="cme-expense-info">
                                <h4 className="cme-expense-name">{item.name}</h4>
                                <div className="cme-expense-meta">
                                  <span className={`cme-expense-type-badge ${item.type === "Fixed" ? "type-fixed" : "type-variable"}`}>
                                    {item.type}
                                  </span>
                                  {/* Show payment icon if only 1 mode (header not shown) */}
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
                                {/* Overspend indicator for variable expenses */}
                                {item.type === "Variable" && item.planned > 0 && (
                                  <div className="cme-overspend-bar">
                                    <div
                                      className="cme-overspend-fill"
                                      style={{
                                        width: `${Math.min((item.amount / item.planned) * 100, 100)}%`,
                                        background: item.amount > item.planned
                                          ? '#ef4444'
                                          : item.amount > item.planned * 0.8
                                            ? '#f59e0b'
                                            : '#10b981'
                                      }}
                                    />
                                  </div>
                                )}
                              </div>
                              <div className="cme-expense-right">
                                <span className="cme-expense-amount">{currency}{item.amount.toLocaleString("en-IN")}</span>
                                <span className={`cme-expense-status status-${item.status}`}>
                                  {item.status === "completed" ? "Paid" : "Pending"}
                                </span>
                              </div>
                            </div>
                          ))}
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

      {/* History Modal */}
      <ActivityHistoryModal
        token={token}
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        selectedMonth={null}
      />
    </div>
  );
}
