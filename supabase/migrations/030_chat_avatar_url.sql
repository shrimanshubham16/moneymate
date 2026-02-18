-- ============================================================================
-- 030: Add avatar_url column to chat_messages
-- Allows chat messages to carry the sender's profile photo for display
-- ============================================================================

ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

COMMENT ON COLUMN public.chat_messages.avatar_url IS 'Sender avatar URL stored with message so no JOIN needed for display';
