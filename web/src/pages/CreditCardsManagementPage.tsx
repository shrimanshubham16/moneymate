import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FaCreditCard, FaPlus, FaBell, FaExclamationTriangle, FaEdit, FaHistory, FaInfoCircle } from "react-icons/fa";
import { useEncryptedApiCalls } from "../hooks/useEncryptedApiCalls";
import { useSharedView } from "../hooks/useSharedView";
import { PageInfoButton } from "../components/PageInfoButton";
import { SkeletonLoader } from "../components/SkeletonLoader";
import { ClientCache } from "../utils/cache";
import { invalidateDashboardCache } from "../utils/cacheInvalidation";
import { useAppModal } from "../hooks/useAppModal";
import { AppModalRenderer } from "../components/AppModalRenderer";
import "./CreditCardsManagementPage.css";

interface CreditCardsManagementPageProps {
  token: string;
}

export function CreditCardsManagementPage({ token }: CreditCardsManagementPageProps) {
  const navigate = useNavigate();
  const api = useEncryptedApiCalls();
  const { modal, showAlert, showConfirm, closeModal, confirmAndClose } = useAppModal();
  const { isSharedView } = useSharedView(token);
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
    // Load all data in parallel for faster initial load
    Promise.all([loadCards(), loadBillingAlerts(), loadPlans()]);
  }, []);

  // v1.2: Load variable expense plans
  const loadPlans = async () => {
    try {
      // Extract userId from token for cache
      let userId = 'unknown';
      try {
        const tokenPayload = JSON.parse(atob(token.split('.')[1]));
        userId = tokenPayload.userId;
      } catch (e) {
        console.error('[CACHE_ERROR] Failed to extract userId from token:', e);
      }

      // Try cache first
      const cached = ClientCache.get<any>('dashboard', userId);
      if (cached?.variablePlans) {
        setPlans(cached.variablePlans);
        return;
      }
      
      const res = await api.fetchDashboard(token, new Date().toISOString());
      setPlans(res.data.variablePlans || []);
      ClientCache.set('dashboard', res.data, userId);
    } catch (e) {
      console.error("Failed to load plans:", e);
    }
  };

  const loadCards = async () => {
    try {
      // Extract userId from token for cache
      let userId = 'unknown';
      try {
        const tokenPayload = JSON.parse(atob(token.split('.')[1]));
        userId = tokenPayload.userId;
      } catch (e) {
        console.error('[CACHE_ERROR] Failed to extract userId from token:', e);
      }

      // Try cache first
      const cached = ClientCache.get<any[]>('creditCards', userId);
      if (cached) {
        setCards(cached);
        setLoading(false);
      }
      
      const res = await api.fetchCreditCards(token);
      setCards(res.data);
      ClientCache.set('creditCards', res.data, userId);
    } catch (e) {
      console.error("Failed to load cards:", e);
    } finally {
      setLoading(false);
    }
  };

  // v1.2: Load billing alerts
  const loadBillingAlerts = async () => {
    try {
      const res = await api.getBillingAlerts(token);
      setBillingAlerts(res.data || []);
    } catch (e) {
      console.error("Failed to load billing alerts:", e);
    }
  };

  // v1.2: Handle reset billing
  const handleResetBilling = async (cardId: string, cardName: string) => {
    showConfirm(`Reset current expenses for ${cardName}? You'll need to manually update the bill amount.`, async () => {
      try {
        await api.resetCreditCardBilling(token, cardId);
        invalidateDashboardCache();
        showAlert("Current expenses reset. Please update the bill amount manually.", "Success");
        loadCards();
        loadBillingAlerts();
      } catch (e: any) {
        showAlert(e.message);
      }
    });
  };

  // v1.2: Load credit card usage
  const loadCardUsage = async (cardId: string) => {
    try {
      const res = await api.getCreditCardUsage(token, cardId);
      
      // Normalize snake_case to camelCase (defensive)
      const normalizedUsage = (res.data || []).map((u: any) => ({
        id: u.id,
        planId: u.planId || u.plan_id,
        amount: u.amount,
        incurredAt: u.incurredAt || u.incurred_at,
        subcategory: u.subcategory,
        justification: u.justification,
        paymentMode: u.paymentMode || u.payment_mode,
        creditCardId: u.creditCardId || u.credit_card_id
      }));
      
      setCardUsage(normalizedUsage);
      setSelectedCardId(cardId);
      setShowUsageModal(true);
    } catch (e: any) {
      console.error("Failed to load credit card usage:", e);
      showAlert(e.message || "Failed to load credit card usage");
    }
  };

  // v1.2: Handle update bill
  const handleUpdateBill = async (cardId: string) => {
    try {
      const amount = Number(updateBillForm.billAmount);
      if (isNaN(amount) || amount < 0) {
        showAlert("Please enter a valid bill amount");
        return;
      }
      // Optimistic update
      setCards(prev => prev.map(c => c.id === cardId ? { ...c, billAmount: amount } : c));
      setShowUpdateBillModal(false);
      setUpdateBillForm({ billAmount: "" });
      setSelectedCardId(null);
      
      await api.updateCreditCardBill(token, cardId, amount);
      invalidateDashboardCache();
      loadCards(); // background refresh
      loadBillingAlerts(); // background refresh
      showAlert("Bill amount updated successfully", "Success");
    } catch (e: any) {
      showAlert(e.message || "Failed to update bill");
      loadCards(); // rollback
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cardData = {
      name: form.name,
      billAmount: Number(form.billAmount) || 0,
      paidAmount: Number(form.paidAmount) || 0,
      dueDate: form.dueDate,
      billingDate: Number(form.billingDate)
    };

    // Optimistic: add card immediately
    const tempId = `temp-${Date.now()}`;
    const optimisticCard = {
      id: tempId,
      ...cardData,
      currentExpenses: 0,
      remainingDue: (Number(form.billAmount) || 0) - (Number(form.paidAmount) || 0)
    };
    setCards(prev => [optimisticCard, ...prev]);
    setShowForm(false);
    setForm({ name: "", billAmount: "0", paidAmount: "0", dueDate: new Date().toISOString().split('T')[0], billingDate: "1" });

    try {
      const res = await api.createCreditCard(token, cardData);
      // Replace temp with real
      if (res?.data) {
        setCards(prev => prev.map(c => c.id === tempId ? { ...c, ...res.data } : c));
      }
      invalidateDashboardCache();
      loadCards(); // background refresh
    } catch (e: any) {
      showAlert(e.message);
      setCards(prev => prev.filter(c => c.id !== tempId)); // rollback
    }
  };

  const handleDelete = async (id: string) => {
    showConfirm("Are you sure you want to delete this credit card?", async () => {
      const prevCards = cards;
      setCards(prev => prev.filter(c => c.id !== id)); // optimistic removal
      try {
        await api.deleteCreditCard(token, id);
        invalidateDashboardCache();
        loadCards(); // background refresh
      } catch (e: any) {
        showAlert(e.message);
        setCards(prevCards); // rollback
      }
    });
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
              description="Your credit card command center — add your cards, update bill amounts when statements arrive, and track what's being charged in real time via variable expense logs."
              impact="Credit card dues are factored into your health score using the unpaid balance (bill − paid). Keeping bills up to date here ensures your financial picture is always accurate. You'll also receive a notification when a card's billing cycle resets."
              howItWorks={[
                "Add each credit card with its name, bill amount, paid amount, and billing date",
                "When you log a variable expense with payment mode 'Credit Card', it appears under the relevant card's usage",
                "Update bill amounts after each statement to keep your health score accurate",
                "Paid amount tracks how much you've cleared — the remainder shows as outstanding",
                "Billing date resets are flagged so you remember to update the new statement amount"
              ]}
            />
          </div>
          <button className="add-card-btn" onClick={() => setShowForm(true)}>
            <FaPlus style={{ marginRight: 6 }} />
            Add Card
          </button>
        </div>
      </div>

      {/* Billing Alerts */}
      {billingAlerts.length > 0 && (
        <div style={{ marginBottom: 20, padding: '12px 16px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontWeight: 700, color: '#f59e0b', fontSize: '0.9rem' }}>
            <FaBell color="#f59e0b" />
            Billing Alerts
          </div>
          {billingAlerts.map((alert, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <FaExclamationTriangle size={14} color="#f59e0b" />
              <span>{alert.message}</span>
            </div>
          ))}
        </div>
      )}

      {isSharedView && (
        <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: '#a78bfa' }}>
          <FaInfoCircle size={14} />
          <span>Credit card management shows only your own cards. Shared members&apos; cards are private.</span>
        </div>
      )}

      {loading ? (
        <SkeletonLoader type="card" count={3} />
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
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="ccm-action-btn edit"
                          onClick={() => { setSelectedCardId(card.id); setUpdateBillForm({ billAmount: (card.billAmount || 0).toString() }); setShowUpdateBillModal(true); }}
                          title="Update bill amount"
                        >
                          <FaEdit size={14} /> Bill
                        </button>
                        <button className="ccm-action-btn usage"
                          onClick={() => loadCardUsage(card.id)}
                          title="View credit card usage"
                        >
                          <FaHistory size={14} /> Usage
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
                      {/* Current Expenses */}
                      {(card.currentExpenses || 0) > 0 && (
                        <div className="detail-row" style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.15)', padding: '8px 12px', borderRadius: 8 }}>
                          <span style={{ fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Current Expenses</span>
                          <span className="amount" style={{ color: '#f59e0b' }}>
                            ₹{(card.currentExpenses || 0).toLocaleString("en-IN")}
                          </span>
                        </div>
                      )}
                      <div className="detail-row">
                        <span>Bill Amount</span>
                        <span className="amount">₹{(card.billAmount || 0).toLocaleString("en-IN")}</span>
                      </div>
                      <div className="detail-row">
                        <span>Paid Amount</span>
                        <span className="amount" style={{ color: '#10b981' }}>₹{(parseFloat(card.paidAmount || 0)).toLocaleString("en-IN")}</span>
                      </div>
                      <div className="detail-row">
                        <span>Remaining</span>
                        <span className={`amount ${remaining > 0 ? 'negative' : 'positive'}`}>
                          ₹{remaining.toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div className="detail-row">
                        <span>Due Date</span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{new Date(card.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                      <div className="detail-row">
                        <span>Billing Date</span>
                        <span style={{ color: 'var(--text-primary)' }}>Day {card.billingDate || 1} of each month</span>
                      </div>
                      {card.needsBillUpdate && (
                        <div style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: 8, color: '#f87171', fontWeight: 700, fontSize: '0.85rem' }}>
                          ⚠ Bill needs to be updated with actual amount
                        </div>
                      )}
                    </div>
                    {/* Reset Billing */}
                    {(card.currentExpenses || 0) > 0 && (
                      <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(184, 193, 236, 0.08)' }}>
                        <button
                          onClick={() => handleResetBilling(card.id, card.name)}
                          style={{
                            width: '100%',
                            padding: '10px',
                            background: 'rgba(245, 158, 11, 0.12)',
                            border: '1px solid rgba(245, 158, 11, 0.25)',
                            borderRadius: 10,
                            cursor: 'pointer',
                            fontWeight: 700,
                            color: '#f59e0b',
                            fontSize: '0.9rem',
                            transition: 'all 0.2s'
                          }}
                        >
                          Reset for Billing (₹{(card.currentExpenses || 0).toLocaleString("en-IN")})
                        </button>
                        <small style={{ display: 'block', marginTop: 4, color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>
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
            <motion.div className="modal-overlay" onClick={() => setShowForm(false)}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <motion.div className="modal-shell modal-md" onClick={(e) => e.stopPropagation()}
                initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}>
                <div className="modal-header">
                  <h3>Add New Credit Card</h3>
                  <button className="modal-close" onClick={() => setShowForm(false)}>✕</button>
                </div>
                <div className="modal-body">
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
                    <small style={{ color: 'var(--text-tertiary)', display: 'block', marginTop: 4, fontSize: '0.8rem' }}>
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
                      <small style={{ color: 'var(--text-tertiary)', display: 'block', marginTop: 4, fontSize: '0.8rem' }}>
                        Day of month when bill is generated (1-31)
                      </small>
                    </div>
                  </div>
                  <div className="form-actions" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                    <button type="button" onClick={() => setShowForm(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="primary">
                      Add Card
                    </button>
                  </div>
                </form>
                </div>
              </motion.div>
            </motion.div>
          )}
        </>
      )}

      {/* Usage Modal – Dark Theme */}
      {showUsageModal && selectedCardId && (
        <motion.div 
          className="modal-overlay" 
          onClick={() => { setShowUsageModal(false); setSelectedCardId(null); }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div 
            className="modal-shell modal-md"
            onClick={(e) => e.stopPropagation()} 
            initial={{ scale: 0.95, opacity: 0, y: 24 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
          >
            <div className="modal-header">
              <h3><FaCreditCard style={{ marginRight: 8, opacity: 0.7 }} />
                {cards.find(c => c.id === selectedCardId)?.name || 'Card'} — Usage
              </h3>
              <button className="modal-close" onClick={() => { setShowUsageModal(false); setSelectedCardId(null); }}>✕</button>
            </div>
            <div className="modal-body">
              {cardUsage.length === 0 ? (
                <div style={{ padding: '40px 0', textAlign: 'center' }}>
                  <FaCreditCard size={48} style={{ color: 'var(--text-tertiary)', marginBottom: 12 }} />
                  <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No expenses charged to this card yet.</p>
                  <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', marginTop: 8 }}>Expenses paid via this card will appear here.</p>
                </div>
              ) : (
                <>
                  {/* Total Summary */}
                  <div style={{ marginBottom: 16, padding: 16, background: 'linear-gradient(135deg, rgba(0, 217, 255, 0.12), rgba(167, 139, 250, 0.12))', border: '1px solid rgba(0, 217, 255, 0.15)', borderRadius: 12 }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 4 }}>Total Unbilled Expenses</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent-cyan, #22d3ee)' }}>
                      ₹{cardUsage.reduce((sum, u) => sum + (parseFloat(u.amount) || 0), 0).toLocaleString("en-IN")}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
                      {cardUsage.length} transaction{cardUsage.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                  
                  {/* Usage List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {cardUsage.map((usage: any, index: number) => {
                      const plan = plans.find((p: any) => p.id === usage.planId);
                      return (
                        <motion.div 
                          key={usage.id} 
                          style={{ padding: 14, background: 'var(--bg-base)', border: '1px solid var(--border-subtle, rgba(184, 193, 236, 0.08))', borderRadius: 10, transition: 'all 0.2s' }}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                                {plan?.name || 'Unknown Expense'}
                              </div>
                              <div style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>
                                {plan?.category || 'Uncategorized'}
                                {usage.subcategory && usage.subcategory !== 'Unspecified' && ` · ${usage.subcategory}`}
                              </div>
                              {usage.justification && (
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', fontStyle: 'italic', marginTop: 4 }}>
                                  &ldquo;{usage.justification}&rdquo;
                                </div>
                              )}
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontWeight: 700, fontSize: '1rem', color: '#f87171' }}>
                                ₹{(parseFloat(usage.amount) || 0).toLocaleString("en-IN")}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
                                {usage.incurredAt ? new Date(usage.incurredAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : ''}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Update Bill Modal */}
      {showUpdateBillModal && selectedCardId && (
        <motion.div className="modal-overlay" onClick={() => { setShowUpdateBillModal(false); setSelectedCardId(null); }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div className="modal-shell modal-sm" onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}>
            <div className="modal-header">
              <h3>Update Bill Amount</h3>
              <button className="modal-close" onClick={() => { setShowUpdateBillModal(false); setSelectedCardId(null); }}>✕</button>
            </div>
            <div className="modal-body">
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
                  <small style={{ color: 'var(--text-tertiary)', display: 'block', marginTop: 4, fontSize: '0.8rem' }}>
                    Update the bill amount with actual charges (including fees, etc.)
                  </small>
                </div>
                <div className="form-actions" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                  <button type="button" onClick={() => { setShowUpdateBillModal(false); setSelectedCardId(null); }}>Cancel</button>
                  <button type="submit" className="primary">Update Bill</button>
                </div>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
      <AppModalRenderer modal={modal} closeModal={closeModal} confirmAndClose={confirmAndClose} />
    </div>
  );
}
