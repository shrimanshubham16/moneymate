import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaBell, FaCheck, FaCheckDouble, FaTimes, FaUsers, FaExclamationTriangle, FaCog, FaInfo } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import "./NotificationCenter.css";

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

interface NotificationCenterProps {
  token: string;
}

export function NotificationCenter({ token }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${getApiUrl()}/notifications?limit=20`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const { data } = await response.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (e) {
      console.error("Failed to fetch notifications:", e);
    } finally {
      setLoading(false);
    }
  };

  // Get API URL (reuse from api.ts logic)
  const getApiUrl = () => {
    const envUrl = (import.meta as any).env?.VITE_API_URL;
    if (envUrl) return envUrl;
    const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
    if (supabaseUrl) return `${supabaseUrl}/functions/v1/api`;
    return "http://localhost:12022";
  };

  // Mark as read
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
      setUnreadCount(prev => Math.max(0, prev - notificationIds.length));
    } catch (e) {
      console.error("Failed to mark as read:", e);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      await fetch(`${getApiUrl()}/notifications/read-all`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (e) {
      console.error("Failed to mark all as read:", e);
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead([notification.id]);
    }
    
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
      setIsOpen(false);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch on mount and when opening
  useEffect(() => {
    fetchNotifications();
    
    // Poll for new notifications every 60 seconds
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [token]);

  // Fetch when opening
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  // Get icon for notification type
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

  // Format time ago
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="notification-center" ref={dropdownRef}>
      <button 
        className={`notification-bell ${unreadCount > 0 ? "has-unread" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
      >
        <FaBell />
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="notification-dropdown"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            <div className="notification-header">
              <h3>Notifications</h3>
              <div className="notification-actions">
                {unreadCount > 0 && (
                  <button 
                    className="mark-all-read"
                    onClick={markAllAsRead}
                    title="Mark all as read"
                  >
                    <FaCheckDouble />
                  </button>
                )}
                <button 
                  className="notification-settings"
                  onClick={() => {
                    navigate("/settings/notifications");
                    setIsOpen(false);
                  }}
                  title="Notification settings"
                >
                  <FaCog />
                </button>
              </div>
            </div>

            <div className="notification-list">
              {loading && notifications.length === 0 ? (
                <div className="notification-empty">Loading...</div>
              ) : notifications.length === 0 ? (
                <div className="notification-empty">
                  <FaBell className="empty-icon" />
                  <p>No notifications yet</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <motion.div
                    key={notification.id}
                    className={`notification-item ${notification.isRead ? "read" : "unread"}`}
                    onClick={() => handleNotificationClick(notification)}
                    whileHover={{ backgroundColor: "rgba(255,255,255,0.05)" }}
                  >
                    <div className="notification-icon">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="notification-content">
                      <div className="notification-title">{notification.title}</div>
                      <div className="notification-message">{notification.message}</div>
                      <div className="notification-time">
                        {formatTimeAgo(notification.createdAt)}
                      </div>
                    </div>
                    {!notification.isRead && (
                      <div className="unread-indicator" />
                    )}
                  </motion.div>
                ))
              )}
            </div>

            {notifications.length > 0 && (
              <div className="notification-footer">
                <button 
                  className="view-all"
                  onClick={() => {
                    navigate("/notifications");
                    setIsOpen(false);
                  }}
                >
                  View all notifications
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
