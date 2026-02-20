-- =============================================================================
-- Migration: 20260220233000_search_path_hardening.sql
-- Description: Fix search_path on ALL SECURITY DEFINER functions + revoke
--              anon ALL on ALL public relations (catch-all hardening)
-- =============================================================================
-- CONTEXT:
-- Step 1: Audit query B shows ~55 SECURITY DEFINER functions with unsafe
-- search_path: either 'public' (schema-squatting risk) or '""' (empty,
-- inherits caller's settings). All should be 'pg_catalog, public'.
--
-- Uses ALTER FUNCTION (not CREATE OR REPLACE) — only changes the config
-- setting without touching the function body. This is safe and idempotent.
--
-- Step 2: Revoke ALL privileges from anon on ALL tables, partitions,
-- sequences and views in public schema. supabase_admin default privileges
-- auto-grant to anon (platform limitation we can't fix), so this catch-all
-- neutralizes the leak. Does NOT touch 'authenticated' (RLS needs grants).
--
-- Both loops are dynamic — they catch ALL current objects regardless of count,
-- making this safe to re-run as a periodic hardening sweep if needed.
-- =============================================================================

-- NOTE: No BEGIN/COMMIT — Supabase SQL Editor handles DDL atomically
-- and explicit transactions can cause issues with DO blocks.

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
              OR c LIKE 'search_path=pg_catalog,public%'
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
    RAISE NOTICE 'Fixed search_path: public.% (args: %)', rec.proname, rec.args;
  END LOOP;

  RAISE NOTICE '── Total functions fixed: % ──', fixed_count;
END;
$$;

-- ─── Step 2: Revoke anon ALL on ALL public relations (catch-all) ────────────
-- Removes table/view/sequence grants from anon in one sweep.
-- supabase_admin default privileges auto-grant to anon on new objects,
-- and we cannot ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin on managed
-- Supabase. This catch-all neutralizes the leak regardless of owner.
--
-- NOTE: We do NOT revoke from 'authenticated' — RLS needs table grants to
-- evaluate policies. Revoking from authenticated would return 0 rows on
-- every query (PostgreSQL checks GRANT before RLS).
DO $$
DECLARE
  r RECORD;
  revoked_count INTEGER := 0;
BEGIN
  FOR r IN
    SELECT quote_ident(n.nspname) || '.' || quote_ident(c.relname) AS rel
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p', 'S', 'v')  -- tables, partitions, sequences, views
  LOOP
    EXECUTE 'REVOKE ALL ON ' || r.rel || ' FROM anon';
    revoked_count := revoked_count + 1;
  END LOOP;
  RAISE NOTICE '── Revoked anon privileges on % relations ──', revoked_count;
END;
$$;

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
