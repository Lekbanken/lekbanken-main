-- Tenant RLS hardening: enforce admin/system on membership management, invites, audit logs
-- and admin-level updates on tenants.

-- Fresh-install compatibility: use user_tenant_memberships when tenant_memberships doesn't exist yet
DO $$ 
DECLARE
  _tbl text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'tenant_memberships' AND c.relkind = 'r') THEN
    _tbl := 'tenant_memberships';
  ELSIF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'user_tenant_memberships' AND c.relkind = 'r') THEN
    _tbl := 'user_tenant_memberships';
  ELSE
    RAISE NOTICE 'No memberships table found, skipping tenant_memberships policies';
    RETURN;
  END IF;

  -- tenant_memberships policies
  EXECUTE format('DROP POLICY IF EXISTS tenant_memberships_select ON public.%I', _tbl);
  EXECUTE format('CREATE POLICY tenant_memberships_select ON public.%I FOR SELECT USING (is_system_admin() OR tenant_id = ANY(get_user_tenant_ids()))', _tbl);

  EXECUTE format('DROP POLICY IF EXISTS tenant_memberships_manage ON public.%I', _tbl);
  EXECUTE format($p$CREATE POLICY tenant_memberships_manage ON public.%I
    FOR ALL USING (
      is_system_admin() OR (
        tenant_id = ANY(get_user_tenant_ids()) AND EXISTS (
          SELECT 1 FROM public.%I tm
          WHERE tm.tenant_id = %I.tenant_id
            AND tm.user_id = auth.uid()
            AND tm.role IN ('owner','admin')
        )
      )
    ) WITH CHECK (
      is_system_admin() OR (
        tenant_id = ANY(get_user_tenant_ids()) AND EXISTS (
          SELECT 1 FROM public.%I tm
          WHERE tm.tenant_id = %I.tenant_id
            AND tm.user_id = auth.uid()
            AND tm.role IN ('owner','admin')
        )
      )
    )$p$, _tbl, _tbl, _tbl, _tbl, _tbl);

  -- tenants update requires admin/system
  EXECUTE format($p$DROP POLICY IF EXISTS tenants_update_admin ON public.tenants$p$);
  EXECUTE format($p$CREATE POLICY tenants_update_admin ON public.tenants
    FOR UPDATE USING (
      is_system_admin() OR (
        id = ANY(get_user_tenant_ids()) AND EXISTS (
          SELECT 1 FROM public.%I tm
          WHERE tm.tenant_id = tenants.id
            AND tm.user_id = auth.uid()
            AND tm.role IN ('owner','admin')
        )
      )
    ) WITH CHECK (
      is_system_admin() OR (
        id = ANY(get_user_tenant_ids()) AND EXISTS (
          SELECT 1 FROM public.%I tm
          WHERE tm.tenant_id = tenants.id
            AND tm.user_id = auth.uid()
            AND tm.role IN ('owner','admin')
        )
      )
    )$p$, _tbl, _tbl);

  -- tenant_invitations policies
  EXECUTE $p$DROP POLICY IF EXISTS tenant_invitations_select ON public.tenant_invitations$p$;
  EXECUTE $p$CREATE POLICY tenant_invitations_select ON public.tenant_invitations
    FOR SELECT USING (is_system_admin() OR tenant_id = ANY(get_user_tenant_ids()))$p$;

  EXECUTE $p$DROP POLICY IF EXISTS tenant_invitations_mutate ON public.tenant_invitations$p$;
  EXECUTE format($p$CREATE POLICY tenant_invitations_mutate ON public.tenant_invitations
    FOR ALL USING (
      is_system_admin() OR (
        tenant_id = ANY(get_user_tenant_ids()) AND EXISTS (
          SELECT 1 FROM public.%I tm
          WHERE tm.tenant_id = tenant_invitations.tenant_id
            AND tm.user_id = auth.uid()
            AND tm.role IN ('owner','admin')
        )
      )
    ) WITH CHECK (
      is_system_admin() OR (
        tenant_id = ANY(get_user_tenant_ids()) AND EXISTS (
          SELECT 1 FROM public.%I tm
          WHERE tm.tenant_id = tenant_invitations.tenant_id
            AND tm.user_id = auth.uid()
            AND tm.role IN ('owner','admin')
        )
      )
    )$p$, _tbl, _tbl);

  -- tenant_audit_logs policies
  EXECUTE $p$DROP POLICY IF EXISTS tenant_audit_logs_select ON public.tenant_audit_logs$p$;
  EXECUTE format($p$CREATE POLICY tenant_audit_logs_select ON public.tenant_audit_logs
    FOR SELECT USING (
      is_system_admin() OR (
        tenant_id = ANY(get_user_tenant_ids()) AND EXISTS (
          SELECT 1 FROM public.%I tm
          WHERE tm.tenant_id = tenant_audit_logs.tenant_id
            AND tm.user_id = auth.uid()
            AND tm.role IN ('owner','admin')
        )
      )
    )$p$, _tbl);

  EXECUTE $p$DROP POLICY IF EXISTS tenant_audit_logs_insert ON public.tenant_audit_logs$p$;
  EXECUTE format($p$CREATE POLICY tenant_audit_logs_insert ON public.tenant_audit_logs
    FOR INSERT WITH CHECK (
      is_system_admin() OR (
        tenant_id = ANY(get_user_tenant_ids()) AND EXISTS (
          SELECT 1 FROM public.%I tm
          WHERE tm.tenant_id = tenant_audit_logs.tenant_id
            AND tm.user_id = auth.uid()
            AND tm.role IN ('owner','admin')
        )
      )
    )$p$, _tbl);
END $$;
