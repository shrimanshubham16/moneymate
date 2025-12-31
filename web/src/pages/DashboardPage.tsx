import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FaWallet, FaChartLine, FaChartBar, FaUniversity, FaCreditCard,
  FaBomb, FaClipboardList, FaClock, FaCalendar, FaBell, FaMoneyBillWave,
  FaExchangeAlt, FaHandHoldingUsd
} from "react-icons/fa";
import { MdAccountBalanceWallet, MdSavings, MdTrendingUp } from "react-icons/md";
import { fetchDashboard, fetchCreditCards, fetchLoans, fetchActivity, fetchSharingMembers } from "../api";
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
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0); // Track loading progress
  const [isStale, setIsStale] = useState(false); // Track if showing stale data
  const [isStale, setIsStale] = useState(false); // Track if showing stale data
  const [creditCards, setCreditCards] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [sharingMembers, setSharingMembers] = useState<any>({ members: [] });
  const { showIntro, closeIntro } = useIntroModal("dashboard");
  const keepAliveIntervalRef = useRef<number | null>(null);

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/";
  };

  // Background revalidation function
  const fetchFreshData = async (userId: string, wasStale = false) => {
    try {
      const [dashboardRes, cardsRes, loansRes, activityRes, membersRes] = await Promise.all([
        fetchDashboard(token, new Date().toISOString()),
        fetchCreditCards(token),
        fetchLoans(token),
        fetchActivity(token),
        fetchSharingMembers(token)
      ]);
      
      // Update state with fresh data (seamless refresh)
      setData(dashboardRes.data);
      setCreditCards(cardsRes.data);
      setLoans(loansRes.data);
      setActivities(activityRes.data);
      setSharingMembers(membersRes.data);
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

  const loadData = async (forceRefresh = false) => {
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
        setSharingMembers({ members: [] });
        setLoading(false);
        setLoadProgress(100);
        setIsStale(isDataStale);
        
        if (isDataStale) {
          console.log('[OFFLINE_FIRST] Showing stale cache to prevent blank screen');
        } else {
          console.log('[CACHE_HIT_CLIENT] Using cached dashboard data - instant load!');
        }
        
        // REVALIDATE: Fetch fresh data in background
        console.log('[REVALIDATE] Fetching fresh data in background...');
        fetchFreshData(userId, isDataStale).catch(err => {
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
      
      const [dashboardRes, cardsRes, loansRes, activityRes, membersRes] = await Promise.all([
        (async () => {
          // #region agent log
          const t0 = performance.now();
          // #endregion
          const res = await fetchDashboard(token, new Date().toISOString());
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
          const res = await fetchCreditCards(token);
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
          const res = await fetchLoans(token);
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
          const res = await fetchActivity(token);
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
          const res = await fetchSharingMembers(token);
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

  if (loading) {
    return <SplashScreen isLoading={loading} progress={loadProgress} />;
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
  const unpaidFixed = data.fixedExpenses?.filter((f: any) => !f.paid).reduce((sum: number, f: any) => {
    const monthly = f.frequency === "monthly" ? f.amount : f.frequency === "quarterly" ? f.amount / 3 : f.amount / 12;
    return sum + (monthly || 0);
  }, 0) || 0;
  const unpaidInvestments = data.investments?.filter((i: any) => !i.paid).reduce((sum: number, i: any) => sum + (i.monthlyAmount || 0), 0) || 0;
  // Loans are excluded from dues as they're auto-tracked from fixed expenses and not separately markable
  // const unpaidLoans = loans.filter((l: any) => !l.paid).reduce((sum, l) => sum + (l.emi || 0), 0);
  const creditCardDues = (creditCards || []).reduce((sum: number, c: any) => {
    const billAmount = parseFloat(c.billAmount || 0);
    const paidAmount = parseFloat(c.paidAmount || 0);
    return sum + Math.max(0, billAmount - paidAmount);
  }, 0);

  const duesTotal = (unpaidFixed || 0) + (unpaidInvestments || 0) + (creditCardDues || 0);

  return (
    <div className="dashboard-page">
      {/* Stale Data Banner */}
      {isStale && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
          color: 'white',
          padding: '8px 16px',
          textAlign: 'center',
          fontSize: '14px',
          fontWeight: 500,
          zIndex: 1000,
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          animation: 'pulse 2s ease-in-out infinite'
        }}>
          ⚠️ Showing cached data - Refreshing in background...
        </div>
      )}
      
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
        <HealthIndicator
          category={data.health.category}
          remaining={data.health.remaining}
          onClick={() => navigate("/health")}
        />
      </motion.div>

      <div className="widgets-grid">
        <DashboardWidget
          title="Variable Expenses"
          value={data.variablePlans?.length || 0}
          subtitle={
            <div style={{ marginTop: 8 }}>
              <TrendIndicator
                value={variableTotal}
                format="currency"
                size="small"
              />
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
    </div>
  );
}

