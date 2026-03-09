-- Key wrapping columns for recovery-safe E2E encryption.
-- wrap_salt: separate PBKDF2 salt used to derive the password wrapping key.
-- wrapped_key_password: KEK encrypted with deriveKey(password, wrap_salt).
-- wrapped_key_recovery: KEK encrypted with deriveKey(recoveryPhrase, encryption_salt).
-- Presence of wrap_salt indicates key-wrapping mode is active for the user.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS wrap_salt TEXT,
  ADD COLUMN IF NOT EXISTS wrapped_key_password TEXT,
  ADD COLUMN IF NOT EXISTS wrapped_key_password_iv TEXT,
  ADD COLUMN IF NOT EXISTS wrapped_key_recovery TEXT,
  ADD COLUMN IF NOT EXISTS wrapped_key_recovery_iv TEXT;
