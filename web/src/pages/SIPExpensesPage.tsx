import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FaLightbulb, FaUserCircle, FaLock, FaPiggyBank, FaLayerGroup } from "react-icons/fa";
import { useEncryptedApiCalls } from "../hooks/useEncryptedApiCalls";
import { useSharedView } from "../hooks/useSharedView";
import { SharedViewBanner } from "../components/SharedViewBanner";
import { SkeletonLoader } from "../components/SkeletonLoader";
import { PageInfoButton } from "../components/PageInfoButton";
import "./SIPExpensesPage.css";

interface SIPExpensesPageProps {
  token: string;
}

export function SIPExpensesPage({ token }: SIPExpensesPageProps) {
  const navigate = useNavigate();
  const api = useEncryptedApiCalls();
  const [sipExpenses, setSipExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState("₹");
  const hasFetchedRef = useRef(false);
  const lastViewRef = useRef<string>("");

  // Shared view support
  const { selectedView, isSharedView, getViewParam, getOwnerName, isOwnItem } = useSharedView(token);

  useEffect(() => {
    if (hasFetchedRef.current && lastViewRef.current === selectedView) return;
    hasFetchedRef.current = true;
    lastViewRef.current = selectedView;
    loadSIPExpenses();
  }, [selectedView]);

  const loadSIPExpenses = async () => {
    try {
      const res = await api.fetchDashboard(token, new Date().toISOString(), getViewParam());
      const sips = (res.data.fixedExpenses || []).filter((exp: any) => exp.is_sip_flag || exp.isSipFlag);
      setSipExpenses(sips);

      const pref = res.data?.preferences;
      if (pref?.currency) {
        const sym: Record<string, string> = { INR: "₹", USD: "$", EUR: "€", GBP: "£" };
        setCurrency(sym[pref.currency] || pref.currency);
      }
    } catch (e) {
      console.error("Failed to load SIP expenses:", e);
    } finally {
      setLoading(false);
    }
  };

  // Compute monthly equivalent
  const getMonthly = (sip: any) => {
    if (sip.frequency === "quarterly") return sip.amount / 3;
    if (sip.frequency === "yearly" || sip.frequency === "annual") return sip.amount / 12;
    return sip.amount;
  };

  // Aggregates
  const totalMonthly = sipExpenses.reduce((sum, s) => sum + getMonthly(s), 0);
  const totalTarget = sipExpenses.reduce((sum, s) => sum + (s.amount || 0), 0);
  const totalAccumulated = sipExpenses.reduce((sum, s) => sum + (s.accumulatedFunds || 0), 0);

  return (
    <div className="sip-expenses-page">
      <div className="page-header">
        <button className="back-button" onClick={() => navigate("/dashboard")}>← Back</button>
        <h1><FaPiggyBank style={{ marginRight: 10, verticalAlign: "middle" }} />SIP Expenses</h1>
        <PageInfoButton
          title="SIP for Periodic Expenses"
          description="These are expenses that don't hit every month — like insurance premiums (quarterly/annual) or school fees. By marking them as SIP, you set aside a small monthly amount so you're always prepared when payment is due."
          impact="SIP expenses smooth out large irregular payments into manageable monthly contributions. This prevents financial shocks and keeps your health score stable across months."
          howItWorks={[
            "Create a fixed expense with quarterly or annual frequency and enable the SIP flag",
            "The monthly equivalent is auto-calculated (e.g., ₹12,000/year = ₹1,000/month)",
            "Funds accumulate month over month towards the next due date",
            "When payment is due, accumulated funds cover it — no big dip in your balance",
            "To manage SIP expenses, edit them on the Fixed Expenses page"
          ]}
        />
      </div>

      <SharedViewBanner />

      {loading ? <SkeletonLoader type="card" count={3} /> : sipExpenses.length === 0 ? (
        <div className="sip-empty-state">
          <FaLayerGroup size={56} color="#f59e0b" />
          <h3>No SIP Expenses</h3>
          <p>When you create a fixed expense with quarterly or annual frequency and enable the SIP flag, it will appear here. SIP smooths irregular payments into manageable monthly savings.</p>
        </div>
      ) : (
        <>
          {/* Summary Hero */}
          <div className="sip-summary-hero">
            <div className="sip-hero-main">
              <div className="sip-hero-label">Monthly SIP Total</div>
              <div className="sip-hero-amount">{currency}{Math.round(totalMonthly).toLocaleString("en-IN")}</div>
            </div>
            <div className="sip-hero-stats">
              <div className="sip-hero-stat">
                <span className="sip-stat-label">SIPs</span>
                <span className="sip-stat-value stat-count">{sipExpenses.length}</span>
              </div>
              <div className="sip-hero-stat">
                <span className="sip-stat-label">Total Target</span>
                <span className="sip-stat-value stat-total">{currency}{totalTarget.toLocaleString("en-IN")}</span>
              </div>
              <div className="sip-hero-stat">
                <span className="sip-stat-label">Accumulated</span>
                <span className="sip-stat-value stat-accumulated">{currency}{Math.round(totalAccumulated).toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>

          {/* SIP Grid */}
          <div className="sip-grid">
            {sipExpenses.map((sip, index) => {
              const monthly = getMonthly(sip);
              const sipUserId = sip.userId || sip.user_id;
              const isOwn = !sipUserId || isOwnItem(sipUserId);
              const accumulated = sip.accumulatedFunds || 0;
              const progressPct = sip.amount > 0 ? Math.min((accumulated / sip.amount) * 100, 100) : 0;

              return (
                <motion.div
                  key={sip.id}
                  className={`sip-card ${!isOwn ? "shared-item" : ""}`}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <div className="sip-header">
                    <div className="sip-header-left">
                      <div className="sip-icon-wrap"><FaPiggyBank /></div>
                      <h3>{sip.name}</h3>
                    </div>
                    <div className="sip-header-right">
                      {isSharedView && (
                        <span className="sip-owner-badge">
                          {isOwn ? <FaUserCircle size={10} /> : <FaLock size={10} />}
                          {getOwnerName(sipUserId)}
                        </span>
                      )}
                      <span className="sip-freq-badge">{sip.frequency}</span>
                      <span className="sip-badge">SIP</span>
                    </div>
                  </div>

                  <div className="sip-details-grid">
                    <div className="sip-detail-item">
                      <span className="sip-detail-label">Total Amount</span>
                      <span className="sip-detail-value val-total">{currency}{sip.amount.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="sip-detail-item">
                      <span className="sip-detail-label">Monthly SIP</span>
                      <span className="sip-detail-value val-monthly">{currency}{Math.round(monthly).toLocaleString("en-IN")}/mo</span>
                    </div>
                    <div className="sip-detail-item">
                      <span className="sip-detail-label">Accumulated</span>
                      <span className="sip-detail-value val-accumulated">{currency}{Math.round(accumulated).toLocaleString("en-IN")}</span>
                    </div>
                    <div className="sip-detail-item">
                      <span className="sip-detail-label">Category</span>
                      <span className="sip-detail-value val-category">{sip.category || "—"}</span>
                    </div>
                  </div>

                  {/* Accumulation Progress */}
                  {sip.amount > 0 && (
                    <div className="sip-progress-wrap">
                      <div className="sip-progress-meta">
                        <span>Accumulation Progress</span>
                        <span>{Math.round(progressPct)}%</span>
                      </div>
                      <div className="sip-progress-bar">
                        <motion.div
                          className="sip-progress-fill"
                          initial={{ width: 0 }}
                          animate={{ width: `${progressPct}%` }}
                          transition={{ duration: 1, delay: index * 0.1 }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Tip */}
                  <div className="sip-tip">
                    <FaLightbulb size={14} />
                    <span>Funds accumulate monthly towards the next due date — no financial shocks when it&apos;s time to pay.</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
