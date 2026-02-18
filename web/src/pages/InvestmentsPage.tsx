import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { MdTrendingUp } from "react-icons/md";
import { FaEdit, FaPause, FaPlay, FaTrashAlt, FaWallet, FaUserCircle, FaLock, FaShieldAlt } from "react-icons/fa";
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

  // Shared view support
  const { selectedView, isSharedView, getViewParam, getOwnerName, isOwnItem, formatSharedField } = useSharedView(token);

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
      setWalletModal({ isOpen: false, investmentId: "", investmentName: "", currentFund: 0 });
      setWalletAmount("");
      await loadInvestments();
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
      if (inv.status === "active") {
        await api.pauseInvestment(token, inv.id);
      } else {
        await api.resumeInvestment(token, inv.id);
      }
      invalidateDashboardCache();
      await loadInvestments();
    } catch (e: any) {
      showAlert("Failed to update status: " + e.message);
    }
  };

  const handleDelete = async (inv: any) => {
    showConfirm(`Delete investment "${inv.name}"? This action cannot be undone.`, async () => {
      try {
        await api.deleteInvestment(token, inv.id);
        invalidateDashboardCache();
        await loadInvestments();
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

      {loading ? (
        <SkeletonLoader type="list" count={4} />
      ) : investments.length === 0 ? (
        <EmptyState
          icon={<MdTrendingUp size={80} />}
          title="No Investments Yet"
          description="Start building wealth by adding your investments like SIPs, mutual funds, stocks, or savings plans"
          actionLabel={isSharedView ? undefined : "Add First Investment"}
          onAction={isSharedView ? undefined : () => navigate("/settings/plan-finances/investments")}
        />
      ) : (
        <div className="investments-list">
          {investments.map((inv, index) => {
            const invUserId = inv.userId || inv.user_id;
            const isOwn = !invUserId || isOwnItem(invUserId);
            return (
              <motion.div
                key={inv.id}
                className={`investment-card ${!isOwn ? "shared-item" : ""} ${inv.isPriority ? "priority" : ""}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="investment-info">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <h3>{formatSharedField(inv.name, isOwn)}</h3>
                    {inv.isPriority && (
                      <span className="priority-badge">
                        <FaShieldAlt size={10} /> Critical
                      </span>
                    )}
                    {isSharedView && (
                      <span style={{ fontSize: 11, color: isOwn ? '#10b981' : '#8b5cf6', display: 'flex', alignItems: 'center', gap: 4 }}>
                        {isOwn ? <FaUserCircle size={12} /> : <FaLock size={12} />}
                        {getOwnerName(invUserId)}
                      </span>
                    )}
                  </div>
                  <div className="investment-details">
                    <span>Goal: {formatSharedField(inv.goal, isOwn)}</span>
                    <span>₹{(inv.monthlyAmount || inv.monthly_amount || 0).toLocaleString("en-IN")}/month</span>
                    <span style={{ color: '#10b981', fontWeight: 600 }}>
                      Saved: ₹{Math.round(inv.accumulatedFunds || inv.accumulated_funds || 0).toLocaleString("en-IN")}
                    </span>
                    <StatusBadge 
                      status={inv.status === "active" ? "active" : "paused"} 
                      size="small" 
                      label={inv.status === "active" ? "Active" : "Paused"}
                    />
                    {inv.paid && <StatusBadge status="paid" size="small" />}
                  </div>
                </div>

                {isOwn ? (
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
                ) : (
                  <div className="investment-actions">
                    <span style={{ fontSize: 11, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <FaLock size={10} /> View Only
                    </span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

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
