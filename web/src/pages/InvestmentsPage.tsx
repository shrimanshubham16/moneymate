import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { MdTrendingUp } from "react-icons/md";
import { FaEdit, FaPause, FaPlay, FaTrashAlt, FaWallet, FaUserCircle, FaShieldAlt } from "react-icons/fa";
import { useEncryptedApiCalls } from "../hooks/useEncryptedApiCalls";
import { useSharedView } from "../hooks/useSharedView";
import { SharedViewBanner } from "../components/SharedViewBanner";
import { SkeletonLoader } from "../components/SkeletonLoader";
import { EmptyState } from "../components/EmptyState";
import { StatusBadge } from "../components/StatusBadge";
import { PageInfoButton } from "../components/PageInfoButton";
import { Modal } from "../components/Modal";
import { invalidateDashboardCache } from "../utils/cacheInvalidation";
import { useAppModal } from "../hooks/useAppModal";
import { AppModalRenderer } from "../components/AppModalRenderer";
import "./InvestmentsPage.css";

interface InvestmentsPageProps {
  token: string;
}

export function InvestmentsPage({ token }: InvestmentsPageProps) {
  const navigate = useNavigate();
  const api = useEncryptedApiCalls();
  const { modal, showAlert, showConfirm, closeModal, confirmAndClose } = useAppModal();
  const [investments, setInvestments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const hasFetchedRef = useRef(false);
  const lastViewRef = useRef<string>("");

  // Wallet update modal state
  const [walletModal, setWalletModal] = useState<{ isOpen: boolean; investmentId: string; investmentName: string; currentFund: number }>({
    isOpen: false, investmentId: "", investmentName: "", currentFund: 0
  });
  const [walletAmount, setWalletAmount] = useState("");
  const [sharedAggregates, setSharedAggregates] = useState<any[]>([]);

  // Shared view support
  const { selectedView, isSharedView, getViewParam, getOwnerName, isOwnItem } = useSharedView(token);

  useEffect(() => {
    if (hasFetchedRef.current && lastViewRef.current === selectedView) return;
    hasFetchedRef.current = true;
    lastViewRef.current = selectedView;
    loadInvestments();
  }, [selectedView]);

  const loadInvestments = async () => {
    try {
      const res = await api.fetchDashboard(token, new Date().toISOString(), getViewParam());
      setInvestments(res.data.investments || []);
      setSharedAggregates(res.data.sharedUserAggregates || []);
    } catch (e) {
      console.error("Failed to load investments:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleWalletUpdate = async () => {
    const amount = parseFloat(walletAmount);
    if (isNaN(amount)) {
      showAlert("Please enter a valid amount.");
      return;
    }
    try {
      await api.updateInvestment(token, walletModal.investmentId, { accumulatedFunds: amount });
      invalidateDashboardCache();
      setInvestments(prev => prev.map(i => i.id === walletModal.investmentId ? { ...i, accumulatedFunds: amount } : i));
      setWalletModal({ isOpen: false, investmentId: "", investmentName: "", currentFund: 0 });
      setWalletAmount("");
      loadInvestments();
    } catch (e: any) {
      showAlert("Failed to update: " + e.message);
    }
  };

  const handlePauseResume = async (inv: any) => {
    if (inv.isPriority && inv.status === "active") {
      showAlert("This investment is marked as Critical and cannot be paused. Edit it to remove the Critical tag first.");
      return;
    }
    try {
      const newStatus = inv.status === "active" ? "paused" : "active";
      setInvestments(prev => prev.map(i => i.id === inv.id ? { ...i, status: newStatus } : i));
      if (inv.status === "active") {
        await api.pauseInvestment(token, inv.id);
      } else {
        await api.resumeInvestment(token, inv.id);
      }
      invalidateDashboardCache();
      loadInvestments();
    } catch (e: any) {
      showAlert("Failed to update status: " + e.message);
    }
  };

  const handleDelete = async (inv: any) => {
    showConfirm(`Delete investment "${inv.name}"? This action cannot be undone.`, async () => {
      try {
        setInvestments(prev => prev.filter(i => i.id !== inv.id));
        await api.deleteInvestment(token, inv.id);
        invalidateDashboardCache();
        loadInvestments();
      } catch (e: any) {
        showAlert("Failed to delete: " + e.message);
      }
    });
  };

  return (
    <div className="investments-page">
      <div className="page-header">
        <button className="back-button" onClick={() => navigate("/dashboard")}>← Back</button>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <h1>Investments</h1>
          <PageInfoButton
            title="Investments"
            description="Your wealth-building tracker — SIPs, mutual funds, stocks, FDs, PPF, NPS, or any savings vehicle. See all your investment commitments in one place and never miss a monthly contribution."
            impact="Investments are treated as monthly obligations. Active ones reduce your available funds (just like expenses) because that money is committed. Marking them as paid keeps your health score honest and shows you've followed through."
            howItWorks={[
              "Add investments with a monthly amount, goal description, and status",
              "Active investments appear in your Dues each month — mark them paid after contributing",
              "Mark an investment as Critical (via Edit form) to protect it from pause suggestions",
              "Non-critical investments may be suggested for pausing on the Future Bombs page to free up funds",
              "Pause an investment to temporarily exclude it from health calculations",
              "Track accumulated funds to see how much you've built up over time"
            ]}
          />
        </div>
        {!isSharedView && (
          <button className="add-button" onClick={() => navigate("/settings/plan-finances/investments")}>
            + Add Investment
          </button>
        )}
      </div>

      <SharedViewBanner />

      {/* Shared user aggregate banners */}
      {isSharedView && (() => {
        const sharedInvs = investments.filter(inv => {
          const uid = inv.userId || inv.user_id;
          return uid && !isOwnItem(uid);
        });
        // Prefer server-side aggregates
        let sharedByUser: Record<string, { username: string; monthly: number; accumulated: number; count: number }>;
        if (sharedAggregates.length > 0) {
          sharedByUser = {};
          for (const agg of sharedAggregates) {
            const uid = agg.user_id;
            sharedByUser[uid] = {
              username: getOwnerName(uid),
              monthly: parseFloat(agg.total_investments_monthly) || 0,
              accumulated: 0, // Not tracked in aggregates table
              count: sharedInvs.filter(inv => (inv.userId || inv.user_id) === uid).length
            };
          }
        } else {
          sharedByUser = sharedInvs.reduce<Record<string, { username: string; monthly: number; accumulated: number; count: number }>>((acc, inv) => {
            const uid = inv.userId || inv.user_id;
            if (!acc[uid]) acc[uid] = { username: getOwnerName(uid), monthly: 0, accumulated: 0, count: 0 };
            acc[uid].monthly += (parseFloat(inv.monthlyAmount ?? inv.monthly_amount ?? 0) || 0);
            acc[uid].accumulated += (inv.accumulatedFunds || inv.accumulated_funds || 0);
            acc[uid].count += 1;
            return acc;
          }, {});
        }
        if (Object.keys(sharedByUser).length === 0) return null;
        return (
          <div className="shared-aggregate-section">
            {Object.entries(sharedByUser).map(([uid, info]) => (
              <div key={uid} className="shared-aggregate-card">
                <div className="shared-aggregate-header">
                  <FaUserCircle size={16} />
                  <span className="shared-aggregate-name">{info.username}'s Investments</span>
                </div>
                <div className="shared-aggregate-stats">
                  <div className="shared-aggregate-stat">
                    <span className="stat-value">₹{Math.round(info.monthly).toLocaleString("en-IN")}</span>
                    <span className="stat-label">Monthly</span>
                  </div>
                  <div className="shared-aggregate-stat">
                    <span className="stat-value">₹{Math.round(info.accumulated).toLocaleString("en-IN")}</span>
                    <span className="stat-label">Accumulated</span>
                  </div>
                  <div className="shared-aggregate-stat">
                    <span className="stat-value">{info.count}</span>
                    <span className="stat-label">Investments</span>
                  </div>
                </div>
                <p className="shared-aggregate-note">Individual items are encrypted — only totals are visible</p>
              </div>
            ))}
          </div>
        );
      })()}

      {/* ── Summary Strip ─────────────── */}
      {!loading && investments.length > 0 && (() => {
        // Use only own investments for the summary
        const ownInvs = isSharedView
          ? investments.filter(inv => { const uid = inv.userId || inv.user_id; return !uid || isOwnItem(uid); })
          : investments;
        const totalMonthly = ownInvs.reduce((s: number, inv: any) => s + (parseFloat(inv.monthlyAmount ?? inv.monthly_amount ?? 0) || 0), 0);
        const totalAccumulated = ownInvs.reduce((s: number, inv: any) => s + (inv.accumulatedFunds || inv.accumulated_funds || 0), 0);
        const activeCount = ownInvs.filter((inv: any) => inv.status === "active").length;
        const pausedCount = ownInvs.filter((inv: any) => inv.status !== "active").length;
        return (
          <div className="inv-summary-strip">
            <div className="inv-summary-item">
              <span className="inv-summary-label">Monthly Total</span>
              <span className="inv-summary-value">₹{Math.round(totalMonthly).toLocaleString("en-IN")}</span>
            </div>
            <div className="inv-summary-item">
              <span className="inv-summary-label">Total Accumulated</span>
              <span className="inv-summary-value green">₹{Math.round(totalAccumulated).toLocaleString("en-IN")}</span>
            </div>
            <div className="inv-summary-item">
              <span className="inv-summary-label">Active</span>
              <span className="inv-summary-value">{activeCount}</span>
            </div>
            {pausedCount > 0 && (
              <div className="inv-summary-item">
                <span className="inv-summary-label">Paused</span>
                <span className="inv-summary-value warn">{pausedCount}</span>
              </div>
            )}
          </div>
        );
      })()}

      {(() => {
        const ownInvs = isSharedView
          ? investments.filter(inv => { const uid = inv.userId || inv.user_id; return !uid || isOwnItem(uid); })
          : investments;
        const hasSharedItems = isSharedView && investments.some(inv => { const uid = inv.userId || inv.user_id; return uid && !isOwnItem(uid); });
        
        if (loading) return <SkeletonLoader type="list" count={4} />;
        if (ownInvs.length === 0 && !hasSharedItems) return (
          <EmptyState
            icon={<MdTrendingUp size={80} />}
            title="No Investments Yet"
            description="Start building wealth by adding your investments like SIPs, mutual funds, stocks, or savings plans"
            actionLabel={isSharedView ? undefined : "Add First Investment"}
            onAction={isSharedView ? undefined : () => navigate("/settings/plan-finances/investments")}
          />
        );
        if (ownInvs.length === 0 && isSharedView) return (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 14 }}>
            You have no investments yet — shared member totals are shown above
          </div>
        );
        return (
          <div className="investments-list">
            {ownInvs.map((inv, index) => (
              <motion.div
                key={inv.id}
                className={`investment-card ${inv.isPriority ? "priority" : ""}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="investment-info">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <h3>{inv.name}</h3>
                    {inv.isPriority && (
                      <span className="priority-badge">
                        <FaShieldAlt size={10} /> Critical
                      </span>
                    )}
                  </div>
                  <div className="investment-details">
                    <span>Goal: {inv.goal}</span>
                    <span>₹{(inv.monthlyAmount || inv.monthly_amount || 0).toLocaleString("en-IN")}/month</span>
                    <span style={{ color: '#10b981', fontWeight: 600 }}>
                      Saved: ₹{Math.round(inv.accumulatedFunds || inv.accumulated_funds || 0).toLocaleString("en-IN")}
                    </span>
                    {inv.status === "active" && (() => {
                      const monthly = parseFloat(inv.monthlyAmount ?? inv.monthly_amount ?? 0) || 0;
                      const accumulated = inv.accumulatedFunds || inv.accumulated_funds || 0;
                      const monthsContributing = monthly > 0 ? Math.floor(accumulated / monthly) : 0;
                      const milestoneAmount = monthly * 12;
                      const progressPct = milestoneAmount > 0 ? Math.min(100, (accumulated / milestoneAmount) * 100) : 0;
                      return (
                        <div className="goal-progress">
                          <div className="goal-progress-bar">
                            <div className="goal-progress-fill" style={{ width: `${progressPct}%` }} />
                          </div>
                          <div className="goal-progress-info">
                            <span>₹{Math.round(accumulated).toLocaleString("en-IN")} saved</span>
                            <span>{monthsContributing}mo contributing</span>
                          </div>
                        </div>
                      );
                    })()}
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
                    onClick={() => {
                      const currentFund = inv.accumulatedFunds || inv.accumulated_funds || 0;
                      setWalletModal({ isOpen: true, investmentId: inv.id, investmentName: inv.name, currentFund });
                      setWalletAmount(Math.round(currentFund).toString());
                    }}
                    title="Update Available Fund"
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
                    className={`icon-btn pause-btn ${inv.isPriority && inv.status === "active" ? "disabled" : ""}`}
                    onClick={() => handlePauseResume(inv)}
                    title={inv.isPriority && inv.status === "active" 
                      ? "Critical — cannot be paused (edit to change)" 
                      : inv.status === "active" ? "Pause" : "Resume"}
                  >
                    {inv.status === "active" ? <FaPause /> : <FaPlay />}
                  </button>
                  <button 
                    className="icon-btn delete-btn" 
                    onClick={() => handleDelete(inv)}
                    title="Delete"
                  >
                    <FaTrashAlt />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        );
      })()}

      {/* Wallet Update Modal */}
      {walletModal.isOpen && (
        <Modal
          isOpen={walletModal.isOpen}
          onClose={() => { setWalletModal({ isOpen: false, investmentId: "", investmentName: "", currentFund: 0 }); setWalletAmount(""); }}
          title={`Update Fund — ${walletModal.investmentName}`}
          size="sm"
          footer={
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => { setWalletModal({ isOpen: false, investmentId: "", investmentName: "", currentFund: 0 }); setWalletAmount(""); }}
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
            Current: ₹{Math.round(walletModal.currentFund).toLocaleString("en-IN")}
          </p>
          <input
            type="number"
            value={walletAmount}
            onChange={(e) => setWalletAmount(e.target.value)}
            placeholder="Enter new amount"
            style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)", color: "var(--text-primary)", fontSize: 16 }}
            autoFocus
          />
        </Modal>
      )}

      <AppModalRenderer modal={modal} closeModal={closeModal} confirmAndClose={confirmAndClose} />
    </div>
  );
}
