-- =============================================================================
-- Migration: 20260220232000_default_privileges_hardening.sql
-- Description: Revoke default privileges that auto-grant to anon/authenticated
-- =============================================================================
-- CONTEXT: pg_default_acl shows that BOTH postgres and supabase_admin owners
-- have ALTER DEFAULT PRIVILEGES that auto-grant:
--   - EXECUTE on functions → anon, authenticated, service_role
--   - ALL on tables → anon, authenticated, service_role
--   - ALL on sequences → anon, authenticated, service_role
--
-- This means EVERY future migration that creates a function/table/sequence
-- automatically grants access to anon and authenticated — completely undoing
-- the EXECUTE hardening from migration 20260220230000.
--
-- FIX: Revoke default privileges for anon and authenticated. Service_role
-- is kept as-is (it's the "god-mode" role used by backend code).
--
-- NOTE: This only affects FUTURE objects. Existing objects are already
-- handled by migration 20260220230000 (functions) and RLS (tables).
-- =============================================================================

BEGIN;

-- ─── Step 1: Functions — stop auto-granting EXECUTE ─────────────────────────
-- Without this, any new SECURITY DEFINER function gets EXECUTE to anon/auth.

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;

-- ─── Step 2: Tables — stop auto-granting ALL ────────────────────────────────
-- RLS protects data, but defense-in-depth: don't grant table access by default.

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;

-- ─── Step 3: Sequences — stop auto-granting ALL ────────────────────────────
-- Less critical but completes the hardening.

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated;

COMMIT;

-- =============================================================================
-- VERIFICATION: Run after applying
-- =============================================================================
-- SELECT
--   defaclrole::regrole AS owner,
--   n.nspname AS schema,
--   defaclobjtype AS objtype,
--   defaclacl
-- FROM pg_default_acl d
-- LEFT JOIN pg_namespace n ON n.oid = d.defaclnamespace
-- WHERE (n.nspname = 'public' OR d.defaclnamespace IS NULL);
--
-- Expected: anon= and authenticated= should be GONE from defaclacl on all rows.
-- service_role= should still be present.
-- =============================================================================

-- =============================================================================
-- ROLLBACK (if needed)
-- =============================================================================
-- ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
--   GRANT EXECUTE ON FUNCTIONS TO anon, authenticated;
-- ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
--   GRANT EXECUTE ON FUNCTIONS TO anon, authenticated;
-- ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
--   GRANT ALL ON TABLES TO anon, authenticated;
-- ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
--   GRANT ALL ON TABLES TO anon, authenticated;
-- ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
--   GRANT ALL ON SEQUENCES TO anon, authenticated;
-- ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
--   GRANT ALL ON SEQUENCES TO anon, authenticated;
-- =============================================================================
