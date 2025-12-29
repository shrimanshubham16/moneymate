import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FaLightbulb } from "react-icons/fa";
import { fetchDashboard } from "../api";
import "./SIPExpensesPage.css";

interface SIPExpensesPageProps {
  token: string;
}

export function SIPExpensesPage({ token }: SIPExpensesPageProps) {
  const navigate = useNavigate();
  const [sipExpenses, setSipExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSIPExpenses();
  }, []);

  const loadSIPExpenses = async () => {
    try {
      const res = await fetchDashboard(token, "2025-01-15T00:00:00Z");
      const sips = (res.data.fixedExpenses || []).filter((exp: any) => exp.is_sip_flag);
      setSipExpenses(sips);
    } catch (e) {
      console.error("Failed to load SIP expenses:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sip-expenses-page">
      <div className="page-header">
        <button className="back-button" onClick={() => navigate("/dashboard")}>← Back</button>
        <h1>SIP for Periodic Expenses</h1>
        <p className="page-subtitle">Expenses marked for SIP accumulation with potential growth</p>
      </div>

      {loading ? <div>Loading...</div> : sipExpenses.length === 0 ? (
        <div className="empty-state">
          No SIP expenses. Mark expenses with frequency &gt; monthly as SIP to accumulate funds with growth.
        </div>
      ) : (
        <div className="sip-list">
          {sipExpenses.map((sip, index) => {
            const monthly = sip.frequency === "quarterly" ? sip.amount / 3 : sip.amount / 12;
            return (
              <motion.div
                key={sip.id}
                className="sip-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="sip-header">
                  <h3>{sip.name}</h3>
                  <span className="sip-badge">SIP</span>
                </div>
                <div className="sip-details">
                  <div className="detail-item">
                    <span className="label">Frequency</span>
                    <span className="value">{sip.frequency}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Total Amount</span>
                    <span className="value">₹{sip.amount.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Monthly Equivalent</span>
                    <span className="value">₹{Math.round(monthly).toLocaleString("en-IN")}/month</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Category</span>
                    <span className="value">{sip.category}</span>
                  </div>
                </div>
                <div className="sip-growth-info">
                  <p><FaLightbulb style={{ marginRight: 6, verticalAlign: 'middle' }} />Funds are accumulated monthly with potential growth until the due date.</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

