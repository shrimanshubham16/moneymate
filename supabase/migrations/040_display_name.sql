-- Optional display name for social surfaces (Lounge, Activities, shared views).
-- Nullable; falls back to username everywhere. Non-unique.
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT;
