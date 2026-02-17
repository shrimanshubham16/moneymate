import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FaUserCircle, FaLock, FaBomb, FaEdit, FaTrashAlt, FaPause,
  FaLightbulb, FaCheckCircle, FaExclamationTriangle, FaChartLine, FaSlidersH,
  FaInfoCircle
} from "react-icons/fa";
import { useEncryptedApiCalls } from "../hooks/useEncryptedApiCalls";
import { useSharedView } from "../hooks/useSharedView";
import { SharedViewBanner } from "../components/SharedViewBanner";
import { SkeletonLoader } from "../components/SkeletonLoader";
import { EmptyState } from "../components/EmptyState";
import { PageInfoButton } from "../components/PageInfoButton";
import { Modal } from "../components/Modal";
import { invalidateDashboardCache } from "../utils/cacheInvalidation";
import { useAppModal } from "../hooks/useAppModal";
import { AppModalRenderer } from "../components/AppModalRenderer";
import "./FutureBombsPage.css";

interface FutureBombsPageProps {
  token: string;
}

interface PausableInvestment {
  id: string;
  name: string;
  monthlyAmount: number;
}

interface RsuSource {
  id: string;
  ticker: string;
  monthlyNetShares: number;       // net after tax, averaged per month
  conservativePriceLocal: number;  // price * (1-decline) * conversionRate
  maxMonthlyIncome: number;        // monthlyNetShares * conservativePriceLocal
  currency: string;
  userCurrency: string;
}

type StrategyTab = "pause" | "sell" | "mix";

export function FutureBombsPage({ token }: FutureBombsPageProps) {
  const navigate = useNavigate();
  const api = useEncryptedApiCalls();
  const { modal, showAlert, showConfirm, closeModal, confirmAndClose } = useAppModal();
  const [bombs, setBombs] = useState<any[]>([]);
  const [investments, setInvestments] = useState<any[]>([]);
  const [incomes, setIncomes] = useState<any[]>([]);
  const [availableFunds, setAvailableFunds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userCurrency, setUserCurrency] = useState("INR");
  const hasFetchedRef = useRef(false);
  const lastViewRef = useRef<string>("");

  // Per-bomb strategy tab state
  const [activeStrategies, setActiveStrategies] = useState<Record<string, StrategyTab>>({});
  // Custom mix state per bomb: { bombId: { pausedIds: Set<string>, sharesToSell: Record<rsuId, number> } }
  const [customMix, setCustomMix] = useState<Record<string, { pausedIds: string[]; sharesToSell: Record<string, number> }>>({});

  // Form modal state
  const [formModal, setFormModal] = useState<{ isOpen: boolean; editId?: string }>({ isOpen: false });
  const [formData, setFormData] = useState({ name: "", totalAmount: "", savedAmount: "0", dueDate: "" });

  // Shared view support
  const { selectedView, isSharedView, getViewParam, getOwnerName, isOwnItem } = useSharedView(token);

  useEffect(() => {
    if (hasFetchedRef.current && lastViewRef.current === selectedView) return;
    hasFetchedRef.current = true;
    lastViewRef.current = selectedView;
    loadData();
  }, [selectedView]);

  const loadData = async () => {
    try {
      const res = await api.fetchDashboard(token, new Date().toISOString(), getViewParam());
      const data = res.data;
      setBombs(data.futureBombs || []);
      setInvestments(data.investments || []);
      setIncomes(data.incomes || []);
      setUserCurrency(data.preferences?.currency || "INR");

      // Calculate available funds = income - fixed - investments - variable
      const health = data.health || {};
      setAvailableFunds(health.remaining || 0);
    } catch (e) {
      console.error("Failed to load data:", e);
    } finally {
      setLoading(false);
    }
  };

  // ===== RSU / Investment helpers =====

  const getPausableInvestments = useCallback((): PausableInvestment[] => {
    return investments
      .filter((inv: any) => inv.status === "active" && !inv.isPriority)
      .sort((a: any, b: any) => (b.monthlyAmount || 0) - (a.monthlyAmount || 0))
      .map((inv: any) => ({ id: inv.id, name: inv.name, monthlyAmount: inv.monthlyAmount || 0 }));
  }, [investments]);

  const getRsuSources = useCallback((): RsuSource[] => {
    return incomes
      .filter((inc: any) => inc.incomeType === "rsu" && inc.rsuTicker && inc.rsuStockPrice)
      .map((inc: any) => {
        const grantCount = inc.rsuGrantCount || 0;
        const taxRate = (inc.rsuTaxRate ?? 33) / 100;
        const decline = (inc.rsuExpectedDecline ?? 20) / 100;
        const conversionRate = inc.rsuConversionRate || 1;
        const stockPrice = inc.rsuStockPrice || 0;

        // Annual net shares after tax
        const annualNetShares = grantCount * (1 - taxRate);
        // Average monthly net shares
        const monthlyNetShares = annualNetShares / 12;
        // Conservative price in user's currency
        const conservativePriceLocal = stockPrice * (1 - decline) * conversionRate;
        const maxMonthlyIncome = monthlyNetShares * conservativePriceLocal;

        return {
          id: inc.id,
          ticker: inc.rsuTicker,
          monthlyNetShares,
          conservativePriceLocal,
          maxMonthlyIncome,
          currency: inc.rsuCurrency || "USD",
          userCurrency
        };
      })
      .filter(r => r.monthlyNetShares > 0);
  }, [incomes, userCurrency]);

  // ===== Defusal computation for a bomb =====

  const getDefusalData = useCallback((bomb: any) => {
    const sipAmount = bomb.monthlyEquivalent || 0;
    const shortfall = Math.max(0, sipAmount - Math.max(0, availableFunds));
    const canAfford = shortfall === 0;

    const pausable = getPausableInvestments();
    const rsuSources = getRsuSources();

    // Path 1: Pause investments first, then sell RSU
    const path1 = computePauseFirst(shortfall, pausable, rsuSources);
    // Path 2: Sell RSU first, then pause investments
    const path2 = computeSellFirst(shortfall, pausable, rsuSources);

    const canResolve = canAfford || path1.covered || path2.covered;
    const severity: "ok" | "warn" | "critical" = canAfford ? "ok" : canResolve ? "warn" : "critical";

    return { sipAmount, shortfall, canAfford, path1, path2, severity, pausable, rsuSources };
  }, [availableFunds, getPausableInvestments, getRsuSources]);

  // Path 1: Pause investments first, then sell RSU shares
  const computePauseFirst = (shortfall: number, pausable: PausableInvestment[], rsuSources: RsuSource[]) => {
    let remaining = shortfall;
    const pauseSuggestions: PausableInvestment[] = [];

    for (const inv of pausable) {
      if (remaining <= 0) break;
      pauseSuggestions.push(inv);
      remaining -= inv.monthlyAmount;
    }

    const sellSuggestions: { rsuId: string; ticker: string; shares: number; value: number }[] = [];
    if (remaining > 0) {
      for (const rsu of rsuSources) {
        if (remaining <= 0) break;
        const sharesNeeded = Math.min(Math.ceil(remaining / rsu.conservativePriceLocal), Math.floor(rsu.monthlyNetShares));
        if (sharesNeeded > 0) {
          const value = sharesNeeded * rsu.conservativePriceLocal;
          sellSuggestions.push({ rsuId: rsu.id, ticker: rsu.ticker, shares: sharesNeeded, value });
          remaining -= value;
        }
      }
    }

    const pauseFreed = pauseSuggestions.reduce((s, i) => s + i.monthlyAmount, 0);
    const sellFreed = sellSuggestions.reduce((s, i) => s + i.value, 0);
    const covered = remaining <= 0;

    return { pauseSuggestions, sellSuggestions, pauseFreed, sellFreed, remaining: Math.max(0, remaining), covered };
  };

  // Path 2: Sell RSU shares first, then pause investments
  const computeSellFirst = (shortfall: number, pausable: PausableInvestment[], rsuSources: RsuSource[]) => {
    let remaining = shortfall;

    const sellSuggestions: { rsuId: string; ticker: string; shares: number; value: number }[] = [];
    for (const rsu of rsuSources) {
      if (remaining <= 0) break;
      const sharesNeeded = Math.min(Math.ceil(remaining / rsu.conservativePriceLocal), Math.floor(rsu.monthlyNetShares));
      if (sharesNeeded > 0) {
        const value = sharesNeeded * rsu.conservativePriceLocal;
        sellSuggestions.push({ rsuId: rsu.id, ticker: rsu.ticker, shares: sharesNeeded, value });
        remaining -= value;
      }
    }

    const pauseSuggestions: PausableInvestment[] = [];
    if (remaining > 0) {
      for (const inv of pausable) {
        if (remaining <= 0) break;
        pauseSuggestions.push(inv);
        remaining -= inv.monthlyAmount;
      }
    }

    const sellFreed = sellSuggestions.reduce((s, i) => s + i.value, 0);
    const pauseFreed = pauseSuggestions.reduce((s, i) => s + i.monthlyAmount, 0);
    const covered = remaining <= 0;

    return { sellSuggestions, pauseSuggestions, sellFreed, pauseFreed, remaining: Math.max(0, remaining), covered };
  };

  // Custom mix calculation
  const computeCustomMix = (bombId: string, shortfall: number) => {
    const mixState = customMix[bombId] || { pausedIds: [], sharesToSell: {} };
    const pausable = getPausableInvestments();
    const rsuSources = getRsuSources();

    let freedFromPause = 0;
    for (const inv of pausable) {
      if (mixState.pausedIds.includes(inv.id)) {
        freedFromPause += inv.monthlyAmount;
      }
    }

    let freedFromSell = 0;
    for (const rsu of rsuSources) {
      const shares = mixState.sharesToSell[rsu.id] || 0;
      freedFromSell += shares * rsu.conservativePriceLocal;
    }

    const totalFreed = freedFromPause + freedFromSell;
    const remaining = Math.max(0, shortfall - totalFreed);
    const covered = remaining <= 0;

    return { freedFromPause, freedFromSell, totalFreed, remaining, covered };
  };

  // ===== Formatting helpers =====
  const fmt = (n: number) => Math.round(n).toLocaleString("en-IN");
  const getCurrencySymbol = () => {
    const symbols: Record<string, string> = { INR: "₹", USD: "$", EUR: "€", GBP: "£", JPY: "¥", AUD: "A$", CAD: "C$" };
    return symbols[userCurrency] || userCurrency + " ";
  };
  const cs = getCurrencySymbol();

  // ===== Strategy tab helpers =====
  const getStrategy = (bombId: string): StrategyTab => activeStrategies[bombId] || "pause";
  const setStrategy = (bombId: string, tab: StrategyTab) => {
    setActiveStrategies(prev => ({ ...prev, [bombId]: tab }));
    // Initialize custom mix state if switching to mix
    if (tab === "mix" && !customMix[bombId]) {
      setCustomMix(prev => ({ ...prev, [bombId]: { pausedIds: [], sharesToSell: {} } }));
    }
  };

  const toggleMixPause = (bombId: string, invId: string) => {
    setCustomMix(prev => {
      const current = prev[bombId] || { pausedIds: [], sharesToSell: {} };
      const pausedIds = current.pausedIds.includes(invId)
        ? current.pausedIds.filter(id => id !== invId)
        : [...current.pausedIds, invId];
      return { ...prev, [bombId]: { ...current, pausedIds } };
    });
  };

  const setMixShares = (bombId: string, rsuId: string, shares: number) => {
    setCustomMix(prev => {
      const current = prev[bombId] || { pausedIds: [], sharesToSell: {} };
      return { ...prev, [bombId]: { ...current, sharesToSell: { ...current.sharesToSell, [rsuId]: shares } } };
    });
  };

  // ===== Form handlers =====
  const openCreateForm = () => {
    setFormData({ name: "", totalAmount: "", savedAmount: "0", dueDate: "" });
    setFormModal({ isOpen: true });
  };

  const openEditForm = (bomb: any) => {
    setFormData({
      name: bomb.name || "",
      totalAmount: String(bomb.totalAmount || ""),
      savedAmount: String(bomb.savedAmount || "0"),
      dueDate: bomb.dueDate ? new Date(bomb.dueDate).toISOString().split("T")[0] : ""
    });
    setFormModal({ isOpen: true, editId: bomb.id });
  };

  const handleFormSubmit = async () => {
    if (!formData.name.trim()) { showAlert("Name is required."); return; }
    if (!formData.totalAmount || parseFloat(formData.totalAmount) <= 0) { showAlert("Total amount must be a positive number."); return; }
    if (!formData.dueDate) { showAlert("Due date is required."); return; }
    const today = new Date(); today.setHours(0,0,0,0);
    const due = new Date(formData.dueDate);
    if (due <= today) { showAlert("Due date must be in the future."); return; }
    const saved = parseFloat(formData.savedAmount) || 0;
    if (saved < 0) { showAlert("Saved amount cannot be negative."); return; }
    if (saved > parseFloat(formData.totalAmount)) { showAlert("Saved amount cannot exceed total amount."); return; }
    try {
      const payload = {
        name: formData.name.trim(),
        total_amount: parseFloat(formData.totalAmount),
        saved_amount: saved,
        due_date: formData.dueDate
      };
      if (formModal.editId) {
        await api.updateFutureBomb(token, formModal.editId, payload);
      } else {
        await api.createFutureBomb(token, payload);
      }
      invalidateDashboardCache();
      setFormModal({ isOpen: false });
      await loadData();
    } catch (e: any) {
      showAlert("Failed to save: " + e.message);
    }
  };

  const handleDelete = (bomb: any) => {
    showConfirm(`Delete "${bomb.name}"? This cannot be undone.`, async () => {
      try {
        await api.deleteFutureBomb(token, bomb.id);
        invalidateDashboardCache();
        await loadData();
      } catch (e: any) {
        showAlert("Failed to delete: " + e.message);
      }
    });
  };

  const handlePauseInvestments = async (suggestions: PausableInvestment[]) => {
    if (suggestions.length === 0) return;
    showConfirm(
      `Pause ${suggestions.length} investment(s) to free up ${cs}${fmt(suggestions.reduce((s, i) => s + i.monthlyAmount, 0))}/month? You can resume them anytime from the Investments page.`,
      async () => {
        try {
          for (const s of suggestions) {
            await api.pauseInvestment(token, s.id);
          }
          invalidateDashboardCache();
          await loadData();
        } catch (e: any) {
          showAlert("Failed to pause investments: " + e.message);
        }
      }
    );
  };

  const handleUpdateSaved = async (bomb: any) => {
    const newSaved = prompt(`Update saved amount for "${bomb.name}"`, String(Math.round(bomb.savedAmount)));
    if (newSaved === null) return;
    const val = parseFloat(newSaved);
    if (isNaN(val)) { showAlert("Invalid amount"); return; }
    try {
      await api.updateFutureBomb(token, bomb.id, { saved_amount: val });
      invalidateDashboardCache();
      await loadData();
    } catch (e: any) {
      showAlert("Failed to update: " + e.message);
    }
  };

  // ===== Render helpers for strategy panels =====

  const renderShortfallPill = (remaining: number, covered: boolean) => {
    if (covered) {
      return (
        <div className="shortfall-pill covered">
          <FaCheckCircle size={12} /> Fully covered — bomb can be defused on time
        </div>
      );
    }
    return (
      <div className="shortfall-pill not-covered">
        <FaExclamationTriangle size={12} /> Still short {cs}{fmt(remaining)}/mo — consider extending due date or reducing target
      </div>
    );
  };

  const renderPauseFirstPanel = (bomb: any, defusal: ReturnType<typeof getDefusalData>, isOwn: boolean) => {
    const { path1, rsuSources } = defusal;
    return (
      <div className="strategy-content" key="pause">
        <div className="strategy-summary">
          <FaPause size={12} color="#f59e0b" />
          <span>First pauses non-priority investments, then sells RSU shares if still needed.</span>
        </div>

        {path1.pauseSuggestions.length > 0 && (
          <div className="strategy-steps">
            {path1.pauseSuggestions.map(s => (
              <div key={s.id} className="strategy-step pause-step">
                <span className="step-label"><FaPause size={10} /> {s.name}</span>
                <span className="step-value">{cs}{fmt(s.monthlyAmount)}/mo</span>
              </div>
            ))}
          </div>
        )}

        {path1.sellSuggestions.length > 0 && (
          <div className="strategy-steps">
            {path1.sellSuggestions.map(s => (
              <div key={s.rsuId} className="strategy-step sell-step">
                <span className="step-label"><FaChartLine size={10} /> Sell ~{s.shares} {s.ticker}/mo</span>
                <span className="step-value">≈ {cs}{fmt(s.value)}/mo</span>
              </div>
            ))}
          </div>
        )}

        {rsuSources.length === 0 && !path1.covered && path1.pauseSuggestions.length > 0 && (
          <div className="no-rsu-info">
            <FaInfoCircle size={12} /> No RSU stocks available. Add RSU income on the Income page to unlock sell strategies.
          </div>
        )}

        {renderShortfallPill(path1.remaining, path1.covered)}

        {isOwn && path1.pauseSuggestions.length > 0 && (
          <button
            className="strategy-action-btn pause-btn"
            onClick={() => handlePauseInvestments(path1.pauseSuggestions)}
          >
            <FaPause size={12} /> Pause {path1.pauseSuggestions.length} Investment(s) — Free {cs}{fmt(path1.pauseFreed)}/mo
          </button>
        )}
      </div>
    );
  };

  const renderSellFirstPanel = (bomb: any, defusal: ReturnType<typeof getDefusalData>, isOwn: boolean) => {
    const { path2, rsuSources } = defusal;

    if (rsuSources.length === 0) {
      return (
        <div className="strategy-content" key="sell">
          <div className="no-rsu-info" style={{ marginBottom: 12 }}>
            <FaInfoCircle size={12} /> No RSU income configured. Add RSU stocks on the Income page to use this strategy.
          </div>
          <div className="strategy-summary">
            <FaChartLine size={12} color="#8b5cf6" />
            <span>This path prioritises selling vested stock shares before pausing any investments.</span>
          </div>
        </div>
      );
    }

    return (
      <div className="strategy-content" key="sell">
        <div className="strategy-summary">
          <FaChartLine size={12} color="#8b5cf6" />
          <span>First sells RSU shares (at conservative price with tax deducted), then pauses investments if still needed.</span>
        </div>

        {path2.sellSuggestions.length > 0 && (
          <div className="strategy-steps">
            {path2.sellSuggestions.map(s => (
              <div key={s.rsuId} className="strategy-step sell-step">
                <span className="step-label"><FaChartLine size={10} /> Sell ~{s.shares} {s.ticker}/mo</span>
                <span className="step-value">≈ {cs}{fmt(s.value)}/mo</span>
              </div>
            ))}
          </div>
        )}

        {path2.pauseSuggestions.length > 0 && (
          <div className="strategy-steps">
            {path2.pauseSuggestions.map(s => (
              <div key={s.id} className="strategy-step pause-step">
                <span className="step-label"><FaPause size={10} /> {s.name}</span>
                <span className="step-value">{cs}{fmt(s.monthlyAmount)}/mo</span>
              </div>
            ))}
          </div>
        )}

        {renderShortfallPill(path2.remaining, path2.covered)}

        {isOwn && path2.pauseSuggestions.length > 0 && (
          <button
            className="strategy-action-btn pause-btn"
            onClick={() => handlePauseInvestments(path2.pauseSuggestions)}
          >
            <FaPause size={12} /> Pause {path2.pauseSuggestions.length} Investment(s) — Free {cs}{fmt(path2.pauseFreed)}/mo
          </button>
        )}
      </div>
    );
  };

  const renderCustomMixPanel = (bomb: any, defusal: ReturnType<typeof getDefusalData>, isOwn: boolean) => {
    const { shortfall, pausable, rsuSources } = defusal;
    const mixState = customMix[bomb.id] || { pausedIds: [], sharesToSell: {} };
    const mixResult = computeCustomMix(bomb.id, shortfall);

    return (
      <div className="strategy-content" key="mix">
        <div className="strategy-summary">
          <FaSlidersH size={12} color="#22d3ee" />
          <span>Customise exactly which investments to pause and how many shares to sell. Real-time feedback below.</span>
        </div>

        {/* Investments Section */}
        {pausable.length > 0 && (
          <div className="custom-mix-section">
            <h5><FaPause size={10} /> Investments to Pause</h5>
            {pausable.map(inv => (
              <div
                key={inv.id}
                className={`mix-investment-row ${mixState.pausedIds.includes(inv.id) ? "selected" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={mixState.pausedIds.includes(inv.id)}
                  onChange={() => toggleMixPause(bomb.id, inv.id)}
                  disabled={!isOwn}
                />
                <span className="mix-inv-name">{inv.name}</span>
                <span className="mix-inv-amount">{cs}{fmt(inv.monthlyAmount)}/mo</span>
              </div>
            ))}
          </div>
        )}

        {/* RSU Section */}
        {rsuSources.length > 0 && (
          <div className="custom-mix-section">
            <h5><FaChartLine size={10} /> RSU Shares to Sell Monthly</h5>
            {rsuSources.map(rsu => {
              const maxShares = Math.floor(rsu.monthlyNetShares);
              const currentShares = mixState.sharesToSell[rsu.id] || 0;
              const shareValue = currentShares * rsu.conservativePriceLocal;
              return (
                <div key={rsu.id}>
                  <div className="mix-shares-control">
                    <span className="shares-label">{rsu.ticker}</span>
                    <input
                      type="range"
                      min={0}
                      max={maxShares}
                      value={currentShares}
                      onChange={e => setMixShares(bomb.id, rsu.id, parseInt(e.target.value))}
                      disabled={!isOwn}
                    />
                    <span className="shares-value">{currentShares}/{maxShares}</span>
                  </div>
                  <div className="mix-shares-preview">
                    ≈ {cs}{fmt(shareValue)}/mo (conservative, after tax & {defusal.rsuSources.find(r => r.id === rsu.id) ? Math.round((incomes.find((i: any) => i.id === rsu.id)?.rsuExpectedDecline ?? 20)) : 20}% decline buffer)
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {pausable.length === 0 && rsuSources.length === 0 && (
          <div className="no-rsu-info">
            <FaInfoCircle size={12} /> No pausable investments or RSU stocks available. Add investments (non-priority) or RSU income to unlock this strategy.
          </div>
        )}

        {/* Real-time Feedback */}
        {(pausable.length > 0 || rsuSources.length > 0) && (
          <div className="mix-feedback">
            <div className="mix-feedback-row">
              <span className="fb-label">Monthly SIP Needed</span>
              <span className="fb-value">{cs}{fmt(defusal.sipAmount)}/mo</span>
            </div>
            <div className="mix-feedback-row">
              <span className="fb-label">Available from Budget</span>
              <span className="fb-value">{cs}{fmt(Math.max(0, availableFunds))}/mo</span>
            </div>
            <div className="mix-feedback-row">
              <span className="fb-label">Shortfall</span>
              <span className="fb-value warning">{cs}{fmt(shortfall)}/mo</span>
            </div>
            <div className="mix-feedback-divider" />
            <div className="mix-feedback-row">
              <span className="fb-label">Freed from Pausing</span>
              <span className="fb-value" style={{ color: "#f59e0b" }}>{cs}{fmt(mixResult.freedFromPause)}/mo</span>
            </div>
            <div className="mix-feedback-row">
              <span className="fb-label">Freed from Selling</span>
              <span className="fb-value" style={{ color: "#a78bfa" }}>{cs}{fmt(mixResult.freedFromSell)}/mo</span>
            </div>
            <div className="mix-feedback-divider" />
            <div className="mix-feedback-row">
              <span className="fb-label" style={{ fontWeight: 700 }}>Remaining Gap</span>
              <span className={`fb-value ${mixResult.covered ? "positive" : "negative"}`}>
                {mixResult.covered ? "Covered ✓" : `${cs}${fmt(mixResult.remaining)}/mo short`}
              </span>
            </div>
          </div>
        )}

        {isOwn && mixState.pausedIds.length > 0 && (
          <button
            className="strategy-action-btn mix-btn"
            style={{ marginTop: 10 }}
            onClick={() => {
              const toPause = getPausableInvestments().filter(inv => mixState.pausedIds.includes(inv.id));
              handlePauseInvestments(toPause);
            }}
          >
            <FaPause size={12} /> Apply — Pause {mixState.pausedIds.length} Investment(s)
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="future-bombs-page">
      <div className="page-header">
        <button className="back-button" onClick={() => navigate("/dashboard")}>← Back</button>
        <div style={{ display: "flex", alignItems: "center" }}>
          <h1>Future Bombs</h1>
          <PageInfoButton
            title="Future Bombs — Smart Defusal"
            description="Future Bombs are big-ticket expenses heading your way — vacations, home renovations, weddings, or large purchases. The Smart Defusal system calculates exactly how much you need to save monthly and offers three strategic paths to cover it."
            impact="Each bomb has a Defusal SIP — the monthly amount to save up 1 month before the due date. The system offers three paths: pause investments first, sell RSU shares first, or create your own custom mix — all using conservative (tax-adjusted, decline-buffered) calculations."
            howItWorks={[
              "Add a bomb with name, total amount, saved so far, and due date",
              "The app calculates monthly SIP needed to defuse it 1 month early",
              "Path 1 (Pause First): Pauses non-priority investments, then sells RSU shares if still short",
              "Path 2 (Sell First): Sells RSU shares at conservative prices, then pauses investments if needed",
              "Path 3 (Custom Mix): You choose exactly what to pause and how many shares to sell, with live feedback",
              "RSU calculations use net shares after tax and a decline buffer for safety",
              "Green = affordable, Yellow = needs action, Red = can't cover even with all strategies"
            ]}
          />
        </div>
        {!isSharedView && (
          <button className="add-button" onClick={openCreateForm}>
            + Add Future Bomb
          </button>
        )}
      </div>

      <SharedViewBanner />

      {loading ? <SkeletonLoader type="card" count={3} /> : bombs.length === 0 ? (
        <EmptyState
          icon={<FaBomb size={80} />}
          title="No Future Bombs"
          description="Track upcoming big expenses and let the Smart Defusal system help you prepare with three strategic paths. Add your first bomb to get started."
          actionLabel={isSharedView ? undefined : "Add Future Bomb"}
          onAction={isSharedView ? undefined : openCreateForm}
        />
      ) : (
        <div className="bombs-list">
          {bombs.map((bomb, index) => {
            const defusal = getDefusalData(bomb);
            const { severity, sipAmount, canAfford, shortfall } = defusal;
            const dueDate = bomb.dueDate ? new Date(bomb.dueDate) : null;
            const daysUntil = dueDate ? Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;
            const bombUserId = bomb.userId || bomb.user_id;
            const isOwn = !bombUserId || isOwnItem(bombUserId);
            const prepPct = Math.round((bomb.preparednessRatio || 0) * 100);
            const strategy = getStrategy(bomb.id);
            const hasRsu = defusal.rsuSources.length > 0;
            const hasPausable = defusal.pausable.length > 0;

            return (
              <motion.div
                key={bomb.id}
                className={`bomb-card ${severity} ${!isOwn ? "shared-item" : ""}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="bomb-header">
                  <h3>{bomb.name}</h3>
                  <div className="bomb-header-right">
                    {isSharedView && (
                      <span style={{ fontSize: 11, color: isOwn ? "#10b981" : "#8b5cf6", display: "flex", alignItems: "center", gap: 4 }}>
                        {isOwn ? <FaUserCircle size={12} /> : <FaLock size={12} />}
                        {getOwnerName(bombUserId)}
                      </span>
                    )}
                    <span className={`severity-badge ${severity}`}>
                      {severity === "critical" ? "Critical" : severity === "warn" ? "Needs Action" : "On Track"}
                    </span>
                  </div>
                </div>

                <div className="bomb-details">
                  <div className="detail-item">
                    <span className="label">Due Date</span>
                    <span className="value">
                      {dueDate ? dueDate.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" }) : "—"}{" "}
                      ({daysUntil > 0 ? `${daysUntil}d left` : "Overdue"})
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Total Amount</span>
                    <span className="value">{cs}{fmt(bomb.totalAmount || 0)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Saved So Far</span>
                    <span
                      className="value"
                      style={{ cursor: isOwn ? "pointer" : "default", color: "#10b981" }}
                      onClick={() => isOwn && handleUpdateSaved(bomb)}
                    >
                      {cs}{fmt(bomb.savedAmount || 0)} {isOwn && <FaEdit size={10} style={{ opacity: 0.5 }} />}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Months to Defuse</span>
                    <span className="value">{bomb.defusalMonths || "—"} mo</span>
                  </div>
                </div>

                {/* Preparedness Meter */}
                <div className="preparedness-meter">
                  <div className="meter-label">Preparedness</div>
                  <div className="meter-bar">
                    <motion.div
                      className="meter-fill"
                      style={{
                        backgroundColor: severity === "critical" ? "#ef4444" : severity === "warn" ? "#f59e0b" : "#10b981"
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${prepPct}%` }}
                      transition={{ duration: 1, delay: index * 0.1 }}
                    />
                  </div>
                  <div className="meter-value" style={{ color: severity === "critical" ? "#f87171" : severity === "warn" ? "#fbbf24" : "#34d399" }}>
                    {prepPct}%
                  </div>
                </div>

                {/* Smart Defusal Panel */}
                <div className="defusal-panel">
                  <div className="defusal-panel-header">
                    <FaLightbulb size={14} color="#f59e0b" />
                    <h4>Smart Defusal</h4>
                  </div>

                  <div className={`defusal-sip-amount ${canAfford ? "affordable" : (defusal.path1.covered || defusal.path2.covered) ? "needs-action" : "unaffordable"}`}>
                    {cs}{fmt(sipAmount)}/month
                  </div>

                  {canAfford ? (
                    <div className="defusal-ok-msg">
                      <FaCheckCircle size={14} />
                      You can afford this SIP from your available funds. Stay on track!
                    </div>
                  ) : (
                    <>
                      {/* Strategy Tabs - only show when there's a shortfall */}
                      {(hasPausable || hasRsu) && (
                        <div className="strategy-tabs">
                          <button
                            className={`strategy-tab ${strategy === "pause" ? "active tab-pause" : ""}`}
                            onClick={() => setStrategy(bomb.id, "pause")}
                          >
                            <FaPause size={9} /> Pause First
                          </button>
                          <button
                            className={`strategy-tab ${strategy === "sell" ? "active tab-sell" : ""}`}
                            onClick={() => setStrategy(bomb.id, "sell")}
                          >
                            <FaChartLine size={9} /> Sell First
                          </button>
                          <button
                            className={`strategy-tab ${strategy === "mix" ? "active tab-mix" : ""}`}
                            onClick={() => setStrategy(bomb.id, "mix")}
                          >
                            <FaSlidersH size={9} /> Custom Mix
                          </button>
                        </div>
                      )}

                      {/* Strategy Content */}
                      {strategy === "pause" && renderPauseFirstPanel(bomb, defusal, isOwn)}
                      {strategy === "sell" && renderSellFirstPanel(bomb, defusal, isOwn)}
                      {strategy === "mix" && renderCustomMixPanel(bomb, defusal, isOwn)}

                      {/* Fallback: no pausable investments and no RSU */}
                      {!hasPausable && !hasRsu && (
                        <div className="strategy-summary">
                          <FaExclamationTriangle size={12} color="#ef4444" />
                          <span>
                            No non-priority investments to pause and no RSU stocks to sell.
                            Consider extending the due date, increasing income, or reducing the target amount.
                            Mark investments as non-priority on the Investments page, or add RSU income on the Income page.
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Actions */}
                {isOwn && (
                  <div className="bomb-actions">
                    <button onClick={() => openEditForm(bomb)}>
                      <FaEdit size={12} /> Edit
                    </button>
                    <button className="delete-action" onClick={() => handleDelete(bomb)}>
                      <FaTrashAlt size={12} /> Delete
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      {formModal.isOpen && (
        <Modal
          isOpen={formModal.isOpen}
          onClose={() => setFormModal({ isOpen: false })}
          title={formModal.editId ? "Edit Future Bomb" : "Add Future Bomb"}
          size="sm"
          footer={
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => setFormModal({ isOpen: false })}
                style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "var(--text-primary)", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={handleFormSubmit}
                style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "var(--accent-cyan, #22d3ee)", color: "#041019", fontWeight: 700, cursor: "pointer" }}
              >
                {formModal.editId ? "Update" : "Create"}
              </button>
            </div>
          }
        >
          <div className="bomb-form">
            <div className="form-group">
              <label>Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Vacation, Wedding, Car Down Payment"
                autoFocus
              />
            </div>
            <div className="form-group">
              <label>Total Amount *</label>
              <input
                type="number"
                value={formData.totalAmount}
                onChange={e => setFormData({ ...formData, totalAmount: e.target.value })}
                placeholder="e.g. 500000"
                min="1"
                step="1"
              />
            </div>
            <div className="form-group">
              <label>Saved So Far</label>
              <input
                type="number"
                value={formData.savedAmount}
                onChange={e => setFormData({ ...formData, savedAmount: e.target.value })}
                placeholder="0"
                min="0"
                step="1"
              />
            </div>
            <div className="form-group">
              <label>Due Date *</label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
          </div>
        </Modal>
      )}

      <AppModalRenderer modal={modal} closeModal={closeModal} confirmAndClose={confirmAndClose} />
    </div>
  );
}
