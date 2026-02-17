import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaArrowLeft, FaArrowRight, FaCheck, FaPlus, FaTimes,
  FaSun, FaCloudRain, FaMoneyBillWave, FaReceipt,
  FaShoppingCart, FaCreditCard, FaChartLine, FaHeart,
  FaListUl, FaPen
} from "react-icons/fa";
import { useEncryptedApiCalls } from "../hooks/useEncryptedApiCalls";
import { isFeatureEnabled } from "../features";
import { HealthThresholds } from "../services/clientCalculations";
import { invalidateDashboardCache } from "../utils/cacheInvalidation";
import "./OnboardingFlow.css";

interface OnboardingFlowProps {
  token: string;
  onClose: () => void;
  onComplete: () => void;
}

type StepId = "income" | "fixed" | "variable" | "credit" | "investment" | "thresholds" | "summary";

interface IncomeItem { name: string; amount: number; frequency: string; }
interface FixedItem { name: string; amount: number; frequency: string; }
interface VariableItem { name: string; planned: number; }
interface CreditItem { name: string; bill: number; dueDate: string; }
interface InvestmentItem { name: string; amount: number; }

interface SaveResult { category: string; name: string; ok: boolean; error?: string; }

const STEP_META: { id: StepId; label: string; icon: React.ReactNode; required?: boolean }[] = [
  { id: "income", label: "Income", icon: <FaMoneyBillWave />, required: true },
  { id: "fixed", label: "Fixed Expenses", icon: <FaReceipt /> },
  { id: "variable", label: "Variable Expenses", icon: <FaShoppingCart /> },
  { id: "credit", label: "Credit Cards", icon: <FaCreditCard /> },
  { id: "investment", label: "Investments", icon: <FaChartLine /> },
  { id: "thresholds", label: "Health Comfort", icon: <FaHeart /> },
  { id: "summary", label: "Review & Finish", icon: <FaListUl /> },
];

const FIXED_PRESETS = ["Rent", "Utilities", "EMI", "Subscriptions", "Insurance"];
const VARIABLE_PRESETS = ["Groceries", "Transport", "Dining Out", "Shopping", "Entertainment"];
const INVESTMENT_PRESETS = ["SIP", "PPF", "Mutual Fund", "Stocks", "FD"];

function defaultDueDate() {
  const d = new Date();
  d.setDate(d.getDate() + 10);
  return d.toISOString().split("T")[0];
}

export function OnboardingFlow({ token, onClose, onComplete }: OnboardingFlowProps) {
  const api = useEncryptedApiCalls();
  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveResults, setSaveResults] = useState<SaveResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  // ── Multi-item accumulators ──
  const [incomes, setIncomes] = useState<IncomeItem[]>([]);
  const [fixedExpenses, setFixedExpenses] = useState<FixedItem[]>([]);
  const [variablePlans, setVariablePlans] = useState<VariableItem[]>([]);
  const [creditCards, setCreditCards] = useState<CreditItem[]>([]);
  const [investments, setInvestments] = useState<InvestmentItem[]>([]);

  // ── Per-step form state ──
  const [incForm, setIncForm] = useState<IncomeItem>({ name: "Salary", amount: 0, frequency: "monthly" });
  const [fixForm, setFixForm] = useState<FixedItem>({ name: "", amount: 0, frequency: "monthly" });
  const [varForm, setVarForm] = useState<VariableItem>({ name: "", planned: 0 });
  const [ccForm, setCcForm] = useState<CreditItem>({ name: "", bill: 0, dueDate: defaultDueDate() });
  const [invForm, setInvForm] = useState<InvestmentItem>({ name: "", amount: 0 });

  // ── Thresholds ──
  const [thresholds, setThresholds] = useState<HealthThresholds>({
    good_min: 20, ok_min: 10, ok_max: 19.99, not_well_max: 9.99,
  });

  // ── Edit mode tracking ──
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  useEffect(() => {
    if (isFeatureEnabled("health_thresholds_configurable")) {
      api.getHealthThresholds(token).then((t) => t && setThresholds(t)).catch(() => {});
    }
  }, [token]);

  const currentStep = STEP_META[stepIndex];
  const totalSteps = STEP_META.length;

  // ── Item CRUD helpers ──
  const addItem = () => {
    const step = currentStep.id;
    if (step === "income") {
      if (!incForm.name.trim() || incForm.amount <= 0) return;
      if (editingIndex !== null) {
        setIncomes(prev => prev.map((it, i) => i === editingIndex ? { ...incForm } : it));
        setEditingIndex(null);
      } else {
        setIncomes(prev => [...prev, { ...incForm }]);
      }
      setIncForm({ name: "Salary", amount: 0, frequency: "monthly" });
    } else if (step === "fixed") {
      if (!fixForm.name.trim() || fixForm.amount <= 0) return;
      if (editingIndex !== null) {
        setFixedExpenses(prev => prev.map((it, i) => i === editingIndex ? { ...fixForm } : it));
        setEditingIndex(null);
      } else {
        setFixedExpenses(prev => [...prev, { ...fixForm }]);
      }
      setFixForm({ name: "", amount: 0, frequency: "monthly" });
    } else if (step === "variable") {
      if (!varForm.name.trim() || varForm.planned <= 0) return;
      if (editingIndex !== null) {
        setVariablePlans(prev => prev.map((it, i) => i === editingIndex ? { ...varForm } : it));
        setEditingIndex(null);
      } else {
        setVariablePlans(prev => [...prev, { ...varForm }]);
      }
      setVarForm({ name: "", planned: 0 });
    } else if (step === "credit") {
      if (!ccForm.name.trim() || ccForm.bill <= 0) return;
      if (editingIndex !== null) {
        setCreditCards(prev => prev.map((it, i) => i === editingIndex ? { ...ccForm } : it));
        setEditingIndex(null);
      } else {
        setCreditCards(prev => [...prev, { ...ccForm }]);
      }
      setCcForm({ name: "", bill: 0, dueDate: defaultDueDate() });
    } else if (step === "investment") {
      if (!invForm.name.trim() || invForm.amount <= 0) return;
      if (editingIndex !== null) {
        setInvestments(prev => prev.map((it, i) => i === editingIndex ? { ...invForm } : it));
        setEditingIndex(null);
      } else {
        setInvestments(prev => [...prev, { ...invForm }]);
      }
      setInvForm({ name: "", amount: 0 });
    }
  };

  const removeItem = (step: StepId, idx: number) => {
    if (step === "income") setIncomes(prev => prev.filter((_, i) => i !== idx));
    else if (step === "fixed") setFixedExpenses(prev => prev.filter((_, i) => i !== idx));
    else if (step === "variable") setVariablePlans(prev => prev.filter((_, i) => i !== idx));
    else if (step === "credit") setCreditCards(prev => prev.filter((_, i) => i !== idx));
    else if (step === "investment") setInvestments(prev => prev.filter((_, i) => i !== idx));
  };

  const editItem = (step: StepId, idx: number) => {
    setEditingIndex(idx);
    if (step === "income") setIncForm({ ...incomes[idx] });
    else if (step === "fixed") setFixForm({ ...fixedExpenses[idx] });
    else if (step === "variable") setVarForm({ ...variablePlans[idx] });
    else if (step === "credit") setCcForm({ ...creditCards[idx] });
    else if (step === "investment") setInvForm({ ...investments[idx] });
  };

  // ── Navigation ──
  const canContinue = () => {
    if (currentStep.id === "income" && incomes.length === 0) return false;
    return true;
  };

  const goNext = () => {
    setEditingIndex(null);
    setStepIndex(i => Math.min(i + 1, totalSteps - 1));
  };
  const goPrev = () => {
    setEditingIndex(null);
    setStepIndex(i => Math.max(i - 1, 0));
  };

  // ── Parallel save ──
  const finish = async () => {
    setSaving(true);
    setError(null);
    setSaveResults([]);

    const calls: { category: string; name: string; fn: () => Promise<any> }[] = [];

    incomes.forEach(inc =>
      calls.push({ category: "Income", name: inc.name, fn: () => api.createIncome(token, { source: inc.name, amount: inc.amount, frequency: inc.frequency }) })
    );
    fixedExpenses.forEach(fix =>
      calls.push({ category: "Fixed", name: fix.name, fn: () => api.createFixedExpense(token, { name: fix.name, amount: fix.amount, frequency: fix.frequency }) })
    );
    variablePlans.forEach(vp =>
      calls.push({ category: "Variable", name: vp.name, fn: () => api.createVariablePlan(token, { name: vp.name, planned: vp.planned }) })
    );
    creditCards.forEach(cc =>
      calls.push({ category: "Credit Card", name: cc.name, fn: () => api.createCreditCard(token, { name: cc.name, billAmount: cc.bill, dueDate: cc.dueDate }) })
    );
    investments.forEach(inv =>
      calls.push({ category: "Investment", name: inv.name, fn: () => api.createInvestment(token, { name: inv.name, monthlyAmount: inv.amount, status: "active" }) })
    );

    // Health thresholds
    if (isFeatureEnabled("health_thresholds_configurable")) {
      calls.push({ category: "Thresholds", name: "Health Thresholds", fn: () => api.updateHealthThresholds(token, thresholds) });
    }

    // Fire all in parallel
    const results = await Promise.allSettled(calls.map(c => c.fn()));

    const mapped: SaveResult[] = results.map((r, i) => ({
      category: calls[i].category,
      name: calls[i].name,
      ok: r.status === "fulfilled",
      error: r.status === "rejected" ? (r.reason?.message || "Failed") : undefined,
    }));

    setSaveResults(mapped);

    const failures = mapped.filter(r => !r.ok);
    if (failures.length > 0) {
      setError(`${failures.length} item(s) failed to save. You can retry or continue — your data is saved for the rest.`);
      setSaving(false);
    } else {
      // All succeeded — invalidate cache and complete
      invalidateDashboardCache();
      setSaving(false);
      onComplete();
    }
  };

  const retryFailed = async () => {
    // Re-run finish — items already created won't be duplicated by backend
    await finish();
  };

  // ── Preset chips handler ──
  const applyPreset = (name: string) => {
    const step = currentStep.id;
    if (step === "fixed") setFixForm(prev => ({ ...prev, name }));
    else if (step === "variable") setVarForm(prev => ({ ...prev, name }));
    else if (step === "investment") setInvForm(prev => ({ ...prev, name }));
  };

  // ── Threshold helpers ──
  const handleSunnyChange = (val: number) => {
    setThresholds(prev => ({
      ...prev,
      good_min: val,
      ok_max: Math.round((val - 0.01) * 100) / 100,
      ok_min: Math.min(prev.ok_min, val - 1),
      not_well_max: Math.round((Math.min(prev.ok_min, val - 1) - 0.01) * 100) / 100,
    }));
  };
  const handleCautionChange = (val: number) => {
    setThresholds(prev => ({
      ...prev,
      ok_min: val,
      not_well_max: Math.round((val - 0.01) * 100) / 100,
    }));
  };

  // ── Summary totals ──
  const totalIncome = incomes.reduce((s, i) => s + i.amount, 0);
  const totalFixed = fixedExpenses.reduce((s, i) => s + i.amount, 0);
  const totalVariable = variablePlans.reduce((s, i) => s + i.planned, 0);
  const totalCC = creditCards.reduce((s, i) => s + i.bill, 0);
  const totalInv = investments.reduce((s, i) => s + i.amount, 0);

  // ── Render helpers ──
  const renderItemCards = (items: { name: string; amount?: number; planned?: number; bill?: number }[], step: StepId) => {
    if (items.length === 0) return null;
    return (
      <div className="ob-item-list">
        {items.map((item, idx) => (
          <div className="ob-item-card" key={idx}>
            <span className="ob-item-name">{item.name}</span>
            <span className="ob-item-amount">
              ₹{(item.amount ?? item.planned ?? item.bill ?? 0).toLocaleString("en-IN")}
            </span>
            <div className="ob-item-actions">
              <button className="ob-item-btn" onClick={() => editItem(step, idx)} title="Edit"><FaPen size={11} /></button>
              <button className="ob-item-btn ob-item-del" onClick={() => removeItem(step, idx)} title="Remove"><FaTimes size={12} /></button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderPresets = (presets: string[]) => (
    <div className="ob-presets">
      {presets.map(p => (
        <button key={p} className="ob-preset-chip" type="button" onClick={() => applyPreset(p)}>{p}</button>
      ))}
    </div>
  );

  // ── Step content renderers ──
  const renderIncomeStep = () => (
    <div className="ob-step-content">
      {renderItemCards(incomes.map(i => ({ name: i.name, amount: i.amount })), "income")}
      <div className="ob-inline-form">
        <div className="ob-form-row">
          <label>
            Name
            <input value={incForm.name} onChange={e => setIncForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Salary" />
          </label>
          <label>
            Monthly amount (₹)
            <input type="number" min={0} value={incForm.amount || ""} onChange={e => setIncForm(p => ({ ...p, amount: parseFloat(e.target.value) || 0 }))} placeholder="50000" />
          </label>
          <label>
            Frequency
            <select value={incForm.frequency} onChange={e => setIncForm(p => ({ ...p, frequency: e.target.value }))}>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </select>
          </label>
        </div>
        <button className="ob-add-btn" type="button" onClick={addItem} disabled={!incForm.name.trim() || incForm.amount <= 0}>
          <FaPlus size={12} /> {editingIndex !== null ? "Update" : "Add Income"}
        </button>
      </div>
      {incomes.length === 0 && <p className="ob-hint">Add at least one income source to continue.</p>}
    </div>
  );

  const renderFixedStep = () => (
    <div className="ob-step-content">
      {renderItemCards(fixedExpenses.map(f => ({ name: f.name, amount: f.amount })), "fixed")}
      {renderPresets(FIXED_PRESETS)}
      <div className="ob-inline-form">
        <div className="ob-form-row">
          <label>
            Expense name
            <input value={fixForm.name} onChange={e => setFixForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Rent" />
          </label>
          <label>
            Amount (₹)
            <input type="number" min={0} value={fixForm.amount || ""} onChange={e => setFixForm(p => ({ ...p, amount: parseFloat(e.target.value) || 0 }))} placeholder="15000" />
          </label>
          <label>
            Frequency
            <select value={fixForm.frequency} onChange={e => setFixForm(p => ({ ...p, frequency: e.target.value }))}>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </select>
          </label>
        </div>
        <button className="ob-add-btn" type="button" onClick={addItem} disabled={!fixForm.name.trim() || fixForm.amount <= 0}>
          <FaPlus size={12} /> {editingIndex !== null ? "Update" : "Add Expense"}
        </button>
      </div>
    </div>
  );

  const renderVariableStep = () => (
    <div className="ob-step-content">
      {renderItemCards(variablePlans.map(v => ({ name: v.name, planned: v.planned })), "variable")}
      {renderPresets(VARIABLE_PRESETS)}
      <div className="ob-inline-form">
        <div className="ob-form-row">
          <label>
            Category name
            <input value={varForm.name} onChange={e => setVarForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Groceries" />
          </label>
          <label>
            Planned monthly (₹)
            <input type="number" min={0} value={varForm.planned || ""} onChange={e => setVarForm(p => ({ ...p, planned: parseFloat(e.target.value) || 0 }))} placeholder="5000" />
          </label>
        </div>
        <button className="ob-add-btn" type="button" onClick={addItem} disabled={!varForm.name.trim() || varForm.planned <= 0}>
          <FaPlus size={12} /> {editingIndex !== null ? "Update" : "Add Category"}
        </button>
      </div>
    </div>
  );

  const renderCreditStep = () => (
    <div className="ob-step-content">
      {renderItemCards(creditCards.map(c => ({ name: c.name, bill: c.bill })), "credit")}
      <div className="ob-inline-form">
        <div className="ob-form-row">
          <label>
            Card name
            <input value={ccForm.name} onChange={e => setCcForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. HDFC Regalia" />
          </label>
          <label>
            Current bill (₹)
            <input type="number" min={0} value={ccForm.bill || ""} onChange={e => setCcForm(p => ({ ...p, bill: parseFloat(e.target.value) || 0 }))} placeholder="8000" />
          </label>
          <label>
            Due date
            <input type="date" value={ccForm.dueDate} onChange={e => setCcForm(p => ({ ...p, dueDate: e.target.value }))} />
          </label>
        </div>
        <button className="ob-add-btn" type="button" onClick={addItem} disabled={!ccForm.name.trim() || ccForm.bill <= 0}>
          <FaPlus size={12} /> {editingIndex !== null ? "Update" : "Add Card"}
        </button>
      </div>
    </div>
  );

  const renderInvestmentStep = () => (
    <div className="ob-step-content">
      {renderItemCards(investments.map(inv => ({ name: inv.name, amount: inv.amount })), "investment")}
      {renderPresets(INVESTMENT_PRESETS)}
      <div className="ob-inline-form">
        <div className="ob-form-row">
          <label>
            Investment name
            <input value={invForm.name} onChange={e => setInvForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. SIP" />
          </label>
          <label>
            Monthly amount (₹)
            <input type="number" min={0} value={invForm.amount || ""} onChange={e => setInvForm(p => ({ ...p, amount: parseFloat(e.target.value) || 0 }))} placeholder="5000" />
          </label>
        </div>
        <button className="ob-add-btn" type="button" onClick={addItem} disabled={!invForm.name.trim() || invForm.amount <= 0}>
          <FaPlus size={12} /> {editingIndex !== null ? "Update" : "Add Investment"}
        </button>
      </div>
    </div>
  );

  const renderThresholdsStep = () => (
    <div className="ob-step-content">
      <div className="ob-threshold-section">
        <div className="onboard-slider-row">
          <FaSun color="#10b981" size={20} />
          <div className="onboard-slider-info">
            <strong>I feel great when {thresholds.good_min}%+ of income is left</strong>
            <input type="range" min={2} max={60} value={thresholds.good_min}
              onChange={e => handleSunnyChange(parseInt(e.target.value))} className="range-sunny" />
          </div>
          <span className="slider-val">{thresholds.good_min}%</span>
        </div>
        <div className="onboard-slider-row">
          <FaCloudRain color="#f59e0b" size={20} />
          <div className="onboard-slider-info">
            <strong>Watch out below {thresholds.ok_min}%</strong>
            <input type="range" min={0} max={Math.max(thresholds.good_min - 1, 1)} value={thresholds.ok_min}
              onChange={e => handleCautionChange(parseInt(e.target.value))} className="range-caution" />
          </div>
          <span className="slider-val">{thresholds.ok_min}%</span>
        </div>
        <p className="ob-hint">Defaults work well for most people — skip if unsure.</p>
      </div>
    </div>
  );

  const renderSummaryStep = () => {
    const sections = [
      { label: "Income", count: incomes.length, total: totalIncome, icon: <FaMoneyBillWave color="#10b981" /> },
      { label: "Fixed Expenses", count: fixedExpenses.length, total: totalFixed, icon: <FaReceipt color="#f59e0b" /> },
      { label: "Variable Plans", count: variablePlans.length, total: totalVariable, icon: <FaShoppingCart color="#8b5cf6" /> },
      { label: "Credit Cards", count: creditCards.length, total: totalCC, icon: <FaCreditCard color="#ef4444" /> },
      { label: "Investments", count: investments.length, total: totalInv, icon: <FaChartLine color="#3b82f6" /> },
    ];

    const monthlyRemaining = totalIncome - totalFixed - totalVariable - totalCC - totalInv;

    return (
      <div className="ob-step-content">
        <div className="ob-summary-grid">
          {sections.map(s => (
            <div className="ob-summary-row" key={s.label}>
              <span className="ob-summary-icon">{s.icon}</span>
              <span className="ob-summary-label">{s.label}</span>
              <span className="ob-summary-count">{s.count} item{s.count !== 1 ? "s" : ""}</span>
              <span className="ob-summary-total">₹{s.total.toLocaleString("en-IN")}</span>
            </div>
          ))}
        </div>
        <div className="ob-summary-remaining">
          <span>Estimated monthly remaining</span>
          <strong style={{ color: monthlyRemaining >= 0 ? "#10b981" : "#ef4444" }}>
            ₹{monthlyRemaining.toLocaleString("en-IN")}
          </strong>
        </div>

        {/* Save results */}
        {saveResults.length > 0 && (
          <div className="ob-save-results">
            {saveResults.map((r, i) => (
              <div key={i} className={`ob-save-row ${r.ok ? "ob-save-ok" : "ob-save-fail"}`}>
                {r.ok ? <FaCheck size={12} /> : <FaTimes size={12} />}
                <span>{r.category}: {r.name}</span>
                {r.error && <small>{r.error}</small>}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderStepBody = () => {
    switch (currentStep.id) {
      case "income": return renderIncomeStep();
      case "fixed": return renderFixedStep();
      case "variable": return renderVariableStep();
      case "credit": return renderCreditStep();
      case "investment": return renderInvestmentStep();
      case "thresholds": return renderThresholdsStep();
      case "summary": return renderSummaryStep();
      default: return null;
    }
  };

  const stepTitles: Record<StepId, { title: string; blurb: string }> = {
    income: { title: "Let's start with your income", blurb: "How much do you earn each month? Add all sources." },
    fixed: { title: "What are your fixed expenses?", blurb: "Rent, utilities, EMIs, subscriptions — the bills you pay every month." },
    variable: { title: "Plan your variable spending", blurb: "Groceries, transport, dining — set budgets for everyday categories." },
    credit: { title: "Any credit cards to track?", blurb: "Add your cards so we can track dues and payments." },
    investment: { title: "Do you invest regularly?", blurb: "SIPs, mutual funds, PPF — add your recurring investments." },
    thresholds: { title: "When should you feel good?", blurb: "After all bills, what % of income left feels comfortable?" },
    summary: { title: "Review your setup", blurb: "Here's everything you've added. Hit Finish to save it all." },
  };

  const { title, blurb } = stepTitles[currentStep.id];
  const isOptionalStep = !currentStep.required && currentStep.id !== "summary";

  return (
    <AnimatePresence>
      <motion.div className="onboarding-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.div className="onboarding-card" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}>

          {/* ── Progress bar ── */}
          <div className="ob-progress-bar">
            {STEP_META.map((s, i) => (
              <div key={s.id}
                className={`ob-progress-seg ${i < stepIndex ? "ob-seg-done" : i === stepIndex ? "ob-seg-active" : ""}`}
                onClick={() => { if (i < stepIndex) { setEditingIndex(null); setStepIndex(i); } }}
                title={s.label}
              >
                <span className="ob-seg-icon">{s.icon}</span>
              </div>
            ))}
          </div>

          {/* ── Header ── */}
          <div className="onboarding-header">
            <div>
              <p className="ob-step-indicator">Step {stepIndex + 1} of {totalSteps}</p>
              <h2>{title}</h2>
              <p>{blurb}</p>
            </div>
            <button className="close-btn" onClick={onClose}>✕</button>
          </div>

          {/* ── Body ── */}
          <div className="onboarding-body">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {renderStepBody()}
              </motion.div>
            </AnimatePresence>
            {error && <div className="onboarding-error">{error}</div>}
          </div>

          {/* ── Footer ── */}
          <div className="onboarding-footer">
            {isOptionalStep ? (
              <button onClick={goNext} className="ghost-btn">Skip for now</button>
            ) : (
              <div />
            )}
            <div className="nav-buttons">
              {stepIndex > 0 && (
                <button onClick={goPrev} className="ghost-btn">
                  <FaArrowLeft /> Back
                </button>
              )}
              {currentStep.id === "summary" ? (
                <>
                  {saveResults.some(r => !r.ok) && (
                    <button onClick={() => { invalidateDashboardCache(); onComplete(); }} className="ghost-btn">
                      Continue Anyway
                    </button>
                  )}
                  <button onClick={saving ? undefined : (saveResults.some(r => !r.ok) ? retryFailed : finish)} disabled={saving} className="primary-btn">
                    {saving ? "Saving..." : saveResults.some(r => !r.ok) ? <>Retry Failed <FaCheck /></> : <>Finish Setup <FaCheck /></>}
                  </button>
                </>
              ) : (
                <button onClick={goNext} disabled={!canContinue()} className="primary-btn">
                  Continue <FaArrowRight />
                </button>
              )}
            </div>
          </div>

        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
