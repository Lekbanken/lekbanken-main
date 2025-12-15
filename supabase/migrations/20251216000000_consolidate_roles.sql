-- Consolidate legacy users.role into global_role
-- Maps legacy admin/superadmin to system_admin; others to private_user when missing.

UPDATE public.users
SET global_role = CASE role
  WHEN 'superadmin' THEN 'system_admin'::public.global_role_enum
  WHEN 'admin' THEN 'system_admin'::public.global_role_enum
  ELSE 'private_user'::public.global_role_enum
END
WHERE (global_role IS NULL OR global_role = 'member')
  AND role IS NOT NULL;

COMMENT ON COLUMN public.users.role IS 'DEPRECATED: Use global_role instead. Will be removed in a future migration.';

-- Ensure is_system_admin relies on global_role
CREATE OR REPLACE FUNCTION public.is_system_admin() RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
    AND global_role = 'system_admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;
