import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FaUserCircle, FaLock, FaInfoCircle, FaLandmark, FaUniversity } from "react-icons/fa";
import { useEncryptedApiCalls } from "../hooks/useEncryptedApiCalls";
import { useSharedView } from "../hooks/useSharedView";
import { SharedViewBanner } from "../components/SharedViewBanner";
import { SkeletonLoader } from "../components/SkeletonLoader";
import { PageInfoButton } from "../components/PageInfoButton";
import "./LoansPage.css";

interface LoansPageProps {
  token: string;
}

export function LoansPage({ token }: LoansPageProps) {
  const navigate = useNavigate();
  const api = useEncryptedApiCalls();
  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState("₹");
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
      // Also fetch preferences for currency
      const [loanRes, dashRes] = await Promise.all([
        api.fetchLoans(token),
        api.fetchDashboard(token, new Date().toISOString(), getViewParam())
      ]);
      setLoans(loanRes.data || []);
      const pref = dashRes.data?.preferences;
      if (pref?.currency) {
        const sym: Record<string, string> = { INR: "₹", USD: "$", EUR: "€", GBP: "£" };
        setCurrency(sym[pref.currency] || pref.currency);
      }
    } catch (e) {
      console.error("Failed to load loans:", e);
    } finally {
      setLoading(false);
    }
  };

  // Aggregations
  const totalEmi = loans.reduce((sum, l) => sum + (parseFloat(l.emi) || 0), 0);
  const totalPrincipal = loans.reduce((sum, l) => sum + (parseFloat(l.principal) || 0), 0);
  const maxTenure = loans.reduce((max, l) => Math.max(max, l.remainingTenureMonths || 0), 0);

  return (
    <div className="loans-page">
      <div className="page-header">
        <button className="back-button" onClick={() => navigate("/dashboard")}>← Back</button>
        <h1><FaLandmark style={{ marginRight: 10, verticalAlign: "middle" }} />Loans</h1>
        <PageInfoButton
          title="Loans Overview"
          description="See all your active loans in one place — home loans, car loans, personal loans, education loans. This page auto-pulls any fixed expense categorised as a Loan so you don't have to enter them twice."
          impact="Every loan EMI is already counted in your fixed expenses and directly reduces your available funds and health score. Keeping this view helps you track your total debt commitment at a glance."
          howItWorks={[
            "Loans are automatically derived from fixed expenses with category = Loan",
            "EMI, principal, and remaining tenure are displayed per loan",
            "Loan amounts are already factored into your health score via fixed expenses",
            "To add a new loan, create a fixed expense with the Loan category"
          ]}
        />
      </div>

      <SharedViewBanner />

      {isSharedView && (
        <div className="loans-shared-info">
          <FaInfoCircle size={14} />
          <span>Loans are derived from your own fixed expenses. Shared members&apos; loans are private.</span>
        </div>
      )}

      {loading ? <SkeletonLoader type="card" count={3} /> : loans.length === 0 ? (
        <div className="loans-empty-state">
          <FaUniversity size={56} color="#60a5fa" />
          <h3>No Active Loans</h3>
          <p>When you add a fixed expense with the &ldquo;Loan&rdquo; category, it will appear here automatically with EMI, principal, and tenure details.</p>
        </div>
      ) : (
        <>
          {/* Summary Hero */}
          <div className="loans-summary-hero">
            <div className="loans-hero-main">
              <div className="loans-hero-label">Total Monthly EMI</div>
              <div className="loans-hero-amount">{currency}{totalEmi.toLocaleString("en-IN")}</div>
            </div>
            <div className="loans-hero-stats">
              <div className="loans-hero-stat">
                <span className="loans-stat-label">Loans</span>
                <span className="loans-stat-value stat-count">{loans.length}</span>
              </div>
              <div className="loans-hero-stat">
                <span className="loans-stat-label">Total Principal</span>
                <span className="loans-stat-value stat-emi">{currency}{totalPrincipal.toLocaleString("en-IN")}</span>
              </div>
              <div className="loans-hero-stat">
                <span className="loans-stat-label">Longest Tenure</span>
                <span className="loans-stat-value stat-tenure">{maxTenure} mo</span>
              </div>
            </div>
          </div>

          {/* Loans Grid */}
          <div className="loans-grid">
            {loans.map((loan, index) => {
              const loanUserId = loan.userId || loan.user_id;
              const isOwn = !loanUserId || isOwnItem(loanUserId);
              const emi = parseFloat(loan.emi) || 0;
              const principal = parseFloat(loan.principal) || 0;
              const tenure = loan.remainingTenureMonths || 0;
              // Estimate remaining balance for progress bar (rough: EMI * remaining months)
              const totalCost = emi * (loan.totalTenureMonths || tenure);
              const paid = totalCost > 0 ? Math.max(0, 1 - (emi * tenure) / totalCost) : 0;

              return (
                <motion.div
                  key={loan.id}
                  className={`loan-card ${!isOwn ? "shared-item" : ""}`}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <div className="loan-header">
                    <div className="loan-header-left">
                      <div className="loan-icon-wrap"><FaLandmark /></div>
                      <h3>{formatSharedField(loan.name, isOwn)}</h3>
                    </div>
                    <div className="loan-header-right">
                      {isSharedView && (
                        <span className="loan-owner-badge">
                          {isOwn ? <FaUserCircle size={10} /> : <FaLock size={10} />}
                          {getOwnerName(loanUserId)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="loan-details-grid">
                    <div className="loan-detail-item">
                      <span className="loan-detail-label">EMI</span>
                      <span className="loan-detail-value val-emi">{currency}{emi.toLocaleString("en-IN")}/mo</span>
                    </div>
                    <div className="loan-detail-item">
                      <span className="loan-detail-label">Remaining Tenure</span>
                      <span className="loan-detail-value val-tenure">{tenure} months</span>
                    </div>
                    <div className="loan-detail-item">
                      <span className="loan-detail-label">Principal</span>
                      <span className="loan-detail-value val-principal">{currency}{principal.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="loan-detail-item">
                      <span className="loan-detail-label">Outstanding</span>
                      <span className="loan-detail-value val-remaining">{currency}{(emi * tenure).toLocaleString("en-IN")}</span>
                    </div>
                  </div>

                  {/* Tenure Progress */}
                  {paid > 0 && (
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--text-tertiary)", marginBottom: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        <span>Repayment Progress</span>
                        <span>{Math.round(paid * 100)}%</span>
                      </div>
                      <div className="loan-tenure-bar">
                        <motion.div
                          className="loan-tenure-fill"
                          initial={{ width: 0 }}
                          animate={{ width: `${paid * 100}%` }}
                          transition={{ duration: 1, delay: index * 0.1 }}
                        />
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
