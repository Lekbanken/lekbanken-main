-- ============================================================================
-- SECURITY FIX: Views with SECURITY INVOKER
-- ============================================================================
-- This migration ensures views respect the caller's RLS policies instead of
-- running with the owner's (postgres) elevated privileges.
-- ============================================================================
-- Risk: MEDIUM - Views may bypass RLS on underlying tables
-- Rollback: DROP VIEW ... CREATE VIEW without security_invoker option
-- Requires: PostgreSQL 15+ (Supabase uses 15+)
-- ============================================================================
-- NOTE: We use DROP/CREATE instead of ALTER VIEW because:
--   - PostgreSQL 15 does not support ALTER VIEW ... SET (security_invoker = on)
--   - The security_invoker option can only be set at CREATE time
--   - We use CASCADE to handle dependencies, then re-grant permissions
-- ============================================================================

-- ===========================================
-- 1. session_artifact_state view
-- ===========================================

-- Drop and recreate with security_invoker
DROP VIEW IF EXISTS public.session_artifact_state CASCADE;

CREATE VIEW public.session_artifact_state
WITH (security_invoker = on)
AS
SELECT
  sa.session_id,
  ARRAY_REMOVE(
    ARRAY_AGG(sav.id ORDER BY sav.revealed_at ASC)
      FILTER (WHERE sav.revealed_at IS NOT NULL),
    NULL
  ) AS revealed_variant_ids,
  (
    SELECT sav2.id
    FROM public.session_artifact_variants sav2
    JOIN public.session_artifacts sa2 ON sa2.id = sav2.session_artifact_id
    WHERE sa2.session_id = sa.session_id
      AND sav2.highlighted_at IS NOT NULL
    ORDER BY sav2.highlighted_at DESC
    LIMIT 1
  ) AS highlighted_variant_id,
  MAX(sav.revealed_at) AS last_revealed_at,
  MAX(sav.highlighted_at) AS last_highlighted_at
FROM public.session_artifacts sa
LEFT JOIN public.session_artifact_variants sav
  ON sav.session_artifact_id = sa.id
GROUP BY sa.session_id;

-- Grant access
GRANT SELECT ON public.session_artifact_state TO authenticated;
REVOKE ALL ON public.session_artifact_state FROM public;

-- ===========================================
-- 2. tenant_memberships backward-compat view
-- ===========================================

-- Check if it exists as a view (not a table)
DO $$
DECLARE
  obj_type char;
BEGIN
  SELECT relkind INTO obj_type
  FROM pg_class c
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public' AND c.relname = 'tenant_memberships';
  
  IF obj_type = 'v' THEN
    -- It's a view - recreate with security_invoker
    DROP VIEW IF EXISTS public.tenant_memberships;
    
    CREATE VIEW public.tenant_memberships
    WITH (security_invoker = on)
    AS
    SELECT * FROM public.user_tenant_memberships;
    
    GRANT SELECT ON public.tenant_memberships TO authenticated;
    REVOKE ALL ON public.tenant_memberships FROM public;
    
    RAISE NOTICE 'Recreated tenant_memberships view with security_invoker';
  ELSIF obj_type = 'r' THEN
    -- It's a table - don't modify
    RAISE NOTICE 'tenant_memberships is a table, not a view - skipping';
  ELSE
    RAISE NOTICE 'tenant_memberships not found or unknown type: %', obj_type;
  END IF;
END $$;

-- ===========================================
-- 3. VERIFICATION COMMENT
-- ===========================================
-- After applying this migration, run the following to verify:
--
-- SELECT c.relname, reloptions
-- FROM pg_class c
-- JOIN pg_namespace n ON c.relnamespace = n.oid
-- WHERE c.relkind = 'v'
-- AND n.nspname = 'public'
-- AND c.relname IN ('session_artifact_state', 'tenant_memberships');
--
-- Expected output should include: {security_invoker=on}
-- ===========================================
