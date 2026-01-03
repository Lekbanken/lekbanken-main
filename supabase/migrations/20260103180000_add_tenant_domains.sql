-- Custom Domains support for multi-tenant routing
-- Phase A: Manual provisioning (no self-service verification yet)

-- ============================================
-- 1. TENANT_DOMAINS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.tenant_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  hostname text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended')),
  is_primary boolean NOT NULL DEFAULT false,
  verified_at timestamptz,
  verification_token text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Unique constraint on hostname (only one tenant per domain)
CREATE UNIQUE INDEX IF NOT EXISTS tenant_domains_hostname_unique_idx 
  ON public.tenant_domains (hostname);

-- Index for tenant lookup
CREATE INDEX IF NOT EXISTS tenant_domains_tenant_id_idx 
  ON public.tenant_domains (tenant_id);

-- Index for active domain lookups
CREATE INDEX IF NOT EXISTS tenant_domains_active_hostname_idx 
  ON public.tenant_domains (hostname) 
  WHERE status = 'active';

-- ============================================
-- 2. RLS POLICIES
-- ============================================

ALTER TABLE public.tenant_domains ENABLE ROW LEVEL SECURITY;

-- System admins can manage all domains
DROP POLICY IF EXISTS "system_admin_manage_tenant_domains" ON public.tenant_domains;
CREATE POLICY "system_admin_manage_tenant_domains"
  ON public.tenant_domains
  FOR ALL
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());

-- Tenant admins/owners can view domains for their tenant
DROP POLICY IF EXISTS "tenant_admin_view_domains" ON public.tenant_domains;
CREATE POLICY "tenant_admin_view_domains"
  ON public.tenant_domains
  FOR SELECT
  USING (
    tenant_id = ANY(public.get_user_tenant_ids()) AND (
      public.has_tenant_role(tenant_id, 'admin'::public.tenant_role_enum) OR
      public.has_tenant_role(tenant_id, 'owner'::public.tenant_role_enum)
    )
  );

-- All authenticated users can read active domains (needed for hostname resolution)
DROP POLICY IF EXISTS "authenticated_read_active_domains" ON public.tenant_domains;
CREATE POLICY "authenticated_read_active_domains"
  ON public.tenant_domains
  FOR SELECT
  USING (status = 'active');

-- ============================================
-- 3. RPC FUNCTION FOR HOSTNAME RESOLUTION
-- ============================================

-- Function to resolve tenant_id from hostname
-- Returns NULL if hostname not found or not active
CREATE OR REPLACE FUNCTION public.get_tenant_id_by_hostname(p_hostname text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT tenant_id
  FROM public.tenant_domains
  WHERE hostname = lower(trim(p_hostname))
    AND status = 'active'
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_tenant_id_by_hostname(text) IS 
  'Resolves a hostname to tenant_id. Used by middleware for custom domain routing. Returns NULL if not found or inactive.';

-- Grant execute to authenticated and anon (needed for middleware which runs before auth)
GRANT EXECUTE ON FUNCTION public.get_tenant_id_by_hostname(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tenant_id_by_hostname(text) TO anon;

-- ============================================
-- 4. UPDATED_AT TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION public.update_tenant_domains_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tenant_domains_updated_at_trigger ON public.tenant_domains;
CREATE TRIGGER tenant_domains_updated_at_trigger
  BEFORE UPDATE ON public.tenant_domains
  FOR EACH ROW
  EXECUTE FUNCTION public.update_tenant_domains_updated_at();

-- ============================================
-- 5. SEED PRIMARY PLATFORM SUBDOMAIN (optional)
-- ============================================

-- You can optionally seed platform subdomains here if you want them in the table
-- This is not required - the RPC function can also handle subdomain extraction

-- Example: Add demo tenant's subdomain
-- INSERT INTO public.tenant_domains (tenant_id, hostname, status, is_primary)
-- SELECT id, 'demo.lekbanken.no', 'active', true
-- FROM public.tenants WHERE slug = 'demo'
-- ON CONFLICT (hostname) DO NOTHING;
