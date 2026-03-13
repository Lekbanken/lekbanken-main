-- Setup admin@lekbanken.no with full superadmin privileges
-- This migration ensures the admin user has all necessary access

-- 1. Set the user role to 'superadmin' in public.users
UPDATE public.users
SET role = 'superadmin',
    updated_at = now()
WHERE email = 'admin@lekbanken.no';

-- 2. Create a default "Lekbanken" tenant if it doesn't exist
INSERT INTO public.tenants (id, name, slug, type, status, main_language)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Lekbanken',
  'lekbanken',
  'enterprise',
  'active',
  'NO'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  type = EXCLUDED.type,
  status = EXCLUDED.status,
  updated_at = now();

-- 3. Add admin@lekbanken.no as owner of the Lekbanken tenant
INSERT INTO public.user_tenant_memberships (user_id, tenant_id, role, is_primary)
SELECT 
  u.id,
  '00000000-0000-0000-0000-000000000001',
  'owner',
  true
FROM public.users u
WHERE u.email = 'admin@lekbanken.no'
ON CONFLICT (user_id, tenant_id) DO UPDATE SET
  role = 'owner',
  is_primary = true,
  updated_at = now();

-- 4. Grant access to all existing tenants as admin (optional, for full visibility)
INSERT INTO public.user_tenant_memberships (user_id, tenant_id, role, is_primary)
SELECT 
  u.id,
  t.id,
  'admin',
  false
FROM public.users u
CROSS JOIN public.tenants t
WHERE u.email = 'admin@lekbanken.no'
  AND t.id != '00000000-0000-0000-0000-000000000001'
ON CONFLICT (user_id, tenant_id) DO NOTHING;

-- 5. Verify the setup (will show in migration logs)
DO $$
DECLARE
  admin_id uuid;
  admin_role text;
  tenant_count int;
BEGIN
  SELECT id, role INTO admin_id, admin_role
  FROM public.users
  WHERE email = 'admin@lekbanken.no';

  IF admin_id IS NULL THEN
    RAISE WARNING 'admin@lekbanken.no user not found in public.users. They need to sign up first.';
  ELSE
    SELECT COUNT(*) INTO tenant_count
    FROM public.user_tenant_memberships
    WHERE user_id = admin_id;

    RAISE NOTICE 'Admin setup complete: user_id=%, role=%, tenant_memberships=%', admin_id, admin_role, tenant_count;
  END IF;
END $$;
