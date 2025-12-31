import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { fetchCreditCards, payCreditCard } from "../api";
import "./CreditCardsPage.css";

interface CreditCardsPageProps {
  token: string;
}

export function CreditCardsPage({ token }: CreditCardsPageProps) {
  const navigate = useNavigate();
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");

  useEffect(() => {
    loadCards();
  }, []);

  const loadCards = async () => {
    try {
      const res = await fetchCreditCards(token);
      // #region agent log H4C/H4D - Log credit card currentExpenses
      console.log('[H4C_H4D] Loaded cards:', res.data);
      (res.data || []).forEach((card: any, i: number) => {
        console.log(`[H4C_H4D] Card ${i} "${card.name}": currentExpenses=${card.currentExpenses}, billAmount=${card.billAmount}`);
      });
      // #endregion
      setCards(res.data);
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
      await payCreditCard(token, selectedCard, Number(paymentAmount));
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

      {loading ? <div>Loading...</div> : cards.length === 0 ? (
        <div className="empty-state">No credit cards. Add one to get started!</div>
      ) : (
        <div className="cards-list">
          {cards.map((card, index) => {
            const remaining = card.billAmount - card.paidAmount;
            const dueDate = new Date(card.dueDate);
            const isOverdue = dueDate < new Date() && remaining > 0;
            return (
              <motion.div
                key={card.id}
                className={`card-item ${isOverdue ? "overdue" : ""}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="card-header">
                  <h3>{card.name}</h3>
                  {isOverdue && <span className="overdue-badge">OVERDUE</span>}
                </div>
                <div className="card-details">
                  <div className="detail-item">
                    <span className="label">Current Unbilled</span>
                    <span className="value">₹{(card.currentExpenses || 0).toLocaleString("en-IN")}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Bill Amount</span>
                    <span className="value">₹{card.billAmount.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Paid</span>
                    <span className="value paid">₹{card.paidAmount.toLocaleString("en-IN")}</span>
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
                {remaining > 0 && (
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

