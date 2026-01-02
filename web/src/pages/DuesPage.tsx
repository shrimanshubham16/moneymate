import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { fetchCreditCards, fetchLoans, fetchDashboard, markAsPaid, markAsUnpaid, getUserPreferences } from "../api";
import { PageInfoButton } from "../components/PageInfoButton";
import { Toast } from "../components/Toast";
import { SkeletonLoader } from "../components/SkeletonLoader";
import "./DuesPage.css";

interface DuesPageProps {
  token: string;
}

export function DuesPage({ token }: DuesPageProps) {
  const navigate = useNavigate();
  const [dues, setDues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalDues, setTotalDues] = useState(0);
  const [toast, setToast] = useState<{ show: boolean; message: string }>({ show: false, message: "" });

  useEffect(() => {
    loadDues();
  }, []);

  const handleTogglePaid = async (due: any) => {
    try {
      if (due.itemType === "credit_card") {
        alert("Credit cards must be paid through the Credit Cards page");
        return;
      }

      const wasPaid = due.paid;
      const dueName = due.name;
      const dueAmount = due.amount;

      // P1 FIX: Optimistic UI update - remove card immediately
      setDues(prevDues => prevDues.filter(d => d.id !== due.id));
      setTotalDues(prevTotal => prevTotal - (wasPaid ? 0 : dueAmount));

      if (wasPaid) {
        await markAsUnpaid(token, due.id, due.itemType);
        setToast({ show: true, message: `${dueName} marked as unpaid` });
      } else {
        await markAsPaid(token, due.id, due.itemType, due.amount);
        setToast({ show: true, message: `Hurray!! ${dueName} Due paid` });
      }
      
      // Refresh in background to sync with server
      loadDues().catch(console.error);
    } catch (e: any) {
      // Revert optimistic update on error
      await loadDues();
      alert("Failed to update payment status: " + e.message);
    }
  };

  // Helper function to calculate next due date for periodic expenses
  const getNextDueDate = (startDate: string, frequency: string, today: Date = new Date()): Date => {
    const start = new Date(startDate);
    if (start > today) return start;
    
    let nextDue = new Date(start);
    const monthsSinceStart = (today.getFullYear() - start.getFullYear()) * 12 + (today.getMonth() - start.getMonth());
    
    if (frequency === 'monthly') {
      // Next due is same day of next month
      nextDue = new Date(today.getFullYear(), today.getMonth(), start.getDate());
      if (nextDue <= today) {
        nextDue = new Date(today.getFullYear(), today.getMonth() + 1, start.getDate());
      }
    } else if (frequency === 'quarterly') {
      // Next due is every 3 months from start
      const quartersSinceStart = Math.floor(monthsSinceStart / 3);
      nextDue = new Date(start);
      nextDue.setMonth(start.getMonth() + (quartersSinceStart + 1) * 3);
      while (nextDue <= today) {
        nextDue.setMonth(nextDue.getMonth() + 3);
      }
    } else if (frequency === 'yearly') {
      // Next due is every 12 months from start
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
  const isPeriodicExpenseDue = (startDate: string, frequency: string, monthStartDay: number, today: Date = new Date()): boolean => {
    if (frequency === 'monthly') {
      // Monthly expenses are always due
      return true;
    }
    
    const nextDue = getNextDueDate(startDate, frequency, today);
    
    // Calculate current billing period
    let billingStart: Date;
    let billingEnd: Date;
    
    if (today.getDate() >= monthStartDay) {
      billingStart = new Date(today.getFullYear(), today.getMonth(), monthStartDay);
      billingEnd = new Date(today.getFullYear(), today.getMonth() + 1, monthStartDay);
    } else {
      billingStart = new Date(today.getFullYear(), today.getMonth() - 1, monthStartDay);
      billingEnd = new Date(today.getFullYear(), today.getMonth(), monthStartDay);
    }
    
    // Check if next due date falls within current billing period
    return nextDue >= billingStart && nextDue < billingEnd;
  };

  const loadDues = async () => {
    try {
      const [cardsRes, loansRes, dashboardRes, prefsRes] = await Promise.all([
        fetchCreditCards(token),
        fetchLoans(token),
        fetchDashboard(token, "2025-01-15T00:00:00Z"),
        getUserPreferences(token)
      ]);

      const monthStartDay = prefsRes.data?.monthStartDay || prefsRes.data?.month_start_day || 1;
      const duesList: any[] = [];
      let total = 0;

      // Credit card dues (current month)
      cardsRes.data.forEach((card: any) => {
        const remaining = card.billAmount - card.paidAmount;
        if (remaining > 0) {
          const dueDate = new Date(card.dueDate);
          const isCurrentMonth = dueDate.getMonth() === new Date().getMonth() && 
                                dueDate.getFullYear() === new Date().getFullYear();
          
          if (isCurrentMonth) {
            duesList.push({
              id: card.id,
              name: card.name,
              type: "Credit Card",
              itemType: "credit_card",
              amount: remaining,
              dueDate: card.dueDate,
              paid: false, // Credit cards handled separately
              partialPaid: card.paidAmount,
              total: card.billAmount
            });
            total += remaining;
          }
        }
      });

      // Loan EMIs - EXCLUDED from Dues as they are not markable as paid
      // Loans are auto-tracked from fixed expenses with category "Loan"
      // Users should mark the corresponding fixed expense as paid instead
      // loansRes.data.forEach((loan: any) => {
      //   if (!loan.paid) { // Only show unpaid
      //     duesList.push({
      //       id: loan.id,
      //       name: loan.name,
      //       type: "Loan EMI",
      //       itemType: "loan",
      //       amount: loan.emi,
      //       dueDate: new Date().toISOString().split("T")[0],
      //       paid: loan.paid || false,
      //       total: loan.emi
      //     });
      //     total += loan.emi;
      //   }
      // });

      // Fixed expenses due this month
      const today = new Date();
      dashboardRes.data.fixedExpenses?.forEach((exp: any) => {
        if (!exp.paid) { // Only show unpaid items
          // P0 FIX: For periodic expenses (quarterly/yearly), only show if actually due this billing period
          if (exp.frequency !== 'monthly' && !isPeriodicExpenseDue(exp.startDate || exp.start_date || today.toISOString().split('T')[0], exp.frequency, monthStartDay, today)) {
            return; // Skip if not due this period
          }
          
          const monthly = exp.frequency === "monthly" ? exp.amount : 
                         exp.frequency === "quarterly" ? exp.amount / 3 : 
                         exp.amount / 12;
          
          // Calculate next due date for periodic expenses
          const nextDue = exp.frequency !== 'monthly' 
            ? getNextDueDate(exp.startDate || exp.start_date || today.toISOString().split('T')[0], exp.frequency, today)
            : today;
          
          const accumulatedFunds = exp.accumulatedFunds || exp.accumulated_funds || 0;
          const isSip = exp.is_sip_flag || exp.isSipFlag;
          
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
            frequency: exp.frequency
          });
          total += Math.round(monthly);
        }
      });

      // Investments due this month
      dashboardRes.data.investments?.forEach((inv: any) => {
        if (!inv.paid) { // Only show unpaid items
          const accumulatedFunds = inv.accumulatedFunds || inv.accumulated_funds || 0;
          duesList.push({
            id: inv.id,
            name: inv.name,
            type: "Investment",
            itemType: "investment",
            amount: inv.monthlyAmount || inv.monthly_amount,
            dueDate: today.toISOString().split("T")[0],
            paid: inv.paid || false,
            total: inv.monthlyAmount || inv.monthly_amount,
            accumulatedFunds: accumulatedFunds
          });
          total += inv.monthlyAmount || inv.monthly_amount;
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

  return (
    <div className="dues-page">
      <div className="page-header">
        <button className="back-button" onClick={() => navigate("/dashboard")}>← Back</button>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <h1>Current Month Dues</h1>
          <PageInfoButton
            title="Current Month Dues"
            description="View all your financial obligations due this month including fixed expenses, investments, and loans. Mark them as paid to update your available funds and health score."
            impact="Unpaid dues reduce your available funds and negatively impact your health score. Marking dues as paid updates your financial status in real-time and improves your health score."
            howItWorks={[
              "All fixed expenses, investments, and loans due this month are listed here",
              "Toggle payment status to mark items as paid or unpaid",
              "Paid items don't reduce your available funds",
              "Unpaid items are automatically included in health score calculations",
              "Credit card payments must be made through the Credit Cards page"
            ]}
          />
        </div>
      </div>

      <Toast
        message={toast.message}
        show={toast.show}
        onClose={() => setToast({ show: false, message: "" })}
        type="success"
      />
      
      {loading ? <SkeletonLoader type="list" count={5} /> : (
        <>
          <div className="dues-summary">
            <h2>Total Dues</h2>
            <div className="total-amount">₹{totalDues.toLocaleString("en-IN")}</div>
          </div>

          {dues.length === 0 ? (
            <div className="empty-state">No dues for the current month. Great job!</div>
          ) : (
            <div className="dues-list">
              {dues.map((due, index) => (
                <motion.div
                  key={due.id}
                  className="due-card"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <div className="due-header">
                    {due.itemType !== "credit_card" && (
                      <input
                        type="checkbox"
                        checked={due.paid}
                        onChange={() => handleTogglePaid(due)}
                        className="paid-checkbox"
                        title="Mark as paid"
                      />
                    )}
                    <h3>{due.name}</h3>
                    <span className="due-type">{due.type}</span>
                  </div>
                  <div className="due-details">
                    <div className="detail-item">
                      <span className="label">Amount Due</span>
                      <span className="value">₹{due.amount.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Due Date</span>
                      <span className="value">{new Date(due.dueDate).toLocaleDateString()}</span>
                    </div>
                    {(due.accumulatedFunds || 0) > 0 && (
                      <div className="detail-item">
                        <span className="label">{due.isSip ? "Accumulated Funds" : "Saved Amount"}</span>
                        <span className="value" style={{ color: '#10b981' }}>₹{Math.round(due.accumulatedFunds).toLocaleString("en-IN")}</span>
                      </div>
                    )}
                    {due.partialPaid > 0 && (
                      <div className="detail-item">
                        <span className="label">Paid</span>
                        <span className="value paid">₹{due.partialPaid.toLocaleString("en-IN")}</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

