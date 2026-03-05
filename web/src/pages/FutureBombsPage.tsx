import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FaUserCircle, FaLock, FaBomb, FaEdit, FaTrashAlt, FaPause,
  FaLightbulb, FaCheckCircle, FaExclamationTriangle, FaChartLine, FaSlidersH,
  FaInfoCircle, FaWallet
} from "react-icons/fa";
import { useEncryptedApiCalls } from "../hooks/useEncryptedApiCalls";
import { useSharedView } from "../hooks/useSharedView";
import { SharedViewBanner } from "../components/SharedViewBanner";
import { SkeletonLoader } from "../components/SkeletonLoader";
import { EmptyState } from "../components/EmptyState";
import { PageInfoButton } from "../components/PageInfoButton";
import { Modal } from "../components/Modal";
import { invalidateDashboardCache } from "../utils/cacheInvalidation";
import { feedbackPowerUp, feedbackOneUp, feedbackFireball, feedbackPipe, feedbackBump } from "../utils/haptics";
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

interface WithdrawableInvestment {
  id: string;
  name: string;
  accumulatedFunds: number;  // current wallet balance
  monthlyAmount: number;     // for context display
}

interface WithdrawSuggestion {
  id: string;
  name: string;
  amount: number;            // suggested withdrawal amount
  maxAmount: number;         // max available (accumulatedFunds)
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
  const [calculating, setCalculating] = useState(false);
  const [userCurrency, setUserCurrency] = useState("INR");
  const hasFetchedRef = useRef(false);
  const lastViewRef = useRef<string>("");

  // Per-bomb strategy tab state
  const [activeStrategies, setActiveStrategies] = useState<Record<string, StrategyTab>>({});
  // Custom mix state per bomb: { bombId: { pausedIds: [...], sharesToSell: { rsuId: n }, withdrawAmounts: { invId: amount } } }
  const [customMix, setCustomMix] = useState<Record<string, { pausedIds: string[]; sharesToSell: Record<string, number>; withdrawAmounts: Record<string, number> }>>({});

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

      // Phase 1 → Phase 2: data loaded, now show "calculating" state
      setLoading(false);
      const hasBombs = (data.futureBombs || []).length > 0;
      if (hasBombs) {
        setCalculating(true);
      }

      // Small delay to let React paint the "calculating" UI before doing heavy state updates
      await new Promise(r => setTimeout(r, hasBombs ? 400 : 0));

      setBombs(data.futureBombs || []);
      setInvestments(data.investments || []);
      setIncomes(data.incomes || []);
      setUserCurrency(data.preferences?.currency || "INR");

      // Calculate available funds
      const health = data.health || {};
      setAvailableFunds(health.remaining || 0);

      // Phase 2 → Phase 3: calculations ready
      setCalculating(false);
    } catch (e) {
      console.error("Failed to load data:", e);
      setLoading(false);
      setCalculating(false);
    }
  };

  // ===== RSU / Investment helpers =====

  const getPausableInvestments = useCallback((): PausableInvestment[] => {
    return investments
      .filter((inv: any) => inv.status === "active" && !inv.isPriority)
      .sort((a: any, b: any) => (b.monthlyAmount || 0) - (a.monthlyAmount || 0))
      .map((inv: any) => ({ id: inv.id, name: inv.name, monthlyAmount: inv.monthlyAmount || 0 }));
  }, [investments]);

  const getWithdrawableInvestments = useCallback((): WithdrawableInvestment[] => {
    return investments
      .filter((inv: any) => inv.status === "active" && !inv.isPriority && (inv.accumulatedFunds || inv.accumulated_funds || 0) > 0)
      .sort((a: any, b: any) => (b.accumulatedFunds || b.accumulated_funds || 0) - (a.accumulatedFunds || a.accumulated_funds || 0))
      .map((inv: any) => ({
        id: inv.id,
        name: inv.name,
        accumulatedFunds: inv.accumulatedFunds || inv.accumulated_funds || 0,
        monthlyAmount: inv.monthlyAmount || inv.monthly_amount || 0
      }));
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

  // ===== Withdrawal helpers =====

  // Auto-suggest withdrawals greedily (highest wallet first) up to needed amount
  const autoSuggestWithdrawals = (bombRemaining: number, withdrawable: WithdrawableInvestment[]): WithdrawSuggestion[] => {
    let needed = bombRemaining;
    const suggestions: WithdrawSuggestion[] = [];
    for (const inv of withdrawable) {
      if (needed <= 0) break;
      const amount = Math.min(inv.accumulatedFunds, needed);
      suggestions.push({ id: inv.id, name: inv.name, amount, maxAmount: inv.accumulatedFunds });
      needed -= amount;
    }
    return suggestions;
  };

  // ===== Defusal computation for a bomb =====

  const getDefusalData = useCallback((bomb: any) => {
    const originalSipAmount = bomb.monthlyEquivalent || 0;
    const bombRemaining = bomb.remaining || 0;
    const monthsLeft = bomb.defusalMonths || bomb.monthsLeft || 1;

    const pausable = getPausableInvestments();
    const withdrawable = getWithdrawableInvestments();
    const rsuSources = getRsuSources();

    // Shortfall based on original SIP (no auto-withdrawal deduction)
    const originalShortfall = Math.max(0, originalSipAmount - Math.max(0, availableFunds));
    const canAfford = originalShortfall === 0;

    // Path 1: Pause investments first, then sell RSU (no auto-withdrawal)
    const path1 = computePauseFirst(originalShortfall, pausable, rsuSources);
    // Path 2: Sell RSU first, then pause investments (no auto-withdrawal)
    const path2 = computeSellFirst(originalShortfall, pausable, rsuSources);

    const canResolve = canAfford || path1.covered || path2.covered;
    const severity: "ok" | "warn" | "critical" = canAfford ? "ok" : canResolve ? "warn" : "critical";

    return {
      sipAmount: originalSipAmount,
      shortfall: originalShortfall,
      canAfford,
      path1,
      path2,
      severity,
      pausable,
      withdrawable,
      rsuSources,
      bombRemaining,
      monthsLeft
    };
  }, [availableFunds, getPausableInvestments, getWithdrawableInvestments, getRsuSources]);

  // Path 1: Pause investments first, then sell RSU shares
  const computePauseFirst = (
    shortfall: number,
    pausable: PausableInvestment[],
    rsuSources: RsuSource[]
  ) => {
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

    return {
      pauseSuggestions,
      sellSuggestions,
      pauseFreed,
      sellFreed,
      remaining: Math.max(0, remaining),
      covered
    };
  };

  // Path 2: Sell RSU shares first, then pause investments
  const computeSellFirst = (
    shortfall: number,
    pausable: PausableInvestment[],
    rsuSources: RsuSource[]
  ) => {
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

    return {
      sellSuggestions,
      pauseSuggestions,
      sellFreed,
      pauseFreed,
      remaining: Math.max(0, remaining),
      covered
    };
  };

  // Custom mix calculation (includes withdrawal amounts)
  const computeCustomMix = (bombId: string, bomb: any) => {
    const mixState = customMix[bombId] || { pausedIds: [], sharesToSell: {}, withdrawAmounts: {} };
    const pausable = getPausableInvestments();
    const rsuSources = getRsuSources();
    const bombRemaining = bomb.remaining || 0;
    const monthsLeft = bomb.defusalMonths || bomb.monthsLeft || 1;

    // Lump-sum withdrawal reduces the bomb balance first
    let totalWithdraw = 0;
    for (const [, amount] of Object.entries(mixState.withdrawAmounts)) {
      totalWithdraw += (amount as number) || 0;
    }
    const adjustedRemaining = Math.max(0, bombRemaining - totalWithdraw);
    const adjustedSIP = adjustedRemaining > 0 ? Math.ceil(adjustedRemaining / monthsLeft) : 0;
    const adjustedShortfall = Math.max(0, adjustedSIP - Math.max(0, availableFunds));

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

    const totalMonthlyFreed = freedFromPause + freedFromSell;
    const remaining = Math.max(0, adjustedShortfall - totalMonthlyFreed);
    const covered = remaining <= 0;

    return {
      totalWithdraw,
      adjustedRemaining,
      adjustedSIP,
      adjustedShortfall,
      freedFromPause,
      freedFromSell,
      totalMonthlyFreed,
      remaining,
      covered
    };
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
      setCustomMix(prev => ({ ...prev, [bombId]: { pausedIds: [], sharesToSell: {}, withdrawAmounts: {} } }));
    }
  };

  const toggleMixPause = (bombId: string, invId: string) => {
    setCustomMix(prev => {
      const current = prev[bombId] || { pausedIds: [], sharesToSell: {}, withdrawAmounts: {} };
      const pausedIds = current.pausedIds.includes(invId)
        ? current.pausedIds.filter(id => id !== invId)
        : [...current.pausedIds, invId];
      return { ...prev, [bombId]: { ...current, pausedIds } };
    });
  };

  const setMixShares = (bombId: string, rsuId: string, shares: number) => {
    setCustomMix(prev => {
      const current = prev[bombId] || { pausedIds: [], sharesToSell: {}, withdrawAmounts: {} };
      return { ...prev, [bombId]: { ...current, sharesToSell: { ...current.sharesToSell, [rsuId]: shares } } };
    });
  };

  const setMixWithdraw = (bombId: string, invId: string, amount: number) => {
    setCustomMix(prev => {
      const current = prev[bombId] || { pausedIds: [], sharesToSell: {}, withdrawAmounts: {} };
      return { ...prev, [bombId]: { ...current, withdrawAmounts: { ...current.withdrawAmounts, [invId]: amount } } };
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

  // Helper to compute derived bomb fields (same as backend)
  const enrichBomb = (raw: any) => {
    const totalAmount = raw.total_amount ?? raw.totalAmount ?? 0;
    const savedAmount = raw.saved_amount ?? raw.savedAmount ?? 0;
    const dueDate = raw.due_date ?? raw.dueDate ?? "";
    const remaining = totalAmount - savedAmount;
    const monthsLeft = dueDate
      ? Math.max(1, Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30.44)) - 1)
      : 1;
    const monthlySIP = remaining > 0 ? Math.ceil(remaining / monthsLeft) : 0;
    const progress = totalAmount > 0 ? Math.min(100, Math.round((savedAmount / totalAmount) * 100)) : 0;
    return {
      ...raw,
      id: raw.id || `temp-${Date.now()}`,
      name: raw.name,
      totalAmount,
      savedAmount,
      dueDate,
      remaining,
      monthsLeft,
      monthlySIP,
      monthlyEquivalent: monthlySIP, // getDefusalData reads this field
      defusalMonths: monthsLeft,
      preparednessRatio: totalAmount > 0 ? savedAmount / totalAmount : 0,
      progress,
    };
  };

  const handleFormSubmit = async () => {
    if (!formData.name.trim()) { showAlert("Name is required."); return; }
    if (!formData.totalAmount || parseFloat(formData.totalAmount) <= 0) { showAlert("Total amount must be a positive number."); return; }
    if (!formData.dueDate) { showAlert("Due date is required."); return; }
    const today = new Date(); today.setHours(0, 0, 0, 0);
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

      setFormModal({ isOpen: false });

      if (formModal.editId) {
        // Optimistic update: patch local state immediately
        setBombs(prev => prev.map(b => b.id === formModal.editId ? enrichBomb({ ...b, ...payload }) : b));
        await api.updateFutureBomb(token, formModal.editId, payload);
      } else {
        // Optimistic create: add to local state immediately
        const optimistic = enrichBomb({ ...payload, id: `temp-${Date.now()}` });
        setBombs(prev => [...prev, optimistic]);
        const res = await api.createFutureBomb(token, payload);
        // Replace temp entry with the real server-returned record
        if (res?.data) {
          setBombs(prev => prev.map(b => b.id === optimistic.id ? enrichBomb(res.data) : b));
        }
      }

      invalidateDashboardCache();
      feedbackPowerUp();
    } catch (e: any) {
      feedbackBump();
      showAlert("Failed to save: " + e.message);
      // Revert on failure — reload from server
      loadData();
    }
  };

  const handleDelete = (bomb: any) => {
    showConfirm(`Delete "${bomb.name}"? This cannot be undone.`, async () => {
      const prevBombs = bombs;
      setBombs(prev => prev.filter(b => b.id !== bomb.id)); // optimistic removal
      try {
        await api.deleteFutureBomb(token, bomb.id);
        invalidateDashboardCache();
        feedbackFireball();
      } catch (e: any) {
        feedbackBump();
        showAlert("Failed to delete: " + e.message);
        setBombs(prevBombs); // rollback
      }
    });
  };

  const handlePauseInvestments = async (suggestions: PausableInvestment[]) => {
    if (suggestions.length === 0) return;
    showConfirm(
      `Pause ${suggestions.length} investment(s) to free up ${cs}${fmt(suggestions.reduce((s, i) => s + i.monthlyAmount, 0))}/month? You can resume them anytime from the Investments page.`,
      async () => {
        try {
          const pausedIds = new Set(suggestions.map(s => s.id));
          // Optimistic: mark investments as paused locally
          setInvestments(prev => prev.map(inv =>
            pausedIds.has(inv.id) ? { ...inv, status: "paused" } : inv
          ));
          for (const s of suggestions) {
            await api.pauseInvestment(token, s.id);
          }
          invalidateDashboardCache();
          feedbackPipe();
        } catch (e: any) {
          feedbackBump();
          showAlert("Failed to pause investments: " + e.message);
          loadData(); // background reload
        }
      }
    );
  };

  const handleUpdateSaved = async (bomb: any) => {
    const newSaved = prompt(`Update saved amount for "${bomb.name}"`, String(Math.round(bomb.savedAmount)));
    if (newSaved === null) return;
    const val = parseFloat(newSaved);
    if (isNaN(val)) { showAlert("Invalid amount"); return; }
    // Optimistic update
    setBombs(prev => prev.map(b => b.id === bomb.id ? enrichBomb({ ...b, saved_amount: val, savedAmount: val }) : b));
    try {
      await api.updateFutureBomb(token, bomb.id, { saved_amount: val });
      invalidateDashboardCache();
      loadData(); // background refresh
      feedbackPowerUp();
    } catch (e: any) {
      feedbackBump();
      showAlert("Failed to update: " + e.message);
      loadData(); // rollback by reloading
    }
  };

  // ===== Withdraw handler for bomb defusal =====

  const handleWithdrawForBomb = async (bomb: any, withdrawals: WithdrawSuggestion[]) => {
    const totalWithdraw = withdrawals.reduce((s, w) => s + w.amount, 0);
    if (totalWithdraw <= 0) return;

    showConfirm(
      `Withdraw ${cs}${fmt(totalWithdraw)} from ${withdrawals.length} investment wallet(s) and apply it to "${bomb.name}"? This reduces the bomb balance and lowers your monthly SIP.`,
      async () => {
        try {
          // Optimistic UI: update investments and bomb locally
          const withdrawMap = new Map(withdrawals.map(w => [w.id, w.amount]));
          setInvestments(prev => prev.map(inv => {
            const withdrawAmt = withdrawMap.get(inv.id);
            if (withdrawAmt) {
              const currentFunds = inv.accumulatedFunds || inv.accumulated_funds || 0;
              return { ...inv, accumulatedFunds: Math.max(0, currentFunds - withdrawAmt), accumulated_funds: Math.max(0, currentFunds - withdrawAmt) };
            }
            return inv;
          }));
          const newSaved = (bomb.savedAmount || 0) + totalWithdraw;
          setBombs(prev => prev.map(b => b.id === bomb.id ? enrichBomb({ ...b, saved_amount: newSaved, savedAmount: newSaved }) : b));

          // API calls: update each investment's accumulated funds, then update bomb's saved amount
          for (const w of withdrawals) {
            const inv = investments.find(i => i.id === w.id);
            const currentFunds = inv?.accumulatedFunds || inv?.accumulated_funds || 0;
            await api.updateInvestment(token, w.id, { accumulatedFunds: Math.max(0, currentFunds - w.amount) });
          }
          await api.updateFutureBomb(token, bomb.id, { saved_amount: newSaved });

          invalidateDashboardCache();
          loadData(); // background refresh for consistency
          feedbackOneUp();
        } catch (e: any) {
          feedbackBump();
          showAlert("Failed to apply withdrawal: " + e.message);
          loadData(); // rollback by reloading
        }
      }
    );
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

  const renderWithdrawalSection = (
    withdrawSuggestions: WithdrawSuggestion[],
    totalWithdrawSuggested: number,
    defusal: ReturnType<typeof getDefusalData>,
    bomb: any,
    isOwn: boolean
  ) => {
    if (withdrawSuggestions.length === 0 || totalWithdrawSuggested <= 0) return null;
    // Compute adjusted SIP locally after withdrawal
    const adjustedRemaining = Math.max(0, defusal.bombRemaining - totalWithdrawSuggested);
    const adjustedSIP = adjustedRemaining > 0 ? Math.ceil(adjustedRemaining / defusal.monthsLeft) : 0;
    return (
      <div className="withdrawal-section">
        <div className="withdrawal-header">
          <FaWallet size={11} color="#10b981" />
          <span className="withdrawal-header-label">Withdraw from Investment Wallets</span>
          <span className="withdrawal-header-note">(one-time, reduces bomb balance)</span>
        </div>
        <div className="strategy-steps">
          {withdrawSuggestions.map(w => (
            <div key={w.id} className="strategy-step withdraw-step">
              <span className="step-label"><FaWallet size={10} /> {w.name}</span>
              <span className="step-value">{cs}{fmt(w.amount)} of {cs}{fmt(w.maxAmount)}</span>
            </div>
          ))}
        </div>
        <div className="withdrawal-impact">
          <FaInfoCircle size={10} />
          <span>
            Withdrawing {cs}{fmt(totalWithdrawSuggested)} reduces monthly SIP from{" "}
            <strong>{cs}{fmt(defusal.sipAmount)}</strong> to{" "}
            <strong>{cs}{fmt(adjustedSIP)}</strong>/mo
          </span>
        </div>
        {isOwn && (
          <button
            className="strategy-action-btn withdraw-btn"
            onClick={() => handleWithdrawForBomb(bomb, withdrawSuggestions)}
          >
            <FaWallet size={12} /> Withdraw {cs}{fmt(totalWithdrawSuggested)} and Apply to Bomb
          </button>
        )}
      </div>
    );
  };


  const renderPauseFirstPanel = (bomb: any, defusal: ReturnType<typeof getDefusalData>, isOwn: boolean) => {
    const { path1, rsuSources, withdrawable } = defusal;
    return (
      <div className="strategy-content" key="pause">
        <div className="strategy-summary">
          <FaPause size={12} color="#f59e0b" />
          <span>Pauses non-priority investments to free up monthly budget, then sells RSU shares if still needed.</span>
        </div>

        {/* Hint about Custom Mix for wallet withdrawals */}
        {withdrawable.length > 0 && (
          <div className="withdrawal-hint">
            <FaWallet size={10} />
            <span>Have investment wallet funds? Use the <strong>Custom Mix</strong> tab to optionally withdraw and reduce the bomb balance.</span>
          </div>
        )}

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
    const { path2, rsuSources, withdrawable } = defusal;

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
          {withdrawable.length > 0 && (
            <div className="withdrawal-hint">
              <FaWallet size={10} />
              <span>Have investment wallet funds? Use the <strong>Custom Mix</strong> tab to optionally withdraw and reduce the bomb balance.</span>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="strategy-content" key="sell">
        <div className="strategy-summary">
          <FaChartLine size={12} color="#8b5cf6" />
          <span>Sells RSU shares first (conservative price, tax-adjusted), then pauses non-priority investments if still needed.</span>
        </div>

        {/* Hint about Custom Mix for wallet withdrawals */}
        {withdrawable.length > 0 && (
          <div className="withdrawal-hint">
            <FaWallet size={10} />
            <span>Have investment wallet funds? Use the <strong>Custom Mix</strong> tab to optionally withdraw and reduce the bomb balance.</span>
          </div>
        )}

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
    const { pausable, withdrawable, rsuSources } = defusal;
    const mixState = customMix[bomb.id] || { pausedIds: [], sharesToSell: {}, withdrawAmounts: {} };
    const mixResult = computeCustomMix(bomb.id, bomb);

    // Build withdrawal suggestions from custom mix amounts
    const customWithdrawals: WithdrawSuggestion[] = withdrawable
      .filter(w => (mixState.withdrawAmounts[w.id] || 0) > 0)
      .map(w => ({ id: w.id, name: w.name, amount: mixState.withdrawAmounts[w.id] || 0, maxAmount: w.accumulatedFunds }));
    const totalCustomWithdraw = customWithdrawals.reduce((s, w) => s + w.amount, 0);

    const hasAnySources = pausable.length > 0 || rsuSources.length > 0 || withdrawable.length > 0;

    return (
      <div className="strategy-content" key="mix">
        <div className="strategy-summary">
          <FaSlidersH size={12} color="#22d3ee" />
          <span>Customise how much to withdraw from wallets, which investments to pause, and how many shares to sell. Real-time feedback below.</span>
        </div>

        {/* Withdrawal Section */}
        {withdrawable.length > 0 && (
          <div className="custom-mix-section">
            <h5><FaWallet size={10} /> Withdraw from Investment Wallets <span className="mix-section-tag lump">(one-time)</span></h5>
            {withdrawable.map(inv => {
              const currentAmount = mixState.withdrawAmounts[inv.id] || 0;
              return (
                <div key={inv.id} className="mix-withdraw-row">
                  <div className="mix-withdraw-control">
                    <span className="mix-withdraw-name">{inv.name}</span>
                    <span className="mix-withdraw-balance">Balance: {cs}{fmt(inv.accumulatedFunds)}</span>
                  </div>
                  <div className="mix-withdraw-slider">
                    <input
                      type="range"
                      min={0}
                      max={Math.round(inv.accumulatedFunds)}
                      step={Math.max(1, Math.round(inv.accumulatedFunds / 100))}
                      value={currentAmount}
                      onChange={e => setMixWithdraw(bomb.id, inv.id, parseInt(e.target.value))}
                      disabled={!isOwn}
                    />
                    <span className="mix-withdraw-value">{cs}{fmt(currentAmount)}</span>
                  </div>
                </div>
              );
            })}
            {totalCustomWithdraw > 0 && (
              <div className="withdrawal-impact compact">
                <FaInfoCircle size={10} />
                <span>
                  Withdrawing {cs}{fmt(totalCustomWithdraw)} reduces monthly SIP from{" "}
                  <strong>{cs}{fmt(defusal.sipAmount)}</strong> to{" "}
                  <strong>{cs}{fmt(mixResult.adjustedSIP)}</strong>/mo
                </span>
              </div>
            )}
          </div>
        )}

        {/* Investments Pause Section */}
        {pausable.length > 0 && (
          <div className="custom-mix-section">
            <h5><FaPause size={10} /> Investments to Pause <span className="mix-section-tag monthly">(monthly)</span></h5>
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
            <h5><FaChartLine size={10} /> RSU Shares to Sell <span className="mix-section-tag monthly">(monthly)</span></h5>
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

        {!hasAnySources && (
          <div className="no-rsu-info">
            <FaInfoCircle size={12} /> No investment wallets, pausable investments, or RSU stocks available. Add investments or RSU income to unlock this strategy.
          </div>
        )}

        {/* Real-time Feedback */}
        {hasAnySources && (
          <div className="mix-feedback">
            {totalCustomWithdraw > 0 && (
              <>
                <div className="mix-feedback-row">
                  <span className="fb-label">Withdrawal (lump-sum)</span>
                  <span className="fb-value" style={{ color: "#10b981" }}>{cs}{fmt(totalCustomWithdraw)}</span>
                </div>
                <div className="mix-feedback-row">
                  <span className="fb-label">Adjusted Monthly SIP</span>
                  <span className="fb-value">{cs}{fmt(mixResult.adjustedSIP)}/mo</span>
                </div>
              </>
            )}
            {totalCustomWithdraw === 0 && (
              <div className="mix-feedback-row">
                <span className="fb-label">Monthly SIP Needed</span>
                <span className="fb-value">{cs}{fmt(defusal.sipAmount)}/mo</span>
              </div>
            )}
            <div className="mix-feedback-row">
              <span className="fb-label">Available from Budget</span>
              <span className="fb-value">{cs}{fmt(Math.max(0, availableFunds))}/mo</span>
            </div>
            <div className="mix-feedback-row">
              <span className="fb-label">Monthly Shortfall</span>
              <span className="fb-value warning">{cs}{fmt(mixResult.adjustedShortfall)}/mo</span>
            </div>
            <div className="mix-feedback-divider" />
            {mixResult.freedFromPause > 0 && (
              <div className="mix-feedback-row">
                <span className="fb-label">Freed from Pausing</span>
                <span className="fb-value" style={{ color: "#f59e0b" }}>{cs}{fmt(mixResult.freedFromPause)}/mo</span>
              </div>
            )}
            {mixResult.freedFromSell > 0 && (
              <div className="mix-feedback-row">
                <span className="fb-label">Freed from Selling</span>
                <span className="fb-value" style={{ color: "#a78bfa" }}>{cs}{fmt(mixResult.freedFromSell)}/mo</span>
              </div>
            )}
            <div className="mix-feedback-divider" />
            <div className="mix-feedback-row">
              <span className="fb-label" style={{ fontWeight: 700 }}>Remaining Gap</span>
              <span className={`fb-value ${mixResult.covered ? "positive" : "negative"}`}>
                {mixResult.covered ? "Covered ✓" : `${cs}${fmt(mixResult.remaining)}/mo short`}
              </span>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="mix-action-buttons">
          {isOwn && totalCustomWithdraw > 0 && (
            <button
              className="strategy-action-btn withdraw-btn"
              onClick={() => handleWithdrawForBomb(bomb, customWithdrawals)}
            >
              <FaWallet size={12} /> Withdraw {cs}{fmt(totalCustomWithdraw)} from Wallets
            </button>
          )}
          {isOwn && mixState.pausedIds.length > 0 && (
            <button
              className="strategy-action-btn mix-btn"
              onClick={() => {
                const toPause = getPausableInvestments().filter(inv => mixState.pausedIds.includes(inv.id));
                handlePauseInvestments(toPause);
              }}
            >
              <FaPause size={12} /> Pause {mixState.pausedIds.length} Investment(s)
            </button>
          )}
        </div>
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
            impact="Each bomb has a Defusal SIP — the monthly amount to save up 1 month before the due date. The system offers three paths: pause investments first, sell RSU shares first, or create your own custom mix — all using conservative (tax-adjusted, decline-buffered) calculations. You can also withdraw accumulated funds from non-critical investments to directly reduce the bomb balance."
            howItWorks={[
              "Add a bomb with name, total amount, saved so far, and due date",
              "The app calculates monthly SIP needed to defuse it 1 month early",
              "Wallet Withdrawal: Withdraw accumulated funds from non-critical investments to reduce the bomb balance (lump-sum, directly lowers monthly SIP)",
              "Path 1 (Pause First): Pauses non-priority investments, then sells RSU shares if still short",
              "Path 2 (Sell First): Sells RSU shares at conservative prices, then pauses investments if needed",
              "Path 3 (Custom Mix): You choose exactly how much to withdraw, what to pause, and how many shares to sell, with live feedback",
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

      {loading ? <SkeletonLoader type="card" count={3} /> : calculating ? (
        <motion.div
          className="calculating-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="calculating-content">
            <motion.div
              className="calculating-icon"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            >
              <FaBomb size={36} />
            </motion.div>
            <h3>Analyzing your finances...</h3>
            <p>Computing optimal defusal strategies for your bombs</p>
            <div className="calculating-dots">
              <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0 }} />
              <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.2 }} />
              <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.4 }} />
            </div>
          </div>
        </motion.div>
      ) : bombs.length === 0 ? (
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
            const hasWithdrawable = defusal.withdrawable.length > 0;

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
                      {(hasPausable || hasRsu || hasWithdrawable) && (
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

                      {/* Fallback: no withdrawable, no pausable investments and no RSU */}
                      {!hasPausable && !hasRsu && !hasWithdrawable && (
                        <div className="strategy-summary">
                          <FaExclamationTriangle size={12} color="#ef4444" />
                          <span>
                            No investment wallets to withdraw from, no non-priority investments to pause, and no RSU stocks to sell.
                            Consider extending the due date, increasing income, or reducing the target amount.
                            Fund investment wallets, mark investments as non-priority on the Investments page, or add RSU income on the Income page.
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
