-- ============================================================================
-- Seed: Demo Tenant
-- Purpose: Create the main demo tenant for public demo sessions
-- Author: Demo Implementation Team
-- Date: 2026-01-14
-- ============================================================================

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
  settings,
  branding,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid, -- Fixed UUID for demo tenant
  'Lekbanken Demo',
  'demo',
  'demo',
  'demo',
  true,
  jsonb_build_object(
    'is_demo', true,
    'demo_tier', 'free', -- Default tier
    'content_access', 'curated', -- Only see is_demo_content = true
    'max_users', 50, -- Max concurrent demo users
    'session_timeout_hours', 2, -- Auto-expire after 2h
    'features_enabled', ARRAY[
      'browse_activities',
      'view_activity_details',
      'create_sessions',
      'join_sessions',
      'view_gamification',
      'earn_xp'
    ],
    'features_disabled', ARRAY[
      'export_data',
      'invite_users',
      'modify_tenant_settings',
      'access_billing',
      'create_public_sessions',
      'advanced_analytics',
      'custom_branding'
    ],
    'restrictions', jsonb_build_object(
      'max_sessions_per_user', 10,
      'max_participants_per_session', 20,
      'can_delete_sessions', true,
      'can_modify_global_content', false
    )
  ),
  jsonb_build_object(
    'primary_color', '#3B82F6', -- Blue
    'logo_url', null,
    'custom_domain', null
  ),
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  demo_flag = EXCLUDED.demo_flag,
  type = EXCLUDED.type,
  status = EXCLUDED.status,
  settings = EXCLUDED.settings,
  updated_at = now();

-- Verify tenant was created
DO $$
DECLARE
  tenant_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM tenants
    WHERE id = '00000000-0000-0000-0000-000000000001'::uuid
  ) INTO tenant_exists;

  IF tenant_exists THEN
    RAISE NOTICE '✓ Demo tenant created/updated: 00000000-0000-0000-0000-000000000001';
  ELSE
    RAISE EXCEPTION '✗ Failed to create demo tenant';
  END IF;
END $$;

-- ============================================================================
-- Create Demo Facilitator Profile (Optional)
-- Used for creating demo session templates
-- ============================================================================

-- Note: This creates a profile only. Auth user should be created via Supabase Auth API
INSERT INTO profiles (
  id,
  email,
  display_name,
  is_demo_user,
  is_ephemeral,
  global_role,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000099'::uuid,
  'demo-facilitator@demo.lekbanken.internal',
  'Demo Facilitator',
  true,
  false, -- Not ephemeral - permanent demo account
  'demo_private_user',
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE SET
  is_demo_user = true,
  display_name = EXCLUDED.display_name,
  updated_at = now();

-- Create membership for demo facilitator
INSERT INTO memberships (
  user_id,
  tenant_id,
  role,
  created_at
)
VALUES (
  '00000000-0000-0000-0000-000000000099'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  'demo_org_admin',
  now()
)
ON CONFLICT (user_id, tenant_id) DO UPDATE SET
  role = EXCLUDED.role;

\echo '✓ Demo facilitator profile created'

-- ============================================================================
-- Verification
-- ============================================================================

DO $$
DECLARE
  demo_tenant_id UUID;
  demo_facilitator_id UUID;
  membership_exists BOOLEAN;
BEGIN
  -- Check tenant
  SELECT id INTO demo_tenant_id
  FROM tenants
  WHERE demo_flag = true AND slug = 'demo'
  LIMIT 1;

  -- Check facilitator
  SELECT id INTO demo_facilitator_id
  FROM profiles
  WHERE email = 'demo-facilitator@demo.lekbanken.internal'
  LIMIT 1;

  -- Check membership
  SELECT EXISTS (
    SELECT 1 FROM memberships
    WHERE user_id = demo_facilitator_id
      AND tenant_id = demo_tenant_id
  ) INTO membership_exists;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Demo Tenant Seed Complete';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Demo Tenant ID: %', demo_tenant_id;
  RAISE NOTICE 'Demo Facilitator ID: %', demo_facilitator_id;
  RAISE NOTICE 'Membership created: %', membership_exists;
  RAISE NOTICE '========================================';
END $$;

COMMIT;

-- ============================================================================
-- NOTES
-- ============================================================================

-- This seed creates:
-- 1. Demo tenant (00000000-0000-0000-0000-000000000001)
-- 2. Demo facilitator profile (for creating session templates)
-- 3. Membership linking facilitator to demo tenant

-- Next steps:
-- 1. Create demo auth users via Supabase Auth API (see scripts/create-demo-auth-users.ts)
-- 2. Seed demo content (02_demo_content.sql)
-- 3. Create demo session templates (03_demo_sessions.sql)

-- For ephemeral users:
-- - Created on-demand via /auth/demo endpoint
-- - Auto-cleaned after 24h by cleanup function
-- - No need to seed in advance
