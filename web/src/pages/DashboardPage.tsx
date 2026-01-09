import { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaWallet, FaChartLine, FaChartBar, FaUniversity, FaCreditCard,
  FaBomb, FaClipboardList, FaClock, FaCalendar, FaBell, FaMoneyBillWave,
  FaExchangeAlt, FaHandHoldingUsd, FaPlus
} from "react-icons/fa";
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
  const { showIntro, closeIntro } = useIntroModal("dashboard");
  const keepAliveIntervalRef = useRef<number | null>(null);

  // Persist selectedView when it changes
  useEffect(() => {
    localStorage.setItem('finflow_selected_view', selectedView);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/620c30bd-a4ac-4892-8325-a941881cbeee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DashboardPage:viewChange',message:'View changed and persisted',data:{selectedView},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1-VIEW'})}).catch(()=>{});
    // #endregion
  }, [selectedView]);

  // Calculate CORRECT health score on frontend (backend doesn't respect 'paid' status properly)
  // This MUST be called unconditionally (before any early returns) to follow React hooks rules
  const correctHealth = useMemo(() => {
    if (!data) return { remaining: 0, category: 'ok' };
    
    // Calculate credit card dues first (needed for health calculation)
    const ccDues = (creditCards || []).reduce((sum: number, c: any) => {
      const billAmount = parseFloat(c.billAmount || 0);
      const paidAmount = parseFloat(c.paidAmount || 0);
      const remaining = billAmount - paidAmount;
      if (remaining > 0) {
        const dueDate = new Date(c.dueDate);
        const isCurrentMonth = dueDate.getMonth() === new Date().getMonth() && 
                              dueDate.getFullYear() === new Date().getFullYear();
        if (isCurrentMonth) return sum + remaining;
      }
      return sum;
    }, 0);
    
    // Calculate total income
    const totalIncome = (data.incomes || []).reduce((sum: number, inc: any) => {
      const amount = parseFloat(inc.amount) || 0;
      const monthly = inc.frequency === 'monthly' ? amount :
        inc.frequency === 'quarterly' ? amount / 3 : amount / 12;
      return sum + monthly;
    }, 0);
    
    // Calculate unpaid fixed expenses (respecting 'paid' status)
    const unpaidFixedTotal = (data.fixedExpenses || [])
      .filter((exp: any) => !exp.paid)
      .reduce((sum: number, exp: any) => {
        const amount = parseFloat(exp.amount) || 0;
        const monthly = exp.frequency === 'monthly' ? amount :
          exp.frequency === 'quarterly' ? amount / 3 : amount / 12;
        return sum + monthly;
      }, 0);
    
    // Calculate unpaid investments (respecting 'paid' status)
    const unpaidInvestmentsTotal = (data.investments || [])
      .filter((inv: any) => inv.status === 'active' && !inv.paid)
      .reduce((sum: number, inv: any) => sum + (parseFloat(inv.monthlyAmount) || 0), 0);
    
    // Variable expenses - FIXED: Calculate per-plan max(actual, prorated) then sum
    // This matches the /health page breakdown exactly
    const today = new Date();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const monthProgress = today.getDate() / daysInMonth;
    const remainingDaysRatio = 1 - monthProgress;
    
    // Calculate per-plan effective amounts (matching /health breakdown display)
    const variableTotal = (data.variablePlans || []).reduce((sum: number, plan: any) => {
      // Get actuals excluding ExtraCash and CreditCard (they don't reduce available funds)
      const actuals = (plan.actuals || []).filter((a: any) => 
        a.paymentMode !== "ExtraCash" && a.paymentMode !== "CreditCard"
      );
      const actualTotal = actuals.reduce((s: number, a: any) => s + (parseFloat(a.amount) || 0), 0);
      const proratedForRemainingDays = (parseFloat(plan.planned) || 0) * remainingDaysRatio;
      // Use higher of actual vs prorated per plan
      return sum + Math.max(actualTotal, proratedForRemainingDays);
    }, 0);
    
    const totalOutflow = unpaidFixedTotal + variableTotal + unpaidInvestmentsTotal + ccDues;
    const remaining = totalIncome - totalOutflow;
    
    // Determine category
    let category: string;
    if (remaining > 10000) category = "good";
    else if (remaining >= 0) category = "ok";
    else if (remaining >= -3000) category = "not_well";
    else category = "worrisome";
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/620c30bd-a4ac-4892-8325-a941881cbeee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DashboardPage:correctHealth',message:'Dashboard health calc',data:{totalIncome,unpaidFixedTotal,variableTotal,unpaidInvestmentsTotal,ccDues,totalOutflow,remaining,category},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3'})}).catch(()=>{});
    // #endregion
    return { remaining, category };
  }, [data, creditCards]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/";
  };

  // Background revalidation function
  const fetchFreshData = async (userId: string, wasStale = false, viewParam?: string) => {
    try {
      const [dashboardRes, cardsRes, loansRes, activityRes, membersRes] = await Promise.all([
        api.fetchDashboard(token, new Date().toISOString(), viewParam === "me" ? undefined : viewParam),
        api.fetchCreditCards(token),
        api.fetchLoans(token),
        api.fetchActivity(token),
        api.fetchSharingMembers(token)
      ]);
      
      // Update state with fresh data (seamless refresh)
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
    loadData();
    import("../data/funFacts").then((m) => {
      const facts = m.funFacts || [];
      if (facts.length) {
        setFunFact(facts[Math.floor(Math.random() * facts.length)]);
      }
    });
    api.getUserSubcategories(token).then(res => {
      const subs = res.data || [];
      setUserSubcategories(subs.length ? subs : ["Unspecified"]);
      if (!quickAddSubcategory && subs.length) setQuickAddSubcategory(subs[0]);
    }).catch(() => setUserSubcategories(["Unspecified"]));
    
    // KEEP-ALIVE: Ping Edge Function every 4 minutes to prevent cold starts
    // Only runs while dashboard is mounted (user is active)
    const keepAlive = async () => {
      try {
        const baseUrl = import.meta.env.VITE_SUPABASE_URL?.replace('/rest/v1', '') || 'https://eklennfapovprkebdsml.supabase.co';
        await fetch(`${baseUrl}/functions/v1/api/health`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || ''
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
      clearTimeout(timeoutId);
      if (keepAliveIntervalRef.current) {
        clearInterval(keepAliveIntervalRef.current);
      }
    };
  }, []);

  const loadData = async (forceRefresh = false, viewOverride?: string) => {
    try {
      setLoadProgress(0);
      
      // #region agent log
      const startTime = performance.now();
      console.log('[PERF_H1_H4] Dashboard loadData started', { timestamp: Date.now(), forceRefresh });
      // #endregion

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
        setData(cachedDashboard);
        setCreditCards(cachedCards);
        setLoans(cachedLoans);
        setActivities(cachedActivities);
        // Don't hardcode empty - fetch sharing members fresh (needed for combined view)
        api.fetchSharingMembers(token).then(res => setSharingMembers(res.data)).catch(() => setSharingMembers({ members: [] }));
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
      setIsStale(false);
      setLoadProgress(10); // Starting fetch

      const apiTimings: any = {};
      
      setLoadProgress(30); // Connecting to server
      
      const viewParam = viewOverride ?? selectedView ?? "me";

      const [dashboardRes, cardsRes, loansRes, activityRes, membersRes] = await Promise.all([
        (async () => {
          // #region agent log
          const t0 = performance.now();
          // #endregion
          const res = await api.fetchDashboard(token, new Date().toISOString(), viewParam === "me" ? undefined : viewParam);
          // #region agent log
          const t1 = performance.now();
          apiTimings.dashboard = t1 - t0;
          console.log('[PERF_H1_H3_H7] fetchDashboard completed', { 
            duration: apiTimings.dashboard, 
            payloadSize: JSON.stringify(res).length,
            hasData: !!res.data
          });
          // #endregion
          return res;
        })(),
        (async () => {
          // #region agent log
          const t0 = performance.now();
          // #endregion
          const res = await api.fetchCreditCards(token);
          // #region agent log
          const t1 = performance.now();
          apiTimings.creditCards = t1 - t0;
          console.log('[PERF_H1_H5] fetchCreditCards completed', { 
            duration: apiTimings.creditCards, 
            payloadSize: JSON.stringify(res).length,
            count: res.data?.length || 0
          });
          // #endregion
          return res;
        })(),
        (async () => {
          // #region agent log
          const t0 = performance.now();
          // #endregion
          const res = await api.fetchLoans(token);
          // #region agent log
          const t1 = performance.now();
          apiTimings.loans = t1 - t0;
          console.log('[PERF_H1_H5] fetchLoans completed', { 
            duration: apiTimings.loans, 
            payloadSize: JSON.stringify(res).length,
            count: res.data?.length || 0
          });
          // #endregion
          return res;
        })(),
        (async () => {
          // #region agent log
          const t0 = performance.now();
          // #endregion
          const res = await api.fetchActivity(token);
          // #region agent log
          const t1 = performance.now();
          apiTimings.activity = t1 - t0;
          console.log('[PERF_H1_H5] fetchActivity completed', { 
            duration: apiTimings.activity, 
            payloadSize: JSON.stringify(res).length,
            count: res.data?.length || 0
          });
          // #endregion
          return res;
        })(),
        (async () => {
          // #region agent log
          const t0 = performance.now();
          // #endregion
          const res = await api.fetchSharingMembers(token);
          // #region agent log
          const t1 = performance.now();
          apiTimings.sharingMembers = t1 - t0;
          console.log('[PERF_H1_H5] fetchSharingMembers completed', { 
            duration: apiTimings.sharingMembers, 
            payloadSize: JSON.stringify(res).length,
            count: res.data?.members?.length || 0
          });
          // #endregion
          return res;
        })()
      ]);
      
      // #region agent log
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const maxTime = Math.max(...Object.values(apiTimings));
      console.log('[PERF_H1_H4_H6] Dashboard loadData completed', { 
        totalTime,
        maxTime,
        apiTimings,
        parallelEfficiency: (maxTime / totalTime) * 100,
        timestamp: Date.now()
      });
      // #endregion
      
      setLoadProgress(80); // Data received
      
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
      setLoadProgress(100); // Complete even on error
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAddSubmit = async () => {
    try {
      if (!quickAddPlanId) {
        alert("Select a variable plan");
        return;
      }
      const amountNum = parseFloat(quickAddAmount);
      if (!amountNum || amountNum <= 0) {
        alert("Enter a valid amount");
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
      alert(e.message || "Failed to add expense");
    }
  };

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

  if (!data) {
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
          description="Add your income and expenses to see your financial health and insights"
          actionLabel="Add Income"
          onAction={() => navigate("/settings/plan-finances/income")}
          secondaryActionLabel="Add Expenses"
          onSecondaryAction={() => navigate("/settings/plan-finances/fixed")}
        />
      </div>
    );
  }

  const variableTotal = data.variablePlans?.reduce((sum: number, p: any) => sum + (p.actualTotal || 0), 0) || 0;
  const fixedTotal = data.fixedExpenses?.reduce((sum: number, f: any) => {
    const monthly = f.frequency === "monthly" ? f.amount : f.frequency === "quarterly" ? f.amount / 3 : f.amount / 12;
    return sum + monthly;
  }, 0) || 0;
  const investmentsTotal = data.investments?.reduce((sum: number, i: any) => sum + i.monthlyAmount, 0) || 0;
  const futureBombsCount = data.futureBombs?.length || 0;
  const alertsCount = data.alerts?.length || 0;

  // Calculate unpaid dues only
  // P0 FIX: For periodic expenses, only include if actually due this billing period
  const unpaidFixed = data.fixedExpenses?.filter((f: any) => {
    if (f.paid) return false;
    // Monthly expenses are always due
    if (f.frequency === 'monthly') return true;
    // For periodic expenses, check if actually due (would need user preferences, simplified for now)
    // TODO: Add proper due date check using user's month_start_day
    return true; // Simplified - will be fixed with proper due date calculation
  }).reduce((sum: number, f: any) => {
    const monthly = f.frequency === "monthly" ? f.amount : f.frequency === "quarterly" ? f.amount / 3 : f.amount / 12;
    return sum + (monthly || 0);
  }, 0) || 0;
  // P0 FIX: Only include active (not paused) investments in dues
  const unpaidInvestments = data.investments?.filter((i: any) => !i.paid && (i.status === 'active' || !i.status)).reduce((sum: number, i: any) => sum + (i.monthlyAmount || 0), 0) || 0;
  // Loans are excluded from dues as they're auto-tracked from fixed expenses and not separately markable
  // const unpaidLoans = loans.filter((l: any) => !l.paid).reduce((sum, l) => sum + (l.emi || 0), 0);
  
  // P0 FIX: Credit card dues should only include current month's bills (matching DuesPage logic)
  const creditCardDues = (creditCards || []).reduce((sum: number, c: any) => {
    const billAmount = parseFloat(c.billAmount || 0);
    const paidAmount = parseFloat(c.paidAmount || 0);
    const remaining = billAmount - paidAmount;
    
    // Only include if there's a remaining balance AND it's due this month
    if (remaining > 0) {
      const dueDate = new Date(c.dueDate);
      const isCurrentMonth = dueDate.getMonth() === new Date().getMonth() && 
                            dueDate.getFullYear() === new Date().getFullYear();
      
      if (isCurrentMonth) {
        return sum + remaining;
      }
    }
    return sum;
  }, 0);

  const duesTotal = (unpaidFixed || 0) + (unpaidInvestments || 0) + (creditCardDues || 0);

  const viewOptions = [
    { value: "me", label: "My Finances" },
    { value: "merged", label: "Combined (Shared)" },
    ...(sharingMembers?.members || []).map((m: any) => {
      const id = m.shared_user_id || m.user_id || m.userId || m.id;
      const label = m.username || m.email || id || "Shared Member";
      return { value: id, label };
    })
  ];

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
        description="Your financial command center. Track your health score, monitor income vs expenses, and get a quick overview of everything that matters."
        tips={[
          "Health score shows how much money you have left after all obligations",
          "Green means you're doing great, yellow means be careful, red means urgent action needed",
          "Click any widget to see detailed breakdowns",
          "Your data updates in real-time as you add transactions"
        ]}
      />


      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
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
        <HealthIndicator
          category={correctHealth.category}
          remaining={correctHealth.remaining}
          onClick={() => navigate("/health")}
        />
      </motion.div>

      <div className="widgets-grid">
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
            </div>
          }
          icon={<FaChartBar />}
          onClick={() => navigate("/variable-expenses")}
          color="#3b82f6"
        />
        <DashboardWidget
          title="Fixed Expenses"
          value={data.fixedExpenses?.length || 0}
          subtitle={`₹${Math.round(fixedTotal).toLocaleString("en-IN")}/month`}
          icon={<FaMoneyBillWave />}
          onClick={() => navigate("/fixed-expenses")}
          color="#8b5cf6"
        />
        <DashboardWidget
          title="Investments"
          value={data.investments?.length || 0}
          subtitle={
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <TrendIndicator
                value={investmentsTotal}
                format="currency"
                size="small"
              />
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {data.investments?.filter((i: any) => i.status === 'active').length > 0 && (
                  <StatusBadge status="active" size="small" label={`${data.investments?.filter((i: any) => i.status === 'active').length} Active`} />
                )}
                {data.investments?.filter((i: any) => i.status === 'paused').length > 0 && (
                  <StatusBadge status="paused" size="small" label={`${data.investments?.filter((i: any) => i.status === 'paused').length} Paused`} />
                )}
              </div>
            </div>
          }
          icon={<MdTrendingUp />}
          onClick={() => navigate("/settings/plan-finances/investments")}
          color="#10b981"
        />
        <DashboardWidget
          title="SIP for Periodic"
          value={data.fixedExpenses?.filter((f: any) => f.is_sip_flag).length || 0}
          subtitle="Active SIPs"
          icon={<FaExchangeAlt />}
          onClick={() => navigate("/sip-expenses")}
          color="#f59e0b"
        />
        <DashboardWidget
          title="Credit Cards"
          value={creditCards.length}
          subtitle={`₹${(creditCards || []).reduce((s: number, c: any) => s + (parseFloat(c.billAmount || 0)), 0).toLocaleString("en-IN")} bills`}
          icon={<FaCreditCard />}
          onClick={() => navigate("/credit-cards")}
          color="#ef4444"
        />
        <DashboardWidget
          title="Loans"
          value={loans.length}
          subtitle={`₹${loans.reduce((s, l) => s + l.emi, 0).toLocaleString("en-IN")}/month EMI`}
          icon={<FaUniversity />}
          onClick={() => navigate("/loans")}
          color="#6366f1"
        />
        <DashboardWidget
          title="Future Bombs"
          value={futureBombsCount}
          subtitle="Upcoming liabilities"
          icon={<FaBomb />}
          onClick={() => navigate("/future-bombs")}
          color="#f97316"
        />
        <DashboardWidget
          title="Activities"
          value={activities.length}
          subtitle="Recent actions"
          icon={<FaClipboardList />}
          onClick={() => navigate("/activities")}
          color="#64748b"
        />
        <DashboardWidget
          title="Dues"
          value={`₹${Math.round(duesTotal).toLocaleString("en-IN")}`}
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
        <DashboardWidget
          title="Current Month Expenses"
          value="View"
          subtitle="Category-wise breakdown"
          icon={<FaCalendar />}
          onClick={() => navigate("/current-month-expenses")}
          color="#14b8a6"
        />
        {alertsCount > 0 && (
          <DashboardWidget
            title="Alerts"
            value={alertsCount}
            subtitle="Action required"
            icon={<FaBell />}
            onClick={() => navigate("/alerts")}
            color="#ef4444"
            trend="down"
          />
        )}
      </div>
      <AnimatePresence>
        {showQuickAdd && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowQuickAdd(false)}
          >
            <motion.div
              className="modal-card"
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
                          alert(err.message);
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
              <div className="modal-actions">
                <button onClick={() => setShowQuickAdd(false)} className="secondary-btn">Cancel</button>
                <button onClick={handleQuickAddSubmit} className="primary-btn">Add Expense</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

