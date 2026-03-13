-- Extend user profile with theme + avatar preferences

-- Preferred theme stored on the user to avoid tenant lookups in public/marketing surfaces
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS preferred_theme text
  CONSTRAINT preferred_theme_valid CHECK (preferred_theme IN ('light', 'dark', 'system'))
  DEFAULT 'system';

-- User toggle for showing the theme switcher in headers
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS show_theme_toggle_in_header boolean
  DEFAULT true;

-- Optional avatar URL (preset or uploaded)
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS avatar_url text;

-- Backfill nulls for the toggle to the default true
UPDATE public.users
SET show_theme_toggle_in_header = true
WHERE show_theme_toggle_in_header IS NULL;

ALTER TABLE public.users
ALTER COLUMN show_theme_toggle_in_header SET NOT NULL;

COMMENT ON COLUMN public.users.preferred_theme IS 'User-selected appearance preference (light, dark, system)';
COMMENT ON COLUMN public.users.show_theme_toggle_in_header IS 'Controls visibility of the header theme toggle';
COMMENT ON COLUMN public.users.avatar_url IS 'Profile avatar image or preset path';
