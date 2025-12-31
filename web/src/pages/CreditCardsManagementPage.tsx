import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FaCreditCard, FaPlus, FaBell, FaExclamationTriangle, FaEdit, FaHistory } from "react-icons/fa";
import { fetchCreditCards, createCreditCard, deleteCreditCard, resetCreditCardBilling, getBillingAlerts, getCreditCardUsage, fetchDashboard, updateCreditCardBill } from "../api";
import { PageInfoButton } from "../components/PageInfoButton";
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
    billAmount: "0",  // v1.2: Default to 0, can be set later
    paidAmount: "0",
    dueDate: new Date().toISOString().split('T')[0],
    billingDate: "1"  // v1.2: Default to 1st of month
  });
  const [billingAlerts, setBillingAlerts] = useState<any[]>([]);  // v1.2: Billing alerts
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);  // v1.2: Selected card for usage view
  const [cardUsage, setCardUsage] = useState<any[]>([]);  // v1.2: Credit card usage
  const [showUsageModal, setShowUsageModal] = useState(false);  // v1.2: Show usage modal
  const [showUpdateBillModal, setShowUpdateBillModal] = useState(false);  // v1.2: Show update bill modal
  const [updateBillForm, setUpdateBillForm] = useState({ billAmount: "" });  // v1.2: Update bill form
  const [plans, setPlans] = useState<any[]>([]);  // v1.2: Variable expense plans for usage display

  useEffect(() => {
    loadCards();
    loadBillingAlerts();  // v1.2: Load billing alerts
    loadPlans();  // v1.2: Load plans for usage display
  }, []);

  // v1.2: Load variable expense plans
  const loadPlans = async () => {
    try {
      const res = await fetchDashboard(token, new Date().toISOString());
      setPlans(res.data.variablePlans || []);
    } catch (e) {
      console.error("Failed to load plans:", e);
    }
  };

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

  // v1.2: Load billing alerts
  const loadBillingAlerts = async () => {
    try {
      const res = await getBillingAlerts(token);
      setBillingAlerts(res.data || []);
    } catch (e) {
      console.error("Failed to load billing alerts:", e);
    }
  };

  // v1.2: Handle reset billing
  const handleResetBilling = async (cardId: string, cardName: string) => {
    if (!confirm(`Reset current expenses for ${cardName}? You'll need to manually update the bill amount.`)) return;
    try {
      await resetCreditCardBilling(token, cardId);
      await loadCards();
      await loadBillingAlerts();
      alert("Current expenses reset. Please update the bill amount manually.");
    } catch (e: any) {
      alert(e.message);
    }
  };

  // v1.2: Load credit card usage
  const loadCardUsage = async (cardId: string) => {
    try {
      const res = await getCreditCardUsage(token, cardId);
      setCardUsage(res.data || []);
      setSelectedCardId(cardId);
      setShowUsageModal(true);
    } catch (e: any) {
      alert(e.message || "Failed to load credit card usage");
    }
  };

  // v1.2: Handle update bill
  const handleUpdateBill = async (cardId: string) => {
    try {
      const amount = Number(updateBillForm.billAmount);
      if (isNaN(amount) || amount < 0) {
        alert("Please enter a valid bill amount");
        return;
      }
      // Update bill amount via API helper
      await updateCreditCardBill(token, cardId, amount);
      await loadCards();
      await loadBillingAlerts();
      setShowUpdateBillModal(false);
      setUpdateBillForm({ billAmount: "" });
      setSelectedCardId(null);
      alert("Bill amount updated successfully");
    } catch (e: any) {
      alert(e.message || "Failed to update bill");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createCreditCard(token, {
        name: form.name,
        billAmount: Number(form.billAmount) || 0,  // v1.2: Default to 0
        paidAmount: Number(form.paidAmount) || 0,
        dueDate: form.dueDate,
        billingDate: Number(form.billingDate)  // v1.2: Billing date
      });
      setShowForm(false);
      setForm({ name: "", billAmount: "0", paidAmount: "0", dueDate: new Date().toISOString().split('T')[0], billingDate: "1" });
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
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <h1><FaCreditCard style={{ marginRight: 8, verticalAlign: 'middle' }} />Manage Credit Cards</h1>
            <PageInfoButton
              title="Credit Card Management"
              description="Manage your credit cards, track bills, payments, and usage. Monitor your credit card expenses and stay on top of due dates."
              impact="Credit card bills use the FULL bill amount in health score calculations (not unpaid amount). Paying bills doesn't improve health score until you pay MORE than the bill amount. Only overpayments reduce available funds."
              howItWorks={[
                "Add credit cards with bill amount, due date, and billing date",
                "Track current expenses from variable expenses paid via credit card",
                "Update bill amounts manually when statements arrive",
                "Reset billing cycle to zero out current expenses",
                "View usage to see all expenses charged to each card",
                "Get alerts when bills need updating"
              ]}
            />
          </div>
          <button className="add-card-btn" onClick={() => setShowForm(true)}>
            <FaPlus style={{ marginRight: 6 }} />
            Add Card
          </button>
        </div>
      </div>

      {/* v1.2: Billing Alerts */}
      {billingAlerts.length > 0 && (
        <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <FaBell color="#f59e0b" />
            <strong>Billing Alerts</strong>
          </div>
          {billingAlerts.map((alert, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <FaExclamationTriangle size={14} color="#f59e0b" />
              <span>{alert.message}</span>
            </div>
          ))}
        </div>
      )}

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
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {/* v1.2: Update Bill Button */}
                        <button
                          onClick={() => {
                            setSelectedCardId(card.id);
                            setUpdateBillForm({ billAmount: (card.billAmount || 0).toString() });
                            setShowUpdateBillModal(true);
                          }}
                          title="Update bill amount"
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <FaEdit size={14} />
                        </button>
                        {/* v1.2: View Usage Button */}
                        <button
                          onClick={() => loadCardUsage(card.id)}
                          title="View credit card usage"
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <FaHistory size={14} />
                        </button>
                        <button
                          className="delete-btn"
                          onClick={() => handleDelete(card.id)}
                          title="Delete card"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    <div className="card-details">
                      {/* v1.2: Current Expenses */}
                      {(card.currentExpenses || 0) > 0 && (
                        <div className="detail-row" style={{ backgroundColor: '#fef3c7', padding: '8px', borderRadius: '4px', marginBottom: '8px' }}>
                          <span><strong>Current Expenses:</strong></span>
                          <span className="amount" style={{ color: '#f59e0b', fontWeight: 'bold' }}>
                            ₹{(card.currentExpenses || 0).toLocaleString("en-IN")}
                          </span>
                        </div>
                      )}
                      <div className="detail-row">
                        <span>Bill Amount:</span>
                        <span className="amount">₹{(card.billAmount || 0).toLocaleString("en-IN")}</span>
                      </div>
                      <div className="detail-row">
                        <span>Paid Amount:</span>
                        <span className="amount">₹{(parseFloat(card.paidAmount || 0)).toLocaleString("en-IN")}</span>
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
                      {/* v1.2: Billing Date */}
                      <div className="detail-row">
                        <span>Billing Date:</span>
                        <span>Day {card.billingDate || 1} of each month</span>
                      </div>
                      {/* v1.2: Needs Bill Update Alert */}
                      {card.needsBillUpdate && (
                        <div className="detail-row" style={{ backgroundColor: '#fee2e2', padding: '8px', borderRadius: '4px', marginTop: '8px' }}>
                          <span style={{ color: '#ef4444', fontWeight: 'bold' }}>
                            Bill needs to be updated with actual amount
                          </span>
                        </div>
                      )}
                    </div>
                    {/* v1.2: Reset Billing Button */}
                    {(card.currentExpenses || 0) > 0 && (
                      <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e5e7eb' }}>
                        <button
                          onClick={() => handleResetBilling(card.id, card.name)}
                          style={{
                            width: '100%',
                            padding: '8px',
                            backgroundColor: '#f59e0b',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                          }}
                        >
                          Reset for Billing (₹{(card.currentExpenses || 0).toLocaleString("en-IN")})
                        </button>
                        <small style={{ display: 'block', marginTop: '4px', color: '#6b7280' }}>
                          This will reset current expenses to 0. You'll need to manually update the bill amount.
                        </small>
                      </div>
                    )}
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
                    <label>Bill Amount</label>
                    <input
                      type="number"
                      value={form.billAmount}
                      onChange={(e) => setForm({ ...form, billAmount: e.target.value })}
                      min="0"
                      placeholder="0 (can be set later)"
                    />
                    <small style={{ color: '#6b7280', display: 'block', marginTop: '4px' }}>
                      Leave as 0 if no current bill. You can update it later when bill is generated.
                    </small>
                  </div>
                  <div className="form-group">
                    <label>Paid Amount</label>
                    <input
                      type="number"
                      value={form.paidAmount}
                      onChange={(e) => setForm({ ...form, paidAmount: e.target.value })}
                      onFocus={(e) => { if (e.target.value === "0") e.target.value = ""; }}
                      min="0"
                      placeholder=""
                    />
                  </div>
                  <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label>Due Date *</label>
                      <input
                        type="date"
                        value={form.dueDate}
                        onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                        required
                      />
                    </div>
                    {/* v1.2: Billing Date */}
                    <div className="form-group">
                      <label>Billing Date (Day of Month) *</label>
                      <input
                        type="number"
                        value={form.billingDate}
                        onChange={(e) => {
                          const day = parseInt(e.target.value);
                          if (day >= 1 && day <= 31) {
                            setForm({ ...form, billingDate: e.target.value });
                          }
                        }}
                        min="1"
                        max="31"
                        required
                        placeholder="1"
                      />
                      <small style={{ color: '#6b7280', display: 'block', marginTop: '4px' }}>
                        Day of month when bill is generated (1-31)
                      </small>
                    </div>
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

      {/* v1.2: Usage Modal */}
      {showUsageModal && selectedCardId && (
        <motion.div className="modal-overlay" onClick={() => { setShowUsageModal(false); setSelectedCardId(null); }}>
          <motion.div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', maxHeight: '80vh', overflow: 'auto' }}>
            <div className="modal-header">
              <h2>Credit Card Usage</h2>
              <button onClick={() => { setShowUsageModal(false); setSelectedCardId(null); }}>✕</button>
            </div>
            {cardUsage.length === 0 ? (
              <p style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>No expenses charged to this card yet.</p>
            ) : (
              <div style={{ padding: '20px' }}>
                <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
                  <strong>Total: ₹{cardUsage.reduce((sum, u) => sum + u.amount, 0).toLocaleString("en-IN")}</strong>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {cardUsage.map((usage: any) => {
                    const plan = plans.find((p: any) => p.id === usage.planId);
                    return (
                      <div key={usage.id} style={{ 
                        padding: '12px', 
                        border: '1px solid #e5e7eb', 
                        borderRadius: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div>
                          <div style={{ fontWeight: 'bold' }}>₹{usage.amount.toLocaleString("en-IN")}</div>
                          <div style={{ fontSize: '14px', color: '#6b7280' }}>
                            {plan?.name || 'Unknown Plan'} - {usage.subcategory || 'Unspecified'}
                          </div>
                          <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                            {new Date(usage.incurredAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}

      {/* v1.2: Update Bill Modal */}
      {showUpdateBillModal && selectedCardId && (
        <motion.div className="modal-overlay" onClick={() => { setShowUpdateBillModal(false); setSelectedCardId(null); }}>
          <motion.div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Update Bill Amount</h2>
              <button onClick={() => { setShowUpdateBillModal(false); setSelectedCardId(null); }}>✕</button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleUpdateBill(selectedCardId); }}>
              <div className="form-group">
                <label>Bill Amount *</label>
                <input
                  type="number"
                  value={updateBillForm.billAmount}
                  onChange={(e) => setUpdateBillForm({ billAmount: e.target.value })}
                  required
                  min="0"
                  step="0.01"
                />
                <small style={{ color: '#6b7280', display: 'block', marginTop: '4px' }}>
                  Update the bill amount with actual charges (including fees, friend's usage, etc.)
                </small>
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => { setShowUpdateBillModal(false); setSelectedCardId(null); }}>Cancel</button>
                <button type="submit" className="primary">Update Bill</button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

