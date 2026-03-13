-- =============================================================================
-- Migration: 20251216040000_game_board_config.sql
-- Description: Public display/projector configuration for games (P2c)
-- =============================================================================

-- Board configuration per game
CREATE TABLE IF NOT EXISTS public.game_board_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  locale TEXT,
  
  -- Display elements (7 toggles)
  show_game_name BOOLEAN DEFAULT true,
  show_current_phase BOOLEAN DEFAULT true,
  show_timer BOOLEAN DEFAULT true,
  show_participants BOOLEAN DEFAULT true,
  show_public_roles BOOLEAN DEFAULT true,   -- no-op if no roles defined
  show_leaderboard BOOLEAN DEFAULT false,   -- stub until leaderboard model exists
  show_qr_code BOOLEAN DEFAULT false,       -- links to /join/[code]
  
  -- Custom content
  welcome_message TEXT,
  -- NOTE: custom_css removed for MVP (XSS/layout risk)
  
  -- Theming
  theme TEXT DEFAULT 'neutral',      -- 'mystery' | 'party' | 'sport' | 'nature' | 'neutral'
  background_media_id UUID REFERENCES public.game_media(id) ON DELETE SET NULL,
  background_color TEXT,             -- fallback hex color
  
  -- Layout (2 variants: standard, fullscreen)
  layout_variant TEXT DEFAULT 'standard',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(game_id, locale)
);

-- Index for locale lookups
CREATE INDEX IF NOT EXISTS idx_game_board_config_game_locale 
  ON public.game_board_config(game_id, locale);

-- Update trigger
DROP TRIGGER IF EXISTS trg_game_board_config_updated ON public.game_board_config;
CREATE TRIGGER trg_game_board_config_updated
  BEFORE UPDATE ON public.game_board_config
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =============================================================================
-- RLS Policies
-- =============================================================================

ALTER TABLE public.game_board_config ENABLE ROW LEVEL SECURITY;

-- Select: published games OR tenant members can see
DROP POLICY IF EXISTS "game_board_config_select" ON public.game_board_config;
CREATE POLICY "game_board_config_select" ON public.game_board_config
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.games g
      WHERE g.id = game_board_config.game_id
      AND (
        g.status = 'published'
        OR g.owner_tenant_id IN (
          SELECT tenant_id FROM public.user_tenant_memberships WHERE user_id = auth.uid()
        )
      )
    )
    OR public.is_global_admin()
  );

-- Insert: editors/admins of tenant
DROP POLICY IF EXISTS "game_board_config_insert" ON public.game_board_config;
CREATE POLICY "game_board_config_insert" ON public.game_board_config
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.games g
      JOIN public.user_tenant_memberships m ON m.tenant_id = g.owner_tenant_id
      WHERE g.id = game_board_config.game_id
      AND m.user_id = auth.uid()
      AND m.role IN ('admin', 'editor')
    )
    OR public.is_global_admin()
  );

-- Update: editors/admins of tenant
DROP POLICY IF EXISTS "game_board_config_update" ON public.game_board_config;
CREATE POLICY "game_board_config_update" ON public.game_board_config
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.games g
      JOIN public.user_tenant_memberships m ON m.tenant_id = g.owner_tenant_id
      WHERE g.id = game_board_config.game_id
      AND m.user_id = auth.uid()
      AND m.role IN ('admin', 'editor')
    )
    OR public.is_global_admin()
  );

-- Delete: editors/admins of tenant
DROP POLICY IF EXISTS "game_board_config_delete" ON public.game_board_config;
CREATE POLICY "game_board_config_delete" ON public.game_board_config
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.games g
      JOIN public.user_tenant_memberships m ON m.tenant_id = g.owner_tenant_id
      WHERE g.id = game_board_config.game_id
      AND m.user_id = auth.uid()
      AND m.role IN ('admin', 'editor')
    )
    OR public.is_global_admin()
  );

-- =============================================================================
-- Comments
-- =============================================================================

COMMENT ON TABLE public.game_board_config IS 'Public display/projector configuration (builder P2c)';
COMMENT ON COLUMN public.game_board_config.show_leaderboard IS 'Stub - awaiting leaderboard model';
COMMENT ON COLUMN public.game_board_config.show_qr_code IS 'QR links to /join/[code]';
COMMENT ON COLUMN public.game_board_config.show_public_roles IS 'No-op if no roles defined for game';
COMMENT ON COLUMN public.game_board_config.theme IS 'mystery, party, sport, nature, or neutral';
COMMENT ON COLUMN public.game_board_config.layout_variant IS 'standard or fullscreen';
