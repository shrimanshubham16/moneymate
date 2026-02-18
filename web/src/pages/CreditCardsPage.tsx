import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FaCreditCard, FaUserCircle, FaLock, FaCalendarAlt, FaWallet, FaCheckCircle, FaExclamationTriangle, FaCog } from "react-icons/fa";
import { useEncryptedApiCalls } from "../hooks/useEncryptedApiCalls";
import { useSharedView } from "../hooks/useSharedView";
import { SkeletonLoader } from "../components/SkeletonLoader";
import { useAppModal } from "../hooks/useAppModal";
import { AppModalRenderer } from "../components/AppModalRenderer";
import "./CreditCardsPage.css";

interface CreditCardsPageProps {
  token: string;
}

export function CreditCardsPage({ token }: CreditCardsPageProps) {
  const navigate = useNavigate();
  const { modal, showAlert, closeModal, confirmAndClose } = useAppModal();
  const api = useEncryptedApiCalls();
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const hasFetchedRef = useRef(false);
  const lastViewRef = useRef<string>("");
  
  // Shared view support
  const { selectedView, isSharedView, getViewParam, getOwnerName, isOwnItem, formatSharedField } = useSharedView(token);

  useEffect(() => {
    if (hasFetchedRef.current && lastViewRef.current === selectedView) return;
    hasFetchedRef.current = true;
    lastViewRef.current = selectedView;
    loadCards();
  }, [selectedView]);

  const loadCards = async () => {
    try {
      // Use dashboard endpoint with view param so shared/combined view includes all members' cards
      const dashboardRes = await api.fetchDashboard(token, new Date().toISOString(), getViewParam());
      setCards(dashboardRes.data.creditCards || []);
    } catch (e) {
      console.error("Failed to load cards:", e);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCard) return;
    try {
      await api.payCreditCard(token, selectedCard, Number(paymentAmount));
      setShowPaymentForm(false);
      setPaymentAmount("");
      loadCards();
    } catch (e: any) {
      showAlert(e.message);
    }
  };

  // Compute summary stats
  const totalBill = cards.reduce((sum, c) => sum + (parseFloat(c.billAmount) || 0), 0);
  const totalPaid = cards.reduce((sum, c) => sum + (parseFloat(c.paidAmount) || 0), 0);
  const totalRemaining = totalBill - totalPaid;
  const totalUnbilled = cards.reduce((sum, c) => sum + (parseFloat(c.currentExpenses) || 0), 0);
  const overdueCount = cards.filter(c => {
    const remaining = (parseFloat(c.billAmount) || 0) - (parseFloat(c.paidAmount) || 0);
    return new Date(c.dueDate) < new Date() && remaining > 0;
  }).length;

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const getPaymentProgress = (bill: number, paid: number) => {
    if (bill <= 0) return 100;
    return Math.min(100, Math.round((paid / bill) * 100));
  };

  return (
    <div className="credit-cards-page">
      <div className="page-header">
        <button className="back-button" onClick={() => navigate("/dashboard")}>← Back</button>
        <h1><FaCreditCard style={{ marginRight: 10, verticalAlign: 'middle' }} />Credit Cards</h1>
        <button className="manage-button" onClick={() => navigate("/settings/credit-cards")}>
          <FaCog style={{ marginRight: 6 }} />Manage
        </button>
      </div>

      {/* Summary Stats */}
      {!loading && cards.length > 0 && (
        <div className="cc-summary-strip">
          <div className="cc-summary-item">
            <span className="cc-summary-label">Total Bill</span>
            <span className="cc-summary-value">₹{totalBill.toLocaleString("en-IN")}</span>
          </div>
          <div className="cc-summary-divider" />
          <div className="cc-summary-item">
            <span className="cc-summary-label">Paid</span>
            <span className="cc-summary-value cc-paid">₹{totalPaid.toLocaleString("en-IN")}</span>
          </div>
          <div className="cc-summary-divider" />
          <div className="cc-summary-item">
            <span className="cc-summary-label">Remaining</span>
            <span className={`cc-summary-value ${totalRemaining > 0 ? 'cc-remaining' : 'cc-paid'}`}>₹{totalRemaining.toLocaleString("en-IN")}</span>
          </div>
          <div className="cc-summary-divider" />
          <div className="cc-summary-item">
            <span className="cc-summary-label">Unbilled Spends</span>
            <span className="cc-summary-value cc-unbilled">₹{totalUnbilled.toLocaleString("en-IN")}</span>
          </div>
          {overdueCount > 0 && (
            <>
              <div className="cc-summary-divider" />
              <div className="cc-summary-item cc-overdue-item">
                <span className="cc-summary-label">Overdue</span>
                <span className="cc-summary-value cc-overdue-val">{overdueCount} card{overdueCount > 1 ? 's' : ''}</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Payment Modal */}
      <AnimatePresence>
        {showPaymentForm && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowPaymentForm(false)}
          >
            <motion.div
              className="modal-shell modal-sm"
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3><FaWallet style={{ marginRight: 8 }} />Pay Credit Card Bill</h3>
                <button className="modal-close" onClick={() => setShowPaymentForm(false)}>✕</button>
              </div>
              <div className="modal-body">
                <form onSubmit={handlePayment}>
                  <div className="cc-form-group">
                    <label>Select Card</label>
                    <select value={selectedCard || ""} onChange={(e) => setSelectedCard(e.target.value)} required>
                      <option value="">Choose a card...</option>
                      {cards.map(c => {
                        const rem = (parseFloat(c.billAmount) || 0) - (parseFloat(c.paidAmount) || 0);
                        return (
                          <option key={c.id} value={c.id}>
                            {c.name} — ₹{rem.toLocaleString("en-IN")} remaining
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div className="cc-form-group">
                    <label>Payment Amount (₹)</label>
                    <input
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="0"
                      required
                      min="1"
                    />
                  </div>
                  <div className="cc-form-actions">
                    <button type="button" className="ghost-btn" onClick={() => setShowPaymentForm(false)}>Cancel</button>
                    <button type="submit" className="primary-btn">Pay Now</button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cards */}
      {loading ? <SkeletonLoader type="card" count={3} /> : cards.length === 0 ? (
        <div className="cc-empty-state">
          <FaCreditCard size={56} color="var(--text-tertiary)" />
          <h3>No Credit Cards Added</h3>
          <p>Add your credit cards to track bills, payments, and spending in one place.</p>
          <button className="primary-btn" onClick={() => navigate("/settings/credit-cards")}>
            + Add Your First Card
          </button>
        </div>
      ) : (
        <div className="cards-grid">
          {cards.map((card, index) => {
            const bill = parseFloat(card.billAmount) || 0;
            const paid = parseFloat(card.paidAmount) || 0;
            const remaining = Math.max(0, bill - paid);
            const unbilled = parseFloat(card.currentExpenses) || 0;
            const dueDate = new Date(card.dueDate);
            const daysUntilDue = getDaysUntilDue(card.dueDate);
            const isOverdue = daysUntilDue < 0 && remaining > 0;
            const isDueSoon = daysUntilDue >= 0 && daysUntilDue <= 5 && remaining > 0;
            const progress = getPaymentProgress(bill, paid);
            const isPaid = remaining <= 0;
            const cardUserId = card.userId || card.user_id;
            const isOwn = !cardUserId || isOwnItem(cardUserId);

            return (
              <motion.div
                key={card.id}
                className={`cc-card ${isOverdue ? "cc-card-overdue" : ""} ${isPaid ? "cc-card-paid" : ""} ${!isOwn ? "cc-card-shared" : ""}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.06 }}
              >
                {/* Card title row */}
                <div className="cc-card-top">
                  <div className="cc-card-name">
                    <FaCreditCard style={{ marginRight: 8, opacity: 0.6 }} />
                    <h3>{formatSharedField(card.name, isOwn)}</h3>
                  </div>
                  <div className="cc-card-badges">
                    {isSharedView && (
                      <span className="cc-owner-badge">
                        {isOwn ? <FaUserCircle /> : <FaLock />}
                        {getOwnerName(cardUserId)}
                      </span>
                    )}
                    {isOverdue && <span className="cc-badge cc-badge-overdue"><FaExclamationTriangle style={{ marginRight: 4 }} />OVERDUE</span>}
                    {isDueSoon && !isOverdue && <span className="cc-badge cc-badge-due-soon">Due in {daysUntilDue}d</span>}
                    {isPaid && <span className="cc-badge cc-badge-paid"><FaCheckCircle style={{ marginRight: 4 }} />PAID</span>}
                  </div>
                </div>

                {/* Payment progress */}
                <div className="cc-progress-section">
                  <div className="cc-progress-bar">
                    <div
                      className={`cc-progress-fill ${isPaid ? 'cc-fill-paid' : isOverdue ? 'cc-fill-overdue' : 'cc-fill-normal'}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="cc-progress-label">
                    <span>{progress}% paid</span>
                    <span>₹{paid.toLocaleString("en-IN")} / ₹{bill.toLocaleString("en-IN")}</span>
                  </div>
                </div>

                {/* Details grid */}
                <div className="cc-details-grid">
                  <div className="cc-detail">
                    <span className="cc-detail-label">Remaining</span>
                    <span className={`cc-detail-value ${remaining > 0 ? 'cc-val-negative' : 'cc-val-positive'}`}>
                      ₹{remaining.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="cc-detail">
                    <span className="cc-detail-label">Unbilled Spends</span>
                    <span className="cc-detail-value cc-val-unbilled">₹{unbilled.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="cc-detail">
                    <span className="cc-detail-label"><FaCalendarAlt style={{ marginRight: 4, opacity: 0.5 }} />Due Date</span>
                    <span className={`cc-detail-value ${isOverdue ? 'cc-val-negative' : ''}`}>
                      {dueDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="cc-detail">
                    <span className="cc-detail-label">Status</span>
                    <span className={`cc-detail-value ${isPaid ? 'cc-val-positive' : isOverdue ? 'cc-val-negative' : ''}`}>
                      {isPaid ? 'Cleared' : isOverdue ? 'Overdue' : remaining > 0 ? 'Pending' : 'No Bill'}
                    </span>
                  </div>
                </div>

                {/* Action button */}
                {remaining > 0 && isOwn && (
                  <button
                    className="cc-pay-btn"
                    onClick={() => { setSelectedCard(card.id); setPaymentAmount(remaining.toString()); setShowPaymentForm(true); }}
                  >
                    <FaWallet style={{ marginRight: 8 }} />
                    Pay ₹{remaining.toLocaleString("en-IN")}
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
      <AppModalRenderer modal={modal} closeModal={closeModal} confirmAndClose={confirmAndClose} />
    </div>
  );
}
