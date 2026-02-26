import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FaUserCircle, FaCheckCircle, FaFileInvoiceDollar, FaCreditCard, FaChartLine, FaCalendarCheck, FaCheck, FaForward, FaUndo } from "react-icons/fa";
import { useEncryptedApiCalls } from "../hooks/useEncryptedApiCalls";
import { useSharedView } from "../hooks/useSharedView";
import { SharedViewBanner } from "../components/SharedViewBanner";
import { PageInfoButton } from "../components/PageInfoButton";
import { Toast } from "../components/Toast";
import { SkeletonLoader } from "../components/SkeletonLoader";
import { useAppModal } from "../hooks/useAppModal";
import { AppModalRenderer } from "../components/AppModalRenderer";
import "./DuesPage.css";

interface DuesPageProps {
  token: string;
}

export function DuesPage({ token }: DuesPageProps) {
  const navigate = useNavigate();
  const { modal, showAlert, closeModal, confirmAndClose } = useAppModal();
  const api = useEncryptedApiCalls();
  const [dues, setDues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalDues, setTotalDues] = useState(0);
  const [toast, setToast] = useState<{ show: boolean; message: string }>({ show: false, message: "" });
  const hasFetchedRef = useRef(false);
  const lastViewRef = useRef<string>("");

  // Shared view support
  const { selectedView, isSharedView, getViewParam, isOwnItem, getOwnerName } = useSharedView(token);

  useEffect(() => {
    if (hasFetchedRef.current && lastViewRef.current === selectedView) return;
    hasFetchedRef.current = true;
    lastViewRef.current = selectedView;
    loadDues();
  }, [selectedView]);

  const handleTogglePaid = async (due: any) => {
    try {
      if (due.itemType === "credit_card") {
        showAlert("Credit cards must be paid through the Credit Cards page");
        return;
      }

      // Guard: only own items can be toggled
      const dueUserId = due.userId || due.user_id;
      if (dueUserId && !isOwnItem(dueUserId)) {
        showAlert("You can only mark your own dues as paid.");
        return;
      }

      const wasPaid = due.paid;
      const dueName = due.name;
      const dueAmount = due.amount;

      // Optimistic UI update - remove card immediately
      setDues(prevDues => prevDues.filter(d => d.id !== due.id));
      setTotalDues(prevTotal => prevTotal - (wasPaid ? 0 : dueAmount));

      if (wasPaid) {
        // Correct order: (token, itemId, itemType)
        await api.markAsUnpaid(token, due.id, due.itemType);
        setToast({ show: true, message: `${dueName} marked as unpaid` });
      } else {
        // Correct order: (token, itemId, itemType, amount)
        await api.markAsPaid(token, due.id, due.itemType, due.amount);
        setToast({ show: true, message: `Hurray!! ${dueName} Due paid` });
      }
      
      // Refresh in background to sync with server
      loadDues().catch(console.error);
    } catch (e: any) {
      // Revert optimistic update on error
      await loadDues();
      showAlert("Failed to update payment status: " + e.message);
    }
  };

  const handleSkipSIP = async (due: any) => {
    showAlert(
      `Skip saving for "${due.name}" this month? This removes the obligation from your health score and no funds will accumulate. You can undo this anytime.`,
      "confirm",
      async () => {
        try {
          // Optimistic: mark as skipped
          setDues(prev => prev.map(d => d.id === due.id ? { ...d, isSkipped: true, paid: true } : d));
          setTotalDues(prev => prev - due.amount);
          await api.skipSIP(token, due.id);
          setToast({ show: true, message: `${due.name} skipped for this month` });
          loadDues().catch(console.error);
        } catch (e: any) {
          await loadDues();
          showAlert("Failed to skip: " + e.message);
        }
      }
    );
  };

  const handleUndoSkip = async (due: any) => {
    try {
      // Optimistic: restore to unpaid
      setDues(prev => prev.map(d => d.id === due.id ? { ...d, isSkipped: false, paid: false } : d));
      setTotalDues(prev => prev + due.amount);
      await api.undoSkipSIP(token, due.id);
      setToast({ show: true, message: `${due.name} skip undone — obligation restored` });
      loadDues().catch(console.error);
    } catch (e: any) {
      await loadDues();
      showAlert("Failed to undo skip: " + e.message);
    }
  };

  // Helper function to calculate next due date for periodic expenses
  const getNextDueDate = (startDate: string | undefined, frequency: string, today: Date = new Date()): Date => {
    const start = startDate ? new Date(startDate) : today;
    if (start > today) return start;
    
    let nextDue = new Date(start);
    const monthsSinceStart = (today.getFullYear() - start.getFullYear()) * 12 + (today.getMonth() - start.getMonth());
    
    if (frequency === 'monthly') {
      nextDue = new Date(today.getFullYear(), today.getMonth(), start.getDate());
      if (nextDue <= today) {
        nextDue = new Date(today.getFullYear(), today.getMonth() + 1, start.getDate());
      }
    } else if (frequency === 'quarterly') {
      const quartersSinceStart = Math.floor(monthsSinceStart / 3);
      nextDue = new Date(start);
      nextDue.setMonth(start.getMonth() + (quartersSinceStart + 1) * 3);
      while (nextDue <= today) {
        nextDue.setMonth(nextDue.getMonth() + 3);
      }
    } else if (frequency === 'yearly') {
      const yearsSinceStart = Math.floor(monthsSinceStart / 12);
      nextDue = new Date(start);
      nextDue.setFullYear(start.getFullYear() + yearsSinceStart + 1);
      while (nextDue <= today) {
        nextDue.setFullYear(nextDue.getFullYear() + 1);
      }
    }
    
    return nextDue;
  };
  
  // Helper function to check if periodic expense is due in current billing period
  const isPeriodicExpenseDue = (startDate: string | undefined, frequency: string, monthStartDay: number, today: Date = new Date()): boolean => {
    if (frequency === 'monthly') return true;
    if (!startDate) return true;
    
    const nextDue = getNextDueDate(startDate, frequency, today);
    
    let billingStart: Date;
    let billingEnd: Date;
    
    if (today.getDate() >= monthStartDay) {
      billingStart = new Date(today.getFullYear(), today.getMonth(), monthStartDay);
      billingEnd = new Date(today.getFullYear(), today.getMonth() + 1, monthStartDay);
    } else {
      billingStart = new Date(today.getFullYear(), today.getMonth() - 1, monthStartDay);
      billingEnd = new Date(today.getFullYear(), today.getMonth(), monthStartDay);
    }
    
    return nextDue >= billingStart && nextDue < billingEnd;
  };

  const loadDues = async () => {
    try {
      // FIX: Use current date, and pass view param for shared view
      const [cardsRes, loansRes, dashboardRes, prefsRes] = await Promise.all([
        api.fetchCreditCards(token),
        api.fetchLoans(token),
        api.fetchDashboard(token, new Date().toISOString(), getViewParam()),
        api.getUserPreferences(token)
      ]);

      const monthStartDay = prefsRes.data?.monthStartDay || prefsRes.data?.month_start_day || 1;
      const duesList: any[] = [];
      let total = 0;
      const today = new Date();

      // Credit card dues (current billing period)
      cardsRes.data.forEach((card: any) => {
        const remaining = card.billAmount - card.paidAmount;
        if (remaining > 0) {
          const dueDate = new Date(card.dueDate);
          
          let billingStart: Date;
          let billingEnd: Date;
          if (today.getDate() >= monthStartDay) {
            billingStart = new Date(today.getFullYear(), today.getMonth(), monthStartDay);
            billingEnd = new Date(today.getFullYear(), today.getMonth() + 1, monthStartDay);
          } else {
            billingStart = new Date(today.getFullYear(), today.getMonth() - 1, monthStartDay);
            billingEnd = new Date(today.getFullYear(), today.getMonth(), monthStartDay);
          }
          
          const isCurrentBillingPeriod = dueDate >= billingStart && dueDate < billingEnd;
          if (isCurrentBillingPeriod) {
            duesList.push({
              id: card.id,
              name: card.name,
              type: "Credit Card",
              itemType: "credit_card",
              amount: remaining,
              dueDate: card.dueDate,
              paid: false,
              partialPaid: card.paidAmount,
              total: card.billAmount,
              userId: card.userId || card.user_id
            });
            total += remaining;
          }
        }
      });

      // Fixed expenses due this month (including skipped SIPs for display)
      dashboardRes.data.fixedExpenses?.forEach((exp: any) => {
        const startDate = exp.startDate || exp.start_date;
        const isSkipped = exp.isSkipped === true;
        
        // Show if unpaid OR skipped (skipped items should appear with badge)
        if (!exp.paid || isSkipped) {
          const isSip = exp.is_sip_flag || exp.isSipFlag;
          if (exp.frequency !== 'monthly' && !isSip) {
            const isDue = isPeriodicExpenseDue(startDate, exp.frequency, monthStartDay, today);
            if (!isDue) return;
          }
          
          const monthly = exp.frequency === "monthly" ? exp.amount : 
                         exp.frequency === "quarterly" ? exp.amount / 3 : 
                         exp.amount / 12;
          
          const nextDue = exp.frequency !== 'monthly' 
            ? getNextDueDate(exp.startDate || exp.start_date || today.toISOString().split('T')[0], exp.frequency, today)
            : today;
          
          const accumulatedFunds = exp.accumulatedFunds || exp.accumulated_funds || 0;
          
          duesList.push({
            id: exp.id,
            name: exp.name,
            type: isSip ? "SIP Expense" : "Fixed Expense",
            itemType: "fixed_expense",
            amount: Math.round(monthly),
            dueDate: nextDue.toISOString().split("T")[0],
            paid: isSkipped ? true : (exp.paid || false),
            isSkipped: isSkipped,
            total: Math.round(monthly),
            accumulatedFunds: accumulatedFunds,
            isSip: isSip,
            frequency: exp.frequency,
            userId: exp.userId || exp.user_id
          });
          // Skipped items don't count toward total (obligation removed)
          if (!isSkipped) {
            total += Math.round(monthly);
          }
        }
      });

      // Investments due this month
      dashboardRes.data.investments?.forEach((inv: any) => {
        const monthlyAmount = inv.monthlyAmount || inv.monthly_amount || 0;
        const status = inv.status || 'active';
        if (!inv.paid && status === 'active') {
          const accumulatedFunds = inv.accumulatedFunds || inv.accumulated_funds || 0;
          duesList.push({
            id: inv.id,
            name: inv.name,
            type: "Investment",
            itemType: "investment",
            amount: monthlyAmount,
            dueDate: today.toISOString().split("T")[0],
            paid: inv.paid || false,
            total: monthlyAmount,
            accumulatedFunds: accumulatedFunds,
            userId: inv.userId || inv.user_id
          });
          total += monthlyAmount;
        }
      });

      setDues(duesList);
      setTotalDues(total);
    } catch (e) {
      console.error("Failed to load dues:", e);
    } finally {
      setLoading(false);
    }
  };

  // Separate own vs shared dues
  const ownDues = isSharedView
    ? dues.filter(d => { const uid = d.userId || d.user_id; return !uid || isOwnItem(uid); })
    : dues;
  const sharedDues = isSharedView ? dues.filter(d => { const uid = d.userId || d.user_id; return uid && !isOwnItem(uid); }) : [];

  // Group shared dues by user for aggregate banner
  const sharedByUser = sharedDues.reduce<Record<string, { username: string; total: number; count: number }>>((acc, d) => {
    const uid = d.userId || d.user_id;
    if (!acc[uid]) acc[uid] = { username: getOwnerName(uid), total: 0, count: 0 };
    acc[uid].total += d.amount || 0;
    acc[uid].count++;
    return acc;
  }, {});

  // Group own dues by type for sectioned display
  const grouped = {
    fixed: ownDues.filter(d => d.type === "Fixed Expense" && !d.isSkipped),
    sip: ownDues.filter(d => d.type === "SIP Expense" && !d.isSkipped),
    skippedSip: ownDues.filter(d => d.isSkipped),
    investment: ownDues.filter(d => d.type === "Investment"),
    creditCard: ownDues.filter(d => d.type === "Credit Card"),
  };

  const pendingCount = ownDues.filter(d => !d.paid && !d.isSkipped).length;
  const skippedCount = ownDues.filter(d => d.isSkipped).length;

  const getBadgeClass = (type: string) => {
    if (type === "Credit Card") return "badge-credit";
    if (type === "Investment") return "badge-investment";
    if (type === "SIP Expense") return "badge-sip";
    return "badge-fixed";
  };

  const renderDueCard = (due: any, index: number) => {
    const isSkipped = due.isSkipped === true;
    const isPeriodicSip = due.isSip && due.frequency !== 'monthly';
    
    return (
      <motion.div
        key={due.id}
        className={`due-card ${due.paid && !isSkipped ? "due-paid" : ""} ${isSkipped ? "due-skipped" : ""}`}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.04 }}
      >
        <div className="due-header">
          <div className="due-header-left">
            {due.itemType !== "credit_card" && !isSkipped && (
              <button
                className={`due-toggle ${due.paid ? "checked" : ""}`}
                onClick={() => handleTogglePaid(due)}
                title={due.paid ? "Mark as unpaid" : "Mark as paid"}
              >
                {due.paid && <FaCheck size={11} />}
              </button>
            )}
            {isSkipped && (
              <span className="due-skip-icon" title="Skipped this month">
                <FaForward size={14} />
              </span>
            )}
            <h3 className={isSkipped ? "skipped-name" : ""}>{due.name}</h3>
          </div>
          <div className="due-header-right">
            {isSkipped && <span className="due-skip-badge">Skipped</span>}
            <span className={`due-type-badge ${getBadgeClass(due.type)}`}>{due.type}</span>
          </div>
        </div>
        <div className="due-details">
          <div className="due-detail-item">
            <span className="due-detail-label">Amount</span>
            <span className={`due-detail-value val-amount ${isSkipped ? "skipped-amount" : ""}`}>
              ₹{due.amount.toLocaleString("en-IN")}
            </span>
          </div>
          <div className="due-detail-item">
            <span className="due-detail-label">Due Date</span>
            <span className="due-detail-value">{new Date(due.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
          </div>
          {(due.accumulatedFunds || 0) > 0 && (
            <div className="due-detail-item">
              <span className="due-detail-label">{due.isSip ? "Accumulated" : "Saved"}</span>
              <span className="due-detail-value val-saved">₹{Math.round(due.accumulatedFunds).toLocaleString("en-IN")}</span>
            </div>
          )}
          {due.partialPaid > 0 && (
            <div className="due-detail-item">
              <span className="due-detail-label">Paid</span>
              <span className="due-detail-value val-paid">₹{due.partialPaid.toLocaleString("en-IN")}</span>
            </div>
          )}
        </div>
        {/* Skip / Undo Skip actions for periodic SIPs */}
        {isPeriodicSip && !isSharedView && (
          <div className="due-actions">
            {isSkipped ? (
              <button className="due-action-btn undo-skip-btn" onClick={() => handleUndoSkip(due)}>
                <FaUndo size={12} /> Undo Skip
              </button>
            ) : !due.paid ? (
              <button className="due-action-btn skip-btn" onClick={() => handleSkipSIP(due)}>
                <FaForward size={12} /> Skip This Month
              </button>
            ) : null}
          </div>
        )}
        {isSkipped && (
          <div className="due-skip-note">
            Obligation removed from health score this month. Funds frozen — no accumulation.
          </div>
        )}
      </motion.div>
    );
  };

  const renderSection = (title: string, icon: React.ReactNode, iconClass: string, items: any[]) => {
    if (items.length === 0) return null;
    const sectionTotal = items.reduce((sum, d) => sum + d.amount, 0);
    return (
      <div className="dues-section">
        <div className="dues-section-header">
          <div className={`dues-section-icon ${iconClass}`}>{icon}</div>
          <span className="dues-section-title">{title}</span>
          <span className="dues-section-count">{items.length}</span>
          <span className="dues-section-total">₹{sectionTotal.toLocaleString("en-IN")}</span>
        </div>
        <div className="dues-grid">
          {items.map((due, i) => renderDueCard(due, i))}
        </div>
      </div>
    );
  };

  return (
    <div className="dues-page">
      <div className="page-header">
        <button className="back-button" onClick={() => navigate("/dashboard")}>← Back</button>
        <h1><FaFileInvoiceDollar style={{ marginRight: 10, verticalAlign: 'middle' }} />Current Month Dues</h1>
        <PageInfoButton
          title="Current Month Dues"
          description="Your monthly checklist — everything you owe this month in one place. Fixed expenses, investment contributions, and credit card bills all show up here. Tick them off as you pay to track what's been settled and what's still outstanding."
          impact="Your health score counts all active commitments whether paid or not — what matters is that the obligation exists. This page helps you stay organised by showing exactly what you've cleared and what's left to pay."
          howItWorks={[
            "Fixed expenses, active investments, and credit card bills automatically appear here each month",
            "Tap the checkbox to mark an item as paid — it clears from your pending dues",
            "All commitments count toward your health score regardless of payment status",
            "Periodic SIP expenses (quarterly/yearly) have a 'Skip This Month' option — skipping removes the obligation from health, giving you relief. No funds accumulate and no penalty is applied",
            "Skipped SIPs appear in a 'Skipped This Month' section — you can undo anytime to restore the obligation",
            "Credit card payments are managed separately on the Credit Cards page"
          ]}
        />
      </div>

      <SharedViewBanner />

      <Toast
        message={toast.message}
        show={toast.show}
        onClose={() => setToast({ show: false, message: "" })}
        type="success"
      />
      
      {/* Shared user aggregate banners */}
      {isSharedView && Object.keys(sharedByUser).length > 0 && (
        <div className="shared-aggregate-section">
          {Object.entries(sharedByUser).map(([uid, info]) => (
            <div key={uid} className="shared-aggregate-card">
              <div className="shared-aggregate-header">
                <FaUserCircle size={16} />
                <span className="shared-aggregate-name">{info.username}'s Dues</span>
              </div>
              <div className="shared-aggregate-stats">
                <div className="shared-aggregate-stat">
                  <span className="stat-value">₹{info.total.toLocaleString("en-IN")}</span>
                  <span className="stat-label">Total Outstanding</span>
                </div>
                <div className="shared-aggregate-stat">
                  <span className="stat-value">{info.count}</span>
                  <span className="stat-label">Items</span>
                </div>
              </div>
              <p className="shared-aggregate-note">Individual items are encrypted — only totals are visible</p>
            </div>
          ))}
        </div>
      )}

      {loading ? <SkeletonLoader type="card" count={4} /> : (
        <>
          {/* Summary Hero */}
          {ownDues.length > 0 && (
            <div className="dues-summary-hero">
              <div className="dues-hero-main">
                <div className="dues-hero-label">Total Outstanding</div>
                <div className="dues-hero-amount">₹{ownDues.reduce((s, d) => s + d.amount, 0).toLocaleString("en-IN")}</div>
              </div>
              <div className="dues-hero-stats">
                <div className="dues-hero-stat">
                  <span className="dues-stat-label">Items</span>
                  <span className="dues-stat-value stat-items">{ownDues.length}</span>
                </div>
                <div className="dues-hero-stat">
                  <span className="dues-stat-label">Pending</span>
                  <span className="dues-stat-value stat-pending">{pendingCount}</span>
                </div>
                {skippedCount > 0 && (
                  <div className="dues-hero-stat">
                    <span className="dues-stat-label">Skipped</span>
                    <span className="dues-stat-value stat-skipped">{skippedCount}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {ownDues.length === 0 && sharedDues.length === 0 ? (
            <div className="dues-empty-state">
              <FaCheckCircle size={56} color="#10b981" />
              <h3>All Clear!</h3>
              <p>No dues for the current month. You&apos;re on top of your finances — keep it up!</p>
            </div>
          ) : ownDues.length === 0 && isSharedView ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 14 }}>
              You have no pending dues. Only shared member totals are shown above.
            </div>
          ) : (
            <>
              {renderSection("Fixed Expenses", <FaCalendarCheck size={16} />, "fixed", grouped.fixed)}
              {renderSection("SIP Expenses", <FaChartLine size={16} />, "sip", grouped.sip)}
              {renderSection("Investments", <FaChartLine size={16} />, "investment", grouped.investment)}
              {renderSection("Credit Cards", <FaCreditCard size={16} />, "credit", grouped.creditCard)}
              {grouped.skippedSip.length > 0 && renderSection("Skipped This Month", <FaForward size={16} />, "skipped", grouped.skippedSip)}
            </>
          )}
        </>
      )}
      <AppModalRenderer modal={modal} closeModal={closeModal} confirmAndClose={confirmAndClose} />
    </div>
  );
}
