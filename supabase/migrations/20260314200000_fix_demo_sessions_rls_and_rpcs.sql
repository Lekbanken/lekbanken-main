-- Fix REG-DEMO-002: demo_sessions RLS policy overly permissive
-- Fix REG-DEMO-003: Demo RPC functions lack ownership verification
--
-- PROBLEM (REG-DEMO-002):
--   Policy "service_role_full_demo_sessions_access" has no TO clause,
--   meaning it applies to ALL roles (including authenticated).
--   Since service_role bypasses RLS entirely, the policy is meaningless
--   for service_role but grants full CRUD to ALL authenticated users
--   on ALL demo sessions.
--
-- PROBLEM (REG-DEMO-003):
--   add_demo_feature_usage() and mark_demo_session_converted() are
--   SECURITY DEFINER and accept session_id without verifying auth.uid()
--   matches the session's user_id. Any authenticated user who knows a
--   valid session UUID can modify that session's data.
--
-- FIX (REG-DEMO-002):
--   1. Drop the overly permissive policy
--   2. Create a proper authenticated policy scoped to own sessions (SELECT/UPDATE only)
--   3. System admins get full access via is_system_admin()
--
-- FIX (REG-DEMO-003):
--   Add AND user_id = auth.uid() to both RPC functions so they only
--   modify sessions owned by the calling user.
--
-- DEPLOY ORDER: Safe to apply at any time. No app code changes needed.

-- Step 1: Drop the overly permissive policy
DROP POLICY IF EXISTS "service_role_full_demo_sessions_access" ON public.demo_sessions;

-- Step 2: Create proper authenticated policies
-- Users can SELECT their own demo sessions
-- (Replaces the existing users_view_own_demo_sessions with same logic — keep it)

-- Users can UPDATE their own demo sessions (for feature tracking, conversion)
DROP POLICY IF EXISTS "users_update_own_demo_sessions" ON public.demo_sessions;
CREATE POLICY "users_update_own_demo_sessions" ON public.demo_sessions
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- System admins get full access (admin dashboard, cleanup)
DROP POLICY IF EXISTS "system_admin_full_demo_sessions_access" ON public.demo_sessions;
CREATE POLICY "system_admin_full_demo_sessions_access" ON public.demo_sessions
  TO authenticated
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());

-- Step 3: Fix RPC functions with ownership check
CREATE OR REPLACE FUNCTION public.add_demo_feature_usage(session_id uuid, feature_name text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  UPDATE public.demo_sessions
  SET
    features_used = features_used || jsonb_build_object(
      'feature', feature_name,
      'timestamp', now(),
      'iso_timestamp', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    ),
    updated_at = now()
  WHERE id = session_id
    AND user_id = auth.uid();
END;
$function$;

CREATE OR REPLACE FUNCTION public.mark_demo_session_converted(session_id uuid, conversion_type_param text DEFAULT 'signup'::text, conversion_plan_param text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  UPDATE public.demo_sessions
  SET
    converted = true,
    conversion_type = conversion_type_param,
    conversion_plan = conversion_plan_param,
    ended_at = COALESCE(ended_at, now()),
    updated_at = now()
  WHERE id = session_id
    AND user_id = auth.uid();
END;
$function$;
