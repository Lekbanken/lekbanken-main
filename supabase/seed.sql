-- =============================================================================
-- Lekbanken Local Dev Seed Data
-- =============================================================================
-- Runs automatically on `supabase start` (fresh DB) or `supabase db reset`.
-- Creates test users, a demo tenant, and membership so you can log in locally.
--
-- SAFETY: This file should ONLY run in local env. The Supabase CLI only
-- executes seed.sql against the local database, never against linked/remote.
-- =============================================================================

-- 1) Create auth users in auth.users (Supabase GoTrue)
--    Password "TestAdmin123!" hashed with pgcrypto crypt/bf
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at
) VALUES
  -- System admin
  (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'test-system-admin@lekbanken.no',
    crypt('TestAdmin123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Test System Admin"}',
    'authenticated', 'authenticated', now(), now()
  ),
  -- Tenant admin
  (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'test-tenant-admin@lekbanken.no',
    crypt('TestAdmin123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Test Tenant Admin"}',
    'authenticated', 'authenticated', now(), now()
  ),
  -- Regular user
  (
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'test-regular-user@lekbanken.no',
    crypt('TestUser123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Test Regular User"}',
    'authenticated', 'authenticated', now(), now()
  )
ON CONFLICT (id) DO NOTHING;

-- Identity records (required for email/password login)
INSERT INTO auth.identities (
  id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
) VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'test-system-admin@lekbanken.no',
    'email',
    '{"sub":"00000000-0000-0000-0000-000000000001","email":"test-system-admin@lekbanken.no"}',
    now(), now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000002',
    'test-tenant-admin@lekbanken.no',
    'email',
    '{"sub":"00000000-0000-0000-0000-000000000002","email":"test-tenant-admin@lekbanken.no"}',
    now(), now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000003',
    'test-regular-user@lekbanken.no',
    'email',
    '{"sub":"00000000-0000-0000-0000-000000000003","email":"test-regular-user@lekbanken.no"}',
    now(), now(), now()
  )
ON CONFLICT (id) DO NOTHING;

-- 2) Create public.users records (app-level user profiles)
INSERT INTO public.users (id, email, full_name, role, global_role) VALUES
  ('00000000-0000-0000-0000-000000000001', 'test-system-admin@lekbanken.no', 'Test System Admin', 'admin', 'system_admin'),
  ('00000000-0000-0000-0000-000000000002', 'test-tenant-admin@lekbanken.no', 'Test Tenant Admin', 'admin', 'member'),
  ('00000000-0000-0000-0000-000000000003', 'test-regular-user@lekbanken.no', 'Test Regular User', 'member', 'member')
ON CONFLICT (id) DO NOTHING;

-- 3) Create a demo tenant
INSERT INTO public.tenants (id, tenant_key, name, type, slug, description) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'demo-tenant', 'Demo Förskola', 'preschool', 'demo-forskola', 'Lokal testmiljö-tenant')
ON CONFLICT (id) DO NOTHING;

-- A second tenant for cross-tenant isolation testing
INSERT INTO public.tenants (id, tenant_key, name, type, slug, description) VALUES
  ('b2c3d4e5-f6a7-8901-bcde-f23456789012', 'other-tenant', 'Annan Förskola', 'preschool', 'annan-forskola', 'Andra tenant för isoleringstest')
ON CONFLICT (id) DO NOTHING;

-- 4) Create memberships (who belongs to which tenant)
INSERT INTO public.user_tenant_memberships (user_id, tenant_id, role, is_primary) VALUES
  -- System admin is owner of demo tenant
  ('00000000-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'owner', true),
  -- Tenant admin is admin of demo tenant
  ('00000000-0000-0000-0000-000000000002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'admin', true),
  -- Regular user is member of demo tenant
  ('00000000-0000-0000-0000-000000000003', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'member', true)
ON CONFLICT (user_id, tenant_id) DO NOTHING;

-- 5) Log what was seeded
DO $$ BEGIN
  RAISE NOTICE '✅ Seed complete: 3 users, 2 tenants, 3 memberships';
END $$;
