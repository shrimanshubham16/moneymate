import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FaUserCircle, FaLock, FaInfoCircle } from "react-icons/fa";
import { useEncryptedApiCalls } from "../hooks/useEncryptedApiCalls";
import { useSharedView } from "../hooks/useSharedView";
import { SkeletonLoader } from "../components/SkeletonLoader";
import "./LoansPage.css";

interface LoansPageProps {
  token: string;
}

export function LoansPage({ token }: LoansPageProps) {
  const navigate = useNavigate();
  const api = useEncryptedApiCalls();
  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const hasFetchedRef = useRef(false);
  const lastViewRef = useRef<string>("");
  
  // Shared view support
  const { selectedView, isSharedView, getViewParam, getOwnerName, isOwnItem, formatSharedField } = useSharedView(token);

  useEffect(() => {
    if (hasFetchedRef.current && lastViewRef.current === selectedView) return;
    hasFetchedRef.current = true;
    lastViewRef.current = selectedView;
    loadLoans();
  }, [selectedView]);

  const loadLoans = async () => {
    try {
      const res = await api.fetchLoans(token);
      setLoans(res.data || []);
    } catch (e) {
      console.error("Failed to load loans:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="loans-page">
      <div className="page-header">
        <button className="back-button" onClick={() => navigate("/dashboard")}>← Back</button>
        <h1>Loans</h1>
        <p className="page-subtitle">Auto-fetched from fixed expenses with category=Loan</p>
      </div>
      {isSharedView && (
        <div style={{ marginBottom: 16, padding: '10px 14px', backgroundColor: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#a78bfa' }}>
          <FaInfoCircle size={14} />
          <span>Loans are derived from your own fixed expenses. Shared members&apos; loans are private.</span>
        </div>
      )}
      {loading ? <SkeletonLoader type="card" count={3} /> : loans.length === 0 ? (
        <div className="empty-state">No loans found. Add a fixed expense with category=Loan to see it here.</div>
      ) : (
        <div className="loans-list">
          {loans.map((loan, index) => {
            const loanUserId = loan.userId || loan.user_id;
            const isOwn = !loanUserId || isOwnItem(loanUserId);
            return (
              <motion.div
                key={loan.id}
                className={`loan-card ${!isOwn ? "shared-item" : ""}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="loan-header">
                  <h3>{formatSharedField(loan.name, isOwn)}</h3>
                  {isSharedView && (
                    <span className="owner-badge">
                      {isOwn ? <FaUserCircle /> : <FaLock />}
                      {getOwnerName(loanUserId)}
                    </span>
                  )}
                </div>
                <div className="loan-details">
                  <div className="detail-item">
                    <span className="label">EMI</span>
                    <span className="value">₹{(parseFloat(loan.emi) || 0).toLocaleString("en-IN")}/month</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Remaining Tenure</span>
                    <span className="value">{loan.remainingTenureMonths || 0} months</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Principal</span>
                    <span className="value">₹{(parseFloat(loan.principal) || 0).toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

