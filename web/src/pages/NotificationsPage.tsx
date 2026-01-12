import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { FaBell, FaCheck, FaCheckDouble, FaTrash, FaUsers, FaExclamationTriangle, FaInfo, FaCog, FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import "./NotificationsPage.css";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

interface NotificationsPageProps {
  token: string;
}

export function NotificationsPage({ token }: NotificationsPageProps) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const getApiUrl = () => {
    const envUrl = (import.meta as any).env?.VITE_API_URL;
    if (envUrl) return envUrl;
    const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
    if (supabaseUrl) return `${supabaseUrl}/functions/v1/api`;
    return "http://localhost:12022";
  };

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const unreadParam = filter === "unread" ? "&unread=true" : "";
      const response = await fetch(`${getApiUrl()}/notifications?limit=100${unreadParam}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const { data } = await response.json();
        setNotifications(data.notifications || []);
      }
    } catch (e) {
      console.error("Failed to fetch notifications:", e);
    } finally {
      setLoading(false);
    }
  }, [token, filter]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (notificationIds: string[]) => {
    try {
      await fetch(`${getApiUrl()}/notifications/read`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ notificationIds })
      });
      
      setNotifications(prev => 
        prev.map(n => 
          notificationIds.includes(n.id) ? { ...n, isRead: true } : n
        )
      );
    } catch (e) {
      console.error("Failed to mark as read:", e);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch(`${getApiUrl()}/notifications/read-all`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (e) {
      console.error("Failed to mark all as read:", e);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await fetch(`${getApiUrl()}/notifications/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (e) {
      console.error("Failed to delete notification:", e);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead([notification.id]);
    }
    
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "sharing_request":
      case "sharing_accepted":
      case "sharing_rejected":
        return <FaUsers className="notification-type-icon sharing" />;
      case "budget_alert":
      case "payment_reminder":
        return <FaExclamationTriangle className="notification-type-icon alert" />;
      case "system":
        return <FaInfo className="notification-type-icon system" />;
      default:
        return <FaBell className="notification-type-icon default" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays === 1) {
      return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays < 7) {
      return `${date.toLocaleDateString([], { weekday: 'long' })} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <motion.div 
      className="notifications-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="page-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          <FaArrowLeft /> Back
        </button>
        <h1>
          <FaBell className="header-icon" />
          Notifications
          {unreadCount > 0 && <span className="unread-badge">{unreadCount}</span>}
        </h1>
        <div className="header-actions">
          <button 
            className="settings-btn"
            onClick={() => navigate("/settings/notifications")}
            title="Notification settings"
          >
            <FaCog />
          </button>
        </div>
      </div>

      <div className="notifications-toolbar">
        <div className="filter-tabs">
          <button 
            className={filter === "all" ? "active" : ""}
            onClick={() => setFilter("all")}
          >
            All
          </button>
          <button 
            className={filter === "unread" ? "active" : ""}
            onClick={() => setFilter("unread")}
          >
            Unread {unreadCount > 0 && `(${unreadCount})`}
          </button>
        </div>
        
        {unreadCount > 0 && (
          <button className="mark-all-btn" onClick={markAllAsRead}>
            <FaCheckDouble /> Mark all as read
          </button>
        )}
      </div>

      <div className="notifications-list">
        {loading ? (
          <div className="loading-state">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="empty-state">
            <FaBell className="empty-icon" />
            <h2>No notifications</h2>
            <p>{filter === "unread" ? "You're all caught up!" : "You don't have any notifications yet."}</p>
          </div>
        ) : (
          notifications.map((notification, index) => (
            <motion.div
              key={notification.id}
              className={`notification-card ${notification.isRead ? "read" : "unread"}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="notification-icon">
                {getNotificationIcon(notification.type)}
              </div>
              
              <div className="notification-content">
                <div className="notification-header">
                  <span className="notification-title">{notification.title}</span>
                  <span className="notification-time">{formatDate(notification.createdAt)}</span>
                </div>
                <p className="notification-message">{notification.message}</p>
                {notification.actionUrl && (
                  <span className="notification-action">Click to view →</span>
                )}
              </div>

              <div className="notification-actions">
                {!notification.isRead && (
                  <button 
                    className="action-btn mark-read"
                    onClick={(e) => {
                      e.stopPropagation();
                      markAsRead([notification.id]);
                    }}
                    title="Mark as read"
                  >
                    <FaCheck />
                  </button>
                )}
                <button 
                  className="action-btn delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNotification(notification.id);
                  }}
                  title="Delete"
                >
                  <FaTrash />
                </button>
              </div>

              {!notification.isRead && <div className="unread-dot" />}
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
}
