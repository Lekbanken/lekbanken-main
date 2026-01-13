-- supabase/migrations/20260113200000_mfa_enterprise_foundation.sql
-- 
-- MFA Enterprise Foundation Migration
-- Hybrid Security Model:
--   - All users CAN use MFA (optional)
--   - System admins MUST have MFA (required)
--   - Tenant admins (owner/admin) MUST have MFA (required)
--
-- This migration creates:
--   1. tenant_mfa_policies - Tenant-wide MFA configuration
--   2. mfa_trusted_devices - Device trust for skip-MFA on known devices
--   3. mfa_audit_log - Security audit trail
--   4. Updates to user_mfa - Additional columns for enterprise features

-- ============================================================================
-- 1. TENANT MFA POLICIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.tenant_mfa_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Policy Settings
  is_enforced BOOLEAN NOT NULL DEFAULT false,
  -- 'optional' = users can enable, 'admins_required' = admins must, 'all_users' = everyone must
  enforcement_level TEXT NOT NULL DEFAULT 'admins_required' 
    CHECK (enforcement_level IN ('optional', 'admins_required', 'all_users')),
  grace_period_days INTEGER NOT NULL DEFAULT 7
    CHECK (grace_period_days >= 0 AND grace_period_days <= 90),
  
  -- Allowed Methods
  allow_totp BOOLEAN NOT NULL DEFAULT true,
  allow_sms BOOLEAN NOT NULL DEFAULT false,
  allow_webauthn BOOLEAN NOT NULL DEFAULT false,
  
  -- Recovery Options
  require_backup_email BOOLEAN NOT NULL DEFAULT false,
  recovery_codes_required BOOLEAN NOT NULL DEFAULT true,
  
  -- Trusted Devices
  allow_trusted_devices BOOLEAN NOT NULL DEFAULT true,
  trusted_device_duration_days INTEGER NOT NULL DEFAULT 30
    CHECK (trusted_device_duration_days >= 1 AND trusted_device_duration_days <= 365),
  
  -- Enforcement Metadata
  enforced_at TIMESTAMPTZ,
  enforced_by UUID REFERENCES auth.users(id),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(tenant_id)
);

-- Index for tenant lookup
CREATE INDEX IF NOT EXISTS idx_tenant_mfa_policies_tenant 
  ON public.tenant_mfa_policies(tenant_id);

-- Enable RLS
ALTER TABLE public.tenant_mfa_policies ENABLE ROW LEVEL SECURITY;

-- Select: System admins or tenant members
DROP POLICY IF EXISTS tenant_mfa_policies_select ON public.tenant_mfa_policies;
CREATE POLICY tenant_mfa_policies_select ON public.tenant_mfa_policies
  FOR SELECT TO authenticated
  USING (
    public.is_system_admin()
    OR tenant_id = ANY(public.get_user_tenant_ids())
  );

-- Modify: System admins or tenant owner/admin
DROP POLICY IF EXISTS tenant_mfa_policies_modify ON public.tenant_mfa_policies;
CREATE POLICY tenant_mfa_policies_modify ON public.tenant_mfa_policies
  FOR ALL TO authenticated
  USING (
    public.is_system_admin()
    OR public.has_tenant_role(tenant_id, ARRAY['owner', 'admin']::public.tenant_role_enum[])
  )
  WITH CHECK (
    public.is_system_admin()
    OR public.has_tenant_role(tenant_id, ARRAY['owner', 'admin']::public.tenant_role_enum[])
  );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.tenant_mfa_policies_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tenant_mfa_policies_updated_at ON public.tenant_mfa_policies;
CREATE TRIGGER tenant_mfa_policies_updated_at
  BEFORE UPDATE ON public.tenant_mfa_policies
  FOR EACH ROW
  EXECUTE FUNCTION public.tenant_mfa_policies_set_updated_at();

COMMENT ON TABLE public.tenant_mfa_policies IS 'Tenant-wide MFA policy configuration';
COMMENT ON COLUMN public.tenant_mfa_policies.enforcement_level IS 'optional=available, admins_required=owner/admin must use, all_users=everyone must use';

-- ============================================================================
-- 2. MFA TRUSTED DEVICES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.mfa_trusted_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Device Identification
  device_fingerprint TEXT NOT NULL,
  device_name TEXT,
  
  -- Device Metadata
  user_agent TEXT,
  ip_address INET,
  browser TEXT,
  os TEXT,
  
  -- Token for verification (hashed)
  trust_token_hash TEXT NOT NULL,
  
  -- Validity
  trusted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  last_used_at TIMESTAMPTZ,
  
  -- Status
  is_revoked BOOLEAN NOT NULL DEFAULT false,
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, tenant_id, device_fingerprint)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mfa_trusted_devices_user 
  ON public.mfa_trusted_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_mfa_trusted_devices_tenant 
  ON public.mfa_trusted_devices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mfa_trusted_devices_lookup 
  ON public.mfa_trusted_devices(trust_token_hash) 
  WHERE NOT is_revoked;
CREATE INDEX IF NOT EXISTS idx_mfa_trusted_devices_user_tenant
  ON public.mfa_trusted_devices(user_id, tenant_id)
  WHERE NOT is_revoked;
CREATE INDEX IF NOT EXISTS idx_mfa_trusted_devices_expiry
  ON public.mfa_trusted_devices(expires_at)
  WHERE NOT is_revoked;

-- Enable RLS
ALTER TABLE public.mfa_trusted_devices ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage own devices, admins can view/revoke for their tenants
DROP POLICY IF EXISTS mfa_trusted_devices_owner ON public.mfa_trusted_devices;
CREATE POLICY mfa_trusted_devices_owner ON public.mfa_trusted_devices
  FOR ALL TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.is_system_admin()
    OR public.has_tenant_role(tenant_id, ARRAY['owner', 'admin']::public.tenant_role_enum[])
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR public.is_system_admin()
  );

COMMENT ON TABLE public.mfa_trusted_devices IS 'Trusted devices that can skip MFA verification';

-- ============================================================================
-- 3. MFA AUDIT LOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.mfa_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  
  event_type TEXT NOT NULL CHECK (event_type IN (
    'enrollment_started', 'enrollment_completed', 'enrollment_cancelled',
    'verification_success', 'verification_failed',
    'disabled_by_user', 'disabled_by_admin',
    'recovery_code_generated', 'recovery_code_used',
    'device_trusted', 'device_revoked',
    'enforcement_triggered', 'grace_period_warning'
  )),
  
  method TEXT CHECK (method IN ('totp', 'recovery_code', 'sms', 'webauthn', NULL)),
  
  ip_address INET,
  user_agent TEXT,
  device_fingerprint TEXT,
  
  success BOOLEAN NOT NULL DEFAULT true,
  failure_reason TEXT,
  failure_count INTEGER,
  
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mfa_audit_log_user 
  ON public.mfa_audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mfa_audit_log_tenant 
  ON public.mfa_audit_log(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mfa_audit_log_failures 
  ON public.mfa_audit_log(user_id, created_at DESC) 
  WHERE success = false;
CREATE INDEX IF NOT EXISTS idx_mfa_audit_log_event_type
  ON public.mfa_audit_log(event_type, created_at DESC);

-- Enable RLS
ALTER TABLE public.mfa_audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: Users see own logs, admins see tenant logs
DROP POLICY IF EXISTS mfa_audit_log_select ON public.mfa_audit_log;
CREATE POLICY mfa_audit_log_select ON public.mfa_audit_log
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.is_system_admin()
    OR (tenant_id IS NOT NULL AND public.has_tenant_role(tenant_id, ARRAY['owner', 'admin']::public.tenant_role_enum[]))
  );

-- Policy: Insert allowed for service role or own user
DROP POLICY IF EXISTS mfa_audit_log_insert ON public.mfa_audit_log;
CREATE POLICY mfa_audit_log_insert ON public.mfa_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

COMMENT ON TABLE public.mfa_audit_log IS 'Audit trail for all MFA-related events';

-- ============================================================================
-- 4. UPDATE USER_MFA TABLE
-- ============================================================================

-- Add new columns for enterprise features
ALTER TABLE public.user_mfa
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS backup_email TEXT,
  ADD COLUMN IF NOT EXISTS recovery_codes_count INTEGER DEFAULT 10,
  ADD COLUMN IF NOT EXISTS recovery_codes_used INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS recovery_codes_generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"email_on_new_device": true, "email_on_recovery_use": true, "email_on_mfa_disabled": true}'::jsonb,
  ADD COLUMN IF NOT EXISTS grace_period_end TIMESTAMPTZ;

-- Index for tenant lookup
CREATE INDEX IF NOT EXISTS idx_user_mfa_tenant 
  ON public.user_mfa(tenant_id);

-- Index for grace period checks
CREATE INDEX IF NOT EXISTS idx_user_mfa_grace_period
  ON public.user_mfa(grace_period_end)
  WHERE grace_period_end IS NOT NULL;

-- Backfill tenant_id from primary membership
UPDATE public.user_mfa m
SET tenant_id = (
  SELECT tenant_id FROM public.user_tenant_memberships 
  WHERE user_id = m.user_id AND is_primary = true
  LIMIT 1
)
WHERE m.tenant_id IS NULL;

-- Add comments
COMMENT ON COLUMN public.user_mfa.tenant_id IS 'Primary tenant context for MFA settings';
COMMENT ON COLUMN public.user_mfa.backup_email IS 'Alternative email for recovery notifications';
COMMENT ON COLUMN public.user_mfa.recovery_codes_count IS 'Total recovery codes generated';
COMMENT ON COLUMN public.user_mfa.recovery_codes_used IS 'Number of recovery codes already used';
COMMENT ON COLUMN public.user_mfa.grace_period_end IS 'Deadline for MFA enrollment if enforced';

-- ============================================================================
-- 5. HELPER FUNCTION: Check if user requires MFA
-- ============================================================================

CREATE OR REPLACE FUNCTION public.user_requires_mfa(target_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  required BOOLEAN,
  reason TEXT,
  grace_period_end TIMESTAMPTZ,
  enrolled BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_is_system_admin BOOLEAN := false;
  v_is_tenant_admin BOOLEAN := false;
  v_tenant_policy_requires BOOLEAN := false;
  v_enrolled_at TIMESTAMPTZ;
  v_grace_period_end TIMESTAMPTZ;
BEGIN
  -- Use provided user_id or current user
  v_user_id := COALESCE(target_user_id, auth.uid());
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::TEXT, NULL::TIMESTAMPTZ, false;
    RETURN;
  END IF;
  
  -- Check if user is enrolled
  SELECT um.enrolled_at, um.grace_period_end
  INTO v_enrolled_at, v_grace_period_end
  FROM public.user_mfa um
  WHERE um.user_id = v_user_id;
  
  -- Check if system admin
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = v_user_id AND u.global_role = 'system_admin'
  ) INTO v_is_system_admin;
  
  IF v_is_system_admin THEN
    RETURN QUERY SELECT 
      true,
      'system_admin'::TEXT,
      v_grace_period_end,
      (v_enrolled_at IS NOT NULL);
    RETURN;
  END IF;
  
  -- Check if tenant admin (owner or admin role in any tenant)
  SELECT EXISTS (
    SELECT 1 FROM public.user_tenant_memberships utm
    WHERE utm.user_id = v_user_id
      AND utm.status = 'active'
      AND utm.role IN ('owner', 'admin')
  ) INTO v_is_tenant_admin;
  
  IF v_is_tenant_admin THEN
    RETURN QUERY SELECT 
      true,
      'tenant_admin'::TEXT,
      v_grace_period_end,
      (v_enrolled_at IS NOT NULL);
    RETURN;
  END IF;
  
  -- Check tenant policies that enforce for all users
  SELECT EXISTS (
    SELECT 1 
    FROM public.tenant_mfa_policies tmp
    JOIN public.user_tenant_memberships utm ON utm.tenant_id = tmp.tenant_id
    WHERE utm.user_id = v_user_id
      AND utm.status = 'active'
      AND tmp.is_enforced = true
      AND tmp.enforcement_level = 'all_users'
  ) INTO v_tenant_policy_requires;
  
  IF v_tenant_policy_requires THEN
    RETURN QUERY SELECT 
      true,
      'tenant_policy'::TEXT,
      v_grace_period_end,
      (v_enrolled_at IS NOT NULL);
    RETURN;
  END IF;
  
  -- MFA not required
  RETURN QUERY SELECT 
    false,
    NULL::TEXT,
    NULL::TIMESTAMPTZ,
    (v_enrolled_at IS NOT NULL);
END;
$$;

GRANT EXECUTE ON FUNCTION public.user_requires_mfa(UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.user_requires_mfa(UUID) FROM public;

COMMENT ON FUNCTION public.user_requires_mfa IS 'Check if a user requires MFA based on role or policy';

-- ============================================================================
-- 6. HELPER FUNCTION: Get user admin roles
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_admin_roles(target_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  is_system_admin BOOLEAN,
  tenant_admin_of UUID[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_is_system_admin BOOLEAN := false;
  v_tenant_ids UUID[];
BEGIN
  v_user_id := COALESCE(target_user_id, auth.uid());
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, ARRAY[]::UUID[];
    RETURN;
  END IF;
  
  -- Check system admin
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = v_user_id AND u.global_role = 'system_admin'
  ) INTO v_is_system_admin;
  
  -- Get tenant admin roles
  SELECT COALESCE(array_agg(utm.tenant_id), ARRAY[]::UUID[])
  INTO v_tenant_ids
  FROM public.user_tenant_memberships utm
  WHERE utm.user_id = v_user_id
    AND utm.status = 'active'
    AND utm.role IN ('owner', 'admin');
  
  RETURN QUERY SELECT v_is_system_admin, v_tenant_ids;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_admin_roles(UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_admin_roles(UUID) FROM public;

COMMENT ON FUNCTION public.get_user_admin_roles IS 'Get admin role status for a user (system_admin and tenant admin/owner)';

-- ============================================================================
-- 7. GRANTS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_mfa_policies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mfa_trusted_devices TO authenticated;
GRANT SELECT, INSERT ON public.mfa_audit_log TO authenticated;

-- Service role needs full access for backend operations
GRANT ALL ON public.tenant_mfa_policies TO service_role;
GRANT ALL ON public.mfa_trusted_devices TO service_role;
GRANT ALL ON public.mfa_audit_log TO service_role;
