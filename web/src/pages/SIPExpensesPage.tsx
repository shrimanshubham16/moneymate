import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FaLightbulb, FaUserCircle, FaLock } from "react-icons/fa";
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
      // Pass view param for shared view support
      const res = await api.fetchDashboard(token, new Date().toISOString(), getViewParam());
      const sips = (res.data.fixedExpenses || []).filter((exp: any) => exp.is_sip_flag || exp.isSipFlag);
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
        <h1>
          SIP for Periodic Expenses
          <PageInfoButton
            title="SIP for Periodic Expenses"
            description="These are expenses that don't hit every month — like insurance premiums (quarterly/annual) or school fees. By marking them as SIP, you set aside a small monthly amount so you're always prepared when payment is due."
            impact="SIP expenses smooth out large irregular payments into manageable monthly contributions. This prevents financial shocks and keeps your health score stable across months."
            howItWorks={[
              "Create a fixed expense with quarterly or annual frequency and enable the SIP flag",
              "The monthly equivalent is auto-calculated (e.g., ₹12,000/year = ₹1,000/month)",
              "Funds accumulate month over month towards the next due date",
              "To manage SIP expenses, edit them in the Fixed Expenses page"
            ]}
          />
        </h1>
      </div>

      <SharedViewBanner />

      {loading ? <SkeletonLoader type="card" count={3} /> : sipExpenses.length === 0 ? (
        <div className="empty-state">
          No SIP expenses. Mark expenses with frequency &gt; monthly as SIP to accumulate funds with growth.
        </div>
      ) : (
        <div className="sip-list">
          {sipExpenses.map((sip, index) => {
            const monthly = sip.frequency === "quarterly" ? sip.amount / 3 : sip.amount / 12;
            const sipUserId = sip.userId || sip.user_id;
            const isOwn = !sipUserId || isOwnItem(sipUserId);
            return (
              <motion.div
                key={sip.id}
                className={`sip-card ${!isOwn ? "shared-item" : ""}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="sip-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h3>{sip.name}</h3>
                    {isSharedView && (
                      <span style={{ fontSize: 11, color: isOwn ? '#10b981' : '#8b5cf6', display: 'flex', alignItems: 'center', gap: 4 }}>
                        {isOwn ? <FaUserCircle size={12} /> : <FaLock size={12} />}
                        {getOwnerName(sipUserId)}
                      </span>
                    )}
                  </div>
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
