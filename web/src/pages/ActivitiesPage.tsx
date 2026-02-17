import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useEncryptedApiCalls } from "../hooks/useEncryptedApiCalls";
import { useSharedView } from "../hooks/useSharedView";
import {
  FaClipboardList, FaMoneyBillWave, FaWallet, FaChartBar, FaChartLine,
  FaCreditCard, FaUniversity, FaBomb, FaHandshake, FaBell, FaFileAlt,
  FaHistory, FaCalendarAlt, FaFilter, FaChevronDown, FaChevronUp,
  FaThumbtack, FaComment, FaTimes, FaPaperPlane, FaTrashAlt
} from "react-icons/fa";
import { MdAccountBalanceWallet } from "react-icons/md";
import { PageInfoButton } from "../components/PageInfoButton";
import { ActivityHistoryModal } from "../components/ActivityHistoryModal";
import { SkeletonLoader } from "../components/SkeletonLoader";
import * as social from "../lib/activitySocial";
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

  // Pins state
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const [pinLoading, setPinLoading] = useState<Set<string>>(new Set());

  // Comments state
  const [commentCounts, setCommentCounts] = useState<Map<string, number>>(new Map());
  const [comments, setComments] = useState<Map<string, social.ActivityComment[]>>(new Map());
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [commentSending, setCommentSending] = useState<Set<string>>(new Set());

  // Refs
  const commentEndRef = useRef<Record<string, HTMLDivElement | null>>({});
  const activityRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const { selectedView, isSharedView } = useSharedView(token);
  const { userId, username } = useMemo(() => social.getUserFromToken(token), [token]);

  // ─── Load Activities ───
  useEffect(() => {
    loadActivities();
  }, [startDate, endDate, usePeriodFilter, selectedView]);

  // ─── Load Pins ───
  useEffect(() => {
    if (!userId) return;
    social.fetchPins(userId).then((pins) => {
      setPinnedIds(new Set(pins.map((p) => p.activity_id)));
    });
  }, [userId]);

  // ─── Load Comment Counts (after activities load) ───
  useEffect(() => {
    if (activities.length === 0) return;
    const ids = activities.map((a) => a.id);
    social.getCommentCounts(ids).then(setCommentCounts);
  }, [activities]);

  // ─── Load Comments for expanded activity ───
  useEffect(() => {
    if (!expandedId) return;
    social.fetchComments([expandedId]).then((map) => {
      setComments((prev) => {
        const next = new Map(prev);
        next.set(expandedId, map.get(expandedId) || []);
        return next;
      });
    });
  }, [expandedId]);

  // ─── Realtime comment subscription ───
  useEffect(() => {
    const unsub = social.subscribeToComments((newComment) => {
      // Update comment list for that activity
      setComments((prev) => {
        const next = new Map(prev);
        const arr = next.get(newComment.activity_id) || [];
        // Don't duplicate if optimistic already added it
        if (!arr.find((c) => c.id === newComment.id)) {
          next.set(newComment.activity_id, [...arr, newComment]);
        }
        return next;
      });
      // Update count
      setCommentCounts((prev) => {
        const next = new Map(prev);
        next.set(newComment.activity_id, (next.get(newComment.activity_id) || 0) + 1);
        return next;
      });
    });
    return () => {
      unsub();
      social.cleanup();
    };
  }, []);

  const loadActivities = async () => {
    try {
      const res = await api.fetchActivity(token, undefined, undefined, selectedView);

      const sanitizedActivities = (res.data || []).map((activity: any) => {
        let parsedPayload = activity.payload;
        if (typeof parsedPayload === "string") {
          try {
            parsedPayload = JSON.parse(parsedPayload);
          } catch {
            parsedPayload = {};
          }
        }
        return {
          ...activity,
          id: activity.id || activity._id || Math.random().toString(),
          entity: String(activity.entity || "unknown"),
          action: String(activity.action || "action"),
          createdAt: activity.createdAt || activity.created_at || new Date().toISOString(),
          payload: parsedPayload,
        };
      });

      sanitizedActivities.sort(
        (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      const seenMonths = new Set<string>();
      const filtered = sanitizedActivities.filter((a: any) => {
        if (a.entity === "system" && a.action === "monthly_reset") {
          const month = a.payload?.month || "unknown";
          if (seenMonths.has(month)) return false;
          seenMonths.add(month);
        }
        return true;
      });

      setActivities(filtered);
    } catch (e) {
      console.error("Failed to load activities:", e);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  // ─── Pin Handlers ───
  const handlePin = useCallback(
    async (activityId: string) => {
      if (pinnedIds.size >= social.MAX_PINS && !pinnedIds.has(activityId)) {
        return; // max reached
      }
      const wasPinned = pinnedIds.has(activityId);

      // Optimistic
      setPinnedIds((prev) => {
        const next = new Set(prev);
        wasPinned ? next.delete(activityId) : next.add(activityId);
        return next;
      });
      setPinLoading((prev) => new Set(prev).add(activityId));

      try {
        if (wasPinned) {
          await social.unpinActivity(userId, activityId);
        } else {
          await social.pinActivity(userId, activityId);
        }
      } catch {
        // Revert
        setPinnedIds((prev) => {
          const next = new Set(prev);
          wasPinned ? next.add(activityId) : next.delete(activityId);
          return next;
        });
      } finally {
        setPinLoading((prev) => {
          const next = new Set(prev);
          next.delete(activityId);
          return next;
        });
      }
    },
    [pinnedIds, userId],
  );

  const handleUnpinAll = useCallback(async () => {
    const oldPins = new Set(pinnedIds);
    setPinnedIds(new Set());
    try {
      await social.unpinAll(userId);
    } catch {
      setPinnedIds(oldPins);
    }
  }, [pinnedIds, userId]);

  // ─── Comment Handlers ───
  const handleSendComment = useCallback(
    async (activityId: string) => {
      const text = (commentText[activityId] || "").trim();
      if (!text || commentSending.has(activityId)) return;

      // Optimistic insert
      const optimistic: social.ActivityComment = {
        id: `opt-${Date.now()}`,
        activity_id: activityId,
        user_id: userId,
        username,
        comment: text.slice(0, 300),
        created_at: new Date().toISOString(),
        _optimistic: true,
      };

      setComments((prev) => {
        const next = new Map(prev);
        const arr = next.get(activityId) || [];
        next.set(activityId, [...arr, optimistic]);
        return next;
      });
      setCommentText((prev) => ({ ...prev, [activityId]: "" }));
      setCommentSending((prev) => new Set(prev).add(activityId));

      try {
        const real = await social.addComment(activityId, userId, username, text);
        // Replace optimistic with real
        setComments((prev) => {
          const next = new Map(prev);
          const arr = (next.get(activityId) || []).map((c) =>
            c.id === optimistic.id ? { ...real, _optimistic: false } : c,
          );
          // Deduplicate in case realtime already delivered it
          const seen = new Set<string>();
          const deduped = arr.filter((c) => {
            if (seen.has(c.id)) return false;
            seen.add(c.id);
            return true;
          });
          next.set(activityId, deduped);
          return next;
        });
        // Update count
        setCommentCounts((prev) => {
          const next = new Map(prev);
          next.set(activityId, (next.get(activityId) || 0) + 1);
          return next;
        });
      } catch {
        // Remove optimistic on failure
        setComments((prev) => {
          const next = new Map(prev);
          const arr = (next.get(activityId) || []).filter((c) => c.id !== optimistic.id);
          next.set(activityId, arr);
          return next;
        });
      } finally {
        setCommentSending((prev) => {
          const next = new Set(prev);
          next.delete(activityId);
          return next;
        });
      }
    },
    [commentText, commentSending, userId, username],
  );

  const handleDeleteComment = useCallback(
    async (activityId: string, commentId: string) => {
      // Optimistic remove
      setComments((prev) => {
        const next = new Map(prev);
        const arr = (next.get(activityId) || []).filter((c) => c.id !== commentId);
        next.set(activityId, arr);
        return next;
      });
      setCommentCounts((prev) => {
        const next = new Map(prev);
        const current = next.get(activityId) || 0;
        next.set(activityId, Math.max(0, current - 1));
        return next;
      });

      try {
        await social.deleteComment(commentId);
      } catch {
        // Re-fetch on failure
        social.fetchComments([activityId]).then((map) => {
          setComments((prev) => {
            const next = new Map(prev);
            next.set(activityId, map.get(activityId) || []);
            return next;
          });
        });
      }
    },
    [],
  );

  // ─── Scroll to activity in timeline when clicking pinned item ───
  const scrollToActivity = (activityId: string) => {
    setExpandedId(activityId);
    setTimeout(() => {
      activityRefs.current[activityId]?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };

  // ─── Helpers ───
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
      system: <MdAccountBalanceWallet />,
    };
    return iconMap[entity] || <FaFileAlt />;
  };

  const getEntityColor = (entity: string) => {
    const colorMap: Record<string, string> = {
      income: "#10b981",
      fixed: "#f59e0b",
      fixed_expense: "#f59e0b",
      variable: "#8b5cf6",
      variable_expense: "#8b5cf6",
      variable_expense_plan: "#8b5cf6",
      investment: "#3b82f6",
      credit_card: "#ec4899",
      loan: "#6366f1",
      future_bomb: "#ef4444",
      sharing: "#14b8a6",
      alert: "#f97316",
      system: "#64748b",
    };
    return colorMap[entity] || "#64748b";
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);

  const getActionMessage = (activity: any) => {
    const uname = activity.username || "Someone";
    const entity = activity.entity.replace(/_/g, " ");
    const payload = activity.payload || {};

    switch (activity.action) {
      case "created":
      case "added":
      case "added income source":
        if (activity.entity === "income" && payload.name && payload.amount) {
          const frequency = payload.frequency ? ` (${payload.frequency})` : "";
          return `${uname} added income source ${formatCurrency(payload.amount)}${frequency} for ${payload.name}`;
        }
        if (activity.entity === "credit_card" && payload.name) {
          const billInfo = payload.billAmount ? ` with bill ₹${payload.billAmount}` : "";
          return `${uname} added credit card "${payload.name}"${billInfo}`;
        }
        return `${uname} added ${entity}`;
      case "added actual expense": {
        const planName = payload.planName || payload.plan || payload.name || "expense";
        const amount = payload.amount || 0;
        const paymentMode = payload.paymentMode ? ` via ${payload.paymentMode}` : "";
        if (amount > 0) return `${uname} spent ${formatCurrency(amount)} on ${planName}${paymentMode}`;
        return `${uname} added actual expense`;
      }
      case "added fixed expense":
        if (payload.name && payload.amount) {
          return `${uname} added fixed expense ${formatCurrency(payload.amount)} for ${payload.name}`;
        }
        return `${uname} added fixed expense`;
      case "added variable expense plan":
        if (payload.name && payload.planned) {
          return `${uname} planned ${formatCurrency(payload.planned)} for ${payload.name}`;
        }
        return `${uname} added variable expense plan`;
      case "added investment": {
        const invAmount = payload.monthlyAmount || payload.monthly_amount || 0;
        const invName = payload.name || "";
        if (invAmount > 0 || invName) return `${uname} added investment "${invName}" ${invAmount > 0 ? formatCurrency(invAmount) + "/month" : ""}`.trim();
        return `${uname} added investment`;
      }
      case "payment":
        if (activity.entity === "credit_card" && payload.amount) {
          const cardName = payload.cardName || "credit card";
          return `${uname} paid ${formatCurrency(payload.amount)} on ${cardName}`;
        }
        return `${uname} made payment ${payload.amount ? formatCurrency(payload.amount) : ""}`.trim();
      case "updated_bill":
        if (activity.entity === "credit_card" && payload.billAmount) {
          return `${uname} updated bill to ${formatCurrency(payload.billAmount)} for ${payload.cardName || "credit card"}`;
        }
        return `${uname} updated ${entity} bill`;
      case "updated":
        return `${uname} updated ${entity}${payload.name ? ` "${payload.name}"` : ""}`;
      case "deleted":
        return `${uname} deleted ${entity}${payload.name ? ` "${payload.name}"` : ""}`;
      case "paid": {
        const name = payload.name || "";
        if (payload.amount && name) return `${uname} marked "${name}" as paid (${formatCurrency(payload.amount)})`;
        if (name) return `${uname} marked "${name}" as paid`;
        return `${uname} marked ${entity} as paid`;
      }
      case "unpaid":
        return `${uname} unmarked "${payload.name || entity}" payment`;
      case "overspend_detected":
        return `Overspend detected on "${payload.planName || "plan"}" — spent ${formatCurrency(payload.actual || 0)} vs planned ${formatCurrency(payload.planned || 0)}`;
      case "monthly_reset":
        return `Monthly billing cycle reset for ${payload.month || "new period"}`;
      default: {
        let details = "";
        if (payload.name) details += ` ${payload.name}`;
        if (payload.amount) details += ` (${formatCurrency(payload.amount)})`;
        return `${uname} ${activity.action} ${entity}${details}`.trim();
      }
    }
  };

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
    if (payload.subcategory && payload.subcategory !== "Unspecified") details.push({ label: "Subcategory", value: payload.subcategory });
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

  const formatActivityTime = (ts: string) => {
    const utcDate = ts.endsWith("Z") || ts.includes("+") ? new Date(ts) : new Date(ts + "Z");
    return utcDate.toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
  };

  // ─── Derived Data ───
  const entityTypes = Array.from(new Set(activities.map((a) => a.entity))).sort();

  const filteredActivities =
    entityFilter === "all" ? activities : activities.filter((a) => a.entity === entityFilter);

  const pinnedActivities = activities.filter((a) => pinnedIds.has(a.id));

  // ─── Render ───
  return (
    <div className="activities-page">
      {/* Header */}
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", flex: 1 }}>
          <h1>
            <FaClipboardList style={{ marginRight: 12, verticalAlign: "middle" }} />
            Activity Log
          </h1>
          <PageInfoButton
            title="Activity Log"
            description="View a complete history of all your financial activities. Pin important ones and leave comments for your shared members."
            impact="The activity log helps you track all changes and collaborate with shared account members."
            howItWorks={[
              "All financial actions are automatically logged with timestamps",
              "Pin important activities to keep them at the top for quick access",
              "Comment on any activity — shared members see comments in real-time",
              "Filter activities by type and date range",
              "Expand any activity to see full details and comments",
            ]}
          />
        </div>
        <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "center" }}>
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

      {/* ────── Pinned Section ────── */}
      <AnimatePresence>
        {pinnedActivities.length > 0 && (
          <motion.div
            className="pinned-section"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="pinned-header">
              <div className="pinned-header-left">
                <FaThumbtack className="pinned-header-icon" />
                <span className="pinned-header-title">Pinned</span>
                <span className="pinned-count-badge">{pinnedActivities.length}</span>
              </div>
              <button className="unpin-all-btn" onClick={handleUnpinAll} title="Unpin all">
                Clear All
              </button>
            </div>
            <div className="pinned-list">
              {pinnedActivities.map((activity) => {
                const entityColor = getEntityColor(activity.entity);
                return (
                  <motion.div
                    key={`pin-${activity.id}`}
                    className="pinned-item"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => scrollToActivity(activity.id)}
                  >
                    <div className="pinned-item-icon" style={{ color: entityColor }}>
                      {getEntityIcon(activity.entity)}
                    </div>
                    <div className="pinned-item-content">
                      <span className="pinned-item-text">{getActionMessage(activity)}</span>
                      <span className="pinned-item-time">{social.relativeTime(activity.createdAt)}</span>
                    </div>
                    <button
                      className="pinned-item-unpin"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePin(activity.id);
                      }}
                      title="Unpin"
                    >
                      <FaTimes size={10} />
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters Row */}
      <div className="activities-filters">
        <div className="filter-group">
          <FaFilter style={{ marginRight: 6, opacity: 0.5 }} />
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="entity-filter-select"
          >
            <option value="all">All Types ({activities.length})</option>
            {entityTypes.map((type) => {
              const count = activities.filter((a) => a.entity === type).length;
              return (
                <option key={type} value={type}>
                  {ENTITY_LABELS[type] || type} ({count})
                </option>
              );
            })}
          </select>
        </div>

        <div className="filter-group">
          <label className="period-toggle">
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
            <FaCalendarAlt style={{ marginRight: 4, opacity: 0.5 }} />
            <span>Date Range</span>
          </label>
          {usePeriodFilter && (
            <div className="date-range-inputs">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="date-input"
              />
              <span className="date-separator">→</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
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

      {/* ────── Content ────── */}
      {loading ? (
        <SkeletonLoader type="list" count={5} />
      ) : filteredActivities.length === 0 ? (
        <div className="empty-state">
          <FaClipboardList size={56} color="var(--text-tertiary)" />
          <h3>No Activities Found</h3>
          <p>
            {entityFilter !== "all"
              ? `No ${ENTITY_LABELS[entityFilter] || entityFilter} activities yet.`
              : "Start using the app to see your activity log!"}
          </p>
        </div>
      ) : (
        <div className="activities-timeline">
          {filteredActivities.map((activity, index) => {
            const isExpanded = expandedId === activity.id;
            const details = getPayloadDetails(activity);
            const entityColor = getEntityColor(activity.entity);
            const isPinned = pinnedIds.has(activity.id);
            const cCount = commentCounts.get(activity.id) || 0;
            const activityComments = comments.get(activity.id) || [];

            return (
              <motion.div
                key={activity.id}
                ref={(el) => { activityRefs.current[activity.id] = el; }}
                className={`activity-item ${isExpanded ? "activity-expanded" : ""} ${isPinned ? "activity-pinned" : ""}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(index * 0.02, 0.5) }}
              >
                <div className="activity-icon" style={{ borderColor: entityColor, color: entityColor }}>
                  {getEntityIcon(activity.entity)}
                </div>
                <div className="activity-content">
                  {/* Top Row */}
                  <div
                    className="activity-top-row"
                    onClick={() => setExpandedId(isExpanded ? null : activity.id)}
                    style={{ cursor: "pointer" }}
                  >
                    <div className="activity-action">{getActionMessage(activity)}</div>
                    <div className="activity-top-actions">
                      {/* Comment count badge */}
                      {cCount > 0 && !isExpanded && (
                        <span className="comment-count-badge" title={`${cCount} comment${cCount > 1 ? "s" : ""}`}>
                          <FaComment size={10} />
                          <span>{cCount}</span>
                        </span>
                      )}
                      {/* Pin button */}
                      <motion.button
                        className={`pin-button ${isPinned ? "pin-active" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePin(activity.id);
                        }}
                        title={isPinned ? "Unpin" : pinnedIds.size >= social.MAX_PINS ? `Max ${social.MAX_PINS} pins` : "Pin to top"}
                        disabled={pinLoading.has(activity.id)}
                        whileTap={{ scale: 0.85 }}
                        animate={isPinned ? { rotate: 0 } : { rotate: 45 }}
                        transition={{ type: "spring", stiffness: 400, damping: 15 }}
                      >
                        <FaThumbtack size={12} />
                      </motion.button>
                      {/* Expand icon */}
                      <span className="activity-expand-icon">
                        {isExpanded ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
                      </span>
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="activity-meta">
                    <span className="activity-time">{formatActivityTime(activity.createdAt)}</span>
                    <span className="activity-entity-badge" style={{ color: entityColor, borderColor: entityColor }}>
                      {ENTITY_LABELS[activity.entity] || activity.entity}
                    </span>
                  </div>

                  {/* Expandable Details + Comments */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        className="activity-expanded-section"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                      >
                        {/* Details Grid */}
                        {details.length > 0 && (
                          <div className="activity-details">
                            <div className="activity-details-grid">
                              {details.map((d, i) => (
                                <div key={i} className="activity-detail-item">
                                  <span className="detail-label">{d.label}</span>
                                  <span className="detail-value">{d.value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* ────── Comments Section ────── */}
                        <div className="comments-section">
                          <div className="comments-header">
                            <FaComment size={12} style={{ opacity: 0.6 }} />
                            <span>Comments</span>
                            {activityComments.length > 0 && (
                              <span className="comments-count-pill">{activityComments.length}</span>
                            )}
                          </div>

                          {/* Comment List */}
                          {activityComments.length > 0 ? (
                            <div className="comments-list">
                              {activityComments.map((c) => {
                                const isOwn = c.user_id === userId;
                                const [g1, g2] = social.avatarGradient(c.username);
                                return (
                                  <motion.div
                                    key={c.id}
                                    className={`comment-bubble ${isOwn ? "comment-own" : "comment-other"} ${c._optimistic ? "comment-optimistic" : ""}`}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: c._optimistic ? 0.6 : 1, y: 0 }}
                                    transition={{ duration: 0.2 }}
                                  >
                                    {!isOwn && (
                                      <div
                                        className="comment-avatar"
                                        style={{ background: `linear-gradient(135deg, ${g1}, ${g2})` }}
                                      >
                                        {c.username.charAt(0).toUpperCase()}
                                      </div>
                                    )}
                                    <div className="comment-body">
                                      {!isOwn && <span className="comment-username">{c.username}</span>}
                                      <span className="comment-text">{c.comment}</span>
                                      <div className="comment-footer">
                                        <span className="comment-time">{social.relativeTime(c.created_at)}</span>
                                        {isOwn && !c._optimistic && (
                                          <button
                                            className="comment-delete-btn"
                                            onClick={() => handleDeleteComment(activity.id, c.id)}
                                            title="Delete comment"
                                          >
                                            <FaTrashAlt size={10} />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                    {isOwn && (
                                      <div
                                        className="comment-avatar"
                                        style={{ background: `linear-gradient(135deg, ${g1}, ${g2})` }}
                                      >
                                        {c.username.charAt(0).toUpperCase()}
                                      </div>
                                    )}
                                  </motion.div>
                                );
                              })}
                              <div ref={(el) => { commentEndRef.current[activity.id] = el; }} />
                            </div>
                          ) : (
                            <div className="comments-empty">
                              No comments yet. Be the first to share a thought!
                            </div>
                          )}

                          {/* Comment Input */}
                          <div className="comment-input-row">
                            <input
                              type="text"
                              className="comment-input"
                              placeholder="Write a comment..."
                              value={commentText[activity.id] || ""}
                              onChange={(e) =>
                                setCommentText((prev) => ({
                                  ...prev,
                                  [activity.id]: e.target.value.slice(0, 300),
                                }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault();
                                  handleSendComment(activity.id);
                                }
                              }}
                              maxLength={300}
                            />
                            <div className="comment-input-actions">
                              {(commentText[activity.id] || "").length > 0 && (
                                <span className="comment-char-count">
                                  {(commentText[activity.id] || "").length}/300
                                </span>
                              )}
                              <button
                                className="comment-send-btn"
                                onClick={() => handleSendComment(activity.id)}
                                disabled={!(commentText[activity.id] || "").trim() || commentSending.has(activity.id)}
                                title="Send comment"
                              >
                                <FaPaperPlane size={12} />
                              </button>
                            </div>
                          </div>
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
