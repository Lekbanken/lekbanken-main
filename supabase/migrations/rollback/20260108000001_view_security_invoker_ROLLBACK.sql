-- ============================================================================
-- ROLLBACK: View Security Invoker
-- ============================================================================
-- Run this to undo 20260108000001_view_security_invoker.sql
-- ============================================================================

-- Rollback session_artifact_state (remove security_invoker)
DROP VIEW IF EXISTS public.session_artifact_state;

CREATE VIEW public.session_artifact_state
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

GRANT SELECT ON public.session_artifact_state TO authenticated;

-- Rollback tenant_memberships (if it was a view)
DO $$
DECLARE
  obj_type char;
BEGIN
  SELECT relkind INTO obj_type
  FROM pg_class c
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public' AND c.relname = 'tenant_memberships';
  
  IF obj_type = 'v' THEN
    DROP VIEW IF EXISTS public.tenant_memberships;
    
    CREATE VIEW public.tenant_memberships
    AS
    SELECT * FROM public.user_tenant_memberships;
    
    GRANT SELECT ON public.tenant_memberships TO authenticated;
  END IF;
END $$;
