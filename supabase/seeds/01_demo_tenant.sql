-- ============================================================================
-- Seed: Demo Tenant
-- Purpose: Create the main demo tenant for public demo sessions
-- Author: Demo Implementation Team
-- Date: 2026-01-14
-- ============================================================================

-- NOTE: 00000000-0000-0000-0000-000000000001 is reserved for Lekbanken main tenant
-- Demo tenant uses: 00000000-0000-0000-0000-00000000de01 (de01 = demo 01)

BEGIN;

\echo 'Creating demo tenant...'

-- ============================================================================
-- Create Demo Tenant
-- Fixed UUID for consistency across environments
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
  '00000000-0000-0000-0000-00000000de01'::uuid, -- Fixed UUID for demo tenant (de01 = demo)
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

-- Verify tenant was created
DO $$
DECLARE
  tenant_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM tenants
    WHERE id = '00000000-0000-0000-0000-00000000de01'::uuid
  ) INTO tenant_exists;

  IF tenant_exists THEN
    RAISE NOTICE '✓ Demo tenant created/updated: 00000000-0000-0000-0000-00000000de01';
  ELSE
    RAISE EXCEPTION '✗ Failed to create demo tenant';
  END IF;
END $$;

-- ============================================================================
-- Register demo.lekbanken.no in tenant_domains
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

\echo '✓ Demo domain registered: demo.lekbanken.no'

-- ============================================================================
-- Verification
-- ============================================================================

DO $$
DECLARE
  demo_tenant_id UUID;
  domain_exists BOOLEAN;
BEGIN
  -- Check tenant
  SELECT id INTO demo_tenant_id
  FROM tenants
  WHERE demo_flag = true AND slug = 'demo'
  LIMIT 1;

  -- Check domain
  SELECT EXISTS (
    SELECT 1 FROM tenant_domains
    WHERE hostname = 'demo.lekbanken.no'
      AND status = 'active'
  ) INTO domain_exists;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Demo Tenant Seed Complete';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Demo Tenant ID: %', demo_tenant_id;
  RAISE NOTICE 'Domain registered: %', domain_exists;
  RAISE NOTICE '========================================';
END $$;

COMMIT;

-- ============================================================================
-- NOTES
-- ============================================================================

-- This seed creates:
-- 1. Demo tenant (00000000-0000-0000-0000-00000000de01)
-- 2. Subdomain entry for demo.lekbanken.no

-- Next steps:
-- 1. Demo users are created on-demand via /auth/demo endpoint
-- 2. Auto-cleaned after 24h by cleanup function
-- 3. No need to seed users in advance

-- For ephemeral users:
-- - Created on-demand via /auth/demo endpoint
-- - Auto-cleaned after 24h by cleanup function
-- - No need to seed in advance
