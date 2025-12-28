import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FaCreditCard, FaPlus } from "react-icons/fa";
import { fetchCreditCards, createCreditCard, deleteCreditCard } from "../api";
import "./CreditCardsManagementPage.css";

interface CreditCardsManagementPageProps {
  token: string;
}

export function CreditCardsManagementPage({ token }: CreditCardsManagementPageProps) {
  const navigate = useNavigate();
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    billAmount: "",
    paidAmount: "0",
    dueDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadCards();
  }, []);

  const loadCards = async () => {
    try {
      const res = await fetchCreditCards(token);
      setCards(res.data);
    } catch (e) {
      console.error("Failed to load cards:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createCreditCard(token, {
        name: form.name,
        billAmount: Number(form.billAmount),
        paidAmount: Number(form.paidAmount),
        dueDate: form.dueDate
      });
      setShowForm(false);
      setForm({ name: "", billAmount: "", paidAmount: "0", dueDate: new Date().toISOString().split('T')[0] });
      await loadCards();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this credit card?")) return;
    try {
      await deleteCreditCard(token, id);
      await loadCards();
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="credit-cards-management-page">
      <div className="page-header">
        <button className="back-button" onClick={() => navigate("/settings")}>
          ← Back
        </button>
        <div className="header-content">
          <h1><FaCreditCard style={{ marginRight: 8, verticalAlign: 'middle' }} />Manage Credit Cards</h1>
          <button className="add-card-btn" onClick={() => setShowForm(true)}>
            <FaPlus style={{ marginRight: 6 }} />
            Add Card
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading...</div>
      ) : (
        <>
          {cards.length === 0 && !showForm ? (
            <div className="empty-state-container">
              <div className="empty-state">
                <FaCreditCard size={64} color="#ef4444" style={{ marginBottom: 16 }} />
                <p>No credit cards yet. Add your first one!</p>
              </div>
            </div>
          ) : (
            <div className="cards-list">
              {cards.map((card) => {
                const remaining = card.billAmount - card.paidAmount;
                return (
                  <div key={card.id} className="card-item">
                    <div className="card-header">
                      <h3>{card.name}</h3>
                      <button
                        className="delete-btn"
                        onClick={() => handleDelete(card.id)}
                        title="Delete card"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="card-details">
                      <div className="detail-row">
                        <span>Bill Amount:</span>
                        <span className="amount">₹{card.billAmount.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="detail-row">
                        <span>Paid Amount:</span>
                        <span className="amount">₹{card.paidAmount.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="detail-row">
                        <span>Remaining:</span>
                        <span className={`amount ${remaining > 0 ? 'negative' : 'positive'}`}>
                          ₹{remaining.toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div className="detail-row">
                        <span>Due Date:</span>
                        <span>{new Date(card.dueDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {showForm && (
            <motion.div className="modal-overlay" onClick={() => setShowForm(false)}>
              <motion.div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>Add New Credit Card</h2>
                  <button onClick={() => setShowForm(false)}>✕</button>
                </div>
                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label>Card Name *</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                      placeholder="e.g., HDFC Regalia"
                    />
                  </div>
                  <div className="form-group">
                    <label>Bill Amount *</label>
                    <input
                      type="number"
                      value={form.billAmount}
                      onChange={(e) => setForm({ ...form, billAmount: e.target.value })}
                      required
                      min="0"
                      placeholder="15000"
                    />
                  </div>
                  <div className="form-group">
                    <label>Paid Amount</label>
                    <input
                      type="number"
                      value={form.paidAmount}
                      onChange={(e) => setForm({ ...form, paidAmount: e.target.value })}
                      min="0"
                      placeholder="0"
                    />
                  </div>
                  <div className="form-group">
                    <label>Due Date *</label>
                    <input
                      type="date"
                      value={form.dueDate}
                      onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-actions">
                    <button type="button" onClick={() => setShowForm(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="primary">
                      Add Card
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}

