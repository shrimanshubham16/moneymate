import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { fetchCreditCards, fetchLoans, fetchDashboard, markAsPaid, markAsUnpaid } from "../api";
import { PageInfoButton } from "../components/PageInfoButton";
import "./DuesPage.css";

interface DuesPageProps {
  token: string;
}

export function DuesPage({ token }: DuesPageProps) {
  const navigate = useNavigate();
  const [dues, setDues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalDues, setTotalDues] = useState(0);

  useEffect(() => {
    loadDues();
  }, []);

  const handleTogglePaid = async (due: any) => {
    try {
      if (due.itemType === "credit_card") {
        alert("Credit cards must be paid through the Credit Cards page");
        return;
      }

      if (due.paid) {
        await markAsUnpaid(token, due.id, due.itemType);
      } else {
        await markAsPaid(token, due.id, due.itemType, due.amount);
      }
      await loadDues(); // Refresh the list
    } catch (e: any) {
      alert("Failed to update payment status: " + e.message);
    }
  };

  const loadDues = async () => {
    try {
      const [cardsRes, loansRes, dashboardRes] = await Promise.all([
        fetchCreditCards(token),
        fetchLoans(token),
        fetchDashboard(token, "2025-01-15T00:00:00Z")
      ]);

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
          const monthly = exp.frequency === "monthly" ? exp.amount : 
                         exp.frequency === "quarterly" ? exp.amount / 3 : 
                         exp.amount / 12;
          duesList.push({
            id: exp.id,
            name: exp.name,
            type: "Fixed Expense",
            itemType: "fixed_expense",
            amount: Math.round(monthly),
            dueDate: today.toISOString().split("T")[0],
            paid: exp.paid || false,
            total: Math.round(monthly)
          });
          total += Math.round(monthly);
        }
      });

      // Investments due this month
      dashboardRes.data.investments?.forEach((inv: any) => {
        if (!inv.paid) { // Only show unpaid items
          duesList.push({
            id: inv.id,
            name: inv.name,
            type: "Investment",
            itemType: "investment",
            amount: inv.monthlyAmount,
            dueDate: today.toISOString().split("T")[0],
            paid: inv.paid || false,
            total: inv.monthlyAmount
          });
          total += inv.monthlyAmount;
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

      {loading ? <div>Loading...</div> : (
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

