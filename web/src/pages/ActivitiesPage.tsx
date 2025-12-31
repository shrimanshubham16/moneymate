import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { fetchActivity } from "../api";
import { FaClipboardList, FaMoneyBillWave, FaWallet, FaChartBar, FaChartLine, FaCreditCard, FaUniversity, FaBomb, FaHandshake, FaBell, FaFileAlt, FaHistory } from "react-icons/fa";
import { MdAccountBalanceWallet } from "react-icons/md";
import { IntroModal } from "../components/IntroModal";
import { useIntroModal } from "../hooks/useIntroModal";
import { PageInfoButton } from "../components/PageInfoButton";
import "./ActivitiesPage.css";

interface ActivitiesPageProps {
  token: string;
}

export function ActivitiesPage({ token }: ActivitiesPageProps) {
  const navigate = useNavigate();
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    try {
      console.log("🔍 Loading activities...");
      const res = await fetchActivity(token);
      console.log("✅ Activities loaded:", res.data);

      // Ensure each activity has the required fields and sanitize payload
      const sanitizedActivities = (res.data || []).map((activity: any) => ({
        ...activity,
        id: activity.id || activity._id || Math.random().toString(),
        entity: String(activity.entity || 'unknown'),
        action: String(activity.action || 'action'),
        createdAt: activity.createdAt || new Date().toISOString(),
        payload: activity.payload // Keep as-is, will stringify in render
      }));

      // Sort by most recent first (newest at top)
      sanitizedActivities.sort((a: any, b: any) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA; // Descending order (newest first)
      });

      console.log(" Sanitized activities:", sanitizedActivities);
      setActivities(sanitizedActivities);
    } catch (e) {
      console.error("❌ Failed to load activities:", e);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  const getEntityIcon = (entity: string) => {
    const iconMap: Record<string, JSX.Element> = {
      income: <FaMoneyBillWave />,
      fixed: <FaWallet />,
      variable: <FaChartBar />,
      investment: <FaChartLine />,
      credit_card: <FaCreditCard />,
      loan: <FaUniversity />,
      future_bomb: <FaBomb />,
      sharing: <FaHandshake />,
      alert: <FaBell />
    };
    return iconMap[entity] || <FaFileAlt />;
  };

  console.log("🎬 ActivitiesPage render:", { loading, activitiesCount: activities.length });

  return (
    <div className="activities-page">
      {/* App Header */}
      <header className="activities-app-header">
        <div className="header-left">
          <button
            className="logo-button"
            onClick={() => navigate("/dashboard")}
            title="Go to Dashboard"
          >
            <span className="logo-icon"><MdAccountBalanceWallet size={28} /></span>
            <span className="logo-text">FinFlow</span>
          </button>
        </div>
        <div className="header-right">
          <button className="header-nav-button" onClick={() => navigate("/settings")}>
            Settings
          </button>
        </div>
      </header>

      {/* Page Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center' }}>
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
      </div>

      {/* Content */}
      {loading ? (
        <div className="loading-state">Loading activities...</div>
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

              // Debug: Log ALL activities for inspection
              console.log('[ACTIVITY_DEBUG] Processing activity:', {
                action: activity.action, 
                entity: activity.entity, 
                payload,
                hasPayload: !!payload,
                payloadKeys: Object.keys(payload || {})
              });
              
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
                  // Variable expense actual
                  const planName = payload.planName || 'expense';
                  const category = payload.category ? ` in ${payload.category}` : '';
                  const subcategory = payload.subcategory && payload.subcategory !== 'Unspecified' ? ` (${payload.subcategory})` : '';
                  const paymentMode = payload.paymentMode ? ` via ${payload.paymentMode}` : '';
                  const creditCard = payload.creditCard ? ` using ${payload.creditCard}` : '';
                  const justification = payload.justification ? ` - "${payload.justification}"` : '';
                  return `${username} spent ${formatCurrency(payload.amount)} on ${planName}${category}${subcategory}${paymentMode}${creditCard}${justification}`;
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
                  if (payload.monthlyAmount) {
                    const goal = payload.goal ? ` (Goal: ${payload.goal})` : '';
                    const status = payload.status ? ` [${payload.status}]` : '';
                    return `${username} added investment ${formatCurrency(payload.monthlyAmount)}/month${goal}${status}`;
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
                    {new Date(activity.createdAt).toLocaleString('en-IN', {
                      dateStyle: 'medium',
                      timeStyle: 'short'
                    })}
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

