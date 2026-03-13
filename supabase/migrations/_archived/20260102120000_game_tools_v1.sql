-- =============================================================================
-- Migration: 20260102120000_game_tools_v1.sql
-- Description: Per-game Toolbelt configuration (MVP v1)
-- =============================================================================

-- Table: game_tools
-- Stores which tools are enabled for a given game and who can use them.

CREATE TABLE IF NOT EXISTS public.game_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  tool_key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  scope TEXT NOT NULL DEFAULT 'both' CHECK (scope IN ('host', 'participants', 'both')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (game_id, tool_key)
);

CREATE INDEX IF NOT EXISTS idx_game_tools_game_id ON public.game_tools(game_id);

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_game_tools_updated ON public.game_tools;
CREATE TRIGGER trg_game_tools_updated
  BEFORE UPDATE ON public.game_tools
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =============================================================================
-- RLS Policies (aligned with games access)
-- - Read:
--   - Anyone can read tool config for published global games
--   - Authenticated tenant members can read tool config for their tenant's games
--   - Global admins can read all
-- - Write:
--   - Only tenant editors/admins (per membership) can modify
--   - Global admins can modify all
-- =============================================================================

ALTER TABLE public.game_tools ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "game_tools_select" ON public.game_tools;
CREATE POLICY "game_tools_select" ON public.game_tools
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.games g
      WHERE g.id = game_tools.game_id
        AND (
          (g.owner_tenant_id IS NULL AND g.status = 'published')
          OR (
            auth.role() = 'authenticated'
            AND g.owner_tenant_id IN (
              SELECT tenant_id FROM public.user_tenant_memberships WHERE user_id = auth.uid()
            )
          )
          OR public.is_global_admin()
        )
    )
  );

DROP POLICY IF EXISTS "game_tools_insert" ON public.game_tools;
CREATE POLICY "game_tools_insert" ON public.game_tools
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.games g
      WHERE g.id = game_tools.game_id
        AND (
          (
            g.owner_tenant_id IS NOT NULL
            AND EXISTS (
              SELECT 1
              FROM public.user_tenant_memberships m
              WHERE m.user_id = auth.uid()
                AND m.tenant_id = g.owner_tenant_id
                AND m.role IN ('admin', 'editor')
            )
          )
          OR public.is_global_admin()
        )
    )
  );

DROP POLICY IF EXISTS "game_tools_update" ON public.game_tools;
CREATE POLICY "game_tools_update" ON public.game_tools
  FOR UPDATE USING (
    EXISTS (
      SELECT 1
      FROM public.games g
      WHERE g.id = game_tools.game_id
        AND (
          (
            g.owner_tenant_id IS NOT NULL
            AND EXISTS (
              SELECT 1
              FROM public.user_tenant_memberships m
              WHERE m.user_id = auth.uid()
                AND m.tenant_id = g.owner_tenant_id
                AND m.role IN ('admin', 'editor')
            )
          )
          OR public.is_global_admin()
        )
    )
  );

DROP POLICY IF EXISTS "game_tools_delete" ON public.game_tools;
CREATE POLICY "game_tools_delete" ON public.game_tools
  FOR DELETE USING (
    EXISTS (
      SELECT 1
      FROM public.games g
      WHERE g.id = game_tools.game_id
        AND (
          (
            g.owner_tenant_id IS NOT NULL
            AND EXISTS (
              SELECT 1
              FROM public.user_tenant_memberships m
              WHERE m.user_id = auth.uid()
                AND m.tenant_id = g.owner_tenant_id
                AND m.role IN ('admin', 'editor')
            )
          )
          OR public.is_global_admin()
        )
    )
  );

-- Grants
GRANT SELECT ON public.game_tools TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_tools TO authenticated;
GRANT ALL ON public.game_tools TO service_role;

COMMENT ON TABLE public.game_tools IS 'Per-game Toolbelt configuration (enabled tools + scope)';
COMMENT ON COLUMN public.game_tools.tool_key IS 'Code-defined tool identifier (e.g. dice_roller_v1)';
COMMENT ON COLUMN public.game_tools.scope IS 'host | participants | both';
