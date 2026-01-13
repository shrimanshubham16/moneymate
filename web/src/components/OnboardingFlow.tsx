import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaArrowLeft, FaArrowRight, FaCheck, FaSmile } from "react-icons/fa";
import { useEncryptedApiCalls } from "../hooks/useEncryptedApiCalls";
import { isFeatureEnabled } from "../features";
import { HealthThresholds } from "../services/clientCalculations";
import "./OnboardingFlow.css";

interface OnboardingFlowProps {
  token: string;
  onClose: () => void;
  onComplete: () => void;
}

type StepId = "income" | "thresholds" | "fixed" | "variable" | "investment" | "credit";

export function OnboardingFlow({ token, onClose, onComplete }: OnboardingFlowProps) {
  const api = useEncryptedApiCalls();
  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [incomeAmount, setIncomeAmount] = useState<number>(0);
  const [incomeName, setIncomeName] = useState<string>("Primary Income");

  const [thresholds, setThresholds] = useState<HealthThresholds>({
    good_min: 20,
    ok_min: 10,
    ok_max: 19.99,
    not_well_max: 9.99,
  });

  const [fixedAmount, setFixedAmount] = useState<number>(0);
  const [variableName, setVariableName] = useState("Everyday Spending");
  const [variablePlanned, setVariablePlanned] = useState<number>(0);
  const [investmentAmount, setInvestmentAmount] = useState<number>(0);
  const [creditName, setCreditName] = useState("Starter Card");
  const [creditBill, setCreditBill] = useState<number>(0);

  useEffect(() => {
    // Preload thresholds
    if (isFeatureEnabled("health_thresholds_configurable")) {
      api
        .getHealthThresholds(token)
        .then((t) => t && setThresholds(t))
        .catch(() => {});
    }
  }, [token]);

  const steps: { id: StepId; title: string; blurb: string; content: JSX.Element }[] = [
    {
      id: "income",
      title: "Welcome! Let's start with income",
      blurb: "Tell us your main monthly income so we can anchor your plan.",
      content: (
        <div className="field-grid">
          <label>
            Income name
            <input value={incomeName} onChange={(e) => setIncomeName(e.target.value)} />
          </label>
          <label>
            Monthly amount (₹)
            <input
              type="number"
              min={0}
              value={incomeAmount}
              onChange={(e) => setIncomeAmount(parseFloat(e.target.value) || 0)}
            />
          </label>
        </div>
      ),
    },
    {
      id: "thresholds",
      title: "What feels 'good' vs 'tight' to you?",
      blurb: "Set your own bands for financial health (based on % of income remaining).",
      content: (
        <div className="field-grid">
          <label>
            Good min (%)
            <input
              type="number"
              value={thresholds.good_min}
              onChange={(e) => setThresholds({ ...thresholds, good_min: parseFloat(e.target.value) || thresholds.good_min })}
            />
          </label>
          <label>
            OK min (%)
            <input
              type="number"
              value={thresholds.ok_min}
              onChange={(e) => setThresholds({ ...thresholds, ok_min: parseFloat(e.target.value) || thresholds.ok_min })}
            />
          </label>
          <label>
            OK max (%)
            <input
              type="number"
              value={thresholds.ok_max}
              onChange={(e) => setThresholds({ ...thresholds, ok_max: parseFloat(e.target.value) || thresholds.ok_max })}
            />
          </label>
          <label>
            Not-well max (%)
            <input
              type="number"
              value={thresholds.not_well_max}
              onChange={(e) => setThresholds({ ...thresholds, not_well_max: parseFloat(e.target.value) || thresholds.not_well_max })}
            />
          </label>
        </div>
      ),
    },
    {
      id: "fixed",
      title: "Fixed expenses",
      blurb: "Monthly bills: rent, utilities, EMI. Add a quick lump sum to start.",
      content: (
        <div className="field-grid single">
          <label>
            Monthly fixed (₹)
            <input
              type="number"
              min={0}
              value={fixedAmount}
              onChange={(e) => setFixedAmount(parseFloat(e.target.value) || 0)}
            />
          </label>
          <small>We’ll create a starter fixed expense entry. You can refine later.</small>
        </div>
      ),
    },
    {
      id: "variable",
      title: "Variable spending",
      blurb: "Groceries, commute, eating out. Create one starter bucket.",
      content: (
        <div className="field-grid">
          <label>
            Category name
            <input value={variableName} onChange={(e) => setVariableName(e.target.value)} />
          </label>
          <label>
            Planned monthly (₹)
            <input
              type="number"
              min={0}
              value={variablePlanned}
              onChange={(e) => setVariablePlanned(parseFloat(e.target.value) || 0)}
            />
          </label>
        </div>
      ),
    },
    {
      id: "investment",
      title: "Investments",
      blurb: "Optional: SIPs or recurring investments.",
      content: (
        <div className="field-grid single">
          <label>
            Monthly invest (₹)
            <input
              type="number"
              min={0}
              value={investmentAmount}
              onChange={(e) => setInvestmentAmount(parseFloat(e.target.value) || 0)}
            />
          </label>
          <small>Adds a starter investment entry you can edit anytime.</small>
        </div>
      ),
    },
    {
      id: "credit",
      title: "Credit card",
      blurb: "Optional: tell us your current bill so dues are tracked.",
      content: (
        <div className="field-grid">
          <label>
            Card name
            <input value={creditName} onChange={(e) => setCreditName(e.target.value)} />
          </label>
          <label>
            Current bill (₹)
            <input
              type="number"
              min={0}
              value={creditBill}
              onChange={(e) => setCreditBill(parseFloat(e.target.value) || 0)}
            />
          </label>
        </div>
      ),
    },
  ];

  const current = steps[stepIndex];

  const goNext = () => setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  const goPrev = () => setStepIndex((i) => Math.max(i - 1, 0));

  const finish = async () => {
    setSaving(true);
    setError(null);
    try {
      // Income
      if (incomeAmount > 0) {
        await api.createIncome(token, { source: incomeName || "Primary Income", amount: incomeAmount, frequency: "monthly" });
      }
      // Thresholds
      if (isFeatureEnabled("health_thresholds_configurable") && thresholds) {
        await api.updateHealthThresholds(token, thresholds);
      }
      // Fixed
      if (fixedAmount > 0) {
        await api.createFixedExpense(token, { name: "Starter Fixed", amount: fixedAmount, frequency: "monthly" });
      }
      // Variable
      if (variablePlanned > 0) {
        await api.createVariablePlan(token, { name: variableName || "Everyday Spending", planned: variablePlanned });
      }
      // Investment
      if (investmentAmount > 0) {
        await api.createInvestment(token, { name: "Starter SIP", monthlyAmount: investmentAmount, status: "active" });
      }
      // Credit card
      if (creditBill > 0) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 10);
        await api.createCreditCard(token, { name: creditName || "Starter Card", billAmount: creditBill, dueDate: dueDate.toISOString().split("T")[0] });
      }
      onComplete();
    } catch (e: any) {
      setError(e?.message || "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="onboarding-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="onboarding-card"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
        >
          <div className="onboarding-header">
            <div>
              <h2>{current.title}</h2>
              <p>{current.blurb}</p>
            </div>
            <button className="close-btn" onClick={onClose}>✕</button>
          </div>

          <div className="onboarding-body">
            {current.content}
            {error && <div className="onboarding-error">{error}</div>}
          </div>

          <div className="onboarding-footer">
            <button onClick={onClose} className="ghost-btn">Skip for now</button>
            <div className="nav-buttons">
              <button onClick={goPrev} disabled={stepIndex === 0} className="ghost-btn">
                <FaArrowLeft /> Back
              </button>
              {stepIndex < steps.length - 1 ? (
                <button onClick={goNext} className="primary-btn">
                  Next <FaArrowRight />
                </button>
              ) : (
                <button onClick={finish} disabled={saving} className="primary-btn">
                  {saving ? "Saving..." : <>Finish <FaCheck /></>}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
