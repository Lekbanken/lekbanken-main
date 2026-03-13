-- Fix RLS permission errors on 5 tables (42501 permission denied)
--
-- ROOT CAUSE 1 — is_system_admin() override
--   Migration 20251209100000_tenant_domain.sql replaced the comprehensive baseline
--   is_system_admin() with a simplified JWT-only version:
--     SELECT coalesce((current_setting('request.jwt.claims',true)::json->>'role')='system_admin',false)
--   This checks only ONE JWT claim. The baseline version checks 5 sources:
--     1. JWT app_metadata.role   2. JWT app_metadata.global_role
--     3. JWT user_metadata.global_role  4. JWT root role claim
--     5. Direct users table lookup (via SECURITY DEFINER — no recursion risk
--        because public.users policies use is_system_admin_jwt_only())
--
--   WHY the override was introduced: The tenant_domain migration needed
--   is_system_admin() for its new RLS policies (tenant_settings, tenant_features,
--   tenant_branding, tenant_invitations, tenant_audit_logs). The CREATE OR REPLACE
--   was likely a convenience stub that wasn't intended to replace the comprehensive
--   version globally. The simplified function is sufficient for JWT-based admin
--   checks but breaks flows where admin status is stored in the users table
--   (global_role / role columns) rather than JWT claims.
--
--   WHY restoring is correct: Sandbox users have admin status set in the database
--   (users.global_role = 'system_admin') but NOT in JWT claims. The simplified
--   version therefore returns FALSE for these users, causing 42501 on any policy
--   using is_system_admin(). The comprehensive version handles both JWT and DB
--   lookup. No later migrations depend on the simplified semantics — the
--   tenant_rls_hardening migration (20251209103000) also uses is_system_admin()
--   and benefits from the comprehensive version.
--
--   RECURSION SAFETY: The comprehensive version uses SECURITY DEFINER, which
--   bypasses RLS when querying public.users. The users table's own RLS policies
--   use is_system_admin_jwt_only() (not is_system_admin()), breaking any
--   potential recursion chain. This design is intentional in the baseline.
--
-- ROOT CAUSE 2 — Missing GRANT TO authenticated
--   5 tables have GRANT ALL TO service_role but no GRANT TO authenticated.
--   Routes using createServerRlsClient() run under the authenticated role,
--   which needs table-level permissions to reach RLS policies.
--
--   Least-privilege analysis (per call-site audit):
--   ┌─────────────────────────┬──────────────────────────────────┬───────────────────────────────┐
--   │ Table                   │ Operations found in app code     │ Grant                         │
--   ├─────────────────────────┼──────────────────────────────────┼───────────────────────────────┤
--   │ user_sessions           │ SELECT, INSERT, UPDATE           │ SELECT, INSERT, UPDATE        │
--   │                         │ (no DELETE — revoke sets         │                               │
--   │                         │  revoked_at timestamp)           │                               │
--   ├─────────────────────────┼──────────────────────────────────┼───────────────────────────────┤
--   │ user_devices            │ SELECT, INSERT, UPDATE, DELETE   │ ALL (full CRUD needed)        │
--   │                         │ (device removal via DELETE)      │                               │
--   ├─────────────────────────┼──────────────────────────────────┼───────────────────────────────┤
--   │ user_legal_acceptances  │ SELECT, INSERT, UPDATE, DELETE   │ SELECT, INSERT, UPDATE,       │
--   │                         │ (upsert=INSERT+UPDATE,           │ DELETE                        │
--   │                         │  GDPR erasure=DELETE)            │                               │
--   ├─────────────────────────┼──────────────────────────────────┼───────────────────────────────┤
--   │ legal_documents         │ SELECT only                      │ SELECT                        │
--   │                         │ (admin writes via service_role)  │                               │
--   ├─────────────────────────┼──────────────────────────────────┼───────────────────────────────┤
--   │ user_tenant_memberships │ SELECT, DELETE                   │ SELECT, DELETE                │
--   │                         │ (25 files read, GDPR=DELETE)     │                               │
--   └─────────────────────────┴──────────────────────────────────┴───────────────────────────────┘

-- ============================================================
-- 1. RESTORE comprehensive is_system_admin()
--    Replaces simplified JWT-only version from tenant_domain.sql
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_system_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_uid uuid;
  v_is_admin boolean := false;
BEGIN
  -- Get current user ID
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check 1: JWT app_metadata.role
  IF COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') IN ('system_admin', 'superadmin', 'admin') THEN
    RETURN TRUE;
  END IF;
  
  -- Check 2: JWT app_metadata.global_role
  IF COALESCE(auth.jwt() -> 'app_metadata' ->> 'global_role', '') = 'system_admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Check 3: JWT user_metadata.global_role
  IF COALESCE(auth.jwt() -> 'user_metadata' ->> 'global_role', '') = 'system_admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Check 4: JWT root role claim
  IF COALESCE(auth.jwt() ->> 'role', '') IN ('system_admin', 'superadmin', 'admin') THEN
    RETURN TRUE;
  END IF;
  
  -- Check 5: Direct lookup in users table (SECURITY DEFINER bypasses RLS —
  -- no recursion because users policies use is_system_admin_jwt_only())
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = v_uid 
    AND (
      global_role = 'system_admin' 
      OR role IN ('system_admin', 'superadmin', 'admin')
    )
  ) INTO v_is_admin;
  
  RETURN v_is_admin;
END;
$function$;

-- ============================================================
-- 2. LEAST-PRIVILEGE GRANTS for authenticated role
--    Each grant is scoped to the operations actually used in app code.
-- ============================================================

-- user_sessions: SELECT (list/history), INSERT (login callback), UPDATE (revoke sets timestamp)
GRANT SELECT, INSERT, UPDATE ON public.user_sessions TO authenticated;

-- user_devices: full CRUD — SELECT (list), INSERT (register), UPDATE (rename), DELETE (remove)
GRANT ALL ON public.user_devices TO authenticated;

-- user_legal_acceptances: SELECT (check acceptance), INSERT+UPDATE (upsert on accept), DELETE (GDPR erasure)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_legal_acceptances TO authenticated;

-- legal_documents: SELECT only — admin mutations use service_role client
GRANT SELECT ON public.legal_documents TO authenticated;

-- user_tenant_memberships: SELECT (25 files — auth context, tenant resolution, admin checks), DELETE (GDPR erasure)
GRANT SELECT, DELETE ON public.user_tenant_memberships TO authenticated;
