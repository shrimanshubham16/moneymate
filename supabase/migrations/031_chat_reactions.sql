-- ============================================================================
-- 031: Create chat_reactions table for emoji reactions on lounge messages
-- Uses PostgREST + Realtime — zero Edge Function invocations
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.chat_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  emoji VARCHAR(8) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(message_id, user_id, emoji)
);

-- Index for efficient per-message lookups
CREATE INDEX IF NOT EXISTS idx_chat_reactions_msg ON public.chat_reactions(message_id);

-- RLS: Open access (app-level auth via custom JWT, not Supabase auth)
ALTER TABLE public.chat_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reactions_select" ON public.chat_reactions;
CREATE POLICY "reactions_select" ON public.chat_reactions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "reactions_insert" ON public.chat_reactions;
CREATE POLICY "reactions_insert" ON public.chat_reactions
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "reactions_delete" ON public.chat_reactions;
CREATE POLICY "reactions_delete" ON public.chat_reactions
  FOR DELETE USING (true);

-- Enable realtime for live reaction updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_reactions;
