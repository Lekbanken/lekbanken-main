-- =============================================================================
-- Fix: Scope categories admin policy to authenticated + grant anon on games
-- =============================================================================
--
-- Problem 1: categories_admin_all policy applies to all roles (including anon).
--   When anon evaluates it, Postgres calls is_system_admin() which anon lacks
--   EXECUTE permission on → "permission denied for function is_system_admin".
--   Fix: Recreate the policy with TO authenticated so anon never triggers it.
--
-- Problem 2: games table has a correct anon RLS policy (games_select_anon)
--   but lacks the table-level GRANT SELECT. Without it anon gets 42501.
--   Fix: Add GRANT SELECT on games to anon.
--
-- bundle_items: intentionally left locked — not needed for public endpoints.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Scope categories admin policy to authenticated only
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS categories_admin_all ON public.categories;
CREATE POLICY categories_admin_all
  ON public.categories
  FOR ALL
  TO authenticated
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Grant anon SELECT on games (RLS policy games_select_anon already limits
--    to owner_tenant_id IS NULL AND status = 'published')
-- ─────────────────────────────────────────────────────────────────────────────
GRANT SELECT ON public.games TO anon;
