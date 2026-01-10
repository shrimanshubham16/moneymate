import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FaUserCircle, FaLock } from "react-icons/fa";
import { useEncryptedApiCalls } from "../hooks/useEncryptedApiCalls";
import { useSharedView } from "../hooks/useSharedView";
import { SkeletonLoader } from "../components/SkeletonLoader";
import "./CreditCardsPage.css";

interface CreditCardsPageProps {
  token: string;
}

export function CreditCardsPage({ token }: CreditCardsPageProps) {
  const navigate = useNavigate();
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
      // For shared view, fetch from dashboard which includes all users' data
      if (isSharedView) {
        const res = await api.fetchDashboard(token, new Date().toISOString(), getViewParam());
        // Extract credit cards from dashboard (would need backend support)
        // For now, just fetch own cards since credit cards endpoint doesn't support view param
        const cardsRes = await api.fetchCreditCards(token);
        setCards(cardsRes.data);
      } else {
        const res = await api.fetchCreditCards(token);
        setCards(res.data);
      }
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
      await loadCards();
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="credit-cards-page">
      <div className="page-header">
        <button className="back-button" onClick={() => navigate("/dashboard")}>← Back</button>
        <h1>Credit Cards</h1>
        <button className="add-button" onClick={() => navigate("/settings/credit-cards")}>
          + Add Card
        </button>
      </div>

      {showPaymentForm && (
        <motion.div className="modal-overlay" onClick={() => setShowPaymentForm(false)}>
          <motion.div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Pay Credit Card Bill</h2>
            <form onSubmit={handlePayment}>
              <div className="form-group">
                <label>Select Card *</label>
                <select value={selectedCard || ""} onChange={(e) => setSelectedCard(e.target.value)} required>
                  <option value="">Select card</option>
                  {cards.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} - Bill: ₹{(parseFloat(c.billAmount || 0)).toLocaleString("en-IN")}, Paid: ₹{(parseFloat(c.paidAmount || 0)).toLocaleString("en-IN")}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Payment Amount *</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  required
                />
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => setShowPaymentForm(false)}>Cancel</button>
                <button type="submit">Pay</button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}

      {loading ? <SkeletonLoader type="card" count={3} /> : cards.length === 0 ? (
        <div className="empty-state">No credit cards. Add one to get started!</div>
      ) : (
        <div className="cards-list">
          {cards.map((card, index) => {
            const remaining = (parseFloat(card.billAmount) || 0) - (parseFloat(card.paidAmount) || 0);
            const dueDate = new Date(card.dueDate);
            const isOverdue = dueDate < new Date() && remaining > 0;
            const cardUserId = card.userId || card.user_id;
            const isOwn = !cardUserId || isOwnItem(cardUserId);
            return (
              <motion.div
                key={card.id}
                className={`card-item ${isOverdue ? "overdue" : ""} ${!isOwn ? "shared-item" : ""}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="card-header">
                  <h3>{formatSharedField(card.name, isOwn)}</h3>
                  {isSharedView && (
                    <span className="owner-badge">
                      {isOwn ? <FaUserCircle /> : <FaLock />}
                      {getOwnerName(cardUserId)}
                    </span>
                  )}
                  {isOverdue && <span className="overdue-badge">OVERDUE</span>}
                </div>
                <div className="card-details">
                  <div className="detail-item">
                    <span className="label">Current Unbilled</span>
                    <span className="value">₹{(parseFloat(card.currentExpenses) || 0).toLocaleString("en-IN")}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Bill Amount</span>
                    <span className="value">₹{(parseFloat(card.billAmount) || 0).toLocaleString("en-IN")}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Paid</span>
                    <span className="value paid">₹{(parseFloat(card.paidAmount) || 0).toLocaleString("en-IN")}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Remaining</span>
                    <span className={`value ${remaining > 0 ? "remaining" : "paid"}`}>
                      ₹{remaining.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Due Date</span>
                    <span className="value">{dueDate.toLocaleDateString()}</span>
                  </div>
                </div>
                {remaining > 0 && isOwn && (
                  <button className="pay-button" onClick={() => { setSelectedCard(card.id); setPaymentAmount(remaining.toString()); setShowPaymentForm(true); }}>
                    Pay ₹{remaining.toLocaleString("en-IN")}
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

