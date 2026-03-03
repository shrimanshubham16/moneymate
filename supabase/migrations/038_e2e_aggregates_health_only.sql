-- Phase 5: Add health_category and health_percentage to user_aggregates
-- E2E users share only their health status, not detailed amounts
ALTER TABLE user_aggregates ADD COLUMN IF NOT EXISTS health_category TEXT;
ALTER TABLE user_aggregates ADD COLUMN IF NOT EXISTS health_percentage NUMERIC;
