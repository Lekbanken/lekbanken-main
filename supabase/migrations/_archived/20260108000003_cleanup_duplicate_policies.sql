-- ============================================================================
-- CLEANUP: Remove duplicate policies on users table
-- ============================================================================
-- Previous migration added new policies but old ones had different names.
-- This removes the redundant policies.
-- ============================================================================

-- ===========================================
-- 1. USERS TABLE - Remove duplicate SELECT policies
-- ===========================================
-- Keep: users_select_self, users_select_coworkers, users_select_admin
-- Remove duplicates:

DROP POLICY IF EXISTS "system_admin_can_select_all_users" ON public.users;  -- duplicate of users_select_admin
DROP POLICY IF EXISTS "users_can_select_own" ON public.users;               -- duplicate of users_select_self
DROP POLICY IF EXISTS "users_select_admin_or_self" ON public.users;         -- covered by users_select_admin + users_select_self

-- ===========================================
-- 2. USERS TABLE - Remove duplicate UPDATE policies
-- ===========================================
-- Keep: users_update_self, users_update_admin
-- Remove duplicates:

DROP POLICY IF EXISTS "users_can_update_own_profile" ON public.users;       -- duplicate of users_update_self
DROP POLICY IF EXISTS "users_update_admin_or_self" ON public.users;         -- covered by users_update_admin + users_update_self

-- ===========================================
-- 3. VERIFICATION
-- ===========================================
-- After applying, run:
--
-- SELECT cmd, COUNT(*) FROM pg_policies 
-- WHERE schemaname = 'public' AND tablename = 'users'
-- GROUP BY cmd;
--
-- Expected:
--   INSERT: 1
--   SELECT: 3
--   UPDATE: 2
-- ===========================================
