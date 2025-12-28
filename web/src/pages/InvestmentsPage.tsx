import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { MdTrendingUp } from "react-icons/md";
import { fetchDashboard } from "../api";
import { SkeletonLoader } from "../components/SkeletonLoader";
import { EmptyState } from "../components/EmptyState";
import { StatusBadge } from "../components/StatusBadge";
import "./InvestmentsPage.css";

interface InvestmentsPageProps {
  token: string;
}

export function InvestmentsPage({ token }: InvestmentsPageProps) {
  const navigate = useNavigate();
  const [investments, setInvestments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInvestments();
  }, []);

  const loadInvestments = async () => {
    try {
      const res = await fetchDashboard(token, "2025-01-15T00:00:00Z");
      setInvestments(res.data.investments || []);
    } catch (e) {
      console.error("Failed to load investments:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="investments-page">
      <div className="page-header">
        <button className="back-button" onClick={() => navigate("/dashboard")}>← Back</button>
        <h1>Investments</h1>
        <button className="add-button" onClick={() => navigate("/settings/plan-finances/investments")}>
          + Add Investment
        </button>
      </div>
      {loading ? (
        <SkeletonLoader type="list" count={4} />
      ) : investments.length === 0 ? (
        <EmptyState
          icon={<MdTrendingUp size={80} />}
          title="No Investments Yet"
          description="Start building wealth by adding your investments like SIPs, mutual funds, stocks, or savings plans"
          actionLabel="Add First Investment"
          onAction={() => navigate("/settings/plan-finances/investments/manage")}
        />
      ) : (
        <div className="investments-list">
          {investments.map((inv, index) => (
            <motion.div
              key={inv.id}
              className="investment-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <div className="investment-info">
                <h3>{inv.name}</h3>
                <div className="investment-details">
                  <span>Goal: {inv.goal}</span>
                  <span>₹{inv.monthlyAmount.toLocaleString("en-IN")}/month</span>
                  <StatusBadge 
                    status={inv.status === "active" ? "active" : "paused"} 
                    size="small" 
                    label={inv.status === "active" ? "Active" : "Paused"}
                  />
                  {inv.paid && <StatusBadge status="paid" size="small" />}
                </div>
              </div>
              <div className="investment-actions">
                <button onClick={() => navigate(`/settings/plan-finances/investments?edit=${inv.id}`)}>Update</button>
                <button onClick={() => {/* pause/resume logic */}}>
                  {inv.status === "active" ? "Pause" : "Resume"}
                </button>
                <button className="delete-btn" onClick={() => {/* delete logic */}}>Delete</button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

