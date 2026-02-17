import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useEncryptedApiCalls } from "../hooks/useEncryptedApiCalls";
import { useSharedView } from "../hooks/useSharedView";
import { FaClipboardList, FaMoneyBillWave, FaWallet, FaChartBar, FaChartLine, FaCreditCard, FaUniversity, FaBomb, FaHandshake, FaBell, FaFileAlt, FaHistory, FaCalendarAlt, FaUsers, FaUserCircle, FaFilter, FaChevronDown, FaChevronUp } from "react-icons/fa";
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

const ENTITY_LABELS: Record<string, string> = {
  income: "Income",
  fixed: "Fixed Expense",
  fixed_expense: "Fixed Expense",
  variable: "Variable Expense",
  variable_expense: "Variable Expense",
  variable_expense_plan: "Variable Plan",
  investment: "Investment",
  credit_card: "Credit Card",
  loan: "Loan",
  future_bomb: "Future Bomb",
  sharing: "Sharing",
  alert: "Alert",
  system: "System",
};

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
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  const { selectedView, isSharedView, getOwnerName, isOwnItem, formatSharedField } = useSharedView(token);

  useEffect(() => {
    loadActivities();
  }, [startDate, endDate, usePeriodFilter, selectedView]);

  const loadActivities = async () => {
    try {
      const res = await api.fetchActivity(token, undefined, undefined, selectedView);

      const sanitizedActivities = (res.data || []).map((activity: any) => {
        let parsedPayload = activity.payload;
        if (typeof parsedPayload === 'string') {
          try { parsedPayload = JSON.parse(parsedPayload); } catch (e) { parsedPayload = {}; }
        }
        return {
          ...activity,
          id: activity.id || activity._id || Math.random().toString(),
          entity: String(activity.entity || 'unknown'),
          action: String(activity.action || 'action'),
          createdAt: activity.createdAt || activity.created_at || new Date().toISOString(),
          payload: parsedPayload
        };
      });

      sanitizedActivities.sort((a: any, b: any) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      const seenMonths = new Set<string>();
      const filteredActivities = sanitizedActivities.filter((a: any) => {
        if (a.entity === 'system' && a.action === 'monthly_reset') {
          const month = a.payload?.month || 'unknown';
          if (seenMonths.has(month)) return false;
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

  const getEntityColor = (entity: string) => {
    const colorMap: Record<string, string> = {
      income: '#10b981',
      fixed: '#f59e0b',
      fixed_expense: '#f59e0b',
      variable: '#8b5cf6',
      variable_expense: '#8b5cf6',
      variable_expense_plan: '#8b5cf6',
      investment: '#3b82f6',
      credit_card: '#ec4899',
      loan: '#6366f1',
      future_bomb: '#ef4444',
      sharing: '#14b8a6',
      alert: '#f97316',
      system: '#64748b',
    };
    return colorMap[entity] || '#64748b';
  };

  // Format currency
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

  // Get action message for activity
  const getActionMessage = (activity: any) => {
    const username = activity.username || 'Someone';
    const entity = activity.entity.replace(/_/g, ' ');
    const payload = activity.payload || {};

    switch (activity.action) {
      case 'created':
      case 'added':
      case 'added income source':
        if (activity.entity === 'income' && payload.name && payload.amount) {
          const frequency = payload.frequency ? ` (${payload.frequency})` : '';
          return `${username} added income source ${formatCurrency(payload.amount)}${frequency} for ${payload.name}`;
        }
        if (activity.entity === 'credit_card' && payload.name) {
          const billInfo = payload.billAmount ? ` with bill ₹${payload.billAmount}` : '';
          return `${username} added credit card "${payload.name}"${billInfo}`;
        }
        return `${username} added ${entity}`;
      case 'added actual expense': {
        const planName = payload.planName || payload.plan || payload.name || 'expense';
        const amount = payload.amount || 0;
        const paymentMode = payload.paymentMode ? ` via ${payload.paymentMode}` : '';
        if (amount > 0) return `${username} spent ${formatCurrency(amount)} on ${planName}${paymentMode}`;
        return `${username} added actual expense`;
      }
      case 'added fixed expense':
        if (payload.name && payload.amount) {
          return `${username} added fixed expense ${formatCurrency(payload.amount)} for ${payload.name}`;
        }
        return `${username} added fixed expense`;
      case 'added variable expense plan':
        if (payload.name && payload.planned) {
          return `${username} planned ${formatCurrency(payload.planned)} for ${payload.name}`;
        }
        return `${username} added variable expense plan`;
      case 'added investment': {
        const invAmount = payload.monthlyAmount || payload.monthly_amount || 0;
        const invName = payload.name || '';
        if (invAmount > 0 || invName) return `${username} added investment "${invName}" ${invAmount > 0 ? formatCurrency(invAmount) + '/month' : ''}`.trim();
        return `${username} added investment`;
      }
      case 'payment':
        if (activity.entity === 'credit_card' && payload.amount) {
          const cardName = payload.cardName || 'credit card';
          return `${username} paid ${formatCurrency(payload.amount)} on ${cardName}`;
        }
        return `${username} made payment ${payload.amount ? formatCurrency(payload.amount) : ''}`.trim();
      case 'updated_bill':
        if (activity.entity === 'credit_card' && payload.billAmount) {
          return `${username} updated bill to ${formatCurrency(payload.billAmount)} for ${payload.cardName || 'credit card'}`;
        }
        return `${username} updated ${entity} bill`;
      case 'updated':
        return `${username} updated ${entity}${payload.name ? ` "${payload.name}"` : ''}`;
      case 'deleted':
        return `${username} deleted ${entity}${payload.name ? ` "${payload.name}"` : ''}`;
      case 'paid': {
        const name = payload.name || '';
        if (payload.amount && name) return `${username} marked "${name}" as paid (${formatCurrency(payload.amount)})`;
        if (name) return `${username} marked "${name}" as paid`;
        return `${username} marked ${entity} as paid`;
      }
      case 'unpaid':
        return `${username} unmarked "${payload.name || entity}" payment`;
      case 'overspend_detected':
        return `Overspend detected on "${payload.planName || 'plan'}" — spent ${formatCurrency(payload.actual || 0)} vs planned ${formatCurrency(payload.planned || 0)}`;
      case 'monthly_reset':
        return `Monthly billing cycle reset for ${payload.month || 'new period'}`;
      default: {
        let details = '';
        if (payload.name) details += ` ${payload.name}`;
        if (payload.amount) details += ` (${formatCurrency(payload.amount)})`;
        return `${username} ${activity.action} ${entity}${details}`.trim();
      }
    }
  };

  // Get payload detail items for expanded view
  const getPayloadDetails = (activity: any) => {
    const payload = activity.payload || {};
    const details: { label: string; value: string }[] = [];

    if (payload.name) details.push({ label: "Name", value: payload.name });
    if (payload.amount) details.push({ label: "Amount", value: formatCurrency(payload.amount) });
    if (payload.planned) details.push({ label: "Planned", value: formatCurrency(payload.planned) });
    if (payload.actual) details.push({ label: "Actual", value: formatCurrency(payload.actual) });
    if (payload.monthlyAmount || payload.monthly_amount) details.push({ label: "Monthly", value: formatCurrency(payload.monthlyAmount || payload.monthly_amount) });
    if (payload.billAmount) details.push({ label: "Bill", value: formatCurrency(payload.billAmount) });
    if (payload.frequency) details.push({ label: "Frequency", value: payload.frequency });
    if (payload.category) details.push({ label: "Category", value: payload.category });
    if (payload.subcategory && payload.subcategory !== 'Unspecified') details.push({ label: "Subcategory", value: payload.subcategory });
    if (payload.paymentMode) details.push({ label: "Payment Mode", value: payload.paymentMode });
    if (payload.creditCard) details.push({ label: "Credit Card", value: payload.creditCard });
    if (payload.justification) details.push({ label: "Note", value: payload.justification });
    if (payload.goal) details.push({ label: "Goal", value: payload.goal });
    if (payload.status) details.push({ label: "Status", value: payload.status });
    if (payload.planName) details.push({ label: "Plan", value: payload.planName });
    if (payload.cardName) details.push({ label: "Card", value: payload.cardName });
    if (payload.overspend) details.push({ label: "Overspend", value: formatCurrency(payload.overspend) });
    if (payload.billingPeriod) details.push({ label: "Billing Period", value: payload.billingPeriod });
    if (payload.month) details.push({ label: "Month", value: payload.month });
    if (payload.previousMonth) details.push({ label: "Previous Month", value: payload.previousMonth });

    return details;
  };

  // Get unique entity types for filter
  const entityTypes = Array.from(new Set(activities.map(a => a.entity))).sort();

  // Filtered activities
  const filteredActivities = entityFilter === 'all'
    ? activities
    : activities.filter(a => a.entity === entityFilter);

  return (
    <div className="activities-page">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
          <h1><FaClipboardList style={{ marginRight: 12, verticalAlign: "middle" }} />Activity Log</h1>
          <PageInfoButton
            title="Activity Log"
            description="View a complete history of all your financial activities including income additions, expense tracking, investments, credit card transactions, and more."
            impact="The activity log helps you track all changes to your financial data."
            howItWorks={[
              "All financial actions are automatically logged with timestamps",
              "View detailed information including amounts, categories, and payment modes",
              "Filter activities by type and date range",
              "Expand any activity to see full details"
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

      {/* Filters Row */}
      <div className="activities-filters">
        {/* Entity Filter */}
        <div className="filter-group">
          <FaFilter style={{ marginRight: 6, opacity: 0.5 }} />
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="entity-filter-select"
          >
            <option value="all">All Types ({activities.length})</option>
            {entityTypes.map(type => {
              const count = activities.filter(a => a.entity === type).length;
              return (
                <option key={type} value={type}>
                  {ENTITY_LABELS[type] || type} ({count})
                </option>
              );
            })}
          </select>
        </div>

        {/* Period Filter */}
        <div className="filter-group">
          <label className="period-toggle">
            <input
              type="checkbox"
              checked={usePeriodFilter}
              onChange={(e) => {
                setUsePeriodFilter(e.target.checked);
                if (!e.target.checked) { setStartDate(""); setEndDate(""); }
              }}
            />
            <FaCalendarAlt style={{ marginRight: 4, opacity: 0.5 }} />
            <span>Date Range</span>
          </label>
          {usePeriodFilter && (
            <div className="date-range-inputs">
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="date-input" />
              <span className="date-separator">→</span>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="date-input" />
              {(startDate || endDate) && (
                <button className="clear-filter-button" onClick={() => { setStartDate(""); setEndDate(""); }}>Clear</button>
              )}
            </div>
          )}
        </div>
      </div>

      <ActivityHistoryModal
        token={token}
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        selectedMonth={selectedMonth}
      />

      {/* Content */}
      {loading ? (
        <SkeletonLoader type="list" count={5} />
      ) : filteredActivities.length === 0 ? (
        <div className="empty-state">
          <FaClipboardList size={56} color="var(--text-tertiary)" />
          <h3>No Activities Found</h3>
          <p>{entityFilter !== 'all' ? `No ${ENTITY_LABELS[entityFilter] || entityFilter} activities yet.` : 'Start using the app to see your activity log!'}</p>
        </div>
      ) : (
        <div className="activities-timeline">
          {filteredActivities.map((activity, index) => {
            const isExpanded = expandedId === activity.id;
            const details = getPayloadDetails(activity);
            const entityColor = getEntityColor(activity.entity);

            return (
              <motion.div
                key={activity.id}
                className={`activity-item ${isExpanded ? 'activity-expanded' : ''}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(index * 0.02, 0.5) }}
              >
                <div className="activity-icon" style={{ borderColor: entityColor, color: entityColor }}>
                  {getEntityIcon(activity.entity)}
                </div>
                <div
                  className="activity-content"
                  onClick={() => details.length > 0 ? setExpandedId(isExpanded ? null : activity.id) : null}
                  style={{ cursor: details.length > 0 ? 'pointer' : 'default' }}
                >
                  <div className="activity-top-row">
                    <div className="activity-action">{getActionMessage(activity)}</div>
                    {details.length > 0 && (
                      <span className="activity-expand-icon">
                        {isExpanded ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
                      </span>
                    )}
                  </div>
                  <div className="activity-meta">
                    <span className="activity-time">
                      {(() => {
                        const ts = activity.createdAt;
                        const utcDate = ts.endsWith('Z') || ts.includes('+') ? new Date(ts) : new Date(ts + 'Z');
                        return utcDate.toLocaleString('en-IN', {
                          dateStyle: 'medium', timeStyle: 'short',
                          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                        });
                      })()}
                    </span>
                    <span className="activity-entity-badge" style={{ color: entityColor, borderColor: entityColor }}>
                      {ENTITY_LABELS[activity.entity] || activity.entity}
                    </span>
                  </div>

                  {/* Expandable Details */}
                  <AnimatePresence>
                    {isExpanded && details.length > 0 && (
                      <motion.div
                        className="activity-details"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="activity-details-grid">
                          {details.map((d, i) => (
                            <div key={i} className="activity-detail-item">
                              <span className="detail-label">{d.label}</span>
                              <span className="detail-value">{d.value}</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
