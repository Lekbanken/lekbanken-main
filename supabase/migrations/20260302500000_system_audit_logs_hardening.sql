-- ============================================================================
-- system_audit_logs hardening: enum event_type + composite indexes
-- ============================================================================

-- 1. Create enum for event_type (prevents typos, improves BI queries)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'system_audit_event_type') THEN
    CREATE TYPE public.system_audit_event_type AS ENUM (
      'TENANT_ANONYMIZED',
      'TENANT_RESTORED',
      'TENANT_PURGED',
      'TENANT_PURGED_AUTO'
    );
  END IF;
END
$$;

-- 2. Migrate event_type column from text to enum
ALTER TABLE public.system_audit_logs
  ALTER COLUMN event_type TYPE public.system_audit_event_type
  USING event_type::public.system_audit_event_type;

-- 3. Drop simple indexes (replaced by composite ones below)
DROP INDEX IF EXISTS idx_system_audit_logs_tenant_id;
DROP INDEX IF EXISTS idx_system_audit_logs_event_type;
DROP INDEX IF EXISTS idx_system_audit_logs_created_at;

-- 4. Composite indexes matching common query patterns
CREATE INDEX IF NOT EXISTS idx_system_audit_logs_tenant_created
  ON public.system_audit_logs (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_audit_logs_event_created
  ON public.system_audit_logs (event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_audit_logs_created
  ON public.system_audit_logs (created_at DESC);

-- 5. Reinforce metadata contract via comments
COMMENT ON COLUMN public.system_audit_logs.metadata IS
  'Structured event data. MUST NOT contain PII (names, emails, phone numbers, addresses). '
  'Only operational data: tenant_id, reason codes, timestamps, version numbers.';
