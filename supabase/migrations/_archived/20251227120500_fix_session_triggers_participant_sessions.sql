-- =============================================================================
-- Migration: 20251227120500_fix_session_triggers_participant_sessions.sql
-- Description: Align session_triggers with participant_sessions (Legendary Play runtime)
-- Notes:
-- - Code paths (api/play/sessions/[id]/triggers) treat sessionId as participant_sessions.id
-- - Earlier migration referenced game_sessions; this fixes FK + RLS policies
-- =============================================================================

-- =============================================================================
-- 1) Fix FK: session_triggers.session_id -> participant_sessions(id)
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_type = 'FOREIGN KEY'
      AND table_schema = 'public'
      AND table_name = 'session_triggers'
      AND constraint_name = 'session_triggers_session_id_fkey'
  ) THEN
    ALTER TABLE public.session_triggers
      DROP CONSTRAINT session_triggers_session_id_fkey;
  END IF;
END $$;

ALTER TABLE public.session_triggers
  ADD CONSTRAINT session_triggers_session_id_fkey
  FOREIGN KEY (session_id) REFERENCES public.participant_sessions(id) ON DELETE CASCADE;


-- =============================================================================
-- 2) Update RLS policies to host-based access
-- =============================================================================

ALTER TABLE public.session_triggers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "session_triggers_select" ON public.session_triggers;
CREATE POLICY "session_triggers_select" ON public.session_triggers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_triggers.session_id
      AND ps.host_user_id = auth.uid()
    )
    OR public.is_global_admin()
  );

DROP POLICY IF EXISTS "session_triggers_insert" ON public.session_triggers;
CREATE POLICY "session_triggers_insert" ON public.session_triggers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_triggers.session_id
      AND ps.host_user_id = auth.uid()
    )
    OR public.is_global_admin()
  );

DROP POLICY IF EXISTS "session_triggers_update" ON public.session_triggers;
CREATE POLICY "session_triggers_update" ON public.session_triggers
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_triggers.session_id
      AND ps.host_user_id = auth.uid()
    )
    OR public.is_global_admin()
  );

DROP POLICY IF EXISTS "session_triggers_delete" ON public.session_triggers;
CREATE POLICY "session_triggers_delete" ON public.session_triggers
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_triggers.session_id
      AND ps.host_user_id = auth.uid()
    )
    OR public.is_global_admin()
  );
