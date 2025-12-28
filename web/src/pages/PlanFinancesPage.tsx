import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FaMoneyBillWave, FaChartBar, FaChartLine, FaHandHoldingUsd } from "react-icons/fa";
import { MdTrendingUp } from "react-icons/md";
import { fetchDashboard, fetchCreditCards } from "../api";
import "./PlanFinancesPage.css";

interface PlanFinancesPageProps {
  token: string;
}

export function PlanFinancesPage({ token }: PlanFinancesPageProps) {
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await fetchDashboard(token, "2025-01-15T00:00:00Z");
      setData(res.data);
    } catch (e) {
      console.error("Failed to load data:", e);
    }
  };

  const planItems = [
    {
      id: "fixed",
      title: "Plan Fixed Finances",
      icon: <FaMoneyBillWave size={32} />,
      count: data?.fixedExpenses?.length || 0,
      onClick: () => navigate("/settings/plan-finances/fixed")
    },
    {
      id: "variable",
      title: "Plan Variable Expenses",
      icon: <FaChartBar size={32} />,
      count: data?.variablePlans?.length || 0,
      onClick: () => navigate("/settings/plan-finances/variable")
    },
    {
      id: "investments",
      title: "Plan Investments",
      icon: <MdTrendingUp size={32} />,
      count: data?.investments?.length || 0,
      onClick: () => navigate("/settings/plan-finances/investments")
    },
    {
      id: "income",
      title: "Income",
      icon: <FaHandHoldingUsd size={32} />,
      count: data?.incomes?.length || 0,
      onClick: () => navigate("/settings/plan-finances/income")
    }
  ];

  return (
    <div className="plan-finances-page">
      <div className="page-header">
        <button className="back-button" onClick={() => navigate("/settings")}>
          ← Back
        </button>
        <h1>Plan Finances</h1>
      </div>

      <div className="plan-grid">
        {planItems.map((item, index) => (
          <motion.div
            key={item.id}
            className="plan-item"
            onClick={item.onClick}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.05, y: -4 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="plan-icon">{item.icon}</div>
            <h3>{item.title}</h3>
            <div className="plan-count">{item.count} items</div>
            <div className="plan-arrow">→</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

