-- =============================================================================
-- Migration: 20260125000001_artifacts_v2_state_tables.sql
-- Description: Artifacts V2 - New state-only tables for runtime session state
-- =============================================================================
-- This migration creates new tables that separate runtime state from game config.
-- Instead of snapshotting entire artifacts, we now:
--   1. Read config from game_artifacts / game_artifact_variants
--   2. Store only runtime state in these new session_*_state tables
-- =============================================================================

-- =============================================================================
-- 1. Session Artifact State (runtime state per artifact)
-- =============================================================================
-- Stores runtime state like keypadState, puzzleState per session/artifact combo.
-- Config (correctCode, correctAnswers, etc.) stays in game_artifacts.metadata.

CREATE TABLE IF NOT EXISTS public.session_artifact_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  session_id UUID NOT NULL 
    REFERENCES public.participant_sessions(id) ON DELETE CASCADE,
  
  game_artifact_id UUID NOT NULL 
    REFERENCES public.game_artifacts(id) ON DELETE CASCADE,
  
  -- Runtime state only (no config/secrets!)
  -- Examples: { "keypadState": { "isUnlocked": false, "attemptCount": 2 } }
  --           { "puzzleState": { "solved": false, "attempts": [...] } }
  state JSONB NOT NULL DEFAULT '{}',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Each artifact can only have one state record per session
  CONSTRAINT session_artifact_state_unique 
    UNIQUE (session_id, game_artifact_id)
);

-- Index for efficient lookups by session
CREATE INDEX IF NOT EXISTS idx_session_artifact_state_session
  ON public.session_artifact_state(session_id);

-- Index for efficient lookups by game artifact
CREATE INDEX IF NOT EXISTS idx_session_artifact_state_artifact
  ON public.session_artifact_state(game_artifact_id);

-- Auto-update updated_at timestamp
DROP TRIGGER IF EXISTS trg_session_artifact_state_updated ON public.session_artifact_state;
CREATE TRIGGER trg_session_artifact_state_updated
  BEFORE UPDATE ON public.session_artifact_state
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

COMMENT ON TABLE public.session_artifact_state IS 
  'Artifacts V2: Stores runtime state (keypadState, puzzleState) per session. Config stays in game_artifacts.';

-- =============================================================================
-- 2. Session Artifact Variant State (reveal/highlight per variant)
-- =============================================================================
-- Stores reveal/highlight timestamps for variants in a session.
-- Replaces the revealed_at/highlighted_at columns on session_artifact_variants.

CREATE TABLE IF NOT EXISTS public.session_artifact_variant_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  session_id UUID NOT NULL 
    REFERENCES public.participant_sessions(id) ON DELETE CASCADE,
  
  game_artifact_variant_id UUID NOT NULL 
    REFERENCES public.game_artifact_variants(id) ON DELETE CASCADE,
  
  -- When this variant was revealed to participants (NULL = not revealed)
  revealed_at TIMESTAMPTZ,
  
  -- When this variant was highlighted on the board (NULL = not highlighted)
  -- Only ONE variant should be highlighted per session at a time
  highlighted_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Each variant can only have one state record per session
  CONSTRAINT session_artifact_variant_state_unique 
    UNIQUE (session_id, game_artifact_variant_id)
);

-- Index for efficient session lookups
CREATE INDEX IF NOT EXISTS idx_session_artifact_variant_state_session
  ON public.session_artifact_variant_state(session_id);

-- Partial index for finding highlighted variant quickly
CREATE INDEX IF NOT EXISTS idx_session_artifact_variant_state_highlighted
  ON public.session_artifact_variant_state(session_id)
  WHERE highlighted_at IS NOT NULL;

-- Partial index for finding revealed variants
CREATE INDEX IF NOT EXISTS idx_session_artifact_variant_state_revealed
  ON public.session_artifact_variant_state(session_id)
  WHERE revealed_at IS NOT NULL;

COMMENT ON TABLE public.session_artifact_variant_state IS 
  'Artifacts V2: Stores reveal/highlight state per variant per session.';

-- =============================================================================
-- 3. Session Artifact Variant Assignments V2 (participant assignments)
-- =============================================================================
-- Assigns specific variants to participants ("My Artifacts").
-- Uses game_artifact_variant_id instead of session_artifact_variant_id.

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
  
  -- Each participant can only be assigned a variant once per session
  CONSTRAINT session_artifact_variant_assignments_v2_unique 
    UNIQUE (session_id, participant_id, game_artifact_variant_id)
);

-- Index for efficient participant lookups
CREATE INDEX IF NOT EXISTS idx_session_artifact_variant_assignments_v2_participant
  ON public.session_artifact_variant_assignments_v2(participant_id);

-- Index for efficient session lookups
CREATE INDEX IF NOT EXISTS idx_session_artifact_variant_assignments_v2_session
  ON public.session_artifact_variant_assignments_v2(session_id);

COMMENT ON TABLE public.session_artifact_variant_assignments_v2 IS 
  'Artifacts V2: Assigns game variants to participants. Uses game_artifact_variant_id.';

-- =============================================================================
-- 4. RLS Policies
-- =============================================================================

-- Enable RLS on all new tables
ALTER TABLE public.session_artifact_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_artifact_variant_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_artifact_variant_assignments_v2 ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- session_artifact_state policies
-- -----------------------------------------------------------------------------

-- Host can manage state for sessions they own
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

-- Service role bypass
DROP POLICY IF EXISTS session_artifact_state_service ON public.session_artifact_state;
CREATE POLICY session_artifact_state_service ON public.session_artifact_state
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- -----------------------------------------------------------------------------
-- session_artifact_variant_state policies
-- -----------------------------------------------------------------------------

-- Host can manage variant state for sessions they own
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

-- Service role bypass
DROP POLICY IF EXISTS session_artifact_variant_state_service ON public.session_artifact_variant_state;
CREATE POLICY session_artifact_variant_state_service ON public.session_artifact_variant_state
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- -----------------------------------------------------------------------------
-- session_artifact_variant_assignments_v2 policies
-- -----------------------------------------------------------------------------

-- Host can manage assignments for sessions they own
DROP POLICY IF EXISTS session_artifact_variant_assignments_v2_host_all ON public.session_artifact_variant_assignments_v2;
CREATE POLICY session_artifact_variant_assignments_v2_host_all ON public.session_artifact_variant_assignments_v2
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

-- Service role bypass
DROP POLICY IF EXISTS session_artifact_variant_assignments_v2_service ON public.session_artifact_variant_assignments_v2;
CREATE POLICY session_artifact_variant_assignments_v2_service ON public.session_artifact_variant_assignments_v2
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- =============================================================================
-- 5. Grant permissions
-- =============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_artifact_state TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_artifact_variant_state TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_artifact_variant_assignments_v2 TO authenticated;

GRANT ALL ON public.session_artifact_state TO service_role;
GRANT ALL ON public.session_artifact_variant_state TO service_role;
GRANT ALL ON public.session_artifact_variant_assignments_v2 TO service_role;
