import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FaSun, FaCloud, FaCloudRain, FaBolt, FaQuestionCircle, FaLightbulb, FaMoneyBillWave, FaShoppingCart, FaChartLine, FaCreditCard, FaUniversity, FaHeart, FaUsers, FaBomb } from "react-icons/fa";
import { useEncryptedApiCalls } from "../hooks/useEncryptedApiCalls";
import { useSharedView } from "../hooks/useSharedView";
import { IntroModal } from "../components/IntroModal";
import { useIntroModal } from "../hooks/useIntroModal";
import { funFacts } from "../data/funFacts";
import { isFeatureEnabled } from "../features";
import { getHealthThresholds, updateHealthThresholds } from "../api";
import { HealthThresholds } from "../services/clientCalculations";
import { feedbackPowerUp, feedbackBump } from "../utils/haptics";
import { calculateHealthScore } from "../utils/healthCalculation";
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

      // Auto-refresh RSU stock prices for accurate health calculation
      const rsuIncomes = (data.incomes || []).filter(
        (inc: any) => inc.incomeType === 'rsu' && inc.rsuTicker && inc.includeInHealth !== false
      );
      if (rsuIncomes.length > 0) {
        const userCurrency = data.preferences?.currency || 'INR';
        const tickers = [...new Set(rsuIncomes.map((inc: any) => inc.rsuTicker))];
        try {
          const quotes = await Promise.allSettled(
            tickers.map((t: string) => api.fetchStockQuote(token, t, userCurrency))
          );
          const quoteMap: Record<string, any> = {};
          quotes.forEach((result, idx) => {
            if (result.status === 'fulfilled') quoteMap[tickers[idx] as string] = result.value.data;
          });
          // Update incomes in data with fresh prices
          data.incomes = (data.incomes || []).map((inc: any) => {
            if (inc.incomeType !== 'rsu' || !inc.rsuTicker || !quoteMap[inc.rsuTicker]) return inc;
            const quote = quoteMap[inc.rsuTicker];
            const taxRate = inc.rsuTaxRate ?? 33;
            const netShares = Math.round((inc.rsuGrantCount || 0) * (1 - taxRate / 100));
            const priceInUserCur = quote.conversionRate ? quote.price * quote.conversionRate : quote.price;
            const newAmount = Math.round((netShares * priceInUserCur / 12) * 100) / 100;
            // Background update stored price
            api.updateIncome(token, inc.id, {
              amount: newAmount,
              rsu_stock_price: quote.price,
              rsu_conversion_rate: quote.conversionRate || undefined
            }).catch(() => {});
            return { ...inc, amount: newAmount, rsuStockPrice: quote.price, rsuConversionRate: quote.conversionRate };
          });
        } catch (err) {
          console.warn('[HEALTH_RSU_REFRESH] Failed:', err);
        }
      }

      // Thresholds
      if (thresholdsRes) {
        setThresholds(thresholdsRes.data || thresholdsRes);
      }
      
      // Get constraint score from dashboard data
      if (data.constraintScore) {
        setConstraintScore(data.constraintScore);
      }


      // Use the SAME shared health calculation as the Dashboard (single source of truth)
      let currentUserId: string | null = null;
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        currentUserId = payload.userId || payload.user_id || payload.sub;
      } catch (e) {
        console.error('[HEALTH_TOKEN_DEBUG] Failed to parse token:', e);
      }
      
      const healthResult = calculateHealthScore({
        incomes: data.incomes || [],
        fixedExpenses: data.fixedExpenses || [],
        variablePlans: data.variablePlans || [],
        investments: data.investments || [],
        creditCards: cardsRes.data || [],
        futureBombs: data.futureBombs || [],
        sharedAggregates: data.sharedUserAggregates || [],
        healthThresholds: thresholds,
        currentUserId,
        selectedView,
      });

      const hb = healthResult.breakdown;

      console.log('[HEALTH_CALC] HealthPage', {
        income: Math.round(hb.totalIncome), fixed: Math.round(hb.totalFixed),
        variable: Math.round(hb.totalVariable), investments: Math.round(hb.totalInvestments),
        ccBill: Math.round(hb.totalCcBill), bombSip: Math.round(hb.bombSip),
        outflow: Math.round(hb.totalOutflow), remaining: Math.round(healthResult.remaining ?? 0),
        pct: healthResult.healthPct?.toFixed(1), category: healthResult.category,
      });

      let description = "";
      let advice = "";
      if (healthResult.category === "good") {
        description = "Excellent! You're in great financial shape with healthy savings.";
        advice = "Consider increasing your investments or building an emergency fund.";
      } else if (healthResult.category === "ok") {
        description = "You're doing okay, but there's room for improvement.";
        advice = "Try to reduce non-essential expenses and increase your income sources.";
      } else if (healthResult.category === "not_well") {
        description = "Warning! You're running tight on finances this month.";
        advice = "Review your variable expenses and consider pausing some investments temporarily.";
      } else if (healthResult.category === "worrisome") {
        description = "Critical! You're significantly short on funds this month.";
        advice = "Immediate action needed: Cut non-essential expenses, consider emergency loans, or find additional income.";
      }

      setHealth({
        category: healthResult.category,
        remaining: healthResult.remaining,
        description,
        advice
      });

      const isSpecificUserView = selectedView !== 'me' && selectedView !== 'merged';
      const sharedAggregates = data.sharedUserAggregates || [];
      const isShowingSharedData = (selectedView === 'merged' || isSpecificUserView) && sharedAggregates.length > 0;

      const filterByUser = (items: any[]) => {
        if (isSpecificUserView) return [];
        return items.filter((item: any) => item.userId === currentUserId || item.user_id === currentUserId);
      };
      const ownIncomes = filterByUser(data.incomes || []);
      const ownFixedExpenses = filterByUser(data.fixedExpenses || []);
      const ownInvestmentsData = filterByUser(data.investments || []);
      const ownVariablePlansData = filterByUser(data.variablePlans || []);
      const allActiveInvestments = ownInvestmentsData.filter((inv: any) => inv.status === 'active');
      const healthIncomes = ownIncomes.filter((inc: any) => inc.includeInHealth !== false);

      const healthDataBreakdown = healthData.breakdown;

      setBreakdown({
        income: {
          total: hb.totalIncome,
          sources: healthIncomes,
          sharedTotal: isShowingSharedData ? hb.sharedIncome : 0
        },
        expenses: {
          fixed: {
            total: hb.totalFixed,
            items: ownFixedExpenses,
            sharedTotal: isShowingSharedData ? hb.sharedFixed : 0
          },
          variable: {
            total: hb.totalVariable,
            items: ownVariablePlansData,
            sharedTotal: isShowingSharedData ? hb.sharedVariable : 0
          }
        },
        investments: {
          total: hb.totalInvestments,
          items: allActiveInvestments,
          sharedTotal: isShowingSharedData ? hb.sharedInvestments : 0
        },
        debts: {
          creditCards: {
            total: hb.totalCcBill,
            items: isSpecificUserView ? [] : (cardsRes.data || []).filter((card: any) => {
              if (card.isSharedCard) return false;
              const billAmount = parseFloat(card.billAmount || card.bill_amount || 0) || 0;
              return billAmount > 0;
            }),
            sharedTotal: isShowingSharedData ? hb.sharedCcBill : 0
          },
          loans: {
            total: healthDataBreakdown?.debts?.loans?.total || loansRes.data.reduce((sum: number, loan: any) => sum + (loan.emi || 0), 0),
            items: loansRes.data
          }
        },
        bombDefusal: {
          total: hb.bombSip,
          items: (data.futureBombs || [])
        },
        totalOutflow: hb.totalOutflow,
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
      feedbackPowerUp();
      setSaveMessage("Saved ✓");
    } catch (e: any) {
      feedbackBump();
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
          "Health Score = Income − (Fixed Expenses + max(Prorated, Actual) Variable + Investments + Credit Card Dues + Bomb Defusal SIP)",
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
        className={`health-summary-card health-cat-${health?.category || "good"}`}
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
          <p><strong>Health Score = Income - (Fixed + max(Prorated, Actual) Variable + Active Investments + CC Dues + Bomb SIP)</strong></p>
          
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
            <h3><FaMoneyBillWave style={{ marginRight: 8 }} />Fixed Expenses</h3>
            <span className="amount negative">-₹{Math.round(breakdown.expenses?.fixed?.total || 0).toLocaleString("en-IN")}</span>
          </div>
          <div className="sub-note">
            <small>All fixed expenses — commitment exists whether paid or not. Skipped SIPs are excluded from this total.</small>
          </div>
          <div className="items-list">
            {(!breakdown.expenses?.fixed?.items || breakdown.expenses.fixed.items.length === 0) && !breakdown.expenses?.fixed?.sharedTotal ? (
              <div className="item-row"><span>No fixed expenses added</span></div>
            ) : (
              <>
                {breakdown.expenses.fixed.items.map((exp: any) => {
                  const amount = parseFloat(exp.amount || 0);
                  const monthly = exp.frequency === "monthly" ? amount :
                    exp.frequency === "quarterly" ? amount / 3 :
                      amount / 12;
                  const isSkipped = exp.isSkipped === true;
                  return (
                    <div key={exp.id} className={`item-row ${isSkipped ? "item-skipped" : ""}`}>
                      <span>
                        {exp.name} {exp.is_sip_flag && <span className="sip-badge">SIP</span>}
                        {isSkipped && <span className="skip-badge-inline">Skipped</span>}
                      </span>
                      <span className={isSkipped ? "amount-skipped" : ""}>
                        {isSkipped ? <s>-₹{Math.round(monthly || 0).toLocaleString("en-IN")}</s> : `-₹${Math.round(monthly || 0).toLocaleString("en-IN")}`}
                      </span>
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
              
              const actualTotal = actuals.reduce((sum: number, a: any) => sum + (parseFloat(a.amount) || 0), 0);
              const proratedForRemainingDays = (parseFloat(plan.planned) || 0) * remainingDaysRatio;
              
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
              <h3><FaChartLine style={{ marginRight: 8 }} />Active Investments</h3>
              <span className="amount negative">-₹{(breakdown.investments?.total || 0).toLocaleString("en-IN")}</span>
            </div>
            <div className="sub-note">
              <small>All active investments — commitment exists whether paid or not</small>
            </div>
            <div className="items-list">
              {(!breakdown.investments?.items || breakdown.investments.items.length === 0) && !breakdown.investments?.sharedTotal ? (
                <div className="item-row"><span>No active investments</span></div>
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

        {/* Future Bomb Defusal SIP */}
        {breakdown.bombDefusal && breakdown.bombDefusal.total > 0 && (
          <motion.div
            className="breakdown-card bomb-card"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.45 }}
          >
            <div className="card-header">
              <h3><FaBomb style={{ marginRight: 8 }} />Bomb Defusal SIP</h3>
              <span className="amount negative">-₹{Math.round(breakdown.bombDefusal.total).toLocaleString("en-IN")}</span>
            </div>
            <div className="sub-note">
              <small>Monthly amount needed to defuse future bombs 1 month before due</small>
            </div>
            <div className="items-list">
              {(breakdown.bombDefusal.items || []).map((bomb: any) => {
                const bombRemaining = Math.max(0, (parseFloat(bomb.totalAmount || bomb.total_amount) || 0) - (parseFloat(bomb.savedAmount || bomb.saved_amount) || 0));
                if (bombRemaining <= 0) return null;
                const dueDate = new Date(bomb.dueDate || bomb.due_date);
                const defuseBy = new Date(dueDate.getFullYear(), dueDate.getMonth() - 1, dueDate.getDate());
                const msPerMonth = 30.44 * 24 * 60 * 60 * 1000;
                const monthsLeft = Math.max(1, Math.floor((defuseBy.getTime() - new Date().getTime()) / msPerMonth));
                const monthlySip = bombRemaining / monthsLeft;
                return (
                  <div key={bomb.id || bomb.name} className="item-row">
                    <span>{bomb.name || bomb.title} <span className="goal-badge">{monthsLeft}mo left</span></span>
                    <span>-₹{Math.round(monthlySip).toLocaleString("en-IN")}/mo</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        
        {/* Credit Cards - Display in breakdown */}
        {breakdown.debts.creditCards.total > 0 && (
          <motion.div
            className="breakdown-card debt-card"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="card-header">
              <h3><FaCreditCard style={{ marginRight: 8 }} />Credit Card Bills</h3>
              <span className="amount negative">-₹{Math.round(breakdown.debts?.creditCards?.total || 0).toLocaleString("en-IN")}</span>
            </div>
            <div className="sub-note">
              <small>Full bill amount is counted as a committed obligation — paying the bill does not change health</small>
            </div>
            <div className="items-list">
              {(!breakdown.debts?.creditCards?.items || breakdown.debts.creditCards.items.length === 0) && !breakdown.debts?.creditCards?.sharedTotal ? (
                <div className="item-row"><span>No credit card bills this month</span></div>
              ) : (
                <>
                  {breakdown.debts.creditCards.items.map((card: any) => {
                    const billAmount = parseFloat(card.billAmount || card.bill_amount || 0) || 0;
                    return (
                      <div key={card.id} className="item-row">
                        <span>{card.name}</span>
                        <span>-₹{Math.round(billAmount).toLocaleString("en-IN")}</span>
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
                <p>Each time you exceed a planned variable expense budget, your risk score increases by <strong>+5</strong>. If you carry unpaid dues (fixed expenses or credit card bills) into the next billing cycle, you get a <strong>+10</strong> penalty. The score uses <strong>gradual cooldown</strong> — it takes multiple clean months to recover.</p>
                <ul>
                  <li><strong style={{ color: '#10b981' }}>Low Risk (0–39):</strong> You&apos;re staying within budget — great job!</li>
                  <li><strong style={{ color: '#f59e0b' }}>Medium Risk (40–69):</strong> Some overspending detected, stay cautious</li>
                  <li><strong style={{ color: '#ef4444' }}>High Risk (70–100):</strong> Frequent overspending, review your budget</li>
                </ul>
                <p><strong>Penalty &amp; Cooldown Mechanics:</strong></p>
                <ul>
                  <li>Variable overspend: <strong>+5 per plan</strong> exceeded</li>
                  <li>Unpaid dues at cycle end: <strong>+10 penalty</strong></li>
                  <li>Deliberately skipped SIPs: <strong>no penalty</strong> — the obligation is removed from your health score for the month</li>
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

