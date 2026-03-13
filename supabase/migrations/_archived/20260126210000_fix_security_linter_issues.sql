-- ============================================================================
-- FIX SECURITY LINTER ISSUES
-- ============================================================================

-- 1. Fix SECURITY DEFINER view - cookie_consent_statistics
-- The view should use SECURITY INVOKER (default) instead of SECURITY DEFINER
-- to respect the querying user's permissions

-- Recreate the view with explicit security_invoker = true
DROP VIEW IF EXISTS public.cookie_consent_statistics;

CREATE VIEW public.cookie_consent_statistics 
WITH (security_invoker = true) AS
SELECT
  date_trunc('day', created_at) AS date,
  event_type,
  consent_version,
  COUNT(*) AS event_count,
  COUNT(DISTINCT consent_id) AS unique_consents,
  SUM(CASE WHEN (new_state->>'functional')::boolean THEN 1 ELSE 0 END) AS functional_accepted,
  SUM(CASE WHEN (new_state->>'analytics')::boolean THEN 1 ELSE 0 END) AS analytics_accepted,
  SUM(CASE WHEN (new_state->>'marketing')::boolean THEN 1 ELSE 0 END) AS marketing_accepted,
  SUM(CASE WHEN dnt_enabled THEN 1 ELSE 0 END) AS dnt_count,
  SUM(CASE WHEN gpc_enabled THEN 1 ELSE 0 END) AS gpc_count
FROM public.cookie_consent_audit
WHERE created_at > now() - interval '90 days'
GROUP BY date_trunc('day', created_at), event_type, consent_version
ORDER BY date DESC;

-- Grant appropriate permissions (read-only for authenticated users)
GRANT SELECT ON public.cookie_consent_statistics TO authenticated;

-- 2. Enable RLS on migration_log table
-- This is an internal table that should not be accessible to regular users
ALTER TABLE public.migration_log ENABLE ROW LEVEL SECURITY;

-- Create a restrictive policy - only service_role can access
DROP POLICY IF EXISTS "migration_log_service_only" ON public.migration_log;
CREATE POLICY "migration_log_service_only" ON public.migration_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Ensure no public access
REVOKE ALL ON public.migration_log FROM anon, authenticated;
