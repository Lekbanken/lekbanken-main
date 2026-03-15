-- =============================================================================
-- Lekbanken Staging Seed — Minimal Test Data Provisioning
-- =============================================================================
-- Purpose: Make existing staging auth users fully functional in the app.
-- Target:  Run ONCE against the staging Supabase project (vmpdejhgpsrful…)
--          via SQL Editor or `supabase db execute`.
--
-- Prerequisites:
--   The three test auth users must already exist in auth.users:
--     - test-system-admin@lekbanken.no
--     - test-tenant-admin@lekbanken.no
--     - test-regular-user@lekbanken.no
--
-- Safety:
--   ✅ Idempotent — uses ON CONFLICT / upsert patterns
--   ✅ Never touches production (separate project)
--   ✅ Only creates test data with clearly prefixed names
--   ✅ Does NOT create auth.users (they must exist already)
--
-- After running, verify:
--   1. SELECT * FROM public.users WHERE email LIKE 'test-%@lekbanken.no';
--   2. SELECT * FROM public.tenants WHERE tenant_key = 'staging-test';
--   3. SELECT m.*, t.name FROM user_tenant_memberships m
--      JOIN tenants t ON t.id = m.tenant_id
--      WHERE m.user_id IN (SELECT id FROM auth.users WHERE email LIKE 'test-%@lekbanken.no');
-- =============================================================================

DO $$
DECLARE
  v_admin_id    uuid;
  v_tadmin_id   uuid;
  v_regular_id  uuid;
  v_tenant_id   uuid := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  v_count       int  := 0;
BEGIN
  -- ==========================================================================
  -- Step 0: Resolve auth user IDs from email (fail-fast if missing)
  -- ==========================================================================
  SELECT id INTO v_admin_id   FROM auth.users WHERE email = 'test-system-admin@lekbanken.no';
  SELECT id INTO v_tadmin_id  FROM auth.users WHERE email = 'test-tenant-admin@lekbanken.no';
  SELECT id INTO v_regular_id FROM auth.users WHERE email = 'test-regular-user@lekbanken.no';

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Auth user test-system-admin@lekbanken.no not found. Create it in Supabase Dashboard first.';
  END IF;
  IF v_tadmin_id IS NULL THEN
    RAISE EXCEPTION 'Auth user test-tenant-admin@lekbanken.no not found. Create it in Supabase Dashboard first.';
  END IF;
  IF v_regular_id IS NULL THEN
    RAISE EXCEPTION 'Auth user test-regular-user@lekbanken.no not found. Create it in Supabase Dashboard first.';
  END IF;

  RAISE NOTICE 'Found auth users: admin=%, tadmin=%, regular=%', v_admin_id, v_tadmin_id, v_regular_id;

  -- ==========================================================================
  -- Step 1: Ensure public.users profiles exist
  -- ==========================================================================
  INSERT INTO public.users (id, email, full_name, role, global_role)
  VALUES
    (v_admin_id,   'test-system-admin@lekbanken.no',  'Test System Admin',  'admin',  'system_admin'),
    (v_tadmin_id,  'test-tenant-admin@lekbanken.no',  'Test Tenant Admin',  'admin',  'member'),
    (v_regular_id, 'test-regular-user@lekbanken.no',  'Test Regular User',  'member', 'member')
  ON CONFLICT (id) DO UPDATE SET
    full_name   = EXCLUDED.full_name,
    role        = EXCLUDED.role,
    global_role = EXCLUDED.global_role,
    updated_at  = now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'public.users upserted: % rows', v_count;

  -- ==========================================================================
  -- Step 2: Ensure staging test tenant exists
  -- ==========================================================================
  INSERT INTO public.tenants (id, tenant_key, name, type, slug, description, status)
  VALUES (
    v_tenant_id,
    'staging-test',
    'Staging Testförskola',
    'preschool',
    'staging-test',
    'Staging-miljöns testtenant — inte riktig kunddata',
    'active'
  )
  ON CONFLICT (id) DO UPDATE SET
    name        = EXCLUDED.name,
    status      = EXCLUDED.status,
    updated_at  = now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'tenants upserted: % rows', v_count;

  -- ==========================================================================
  -- Step 3: Ensure memberships exist (user ↔ tenant with correct roles)
  -- ==========================================================================
  INSERT INTO public.user_tenant_memberships (user_id, tenant_id, role, is_primary, status)
  VALUES
    -- System admin → owner of staging tenant
    (v_admin_id,   v_tenant_id, 'owner',  true, 'active'),
    -- Tenant admin → admin of staging tenant
    (v_tadmin_id,  v_tenant_id, 'admin',  true, 'active'),
    -- Regular user → member of staging tenant
    (v_regular_id, v_tenant_id, 'member', true, 'active')
  ON CONFLICT (user_id, tenant_id) DO UPDATE SET
    role       = EXCLUDED.role,
    is_primary = EXCLUDED.is_primary,
    status     = EXCLUDED.status,
    updated_at = now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'user_tenant_memberships upserted: % rows', v_count;

  -- ==========================================================================
  -- Summary
  -- ==========================================================================
  RAISE NOTICE '✅ Staging seed complete:';
  RAISE NOTICE '   3 users (system-admin, tenant-admin, regular)';
  RAISE NOTICE '   1 tenant (Staging Testförskola)';
  RAISE NOTICE '   3 memberships (owner, admin, member)';
  RAISE NOTICE '';
  RAISE NOTICE 'Next: log in with test-system-admin@lekbanken.no / TestAdmin123!';
END $$;
