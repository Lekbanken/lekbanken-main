-- ============================================================================
-- SECURITY HARDENING: Upgrade search_path to pg_catalog, public
-- ============================================================================
-- Based on DBA review: pg_catalog should be included for defense-in-depth
-- These functions already have search_path=public, we upgrade to pg_catalog, public
-- ============================================================================
-- Risk: NONE - No functional change, only hardening
-- IMPORTANT: Parameter names and logic MUST match existing functions exactly!
-- Source of truth: 20260104120100_repair_consolidation.sql
-- ============================================================================

-- ===========================================
-- 1. Update is_tenant_member
-- ===========================================
-- Original: LANGUAGE sql, no STABLE, has is_system_admin() check

CREATE OR REPLACE FUNCTION public.is_tenant_member(p_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT 
    public.is_system_admin() 
    OR EXISTS (
      SELECT 1 FROM public.user_tenant_memberships
      WHERE user_id = auth.uid()
        AND tenant_id = p_tenant_id
        AND status = 'active'
    );
$$;

-- ===========================================
-- 2. Update get_user_tenant_ids
-- ===========================================
-- Original: LANGUAGE sql, no STABLE

CREATE OR REPLACE FUNCTION public.get_user_tenant_ids()
RETURNS uuid[]
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT CASE
    WHEN public.is_system_admin() THEN ARRAY(SELECT id FROM public.tenants)
    ELSE COALESCE(
      (SELECT array_agg(tenant_id) FROM public.user_tenant_memberships WHERE user_id = auth.uid() AND status = 'active'),
      ARRAY[]::uuid[]
    )
  END;
$$;

-- ===========================================
-- 3. Update has_tenant_role (array version)
-- ===========================================
-- Original uses p_tenant_id, not target_tenant

CREATE OR REPLACE FUNCTION public.has_tenant_role(p_tenant_id uuid, required_roles public.tenant_role_enum[])
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF public.is_system_admin() THEN
    RETURN TRUE;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.user_tenant_memberships
    WHERE user_id = auth.uid()
      AND tenant_id = p_tenant_id
      AND role = ANY(required_roles)
      AND status = 'active'
  );
END;
$$;

-- ===========================================
-- 4. Update has_tenant_role (single role version)
-- ===========================================

CREATE OR REPLACE FUNCTION public.has_tenant_role(p_tenant_id uuid, required_role public.tenant_role_enum)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  RETURN public.has_tenant_role(p_tenant_id, ARRAY[required_role]);
END;
$$;

-- ===========================================
-- 6. DOCUMENTATION: Functions needing manual review
-- ===========================================
-- The following SECURITY DEFINER functions have NO search_path set.
-- These need their definitions fetched and recreated with search_path:
--
-- SESSION/TRIGGER FUNCTIONS (lower risk - internal use):
--   - session_trigger_record_error
--   - session_trigger_clear_error  
--   - session_triggers_disable_all
--   - session_triggers_rearm_all
--   - log_session_event
--   - get_session_events
--   - get_session_event_stats
--   - snapshot_game_roles_to_session
--   - create_game_snapshot
--   - create_session_with_snapshot
--
-- LEARNING FUNCTIONS:
--   - learning_course_completed
--   - learning_prerequisites_met
--   - learning_requirement_satisfied
--   - learning_get_unsatisfied_requirements
--
-- PLAN/TRIGGER FUNCTIONS:
--   - get_next_plan_version_number
--   - trg_plan_blocks_update_plan_status
--   - trg_plans_update_status
--
-- AUTH TRIGGER (CRITICAL):
--   - handle_new_user
--
-- OTHER:
--   - get_effective_design
--
-- To patch these, run this query to get definitions:
-- SELECT proname, pg_get_functiondef(p.oid)
-- FROM pg_proc p
-- JOIN pg_namespace n ON p.pronamespace = n.oid
-- WHERE n.nspname = 'public'
-- AND p.prosecdef = true
-- AND p.proconfig IS NULL
-- ORDER BY proname;
-- ===========================================
