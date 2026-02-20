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
-- FIX: Revoke default privileges for anon and authenticated on the current
-- role (postgres). Service_role is kept as-is (god-mode role for backend).
--
-- PLATFORM LIMITATION: Supabase managed hosting does not allow
-- ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin (permission denied).
-- supabase_admin defaults still grant to anon/authenticated. This is
-- mitigated by the dynamic REVOKE migration (20260220230000) which strips
-- EXECUTE from ALL SECURITY DEFINER functions regardless of owner.
--
-- NOTE: This only affects FUTURE objects. Existing objects are already
-- handled by migration 20260220230000 (functions) and RLS (tables).
-- =============================================================================

-- ─── Step 1: Functions — stop auto-granting EXECUTE ─────────────────────────
-- Without this, any new SECURITY DEFINER function gets EXECUTE to anon/auth.
-- Uses implicit current role (postgres) — FOR ROLE syntax requires superuser.

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;

-- ─── Step 2: Tables — stop auto-granting ALL ────────────────────────────────
-- RLS protects data, but defense-in-depth: don't grant table access by default.

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;

-- ─── Step 3: Sequences — stop auto-granting ALL ────────────────────────────
-- Less critical but completes the hardening.

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated;

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
-- Expected: postgres-owned rows should NOT have anon= or authenticated=.
-- supabase_admin rows will still show them (platform limitation).
-- Compensating control: migration 20260220230000 dynamically revokes.
-- =============================================================================

-- =============================================================================
-- ROLLBACK (if needed)
-- =============================================================================
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public
--   GRANT EXECUTE ON FUNCTIONS TO anon, authenticated;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public
--   GRANT ALL ON TABLES TO anon, authenticated;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public
--   GRANT ALL ON SEQUENCES TO anon, authenticated;
-- =============================================================================
