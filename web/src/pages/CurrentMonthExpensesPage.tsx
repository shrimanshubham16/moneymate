import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { fetchDashboard } from "../api";
import "./CurrentMonthExpensesPage.css";

interface CurrentMonthExpensesPageProps {
  token: string;
}

export function CurrentMonthExpensesPage({ token }: CurrentMonthExpensesPageProps) {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    try {
      const res = await fetchDashboard(token, "2025-01-15T00:00:00Z");
      const today = new Date();
      const expensesList: any[] = [];

      // Fixed expenses
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
          status: "pending",
          dueDate: today.toISOString().split("T")[0]
        });
      });

      // Variable expenses
      res.data.variablePlans?.forEach((plan: any) => {
        expensesList.push({
          id: plan.id,
          name: plan.name,
          category: plan.category,
          type: "Variable",
          amount: plan.actualTotal || 0,
          planned: plan.planned,
          status: plan.actualTotal >= plan.planned ? "completed" : "pending"
        });
      });

      // Group by category
      const grouped = expensesList.reduce((acc: any, exp: any) => {
        if (!acc[exp.category]) acc[exp.category] = [];
        acc[exp.category].push(exp);
        return acc;
      }, {});

      setExpenses(Object.entries(grouped).map(([category, items]: [string, any]) => ({
        category,
        items,
        total: items.reduce((sum: number, i: any) => sum + i.amount, 0)
      })));
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

  return (
    <div className="current-month-expenses-page">
      <div className="page-header">
        <button className="back-button" onClick={() => navigate("/dashboard")}>← Back</button>
        <h1>Current Month Expenses</h1>
        <p className="page-subtitle">Category-wise breakdown with payment status</p>
      </div>

      {loading ? <div>Loading...</div> : expenses.length === 0 ? (
        <div className="empty-state">No expenses for the current month.</div>
      ) : (
        <div className="expenses-by-category">
          {expenses.map((group, index) => (
            <motion.div
              key={group.category}
              className="category-group"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="category-header">
                <h2>{group.category}</h2>
                <div className="category-total">₹{group.total.toLocaleString("en-IN")}</div>
              </div>
              <div className="category-items">
                {group.items.map((item: any) => (
                  <div key={item.id} className="expense-item">
                    <div className="expense-info">
                      <h3>{item.name}</h3>
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
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

