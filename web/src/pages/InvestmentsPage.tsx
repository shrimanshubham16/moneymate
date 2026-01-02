import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { MdTrendingUp } from "react-icons/md";
import { FaEdit, FaPause, FaPlay, FaTrashAlt, FaWallet } from "react-icons/fa";
import { fetchDashboard, updateInvestment } from "../api";
import { SkeletonLoader } from "../components/SkeletonLoader";
import { EmptyState } from "../components/EmptyState";
import { StatusBadge } from "../components/StatusBadge";
import { PageInfoButton } from "../components/PageInfoButton";
import { ClientCache } from "../utils/cache";
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
      // Extract userId from token for cache
      let userId = 'unknown';
      try {
        const tokenPayload = JSON.parse(atob(token.split('.')[1]));
        userId = tokenPayload.userId;
      } catch (e) {
        console.error('[CACHE_ERROR] Failed to extract userId from token:', e);
      }

      // Try cache first for faster load
      const cached = ClientCache.get<any>('dashboard', userId);
      if (cached?.investments) {
        setInvestments(cached.investments);
        setLoading(false);
      }
      
      // Fetch fresh data
      const res = await fetchDashboard(token, "2025-01-15T00:00:00Z");
      setInvestments(res.data.investments || []);
      ClientCache.set('dashboard', res.data, userId);
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
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <h1>Investments</h1>
          <PageInfoButton
            title="Investments"
            description="Track your investments like SIPs, mutual funds, stocks, fixed deposits, and other savings plans. Monitor your wealth-building journey."
            impact="Active investments are considered as monthly obligations and reduce your available funds. Unpaid investments negatively impact your health score, so it's important to mark them as paid when you invest."
            howItWorks={[
              "Add investments with monthly amount, goal, and status (active/paused/completed)",
              "Mark investments as paid when you make monthly contributions",
              "Active investments are automatically included in health score calculations",
              "Track your investment goals and progress over time",
              "Paused or completed investments don't affect your health score"
            ]}
          />
        </div>
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
                  {(inv.accumulatedFunds || inv.accumulated_funds || 0) > 0 && (
                    <span style={{ color: '#10b981', fontWeight: 600 }}>
                      Saved: ₹{Math.round(inv.accumulatedFunds || inv.accumulated_funds || 0).toLocaleString("en-IN")}
                    </span>
                  )}
                  <StatusBadge 
                    status={inv.status === "active" ? "active" : "paused"} 
                    size="small" 
                    label={inv.status === "active" ? "Active" : "Paused"}
                  />
                  {inv.paid && <StatusBadge status="paid" size="small" />}
                </div>
              </div>
              <div className="investment-actions">
                <button 
                  className="icon-btn wallet-btn" 
                  onClick={async () => {
                    // #region agent log
                    fetch('http://127.0.0.1:7242/ingest/620c30bd-a4ac-4892-8325-a941881cbeee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InvestmentsPage.tsx:120',message:'Update available fund clicked',data:{invId:inv.id,currentAmount:inv.accumulatedFunds||inv.accumulated_funds||0},timestamp:Date.now(),sessionId:'debug-session',runId:'invest-update-fund',hypothesisId:'A'}}).catch(()=>{});
                    // #endregion
                    const newAmount = prompt(`Update available fund for ${inv.name}:\nCurrent: ₹${Math.round(inv.accumulatedFunds || inv.accumulated_funds || 0).toLocaleString("en-IN")}\n\nEnter new amount:`);
                    if (newAmount !== null && !isNaN(parseFloat(newAmount))) {
                      try {
                        // #region agent log
                        fetch('http://127.0.0.1:7242/ingest/620c30bd-a4ac-4892-8325-a941881cbeee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InvestmentsPage.tsx:124',message:'Calling updateInvestment with accumulatedFunds',data:{invId:inv.id,newAmount:parseFloat(newAmount)},timestamp:Date.now(),sessionId:'debug-session',runId:'invest-update-fund',hypothesisId:'A'}}).catch(()=>{});
                        // #endregion
                        await updateInvestment(token, inv.id, { accumulatedFunds: parseFloat(newAmount) });
                        // #region agent log
                        fetch('http://127.0.0.1:7242/ingest/620c30bd-a4ac-4892-8325-a941881cbeee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InvestmentsPage.tsx:126',message:'updateInvestment succeeded',data:{invId:inv.id},timestamp:Date.now(),sessionId:'debug-session',runId:'invest-update-fund',hypothesisId:'A'}}).catch(()=>{});
                        // #endregion
                        await loadInvestments();
                      } catch (e: any) {
                        // #region agent log
                        fetch('http://127.0.0.1:7242/ingest/620c30bd-a4ac-4892-8325-a941881cbeee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InvestmentsPage.tsx:128',message:'updateInvestment error',data:{error:e?.message,stack:e?.stack,invId:inv.id},timestamp:Date.now(),sessionId:'debug-session',runId:'invest-update-fund',hypothesisId:'A'}}).catch(()=>{});
                        // #endregion
                        alert("Failed to update: " + e.message);
                      }
                    }
                  }}
                  title="Update Available Fund"
                  style={{ color: '#10b981' }}
                >
                  <FaWallet />
                </button>
                <button 
                  className="icon-btn edit-btn" 
                  onClick={() => navigate(`/settings/plan-finances/investments?edit=${inv.id}`)}
                  title="Edit"
                >
                  <FaEdit />
                </button>
                <button 
                  className="icon-btn pause-btn" 
                  onClick={() => {/* pause/resume logic */}}
                  title={inv.status === "active" ? "Pause" : "Resume"}
                >
                  {inv.status === "active" ? <FaPause /> : <FaPlay />}
                </button>
                <button 
                  className="icon-btn delete-btn" 
                  onClick={() => {/* delete logic */}}
                  title="Delete"
                >
                  <FaTrashAlt />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

