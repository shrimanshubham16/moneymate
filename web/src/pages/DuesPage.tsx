import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FaLock, FaUserCircle, FaCheckCircle, FaFileInvoiceDollar, FaCreditCard, FaChartLine, FaCalendarCheck, FaCheck } from "react-icons/fa";
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
  const { selectedView, isSharedView, getViewParam, getOwnerName, isOwnItem } = useSharedView(token);

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

      // Fixed expenses due this month
      dashboardRes.data.fixedExpenses?.forEach((exp: any) => {
        const startDate = exp.startDate || exp.start_date;
        if (!exp.paid) {
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
            paid: exp.paid || false,
            total: Math.round(monthly),
            accumulatedFunds: accumulatedFunds,
            isSip: isSip,
            frequency: exp.frequency,
            userId: exp.userId || exp.user_id
          });
          total += Math.round(monthly);
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

  // Group dues by type for sectioned display
  const grouped = {
    fixed: dues.filter(d => d.type === "Fixed Expense"),
    sip: dues.filter(d => d.type === "SIP Expense"),
    investment: dues.filter(d => d.type === "Investment"),
    creditCard: dues.filter(d => d.type === "Credit Card"),
  };

  const pendingCount = dues.filter(d => !d.paid).length;

  const getBadgeClass = (type: string) => {
    if (type === "Credit Card") return "badge-credit";
    if (type === "Investment") return "badge-investment";
    if (type === "SIP Expense") return "badge-sip";
    return "badge-fixed";
  };

  const renderDueCard = (due: any, index: number) => {
    const dueUserId = due.userId || due.user_id;
    const isOwn = !dueUserId || isOwnItem(dueUserId);
    return (
      <motion.div
        key={due.id}
        className={`due-card ${!isOwn ? "shared-item" : ""} ${due.paid ? "due-paid" : ""}`}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.04 }}
      >
        <div className="due-header">
          <div className="due-header-left">
            {due.itemType !== "credit_card" && isOwn && (
              <button
                className={`due-toggle ${due.paid ? "checked" : ""}`}
                onClick={() => handleTogglePaid(due)}
                title={due.paid ? "Mark as unpaid" : "Mark as paid"}
              >
                {due.paid && <FaCheck size={11} />}
              </button>
            )}
            <h3>{due.name}</h3>
          </div>
          <div className="due-header-right">
            {isSharedView && (
              <span className="due-owner-badge">
                {isOwn ? <FaUserCircle size={10} /> : <FaLock size={10} />}
                {getOwnerName(dueUserId)}
              </span>
            )}
            <span className={`due-type-badge ${getBadgeClass(due.type)}`}>{due.type}</span>
            {!isOwn && (
              <span className="due-view-only">
                <FaLock size={9} /> View Only
              </span>
            )}
          </div>
        </div>
        <div className="due-details">
          <div className="due-detail-item">
            <span className="due-detail-label">Amount</span>
            <span className="due-detail-value val-amount">₹{due.amount.toLocaleString("en-IN")}</span>
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
          description="Your monthly checklist — everything you owe this month in one place. Fixed expenses, investment contributions, and credit card bills all show up here. Tick them off as you pay and watch your health score improve in real time."
          impact="Every unpaid item here drags your health score down. As you mark dues paid, your available funds adjust instantly. It's the fastest way to see your real financial standing for the month."
          howItWorks={[
            "Fixed expenses, active investments, and credit card bills automatically appear here each month",
            "Tap the checkbox to mark an item as paid — your health score updates immediately",
            "Unpaid items reduce your available funds; paid items free them up",
            "Halfway through the month with unpaid dues? You'll get a smart notification reminder",
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
      
      {loading ? <SkeletonLoader type="card" count={4} /> : (
        <>
          {/* Summary Hero */}
          {dues.length > 0 && (
            <div className="dues-summary-hero">
              <div className="dues-hero-main">
                <div className="dues-hero-label">Total Outstanding</div>
                <div className="dues-hero-amount">₹{totalDues.toLocaleString("en-IN")}</div>
              </div>
              <div className="dues-hero-stats">
                <div className="dues-hero-stat">
                  <span className="dues-stat-label">Items</span>
                  <span className="dues-stat-value stat-items">{dues.length}</span>
                </div>
                <div className="dues-hero-stat">
                  <span className="dues-stat-label">Pending</span>
                  <span className="dues-stat-value stat-pending">{pendingCount}</span>
                </div>
              </div>
            </div>
          )}

          {dues.length === 0 ? (
            <div className="dues-empty-state">
              <FaCheckCircle size={56} color="#10b981" />
              <h3>All Clear!</h3>
              <p>No dues for the current month. You&apos;re on top of your finances — keep it up!</p>
            </div>
          ) : (
            <>
              {renderSection("Fixed Expenses", <FaCalendarCheck size={16} />, "fixed", grouped.fixed)}
              {renderSection("SIP Expenses", <FaChartLine size={16} />, "sip", grouped.sip)}
              {renderSection("Investments", <FaChartLine size={16} />, "investment", grouped.investment)}
              {renderSection("Credit Cards", <FaCreditCard size={16} />, "credit", grouped.creditCard)}
            </>
          )}
        </>
      )}
      <AppModalRenderer modal={modal} closeModal={closeModal} confirmAndClose={confirmAndClose} />
    </div>
  );
}
