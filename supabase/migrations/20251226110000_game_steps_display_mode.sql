-- Migration: Add display_mode column to game_steps
-- Enables TypewriterText and other dramatic text reveal modes

-- Add display_mode column for text reveal animation
ALTER TABLE public.game_steps
  ADD COLUMN IF NOT EXISTS display_mode TEXT DEFAULT 'instant';

-- Valid values: 'instant', 'typewriter', 'dramatic'
COMMENT ON COLUMN public.game_steps.display_mode IS 'Text reveal mode: instant (default), typewriter (character by character), dramatic (slower, with sound)';

-- Add to session_steps as well (runtime snapshot)
ALTER TABLE public.session_steps
  ADD COLUMN IF NOT EXISTS display_mode TEXT DEFAULT 'instant';

COMMENT ON COLUMN public.session_steps.display_mode IS 'Text reveal mode: instant, typewriter, or dramatic';
