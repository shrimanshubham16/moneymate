-- Add columns to support client-side encryption (E2E)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS encryption_salt TEXT,
  ADD COLUMN IF NOT EXISTS recovery_key_hash TEXT;



