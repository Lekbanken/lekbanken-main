-- P2b: Game Roles - role cards with secret instructions for participant-based games
-- Adds: game_roles table, participant_role_assignments table
-- NOTE: Uses existing participant_sessions and participants tables

-- Role definitions per game
CREATE TABLE IF NOT EXISTS public.game_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  locale TEXT,  -- null = default language (fallback: prefer exact locale, else NULL)
  
  -- Identity
  name TEXT NOT NULL,
  icon TEXT,                         -- emoji or icon name
  color TEXT,                        -- hex color for UI (e.g. #8661ff)
  role_order INTEGER NOT NULL DEFAULT 0,
  
  -- Public info (visible to everyone)
  public_description TEXT,
  
  -- Private info (only visible to role holder)
  private_instructions TEXT NOT NULL,
  private_hints TEXT,
  
  -- Assignment rules
  min_count INTEGER NOT NULL DEFAULT 1,
  max_count INTEGER,                 -- null = unlimited
  assignment_strategy TEXT NOT NULL DEFAULT 'random', -- 'random' | 'leader_picks' | 'player_picks'
  
  -- Scaling recommendations (e.g. {"10": 1, "20": 2} = 1 at 10 players, 2 at 20)
  scaling_rules JSONB,
  
  -- Conflicts (cannot be combined with these roles)
  conflicts_with UUID[] DEFAULT '{}',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Role assignments in participant sessions (uses existing tables)
CREATE TABLE IF NOT EXISTS public.participant_role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.participant_sessions(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.game_roles(id) ON DELETE CASCADE,
  
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by UUID REFERENCES auth.users(id), -- null = system/random
  revealed_at TIMESTAMPTZ,           -- when role was revealed to public (null = still secret)
  
  UNIQUE(session_id, participant_id, role_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_game_roles_game_order ON public.game_roles(game_id, role_order);
CREATE INDEX IF NOT EXISTS idx_game_roles_game_locale ON public.game_roles(game_id, locale);
CREATE INDEX IF NOT EXISTS idx_role_assignments_session ON public.participant_role_assignments(session_id);
CREATE INDEX IF NOT EXISTS idx_role_assignments_participant ON public.participant_role_assignments(participant_id);

-- Update trigger for game_roles
DROP TRIGGER IF EXISTS trg_game_roles_updated ON public.game_roles;
CREATE TRIGGER trg_game_roles_updated
BEFORE UPDATE ON public.game_roles
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- RLS for game_roles
ALTER TABLE public.game_roles ENABLE ROW LEVEL SECURITY;

-- Select: published games or tenant members can read role definitions
DROP POLICY IF EXISTS "game_roles_select" ON public.game_roles;
CREATE POLICY "game_roles_select" ON public.game_roles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.games g
      WHERE g.id = game_roles.game_id
      AND (
        g.status = 'published' 
        OR g.owner_tenant_id IN (
          SELECT tenant_id FROM public.user_tenant_memberships
          WHERE user_id = auth.uid()
        )
        OR public.is_global_admin()
      )
    )
  );

-- Insert: editors and admins of tenant
DROP POLICY IF EXISTS "game_roles_insert" ON public.game_roles;
CREATE POLICY "game_roles_insert" ON public.game_roles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.games g
      JOIN public.user_tenant_memberships m ON m.tenant_id = g.owner_tenant_id
      WHERE g.id = game_roles.game_id
      AND m.user_id = auth.uid()
      AND m.role IN ('admin', 'editor')
    )
    OR public.is_global_admin()
  );

-- Update: editors and admins of tenant
DROP POLICY IF EXISTS "game_roles_update" ON public.game_roles;
CREATE POLICY "game_roles_update" ON public.game_roles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.games g
      JOIN public.user_tenant_memberships m ON m.tenant_id = g.owner_tenant_id
      WHERE g.id = game_roles.game_id
      AND m.user_id = auth.uid()
      AND m.role IN ('admin', 'editor')
    )
    OR public.is_global_admin()
  );

-- Delete: editors and admins of tenant
DROP POLICY IF EXISTS "game_roles_delete" ON public.game_roles;
CREATE POLICY "game_roles_delete" ON public.game_roles
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.games g
      JOIN public.user_tenant_memberships m ON m.tenant_id = g.owner_tenant_id
      WHERE g.id = game_roles.game_id
      AND m.user_id = auth.uid()
      AND m.role IN ('admin', 'editor')
    )
    OR public.is_global_admin()
  );

-- RLS for participant_role_assignments
ALTER TABLE public.participant_role_assignments ENABLE ROW LEVEL SECURITY;

-- Select: session host can see all assignments
-- Note: Participant access is handled via session tokens, not RLS
DROP POLICY IF EXISTS "role_assignments_select" ON public.participant_role_assignments;
CREATE POLICY "role_assignments_select" ON public.participant_role_assignments
  FOR SELECT USING (
    -- Session host can see all assignments
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = participant_role_assignments.session_id
      AND ps.host_user_id = auth.uid()
    )
    -- Global admin
    OR public.is_global_admin()
  );

-- Insert: only session host can assign roles
DROP POLICY IF EXISTS "role_assignments_insert" ON public.participant_role_assignments;
CREATE POLICY "role_assignments_insert" ON public.participant_role_assignments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = participant_role_assignments.session_id
      AND ps.host_user_id = auth.uid()
    )
    OR public.is_global_admin()
  );

-- Update: only session host can modify assignments
DROP POLICY IF EXISTS "role_assignments_update" ON public.participant_role_assignments;
CREATE POLICY "role_assignments_update" ON public.participant_role_assignments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = participant_role_assignments.session_id
      AND ps.host_user_id = auth.uid()
    )
    OR public.is_global_admin()
  );

-- Delete: only session host can remove assignments
DROP POLICY IF EXISTS "role_assignments_delete" ON public.participant_role_assignments;
CREATE POLICY "role_assignments_delete" ON public.participant_role_assignments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = participant_role_assignments.session_id
      AND ps.host_user_id = auth.uid()
    )
    OR public.is_global_admin()
  );

-- Comments
COMMENT ON TABLE public.game_roles IS 'Role definitions for participant-based games (builder P2)';
COMMENT ON TABLE public.participant_role_assignments IS 'Runtime role assignments per session';
COMMENT ON COLUMN public.game_roles.private_instructions IS 'Secret text only visible to the role holder';
COMMENT ON COLUMN public.game_roles.assignment_strategy IS 'random, leader_picks, or player_picks';
COMMENT ON COLUMN public.game_roles.scaling_rules IS 'JSON object mapping player count to recommended role count';
COMMENT ON COLUMN public.participant_role_assignments.revealed_at IS 'When role was shown publicly (null = still secret)';
