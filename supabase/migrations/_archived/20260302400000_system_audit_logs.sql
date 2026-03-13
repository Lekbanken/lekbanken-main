-- ============================================================================
-- system_audit_logs — compliance-grade audit trail that survives tenant deletion
-- ============================================================================
-- tenant_audit_logs has FK ON DELETE CASCADE, meaning all audit rows are
-- destroyed when a tenant is hard-deleted. This table intentionally has NO
-- foreign key to tenants so rows persist after DELETE CASCADE.
--
-- Used for: anonymization, restoration, purge events (GDPR compliance).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.system_audit_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type  text NOT NULL,                -- e.g. TENANT_ANONYMIZED, TENANT_RESTORED, TENANT_PURGED
  actor_user_id uuid,                       -- NULL for automated jobs (cron/edge fn)
  tenant_id   uuid,                         -- NO FK — intentionally orphanable
  metadata    jsonb DEFAULT '{}'::jsonb,     -- structured event data (no PII!)
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Index for querying by tenant (even after deletion)
CREATE INDEX IF NOT EXISTS idx_system_audit_logs_tenant_id
  ON public.system_audit_logs (tenant_id);

-- Index for querying by event type
CREATE INDEX IF NOT EXISTS idx_system_audit_logs_event_type
  ON public.system_audit_logs (event_type);

-- Index for time-range queries
CREATE INDEX IF NOT EXISTS idx_system_audit_logs_created_at
  ON public.system_audit_logs (created_at);

-- RLS: only system_admin can read, service_role writes bypass RLS
ALTER TABLE public.system_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "system_audit_logs_select" ON public.system_audit_logs;
CREATE POLICY "system_audit_logs_select" ON public.system_audit_logs
  FOR SELECT
  USING (public.is_system_admin());

-- No INSERT/UPDATE/DELETE policies — writes go through service_role client
-- which bypasses RLS entirely. This prevents any non-admin from reading
-- or tampering with compliance logs.

COMMENT ON TABLE public.system_audit_logs IS
  'Compliance-grade audit trail. No FK to tenants — rows survive tenant deletion.';
COMMENT ON COLUMN public.system_audit_logs.tenant_id IS
  'References a tenant but NO FK constraint — intentionally orphanable after purge.';
COMMENT ON COLUMN public.system_audit_logs.metadata IS
  'Structured event data. MUST NOT contain PII (names, emails, etc).';
