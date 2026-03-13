-- =============================================================================
-- Migration: 20260125154500_fix_artifact_state_view_conflict.sql
-- Description: Fix conflict where views were blocking table creation
-- =============================================================================
-- The previous migration (20260125000001) tried to create tables but views
-- with the same names existed, causing CREATE TABLE IF NOT EXISTS to skip.
-- This migration properly drops the views and recreates the tables.
-- =============================================================================

-- =============================================================================
-- 1. Drop the conflicting view (session_artifact_state was a VIEW, not TABLE)
-- =============================================================================
DROP VIEW IF EXISTS public.session_artifact_state CASCADE;

-- =============================================================================
-- 2. Create session_artifact_state TABLE (was blocked by view)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.session_artifact_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  session_id UUID NOT NULL 
    REFERENCES public.participant_sessions(id) ON DELETE CASCADE,
  
  game_artifact_id UUID NOT NULL 
    REFERENCES public.game_artifacts(id) ON DELETE CASCADE,
  
  -- Runtime state only (no config/secrets!)
  state JSONB NOT NULL DEFAULT '{}',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT session_artifact_state_unique 
    UNIQUE (session_id, game_artifact_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_session_artifact_state_session
  ON public.session_artifact_state(session_id);

CREATE INDEX IF NOT EXISTS idx_session_artifact_state_artifact
  ON public.session_artifact_state(game_artifact_id);

-- Auto-update trigger
DROP TRIGGER IF EXISTS trg_session_artifact_state_updated ON public.session_artifact_state;
CREATE TRIGGER trg_session_artifact_state_updated
  BEFORE UPDATE ON public.session_artifact_state
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

COMMENT ON TABLE public.session_artifact_state IS 
  'Artifacts V2: Stores runtime state (keypadState, puzzleState) per session. Config stays in game_artifacts.';

-- =============================================================================
-- 3. Create session_artifact_variant_state TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.session_artifact_variant_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  session_id UUID NOT NULL 
    REFERENCES public.participant_sessions(id) ON DELETE CASCADE,
  
  game_artifact_variant_id UUID NOT NULL 
    REFERENCES public.game_artifact_variants(id) ON DELETE CASCADE,
  
  revealed_at TIMESTAMPTZ,
  highlighted_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT session_artifact_variant_state_unique 
    UNIQUE (session_id, game_artifact_variant_id)
);

CREATE INDEX IF NOT EXISTS idx_session_artifact_variant_state_session
  ON public.session_artifact_variant_state(session_id);

CREATE INDEX IF NOT EXISTS idx_session_artifact_variant_state_highlighted
  ON public.session_artifact_variant_state(session_id)
  WHERE highlighted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_session_artifact_variant_state_revealed
  ON public.session_artifact_variant_state(session_id)
  WHERE revealed_at IS NOT NULL;

COMMENT ON TABLE public.session_artifact_variant_state IS 
  'Artifacts V2: Stores reveal/highlight state per variant per session.';

-- =============================================================================
-- 4. Create session_artifact_variant_assignments_v2 TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.session_artifact_variant_assignments_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  session_id UUID NOT NULL 
    REFERENCES public.participant_sessions(id) ON DELETE CASCADE,
  
  participant_id UUID NOT NULL 
    REFERENCES public.participants(id) ON DELETE CASCADE,
  
  game_artifact_variant_id UUID NOT NULL 
    REFERENCES public.game_artifact_variants(id) ON DELETE CASCADE,
  
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT session_artifact_variant_assignments_v2_unique 
    UNIQUE (session_id, participant_id, game_artifact_variant_id)
);

CREATE INDEX IF NOT EXISTS idx_session_artifact_variant_assignments_v2_variant
  ON public.session_artifact_variant_assignments_v2(game_artifact_variant_id);

CREATE INDEX IF NOT EXISTS idx_session_artifact_variant_assignments_v2_participant
  ON public.session_artifact_variant_assignments_v2(participant_id);

CREATE INDEX IF NOT EXISTS idx_session_artifact_variant_assignments_v2_session
  ON public.session_artifact_variant_assignments_v2(session_id);

COMMENT ON TABLE public.session_artifact_variant_assignments_v2 IS 
  'Artifacts V2: Assigns game variants to participants. Uses game_artifact_variant_id.';

-- =============================================================================
-- 5. Create session_trigger_state TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.session_trigger_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  session_id UUID NOT NULL 
    REFERENCES public.participant_sessions(id) ON DELETE CASCADE,
  
  game_trigger_id UUID NOT NULL 
    REFERENCES public.game_triggers(id) ON DELETE CASCADE,
  
  status TEXT NOT NULL DEFAULT 'armed' CHECK (status IN ('armed', 'fired', 'disabled')),
  fired_at TIMESTAMPTZ,
  fired_count INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT session_trigger_state_unique 
    UNIQUE (session_id, game_trigger_id)
);

CREATE INDEX IF NOT EXISTS idx_session_trigger_state_session
  ON public.session_trigger_state(session_id);

CREATE INDEX IF NOT EXISTS idx_session_trigger_state_trigger
  ON public.session_trigger_state(game_trigger_id);

DROP TRIGGER IF EXISTS trg_session_trigger_state_updated ON public.session_trigger_state;
CREATE TRIGGER trg_session_trigger_state_updated
  BEFORE UPDATE ON public.session_trigger_state
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

COMMENT ON TABLE public.session_trigger_state IS 
  'Triggers V2: Stores trigger state (armed/fired/disabled) per session.';

-- =============================================================================
-- 6. RLS Policies
-- =============================================================================

-- Enable RLS
ALTER TABLE public.session_artifact_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_artifact_variant_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_artifact_variant_assignments_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_trigger_state ENABLE ROW LEVEL SECURITY;

-- session_artifact_state policies
DROP POLICY IF EXISTS session_artifact_state_host_all ON public.session_artifact_state;
CREATE POLICY session_artifact_state_host_all ON public.session_artifact_state
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_artifact_state.session_id
        AND ps.host_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_artifact_state.session_id
        AND ps.host_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS session_artifact_state_service ON public.session_artifact_state;
CREATE POLICY session_artifact_state_service ON public.session_artifact_state
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- session_artifact_variant_state policies
DROP POLICY IF EXISTS session_artifact_variant_state_host_all ON public.session_artifact_variant_state;
CREATE POLICY session_artifact_variant_state_host_all ON public.session_artifact_variant_state
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_artifact_variant_state.session_id
        AND ps.host_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_artifact_variant_state.session_id
        AND ps.host_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS session_artifact_variant_state_service ON public.session_artifact_variant_state;
CREATE POLICY session_artifact_variant_state_service ON public.session_artifact_variant_state
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- session_artifact_variant_assignments_v2 policies
DROP POLICY IF EXISTS session_artifact_variant_assignments_v2_host ON public.session_artifact_variant_assignments_v2;
CREATE POLICY session_artifact_variant_assignments_v2_host ON public.session_artifact_variant_assignments_v2
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_artifact_variant_assignments_v2.session_id
        AND ps.host_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_artifact_variant_assignments_v2.session_id
        AND ps.host_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS session_artifact_variant_assignments_v2_service ON public.session_artifact_variant_assignments_v2;
CREATE POLICY session_artifact_variant_assignments_v2_service ON public.session_artifact_variant_assignments_v2
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- session_trigger_state policies
DROP POLICY IF EXISTS session_trigger_state_host_all ON public.session_trigger_state;
CREATE POLICY session_trigger_state_host_all ON public.session_trigger_state
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_trigger_state.session_id
        AND ps.host_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_trigger_state.session_id
        AND ps.host_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS session_trigger_state_service ON public.session_trigger_state;
CREATE POLICY session_trigger_state_service ON public.session_trigger_state
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- =============================================================================
-- 7. Grants
-- =============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_artifact_state TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_artifact_variant_state TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_artifact_variant_assignments_v2 TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_trigger_state TO authenticated;

GRANT ALL ON public.session_artifact_state TO service_role;
GRANT ALL ON public.session_artifact_variant_state TO service_role;
GRANT ALL ON public.session_artifact_variant_assignments_v2 TO service_role;
GRANT ALL ON public.session_trigger_state TO service_role;
