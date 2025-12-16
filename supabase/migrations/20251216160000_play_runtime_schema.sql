-- =============================================================================
-- Migration: 20251216160000_play_runtime_schema.sql
-- Description: Play Runtime Schema - adds runtime state to sessions
-- PR1 of Legendary Play feature
-- =============================================================================

-- =============================================================================
-- 1. Extend participant_sessions with runtime state
-- =============================================================================

-- Add current_step_index (for basic step-by-step navigation)
ALTER TABLE public.participant_sessions
ADD COLUMN IF NOT EXISTS current_step_index INTEGER DEFAULT 0;

-- Add current_phase_index (for facilitated phase navigation)
ALTER TABLE public.participant_sessions
ADD COLUMN IF NOT EXISTS current_phase_index INTEGER DEFAULT 0;

-- Add timer_state as JSONB (event-driven, not per-second ticks)
-- Structure: { started_at: ISO, duration_seconds: int, paused_at: ISO|null }
ALTER TABLE public.participant_sessions
ADD COLUMN IF NOT EXISTS timer_state JSONB DEFAULT NULL;

-- Add board_state for runtime board overrides
-- Structure: { message: string, overrides: { show_timer: bool, ... } }
ALTER TABLE public.participant_sessions
ADD COLUMN IF NOT EXISTS board_state JSONB DEFAULT NULL;

COMMENT ON COLUMN public.participant_sessions.current_step_index IS 'Current step index for basic play mode (0-based)';
COMMENT ON COLUMN public.participant_sessions.current_phase_index IS 'Current phase index for facilitated/participants mode (0-based)';
COMMENT ON COLUMN public.participant_sessions.timer_state IS 'Event-driven timer: { started_at, duration_seconds, paused_at }';
COMMENT ON COLUMN public.participant_sessions.board_state IS 'Runtime board overrides: { message, overrides }';

-- =============================================================================
-- 2. Create session_roles table (snapshot of game_roles at session start)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.session_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.participant_sessions(id) ON DELETE CASCADE,
  
  -- Copied from game_roles at session creation (immutable during session)
  source_role_id UUID REFERENCES public.game_roles(id) ON DELETE SET NULL,
  
  -- Identity (copied from game_roles)
  name TEXT NOT NULL,
  icon TEXT,
  color TEXT,
  role_order INTEGER NOT NULL DEFAULT 0,
  
  -- Public info
  public_description TEXT,
  
  -- Private info (only visible to assigned participant)
  private_instructions TEXT NOT NULL,
  private_hints TEXT,
  
  -- Assignment rules (copied from game_roles)
  min_count INTEGER NOT NULL DEFAULT 1,
  max_count INTEGER,
  assignment_strategy TEXT NOT NULL DEFAULT 'random',
  
  -- Scaling and conflicts (copied)
  scaling_rules JSONB,
  conflicts_with TEXT[] DEFAULT '{}',
  
  -- Runtime state
  assigned_count INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_session_roles_session ON public.session_roles(session_id);
CREATE INDEX IF NOT EXISTS idx_session_roles_order ON public.session_roles(session_id, role_order);

COMMENT ON TABLE public.session_roles IS 'Snapshot of game_roles at session start - immutable during session';
COMMENT ON COLUMN public.session_roles.source_role_id IS 'Original game_role ID (for reference, nullable if role deleted)';
COMMENT ON COLUMN public.session_roles.assigned_count IS 'Current number of participants assigned this role';

-- =============================================================================
-- 3. Update participant_role_assignments to reference session_roles
-- =============================================================================

-- Check if the old FK exists and drop it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'participant_role_assignments_role_id_fkey'
    AND table_name = 'participant_role_assignments'
  ) THEN
    ALTER TABLE public.participant_role_assignments
      DROP CONSTRAINT participant_role_assignments_role_id_fkey;
  END IF;
END $$;

-- Rename column if it's pointing to game_roles
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'participant_role_assignments' 
    AND column_name = 'role_id'
  ) THEN
    -- Check if session_role_id already exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'participant_role_assignments' 
      AND column_name = 'session_role_id'
    ) THEN
      ALTER TABLE public.participant_role_assignments
        RENAME COLUMN role_id TO session_role_id;
    END IF;
  END IF;
END $$;

-- Add FK to session_roles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'participant_role_assignments_session_role_id_fkey'
    AND table_name = 'participant_role_assignments'
  ) THEN
    ALTER TABLE public.participant_role_assignments
      ADD CONSTRAINT participant_role_assignments_session_role_id_fkey
      FOREIGN KEY (session_role_id) REFERENCES public.session_roles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- =============================================================================
-- 4. Create session_events table (audit log for session actions)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.session_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.participant_sessions(id) ON DELETE CASCADE,
  
  -- Event metadata
  event_type TEXT NOT NULL, -- 'step_change', 'phase_change', 'timer_start', 'timer_pause', 'role_assigned', etc.
  event_data JSONB DEFAULT '{}',
  
  -- Actor (null = system)
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_participant_id UUID REFERENCES public.participants(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_session_events_session ON public.session_events(session_id);
CREATE INDEX IF NOT EXISTS idx_session_events_type ON public.session_events(session_id, event_type);
CREATE INDEX IF NOT EXISTS idx_session_events_created ON public.session_events(session_id, created_at DESC);

COMMENT ON TABLE public.session_events IS 'Audit log for all session state changes';

-- =============================================================================
-- 5. RLS Policies
-- =============================================================================

-- Enable RLS on new tables
ALTER TABLE public.session_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_events ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- session_roles policies
-- -----------------------------------------------------------------------------

-- Select: Host can see all roles, participants can see public info only
DROP POLICY IF EXISTS "session_roles_select_host" ON public.session_roles;
CREATE POLICY "session_roles_select_host" ON public.session_roles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_roles.session_id
      AND ps.host_user_id = auth.uid()
    )
    OR public.is_global_admin()
  );

-- Participants can see roles they're assigned to (full info)
DROP POLICY IF EXISTS "session_roles_select_assigned" ON public.session_roles;
CREATE POLICY "session_roles_select_assigned" ON public.session_roles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.participant_role_assignments pra
      JOIN public.participants p ON p.id = pra.participant_id
      WHERE pra.session_role_id = session_roles.id
      AND p.token_hash IS NOT NULL
      -- Token verification happens at API layer
    )
  );

-- Insert: Only host can create session roles (via API with service role)
DROP POLICY IF EXISTS "session_roles_insert" ON public.session_roles;
CREATE POLICY "session_roles_insert" ON public.session_roles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_roles.session_id
      AND ps.host_user_id = auth.uid()
    )
    OR public.is_global_admin()
  );

-- Update: Only host can update (for assigned_count tracking)
DROP POLICY IF EXISTS "session_roles_update" ON public.session_roles;
CREATE POLICY "session_roles_update" ON public.session_roles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_roles.session_id
      AND ps.host_user_id = auth.uid()
    )
    OR public.is_global_admin()
  );

-- Delete: Only host can delete
DROP POLICY IF EXISTS "session_roles_delete" ON public.session_roles;
CREATE POLICY "session_roles_delete" ON public.session_roles
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_roles.session_id
      AND ps.host_user_id = auth.uid()
    )
    OR public.is_global_admin()
  );

-- -----------------------------------------------------------------------------
-- session_events policies
-- -----------------------------------------------------------------------------

-- Select: Host can see all events
DROP POLICY IF EXISTS "session_events_select" ON public.session_events;
CREATE POLICY "session_events_select" ON public.session_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_events.session_id
      AND ps.host_user_id = auth.uid()
    )
    OR public.is_global_admin()
  );

-- Insert: Host or service role can insert events
DROP POLICY IF EXISTS "session_events_insert" ON public.session_events;
CREATE POLICY "session_events_insert" ON public.session_events
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_events.session_id
      AND ps.host_user_id = auth.uid()
    )
    OR public.is_global_admin()
  );

-- No update or delete for audit log (immutable)

-- -----------------------------------------------------------------------------
-- participant_role_assignments policies (update existing)
-- -----------------------------------------------------------------------------

-- Select own assignment (participant can see their own role)
DROP POLICY IF EXISTS "role_assignments_select_own" ON public.participant_role_assignments;
CREATE POLICY "role_assignments_select_own" ON public.participant_role_assignments
  FOR SELECT USING (
    -- Host can see all
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = participant_role_assignments.session_id
      AND ps.host_user_id = auth.uid()
    )
    -- Participant can see own (verified via API layer with token)
    OR EXISTS (
      SELECT 1 FROM public.participants p
      WHERE p.id = participant_role_assignments.participant_id
      AND p.session_id = participant_role_assignments.session_id
    )
    OR public.is_global_admin()
  );

-- =============================================================================
-- 6. Helper function: Snapshot game_roles to session_roles
-- =============================================================================

CREATE OR REPLACE FUNCTION public.snapshot_game_roles_to_session(
  p_session_id UUID,
  p_game_id UUID,
  p_locale TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  -- Copy all roles from game_roles to session_roles
  INSERT INTO public.session_roles (
    session_id,
    source_role_id,
    name,
    icon,
    color,
    role_order,
    public_description,
    private_instructions,
    private_hints,
    min_count,
    max_count,
    assignment_strategy,
    scaling_rules,
    conflicts_with
  )
  SELECT
    p_session_id,
    gr.id,
    gr.name,
    gr.icon,
    gr.color,
    gr.role_order,
    gr.public_description,
    gr.private_instructions,
    gr.private_hints,
    gr.min_count,
    gr.max_count,
    gr.assignment_strategy,
    gr.scaling_rules,
    COALESCE(
      (SELECT array_agg(gr2.name) 
       FROM public.game_roles gr2 
       WHERE gr2.id = ANY(gr.conflicts_with)),
      '{}'::TEXT[]
    )
  FROM public.game_roles gr
  WHERE gr.game_id = p_game_id
    AND (gr.locale = p_locale OR gr.locale IS NULL)
  ORDER BY gr.role_order;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.snapshot_game_roles_to_session IS 'Copy game roles to session at start (immutable snapshot)';

-- =============================================================================
-- 7. Comments and documentation
-- =============================================================================

COMMENT ON COLUMN public.participant_sessions.current_step_index IS 
  'Steps = instruction content. Independent from phases. 0-based index.';

COMMENT ON COLUMN public.participant_sessions.current_phase_index IS 
  'Phases = runtime/tempo (timer, auto-advance). Independent from steps. 0-based index.';

COMMENT ON COLUMN public.participant_sessions.timer_state IS 
  'Event-driven timer state. Clients calculate remaining time from { started_at, duration_seconds, paused_at }. No per-second broadcasts.';
