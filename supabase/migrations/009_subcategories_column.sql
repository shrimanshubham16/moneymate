-- Add subcategories column to user_preferences
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS subcategories TEXT[] DEFAULT '{}';



