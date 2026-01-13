-- ============================================================================
-- Migration: Create Demo Tenant and Register Subdomain
-- Purpose: Set up the demo tenant for demo.lekbanken.no
-- Date: 2026-01-14
-- ============================================================================

-- Note: 00000000-0000-0000-0000-000000000001 is reserved for Lekbanken main tenant
-- Demo tenant uses: 00000000-0000-0000-0000-00000000de01 (de01 = demo)

-- ============================================================================
-- 1. Create Demo Tenant (if not exists)
-- ============================================================================

INSERT INTO tenants (
  id,
  name,
  slug,
  type,
  status,
  demo_flag,
  primary_color,
  description,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-0000-0000-00000000de01'::uuid,
  'Lekbanken Demo',
  'demo',
  'demo',
  'active',
  true,
  '#3B82F6',  -- Blue primary color
  'Public demo tenant for trying out Lekbanken',
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  demo_flag = EXCLUDED.demo_flag,
  type = EXCLUDED.type,
  status = 'active',
  description = EXCLUDED.description,
  updated_at = now();

-- ============================================================================
-- 2. Register demo.lekbanken.no in tenant_domains
-- ============================================================================

INSERT INTO tenant_domains (
  tenant_id,
  hostname,
  status,
  kind,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-0000-0000-00000000de01'::uuid,
  'demo.lekbanken.no',
  'active',
  'subdomain',
  now(),
  now()
)
ON CONFLICT (hostname) DO UPDATE SET
  tenant_id = EXCLUDED.tenant_id,
  status = 'active',
  kind = 'subdomain',
  updated_at = now();

-- ============================================================================
-- 3. Verification
-- ============================================================================

DO $$
DECLARE
  tenant_exists BOOLEAN;
  domain_exists BOOLEAN;
BEGIN
  -- Check tenant
  SELECT EXISTS (
    SELECT 1 FROM tenants
    WHERE id = '00000000-0000-0000-0000-00000000de01'::uuid
      AND demo_flag = true
  ) INTO tenant_exists;

  -- Check domain
  SELECT EXISTS (
    SELECT 1 FROM tenant_domains
    WHERE hostname = 'demo.lekbanken.no'
      AND tenant_id = '00000000-0000-0000-0000-00000000de01'::uuid
      AND status = 'active'
  ) INTO domain_exists;

  IF tenant_exists AND domain_exists THEN
    RAISE NOTICE '✓ Demo tenant and domain configured successfully';
    RAISE NOTICE '  Tenant ID: 00000000-0000-0000-0000-00000000de01';
    RAISE NOTICE '  Domain: demo.lekbanken.no';
  ELSE
    RAISE NOTICE '⚠ Configuration check:';
    RAISE NOTICE '  Tenant exists: %', tenant_exists;
    RAISE NOTICE '  Domain exists: %', domain_exists;
  END IF;
END $$;
