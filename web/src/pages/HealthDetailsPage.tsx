import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FaSun, FaCloud, FaCloudRain, FaBolt, FaQuestionCircle, FaLightbulb, FaMoneyBillWave, FaShoppingCart, FaChartLine, FaCreditCard, FaUniversity, FaHeart, FaUsers } from "react-icons/fa";
import { useEncryptedApiCalls } from "../hooks/useEncryptedApiCalls";
import { useSharedView } from "../hooks/useSharedView";
import { IntroModal } from "../components/IntroModal";
import { useIntroModal } from "../hooks/useIntroModal";
import { funFacts } from "../data/funFacts";
import { isFeatureEnabled } from "../features";
import { getHealthThresholds, updateHealthThresholds } from "../api";
import { HealthThresholds } from "../services/clientCalculations";
import "./HealthDetailsPage.css";

interface HealthDetailsPageProps {
  token: string;
}

export function HealthDetailsPage({ token }: HealthDetailsPageProps) {
  const DEFAULT_THRESHOLDS: HealthThresholds = {
    good_min: 20,
    ok_min: 10,
    ok_max: 19.99,
    not_well_max: 9.99
  };
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [heroLoading, setHeroLoading] = useState(true);
  const [funFact, setFunFact] = useState<string>("");
  const [thresholds, setThresholds] = useState<HealthThresholds>(DEFAULT_THRESHOLDS);
  const [savingThresholds, setSavingThresholds] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const api = useEncryptedApiCalls();
  const { showIntro, closeIntro } = useIntroModal("health");
  const [health, setHealth] = useState<any>(null);
  const [breakdown, setBreakdown] = useState<any>(null);
  const [constraintScore, setConstraintScore] = useState<any>(null);
  
  // Shared view support
  const { selectedView, isSharedView, getViewParam, getOwnerName, isOwnItem, formatSharedField } = useSharedView(token);
  const hasFetchedRef = useRef(false); // Prevent double fetch in React Strict Mode
  const lastViewRef = useRef<string>(""); // Track view changes

  useEffect(() => {
    // Prevent double fetch in React Strict Mode, but allow on view change
    if (hasFetchedRef.current && lastViewRef.current === selectedView) return;
    hasFetchedRef.current = true;
    lastViewRef.current = selectedView;
    loadHealthDetails();
    setFunFact(funFacts[Math.floor(Math.random() * funFacts.length)]);
  }, [token, selectedView]); // Re-fetch when view changes

  const loadHealthDetails = async () => {
    try {
      setHeroLoading(true);
      // Use the api module's fetchHealthDetails - pass view param for combined data
      const viewParam = getViewParam();

      const promises: any[] = [
        api.fetchHealthDetails(token),
        api.fetchDashboard(token, new Date().toISOString(), viewParam),
        api.fetchCreditCards(token),
        api.fetchLoans(token)
      ];
      const shouldLoadThresholds = isFeatureEnabled("health_thresholds_configurable");
      if (shouldLoadThresholds) {
        promises.push(api.getHealthThresholds(token));
      }

      const [healthRes, dashRes, cardsRes, loansRes, thresholdsRes] = await Promise.all(promises);

      const data = dashRes.data;
      const healthData = healthRes.data;

      // Thresholds
      if (thresholdsRes) {
        setThresholds(thresholdsRes.data || thresholdsRes);
      }
      
      // Get constraint score from dashboard data
      if (data.constraintScore) {
        setConstraintScore(data.constraintScore);
      }


      // Backend's health calculation uses encrypted placeholder values - must use decrypted dashboard data
      // Calculate ALL values from dashboard's decrypted data (NOT backend's healthData which uses encrypted placeholders)
      
      // Get current user ID from token to filter own items (prevent double-counting with aggregates)
      let currentUserId: string | null = null;
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        // Token may use 'userId', 'user_id', or 'sub' depending on how it was created
        currentUserId = payload.userId || payload.user_id || payload.sub;
      } catch (e) {
        console.error('[HEALTH_TOKEN_DEBUG] Failed to parse token:', e);
      }
      
      // Determine if we need to filter by user
      // - "me" or "merged" views: filter by currentUserId to prevent double-counting with aggregates
      // - Specific user view: Use that user's aggregates (can't decrypt their individual items due to E2E)
      const isSpecificUserView = selectedView !== 'me' && selectedView !== 'merged';
      const filterByUser = (items: any[]) => {
        if (isSpecificUserView) {
          // For specific user view, we'll use aggregates instead (can't decrypt their items)
          return [];
        }
        // Filter to current user's items only (for "me" or "merged" views)
        return items.filter((item: any) => item.userId === currentUserId || item.user_id === currentUserId);
      };
      
      // Filter items based on view type
      const ownIncomes = filterByUser(data.incomes || []);
      const ownFixedExpenses = filterByUser(data.fixedExpenses || []);
      const ownInvestmentsData = filterByUser(data.investments || []);
      const ownVariablePlansData = filterByUser(data.variablePlans || []);
      // Get shared users' aggregates for combined health calculation
      const sharedAggregates = data.sharedUserAggregates || [];
      
      // For specific user view, find THAT user's aggregate from the list
      const specificUserAggregate = isSpecificUserView 
        ? sharedAggregates.find((agg: any) => agg.user_id === selectedView) 
        : null;
      
      // Calculate shared totals - for specific user view, use only their aggregate
      const sharedIncomeTotal = isSpecificUserView 
        ? (parseFloat(specificUserAggregate?.total_income_monthly) || 0)
        : sharedAggregates.reduce((sum: number, agg: any) => sum + (parseFloat(agg.total_income_monthly) || 0), 0);
      const sharedFixedTotal = isSpecificUserView
        ? (parseFloat(specificUserAggregate?.total_fixed_monthly) || 0)
        : sharedAggregates.reduce((sum: number, agg: any) => sum + (parseFloat(agg.total_fixed_monthly) || 0), 0);
      const sharedInvestmentsTotal = isSpecificUserView
        ? (parseFloat(specificUserAggregate?.total_investments_monthly) || 0)
        : sharedAggregates.reduce((sum: number, agg: any) => sum + (parseFloat(agg.total_investments_monthly) || 0), 0);
      const sharedVariablePlanned = isSpecificUserView
        ? (parseFloat(specificUserAggregate?.total_variable_planned) || 0)
        : sharedAggregates.reduce((sum: number, agg: any) => sum + (parseFloat(agg.total_variable_planned) || 0), 0);
      const sharedVariableActual = isSpecificUserView
        ? (parseFloat(specificUserAggregate?.total_variable_actual) || 0)
        : sharedAggregates.reduce((sum: number, agg: any) => sum + (parseFloat(agg.total_variable_actual) || 0), 0);
      const sharedCreditCardDues = isSpecificUserView
        ? (parseFloat(specificUserAggregate?.total_credit_card_dues) || 0)
        : sharedAggregates.reduce((sum: number, agg: any) => sum + (parseFloat(agg.total_credit_card_dues) || 0), 0);
      
      // Calculate TOTAL INCOME from decrypted dashboard data (own only - use filtered ownIncomes)
      // Respect include_in_health flag: exclude incomes where includeInHealth === false
      const ownIncomeTotal = ownIncomes
        .filter((inc: any) => inc.includeInHealth !== false)
        .reduce((sum: number, inc: any) => {
          const amount = parseFloat(inc.amount) || 0;
          const monthly = inc.frequency === 'monthly' ? amount :
            inc.frequency === 'quarterly' ? amount / 3 : amount / 12;
          return sum + monthly;
        }, 0);
      const totalIncomeForHealth = ownIncomeTotal + sharedIncomeTotal;
      
      // Use filtered own items (not all items which includes shared users')
      const unpaidFixedExpenses = ownFixedExpenses.filter((exp: any) => !exp.paid);
      const unpaidInvestmentsForCalc = ownInvestmentsData.filter((inv: any) => inv.status === 'active' && !inv.paid);
      
      const ownUnpaidFixedTotal = unpaidFixedExpenses.reduce((sum: number, exp: any) => {
        const amount = parseFloat(exp.amount) || 0;
        const monthly = exp.frequency === 'monthly' ? amount :
          exp.frequency === 'quarterly' ? amount / 3 : amount / 12;
        return sum + monthly;
      }, 0);
      const unpaidFixedTotalForHealth = ownUnpaidFixedTotal + sharedFixedTotal;
      
      const ownUnpaidInvestmentsTotal = unpaidInvestmentsForCalc.reduce((sum: number, inv: any) => {
        return sum + (parseFloat(inv.monthlyAmount) || 0);
      }, 0);
      const unpaidInvestmentsTotalForHealth = ownUnpaidInvestmentsTotal + sharedInvestmentsTotal;
      
      // Calculate variable total from dashboard's decrypted/recalculated data
      // FIXED: Calculate per-plan max(actual, prorated) then sum - matches breakdown display
      const today = new Date();
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      const monthProgress = today.getDate() / daysInMonth;
      const remainingDaysRatio = 1 - monthProgress;
      
      // Calculate per-plan effective amounts (matching breakdown display logic) - use filtered ownVariablePlansData
      const ownVariableTotal = ownVariablePlansData.reduce((sum: number, plan: any) => {
        // Get actuals excluding ExtraCash and CreditCard (they don't reduce available funds)
        const actuals = (plan.actuals || []).filter((a: any) => 
          a.paymentMode !== "ExtraCash" && a.paymentMode !== "CreditCard"
        );
        const actualTotal = actuals.reduce((s: number, a: any) => s + (parseFloat(a.amount) || 0), 0);
        const proratedForRemainingDays = (parseFloat(plan.planned) || 0) * remainingDaysRatio;
        // Use higher of actual vs prorated per plan
        return sum + Math.max(actualTotal, proratedForRemainingDays);
      }, 0);
      // For shared variable, use max of their actual vs prorated planned
      const sharedVariableEffective = Math.max(sharedVariableActual, sharedVariablePlanned * remainingDaysRatio);
      const variableTotalForHealth = ownVariableTotal + sharedVariableEffective;
      
      // For logging purposes
      const totalVariableActual = (data.variablePlans || []).reduce((sum: number, p: any) => 
        sum + (parseFloat(p.actualTotal) || 0), 0);
      const totalVariablePlanned = (data.variablePlans || []).reduce((sum: number, p: any) => 
        sum + (parseFloat(p.planned) || 0), 0);
      const variableProrated = totalVariablePlanned * remainingDaysRatio;
      
      // Calculate credit card dues from decrypted cards data (NOT backend's totalCreditCardDue) - own only
      const ownCreditCardTotal = (cardsRes.data || []).reduce((sum: number, c: any) => {
        const billAmount = parseFloat(c.billAmount || c.bill_amount) || 0;
        const paidAmount = parseFloat(c.paidAmount || c.paid_amount) || 0;
        const remaining = Math.max(0, billAmount - paidAmount);
        return sum + remaining;
      }, 0);
      const creditCardTotalForHealth = ownCreditCardTotal + sharedCreditCardDues;
      
      const totalOutflowForHealth = unpaidFixedTotalForHealth + variableTotalForHealth + unpaidInvestmentsTotalForHealth + creditCardTotalForHealth;
      
      // Calculate correct remaining using frontend's decrypted totals
      const correctRemaining = totalIncomeForHealth - totalOutflowForHealth;
      
      // Determine category based on configurable thresholds (using health score)
      const t = thresholds;
      const healthScore = totalIncomeForHealth > 0
        ? Math.max(0, Math.min(100, (correctRemaining / totalIncomeForHealth) * 100))
        : 0;
      let correctCategory: string;
      if (healthScore >= t.good_min) correctCategory = "good";
      else if (healthScore >= t.ok_min && healthScore <= t.ok_max) correctCategory = "ok";
      else if (healthScore >= 0 && healthScore <= t.not_well_max) correctCategory = "not_well";
      else correctCategory = "worrisome";

      // Determine health description and advice based on CORRECT category
      let description = "";
      let advice = "";

      if (correctCategory === "good") {
        description = "Excellent! You're in great financial shape with healthy savings.";
        advice = "Consider increasing your investments or building an emergency fund.";
      } else if (correctCategory === "ok") {
        description = "You're doing okay, but there's room for improvement.";
        advice = "Try to reduce non-essential expenses and increase your income sources.";
      } else if (correctCategory === "not_well") {
        description = "Warning! You're running tight on finances this month.";
        advice = "Review your variable expenses and consider pausing some investments temporarily.";
      } else if (correctCategory === "worrisome") {
        description = "Critical! You're significantly short on funds this month.";
        advice = "Immediate action needed: Cut non-essential expenses, consider emergency loans, or find additional income.";
      }

      setHealth({
        category: correctCategory,
        remaining: correctRemaining,
        description,
        advice
      });

      // Use backend's data directly
      const breakdown = healthData.breakdown;
      const obligations = healthData.obligations || {};

      // Reuse the already calculated unpaid items and totals
      const unpaidInvestments = unpaidInvestmentsForCalc;
      const unpaidFixedTotal = unpaidFixedTotalForHealth;
      const unpaidInvestmentsTotal = unpaidInvestmentsTotalForHealth;
      
      // For merged view, add shared aggregate as a visible line item so totals match breakdown
      const isShowingSharedData = selectedView === 'merged' && sharedAggregates.length > 0;
      
      setBreakdown({
        income: {
          total: totalIncomeForHealth,  // Use frontend-calculated total from decrypted data
          sources: ownIncomes,  // Use filtered incomes (not ALL data which includes shared users in merged view)
          sharedTotal: isShowingSharedData ? sharedIncomeTotal : 0  // Add shared aggregate total for merged view
        },
        expenses: {
          fixed: {
            total: unpaidFixedTotal,  // Use calculated unpaid total, not backend's total
            items: unpaidFixedExpenses,
            sharedTotal: isShowingSharedData ? sharedFixedTotal : 0
          },
          variable: {
            total: variableTotalForHealth,  // Use recalculated variable total from decrypted data
            items: ownVariablePlansData,  // Use filtered variable plans (not ALL data)
            sharedTotal: isShowingSharedData ? sharedVariableEffective : 0
          }
        },
        investments: {
          total: unpaidInvestmentsTotal,  // Use calculated unpaid total
          items: unpaidInvestments,  // This already uses filtered ownInvestmentsData
          sharedTotal: isShowingSharedData ? sharedInvestmentsTotal : 0
        },
        debts: {
          creditCards: {
            total: creditCardTotalForHealth,  // Use combined total including shared
            items: cardsRes.data.filter((card: any) => {
              const billAmount = card.billAmount || card.bill_amount || 0;
              const paidAmount = card.paidAmount || card.paid_amount || 0;
              return (billAmount - paidAmount) > 0;
            }),
            sharedTotal: isShowingSharedData ? sharedCreditCardDues : 0
          },
          loans: {
            total: breakdown?.debts?.loans?.total || loansRes.data.reduce((sum: number, loan: any) => sum + (loan.emi || 0), 0),
            items: loansRes.data
          }
        },
        totalOutflow: unpaidFixedTotal + variableTotalForHealth + unpaidInvestmentsTotal + creditCardTotalForHealth,
        monthProgress: healthData.monthProgress || 0
      });

    } catch (e) {
      console.error("Failed to load health details:", e);
    } finally {
      setLoading(false);
      setHeroLoading(false);
    }
  };

  // Simplified: user sets 2 boundaries, the rest is derived
  const handleSunnyChange = (val: number) => {
    const clamped = Math.max(1, Math.min(100, val));
    setThresholds((prev) => ({
      ...prev,
      good_min: clamped,
      ok_max: Math.round((clamped - 0.01) * 100) / 100,
      // Ensure cloudy boundary stays below sunny
      ok_min: Math.min(prev.ok_min, clamped - 1),
      not_well_max: Math.round((Math.min(prev.ok_min, clamped - 1) - 0.01) * 100) / 100,
    }));
  };

  const handleCloudyChange = (val: number) => {
    const clamped = Math.max(0, Math.min(thresholds.good_min - 1, val));
    setThresholds((prev) => ({
      ...prev,
      ok_min: clamped,
      not_well_max: Math.round((clamped - 0.01) * 100) / 100,
    }));
  };

  const saveThresholds = async () => {
    setSavingThresholds(true);
    setSaveMessage(null);
    try {
      const updated = await api.updateHealthThresholds(token, thresholds);
      setThresholds(updated);
      setSaveMessage("Saved ✓");
    } catch (e: any) {
      setSaveMessage(e?.message || "Failed to save");
    } finally {
      setSavingThresholds(false);
      setTimeout(() => setSaveMessage(null), 2500);
    }
  };

  const resetThresholds = () => {
    setThresholds(DEFAULT_THRESHOLDS);
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

  const loadingCrawl = (
    <div className="health-crawl">
      <div className="crawl-inner">
        <p>“In a galaxy not so far away, your finances are assembling...”</p>
        <p>{funFact}</p>
      </div>
    </div>
  );

  const pageLoader = (
    <div className="loader-shell">
      <div className="loading-orb" />
      <div className="loading-text">Crunching your health score... client-side for privacy.</div>
      <div className="loading-subtext">We keep calculations on your device; this adds a small load time.</div>
      {loadingCrawl}
    </div>
  );

  if (loading) {
    return (
      <div className="health-details-page">
        {pageLoader}
      </div>
    );
  }

  if (!breakdown || !health) {
    return (
      <div className="health-details-page">
        <div className="loading">Failed to load health details. Please try again.</div>
      </div>
    );
  }


  return (
    <div className="health-details-page">
      <IntroModal
        isOpen={showIntro}
        onClose={closeIntro}
        title="Financial Health Score"
        description="This is the page that tells you the truth — how much money you really have left after every bill, investment, and variable expense. A single number that captures your entire financial standing this month."
        tips={[
          "Health Score = Income − (Unpaid Fixed Expenses + Prorated Variable + Unpaid Investments + Credit Card Dues)",
          "Green (≥20% of income left) = Healthy, Yellow (10–20%) = Tight, Red (<10%) = Danger — you can customise these thresholds",
          "Overspend Risk tracks how often you exceed variable expense budgets and decays monthly",
          "The full breakdown shows exactly where every rupee is going so you can optimise",
          "If your health drops to 'Needs Attention' or 'Worrisome', you'll get a smart notification"
        ]}
      />
      
      {/* Combined View Banner */}
      {isSharedView && (
        <div className="combined-view-banner">
          <FaUsers style={{ marginRight: 8 }} />
          <span>Combined View: Showing merged finances from shared members</span>
        </div>
      )}
      
      <div className="page-header">
        <button className="back-button" onClick={() => navigate("/dashboard")}>
          ← Back to Dashboard
        </button>
        <h1><FaHeart style={{ marginRight: 8, verticalAlign: 'middle' }} color="#10b981" />
          {isSharedView ? "Combined Financial Health" : "Financial Health Details"}
        </h1>
      </div>

      {isFeatureEnabled("health_thresholds_configurable") && !isSharedView && (
        <div className="thresholds-card">
          <div className="thresholds-header">
            <h3><FaQuestionCircle style={{ marginRight: 6, verticalAlign: 'middle', opacity: 0.6, fontSize: '0.85em' }} />When should I feel good about my finances?</h3>
            {saveMessage && <span className="save-message">{saveMessage}</span>}
          </div>
          <p className="threshold-explainer">
            Your health score = what % of income is left after all obligations. Set the boundaries that feel right for you:
          </p>

          {/* Visual bar */}
          <div className="threshold-visual-bar">
            <div className="tv-zone tv-storm" style={{ flex: Math.max(thresholds.ok_min, 2) }}>
              <FaBolt size={14} />
              <span>Storm</span>
              <small>0 – {thresholds.ok_min}%</small>
            </div>
            <div className="tv-zone tv-rain" style={{ flex: Math.max(thresholds.good_min - thresholds.ok_min, 2) }}>
              <FaCloudRain size={14} />
              <span>Rainy</span>
              <small>{thresholds.ok_min} – {thresholds.good_min}%</small>
            </div>
            <div className="tv-zone tv-cloud" style={{ flex: 0 /* placeholder — cloudy lives between ok_min and good_min */ }}>
            </div>
            <div className="tv-zone tv-sun" style={{ flex: Math.max(100 - thresholds.good_min, 5) }}>
              <FaSun size={14} />
              <span>Sunny</span>
              <small>{thresholds.good_min}%+</small>
            </div>
          </div>

          {/* Two simple sliders */}
          <div className="threshold-sliders">
            <div className="threshold-slider-row">
              <div className="slider-label">
                <FaSun color="#10b981" size={18} />
                <div>
                  <strong>Sunny above</strong>
                  <small>I'm comfortable when this much income is left</small>
                </div>
              </div>
              <div className="slider-control">
                <input
                  type="range"
                  min={2}
                  max={60}
                  value={thresholds.good_min}
                  onChange={(e) => handleSunnyChange(parseInt(e.target.value))}
                  className="range-sunny"
                />
                <span className="slider-value">{thresholds.good_min}%</span>
              </div>
            </div>

            <div className="threshold-slider-row">
              <div className="slider-label">
                <FaCloudRain color="#f59e0b" size={18} />
                <div>
                  <strong>Caution below</strong>
                  <small>Below this, I should watch my spending</small>
                </div>
              </div>
              <div className="slider-control">
                <input
                  type="range"
                  min={0}
                  max={Math.max(thresholds.good_min - 1, 1)}
                  value={thresholds.ok_min}
                  onChange={(e) => handleCloudyChange(parseInt(e.target.value))}
                  className="range-caution"
                />
                <span className="slider-value">{thresholds.ok_min}%</span>
              </div>
            </div>
          </div>

          <div className="threshold-actions">
            <button className="secondary-btn" onClick={resetThresholds} disabled={savingThresholds}>
              Reset to default
            </button>
            <button className="threshold-save" onClick={saveThresholds} disabled={savingThresholds}>
              {savingThresholds ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      )}

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
          {(health?.remaining || 0) >= 0 ? "+" : ""}₹{Math.round(health?.remaining || 0).toLocaleString("en-IN")}
        </div>
        <p className="health-description">{health?.description || "Calculating your financial health..."}</p>
        <div className="health-advice">
          <strong><FaLightbulb style={{ marginRight: 6 }} />Advice:</strong> {health?.advice || "Analyzing your financial data..."}
        </div>
      </motion.div>

      {/* Calculation Breakdown */}
      <div className="calculation-section">
        <h2><FaChartLine style={{ marginRight: 8 }} />How We Calculated Your Health</h2>
        <div className="calculation-explanation">
          <p><strong>Health Score = Funds Available - (Unpaid Fixed + Prorated Variable + Active Unpaid Investments + Credit card bill)</strong></p>
          
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
            <span className="amount positive">+₹{(breakdown.income?.total || 0).toLocaleString("en-IN")}</span>
          </div>
          <div className="items-list">
            {(breakdown.income?.sources || []).map((inc: any) => {
              const amount = parseFloat(inc.amount || 0);
              const monthly = inc.frequency === "monthly" ? amount :
                inc.frequency === "quarterly" ? amount / 3 :
                  amount / 12;
              return (
                <div key={inc.id} className="item-row">
                  <span>{inc.source || inc.name || 'Unknown'}</span>
                  <span>+₹{Math.round(monthly || 0).toLocaleString("en-IN")}</span>
                </div>
              );
            })}
            {breakdown.income?.sharedTotal > 0 && (
              <div className="item-row shared-aggregate-row">
                <span><FaUsers style={{ marginRight: 4, opacity: 0.7 }} />Shared Members (aggregate)</span>
                <span>+₹{Math.round(breakdown.income.sharedTotal).toLocaleString("en-IN")}</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Expenses */}
        <motion.div
          className="breakdown-card debt-card info-only"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="card-header">
            <h3><FaMoneyBillWave style={{ marginRight: 8 }} />Unpaid Fixed Expenses</h3>
            <span className="amount negative">-₹{Math.round(breakdown.expenses?.fixed?.total || 0).toLocaleString("en-IN")}</span>
          </div>
          <div className="sub-note">
            <small>Only showing unpaid fixed expenses (paid items don't count)</small>
          </div>
          <div className="items-list">
            {(!breakdown.expenses?.fixed?.items || breakdown.expenses.fixed.items.length === 0) && !breakdown.expenses?.fixed?.sharedTotal ? (
              <div className="item-row"><span>All fixed expenses are paid! </span></div>
            ) : (
              <>
                {breakdown.expenses.fixed.items.map((exp: any) => {
                  const amount = parseFloat(exp.amount || 0);
                  const monthly = exp.frequency === "monthly" ? amount :
                    exp.frequency === "quarterly" ? amount / 3 :
                      amount / 12;
                  return (
                    <div key={exp.id} className="item-row">
                      <span>{exp.name} {exp.is_sip_flag && <span className="sip-badge">SIP</span>}</span>
                      <span>-₹{Math.round(monthly || 0).toLocaleString("en-IN")}</span>
                    </div>
                  );
                })}
                {breakdown.expenses?.fixed?.sharedTotal > 0 && (
                  <div className="item-row shared-aggregate-row">
                    <span><FaUsers style={{ marginRight: 4, opacity: 0.7 }} />Shared Members (aggregate)</span>
                    <span>-₹{Math.round(breakdown.expenses.fixed.sharedTotal).toLocaleString("en-IN")}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>

        <motion.div
          className="breakdown-card debt-card info-only"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="card-header">
            <h3><FaShoppingCart style={{ marginRight: 8 }} />Variable Expenses (Prorated)</h3>
            <span className="amount negative">-₹{Math.round(breakdown.expenses?.variable?.total || 0).toLocaleString("en-IN")}</span>
          </div>
          <div className="sub-note">
            <small>Prorated amount for remaining days of billing cycle (uses higher of actual spending or prorated amount)</small>
          </div>
          <div className="items-list">
            {(breakdown.expenses?.variable?.items || []).map((plan: any) => {
              // FIX: Match backend logic exactly from unpaidProratedVariableForRemainingDays()
              // Backend: 1. Get actuals excluding ExtraCash and CreditCard
              //          2. Calculate actualTotal
              //          3. Calculate proratedForRemainingDays = plan.planned * remainingDaysRatio
              //          4. Use Math.max(proratedForRemainingDays, actualTotal)
              
              const monthProgress = breakdown.monthProgress || 0;
              const remainingDaysRatio = 1 - monthProgress;
              
              // Get actuals for this plan, excluding ExtraCash and CreditCard (they don't reduce available funds)
              const actuals = (plan.actuals || []).filter((a: any) => 
                a.paymentMode !== "ExtraCash" && a.paymentMode !== "CreditCard"
              );
              
              const actualTotal = actuals.reduce((sum: number, a: any) => sum + (a.amount || 0), 0);
              const proratedForRemainingDays = (plan.planned || 0) * remainingDaysRatio;
              
              // Use higher of actual (excluding non-fund-deducting modes) or prorated
              const amountToShow = Math.max(proratedForRemainingDays, actualTotal);
              
              return (
                <div key={plan.id} className="item-row">
                  <span>
                    {plan.name}
                    <div className="item-details">
                      <small>
                        Planned: ₹{Math.round(plan.planned || 0)} | 
                        Prorated for remaining days: ₹{Math.round(proratedForRemainingDays)} | 
                        Actual (fund-deducting): ₹{Math.round(actualTotal)}
                        {actualTotal > proratedForRemainingDays && <span style={{ color: '#f59e0b' }}> (using actual)</span>}
                      </small>
                    </div>
                  </span>
                  <span>-₹{Math.round(amountToShow).toLocaleString("en-IN")}</span>
                </div>
              );
            })}
            {breakdown.expenses?.variable?.sharedTotal > 0 && (
              <div className="item-row shared-aggregate-row">
                <span><FaUsers style={{ marginRight: 4, opacity: 0.7 }} />Shared Members (aggregate)</span>
                <span>-₹{Math.round(breakdown.expenses.variable.sharedTotal).toLocaleString("en-IN")}</span>
              </div>
            )}
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
              <span className="amount negative">-₹{(breakdown.investments?.total || 0).toLocaleString("en-IN")}</span>
            </div>
            <div className="sub-note">
              <small>Only active, unpaid investments are counted in your health</small>
            </div>
            <div className="items-list">
              {(!breakdown.investments?.items || breakdown.investments.items.length === 0) && !breakdown.investments?.sharedTotal ? (
                <div className="item-row"><span>All investments are paid or paused! </span></div>
              ) : (
                <>
                  {breakdown.investments.items.map((inv: any) => (
                    <div key={inv.id} className="item-row">
                      <span>{inv.name} <span className="goal-badge">{inv.goal}</span></span>
                      <span>-₹{(parseFloat(inv.monthlyAmount || inv.monthly_amount || 0)).toLocaleString("en-IN")}</span>
                    </div>
                  ))}
                  {breakdown.investments?.sharedTotal > 0 && (
                    <div className="item-row shared-aggregate-row">
                      <span><FaUsers style={{ marginRight: 4, opacity: 0.7 }} />Shared Members (aggregate)</span>
                      <span>-₹{Math.round(breakdown.investments.sharedTotal).toLocaleString("en-IN")}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}

        
        {/* Credit Cards - FIX: Display in breakdown */}
        {breakdown.debts.creditCards.total > 0 && (
          <motion.div
            className="breakdown-card debt-card"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="card-header">
              <h3><FaCreditCard style={{ marginRight: 8 }} />Unpaid Credit Card Bills</h3>
              <span className="amount negative">-₹{Math.round(breakdown.debts?.creditCards?.total || 0).toLocaleString("en-IN")}</span>
            </div>
            <div className="sub-note">
              <small>Only unpaid credit card bills for current month are counted in your health</small>
            </div>
            <div className="items-list">
              {(!breakdown.debts?.creditCards?.items || breakdown.debts.creditCards.items.length === 0) && !breakdown.debts?.creditCards?.sharedTotal ? (
                <div className="item-row"><span>All credit card bills are paid! </span></div>
              ) : (
                <>
                  {breakdown.debts.creditCards.items.map((card: any) => {
                    const billAmount = parseFloat(card.billAmount || card.bill_amount || 0);
                    const paidAmount = parseFloat(card.paidAmount || card.paid_amount || 0);
                    const remaining = billAmount - paidAmount;
                    return (
                      <div key={card.id} className="item-row">
                        <span>{card.name}</span>
                        <span>-₹{Math.round(remaining || 0).toLocaleString("en-IN")}</span>
                      </div>
                    );
                  })}
                  {breakdown.debts?.creditCards?.sharedTotal > 0 && (
                    <div className="item-row shared-aggregate-row">
                      <span><FaUsers style={{ marginRight: 4, opacity: 0.7 }} />Shared Members (aggregate)</span>
                      <span>-₹{Math.round(breakdown.debts.creditCards.sharedTotal).toLocaleString("en-IN")}</span>
                    </div>
                  )}
                </>
              )}
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
            <span className="value positive">+₹{(breakdown.income?.total || 0).toLocaleString("en-IN")}</span>
          </div>
          <div className="summary-row">
            <span className="label">Total Outflow:</span>
            <span className="value negative">-₹{Math.round(breakdown.totalOutflow || 0).toLocaleString("en-IN")}</span>
          </div>
          <div className="divider"></div>
          <div className="summary-row final">
            <span className="label">Remaining:</span>
            <span className={`value ${(health?.remaining || 0) >= 0 ? 'positive' : 'negative'}`}>
              {`${(health?.remaining || 0) >= 0 ? "+" : ""}₹${Math.round(health?.remaining || 0).toLocaleString("en-IN")}`}
            </span>
          </div>
        </motion.div>
      </div>

      {/* Constraint Score Section */}
      {constraintScore && (
        <motion.div
          className="constraint-score-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <h2><FaChartLine style={{ marginRight: 8 }} />Overspend Risk</h2>
          <div className={`constraint-card constraint-${constraintScore.tier}`}>
            <div className="constraint-header">
              <div className="constraint-icon">
                {constraintScore.tier === 'green' && <FaSun size={48} color="#10b981" />}
                {constraintScore.tier === 'amber' && <FaCloud size={48} color="#f59e0b" />}
                {constraintScore.tier === 'red' && <FaBolt size={48} color="#ef4444" />}
              </div>
              <div className="constraint-info">
                <div className="constraint-score-value" style={{ 
                  color: constraintScore.tier === 'green' ? '#10b981' : 
                         constraintScore.tier === 'amber' ? '#f59e0b' : '#ef4444'
                }}>
                  {constraintScore.score}/100
                </div>
                <div className="constraint-tier" style={{ 
                  color: constraintScore.tier === 'green' ? '#10b981' : 
                         constraintScore.tier === 'amber' ? '#f59e0b' : '#ef4444'
                }}>
                  {constraintScore.tier === 'green' ? 'LOW RISK' : 
                   constraintScore.tier === 'amber' ? 'MEDIUM RISK' : 'HIGH RISK'}
                </div>
              </div>
            </div>
            {/* Visual progress bar */}
            <div className="constraint-progress-bar">
              <div className="constraint-progress-track">
                <div
                  className={`constraint-progress-fill constraint-fill-${constraintScore.tier}`}
                  style={{ width: `${constraintScore.score}%` }}
                />
              </div>
              <div className="constraint-progress-labels">
                <span>0 - Safe</span>
                <span>40 - Caution</span>
                <span>70 - Danger</span>
                <span>100</span>
              </div>
            </div>
            <div className="constraint-details">
              <div className="constraint-stats-grid">
                <div className="constraint-stat">
                  <span className="stat-label">This Month's Overspends</span>
                  <span className="stat-value">{constraintScore.recentOverspends || 0}</span>
                </div>
                <div className="constraint-stat">
                  <span className="stat-label">Risk Score</span>
                  <span className="stat-value">{constraintScore.score}/100</span>
                </div>
                <div className="constraint-stat">
                  <span className="stat-label">Next Decay</span>
                  <span className="stat-value">{(constraintScore.recentOverspends || 0) > 0 ? '-3' : '-7'} pts/mo</span>
                </div>
              </div>
              <div className="constraint-explanation">
                <p><strong>How Overspend Risk Works</strong></p>
                <p>Each time you exceed a planned variable expense budget, your risk score increases by +5. The score uses <strong>gradual cooldown</strong> — it takes multiple clean months to recover from a bad streak, reflecting your true planning habits.</p>
                <ul>
                  <li><strong style={{ color: '#10b981' }}>Low Risk (0–39):</strong> You're staying within budget — great job!</li>
                  <li><strong style={{ color: '#f59e0b' }}>Medium Risk (40–69):</strong> Some overspending detected, stay cautious</li>
                  <li><strong style={{ color: '#ef4444' }}>High Risk (70–100):</strong> Frequent overspending, review your budget</li>
                </ul>
                <p><strong>Cooldown Mechanics:</strong></p>
                <ul>
                  <li>If you still have recent overspends on record: <strong>slow decay (−3/month)</strong></li>
                  <li>Once overspend history clears: <strong>faster recovery (−7/month)</strong></li>
                  <li>Overspend count reduces by 1 per clean month (not instant reset)</li>
                </ul>
                <p className="constraint-note"><FaLightbulb style={{ marginRight: 6, color: '#3b82f6' }} /> {(constraintScore.recentOverspends || 0) > 0 ? `You have ${constraintScore.recentOverspends} recent overspend(s) on record. Stay clean to accelerate recovery.` : `Clean streak! Your score will decay by 7 points at the next cycle reset.`}</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Health Categories Explanation */}
      <div className="health-categories">
        <h2><FaChartLine style={{ marginRight: 8 }} />Health Categories Explained</h2>
        <div className="categories-grid">
          <div className="category-card good">
            <div className="category-icon"><FaSun size={48} color="#10b981" /></div>
            <h3>Good</h3>
            <p>{thresholds.good_min}%+ of income remaining</p>
            <p className="desc">Excellent financial health with healthy savings</p>
          </div>
          <div className="category-card ok">
            <div className="category-icon"><FaCloud size={48} color="#f59e0b" /></div>
            <h3>OK</h3>
            <p>{thresholds.ok_min}% – {thresholds.good_min}% remaining</p>
            <p className="desc">Decent position but room for improvement</p>
          </div>
          <div className="category-card not-well">
            <div className="category-icon"><FaCloudRain size={48} color="#f97316" /></div>
            <h3>Not Well</h3>
            <p>0% – {thresholds.ok_min}% remaining</p>
            <p className="desc">Running tight, need to optimize expenses</p>
          </div>
          <div className="category-card worrisome">
            <div className="category-icon"><FaBolt size={48} color="#ef4444" /></div>
            <h3>Worrisome</h3>
            <p>Spending exceeds income</p>
            <p className="desc">Critical situation, immediate action needed</p>
          </div>
        </div>
      </div>
    </div>
  );
}

