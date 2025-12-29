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

      console.log("📊 Sanitized activities:", sanitizedActivities);
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
            <span className="logo-text">MoneyMate</span>
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

              switch (activity.action) {
                case 'created':
                case 'added':
                case 'added income source':
                case 'added fixed expense':
                case 'added variable expense plan':
                case 'added investment':
                  // Build detailed message based on entity type and payload
                  let details = '';
                  
                  if (activity.entity === 'income' && payload.name && payload.amount) {
                    details = `${formatCurrency(payload.amount)} for ${payload.name}`;
                  } else if (activity.entity === 'fixed_expense' && payload.name && payload.amount) {
                    details = `${formatCurrency(payload.amount)} for ${payload.name}`;
                  } else if (activity.entity === 'variable_expense_plan' && payload.name && payload.planned) {
                    details = `${formatCurrency(payload.planned)} for ${payload.name}`;
                  } else if (activity.entity === 'investment' && payload.name && payload.monthlyAmount) {
                    details = `${formatCurrency(payload.monthlyAmount)}/month for ${payload.name}`;
                  } else if (payload.name) {
                    // Fallback: just use name if available
                    details = `for ${payload.name}`;
                  } else if (payload.amount) {
                    // Fallback: just use amount if available
                    details = formatCurrency(payload.amount);
                  }
                  
                  return details 
                    ? `${username} added ${entity} ${details}`
                    : `${username} added ${entity}`;
                case 'updated':
                  return `${username} updated ${entity} ${payload.name || ''}`.trim();
                case 'deleted':
                  return `${username} deleted ${entity} ${payload.name || ''}`.trim();
                case 'paid':
                  return `${username} marked ${entity} as paid`;
                case 'unpaid':
                  return `${username} unmarked ${entity} payment`;
                default:
                  return `${username} ${activity.action} ${entity} ${payload.name || ''}`.trim();
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

