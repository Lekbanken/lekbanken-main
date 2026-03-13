-- Relax tenant insert policy to accept any authenticated uid and add member select

DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_insert_authenticated ON public.tenants;
END $$;

CREATE POLICY tenant_insert_authenticated
  ON public.tenants FOR INSERT
  WITH CHECK (
    is_global_admin()
    OR auth.role() = 'service_role'
    OR auth.uid() IS NOT NULL -- any signed-in user
  );

-- Allow members/admins/global admins to read their tenants
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_members_can_select ON public.tenants;
END $$;

CREATE POLICY tenant_members_can_select
  ON public.tenants FOR SELECT
  USING (
    is_global_admin() OR has_tenant_role(id, ARRAY['owner','admin','editor','member']::public.tenant_role_enum[])
  );
