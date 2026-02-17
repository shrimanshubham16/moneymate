-- ============================================================================
-- 028: Create chat_messages, activity_pins, activity_comments tables
-- These tables power the Community Lounge chatroom and Activity social features
-- All use PostgREST (direct DB) + Realtime subscriptions — zero Edge Functions
-- ============================================================================

-- -------------------------------------------------------------------
-- 1. chat_messages — Community Lounge ephemeral chat
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  username VARCHAR(50) NOT NULL,
  message TEXT NOT NULL CHECK (char_length(message) <= 500),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Index for efficient time-range queries (last 24h fetch)
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages (created_at DESC);

-- RLS: Allow anonymous read/write (users authenticate via app JWT, not Supabase auth)
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_messages_select" ON public.chat_messages;
CREATE POLICY "chat_messages_select" ON public.chat_messages
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "chat_messages_insert" ON public.chat_messages;
CREATE POLICY "chat_messages_insert" ON public.chat_messages
  FOR INSERT WITH CHECK (true);

-- Daily cleanup trigger: delete messages older than 24 hours
-- Runs on every INSERT to keep the table small
CREATE OR REPLACE FUNCTION public.cleanup_old_chat_messages()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.chat_messages
  WHERE created_at < now() - INTERVAL '24 hours';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_cleanup_chat ON public.chat_messages;
CREATE TRIGGER trg_cleanup_chat
  AFTER INSERT ON public.chat_messages
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.cleanup_old_chat_messages();

-- Enable realtime for chat_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;


-- -------------------------------------------------------------------
-- 2. activity_pins — Pin/unpin activities
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.activity_pins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  activity_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, activity_id)
);

CREATE INDEX IF NOT EXISTS idx_activity_pins_user ON public.activity_pins (user_id);

ALTER TABLE public.activity_pins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activity_pins_select" ON public.activity_pins;
CREATE POLICY "activity_pins_select" ON public.activity_pins
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "activity_pins_insert" ON public.activity_pins;
CREATE POLICY "activity_pins_insert" ON public.activity_pins
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "activity_pins_delete" ON public.activity_pins;
CREATE POLICY "activity_pins_delete" ON public.activity_pins
  FOR DELETE USING (true);


-- -------------------------------------------------------------------
-- 3. activity_comments — Comments on activities
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.activity_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id UUID NOT NULL,
  user_id UUID NOT NULL,
  username VARCHAR(50) NOT NULL,
  comment TEXT NOT NULL CHECK (char_length(comment) <= 500),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_activity_comments_activity ON public.activity_comments (activity_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_activity_comments_user ON public.activity_comments (user_id);

ALTER TABLE public.activity_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activity_comments_select" ON public.activity_comments;
CREATE POLICY "activity_comments_select" ON public.activity_comments
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "activity_comments_insert" ON public.activity_comments;
CREATE POLICY "activity_comments_insert" ON public.activity_comments
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "activity_comments_delete" ON public.activity_comments;
CREATE POLICY "activity_comments_delete" ON public.activity_comments
  FOR DELETE USING (true);

-- Enable realtime for activity_comments
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_comments;
