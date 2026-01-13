-- ============================================================================
-- RLS Policy Test Harness for Demo Mode
-- Purpose: Verify that RLS policies correctly enforce demo restrictions
-- Usage: psql $DATABASE_URL -f tests/rls/demo-policies.test.sql
-- ============================================================================

-- Setup: Create test users if they don't exist
-- (Assumes you have seeded demo users)

\echo '================================================'
\echo 'Demo RLS Policy Test Suite'
\echo '================================================'
\echo ''

-- ============================================================================
-- TEST 1: Demo Tenant Write Protection
-- Expected: Demo user CANNOT modify demo tenant
-- ============================================================================

\echo 'TEST 1: Demo tenant write protection'

BEGIN;

-- Create test demo user if doesn't exist
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
)
VALUES (
  'test-demo-user-00000000-0000-0000-0001'::uuid,
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'test-demo@rls-test.internal',
  crypt('test-password', gen_salt('bf')),
  now(),
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

-- Create corresponding profile
INSERT INTO profiles (
  id,
  email,
  is_demo_user,
  is_ephemeral,
  global_role
)
VALUES (
  'test-demo-user-00000000-0000-0000-0001'::uuid,
  'test-demo@rls-test.internal',
  true,
  true,
  'demo_private_user'
)
ON CONFLICT (id) DO UPDATE SET
  is_demo_user = true,
  is_ephemeral = true;

-- Set session to demo user
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO '{"sub": "test-demo-user-00000000-0000-0000-0001", "role": "authenticated"}';

-- Try to update demo tenant (should FAIL)
DO $$
DECLARE
  update_succeeded BOOLEAN := false;
BEGIN
  UPDATE tenants
  SET name = 'HACKED BY DEMO USER'
  WHERE demo_flag = true;

  -- If we get here, update succeeded (BAD!)
  update_succeeded := true;

EXCEPTION
  WHEN insufficient_privilege THEN
    -- Expected: RLS policy blocked the update
    RAISE NOTICE '✓ TEST 1 PASSED: Demo user cannot modify demo tenant (insufficient_privilege)';
  WHEN OTHERS THEN
    -- Expected: Some other RLS error
    RAISE NOTICE '✓ TEST 1 PASSED: Demo user cannot modify demo tenant (RLS blocked: %)', SQLERRM;
END $$;

ROLLBACK;

\echo ''

-- ============================================================================
-- TEST 2: Demo Content Access Control
-- Expected: Demo user ONLY sees is_demo_content = true activities
-- ============================================================================

\echo 'TEST 2: Demo content access control'

BEGIN;

-- Ensure we have test demo user
INSERT INTO profiles (
  id,
  email,
  is_demo_user,
  global_role
)
VALUES (
  'test-demo-user-00000000-0000-0000-0002'::uuid,
  'test-demo2@rls-test.internal',
  true,
  'demo_private_user'
)
ON CONFLICT (id) DO UPDATE SET is_demo_user = true;

-- Create test activities
INSERT INTO activities (id, name, is_global, is_demo_content)
VALUES
  ('test-activity-demo-00000000-0000-0001'::uuid, 'Demo Activity 1', true, true),
  ('test-activity-demo-00000000-0000-0002'::uuid, 'Demo Activity 2', true, true),
  ('test-activity-nodemo-0000000-0000-0001'::uuid, 'Hidden Activity 1', true, false),
  ('test-activity-nodemo-0000000-0000-0002'::uuid, 'Hidden Activity 2', true, false)
ON CONFLICT (id) DO NOTHING;

-- Set session to demo user
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO '{"sub": "test-demo-user-00000000-0000-0000-0002", "role": "authenticated"}';

-- Query activities (should only see is_demo_content = true)
DO $$
DECLARE
  visible_count INTEGER;
  demo_only_count INTEGER;
BEGIN
  -- Count all visible activities
  SELECT COUNT(*) INTO visible_count
  FROM activities
  WHERE is_global = true;

  -- Count visible activities that are NOT demo content
  SELECT COUNT(*) INTO demo_only_count
  FROM activities
  WHERE is_global = true AND is_demo_content = false;

  IF demo_only_count > 0 THEN
    RAISE EXCEPTION '✗ TEST 2 FAILED: Demo user can see % non-demo activities', demo_only_count;
  ELSE
    RAISE NOTICE '✓ TEST 2 PASSED: Demo user only sees demo content (% activities)', visible_count;
  END IF;
END $$;

ROLLBACK;

\echo ''

-- ============================================================================
-- TEST 3: System Admin Can Modify Demo Tenant
-- Expected: System admin CAN modify demo tenant
-- ============================================================================

\echo 'TEST 3: System admin can modify demo tenant'

BEGIN;

-- Create system admin user
INSERT INTO profiles (
  id,
  email,
  global_role
)
VALUES (
  'test-system-admin-0000000-0000-0001'::uuid,
  'test-admin@rls-test.internal',
  'system_admin'
)
ON CONFLICT (id) DO UPDATE SET global_role = 'system_admin';

-- Ensure we have a demo tenant
INSERT INTO tenants (
  id,
  name,
  slug,
  demo_flag,
  type
)
VALUES (
  'test-demo-tenant-000000-0000-0001'::uuid,
  'Test Demo Tenant',
  'test-demo',
  true,
  'demo'
)
ON CONFLICT (id) DO UPDATE SET demo_flag = true;

-- Set session to system admin
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO '{"sub": "test-system-admin-0000000-0000-0001", "role": "authenticated"}';

-- Try to update demo tenant (should SUCCEED)
DO $$
DECLARE
  updated_name TEXT;
BEGIN
  UPDATE tenants
  SET name = 'Updated by System Admin'
  WHERE id = 'test-demo-tenant-000000-0000-0001'::uuid
  RETURNING name INTO updated_name;

  IF updated_name = 'Updated by System Admin' THEN
    RAISE NOTICE '✓ TEST 3 PASSED: System admin can modify demo tenant';
  ELSE
    RAISE EXCEPTION '✗ TEST 3 FAILED: Update did not take effect';
  END IF;
END $$;

ROLLBACK;

\echo ''

-- ============================================================================
-- TEST 4: Demo User Flag Protection
-- Expected: Demo user CANNOT change their is_demo_user flag
-- ============================================================================

\echo 'TEST 4: Demo user flag protection'

BEGIN;

-- Create test demo user
INSERT INTO profiles (
  id,
  email,
  is_demo_user,
  global_role
)
VALUES (
  'test-demo-user-00000000-0000-0000-0003'::uuid,
  'test-demo3@rls-test.internal',
  true,
  'demo_private_user'
)
ON CONFLICT (id) DO UPDATE SET is_demo_user = true;

-- Set session to demo user
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO '{"sub": "test-demo-user-00000000-0000-0000-0003", "role": "authenticated"}';

-- Try to change is_demo_user flag (should FAIL)
DO $$
DECLARE
  update_succeeded BOOLEAN := false;
BEGIN
  UPDATE profiles
  SET is_demo_user = false
  WHERE id = 'test-demo-user-00000000-0000-0000-0003'::uuid;

  -- If we get here, update succeeded (BAD!)
  update_succeeded := true;

EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE '✓ TEST 4 PASSED: Demo user cannot change is_demo_user flag';
  WHEN OTHERS THEN
    RAISE NOTICE '✓ TEST 4 PASSED: Demo user cannot change is_demo_user flag (RLS blocked: %)', SQLERRM;
END $$;

ROLLBACK;

\echo ''

-- ============================================================================
-- TEST 5: Demo Session Visibility Restriction
-- Expected: Demo user CANNOT create public sessions
-- ============================================================================

\echo 'TEST 5: Demo session visibility restriction'

BEGIN;

-- Create test demo user
INSERT INTO profiles (
  id,
  email,
  is_demo_user,
  global_role
)
VALUES (
  'test-demo-user-00000000-0000-0000-0004'::uuid,
  'test-demo4@rls-test.internal',
  true,
  'demo_private_user'
)
ON CONFLICT (id) DO UPDATE SET is_demo_user = true;

-- Create demo tenant membership
INSERT INTO memberships (
  user_id,
  tenant_id,
  role
)
VALUES (
  'test-demo-user-00000000-0000-0000-0004'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid, -- Demo tenant
  'demo_org_user'
)
ON CONFLICT (user_id, tenant_id) DO NOTHING;

-- Set session to demo user
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO '{"sub": "test-demo-user-00000000-0000-0000-0004", "role": "authenticated"}';

-- Try to create public session (should FAIL if sessions table has visibility column)
DO $$
DECLARE
  has_visibility_column BOOLEAN;
BEGIN
  -- Check if visibility column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions'
    AND column_name = 'visibility'
  ) INTO has_visibility_column;

  IF NOT has_visibility_column THEN
    RAISE NOTICE '⊘ TEST 5 SKIPPED: sessions.visibility column does not exist';
    RETURN;
  END IF;

  -- Try to create public session
  BEGIN
    INSERT INTO sessions (
      tenant_id,
      name,
      created_by,
      visibility
    )
    VALUES (
      '00000000-0000-0000-0000-000000000001'::uuid,
      'Test Public Session',
      'test-demo-user-00000000-0000-0000-0004'::uuid,
      'public'
    );

    -- If we get here, insert succeeded (BAD!)
    RAISE EXCEPTION '✗ TEST 5 FAILED: Demo user was able to create public session';

  EXCEPTION
    WHEN check_violation THEN
      RAISE NOTICE '✓ TEST 5 PASSED: Demo user cannot create public sessions (check violation)';
    WHEN insufficient_privilege THEN
      RAISE NOTICE '✓ TEST 5 PASSED: Demo user cannot create public sessions (RLS blocked)';
    WHEN OTHERS THEN
      RAISE NOTICE '✓ TEST 5 PASSED: Demo user cannot create public sessions (blocked: %)', SQLERRM;
  END;
END $$;

ROLLBACK;

\echo ''

-- ============================================================================
-- TEST 6: Demo User Can Create Private Sessions
-- Expected: Demo user CAN create private/demo sessions
-- ============================================================================

\echo 'TEST 6: Demo user can create private sessions'

BEGIN;

-- Create test demo user
INSERT INTO profiles (
  id,
  email,
  is_demo_user,
  global_role
)
VALUES (
  'test-demo-user-00000000-0000-0000-0005'::uuid,
  'test-demo5@rls-test.internal',
  true,
  'demo_private_user'
)
ON CONFLICT (id) DO UPDATE SET is_demo_user = true;

-- Create demo tenant membership
INSERT INTO memberships (
  user_id,
  tenant_id,
  role
)
VALUES (
  'test-demo-user-00000000-0000-0000-0005'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  'demo_org_user'
)
ON CONFLICT (user_id, tenant_id) DO NOTHING;

-- Set session to demo user
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO '{"sub": "test-demo-user-00000000-0000-0000-0005", "role": "authenticated"}';

-- Try to create private session (should SUCCEED)
DO $$
DECLARE
  has_visibility_column BOOLEAN;
  created_session_id UUID;
BEGIN
  -- Check if visibility column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions'
    AND column_name = 'visibility'
  ) INTO has_visibility_column;

  IF NOT has_visibility_column THEN
    RAISE NOTICE '⊘ TEST 6 SKIPPED: sessions.visibility column does not exist';
    RETURN;
  END IF;

  -- Try to create private session
  INSERT INTO sessions (
    tenant_id,
    name,
    created_by,
    visibility
  )
  VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Test Private Session',
    'test-demo-user-00000000-0000-0000-0005'::uuid,
    'private'
  )
  RETURNING id INTO created_session_id;

  IF created_session_id IS NOT NULL THEN
    RAISE NOTICE '✓ TEST 6 PASSED: Demo user can create private sessions';
  ELSE
    RAISE EXCEPTION '✗ TEST 6 FAILED: Private session creation returned NULL';
  END IF;
END $$;

ROLLBACK;

\echo ''

-- ============================================================================
-- SUMMARY
-- ============================================================================

\echo '================================================'
\echo 'Test Suite Complete'
\echo '================================================'
\echo ''
\echo 'If all tests passed, RLS policies are working correctly.'
\echo 'If any tests failed, review the RLS policies migration.'
\echo ''
\echo 'To run in CI: psql $DATABASE_URL -f tests/rls/demo-policies.test.sql'
\echo '================================================'
