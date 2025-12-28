import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FaSun, FaCloud, FaCloudRain, FaBolt, FaQuestionCircle, FaLightbulb, FaMoneyBillWave, FaShoppingCart, FaChartLine, FaCreditCard, FaUniversity, FaHeart } from "react-icons/fa";
import { fetchDashboard, fetchCreditCards, fetchLoans, fetchHealthDetails } from "../api";
import { IntroModal } from "../components/IntroModal";
import { useIntroModal } from "../hooks/useIntroModal";
import "./HealthDetailsPage.css";

interface HealthDetailsPageProps {
  token: string;
}

export function HealthDetailsPage({ token }: HealthDetailsPageProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { showIntro, closeIntro } = useIntroModal("health");
  const [health, setHealth] = useState<any>(null);
  const [breakdown, setBreakdown] = useState<any>(null);

  useEffect(() => {
    loadHealthDetails();
  }, [token]);

  const loadHealthDetails = async () => {
    try {
      // Use new /health/details endpoint which returns backend's calculation
      const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:12022";
      const [healthResRaw, dashRes, cardsRes, loansRes] = await Promise.all([
        fetch(`${BASE_URL}/health/details`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetchDashboard(token, new Date().toISOString()),
        fetchCreditCards(token),
        fetchLoans(token)
      ]);

      const data = dashRes.data;
      const healthData = healthRes.data;

      console.log("✅ Using backend's health calculation:", healthData);
      console.log("Formula:", healthData.formula);
      console.log("Calculation:", healthData.calculation);

      // Trust the backend's calculation completely!
      const backendHealth = healthData.health;
      const backendCategory = healthData.category;

      // Determine health description and advice based on backend's category
      let description = "";
      let advice = "";

      if (backendCategory === "good") {
        description = "Excellent! You're in great financial shape with healthy savings.";
        advice = "Consider increasing your investments or building an emergency fund.";
      } else if (backendCategory === "ok") {
        description = "You're doing okay, but there's room for improvement.";
        advice = "Try to reduce non-essential expenses and increase your income sources.";
      } else if (backendCategory === "not_well") {
        description = "Warning! You're running tight on finances this month.";
        advice = "Review your variable expenses and consider pausing some investments temporarily.";
      } else if (backendCategory === "worrisome") {
        description = "Critical! You're significantly short on funds this month.";
        advice = "Immediate action needed: Cut non-essential expenses, consider emergency loans, or find additional income.";
      }

      setHealth({
        category: backendCategory,
        remaining: backendHealth,
        description,
        advice
      });

      // Use backend's breakdown data directly
      const breakdown = healthData.breakdown;

      // For display purposes, still get item lists from dashboard data
      setBreakdown({
        income: {
          total: breakdown.totalIncome,
          sources: data.incomes || []
        },
        expenses: {
          fixed: {
            total: breakdown.obligations.unpaidFixed,
            items: data.fixedExpenses?.filter((exp: any) => !exp.paid) || []
          },
          variable: {
            total: breakdown.obligations.unpaidProratedVariable,
            items: data.variablePlans || []
          }
        },
        investments: {
          total: breakdown.obligations.unpaidInvestments,
          items: data.investments?.filter((inv: any) => inv.status === 'active' && !inv.paid) || []
        },
        debts: {
          creditCards: {
            total: breakdown.obligations.unpaidCreditCards,
            items: cardsRes.data.filter((card: any) => {
              const dueDate = new Date(card.dueDate);
              const isCurrentMonth = dueDate.getMonth() === new Date().getMonth();
              return isCurrentMonth && (card.billAmount - card.paidAmount) > 0;
            })
          },
          loans: {
            total: loansRes.data.reduce((sum: number, loan: any) => sum + (loan.emi || 0), 0),
            items: loansRes.data
          }
        },
        totalOutflow: breakdown.totalObligations
      });

    } catch (e) {
      console.error("Failed to load health details:", e);
    } finally {
      setLoading(false);
    }
  };

  const getHealthColor = (category: string) => {
    switch (category) {
      case "good": return "#10b981";
      case "ok": return "#f59e0b";
      case "not_well": return "#f97316";
      case "worrisome": return "#ef4444";
      default: return "#6b7280";
    }
  };

  const getHealthIcon = (category: string) => {
    const color = getHealthColor(category);
    switch (category) {
      case "good": return <FaSun size={64} color={color} />;
      case "ok": return <FaCloud size={64} color={color} />;
      case "not_well": return <FaCloudRain size={64} color={color} />;
      case "worrisome": return <FaBolt size={64} color={color} />;
      default: return <FaQuestionCircle size={64} color={color} />;
    }
  };

  if (loading) {
    return (
      <div className="health-details-page">
        <div className="loading">Loading health details...</div>
      </div>
    );
  }


  return (
    <div className="health-details-page">
      <IntroModal
        isOpen={showIntro}
        onClose={closeIntro}
        title="💊 Financial Health Score"
        description="Deep dive into your financial health. See exactly how much money you'll have left after paying all bills, investments, and expenses. Understand every rupee that goes in and out."
        tips={[
          "Your health score = Available Funds - All Unpaid Obligations",
          "Green (>₹10k) means you're safe, Yellow (₹5-10k) means caution, Red (<₹5k) means urgent",
          "This page shows the complete calculation breakdown",
          "Fixed expenses are monthly bills, Variable are categories like food/transport"
        ]}
      />
      <div className="page-header">
        <button className="back-button" onClick={() => navigate("/dashboard")}>
          ← Back to Dashboard
        </button>
        <h1><FaHeart style={{ marginRight: 8, verticalAlign: 'middle' }} color="#10b981" />Financial Health Details</h1>
      </div>

      {/* Health Summary Card */}
      <motion.div
        className="health-summary-card"
        style={{ borderColor: getHealthColor(health?.category || "good") }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="health-icon-large">{getHealthIcon(health?.category || "good")}</div>
        <h2 style={{ color: getHealthColor(health?.category || "good") }}>
          {health.category === "good" ? "Good" :
            health.category === "ok" ? "OK" :
              health.category === "not_well" ? "Not Well" : "Worrisome"}
        </h2>
        <div className="remaining-amount" style={{ color: (health?.remaining || 0) >= 0 ? "#10b981" : "#ef4444" }}>
          {(health?.remaining || 0) >= 0 ? "+" : ""}₹{(health?.remaining || 0).toLocaleString("en-IN")}
        </div>
        <p className="health-description">{health?.description || "Loading..."}</p>
        <div className="health-advice">
          <strong><FaLightbulb style={{ marginRight: 6 }} />Advice:</strong> {health?.advice || "Loading..."}
        </div>
      </motion.div>

      {/* Calculation Breakdown */}
      <div className="calculation-section">
        <h2><FaChartLine style={{ marginRight: 8 }} />How We Calculated Your Health</h2>
        <div className="calculation-explanation">
          <p><strong>Health Score = Income - (Unpaid Fixed + Variable + Active Unpaid Investments)</strong></p>
          <ul>
            <li>✅ <strong>Included:</strong> All income, <u>only unpaid</u> fixed expenses, variable expenses (prorated or actual, whichever is higher), <u>only unpaid active</u> investments</li>
            <li>❌ <strong>Excluded:</strong> Paid items, credit cards & loans (tracked separately), paused investments</li>
            <li>📅 <strong>Note:</strong> Variable expenses use "higher of actual spent OR prorated planned" to account for month progress</li>
            <li>💡 <strong>Why?</strong> Paid items don't affect your remaining balance, so only unpaid obligations count</li>
          </ul>
        </div>

        {/* Income */}
        <motion.div
          className="breakdown-card income-card"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="card-header">
            <h3><FaMoneyBillWave style={{ marginRight: 8 }} />Total Monthly Income</h3>
            <span className="amount positive">+₹{breakdown.income.total.toLocaleString("en-IN")}</span>
          </div>
          <div className="items-list">
            {breakdown.income.sources.map((inc: any) => {
              const monthly = inc.frequency === "monthly" ? inc.amount :
                inc.frequency === "quarterly" ? inc.amount / 3 :
                  inc.amount / 12;
              return (
                <div key={inc.id} className="item-row">
                  <span>{inc.source}</span>
                  <span>+₹{Math.round(monthly).toLocaleString("en-IN")}</span>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Expenses */}
        <motion.div
          className="breakdown-card expense-card"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="card-header">
            <h3><FaMoneyBillWave style={{ marginRight: 8 }} />Unpaid Fixed Expenses</h3>
            <span className="amount negative">-₹{Math.round(breakdown.expenses.fixed.total).toLocaleString("en-IN")}</span>
          </div>
          <div className="sub-note">
            <small>Only showing unpaid fixed expenses (paid items don't count)</small>
          </div>
          <div className="items-list">
            {breakdown.expenses.fixed.items.length === 0 ? (
              <div className="item-row"><span>All fixed expenses are paid! 🎉</span></div>
            ) : (
              breakdown.expenses.fixed.items.map((exp: any) => {
                const monthly = exp.frequency === "monthly" ? exp.amount :
                  exp.frequency === "quarterly" ? exp.amount / 3 :
                    exp.amount / 12;
                return (
                  <div key={exp.id} className="item-row">
                    <span>{exp.name} {exp.is_sip_flag && <span className="sip-badge">SIP</span>}</span>
                    <span>-₹{Math.round(monthly).toLocaleString("en-IN")}</span>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>

        <motion.div
          className="breakdown-card expense-card"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="card-header">
            <h3><FaShoppingCart style={{ marginRight: 8 }} />Variable Expenses (Prorated)</h3>
            <span className="amount negative">-₹{Math.round(breakdown.expenses.variable.total).toLocaleString("en-IN")}</span>
          </div>
          <div className="sub-note">
            <small>Uses higher of: actual spent OR prorated planned based on month progress</small>
          </div>
          <div className="items-list">
            {breakdown.expenses.variable.items.map((plan: any) => {
              const actualTotal = plan.actualTotal || 0;
              const monthProgress = new Date().getDate() / new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
              const proratedPlanned = plan.planned * monthProgress;
              const considered = Math.max(proratedPlanned, actualTotal);
              return (
                <div key={plan.id} className="item-row">
                  <span>
                    {plan.name}
                    <div className="item-details">
                      <small>Actual: ₹{Math.round(actualTotal)} | Prorated: ₹{Math.round(proratedPlanned)}</small>
                    </div>
                  </span>
                  <span>-₹{Math.round(considered).toLocaleString("en-IN")}</span>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Investments - NOW included in health */}
        {breakdown.investments.total > 0 && (
          <motion.div
            className="breakdown-card investment-card"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="card-header">
              <h3><FaChartLine style={{ marginRight: 8 }} />Active Unpaid Investments</h3>
              <span className="amount negative">-₹{breakdown.investments.total.toLocaleString("en-IN")}</span>
            </div>
            <div className="sub-note">
              <small>Only active, unpaid investments are counted in your health</small>
            </div>
            <div className="items-list">
              {breakdown.investments.items.length === 0 ? (
                <div className="item-row"><span>All investments are paid or paused! 🎉</span></div>
              ) : (
                breakdown.investments.items.map((inv: any) => (
                  <div key={inv.id} className="item-row">
                    <span>{inv.name} <span className="goal-badge">{inv.goal}</span></span>
                    <span>-₹{inv.monthlyAmount.toLocaleString("en-IN")}</span>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}

        <div className="section-divider">
          <h3><FaChartLine style={{ marginRight: 8 }} />Health Calculation Summary</h3>
          <p>Your financial health: Income - Unpaid Fixed - Prorated Variable - Active Unpaid Investments</p>
        </div>

        {/* Debts - Shown separately, NOT included in health */}
        {(breakdown.debts.creditCards.total > 0 || breakdown.debts.loans.total > 0) && (
          <motion.div
            className="breakdown-card debt-card info-only"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="card-header">
              <h3><FaCreditCard style={{ marginRight: 8 }} />Credit Cards & Loans <span className="info-badge">Not included in health</span></h3>
              <span className="amount negative">
                -₹{(breakdown.debts.creditCards.total + breakdown.debts.loans.total).toLocaleString("en-IN")}
              </span>
            </div>
            <div className="sub-note">
              <small>Debts are tracked separately and managed through their own pages</small>
            </div>
            <div className="items-list">
              {breakdown.debts.creditCards.items.map((card: any) => {
                const remaining = card.billAmount - card.paidAmount;
                if (remaining > 0) {
                  return (
                    <div key={card.id} className="item-row">
                      <span>{card.name} (Due: {new Date(card.dueDate).toLocaleDateString()})</span>
                      <span>-₹{remaining.toLocaleString("en-IN")}</span>
                    </div>
                  );
                }
                return null;
              })}
              {breakdown.debts.loans.items.map((loan: any) => (
                <div key={loan.id} className="item-row">
                  <span>{loan.name} EMI</span>
                  <span>-₹{loan.emi.toLocaleString("en-IN")}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Total Summary */}
        <motion.div
          className="total-summary"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <div className="summary-row">
            <span className="label">Total Income:</span>
            <span className="value positive">+₹{breakdown.income.total.toLocaleString("en-IN")}</span>
          </div>
          <div className="summary-row">
            <span className="label">Total Outflow:</span>
            <span className="value negative">-₹{Math.round(breakdown.totalOutflow).toLocaleString("en-IN")}</span>
          </div>
          <div className="divider"></div>
          <div className="summary-row final">
            <span className="label">Remaining:</span>
            <span className={`value ${health.remaining >= 0 ? 'positive' : 'negative'}`}>
              {health.remaining >= 0 ? "+" : ""}₹{health.remaining.toLocaleString("en-IN")}
            </span>
          </div>
        </motion.div>
      </div>

      {/* Health Categories Explanation */}
      <div className="health-categories">
        <h2><FaChartLine style={{ marginRight: 8 }} />Health Categories Explained</h2>
        <div className="categories-grid">
          <div className="category-card good">
            <div className="category-icon"><FaSun size={48} color="#10b981" /></div>
            <h3>Good</h3>
            <p>Remaining &gt; ₹10,000</p>
            <p className="desc">Excellent financial health with healthy savings</p>
          </div>
          <div className="category-card ok">
            <div className="category-icon"><FaCloud size={48} color="#f59e0b" /></div>
            <h3>OK</h3>
            <p>Remaining: ₹1,000 - ₹9,999</p>
            <p className="desc">Decent position but room for improvement</p>
          </div>
          <div className="category-card not-well">
            <div className="category-icon"><FaCloudRain size={48} color="#f97316" /></div>
            <h3>Not Well</h3>
            <p>Short by: ₹1 - ₹3,000</p>
            <p className="desc">Running tight, need to optimize expenses</p>
          </div>
          <div className="category-card worrisome">
            <div className="category-icon"><FaBolt size={48} color="#ef4444" /></div>
            <h3>Worrisome</h3>
            <p>Short by: &gt; ₹3,000</p>
            <p className="desc">Critical situation, immediate action needed</p>
          </div>
        </div>
      </div>
    </div>
  );
}

