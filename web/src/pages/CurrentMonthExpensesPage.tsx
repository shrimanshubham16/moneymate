import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FaMobileAlt, FaMoneyBillWave, FaWallet, FaCreditCard, FaHistory } from "react-icons/fa";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
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
      // Pass view param for shared view support
      const res = await api.fetchDashboard(token, new Date().toISOString(), getViewParam());
      const today = new Date();
      const expensesList: any[] = [];

      // Fixed expenses - check payment status
      res.data.fixedExpenses?.forEach((exp: any) => {
        const monthly = exp.frequency === "monthly" ? exp.amount : 
                       exp.frequency === "quarterly" ? exp.amount / 3 : 
                       exp.amount / 12;
        expensesList.push({
          id: exp.id,
          name: exp.name,
          category: exp.category,
          type: "Fixed",
          amount: Math.round(monthly),
          status: exp.paid ? "completed" : "pending",
          dueDate: today.toISOString().split("T")[0],
          subcategory: "Unspecified",
          paymentMode: "Cash"
        });
      });

      // Variable expenses with actuals (grouped by subcategory and payment mode)
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
              category: plan.category,
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
            category: plan.category,
            subcategory: "Unspecified",
            paymentMode: "Cash",
            type: "Variable",
            amount: 0,
            planned: plan.planned,
            status: "pending"
          });
        }
      });

      // Group by category → subcategory → payment mode
      const grouped = expensesList.reduce((acc: any, exp: any) => {
        if (!acc[exp.category]) acc[exp.category] = {};
        if (!acc[exp.category][exp.subcategory || "Unspecified"]) {
          acc[exp.category][exp.subcategory || "Unspecified"] = {};
        }
        if (!acc[exp.category][exp.subcategory || "Unspecified"][exp.paymentMode || "Cash"]) {
          acc[exp.category][exp.subcategory || "Unspecified"][exp.paymentMode || "Cash"] = [];
        }
        acc[exp.category][exp.subcategory || "Unspecified"][exp.paymentMode || "Cash"].push(exp);
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

  const getStatusColor = (status: string) => {
    if (status === "completed") return "#10b981";
    if (status === "pending") return "#f59e0b";
    return "#64748b";
  };

  const getPaymentModeInfo = (mode: string) => {
    switch (mode) {
      case "UPI":
        return { icon: <FaMobileAlt size={14} />, color: "#3b82f6", label: "UPI" };
      case "Cash":
        return { icon: <FaMoneyBillWave size={14} />, color: "#10b981", label: "Cash" };
      case "ExtraCash":
        return { icon: <FaWallet size={14} />, color: "#8b5cf6", label: "Extra Cash" };
      case "CreditCard":
        return { icon: <FaCreditCard size={14} />, color: "#f59e0b", label: "Credit Card" };
      default:
        return { icon: <FaMoneyBillWave size={14} />, color: "#64748b", label: mode };
    }
  };

  const prepareChartData = (selectedCat: string | null) => {
    const paymentModeData: any = {};
    expenses.forEach(categoryGroup => {
      categoryGroup.subcategories.forEach((subcategoryGroup: any) => {
        subcategoryGroup.modes.forEach((modeGroup: any) => {
          const mode = modeGroup.paymentMode;
          paymentModeData[mode] = (paymentModeData[mode] || 0) + modeGroup.total;
        });
      });
    });

    const paymentModeChartData = Object.entries(paymentModeData).map(([name, value]) => ({
      name: getPaymentModeInfo(name).label,
      value: value as number,
      color: getPaymentModeInfo(name).color
    }));

    const categoryChartData = expenses.map(categoryGroup => ({
      name: categoryGroup.category,
      amount: categoryGroup.total
    }));

    const subcategoryChartData = selectedCat 
      ? expenses.find(cg => cg.category === selectedCat)?.subcategories.map((sub: any) => ({
          name: sub.subcategory,
          amount: sub.total
        })) || []
      : [];

    return { paymentModeChartData, categoryChartData, subcategoryChartData };
  };

  const chartData = expenses.length > 0 ? prepareChartData(selectedCategory) : { paymentModeChartData: [], categoryChartData: [], subcategoryChartData: [] };
  const { paymentModeChartData, categoryChartData, subcategoryChartData } = chartData;

  return (
    <div className="current-month-expenses-page">
      <div className="page-header">
        <button className="back-button" onClick={() => navigate("/dashboard")}>← Back</button>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <h1>Current Month Expenses</h1>
          <PageInfoButton
            title="Current Month Expenses"
            description="View all your expenses for the current month, organized by category, subcategory, and payment mode. Analyze your spending patterns with interactive charts. Use the History button to view past months."
            impact="This page helps you understand where your money is going. Expenses are grouped by category and payment mode, helping you identify spending patterns and make informed financial decisions."
            howItWorks={[
              "Expenses are grouped by Category → Subcategory → Payment Mode",
              "Payment modes: UPI/Cash (reduces available funds), Extra Cash (doesn't reduce funds), Credit Card (billed later)",
              "View payment mode distribution with pie chart",
              "See category breakdown with bar chart",
              "All expenses from fixed expenses and variable expense actuals are included"
            ]}
          />
        </div>
        <button 
          className="icon-btn" 
          onClick={() => setShowHistoryModal(true)}
          title="View History"
          style={{ 
            background: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)', 
            color: 'white', 
            width: '40px', 
            height: '40px', 
            borderRadius: '50%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            fontSize: '16px',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(139, 92, 246, 0.3)'
          }}
        >
          <FaHistory />
        </button>
      </div>

      <SharedViewBanner />

      {loading ? <SkeletonLoader type="card" count={5} /> : expenses.length === 0 ? (
        <div className="empty-state">No expenses for the current month.</div>
      ) : (
        <>
          {/* Charts Section */}
          {paymentModeChartData.length > 0 && (
            <div className="chart-grid">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="chart-card"
              >
                <h3 className="chart-title">Payment Mode Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={paymentModeChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {paymentModeChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `₹${value.toLocaleString("en-IN")}`} />
                  </PieChart>
                </ResponsiveContainer>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="chart-card"
              >
                <div className="chart-header">
                  <h3 className="chart-title">
                    {selectedCategory ? `Subcategory Breakdown: ${selectedCategory}` : 'Category Breakdown'}
                  </h3>
                  {selectedCategory && (
                    <button
                      onClick={() => setSelectedCategory(null)}
                      className="chart-back-btn"
                    >
                      ← Back to Categories
                    </button>
                  )}
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart 
                    data={selectedCategory ? subcategoryChartData : categoryChartData}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip formatter={(value: number) => `₹${value.toLocaleString("en-IN")}`} />
                    <Bar 
                      dataKey="amount" 
                      fill={selectedCategory ? "#8b5cf6" : "#3b82f6"}
                      onClick={(data: any) => {
                        if (!selectedCategory) {
                          const categoryName = data?.payload?.name || data?.name || (data?.activePayload && data.activePayload[0]?.payload?.name);
                          if (categoryName) {
                            setSelectedCategory(categoryName);
                          }
                        }
                      }}
                    >
                      {(selectedCategory ? subcategoryChartData : categoryChartData).map((entry: any, index: number) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={selectedCategory ? "#8b5cf6" : "#3b82f6"}
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
                  <p className="chart-hint">
                    Click on a category bar to see subcategory breakdown
                  </p>
                )}
              </motion.div>
            </div>
          )}

          <div className="expenses-by-category">
          {expenses.map((categoryGroup, categoryIndex) => (
            <motion.div
              key={categoryGroup.category}
              className="category-group"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: categoryIndex * 0.1 }}
            >
              <div className="category-header">
                <h2>{categoryGroup.category}</h2>
                <div className="category-total">₹{categoryGroup.total.toLocaleString("en-IN")}</div>
              </div>
              
              {categoryGroup.subcategories.map((subcategoryGroup: any, subcategoryIndex: number) => (
                <div key={`${categoryGroup.category}-${subcategoryGroup.subcategory}`} style={{ marginTop: subcategoryIndex > 0 ? '20px' : '0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', paddingLeft: '12px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#4b5563' }}>
                      {subcategoryGroup.subcategory}
                    </h3>
                    <span style={{ fontSize: '14px', color: '#6b7280' }}>
                      (₹{subcategoryGroup.total.toLocaleString("en-IN")})
                    </span>
                  </div>
                  
                  {subcategoryGroup.modes.map((modeGroup: any, modeIndex: number) => {
                    const paymentInfo = getPaymentModeInfo(modeGroup.paymentMode);
                    return (
                      <div key={`${categoryGroup.category}-${subcategoryGroup.subcategory}-${modeGroup.paymentMode}`} 
                           style={{ marginBottom: '12px', paddingLeft: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <span style={{ color: paymentInfo.color }}>{paymentInfo.icon}</span>
                          <span style={{ fontSize: '14px', fontWeight: '500', color: paymentInfo.color }}>
                            {paymentInfo.label}
                          </span>
                          <span style={{ fontSize: '14px', color: '#6b7280' }}>
                            ₹{modeGroup.total.toLocaleString("en-IN")}
                          </span>
                        </div>
                        
                        {modeGroup.items.map((item: any) => (
                          <div key={item.id} className="expense-item" style={{ marginLeft: '8px', marginBottom: '8px' }}>
                            <div className="expense-info">
                              <h3 style={{ fontSize: '14px' }}>{item.name}</h3>
                              <div className="expense-meta">
                                <span className="expense-type">{item.type}</span>
                                {item.planned && (
                                  <span className="expense-planned">
                                    Planned: ₹{item.planned.toLocaleString("en-IN")}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="expense-amount-status">
                              <div className="expense-amount">₹{item.amount.toLocaleString("en-IN")}</div>
                              <div
                                className="expense-status"
                                style={{ color: getStatusColor(item.status) }}
                              >
                                {item.status.toUpperCase()}
                              </div>
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
