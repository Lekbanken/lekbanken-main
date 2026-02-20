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
-- Step 2: Revoke ALL privileges from anon AND PUBLIC on ALL relations in
-- public schema (tables, partitions, views, materialized views, sequences,
-- foreign tables). supabase_admin default privileges auto-grant to anon
-- (platform limitation we can't fix), so this catch-all neutralizes the
-- leak. Does NOT touch 'authenticated' (RLS needs table grants to evaluate).
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

-- ─── Step 2: Revoke anon + PUBLIC on ALL public relations (catch-all) ───────
-- Removes grants from anon AND PUBLIC on every relation type in one sweep.
-- supabase_admin default privileges auto-grant to anon on new objects,
-- and we cannot ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin on managed
-- Supabase. This catch-all neutralizes the leak regardless of owner.
--
-- relkind coverage:
--   r = ordinary tables, p = partitioned tables, v = views,
--   m = materialized views, S = sequences, f = foreign tables
--
-- NOTE: We do NOT revoke from 'authenticated' — RLS needs table grants to
-- evaluate policies. Revoking from authenticated would return 0 rows on
-- every query (PostgreSQL checks GRANT before RLS).
DO $$
DECLARE
  r RECORD;
  revoked_anon INTEGER := 0;
  revoked_public INTEGER := 0;
BEGIN
  FOR r IN
    SELECT quote_ident(n.nspname) || '.' || quote_ident(c.relname) AS rel
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p', 'v', 'm', 'S', 'f')
  LOOP
    EXECUTE 'REVOKE ALL ON ' || r.rel || ' FROM anon';
    revoked_anon := revoked_anon + 1;
    EXECUTE 'REVOKE ALL ON ' || r.rel || ' FROM PUBLIC';
    revoked_public := revoked_public + 1;
  END LOOP;
  RAISE NOTICE '── Revoked anon on % relations, PUBLIC on % relations ──', revoked_anon, revoked_public;
END;
$$;

-- =============================================================================
-- Step 3: Reload PostgREST schema cache
-- =============================================================================
-- The search_path changes above alter function metadata that PostgREST
-- caches. Without a reload, PostgREST may fail to route RPC calls (they
-- hang or return 404) until it naturally refreshes. This NOTIFY triggers
-- an immediate cache reload.
-- =============================================================================
NOTIFY pgrst, 'reload schema';

-- =============================================================================
-- VERIFICATION: Run after applying (all counts should be 0)
-- =============================================================================
--
-- 1) Insecure SECURITY DEFINER search_path (should be 0):
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
-- 2) Anon relation grants (should be 0):
--
-- SELECT count(*) AS anon_relation_grants
-- FROM pg_class c
-- JOIN pg_namespace n ON n.oid = c.relnamespace
-- WHERE n.nspname = 'public'
--   AND c.relkind IN ('r','p','v','m','S','f')
--   AND c.relacl IS NOT NULL
--   AND array_to_string(c.relacl, ',') LIKE '%anon=%';
--
-- 3) PUBLIC relation grants (should be 0):
--
-- SELECT count(*) AS public_relation_grants
-- FROM pg_class c
-- JOIN pg_namespace n ON n.oid = c.relnamespace
-- WHERE n.nspname = 'public'
--   AND c.relkind IN ('r','p','v','m','S','f')
--   AND c.relacl IS NOT NULL
--   AND array_to_string(c.relacl, ',') LIKE '%=/=%';
--
-- 4) Tables WITHOUT RLS enabled (should be 0 or a known allowlist):
--
-- SELECT schemaname, tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
--   AND rowsecurity = false
-- ORDER BY tablename;
--
-- 5) Full SECURITY DEFINER list (should all show pg_catalog, public):
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
