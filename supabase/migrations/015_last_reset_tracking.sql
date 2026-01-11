-- Add last_reset_billing_period column to user_preferences
-- This tracks when the last monthly reset was performed to prevent duplicate resets

ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS last_reset_billing_period TEXT;

-- Add comment for documentation
COMMENT ON COLUMN user_preferences.last_reset_billing_period IS 'Stores the billing period (YYYY-MM) for which the last reset was performed';


