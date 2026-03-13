-- Fix: The CHECK constraint on user_preferences.theme allows ('light','dark','auto')
-- but the TypeScript type and UI use 'system' instead of 'auto'.
-- Update constraint to match the application code.

ALTER TABLE public.user_preferences
  DROP CONSTRAINT IF EXISTS user_preferences_theme_check;

ALTER TABLE public.user_preferences
  ADD CONSTRAINT user_preferences_theme_check
  CHECK (theme IN ('light', 'dark', 'system', 'auto'));

-- Migrate any existing 'auto' values to 'system'
UPDATE public.user_preferences
  SET theme = 'system'
  WHERE theme = 'auto';
