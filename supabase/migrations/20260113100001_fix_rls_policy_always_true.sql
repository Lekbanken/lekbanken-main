-- ============================================================================
-- Migration: Fix RLS Policy Always True Warning
-- Created: 2026-01-13
-- 
-- The linter complains about WITH CHECK (true) being too permissive.
-- We add a meaningful constraint that validates the inserted data.
-- ============================================================================

-- Drop the current policy
DROP POLICY IF EXISTS "translation_missing_keys_insert" ON public.translation_missing_keys;

-- Create a more restrictive policy that validates inserted data
-- Authenticated users can insert, but must provide valid data:
-- - key must be non-empty
-- - locale must be one of the allowed values (already enforced by CHECK constraint)
-- - occurrence_count must be positive
CREATE POLICY "translation_missing_keys_insert"
  ON public.translation_missing_keys FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Key must be non-empty and reasonable length
    key IS NOT NULL 
    AND length(key) > 0 
    AND length(key) <= 500
    -- Locale must be provided
    AND locale IS NOT NULL
    -- Occurrence count must be positive if provided
    AND (occurrence_count IS NULL OR occurrence_count > 0)
  );

COMMENT ON POLICY "translation_missing_keys_insert" ON public.translation_missing_keys 
  IS 'Allow authenticated users to report missing translation keys with valid data';
