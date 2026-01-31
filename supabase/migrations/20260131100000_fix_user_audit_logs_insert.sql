-- =============================================================================
-- FIX USER_AUDIT_LOGS INSERT POLICY
-- =============================================================================
-- 
-- Problem: user_audit_logs only has SELECT policy, not INSERT.
-- This causes 403 errors when trying to log audit events via RLS.
--
-- Solution: Add INSERT policy that allows:
-- 1. Users to insert logs about themselves
-- 2. System admins to insert any logs
-- =============================================================================

-- Drop existing policy and recreate with INSERT support
DROP POLICY IF EXISTS "user_audit_logs_owner" ON public.user_audit_logs;
DROP POLICY IF EXISTS "user_audit_logs_select" ON public.user_audit_logs;
DROP POLICY IF EXISTS "user_audit_logs_insert" ON public.user_audit_logs;

-- SELECT: User can see their own logs or logs where they're the actor
CREATE POLICY "user_audit_logs_select" ON public.user_audit_logs
  FOR SELECT 
  USING (
    user_id = auth.uid() 
    OR actor_user_id = auth.uid() 
    OR public.is_system_admin()
  );

-- INSERT: User can insert logs about themselves, or admin can insert any
CREATE POLICY "user_audit_logs_insert" ON public.user_audit_logs
  FOR INSERT 
  WITH CHECK (
    user_id = auth.uid() 
    OR actor_user_id = auth.uid()
    OR public.is_system_admin()
  );

-- Note: No UPDATE/DELETE policies - audit logs should be immutable
