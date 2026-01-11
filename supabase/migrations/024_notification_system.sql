-- Notification System Schema
-- Supports in-app notifications, email preferences, and digests

-- Notification types enum-like values:
-- 'sharing_request' - Someone wants to share finances with you
-- 'sharing_accepted' - Your sharing request was accepted
-- 'sharing_rejected' - Your sharing request was rejected
-- 'payment_reminder' - Upcoming payment due
-- 'budget_alert' - Overspending warning
-- 'health_update' - Weekly health score change
-- 'system' - System announcements

-- User notification preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- In-app notification toggles
  in_app_sharing BOOLEAN DEFAULT true,
  in_app_payments BOOLEAN DEFAULT true,
  in_app_budget_alerts BOOLEAN DEFAULT true,
  in_app_system BOOLEAN DEFAULT true,
  
  -- Email notification toggles
  email_sharing BOOLEAN DEFAULT true,
  email_payments BOOLEAN DEFAULT false,
  email_budget_alerts BOOLEAN DEFAULT false,
  email_system BOOLEAN DEFAULT true,
  
  -- Email digest preferences
  email_digest_enabled BOOLEAN DEFAULT false,
  email_digest_frequency VARCHAR(20) DEFAULT 'weekly', -- 'daily', 'weekly', 'monthly'
  email_digest_day INTEGER DEFAULT 0, -- 0=Sunday for weekly, 1-28 for monthly
  email_digest_time TIME DEFAULT '09:00:00',
  
  -- Last digest sent
  last_digest_sent_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id)
);

-- Notifications table (in-app notifications)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  type VARCHAR(50) NOT NULL, -- 'sharing_request', 'payment_reminder', etc.
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  
  -- Optional reference to related entity
  entity_type VARCHAR(50), -- 'sharing_request', 'fixed_expense', 'variable_plan', etc.
  entity_id UUID,
  
  -- Action URL (optional - for clickable notifications)
  action_url VARCHAR(255),
  
  -- Status
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  
  -- For grouping related notifications
  group_key VARCHAR(100),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- Index for efficient queries
  CONSTRAINT notifications_type_check CHECK (
    type IN ('sharing_request', 'sharing_accepted', 'sharing_rejected', 
             'payment_reminder', 'budget_alert', 'health_update', 'system')
  )
);

-- Email digest queue (for scheduled emails)
CREATE TABLE IF NOT EXISTS email_digest_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  digest_type VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly'
  scheduled_for TIMESTAMPTZ NOT NULL,
  
  -- Content snapshot at time of scheduling
  content_json JSONB,
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id, digest_type, scheduled_for)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
  ON notifications(user_id, is_read, created_at DESC) 
  WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_notifications_user_created 
  ON notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_digest_queue_pending 
  ON email_digest_queue(scheduled_for, status) 
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user 
  ON notification_preferences(user_id);

-- Function to create default notification preferences for new users
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create preferences on user signup
DROP TRIGGER IF EXISTS trigger_create_notification_preferences ON users;
CREATE TRIGGER trigger_create_notification_preferences
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_notification_preferences();

-- Function to mark notifications as read
CREATE OR REPLACE FUNCTION mark_notifications_read(p_user_id UUID, p_notification_ids UUID[])
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE notifications
  SET is_read = true, read_at = now()
  WHERE user_id = p_user_id 
    AND id = ANY(p_notification_ids)
    AND is_read = false;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM notifications
    WHERE user_id = p_user_id AND is_read = false
  );
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_digest_queue ENABLE ROW LEVEL SECURITY;

-- Users can only see/modify their own preferences
CREATE POLICY notification_preferences_policy ON notification_preferences
  FOR ALL USING (user_id = auth.uid());

-- Users can only see their own notifications
CREATE POLICY notifications_select_policy ON notifications
  FOR SELECT USING (user_id = auth.uid());

-- Users can update (mark as read) their own notifications
CREATE POLICY notifications_update_policy ON notifications
  FOR UPDATE USING (user_id = auth.uid());

-- Service role can insert notifications (for system-generated ones)
CREATE POLICY notifications_insert_policy ON notifications
  FOR INSERT WITH CHECK (true);

-- Email digest queue - service role only
CREATE POLICY email_digest_queue_policy ON email_digest_queue
  FOR ALL USING (user_id = auth.uid());

COMMENT ON TABLE notification_preferences IS 'User preferences for in-app and email notifications';
COMMENT ON TABLE notifications IS 'In-app notifications for users';
COMMENT ON TABLE email_digest_queue IS 'Queue for scheduled email digests';
