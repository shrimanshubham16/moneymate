-- Add companion_activity notification type and preference toggle

-- Expand the CHECK constraint to allow 'companion_activity'
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (
  type IN ('sharing_request', 'sharing_accepted', 'sharing_rejected',
           'payment_reminder', 'budget_alert', 'health_update', 'system',
           'companion_activity')
);

-- Preference toggle (default ON so shared users get alerts immediately)
ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS in_app_companion_activity BOOLEAN DEFAULT true;
