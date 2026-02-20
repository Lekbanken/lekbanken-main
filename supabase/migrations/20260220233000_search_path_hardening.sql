-- =============================================================================
-- Migration: 20260220233000_search_path_hardening.sql
-- Description: Fix search_path on ALL SECURITY DEFINER functions in public
-- =============================================================================
-- CONTEXT: Audit query B shows ~55 SECURITY DEFINER functions with unsafe
-- search_path: either 'public' (schema-squatting risk) or '""' (empty,
-- inherits caller's settings). All should be 'pg_catalog, public'.
--
-- Uses ALTER FUNCTION (not CREATE OR REPLACE) — only changes the config
-- setting without touching the function body. This is safe and idempotent.
--
-- The dynamic loop catches ALL current and future insecure functions,
-- regardless of count.
-- =============================================================================

BEGIN;

DO $$
DECLARE
  rec RECORD;
  fixed_count INTEGER := 0;
BEGIN
  FOR rec IN
    SELECT
      p.oid,
      p.proname,
      pg_get_function_identity_arguments(p.oid) AS args,
      p.proconfig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
      AND (
        -- No proconfig at all
        p.proconfig IS NULL
        -- Or has search_path but not the safe one
        OR NOT EXISTS (
          SELECT 1
          FROM unnest(p.proconfig) c
          WHERE c LIKE 'search_path=%'
            AND (
              c LIKE 'search_path=pg_catalog, public%'
              OR c LIKE 'search_path="pg_catalog, public"%'
            )
        )
      )
    ORDER BY p.proname
  LOOP
    EXECUTE format(
      'ALTER FUNCTION public.%I(%s) SET search_path = pg_catalog, public',
      rec.proname, rec.args
    );
    fixed_count := fixed_count + 1;
    RAISE NOTICE 'Fixed search_path: public.%(%)', rec.proname, rec.args;
  END LOOP;

  RAISE NOTICE '── Total functions fixed: % ──', fixed_count;
END;
$$;

COMMIT;

-- =============================================================================
-- VERIFICATION: Run after applying
-- =============================================================================
-- Count should be 0:
--
-- SELECT count(*) AS insecure_definers
-- FROM pg_proc p
-- JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public'
--   AND p.prosecdef = true
--   AND (
--     p.proconfig IS NULL
--     OR NOT EXISTS (
--       SELECT 1
--       FROM unnest(p.proconfig) c
--       WHERE c LIKE 'search_path=%'
--         AND (
--           c LIKE 'search_path=pg_catalog, public%'
--           OR c LIKE 'search_path="pg_catalog, public"%'
--         )
--     )
--   );
--
-- Full list (should all show pg_catalog, public):
--
-- SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args, p.proconfig
-- FROM pg_proc p
-- JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public'
--   AND p.prosecdef = true
-- ORDER BY p.proname;
-- =============================================================================

-- =============================================================================
-- ROLLBACK: Not practical to restore individual old search_path values.
-- If needed, restore from a DB backup or re-run the original migration that
-- created each function (they will reset search_path to whatever was in the
-- CREATE OR REPLACE statement).
-- =============================================================================
