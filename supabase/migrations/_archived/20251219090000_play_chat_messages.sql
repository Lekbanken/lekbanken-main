-- =============================================================================
-- Migration: 20251219090000_play_chat_messages.sql
-- Description: Play chat messages (public + private to host + optional anonymous)
-- =============================================================================

-- =============================================================================
-- 1. Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.play_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.participant_sessions(id) ON DELETE CASCADE,

  -- Visibility
  -- public: visible to all participants + host
  -- host: private message to host (visible to host + sender only)
  visibility TEXT NOT NULL CHECK (visibility IN ('public', 'host')),

  -- Message content
  message TEXT NOT NULL,

  -- Optional anonymity flag (only meaningful for visibility='host')
  anonymous BOOLEAN NOT NULL DEFAULT false,

  -- Sender identity (one of these should be set)
  sender_participant_id UUID REFERENCES public.participants(id) ON DELETE SET NULL,
  sender_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_name TEXT NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_play_chat_messages_session_created
  ON public.play_chat_messages(session_id, created_at DESC);

COMMENT ON TABLE public.play_chat_messages IS 'Chat messages during a play session (public + private-to-host)';

-- =============================================================================
-- 2. RLS
-- =============================================================================

ALTER TABLE public.play_chat_messages ENABLE ROW LEVEL SECURITY;

-- Host can read all messages in their sessions
DROP POLICY IF EXISTS "play_chat_messages_select_host" ON public.play_chat_messages;
CREATE POLICY "play_chat_messages_select_host" ON public.play_chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.participant_sessions ps
      WHERE ps.id = play_chat_messages.session_id
        AND ps.host_user_id = auth.uid()
    )
    OR public.is_global_admin()
  );

-- Host can insert public messages in their sessions
DROP POLICY IF EXISTS "play_chat_messages_insert_host" ON public.play_chat_messages;
CREATE POLICY "play_chat_messages_insert_host" ON public.play_chat_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.participant_sessions ps
      WHERE ps.id = play_chat_messages.session_id
        AND ps.host_user_id = auth.uid()
    )
    OR public.is_global_admin()
  );

-- NOTE: Participants are not authenticated users; token-based access is enforced in API routes.
