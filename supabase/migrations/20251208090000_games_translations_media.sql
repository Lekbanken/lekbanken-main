-- Games Domain: translations, media mapping, and enum hardening

-- 1) Enums for consistency
DO $$ BEGIN
  CREATE TYPE energy_level_enum AS ENUM ('low', 'medium', 'high');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE location_type_enum AS ENUM ('indoor', 'outdoor', 'both');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Helper to convert legacy text to text[]
CREATE OR REPLACE FUNCTION public.to_text_array_safe(input text)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN input IS NULL THEN NULL
    WHEN input ~ '^\s*\[.*\]\s*$' THEN ARRAY(SELECT jsonb_array_elements_text(input::jsonb))
    ELSE regexp_split_to_array(input, '\s*,\s*')
  END;
$$;

-- 2) Extend games table
ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS short_description text,
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS season_tags text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS holiday_tags text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES public.users(id),
  ALTER COLUMN energy_level TYPE energy_level_enum USING energy_level::energy_level_enum,
  ALTER COLUMN location_type TYPE location_type_enum USING location_type::location_type_enum,
  ALTER COLUMN materials TYPE text[] USING public.to_text_array_safe(materials);

-- Indexes to speed up browse filters
CREATE INDEX IF NOT EXISTS idx_games_energy_level ON public.games(energy_level);
CREATE INDEX IF NOT EXISTS idx_games_location_type ON public.games(location_type);
CREATE INDEX IF NOT EXISTS idx_games_time_estimate ON public.games(time_estimate_min);
CREATE INDEX IF NOT EXISTS idx_games_age_range ON public.games(age_min, age_max);

-- 3) Translations table
CREATE TABLE IF NOT EXISTS public.game_translations (
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  locale text NOT NULL,
  title text NOT NULL,
  short_description text NOT NULL,
  instructions jsonb NOT NULL DEFAULT '[]'::jsonb,
  materials text[] DEFAULT '{}'::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (game_id, locale)
);

CREATE INDEX IF NOT EXISTS idx_game_translations_locale ON public.game_translations(locale);

-- 4) Media mapping table (ordering + cover/gallery role)
DO $$ BEGIN
  CREATE TYPE game_media_kind AS ENUM ('cover', 'gallery');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.game_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  media_id uuid NOT NULL REFERENCES public.media(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  kind game_media_kind NOT NULL DEFAULT 'gallery',
  position integer NOT NULL DEFAULT 0,
  alt_text text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_game_media_game_id ON public.game_media(game_id);
CREATE INDEX IF NOT EXISTS idx_game_media_position ON public.game_media(game_id, position);

-- 5) RLS for translations and media, mirroring games policies
ALTER TABLE public.game_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_media ENABLE ROW LEVEL SECURITY;

-- Read: anyone can read translations/media for published global games; authenticated can read their tenant games
DROP POLICY IF EXISTS "read_game_translations" ON public.game_translations;
CREATE POLICY "read_game_translations" ON public.game_translations FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.games g
    WHERE g.id = game_translations.game_id
      AND (
        (g.owner_tenant_id IS NULL AND g.status = 'published')
        OR (auth.role() = 'authenticated' AND g.owner_tenant_id = ANY(get_user_tenant_ids()))
      )
  )
);

DROP POLICY IF EXISTS "read_game_media" ON public.game_media;
CREATE POLICY "read_game_media" ON public.game_media FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.games g
    WHERE g.id = game_media.game_id
      AND (
        (g.owner_tenant_id IS NULL AND g.status = 'published')
        OR (auth.role() = 'authenticated' AND g.owner_tenant_id = ANY(get_user_tenant_ids()))
      )
  )
);

-- Write: restrict to tenant members editing their games
DROP POLICY IF EXISTS "write_game_translations" ON public.game_translations;
CREATE POLICY "write_game_translations" ON public.game_translations FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.games g
    WHERE g.id = game_translations.game_id
      AND g.owner_tenant_id = ANY(get_user_tenant_ids())
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.games g
    WHERE g.id = game_translations.game_id
      AND g.owner_tenant_id = ANY(get_user_tenant_ids())
  )
);

DROP POLICY IF EXISTS "write_game_media" ON public.game_media;
CREATE POLICY "write_game_media" ON public.game_media FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.games g
    WHERE g.id = game_media.game_id
      AND g.owner_tenant_id = ANY(get_user_tenant_ids())
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.games g
    WHERE g.id = game_media.game_id
      AND g.owner_tenant_id = ANY(get_user_tenant_ids())
  )
);

-- 6) Publish guard (future: add publish RPC)
-- NOTE: keep existing games policies; publishing should be restricted via API/RPC to tenant admin/owner.
