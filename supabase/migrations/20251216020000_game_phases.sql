-- P2a: Game Phases - structured phases/rounds for facilitated games
-- Adds: game_phases table, links steps to phases
-- NOTE: games table uses owner_tenant_id (not tenant_id)
-- NOTE: existing sessions table is participant_sessions (not play_sessions)

-- Game phases table
CREATE TABLE IF NOT EXISTS public.game_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  locale TEXT,  -- null = default language (fallback strategy: prefer exact locale, else NULL)
  
  -- Phase metadata
  name TEXT NOT NULL,
  phase_type TEXT NOT NULL DEFAULT 'round', -- 'intro' | 'round' | 'finale' | 'break'
  phase_order INTEGER NOT NULL DEFAULT 0,
  
  -- Timing
  duration_seconds INTEGER,          -- null = no timer
  timer_visible BOOLEAN DEFAULT true,
  timer_style TEXT DEFAULT 'countdown', -- 'countdown' | 'elapsed' | 'trafficlight'
  
  -- Content
  description TEXT,
  board_message TEXT,               -- shown on public display during this phase
  
  -- Behavior
  auto_advance BOOLEAN DEFAULT false, -- auto-progress when timer ends
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_game_phases_game_order ON public.game_phases(game_id, phase_order);
CREATE INDEX IF NOT EXISTS idx_game_phases_game_locale ON public.game_phases(game_id, locale);

-- Update trigger
DROP TRIGGER IF EXISTS trg_game_phases_updated ON public.game_phases;
CREATE TRIGGER trg_game_phases_updated
BEFORE UPDATE ON public.game_phases
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Link steps to phases (FK - phase_id column already exists from P0)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_game_steps_phase' 
    AND table_name = 'game_steps'
  ) THEN
    ALTER TABLE public.game_steps
      ADD CONSTRAINT fk_game_steps_phase
      FOREIGN KEY (phase_id) REFERENCES public.game_phases(id) ON DELETE SET NULL;
  END IF;
END $$;

-- RLS
ALTER TABLE public.game_phases ENABLE ROW LEVEL SECURITY;

-- Policy: Select - published games or tenant members can read
DROP POLICY IF EXISTS "game_phases_select" ON public.game_phases;
CREATE POLICY "game_phases_select" ON public.game_phases
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.games g
      WHERE g.id = game_phases.game_id
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

-- Policy: Insert - editors and admins of tenant (with CHECK)
DROP POLICY IF EXISTS "game_phases_insert" ON public.game_phases;
CREATE POLICY "game_phases_insert" ON public.game_phases
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.games g
      JOIN public.user_tenant_memberships m ON m.tenant_id = g.owner_tenant_id
      WHERE g.id = game_phases.game_id
      AND m.user_id = auth.uid()
      AND m.role IN ('admin', 'editor')
    )
    OR public.is_global_admin()
  );

-- Policy: Update - editors and admins of tenant
DROP POLICY IF EXISTS "game_phases_update" ON public.game_phases;
CREATE POLICY "game_phases_update" ON public.game_phases
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.games g
      JOIN public.user_tenant_memberships m ON m.tenant_id = g.owner_tenant_id
      WHERE g.id = game_phases.game_id
      AND m.user_id = auth.uid()
      AND m.role IN ('admin', 'editor')
    )
    OR public.is_global_admin()
  );

-- Policy: Delete - editors and admins of tenant
DROP POLICY IF EXISTS "game_phases_delete" ON public.game_phases;
CREATE POLICY "game_phases_delete" ON public.game_phases
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.games g
      JOIN public.user_tenant_memberships m ON m.tenant_id = g.owner_tenant_id
      WHERE g.id = game_phases.game_id
      AND m.user_id = auth.uid()
      AND m.role IN ('admin', 'editor')
    )
    OR public.is_global_admin()
  );

COMMENT ON TABLE public.game_phases IS 'Phase/round structure for games (builder P2)';
COMMENT ON COLUMN public.game_phases.phase_type IS 'intro, round, finale, or break';
COMMENT ON COLUMN public.game_phases.timer_style IS 'countdown, elapsed, or trafficlight';
COMMENT ON COLUMN public.game_phases.locale IS 'null = default language; API prefers exact locale match, falls back to NULL';
