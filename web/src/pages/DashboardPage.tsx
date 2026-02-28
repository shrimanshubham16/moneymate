import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaWallet, FaChartLine, FaChartBar, FaUniversity, FaCreditCard,
  FaBomb, FaClipboardList, FaClock, FaCalendar, FaBell, FaMoneyBillWave,
  FaExchangeAlt, FaHandHoldingUsd, FaPlus
} from "react-icons/fa";
import { HiChatBubbleLeftRight } from "react-icons/hi2";
import { MdAccountBalanceWallet, MdSavings, MdTrendingUp } from "react-icons/md";
import { useEncryptedApiCalls } from "../hooks/useEncryptedApiCalls";
import { DashboardWidget } from "../components/DashboardWidget";
import { HealthIndicator } from "../components/HealthIndicator";
import { MatrixLoader } from "../components/MatrixLoader";
import { SplashScreen } from "../components/SplashScreen";
import { EmptyState } from "../components/EmptyState";
import { TrendIndicator } from "../components/TrendIndicator";
import { StatusBadge } from "../components/StatusBadge";
import { IntroModal } from "../components/IntroModal";
import { useIntroModal } from "../hooks/useIntroModal";
import { ClientCache } from "../utils/cache";
import { useAppModal } from "../hooks/useAppModal";
import { AppModalRenderer } from "../components/AppModalRenderer";
import { subscribePresenceCount } from "../lib/chatClient";
import "./DashboardPage.css";

interface DashboardPageProps {
  token: string;
}

export function DashboardPage({ token }: DashboardPageProps) {
  const navigate = useNavigate();
  const api = useEncryptedApiCalls();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0); // Track loading progress
  const [isStale, setIsStale] = useState(false); // Track if showing stale data
  const [creditCards, setCreditCards] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [sharingMembers, setSharingMembers] = useState<any>({ members: [] });
  // Persist selectedView in localStorage so it survives navigation
  const [selectedView, setSelectedView] = useState<string>(() => {
    const saved = localStorage.getItem('finflow_selected_view');
    return saved || 'me';
  });
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddPlanId, setQuickAddPlanId] = useState<string>("");
  const [quickAddAmount, setQuickAddAmount] = useState<string>("");
  const [quickAddMode, setQuickAddMode] = useState<"UPI" | "Cash" | "ExtraCash" | "CreditCard">("UPI");
  const [quickAddJustification, setQuickAddJustification] = useState("");
  const [quickAddSubcategory, setQuickAddSubcategory] = useState("");
  const [quickAddCardId, setQuickAddCardId] = useState<string>("");
  const [funFact, setFunFact] = useState<string>("");
  const [userSubcategories, setUserSubcategories] = useState<string[]>([]);
  const [newQuickSub, setNewQuickSub] = useState<string>("");
  const [showQuickNewSub, setShowQuickNewSub] = useState(false);
  const [loungeOnline, setLoungeOnline] = useState(0);
  const { showIntro, closeIntro } = useIntroModal("dashboard");
  const { modal, showAlert, showConfirm, closeModal, confirmAndClose } = useAppModal();
  const keepAliveIntervalRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const hasFetchedRef = useRef(false); // Prevent double fetch in React Strict Mode
  const lastViewRef = useRef<string>(""); // Track view changes to allow refetch
  const lastAggPushRef = useRef<number>(0); // Debounce aggregate pushes
  const rsuRefreshDoneRef = useRef(false); // Track RSU price refresh

  // Persist selectedView when it changes and reload data
  useEffect(() => {
    localStorage.setItem('finflow_selected_view', selectedView);
    // Only reload data if we've already fetched once (view changed after initial load)
    if (hasFetchedRef.current && lastViewRef.current !== selectedView) {
      lastViewRef.current = selectedView;
      loadData(false, selectedView);
    }
  }, [selectedView]);

  // Calculate CORRECT health score on frontend (backend doesn't respect 'paid' status properly)
  // This MUST be called unconditionally (before any early returns) to follow React hooks rules
  const correctHealth = useMemo(() => {
    if (!data) return { remaining: 0, category: 'ok' };
    
    // Get current user ID from token to filter own items
    let currentUserId: string | null = null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      // Token may use 'userId', 'user_id', or 'sub' depending on how it was created
      currentUserId = payload.userId || payload.user_id || payload.sub;
    } catch (e) { /* ignore */ }
    
    // Determine if we need to filter by user
    // - "me" or "merged" views: filter by currentUserId to prevent double-counting with aggregates
    // - Specific user view: Use that user's aggregates (can't decrypt their individual items due to E2E)
    const isSpecificUserView = selectedView !== 'me' && selectedView !== 'merged';
    const filterByUser = (items: any[]) => {
      if (isSpecificUserView) {
        // For specific user view, we'll use aggregates instead (can't decrypt their items)
        return [];
      }
      // Filter to current user's items only (for "me" or "merged" views) — backend returns userId
      return items.filter((item: any) => item.userId === currentUserId);
    };
    
    // Filter items based on view type (prevents double-counting with aggregates in merged view)
    const ownIncomes = filterByUser(data.incomes || []);
    const ownFixedExpenses = filterByUser(data.fixedExpenses || []);
    const ownInvestments = filterByUser(data.investments || []);
    const ownVariablePlans = filterByUser(data.variablePlans || []);
    
    // Get shared users' aggregates (pre-computed totals from user_aggregates table)
    // This allows combined health calculation even with E2E encryption!
    const sharedAggregates = data.sharedUserAggregates || [];
    
    // For specific user view, find THAT user's aggregate from the list (backend returns camelCase)
    const specificUserAggregate = isSpecificUserView 
      ? sharedAggregates.find((agg: any) => agg.userId === selectedView) 
      : null;
    
    // Calculate shared totals - for specific user view, use only their aggregate (camelCase from API)
    const sharedIncomeTotal = isSpecificUserView 
      ? (parseFloat(specificUserAggregate?.totalIncomeMonthly) || 0)
      : sharedAggregates.reduce((sum: number, agg: any) => sum + (parseFloat(agg.totalIncomeMonthly) || 0), 0);
    const sharedFixedTotal = isSpecificUserView
      ? (parseFloat(specificUserAggregate?.totalFixedMonthly) || 0)
      : sharedAggregates.reduce((sum: number, agg: any) => sum + (parseFloat(agg.totalFixedMonthly) || 0), 0);
    const sharedInvestmentsTotal = isSpecificUserView
      ? (parseFloat(specificUserAggregate?.totalInvestmentsMonthly) || 0)
      : sharedAggregates.reduce((sum: number, agg: any) => sum + (parseFloat(agg.totalInvestmentsMonthly) || 0), 0);
    const sharedVariablePlanned = isSpecificUserView
      ? (parseFloat(specificUserAggregate?.totalVariablePlanned) || 0)
      : sharedAggregates.reduce((sum: number, agg: any) => sum + (parseFloat(agg.totalVariablePlanned) || 0), 0);
    const sharedVariableActual = isSpecificUserView
      ? (parseFloat(specificUserAggregate?.totalVariableActual) || 0)
      : sharedAggregates.reduce((sum: number, agg: any) => sum + (parseFloat(agg.totalVariableActual) || 0), 0);
    const sharedCreditCardDues = isSpecificUserView
      ? (parseFloat(specificUserAggregate?.totalCreditCardDues) || 0)
      : sharedAggregates.reduce((sum: number, agg: any) => sum + (parseFloat(agg.totalCreditCardDues) || 0), 0);
    
    
    // Calculate credit card dues (ALL outstanding balances — matches /health and export; backend returns camelCase)
    const ownCcDues = (creditCards || []).reduce((sum: number, c: any) => {
      const billAmount = parseFloat(c.billAmount ?? 0);
      const paidAmount = parseFloat(c.paidAmount ?? 0);
      const remaining = Math.max(0, billAmount - paidAmount);
      return sum + remaining;
    }, 0);
    const ccDues = ownCcDues + sharedCreditCardDues;
    
    // Calculate total income (own + shared) - use filtered ownIncomes
    // Respect includeInHealth flag: exclude incomes where includeInHealth === false
    const ownIncome = ownIncomes
      .filter((inc: any) => inc.includeInHealth !== false)
      .reduce((sum: number, inc: any) => {
        const amount = parseFloat(inc.amount) || 0;
        const monthly = inc.frequency === 'monthly' ? amount :
          inc.frequency === 'quarterly' ? amount / 3 : amount / 12;
        return sum + monthly;
      }, 0);
    const totalIncome = ownIncome + sharedIncomeTotal;
    
    // Calculate ALL fixed expenses (commitment exists whether paid or not — paying doesn't improve health)
    const ownFixedTotal = ownFixedExpenses
      .reduce((sum: number, exp: any) => {
        const amount = parseFloat(exp.amount) || 0;
        const monthly = exp.frequency === 'monthly' ? amount :
          exp.frequency === 'quarterly' ? amount / 3 : amount / 12;
        return sum + monthly;
      }, 0);
    const totalFixedForHealth = ownFixedTotal + sharedFixedTotal;
    
    // Calculate ALL active investments (commitment exists whether paid or not)
    const ownInvestmentsTotal = ownInvestments
      .filter((inv: any) => inv.status === 'active')
      .reduce((sum: number, inv: any) => sum + (parseFloat(inv.monthlyAmount) || 0), 0);
    const totalInvestmentsForHealth = ownInvestmentsTotal + sharedInvestmentsTotal;
    
    // Variable expenses - FIXED: Calculate per-plan max(actual, prorated) then sum
    // This matches the /health page breakdown exactly
    const today = new Date();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const monthProgress = today.getDate() / daysInMonth;
    const remainingDaysRatio = 1 - monthProgress;
    
    // Calculate per-plan effective amounts (matching /health breakdown display) - use filtered ownVariablePlans
    const ownVariableTotal = ownVariablePlans.reduce((sum: number, plan: any) => {
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
    const variableTotal = ownVariableTotal + sharedVariableEffective;
    
    // Future Bomb Defusal SIP — monthly amount needed to defuse bombs 1 month before due
    const bombSipTotal = ((data.futureBombs || []) as any[]).reduce((sum: number, bomb: any) => {
      const bombRemaining = Math.max(0, (parseFloat(bomb.totalAmount ?? 0) || 0) - (parseFloat(bomb.savedAmount ?? 0) || 0));
      if (bombRemaining <= 0) return sum;
      const dueDate = new Date(bomb.dueDate);
      const defuseBy = new Date(dueDate.getFullYear(), dueDate.getMonth() - 1, dueDate.getDate());
      const msPerMonth = 30.44 * 24 * 60 * 60 * 1000;
      const monthsLeft = Math.max(1, Math.floor((defuseBy.getTime() - today.getTime()) / msPerMonth));
      return sum + (bombRemaining / monthsLeft);
    }, 0);
    
    const totalOutflow = totalFixedForHealth + variableTotal + totalInvestmentsForHealth + ccDues + bombSipTotal;
    const remaining = totalIncome - totalOutflow;
    
    // Determine category using PERCENTAGE-BASED configurable thresholds
    // Use thresholds from dashboard response, fallback to defaults
    const ht = data.healthThresholds || { good_min: 20, ok_min: 10, ok_max: 19.99, not_well_max: 9.99 };
    // Allow negative percentages so "worrisome" is reachable when outflow > income
    const healthPct = totalIncome > 0
      ? (remaining / totalIncome) * 100
      : (remaining < 0 ? -100 : 0);
    let category: string;
    if (healthPct < 0) category = "worrisome";          // deficit — spending exceeds income
    else if (healthPct >= ht.good_min) category = "good";
    else if (healthPct >= ht.ok_min) category = "ok";
    else category = "not_well";                          // 0 – ok_min
    
    
    // For specific user view without aggregates, show notice
    const noAggregateData = isSpecificUserView && !specificUserAggregate;
    
    // Return both combined values AND own values for aggregate push
    return { 
      remaining: noAggregateData ? null : remaining, // null indicates unavailable
      category: noAggregateData ? 'unavailable' : category,
      noAggregateData,
      isSpecificUserView,
      // Own values for aggregate push (so shared users can see our totals)
      // Use filtered ownVariablePlans to avoid including shared users' data
      ownAggregates: {
        total_income_monthly: ownIncome,
        total_fixed_monthly: ownFixedTotal,
        total_investments_monthly: ownInvestmentsTotal,
        total_variable_planned: ownVariablePlans.reduce((sum: number, p: any) => sum + (parseFloat(p.planned) || 0), 0),
        total_variable_actual: ownVariableTotal,
        total_credit_card_dues: ownCcDues
      }
    };
  }, [data, creditCards, token, selectedView]);

  // Push own aggregates to server (for shared users to see our totals)
  // This runs in background - debounced to prevent spam
  useEffect(() => {
    if (correctHealth.ownAggregates && selectedView === "me" && token) {
      // Debounce: Only push if 5 seconds have passed since last push
      const now = Date.now();
      if (now - lastAggPushRef.current < 5000) return;
      lastAggPushRef.current = now;
      
      api.updateUserAggregates(token, correctHealth.ownAggregates)
        .catch(err => console.warn('[AGGREGATES] Failed to push:', err));
    }
  }, [correctHealth.ownAggregates, selectedView, token]);

  // Auto-refresh RSU stock prices on dashboard load
  useEffect(() => {
    if (!data?.incomes || rsuRefreshDoneRef.current) return;
    const rsuIncomes = (data.incomes || []).filter(
      (inc: any) => inc.incomeType === 'rsu' && inc.rsuTicker && inc.includeInHealth !== false
    );
    if (rsuIncomes.length === 0) return;
    rsuRefreshDoneRef.current = true;

    const userCurrency = data.preferences?.currency || 'INR';
    // Collect unique tickers
    const tickers = [...new Set(rsuIncomes.map((inc: any) => inc.rsuTicker))];
    const quoteCache: Record<string, any> = {};

    (async () => {
      try {
        // Fetch all unique tickers in parallel
        const quotes = await Promise.allSettled(
          tickers.map((t: string) => api.fetchStockQuote(token, t, userCurrency))
        );
        quotes.forEach((result, idx) => {
          if (result.status === 'fulfilled') {
            quoteCache[tickers[idx] as string] = result.value.data;
          }
        });

        // Update each RSU income with fresh price in background
        for (const inc of rsuIncomes) {
          const quote = quoteCache[inc.rsuTicker];
          if (!quote) continue;
          const taxRate = inc.rsuTaxRate ?? 33;
          const netShares = Math.round((inc.rsuGrantCount || 0) * (1 - taxRate / 100));
          const priceInUserCur = quote.conversionRate ? quote.price * quote.conversionRate : quote.price;
          const newAmount = Math.round((netShares * priceInUserCur / 12) * 100) / 100;

          // Only update if price actually changed
          if (Math.abs(newAmount - (inc.amount || 0)) > 0.01) {
            api.updateIncome(token, inc.id, {
              amount: newAmount,
              rsu_stock_price: quote.price,
              rsu_conversion_rate: quote.conversionRate || undefined
            }).catch(err => console.warn('[RSU_REFRESH] Failed to update income:', err));
          }
        }

        // Update local data with fresh prices for immediate display
        setData((prev: any) => {
          if (!prev) return prev;
          const updatedIncomes = (prev.incomes || []).map((inc: any) => {
            if (inc.incomeType !== 'rsu' || !inc.rsuTicker) return inc;
            const quote = quoteCache[inc.rsuTicker];
            if (!quote) return inc;
            const taxRate = inc.rsuTaxRate ?? 33;
            const netShares = Math.round((inc.rsuGrantCount || 0) * (1 - taxRate / 100));
            const priceInUserCur = quote.conversionRate ? quote.price * quote.conversionRate : quote.price;
            const newAmount = Math.round((netShares * priceInUserCur / 12) * 100) / 100;
            return {
              ...inc,
              amount: newAmount,
              rsuStockPrice: quote.price,
              rsuConversionRate: quote.conversionRate || inc.rsuConversionRate
            };
          });
          return { ...prev, incomes: updatedIncomes };
        });
      } catch (err) {
        console.warn('[RSU_REFRESH] Error refreshing RSU prices:', err);
      }
    })();
  }, [data?.incomes]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  // Background revalidation function
  const fetchFreshData = async (userId: string, wasStale = false, viewParam?: string) => {
    try {
      const [dashboardRes, cardsRes, loansRes, activityRes, membersRes] = await Promise.all([
        api.fetchDashboard(token, new Date().toISOString(), viewParam === "me" ? undefined : viewParam),
        api.fetchCreditCards(token),
        api.fetchLoans(token),
        api.fetchActivity(token, undefined, undefined, viewParam),
        api.fetchSharingMembers(token)
      ]);
      
      // Update state with fresh data (seamless refresh)
      if (!mountedRef.current) return;
      setData(dashboardRes.data);
      setCreditCards(cardsRes.data);
      setLoans(loansRes.data);
      setActivities(activityRes.data);
      setSharingMembers(membersRes.data);
      if (!quickAddPlanId && dashboardRes.data?.variablePlans?.length) {
        setQuickAddPlanId(dashboardRes.data.variablePlans[0].id);
      }
      setIsStale(false); // Data is now fresh
      
      // Update cache
      ClientCache.set('dashboard', dashboardRes.data, userId);
      ClientCache.set('creditCards', cardsRes.data, userId);
      ClientCache.set('loans', loansRes.data, userId);
      ClientCache.set('activities', activityRes.data, userId);
      
      if (wasStale) {
        console.log('[REVALIDATE_SUCCESS] Stale data replaced with fresh data');
      } else {
        console.log('[REVALIDATE_SUCCESS] Dashboard data refreshed in background');
      }
    } catch (error) {
      console.error('[REVALIDATE_ERROR] Failed to refresh:', error);
      // Don't throw - background refresh failures shouldn't break the UI
      // User still sees the stale cached data
    }
  };

  useEffect(() => {
    // Prevent double fetch in React Strict Mode
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    lastViewRef.current = selectedView;
    
    loadData();
    import("../data/funFacts").then((m) => {
      if (!mountedRef.current) return;
      const facts = m.funFacts || [];
      if (facts.length) {
        setFunFact(facts[Math.floor(Math.random() * facts.length)]);
      }
    });
    api.getUserSubcategories(token).then(res => {
      if (!mountedRef.current) return;
      const subs = res.data || [];
      setUserSubcategories(subs.length ? subs : ["Unspecified"]);
      if (!quickAddSubcategory && subs.length) setQuickAddSubcategory(subs[0]);
    }).catch(() => {
      if (!mountedRef.current) return;
      setUserSubcategories(["Unspecified"]);
    });
    
    // KEEP-ALIVE: Ping Edge Function every 4 minutes to prevent cold starts
    // Only runs while dashboard is mounted (user is active)
    const keepAlive = async () => {
      try {
        const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
        const baseUrl = envUrl?.replace('/rest/v1', '') || 'https://eklennfapovprkebdsml.supabase.co';
        await fetch(`${baseUrl}/functions/v1/api/health`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || ''
          }
        });
        console.log('[KEEP_ALIVE] Edge Function pinged to prevent cold start');
      } catch (err) {
        console.error('[KEEP_ALIVE_ERROR]', err);
      }
    };
    
    // Initial ping after 4 minutes
    const timeoutId = setTimeout(() => {
      keepAlive();
      // Then ping every 4 minutes
      keepAliveIntervalRef.current = window.setInterval(keepAlive, 4 * 60 * 1000);
    }, 4 * 60 * 1000);
    
    return () => {
      mountedRef.current = false;
      clearTimeout(timeoutId);
      if (keepAliveIntervalRef.current) {
        clearInterval(keepAliveIntervalRef.current);
      }
    };
  }, []);

  // Community Lounge — subscribe to presence count (WebSocket, 0 Edge Function calls)
  useEffect(() => {
    const unsub = subscribePresenceCount((count) => setLoungeOnline(count));
    return unsub;
  }, []);

  // Reset to "me" if sharing was revoked and no shared members remain
  // IMPORTANT: This hook MUST be before any early returns to follow React hooks rules
  const hasSharedMembersHook = (sharingMembers?.members || []).length > 0;
  useEffect(() => {
    if (!hasSharedMembersHook && selectedView !== 'me') {
      setSelectedView('me');
      localStorage.setItem('finflow_selected_view', 'me');
    }
  }, [hasSharedMembersHook, selectedView]);

  const loadData = async (forceRefresh = false, viewOverride?: string) => {
    try {
      if (!mountedRef.current) return;
      setLoadProgress(0);
      
      console.log('[PERF] Dashboard loadData started', { forceRefresh });

      // Extract userId from token for cache key
      let userId = 'unknown';
      try {
        const tokenPayload = JSON.parse(atob(token.split('.')[1]));
        userId = tokenPayload.userId;
        console.log('[CACHE_DEBUG] UserId extracted:', userId);
      } catch (e) {
        console.error('[CACHE_ERROR] Failed to extract userId from token:', e);
      }

      // OFFLINE-FIRST: Always check cache first (even if stale)
      const cachedDashboard = ClientCache.get<any>('dashboard', userId);
      const isDataStale = ClientCache.isStale('dashboard', userId);
      
      if (cachedDashboard && !forceRefresh) {
        const cachedCards = ClientCache.get<any[]>('creditCards', userId) || [];
        const cachedLoans = ClientCache.get<any[]>('loans', userId) || [];
        const cachedActivities = ClientCache.get<any[]>('activities', userId) || [];
        
        // Show cached data immediately (even if stale)
        if (!mountedRef.current) return;
        setData(cachedDashboard);
        setCreditCards(cachedCards);
        setLoans(cachedLoans);
        setActivities(cachedActivities);
        // Don't hardcode empty - fetch sharing members fresh (needed for combined view)
        api.fetchSharingMembers(token).then(res => {
          if (!mountedRef.current) return;
          setSharingMembers(res.data);
        }).catch(() => {
          if (!mountedRef.current) return;
          setSharingMembers({ members: [] });
        });
        setLoading(false);
        setLoadProgress(100);
        setIsStale(isDataStale);
        if (!quickAddPlanId && cachedDashboard?.variablePlans?.length) {
          setQuickAddPlanId(cachedDashboard.variablePlans[0].id);
        }
        
        if (isDataStale) {
          console.log('[OFFLINE_FIRST] Showing stale cache to prevent blank screen');
        } else {
          console.log('[CACHE_HIT_CLIENT] Using cached dashboard data - instant load!');
        }
        
        // REVALIDATE: Fetch fresh data in background
        console.log('[REVALIDATE] Fetching fresh data in background...');
        fetchFreshData(userId, isDataStale, selectedView).catch(err => {
          console.error('[REVALIDATE_ERROR] Background refresh failed:', err);
          // Keep showing stale data - better than blank screen
        });
        
        return;
      }
      
      console.log('[CACHE_MISS_CLIENT] No cached data, fetching from API');
      if (!mountedRef.current) return;
      setIsStale(false);
      setLoadProgress(10); // Starting fetch
      setLoadProgress(30); // Connecting to server
      
      const viewParam = viewOverride ?? selectedView ?? "me";


      const [dashboardRes, cardsRes, loansRes, activityRes, membersRes] = await Promise.all([
        api.fetchDashboard(token, new Date().toISOString(), viewParam === "me" ? undefined : viewParam, forceRefresh),
        api.fetchCreditCards(token),
        api.fetchLoans(token),
        api.fetchActivity(token, undefined, undefined, viewParam),
        api.fetchSharingMembers(token)
      ]);
      
      setLoadProgress(80); // Data received
      if (!mountedRef.current) return;

      // Set state
      setData(dashboardRes.data);
      setCreditCards(cardsRes.data);
      setLoans(loansRes.data);
      setActivities(activityRes.data);
      setSharingMembers(membersRes.data);
      if (!quickAddPlanId && dashboardRes.data?.variablePlans?.length) {
        setQuickAddPlanId(dashboardRes.data.variablePlans[0].id);
      }
      
      setLoadProgress(95); // Rendering
      
      // Cache the results
      try {
        const tokenPayload = JSON.parse(atob(token.split('.')[1]));
        const userId = tokenPayload.userId;
        ClientCache.set('dashboard', dashboardRes.data, userId);
        ClientCache.set('creditCards', cardsRes.data, userId);
        ClientCache.set('loans', loansRes.data, userId);
        ClientCache.set('activities', activityRes.data, userId);
        console.log('[CACHE_SET_CLIENT] Dashboard data cached for next visit');
      } catch (e) {
        console.error('[CACHE_ERROR] Failed to cache data:', e);
      }
    } catch (e: any) {
      console.error("Failed to load dashboard:", e);
      if (mountedRef.current) setLoadProgress(100); // Complete even on error
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  const handleQuickAddSubmit = async () => {
    try {
      if (!quickAddPlanId) {
        showAlert("Select a variable plan");
        return;
      }
      const amountNum = parseFloat(quickAddAmount);
      if (!amountNum || amountNum <= 0) {
        showAlert("Enter a valid amount");
        return;
      }
      await api.addVariableActual(token, quickAddPlanId, {
        amount: amountNum,
        incurred_at: new Date().toISOString(),
        justification: quickAddJustification || undefined,
        subcategory: quickAddSubcategory || undefined,
        payment_mode: quickAddMode,
        credit_card_id: quickAddMode === "CreditCard" ? quickAddCardId || undefined : undefined
      });
      setShowQuickAdd(false);
      setQuickAddAmount("");
      setQuickAddJustification("");
      setQuickAddSubcategory("");
      setQuickAddCardId("");
      await loadData(true);
    } catch (e: any) {
      showAlert(e.message || "Failed to add expense");
    }
  };

  const computed = useMemo(() => {
    if (!data) return null;
    const pref = data.preferences;
    const sym: Record<string, string> = { INR: "₹", USD: "$", EUR: "€", GBP: "£" };
    const _currSym = pref?.currency ? (sym[pref.currency] || pref.currency) : "₹";
    const _variableTotal = data.variablePlans?.reduce((s: number, p: any) => s + (p.actualTotal || 0), 0) || 0;
    const _fixedTotal = data.fixedExpenses?.reduce((s: number, f: any) => {
      const m = f.frequency === "monthly" ? f.amount : f.frequency === "quarterly" ? f.amount / 3 : f.amount / 12;
      return s + m;
    }, 0) || 0;
    const _investmentsTotal = data.investments?.reduce((s: number, i: any) => s + i.monthlyAmount, 0) || 0;
    const _incomeTotal = (data.incomes || [])
      .filter((inc: any) => inc.includeInHealth !== false)
      .reduce((s: number, inc: any) => {
        const amt = parseFloat(inc.amount) || 0;
        return s + (inc.frequency === 'monthly' ? amt : inc.frequency === 'quarterly' ? amt / 3 : amt / 12);
      }, 0);
    const _totalSpent = _variableTotal + (data.fixedExpenses || [])
      .filter((f: any) => f.paid)
      .reduce((s: number, f: any) => {
        const m = f.frequency === "monthly" ? f.amount : f.frequency === "quarterly" ? f.amount / 3 : f.amount / 12;
        return s + m;
      }, 0);
    const unpaidFixed = data.fixedExpenses?.filter((f: any) => !f.paid).reduce((s: number, f: any) => {
      const m = f.frequency === "monthly" ? f.amount : f.frequency === "quarterly" ? f.amount / 3 : f.amount / 12;
      return s + (m || 0);
    }, 0) || 0;
    const unpaidInv = data.investments?.filter((i: any) => !i.paid && (i.status === 'active' || !i.status))
      .reduce((s: number, i: any) => s + (i.monthlyAmount || 0), 0) || 0;
    const ccDues = (creditCards || []).reduce((s: number, c: any) => {
      const remaining = parseFloat(c.billAmount || 0) - parseFloat(c.paidAmount || 0);
      if (remaining > 0) {
        const d = new Date(c.dueDate); const now = new Date();
        if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) return s + remaining;
      }
      return s;
    }, 0);
    const base: { value: string; label: string }[] = [
      { value: "me", label: "My Finances" },
      { value: "merged", label: "Combined (Shared)" },
    ];
    const seen = new Set<string>();
    for (const m of (sharingMembers?.members || [])) {
      const id = m.shared_user_id || m.user_id || m.userId || m.id;
      if (id && !seen.has(id)) { seen.add(id); base.push({ value: id, label: m.username || id || "Shared Member" }); }
    }
    return {
      currSym: _currSym, variableTotal: _variableTotal, fixedTotal: _fixedTotal,
      investmentsTotal: _investmentsTotal, incomeTotal: _incomeTotal, totalSpentThisMonth: _totalSpent,
      futureBombsCount: data.futureBombs?.length || 0, notifCount: data._notificationCount || 0,
      duesTotal: (unpaidFixed || 0) + (unpaidInv || 0) + (ccDues || 0),
      hasSharedMembers: (sharingMembers?.members || []).length > 0, viewOptions: base,
    };
  }, [data, creditCards, sharingMembers]);

  if (loading) {
    return (
      <div className="dashboard-page loader-shell">
        <div className="loading-orb" />
        <div className="loading-text">Warming up your dashboard... client-side compute for privacy.</div>
        <div className="loading-text" style={{ fontSize: 13, opacity: 0.8 }}>Numbers stay on your device; this adds a brief load.</div>
        {funFact && (
          <div className="health-crawl">
            <div className="crawl-inner">
              <p>“Patience, young padawan. Data is assembling...”</p>
              <p>{funFact}</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!data || !computed) {
    return (
      <div className="dashboard-page">
        <EmptyState
          icon={<FaWallet size={80} />}
          title="Welcome to FinFlow!"
          description="Start your financial journey by planning your income and expenses"
          actionLabel="Plan Your Finances"
          onAction={() => navigate("/settings/plan-finances")}
        />
      </div>
    );
  }

  const hasNoFinances =
    (!data.incomes || data.incomes.length === 0) &&
    (!data.fixedExpenses || data.fixedExpenses.length === 0) &&
    (!data.variablePlans || data.variablePlans.length === 0);

  if (hasNoFinances) {
    return (
      <div className="dashboard-page">
        <EmptyState
          icon={<FaChartLine size={80} />}
          title="No Financial Data Yet"
          description="Add your income, expenses, and investments to see your financial health and insights."
          actionLabel="Plan Your Finances"
          onAction={() => navigate("/settings/plan-finances")}
          secondaryActionLabel="How to Get Started"
          onSecondaryAction={() => navigate("/settings/about")}
        />
      </div>
    );
  }

  const {
    currSym, variableTotal, fixedTotal, investmentsTotal, incomeTotal,
    totalSpentThisMonth, futureBombsCount, notifCount,
    duesTotal, hasSharedMembers, viewOptions
  } = computed;

  return (
    <div className="dashboard-page">
      {/* Stale Data Banner */}
      <AnimatePresence>
        {isStale && (
          <motion.div
            className="stale-data-banner"
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
          <div className="banner-content">
            <div className="banner-icon-container">
              <motion.div
                className="banner-icon"
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                ⟳
              </motion.div>
            </div>
            <div className="banner-text">
              <span className="banner-title">Refreshing data...</span>
              <span className="banner-subtitle">Showing cached version</span>
            </div>
          </div>
          <div className="banner-progress-line" />
        </motion.div>
        )}
      </AnimatePresence>
      
      <IntroModal
        isOpen={showIntro}
        onClose={closeIntro}
        title="Welcome to Your Dashboard!"
        description="This is your financial command center — a single screen showing your health score, income, expenses, investments, dues, and more. Every widget is tappable for a detailed deep-dive."
        tips={[
          "The Health Score at the top is your most important number — it shows real available funds after all obligations",
          "Green = Healthy, Yellow = Tight, Red = Needs Attention — customise thresholds in Health Details",
          "Tap any widget (Expenses, Investments, Dues, etc.) to see the full page",
          "Use the Quick Add button to log a variable expense without leaving the dashboard",
          "Smart notifications (🔔) alert you about unpaid dues, overspends, and health drops"
        ]}
      />


      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {hasSharedMembers && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div className="view-selector">
              <label style={{ fontSize: 12, color: '#6b7280' }}>Shared View</label>
              <select
                value={selectedView}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedView(val);
                  loadData(true, val);
                }}
              >
                {viewOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        )}
        <HealthIndicator
          category={correctHealth.category as any}
          remaining={correctHealth.remaining ?? 0}
          currencySymbol={currSym}
          onClick={() => navigate("/health")}
        />
      </motion.div>

      <div className="widgets-grid">
        {/* ─── Action-First: what you interact with most ─── */}
        <DashboardWidget
          title="Variable Expenses"
          value={data.variablePlans?.length || 0}
          subtitle={
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendIndicator
                value={variableTotal}
                format="currency"
                size="small"
              />
              {selectedView === 'me' && (
                <div className="quick-add-tooltip-container" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="icon-btn quick-add-floating"
                    title="Log your spend"
                    onClick={(e) => { e.stopPropagation(); setShowQuickAdd(true); }}
                  >
                    <FaPlus />
                  </button>
                  <div className="quick-add-tooltip">Log your spend</div>
                </div>
              )}
            </div>
          }
          icon={<FaChartBar />}
          onClick={() => navigate("/variable-expenses")}
          color="#3b82f6"
        />
        <DashboardWidget
          title="This Month's Spend"
          value={`${currSym}${Math.round(totalSpentThisMonth).toLocaleString("en-IN")}`}
          subtitle="Tap for full breakdown"
          icon={<FaCalendar />}
          onClick={() => navigate("/current-month-expenses")}
          color="#14b8a6"
        />
        <DashboardWidget
          title="Fixed Expenses"
          value={data.fixedExpenses?.length || 0}
          subtitle={`${currSym}${Math.round(fixedTotal).toLocaleString("en-IN")}/month`}
          icon={<FaMoneyBillWave />}
          onClick={() => navigate("/fixed-expenses")}
          color="#8b5cf6"
        />
        <DashboardWidget
          title="Dues"
          value={`${currSym}${Math.round(duesTotal).toLocaleString("en-IN")}`}
          subtitle={
            <div style={{ marginTop: 8 }}>
              {duesTotal === 0 ? (
                <StatusBadge status="completed" size="small" label="All Paid!" />
              ) : duesTotal > 10000 ? (
                <StatusBadge status="overdue" size="small" label="High Dues" />
              ) : (
                <StatusBadge status="pending" size="small" label="Pending" />
              )}
            </div>
          }
          icon={<FaClock />}
          onClick={() => navigate("/dues")}
          color="#ec4899"
        />

        {/* ─── Planning & Growth ─── */}
        <DashboardWidget
          title="Investments"
          value={data.investments?.length || 0}
          subtitle={
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                {currSym}{Math.round(investmentsTotal).toLocaleString("en-IN")}/mo
              </span>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {data.investments?.filter((i: any) => i.status === 'active').length > 0 && (
                  <StatusBadge status="active" size="small" label={`${data.investments.filter((i: any) => i.status === 'active').length} Active`} />
                )}
                {data.investments?.filter((i: any) => i.status === 'paused').length > 0 && (
                  <StatusBadge status="paused" size="small" label={`${data.investments.filter((i: any) => i.status === 'paused').length} Paused`} />
                )}
              </div>
            </div>
          }
          icon={<MdTrendingUp />}
          onClick={() => navigate("/settings/plan-finances/investments")}
          color="#10b981"
        />
        <DashboardWidget
          title="Periodic SIPs"
          value={data.fixedExpenses?.filter((f: any) => f.isSipFlag).length || 0}
          subtitle={`${currSym}${Math.round((data.fixedExpenses || []).filter((f: any) => f.isSipFlag).reduce((s: number, f: any) => s + (f.amount || 0), 0)).toLocaleString("en-IN")}/cycle`}
          icon={<FaExchangeAlt />}
          onClick={() => navigate("/sip-expenses")}
          color="#f59e0b"
        />
        <DashboardWidget
          title="Future Bombs"
          value={futureBombsCount}
          subtitle={futureBombsCount > 0 ? `${futureBombsCount} upcoming liabilit${futureBombsCount !== 1 ? 'ies' : 'y'}` : 'No ticking bombs'}
          icon={<FaBomb />}
          onClick={() => navigate("/future-bombs")}
          color="#f97316"
        />
        <DashboardWidget
          title="Credit Cards"
          value={creditCards.length}
          subtitle={`${currSym}${(creditCards || []).reduce((s: number, c: any) => s + (parseFloat(c.billAmount || 0)), 0).toLocaleString("en-IN")} total bills`}
          icon={<FaCreditCard />}
          onClick={() => navigate("/credit-cards")}
          color="#ef4444"
        />
        <DashboardWidget
          title="Loans"
          value={loans.length}
          subtitle={`${currSym}${loans.reduce((s, l) => s + l.emi, 0).toLocaleString("en-IN")}/month EMI`}
          icon={<FaUniversity />}
          onClick={() => navigate("/loans")}
          color="#6366f1"
        />

        {/* ─── Overview & Social ─── */}
        <DashboardWidget
          title="Income"
          value={`${currSym}${Math.round(incomeTotal).toLocaleString("en-IN")}`}
          subtitle={
            <div style={{ marginTop: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              <StatusBadge status="active" size="small" label={`${(data.incomes || []).length} Source${(data.incomes || []).length !== 1 ? 's' : ''}`} />
              {(data.incomes || []).some((i: any) => i.incomeType === 'rsu') && (
                <StatusBadge status="info" size="small" label="RSU" />
              )}
            </div>
          }
          icon={<FaHandHoldingUsd />}
          onClick={() => navigate("/settings/plan-finances/income")}
          color="#22d3ee"
        />
        <DashboardWidget
          title="Activities"
          value={activities.length}
          subtitle={activities.length > 0 ? `Last: ${new Date((activities[0] as any)?.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : 'No recent actions'}
          icon={<FaClipboardList />}
          onClick={() => navigate("/activities")}
          color="#64748b"
        />
        <DashboardWidget
          title="Community Lounge"
          value={loungeOnline > 0 ? `${loungeOnline} online` : 'Join'}
          subtitle={
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
              {loungeOnline > 0 && (
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: 'var(--accent-green)',
                  boxShadow: '0 0 6px var(--accent-green)',
                  display: 'inline-block',
                  animation: 'pulse-dot 2s ease-in-out infinite'
                }} />
              )}
              <span>Join the conversation</span>
            </div>
          }
          icon={<HiChatBubbleLeftRight />}
          onClick={() => navigate("/community")}
          color="#00D9FF"
        />
        {notifCount > 0 && (
          <DashboardWidget
            title="Notifications"
            value={notifCount}
            subtitle="Unread"
            icon={<FaBell />}
            onClick={() => navigate("/notifications")}
            color="#ef4444"
            trend="down"
          />
        )}
      </div>
      <AnimatePresence>
        {showQuickAdd && (
          <motion.div
            className="dashboard-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowQuickAdd(false)}
          >
            <motion.div
              className="dashboard-modal-card"
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3>Quick Add Expense</h3>
              <div className="form-row">
                <label>Plan</label>
                <select value={quickAddPlanId} onChange={(e) => setQuickAddPlanId(e.target.value)}>
                  {(data.variablePlans || []).map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <label>Amount</label>
                <input
                  type="number"
                  value={quickAddAmount}
                  onChange={(e) => setQuickAddAmount(e.target.value)}
                  placeholder="Enter amount"
                />
              </div>
              <div className="form-row">
                <label>Payment Mode</label>
                <select value={quickAddMode} onChange={(e) => setQuickAddMode(e.target.value as any)}>
                  <option value="UPI">UPI</option>
                  <option value="Cash">Cash</option>
                  <option value="ExtraCash">Extra Cash</option>
                  <option value="CreditCard">Credit Card</option>
                </select>
              </div>
              {quickAddMode === "CreditCard" && (
                <div className="form-row">
                  <label>Credit Card</label>
                  <select value={quickAddCardId} onChange={(e) => setQuickAddCardId(e.target.value)}>
                    <option value="">Select card</option>
                    {(creditCards || []).map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="form-row">
                <label>Subcategory</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <select value={quickAddSubcategory} onChange={(e) => setQuickAddSubcategory(e.target.value)} style={{ flex: 1 }}>
                    {(userSubcategories.length ? userSubcategories : ["Unspecified"]).map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <button className="secondary-btn" onClick={() => setShowQuickNewSub(!showQuickNewSub)}>+ Add</button>
                </div>
                {showQuickNewSub && (
                  <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                    <input
                      value={newQuickSub}
                      onChange={(e) => setNewQuickSub(e.target.value)}
                      placeholder="New subcategory"
                    />
                    <button
                      className="primary-btn"
                      onClick={async () => {
                        if (!newQuickSub.trim()) return;
                        try {
                          const res = await api.addUserSubcategory(token, newQuickSub.trim());
                          const subs = res.data.subcategories || [];
                          setUserSubcategories(subs);
                          setQuickAddSubcategory(newQuickSub.trim());
                          setNewQuickSub("");
                          setShowQuickNewSub(false);
                        } catch (err: any) {
                          showAlert(err.message);
                        }
                      }}
                    >
                      Save
                    </button>
                  </div>
                )}
              </div>
              <div className="form-row">
                <label>Note (optional)</label>
                <textarea value={quickAddJustification} onChange={(e) => setQuickAddJustification(e.target.value)} />
              </div>
              <div className="dashboard-modal-actions">
                <button onClick={() => setShowQuickAdd(false)} className="secondary-btn">Cancel</button>
                <button onClick={handleQuickAddSubmit} className="primary-btn">Add Expense</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AppModalRenderer modal={modal} closeModal={closeModal} confirmAndClose={confirmAndClose} />
    </div>
  );
}

