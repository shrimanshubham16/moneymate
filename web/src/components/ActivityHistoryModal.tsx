import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaTimes, FaChartLine, FaMoneyBillWave, FaShoppingCart, FaChartBar, FaUniversity } from "react-icons/fa";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { fetchActivity, fetchDashboard } from "../api";
import { SkeletonLoader } from "./SkeletonLoader";
import "./ActivityHistoryModal.css";

interface ActivityHistoryModalProps {
  token: string;
  isOpen: boolean;
  onClose: () => void;
  selectedMonth: string | null; // Format: "YYYY-MM"
}

export function ActivityHistoryModal({ token, isOpen, selectedMonth, onClose }: ActivityHistoryModalProps) {
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [selectedMonthData, setSelectedMonthData] = useState<any>(null);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"snapshot" | "trends">("snapshot");

  useEffect(() => {
    if (isOpen) {
      loadAvailableMonths();
      if (selectedMonth) {
        loadMonthSnapshot(selectedMonth);
      }
      loadTrendData();
    }
  }, [isOpen, selectedMonth]);

  const loadAvailableMonths = async () => {
    try {
      const res = await fetchActivity(token);
      const activities = res.data || [];
      
      // Extract unique months from activities
      const months = new Set<string>();
      activities.forEach((act: any) => {
        const date = new Date(act.createdAt);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        months.add(monthKey);
      });
      
      // Sort months descending (newest first)
      const sortedMonths = Array.from(months).sort((a, b) => b.localeCompare(a));
      setAvailableMonths(sortedMonths);
      
      // If no month selected, select the most recent
      if (!selectedMonth && sortedMonths.length > 0) {
        loadMonthSnapshot(sortedMonths[0]);
      }
    } catch (e) {
      console.error("Failed to load available months:", e);
    }
  };

  const loadMonthSnapshot = async (month: string) => {
    setLoading(true);
    try {
      // Calculate month start and end dates (using calendar month for now)
      const [year, monthNum] = month.split('-').map(Number);
      const monthStart = new Date(year, monthNum - 1, 1);
      const monthEnd = new Date(year, monthNum, 0, 23, 59, 59, 999); // Last day of the month
      
      // Fetch activities for this month
      const activitiesRes = await fetchActivity(
        token,
        monthStart.toISOString(),
        monthEnd.toISOString()
      );
      
      // Fetch dashboard data for this month (we'll need to modify API to accept date)
      // For now, use current dashboard and filter by activities
      const dashboardRes = await fetchDashboard(token, monthStart.toISOString());
      
      // Build snapshot data similar to CurrentMonthExpensesPage
      const expensesList: any[] = [];
      
      // Fixed expenses
      dashboardRes.data.fixedExpenses?.forEach((exp: any) => {
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
          subcategory: "Unspecified",
          paymentMode: "Cash"
        });
      });
      
      // Variable expenses
      dashboardRes.data.variablePlans?.forEach((plan: any) => {
        const actuals = (plan.actuals || []).filter((a: any) => {
          const actDate = new Date(a.incurredAt);
          return actDate >= monthStart && actDate <= monthEnd;
        });
        
        const actualsBySubcategory: any = {};
        actuals.forEach((actual: any) => {
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
              status: total >= plan.planned ? "completed" : "pending"
            });
          });
        });
      });
      
      setSelectedMonthData({
        month,
        expenses: expensesList,
        activities: activitiesRes.data || []
      });
    } catch (e) {
      console.error("Failed to load month snapshot:", e);
    } finally {
      setLoading(false);
    }
  };

  const loadTrendData = async () => {
    try {
      const res = await fetchActivity(token);
      const activities = res.data || [];
      
      // Group activities by month and calculate totals
      const monthlyData: Record<string, any> = {};
      
      activities.forEach((act: any) => {
        const date = new Date(act.createdAt);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = {
            month: monthKey,
            fixed: 0,
            variable: 0,
            investments: 0,
            overspends: 0,
            misses: 0
          };
        }
        
        const payload = act.payload || {};
        if (act.entity === 'fixed_expense' && payload.amount) {
          monthlyData[monthKey].fixed += payload.amount;
        } else if (act.entity === 'variable_expense' && payload.amount) {
          monthlyData[monthKey].variable += payload.amount;
        } else if (act.entity === 'investment' && payload.monthlyAmount) {
          monthlyData[monthKey].investments += payload.monthlyAmount;
        } else if (act.action === 'overspend_detected') {
          monthlyData[monthKey].overspends += 1;
        }
      });
      
      // Convert to array and sort
      const trendArray = Object.values(monthlyData).sort((a: any, b: any) => 
        a.month.localeCompare(b.month)
      );
      
      setTrendData(trendArray);
    } catch (e) {
      console.error("Failed to load trend data:", e);
    }
  };

  const formatMonth = (month: string) => {
    const [year, monthNum] = month.split('-');
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const COLORS = ['#00d9ff', '#a78bfa', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="history-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="history-modal-content"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="history-modal-header">
              <h2><FaChartLine style={{ marginRight: 8 }} />Activity History</h2>
              <button className="close-button" onClick={onClose}>
                <FaTimes />
              </button>
            </div>

            <div className="history-modal-tabs">
              <button
                className={viewMode === "snapshot" ? "active" : ""}
                onClick={() => setViewMode("snapshot")}
              >
                Monthly Snapshot
              </button>
              <button
                className={viewMode === "trends" ? "active" : ""}
                onClick={() => setViewMode("trends")}
              >
                Trends
              </button>
            </div>

            {viewMode === "snapshot" && (
              <div className="history-snapshot">
                <div className="month-selector">
                  <label>Select Month:</label>
                  <select
                    value={selectedMonth || availableMonths[0] || ""}
                    onChange={(e) => loadMonthSnapshot(e.target.value)}
                  >
                    {availableMonths.map(month => (
                      <option key={month} value={month}>
                        {formatMonth(month)}
                      </option>
                    ))}
                  </select>
                </div>

                {loading ? (
                  <SkeletonLoader type="card" count={5} />
                ) : selectedMonthData ? (
                  <div className="snapshot-content">
                    <h3>Expenses for {formatMonth(selectedMonthData.month)}</h3>
                    <div className="expenses-list">
                      {selectedMonthData.expenses.map((exp: any) => (
                        <div key={exp.id} className="expense-item">
                          <div className="expense-info">
                            <span className="expense-name">{exp.name}</span>
                            <span className="expense-category">{exp.category}</span>
                          </div>
                          <div className="expense-amount">
                            ₹{exp.amount.toLocaleString("en-IN")}
                          </div>
                          <div className={`expense-status ${exp.status}`}>
                            {exp.status}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="empty-state">No data available for this month</div>
                )}
              </div>
            )}

            {viewMode === "trends" && (
              <div className="history-trends">
                <h3>Monthly Trends</h3>
                {trendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis 
                        dataKey="month" 
                        tick={{ fill: '#cbd5e1' }}
                        tickFormatter={(value) => {
                          const [year, month] = value.split('-');
                          return `${month}/${year.slice(2)}`;
                        }}
                      />
                      <YAxis tick={{ fill: '#cbd5e1' }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1e293b', 
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend />
                      <Bar dataKey="fixed" fill="#00d9ff" name="Fixed Expenses" />
                      <Bar dataKey="variable" fill="#a78bfa" name="Variable Expenses" />
                      <Bar dataKey="investments" fill="#10b981" name="Investments" />
                      <Bar dataKey="overspends" fill="#ef4444" name="Overspends" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="empty-state">No trend data available</div>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

