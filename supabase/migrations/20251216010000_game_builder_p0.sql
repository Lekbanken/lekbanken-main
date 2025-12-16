-- P0: Game Builder v1 - structured steps + materials + readiness fields
-- Adds: game_steps, game_materials; new columns on games for builder

-- New columns on games (backward compatible)
ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS play_mode TEXT DEFAULT 'basic',
  ADD COLUMN IF NOT EXISTS game_content_version TEXT DEFAULT 'v1',
  ADD COLUMN IF NOT EXISTS duration_max INTEGER,
  ADD COLUMN IF NOT EXISTS players_recommended INTEGER,
  ADD COLUMN IF NOT EXISTS difficulty TEXT,
  ADD COLUMN IF NOT EXISTS accessibility_notes TEXT,
  ADD COLUMN IF NOT EXISTS space_requirements TEXT,
  ADD COLUMN IF NOT EXISTS leader_tips TEXT;

-- Structured steps (instructions)
CREATE TABLE IF NOT EXISTS public.game_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  locale TEXT, -- null = fallback/default
  phase_id UUID, -- reserved for P1 phases
  step_order INTEGER NOT NULL DEFAULT 0,
  title TEXT,
  body TEXT,
  duration_seconds INTEGER,
  leader_script TEXT,
  participant_prompt TEXT,
  board_text TEXT,
  media_ref UUID REFERENCES public.game_media(id) ON DELETE SET NULL,
  optional BOOLEAN DEFAULT false,
  conditional TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_game_steps_game_order ON public.game_steps(game_id, step_order);
CREATE INDEX IF NOT EXISTS idx_game_steps_locale ON public.game_steps(locale) WHERE locale IS NOT NULL;

-- Materials / safety / prep (per locale)
CREATE TABLE IF NOT EXISTS public.game_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  locale TEXT, -- null = fallback/default
  items TEXT[] DEFAULT '{}',
  safety_notes TEXT,
  preparation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_game_materials_unique_locale ON public.game_materials(game_id, locale);

-- Timestamps
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_game_steps_updated ON public.game_steps;
CREATE TRIGGER trg_game_steps_updated
BEFORE UPDATE ON public.game_steps
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_game_materials_updated ON public.game_materials;
CREATE TRIGGER trg_game_materials_updated
BEFORE UPDATE ON public.game_materials
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

COMMENT ON TABLE public.game_steps IS 'Structured instruction steps for games (builder v1)';
COMMENT ON TABLE public.game_materials IS 'Materials, safety, prep per game locale (builder v1)';
COMMENT ON COLUMN public.games.game_content_version IS 'v1 legacy, v2 structured content';
COMMENT ON COLUMN public.games.play_mode IS 'basic|facilitated|roles (UI toggle)';
