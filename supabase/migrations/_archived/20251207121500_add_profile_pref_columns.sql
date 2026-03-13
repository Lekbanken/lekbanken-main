-- Ensure profile preference columns exist on public.users
-- Fixes error: "Could not find the 'preferred_theme' column of 'users' in the schema cache"
-- Also ensures avatar_url exists to avoid PGRST204 on that column

-- Add columns if missing
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS preferred_theme text,
  ADD COLUMN IF NOT EXISTS language public.language_code_enum DEFAULT 'SE',
  ADD COLUMN IF NOT EXISTS show_theme_toggle_in_header boolean DEFAULT true;

-- Backfill language and toggle for existing rows
UPDATE public.users
SET language = COALESCE(language, 'SE'::public.language_code_enum),
    show_theme_toggle_in_header = COALESCE(show_theme_toggle_in_header, true)
WHERE language IS NULL OR show_theme_toggle_in_header IS NULL;

-- Note: ALTER TABLE will refresh PostgREST schema cache automatically.
