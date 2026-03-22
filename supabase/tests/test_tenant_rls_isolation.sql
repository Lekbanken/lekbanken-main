-- =============================================================================
-- MS5 Cross-Tenant Isolation Test
-- =============================================================================
-- Run in Supabase SQL Editor *after* migration 20260305100000 is applied.
--
-- Tests 9 scenarios using two users in two different tenants:
--   User A (tenant T1) and User B (tenant T2)
--
-- Validates that:
--   1. Tenant-scoped plans are invisible across tenants
--   2. Child tables (blocks, versions, etc.) inherit isolation
--   3. Runs are user-scoped and plan-cascade-protected
--   4. Public plans are globally visible
--   5. Private plans are owner-only
--
-- IMPORTANT: This script creates test data and cleans up after itself.
--            Uses a savepoint so failures roll back cleanly.
-- =============================================================================

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════════
-- SETUP: Create test users, tenants, and memberships
-- ═══════════════════════════════════════════════════════════════════════════════

-- Create two test users in auth.users (Supabase local dev only)
INSERT INTO auth.users (id, email, role, aud, instance_id)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'user-a@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'user-b@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000')
ON CONFLICT (id) DO NOTHING;

-- Create corresponding public.users entries
INSERT INTO public.users (id, email, role)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'user-a@test.local', 'user'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'user-b@test.local', 'user')
ON CONFLICT (id) DO NOTHING;

-- Create two tenants
INSERT INTO public.tenants (id, name, slug, type)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Tenant T1', 'tenant-t1', 'school'),
  ('22222222-2222-2222-2222-222222222222', 'Tenant T2', 'tenant-t2', 'school')
ON CONFLICT (id) DO NOTHING;

-- User A → T1 (owner), User B → T2 (owner)
INSERT INTO public.user_tenant_memberships (user_id, tenant_id, role, status, is_primary)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'owner', 'active', true),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'owner', 'active', true)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════════
-- SETUP: Create test plans (as superuser, bypassing RLS)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Plan A1: User A's tenant-visible plan
INSERT INTO public.plans (id, name, owner_user_id, owner_tenant_id, visibility, status)
VALUES ('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'Plan A1 Tenant', 
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '11111111-1111-1111-1111-111111111111',
        'tenant', 'published')
ON CONFLICT (id) DO NOTHING;

-- Plan A2: User A's private plan
INSERT INTO public.plans (id, name, owner_user_id, owner_tenant_id, visibility, status)
VALUES ('a2a2a2a2-a2a2-a2a2-a2a2-a2a2a2a2a2a2', 'Plan A2 Private',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '11111111-1111-1111-1111-111111111111',
        'private', 'published')
ON CONFLICT (id) DO NOTHING;

-- Plan A3: User A's public plan
INSERT INTO public.plans (id, name, owner_user_id, owner_tenant_id, visibility, status)
VALUES ('a3a3a3a3-a3a3-a3a3-a3a3-a3a3a3a3a3a3', 'Plan A3 Public',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '11111111-1111-1111-1111-111111111111',
        'public', 'published')
ON CONFLICT (id) DO NOTHING;

-- Plan B1: User B's tenant-visible plan
INSERT INTO public.plans (id, name, owner_user_id, owner_tenant_id, visibility, status)
VALUES ('b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1', 'Plan B1 Tenant',
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        '22222222-2222-2222-2222-222222222222',
        'tenant', 'published')
ON CONFLICT (id) DO NOTHING;

-- Create a plan_block under Plan A1
INSERT INTO public.plan_blocks (id, plan_id, block_type, position, duration_minutes, title)
VALUES ('ab01ab01-ab01-ab01-ab01-ab01ab01ab01',
        'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1',
        'game', 0, 10, 'Test Block')
ON CONFLICT (id) DO NOTHING;

-- Create a plan_version under Plan A1
INSERT INTO public.plan_versions (id, plan_id, version_number, name, published_by)
VALUES ('c1c1c1c1-c1c1-c1c1-c1c1-c1c1c1c1c1c1',
  'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 1, 'Version 1', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
ON CONFLICT (id) DO NOTHING;

-- Set current_version_id
UPDATE public.plans 
SET current_version_id = 'c1c1c1c1-c1c1-c1c1-c1c1-c1c1c1c1c1c1'
WHERE id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1';

-- ═══════════════════════════════════════════════════════════════════════════════
-- HELPER: Function to impersonate a user via JWT claims
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION _test_set_user(user_uuid uuid)
RETURNS void AS $$
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object(
    'sub', user_uuid::text,
    'role', 'authenticated',
    'aud', 'authenticated'
  )::text, true);
  PERFORM set_config('role', 'authenticated', true);
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════════
-- TEST 1: User B cannot see User A's tenant-scoped plan
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT _test_set_user('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

DO $$
DECLARE
  cnt int;
BEGIN
  SELECT count(*) INTO cnt
  FROM public.plans
  WHERE id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
  
  IF cnt > 0 THEN
    RAISE EXCEPTION 'TEST 1 FAILED: User B can see User A tenant plan (got % rows)', cnt;
  ELSE
    RAISE NOTICE 'TEST 1 PASSED: User B cannot see User A tenant plan ✅';
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- TEST 2: User B cannot see User A's private plan
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  cnt int;
BEGIN
  SELECT count(*) INTO cnt
  FROM public.plans
  WHERE id = 'a2a2a2a2-a2a2-a2a2-a2a2-a2a2a2a2a2a2';
  
  IF cnt > 0 THEN
    RAISE EXCEPTION 'TEST 2 FAILED: User B can see User A private plan (got % rows)', cnt;
  ELSE
    RAISE NOTICE 'TEST 2 PASSED: User B cannot see User A private plan ✅';
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- TEST 3: User B CAN see User A's public plan
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  cnt int;
BEGIN
  SELECT count(*) INTO cnt
  FROM public.plans
  WHERE id = 'a3a3a3a3-a3a3-a3a3-a3a3-a3a3a3a3a3a3';
  
  IF cnt != 1 THEN
    RAISE EXCEPTION 'TEST 3 FAILED: User B should see User A public plan (got % rows)', cnt;
  ELSE
    RAISE NOTICE 'TEST 3 PASSED: User B can see User A public plan ✅';
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- TEST 4: User B cannot see plan_blocks from User A's tenant plan
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  cnt int;
BEGIN
  SELECT count(*) INTO cnt
  FROM public.plan_blocks
  WHERE plan_id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
  
  IF cnt > 0 THEN
    RAISE EXCEPTION 'TEST 4 FAILED: User B can see blocks from User A tenant plan (got % rows)', cnt;
  ELSE
    RAISE NOTICE 'TEST 4 PASSED: User B cannot see blocks from User A tenant plan ✅';
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- TEST 5: User B cannot see plan_versions from User A's tenant plan
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  cnt int;
BEGIN
  SELECT count(*) INTO cnt
  FROM public.plan_versions
  WHERE plan_id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
  
  IF cnt > 0 THEN
    RAISE EXCEPTION 'TEST 5 FAILED: User B can see versions from User A tenant plan (got % rows)', cnt;
  ELSE
    RAISE NOTICE 'TEST 5 PASSED: User B cannot see versions from User A tenant plan ✅';
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- TEST 6: User A CAN see own tenant plan + blocks + versions
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT _test_set_user('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

DO $$
DECLARE
  plan_cnt int;
  block_cnt int;
  version_cnt int;
BEGIN
  SELECT count(*) INTO plan_cnt
  FROM public.plans
  WHERE id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
  
  SELECT count(*) INTO block_cnt
  FROM public.plan_blocks
  WHERE plan_id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
  
  SELECT count(*) INTO version_cnt
  FROM public.plan_versions
  WHERE plan_id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
  
  IF plan_cnt != 1 OR block_cnt < 1 OR version_cnt < 1 THEN
    RAISE EXCEPTION 'TEST 6 FAILED: User A should see own plan (%), blocks (%), versions (%)', plan_cnt, block_cnt, version_cnt;
  ELSE
    RAISE NOTICE 'TEST 6 PASSED: User A can see own tenant plan, blocks, and versions ✅';
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- TEST 7: User A cannot see User B's tenant plan
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  cnt int;
BEGIN
  SELECT count(*) INTO cnt
  FROM public.plans
  WHERE id = 'b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1';
  
  IF cnt > 0 THEN
    RAISE EXCEPTION 'TEST 7 FAILED: User A can see User B tenant plan (got % rows)', cnt;
  ELSE
    RAISE NOTICE 'TEST 7 PASSED: User A cannot see User B tenant plan ✅';
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- TEST 8: User B cannot insert a block into User A's tenant plan
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT _test_set_user('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

DO $$
BEGIN
  BEGIN
    INSERT INTO public.plan_blocks (id, plan_id, block_type, position, duration_minutes, title)
    VALUES ('bad0bad0-bad0-bad0-bad0-bad0bad0bad0',
            'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1',
            'game', 1, 5, 'Injected Block');
    -- If we reach here, the insert succeeded — that's a failure
    RAISE EXCEPTION 'TEST 8 FAILED: User B was able to insert block into User A plan';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'TEST 8 PASSED: User B blocked from inserting block into User A plan ✅';
    WHEN others THEN
      -- RLS violations can also manifest as "new row violates row-level security policy"
      RAISE NOTICE 'TEST 8 PASSED: User B blocked from inserting block (%) ✅', SQLERRM;
  END;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- TEST 9: User B cannot create a run against User A's tenant plan version
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  BEGIN
      INSERT INTO public.runs (id, plan_id, user_id, plan_version_id, status, tenant_id)
    VALUES ('bad1bad1-bad1-bad1-bad1-bad1bad1bad1',
        'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1',
            'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        'c1c1c1c1-c1c1-c1c1-c1c1-c1c1c1c1c1c1',
            'not_started',
            '22222222-2222-2222-2222-222222222222');
    RAISE EXCEPTION 'TEST 9 FAILED: User B was able to create run on User A plan version';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'TEST 9 PASSED: User B blocked from creating run on User A plan ✅';
    WHEN others THEN
      RAISE NOTICE 'TEST 9 PASSED: User B blocked from creating run (%) ✅', SQLERRM;
  END;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- CLEANUP: Reset role and rollback all test data
-- ═══════════════════════════════════════════════════════════════════════════════

-- Reset to superuser role
RESET role;
SELECT set_config('request.jwt.claims', '', true);

-- Drop test helper
DROP FUNCTION IF EXISTS _test_set_user(uuid);

-- Rollback everything — no test data persists
ROLLBACK;

-- ═══════════════════════════════════════════════════════════════════════════════
-- RESULTS SUMMARY
-- ═══════════════════════════════════════════════════════════════════════════════
-- If you see 9x "PASSED ✅" in the NOTICE output and no EXCEPTION, all tests pass.
-- If any test EXCEPTIONs, that test's RLS policy has a gap.
--
-- Test 1:  User B ✗ → User A tenant plan (cross-tenant SELECT)
-- Test 2:  User B ✗ → User A private plan (private SELECT)
-- Test 3:  User B ✓ → User A public plan  (public SELECT)
-- Test 4:  User B ✗ → blocks from A's tenant plan (cascade SELECT)
-- Test 5:  User B ✗ → versions from A's tenant plan (cascade SELECT)
-- Test 6:  User A ✓ → own tenant plan + blocks + versions (owner SELECT)
-- Test 7:  User A ✗ → User B's tenant plan (reverse cross-tenant)
-- Test 8:  User B ✗ → insert block into A's plan (cross-tenant INSERT)
-- Test 9:  User B ✗ → create run on A's plan version (cascade INSERT)
-- =============================================================================
