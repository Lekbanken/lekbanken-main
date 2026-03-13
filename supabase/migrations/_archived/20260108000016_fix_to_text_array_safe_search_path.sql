-- Migration 016: Fix remaining function search_path issues
-- This migration adds search_path to the text[] overload of to_text_array_safe
-- The text variant was already fixed in migration 010, but the text[] variant exists too

-- -----------------------------------------------------------------------------
-- 1. to_text_array_safe(text[]) - text array input variant
-- This overload might exist for pass-through or array handling
-- We need to check if it exists and add search_path
-- -----------------------------------------------------------------------------

-- Drop and recreate the text[] variant if it exists
DO $$
BEGIN
  -- Check if the text[] variant exists
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'to_text_array_safe'
    AND pg_get_function_arguments(p.oid) = 'input text[]'
  ) THEN
    -- Recreate with search_path
    EXECUTE $func$
      CREATE OR REPLACE FUNCTION public.to_text_array_safe(input text[])
      RETURNS text[]
      LANGUAGE sql
      IMMUTABLE
      SET search_path = public
      AS $inner$
        SELECT input;
      $inner$;
    $func$;
    
    COMMENT ON FUNCTION public.to_text_array_safe(text[]) IS 
      'Pass-through for text arrays. Has explicit search_path for security.';
  END IF;
END $$;

-- Also ensure the text variant has search_path (re-apply in case of drift)
CREATE OR REPLACE FUNCTION public.to_text_array_safe(input text)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN input IS NULL THEN NULL
    WHEN input ~ '^\s*\[.*\]\s*$' THEN ARRAY(SELECT jsonb_array_elements_text(input::jsonb))
    ELSE regexp_split_to_array(input, '\s*,\s*')
  END;
$$;

COMMENT ON FUNCTION public.to_text_array_safe(text) IS 
  'Safely converts text to text array. Has explicit search_path.';
