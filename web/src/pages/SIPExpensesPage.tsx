import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FaLightbulb, FaUserCircle, FaPiggyBank, FaLayerGroup, FaWallet, FaExclamationTriangle, FaForward, FaUndo } from "react-icons/fa";
import { useEncryptedApiCalls } from "../hooks/useEncryptedApiCalls";
import { useSharedView } from "../hooks/useSharedView";
import { SharedViewBanner } from "../components/SharedViewBanner";
import { SkeletonLoader } from "../components/SkeletonLoader";
import { PageInfoButton } from "../components/PageInfoButton";
import { Modal } from "../components/Modal";
import { invalidateDashboardCache } from "../utils/cacheInvalidation";
import { useAppModal } from "../hooks/useAppModal";
import { AppModalRenderer } from "../components/AppModalRenderer";
import { hapticSuccess, feedbackPipe, feedbackBump } from "../utils/haptics";
import "./SIPExpensesPage.css";

interface SIPExpensesPageProps {
  token: string;
}

export function SIPExpensesPage({ token }: SIPExpensesPageProps) {
  const navigate = useNavigate();
  const api = useEncryptedApiCalls();
  const { modal, showAlert, showConfirm, closeModal, confirmAndClose } = useAppModal();
  const [sipExpenses, setSipExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState("₹");
  const hasFetchedRef = useRef(false);
  const lastViewRef = useRef<string>("");

  // Wallet update modal for SIP expenses
  const [walletModal, setWalletModal] = useState<{ isOpen: boolean; expenseId: string; expenseName: string; currentFund: number }>({
    isOpen: false, expenseId: "", expenseName: "", currentFund: 0
  });
  const [walletAmount, setWalletAmount] = useState("");

  // Shared view support
  const { selectedView, isSharedView, getViewParam, isOwnItem, getOwnerName } = useSharedView(token);

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

  const handleWalletUpdate = async () => {
    const amount = parseFloat(walletAmount);
    if (isNaN(amount) || amount < 0) {
      showAlert("Please enter a valid amount.");
      return;
    }
    try {
      // Optimistic update first — immediate UI feedback
      setSipExpenses(prev => prev.map(e => e.id === walletModal.expenseId ? { ...e, accumulatedFunds: amount, accumulated_funds: amount } : e));
      setWalletModal({ isOpen: false, expenseId: "", expenseName: "", currentFund: 0 });
      setWalletAmount("");
      await api.updateFixedExpense(token, walletModal.expenseId, { accumulated_funds: amount });
      hapticSuccess(null);
      invalidateDashboardCache();
      loadSIPExpenses().catch(console.error);
    } catch (e: any) {
      feedbackBump();
      loadSIPExpenses().catch(console.error);
      showAlert("Failed to update: " + e.message);
    }
  };

  const handleSkipSIP = (sip: any) => {
    const isPeriodicSip = sip.frequency && sip.frequency !== 'monthly';
    if (!isPeriodicSip) {
      showAlert("Skip is only available for periodic (non-monthly) SIPs.");
      return;
    }
    showConfirm(
      `Skip saving for "${sip.name}" this month? This removes the obligation from your health score and no funds will accumulate. You can undo this anytime.`,
      async () => {
        try {
          setSipExpenses(prev => prev.map(s => s.id === sip.id ? { ...s, isSkipped: true } : s));
          await api.skipSIP(token, sip.id);
          invalidateDashboardCache();
          feedbackPipe();
          loadSIPExpenses();
        } catch (e: any) {
          feedbackBump();
          loadSIPExpenses();
          showAlert("Failed to skip: " + e.message);
        }
      },
      "Skip This Month?"
    );
  };

  const handleUndoSkipSIP = async (sip: any) => {
    try {
      setSipExpenses(prev => prev.map(s => s.id === sip.id ? { ...s, isSkipped: false } : s));
      await api.undoSkipSIP(token, sip.id);
      invalidateDashboardCache();
      feedbackPipe();
      loadSIPExpenses();
    } catch (e: any) {
      feedbackBump();
      loadSIPExpenses();
      showAlert("Failed to undo skip: " + e.message);
    }
  };

  // Compute monthly equivalent
  const getMonthly = (sip: any) => {
    if (sip.frequency === "quarterly") return sip.amount / 3;
    if (sip.frequency === "yearly" || sip.frequency === "annual") return sip.amount / 12;
    return sip.amount;
  };

  // Calculate behind-schedule info for a SIP
  const getBehindSchedule = (sip: any) => {
    const startDate = sip.startDate || sip.start_date;
    if (!startDate) return null;
    
    const start = new Date(startDate);
    const now = new Date();
    const monthsSinceStart = Math.max(0,
      (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
    );
    
    const monthly = getMonthly(sip);
    const expectedAccumulated = monthly * monthsSinceStart;
    const actual = sip.accumulatedFunds || sip.accumulated_funds || 0;
    const deficit = expectedAccumulated - actual;
    
    if (deficit <= 0) return null;
    
    const monthsBehind = monthly > 0 ? Math.round(deficit / monthly) : 0;
    return { deficit: Math.round(deficit), monthsBehind };
  };

  // Separate own vs shared SIPs
  const ownSips = isSharedView
    ? sipExpenses.filter(s => { const uid = s.userId || s.user_id; return !uid || isOwnItem(uid); })
    : sipExpenses;
  const sharedSips = isSharedView ? sipExpenses.filter(s => { const uid = s.userId || s.user_id; return uid && !isOwnItem(uid); }) : [];

  // Group shared SIPs by user for aggregate banner
  const sharedByUser = sharedSips.reduce<Record<string, { username: string; monthly: number; accumulated: number; count: number }>>((acc, s) => {
    const uid = s.userId || s.user_id;
    if (!acc[uid]) acc[uid] = { username: getOwnerName(uid), monthly: 0, accumulated: 0, count: 0 };
    acc[uid].monthly += getMonthly(s);
    acc[uid].accumulated += s.accumulatedFunds || 0;
    acc[uid].count++;
    return acc;
  }, {});

  // Aggregates (own only)
  const totalMonthly = ownSips.reduce((sum, s) => sum + getMonthly(s), 0);
  const totalTarget = ownSips.reduce((sum, s) => sum + (s.amount || 0), 0);
  const totalAccumulated = ownSips.reduce((sum, s) => sum + (s.accumulatedFunds || 0), 0);

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

      {/* Shared user aggregate banners */}
      {isSharedView && Object.keys(sharedByUser).length > 0 && (
        <div className="shared-aggregate-section">
          {Object.entries(sharedByUser).map(([uid, info]) => (
            <div key={uid} className="shared-aggregate-card">
              <div className="shared-aggregate-header">
                <FaUserCircle size={16} />
                <span className="shared-aggregate-name">{info.username}'s SIP Expenses</span>
              </div>
              <div className="shared-aggregate-stats">
                <div className="shared-aggregate-stat">
                  <span className="stat-value">{currency}{Math.round(info.monthly).toLocaleString("en-IN")}</span>
                  <span className="stat-label">Monthly SIP</span>
                </div>
                <div className="shared-aggregate-stat">
                  <span className="stat-value">{currency}{Math.round(info.accumulated).toLocaleString("en-IN")}</span>
                  <span className="stat-label">Accumulated</span>
                </div>
                <div className="shared-aggregate-stat">
                  <span className="stat-value">{info.count}</span>
                  <span className="stat-label">SIPs</span>
                </div>
              </div>
              <p className="shared-aggregate-note">Individual items are encrypted — only totals are visible</p>
            </div>
          ))}
        </div>
      )}

      {loading ? <SkeletonLoader type="card" count={3} /> : ownSips.length === 0 && sharedSips.length === 0 ? (
        <div className="sip-empty-state">
          <FaLayerGroup size={56} color="#f59e0b" />
          <h3>No SIP Expenses</h3>
          <p>When you create a fixed expense with quarterly or annual frequency and enable the SIP flag, it will appear here. SIP smooths irregular payments into manageable monthly savings.</p>
        </div>
      ) : ownSips.length === 0 && isSharedView ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 14 }}>
          You have no SIP expenses. Only shared member totals are shown above.
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
            {ownSips.map((sip, index) => {
              const monthly = getMonthly(sip);
              const accumulated = sip.accumulatedFunds || 0;
              const progressPct = sip.amount > 0 ? Math.min((accumulated / sip.amount) * 100, 100) : 0;
              const behindInfo = getBehindSchedule(sip);
              const isSkipped = sip.isSkipped === true;

              return (
                <motion.div
                  key={sip.id}
                  className={`sip-card ${behindInfo ? "sip-behind" : ""} ${isSkipped ? "sip-skipped-card" : ""}`}
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
                      <button
                        className="sip-wallet-btn"
                        onClick={() => {
                          const currentFund = sip.accumulatedFunds || sip.accumulated_funds || 0;
                          setWalletModal({ isOpen: true, expenseId: sip.id, expenseName: sip.name, currentFund });
                          setWalletAmount(Math.round(currentFund).toString());
                        }}
                        title="Update Accumulated Fund"
                      >
                        <FaWallet size={14} />
                      </button>
                      {isSkipped && <span className="sip-skipped-badge"><FaForward size={10} /> Skipped</span>}
                      <span className="sip-freq-badge">{sip.frequency}</span>
                      <span className="sip-badge">SIP</span>
                    </div>
                  </div>

                  {/* Behind Schedule Warning */}
                  {behindInfo && (
                    <div className="sip-behind-alert">
                      <FaExclamationTriangle size={13} />
                      <span>
                        Behind by {behindInfo.monthsBehind} month{behindInfo.monthsBehind !== 1 ? "s" : ""} — 
                        catch-up needed: {currency}{behindInfo.deficit.toLocaleString("en-IN")}
                      </span>
                    </div>
                  )}

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
                          className={`sip-progress-fill ${behindInfo ? "sip-progress-behind" : ""}`}
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
                    <span>{isSkipped 
                      ? "This SIP is skipped for the current month. No funds will accumulate and the obligation is removed from your health score."
                      : "Funds accumulate monthly towards the next due date — no financial shocks when it's time to pay."
                    }</span>
                  </div>

                  {/* Skip / Undo Skip action for periodic SIPs */}
                  {sip.frequency !== 'monthly' && !isSharedView && (
                    <div className="sip-skip-actions">
                      {isSkipped ? (
                        <button className="sip-action-btn sip-undo-skip-btn" onClick={() => handleUndoSkipSIP(sip)}>
                          <FaUndo size={12} /> Undo Skip
                        </button>
                      ) : !sip.paid ? (
                        <button className="sip-action-btn sip-skip-btn" onClick={() => handleSkipSIP(sip)}>
                          <FaForward size={12} /> Skip This Month
                        </button>
                      ) : null}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </>
      )}
      {/* Wallet Update Modal */}
      {walletModal.isOpen && (
        <Modal
          isOpen={walletModal.isOpen}
          onClose={() => { setWalletModal({ isOpen: false, expenseId: "", expenseName: "", currentFund: 0 }); setWalletAmount(""); }}
          title={`Update Fund — ${walletModal.expenseName}`}
          size="sm"
          footer={
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => { setWalletModal({ isOpen: false, expenseId: "", expenseName: "", currentFund: 0 }); setWalletAmount(""); }}
                style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "var(--text-primary)", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={handleWalletUpdate}
                style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "var(--accent-cyan, #22d3ee)", color: "#041019", fontWeight: 700, cursor: "pointer" }}
              >
                Update
              </button>
            </div>
          }
        >
          <p style={{ margin: "0 0 12px", color: "var(--text-secondary)" }}>
            Current Accumulated: {currency}{Math.round(walletModal.currentFund).toLocaleString("en-IN")}
          </p>
          <input
            type="number"
            value={walletAmount}
            onChange={(e) => setWalletAmount(e.target.value)}
            placeholder="Enter new accumulated amount"
            min="0"
            style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)", color: "var(--text-primary)", fontSize: 16 }}
            autoFocus
          />
        </Modal>
      )}

      <AppModalRenderer modal={modal} closeModal={closeModal} confirmAndClose={confirmAndClose} />
    </div>
  );
}
