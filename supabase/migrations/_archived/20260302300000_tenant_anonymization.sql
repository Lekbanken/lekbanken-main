-- ============================================================================
-- TENANT ANONYMIZATION: Soft delete with 90-day retention + restore vault
-- ============================================================================
-- Adds anonymization lifecycle to tenants:
--   active → anonymized (PII scrubbed, access revoked, vault backup created)
--   anonymized → archived (restore from vault within 90 days)
--   anonymized → purged (hard delete after 90 days or manual purge)
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Add 'anonymized' to tenant_status_enum
-- ---------------------------------------------------------------------------
ALTER TYPE tenant_status_enum ADD VALUE IF NOT EXISTS 'anonymized';

-- ---------------------------------------------------------------------------
-- 2. Add anonymization columns to tenants
-- ---------------------------------------------------------------------------
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS anonymized_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS purge_after         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS anonymized_by       UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS anonymization_reason TEXT,
  ADD COLUMN IF NOT EXISTS anonymization_version INT DEFAULT 1;

-- Index for auto-purge cron job
CREATE INDEX IF NOT EXISTS idx_tenants_purge_after
  ON public.tenants(purge_after)
  WHERE status = 'anonymized' AND purge_after IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 3. Create tenant_restore_vault table
-- ---------------------------------------------------------------------------
-- Stores encrypted PII backup for restore within grace period.
-- Separate from tenants to prove PII was actually removed from live data.
CREATE TABLE IF NOT EXISTS public.tenant_restore_vault (
  tenant_id    UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  encrypted_payload TEXT NOT NULL,       -- AES-256-GCM encrypted JSON
  purge_after  TIMESTAMPTZ NOT NULL,     -- matches tenants.purge_after
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by   UUID REFERENCES public.users(id) ON DELETE SET NULL,
  kms_version  TEXT NOT NULL DEFAULT 'v1' -- key rotation support
);

COMMENT ON TABLE public.tenant_restore_vault IS
  'Encrypted PII backup for anonymized tenants. Data is deleted when tenant is purged or restored.';

-- ---------------------------------------------------------------------------
-- 4. RLS: vault is only accessible via service role (no user-facing RLS)
-- ---------------------------------------------------------------------------
ALTER TABLE public.tenant_restore_vault ENABLE ROW LEVEL SECURITY;

-- Only system_admin can read vault entries (for admin UI restore info)
CREATE POLICY "vault_system_admin_select"
  ON public.tenant_restore_vault FOR SELECT
  USING (public.is_system_admin());

-- Insert/delete only via service role (no user-facing write)
-- Service role bypasses RLS, so no INSERT/DELETE policies needed.

-- ---------------------------------------------------------------------------
-- 5. Update tenant RLS: hide anonymized tenants from non-system_admin
-- ---------------------------------------------------------------------------
-- Add a restrictive policy that blocks access to anonymized tenants
-- for all users except system_admin.
-- Note: RESTRICTIVE means it combines with AND (not OR) with permissive policies.
CREATE POLICY "hide_anonymized_tenants"
  ON public.tenants AS RESTRICTIVE
  FOR SELECT
  TO authenticated
  USING (
    status != 'anonymized'
    OR public.is_system_admin()
  );

COMMIT;
