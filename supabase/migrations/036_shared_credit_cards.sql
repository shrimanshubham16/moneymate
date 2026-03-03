-- 036: Add shared credit card support
-- Allows credit card owners to mark cards as shared so that
-- shared account members can use them for expenses.

ALTER TABLE credit_cards ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT FALSE;
