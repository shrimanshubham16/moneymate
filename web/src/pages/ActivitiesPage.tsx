import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useEncryptedApiCalls } from "../hooks/useEncryptedApiCalls";
import { useSharedView } from "../hooks/useSharedView";
import { FaClipboardList, FaMoneyBillWave, FaWallet, FaChartBar, FaChartLine, FaCreditCard, FaUniversity, FaBomb, FaHandshake, FaBell, FaFileAlt, FaHistory, FaCalendarAlt, FaUsers, FaUserCircle } from "react-icons/fa";
import { MdAccountBalanceWallet } from "react-icons/md";
import { IntroModal } from "../components/IntroModal";
import { useIntroModal } from "../hooks/useIntroModal";
import { PageInfoButton } from "../components/PageInfoButton";
import { ActivityHistoryModal } from "../components/ActivityHistoryModal";
import { SkeletonLoader } from "../components/SkeletonLoader";
import "./ActivitiesPage.css";

interface ActivitiesPageProps {
  token: string;
}

export function ActivitiesPage({ token }: ActivitiesPageProps) {
  const navigate = useNavigate();
  const api = useEncryptedApiCalls();
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [usePeriodFilter, setUsePeriodFilter] = useState(false);
  
  // Shared view support - activities are always user-specific but we show attribution
  const { selectedView, isSharedView, getOwnerName, isOwnItem, formatSharedField } = useSharedView(token);

  useEffect(() => {
    loadActivities();
  }, [startDate, endDate, usePeriodFilter, selectedView]);

  const loadActivities = async () => {
    try {
      // Pass view parameter for combined activities
      const res = await api.fetchActivity(token, undefined, undefined, selectedView);
      
      // #region agent log - DEBUG: Raw activities from API
      fetch('http://127.0.0.1:7242/ingest/620c30bd-a4ac-4892-8325-a941881cbeee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ActivitiesPage.tsx:loadActivities',message:'raw activities',data:{count: (res.data || []).length, sample: (res.data || []).slice(0, 3).map((a: any) => ({entity: a.entity, action: a.action, payload: a.payload}))},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'ACT'})}).catch(()=>{});
      // #endregion

      // Ensure each activity has the required fields and sanitize payload
      const sanitizedActivities = (res.data || []).map((activity: any) => {
        // Parse string payload to object if needed
        let parsedPayload = activity.payload;
        if (typeof parsedPayload === 'string') {
          try {
            parsedPayload = JSON.parse(parsedPayload);
          } catch (e) {
            parsedPayload = {};
          }
        }
        
        return {
          ...activity,
          id: activity.id || activity._id || Math.random().toString(),
          entity: String(activity.entity || 'unknown'),
          action: String(activity.action || 'action'),
          createdAt: activity.createdAt || activity.created_at || new Date().toISOString(),
          payload: parsedPayload // Now guaranteed to be object
        };
      });

      // Sort by most recent first (newest at top)
      sanitizedActivities.sort((a: any, b: any) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA; // Descending order (newest first)
      });

      // P0 FIX: Filter out duplicate monthly_reset activities (keep only the most recent one per month)
      const seenMonths = new Set<string>();
      const filteredActivities = sanitizedActivities.filter((a: any) => {
        if (a.entity === 'system' && a.action === 'monthly_reset') {
          const month = a.payload?.month || 'unknown';
          if (seenMonths.has(month)) {
            return false; // Skip duplicate
          }
          seenMonths.add(month);
        }
        return true;
      });

      setActivities(filteredActivities);
    } catch (e) {
      console.error("Failed to load activities:", e);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  const getEntityIcon = (entity: string) => {
    const iconMap: Record<string, JSX.Element> = {
      income: <FaMoneyBillWave />,
      fixed: <FaWallet />,
      fixed_expense: <FaWallet />,
      variable: <FaChartBar />,
      variable_expense: <FaChartBar />,
      variable_expense_plan: <FaChartBar />,
      investment: <FaChartLine />,
      credit_card: <FaCreditCard />,
      loan: <FaUniversity />,
      future_bomb: <FaBomb />,
      sharing: <FaHandshake />,
      alert: <FaBell />,
      system: <MdAccountBalanceWallet />
    };
    return iconMap[entity] || <FaFileAlt />;
  };

  return (
    <div className="activities-page">
      {/* Page Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
          <h1><FaClipboardList style={{ marginRight: 12, verticalAlign: "middle" }} />Activity Log</h1>
          <PageInfoButton
            title="Activity Log"
            description="View a complete history of all your financial activities including income additions, expense tracking, investments, credit card transactions, and more."
            impact="The activity log helps you track all changes to your financial data. Every action you take is recorded with details like amounts, categories, and timestamps for full transparency."
            howItWorks={[
              "All financial actions are automatically logged with timestamps",
              "View detailed information including amounts, categories, and payment modes",
              "Filter activities by type (income, expenses, investments, credit cards, etc.)",
              "See who performed each action (useful for shared accounts)",
              "Activity log helps you audit and understand your financial history"
            ]}
          />
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
          <button
            className="history-button"
            onClick={() => setShowHistoryModal(true)}
            title="View Monthly History & Trends"
          >
            <FaHistory style={{ marginRight: 6 }} />
            History
          </button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="period-selector-container">
        <div className="period-selector">
          <label>
            <FaCalendarAlt style={{ marginRight: 6 }} />
            Period Filter:
          </label>
          <input
            type="checkbox"
            checked={usePeriodFilter}
            onChange={(e) => {
              setUsePeriodFilter(e.target.checked);
              if (!e.target.checked) {
                setStartDate("");
                setEndDate("");
              }
            }}
          />
          <span>Enable</span>
          {usePeriodFilter && (
            <>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                placeholder="Start Date"
                className="date-input"
              />
              <span>to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                placeholder="End Date"
                className="date-input"
              />
              {(startDate || endDate) && (
                <button
                  className="clear-filter-button"
                  onClick={() => {
                    setStartDate("");
                    setEndDate("");
                  }}
                >
                  Clear
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* History Modal */}
      <ActivityHistoryModal
        token={token}
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        selectedMonth={selectedMonth}
      />

      {/* Content */}
      {loading ? (
        <SkeletonLoader type="list" count={5} />
      ) : activities.length === 0 ? (
        <div className="empty-state">
          <FaClipboardList size={64} color="#cbd5e1" />
          <p>No activities yet. Start using the app to see your activity log!</p>
        </div>
      ) : (
        <div className="activities-timeline">
          {activities.map((activity, index) => {
            // Format the action message
            const getActionMessage = () => {
              const username = activity.username || 'Someone';
              const entity = activity.entity.replace(/_/g, ' ');
              const payload = activity.payload || {};

              // Helper to format currency
              const formatCurrency = (amount: number) => {
                return new Intl.NumberFormat('en-IN', {
                  style: 'currency',
                  currency: 'INR',
                  maximumFractionDigits: 0
                }).format(amount);
              };
              
              switch (activity.action) {
                case 'created':
                case 'added':
                case 'added income source':
                  if (activity.entity === 'income' && payload.name && payload.amount) {
                    const frequency = payload.frequency ? ` (${payload.frequency})` : '';
                    return `${username} added income source ${formatCurrency(payload.amount)}${frequency} for ${payload.name}`;
                  }
                  return `${username} added ${entity}`;
                case 'added actual expense':
                  // Variable expense actual - handle multiple payload formats
                  const expPlanName = payload.planName || payload.plan || payload.name || 'expense';
                  const expAmount = payload.amount || 0;
                  const expCategory = payload.category ? ` in ${payload.category}` : '';
                  const expSubcategory = payload.subcategory && payload.subcategory !== 'Unspecified' ? ` (${payload.subcategory})` : '';
                  const expPaymentMode = payload.paymentMode ? ` via ${payload.paymentMode}` : '';
                  const expCreditCard = payload.creditCard ? ` using ${payload.creditCard}` : '';
                  const expJustification = payload.justification ? ` - "${payload.justification}"` : '';
                  if (expAmount > 0) {
                    return `${username} spent ${formatCurrency(expAmount)} on ${expPlanName}${expCategory}${expSubcategory}${expPaymentMode}${expCreditCard}${expJustification}`;
                  }
                  return `${username} added actual expense`;
                case 'added fixed expense':
                  if (payload.name && payload.amount) {
                    const frequency = payload.frequency ? ` (${payload.frequency})` : '';
                    const category = payload.category ? ` in ${payload.category}` : '';
                    return `${username} added fixed expense ${formatCurrency(payload.amount)}${frequency} for ${payload.name}${category}`;
                  }
                  return `${username} added fixed expense`;
                case 'added variable expense plan':
                  if (payload.name && payload.planned) {
                    const category = payload.category ? ` in ${payload.category}` : '';
                    return `${username} added variable expense plan ${formatCurrency(payload.planned)} for ${payload.name}${category}`;
                  }
                  return `${username} added variable expense plan`;
                case 'added investment':
                  // Handle both camelCase and snake_case field names
                  const invAmount = payload.monthlyAmount || payload.monthly_amount || 0;
                  const invName = payload.name || '';
                  const invGoal = payload.goal ? ` (Goal: ${payload.goal})` : '';
                  const invStatus = payload.status ? ` [${payload.status}]` : '';
                  if (invAmount > 0 || invName) {
                    return `${username} added investment${invName ? ` "${invName}"` : ''} ${invAmount > 0 ? formatCurrency(invAmount) + '/month' : ''}${invGoal}${invStatus}`.trim();
                  }
                  return `${username} added investment`;
                case 'payment':
                  if (activity.entity === 'credit_card' && payload.id && payload.amount) {
                    const cardName = payload.cardName || 'credit card';
                    return `${username} paid ${formatCurrency(payload.amount)} on ${cardName}`;
                  }
                  return `${username} made payment ${payload.amount ? formatCurrency(payload.amount) : ''}`.trim();
                case 'updated_bill':
                  if (activity.entity === 'credit_card' && payload.id && payload.billAmount) {
                    const cardName = payload.cardName || 'credit card';
                    return `${username} updated bill amount to ${formatCurrency(payload.billAmount)} for ${cardName}`;
                  }
                  return `${username} updated ${entity} bill`;
                case 'updated':
                  if (payload.name) {
                    return `${username} updated ${entity} ${payload.name}`;
                  }
                  return `${username} updated ${entity}`;
                case 'deleted':
                  if (payload.name) {
                    return `${username} deleted ${entity} ${payload.name}`;
                  }
                  return `${username} deleted ${entity}`;
                case 'paid':
                  const paidName = payload.name || '';
                  if (payload.amount && paidName) {
                    return `${username} marked ${entity} "${paidName}" as paid (${formatCurrency(payload.amount)})`;
                  } else if (payload.amount) {
                    return `${username} marked ${entity} as paid (${formatCurrency(payload.amount)})`;
                  } else if (paidName) {
                    return `${username} marked ${entity} "${paidName}" as paid`;
                  }
                  return `${username} marked ${entity} as paid`;
                case 'unpaid':
                  const unpaidName = payload.name || '';
                  if (unpaidName) {
                    return `${username} unmarked ${entity} "${unpaidName}" payment`;
                  }
                  return `${username} unmarked ${entity} payment`;
                default:
                  // Enhanced default message with available payload data
                  let defaultDetails = '';
                  if (payload.name) defaultDetails += ` ${payload.name}`;
                  if (payload.amount) defaultDetails += ` (${formatCurrency(payload.amount)})`;
                  if (payload.planned) defaultDetails += ` (Planned: ${formatCurrency(payload.planned)})`;
                  return `${username} ${activity.action} ${entity}${defaultDetails}`.trim();
              }
            };

            return (
              <motion.div
                key={activity.id}
                className="activity-item"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <div className="activity-icon">{getEntityIcon(activity.entity)}</div>
                <div className="activity-content">
                  <div className="activity-action">{getActionMessage()}</div>
                  <div className="activity-time">
                    {(() => {
                      // Handle timestamps - ensure proper timezone conversion
                      const timestamp = activity.createdAt;
                      // If timestamp doesn't have timezone indicator, assume UTC
                      const utcDate = timestamp.endsWith('Z') || timestamp.includes('+') 
                        ? new Date(timestamp)
                        : new Date(timestamp + 'Z');
                      return utcDate.toLocaleString('en-IN', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone // Use browser's timezone
                      });
                    })()}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

