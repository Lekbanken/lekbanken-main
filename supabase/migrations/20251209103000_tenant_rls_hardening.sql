-- Tenant RLS hardening: enforce admin/system on membership management, invites, audit logs
-- and admin-level updates on tenants.

-- tenant_memberships: stricter manage (admin/system), select for own tenant
DROP POLICY IF EXISTS tenant_memberships_select ON public.tenant_memberships;
CREATE POLICY tenant_memberships_select ON public.tenant_memberships
FOR SELECT USING (is_system_admin() OR tenant_id = ANY(get_user_tenant_ids()));

DROP POLICY IF EXISTS tenant_memberships_manage ON public.tenant_memberships;
CREATE POLICY tenant_memberships_manage ON public.tenant_memberships
FOR ALL USING (
  is_system_admin() OR (
    tenant_id = ANY(get_user_tenant_ids()) AND EXISTS (
      SELECT 1 FROM tenant_memberships tm
      WHERE tm.tenant_id = tenant_memberships.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner','admin')
    )
  )
) WITH CHECK (
  is_system_admin() OR (
    tenant_id = ANY(get_user_tenant_ids()) AND EXISTS (
      SELECT 1 FROM tenant_memberships tm
      WHERE tm.tenant_id = tenant_memberships.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner','admin')
    )
  )
);

-- tenants update requires admin/system
DROP POLICY IF EXISTS tenants_update_admin ON public.tenants;
CREATE POLICY tenants_update_admin ON public.tenants
FOR UPDATE USING (
  is_system_admin() OR (
    id = ANY(get_user_tenant_ids()) AND EXISTS (
      SELECT 1 FROM tenant_memberships tm
      WHERE tm.tenant_id = tenants.id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner','admin')
    )
  )
) WITH CHECK (
  is_system_admin() OR (
    id = ANY(get_user_tenant_ids()) AND EXISTS (
      SELECT 1 FROM tenant_memberships tm
      WHERE tm.tenant_id = tenants.id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner','admin')
    )
  )
);

-- tenant_invitations: only admin/system mutate, select own tenant
DROP POLICY IF EXISTS tenant_invitations_select ON public.tenant_invitations;
CREATE POLICY tenant_invitations_select ON public.tenant_invitations
FOR SELECT USING (is_system_admin() OR tenant_id = ANY(get_user_tenant_ids()));

DROP POLICY IF EXISTS tenant_invitations_mutate ON public.tenant_invitations;
CREATE POLICY tenant_invitations_mutate ON public.tenant_invitations
FOR ALL USING (
  is_system_admin() OR (
    tenant_id = ANY(get_user_tenant_ids()) AND EXISTS (
      SELECT 1 FROM tenant_memberships tm
      WHERE tm.tenant_id = tenant_invitations.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner','admin')
    )
  )
) WITH CHECK (
  is_system_admin() OR (
    tenant_id = ANY(get_user_tenant_ids()) AND EXISTS (
      SELECT 1 FROM tenant_memberships tm
      WHERE tm.tenant_id = tenant_invitations.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner','admin')
    )
  )
);

-- tenant_audit_logs: select/insert admin or system
DROP POLICY IF EXISTS tenant_audit_logs_select ON public.tenant_audit_logs;
CREATE POLICY tenant_audit_logs_select ON public.tenant_audit_logs
FOR SELECT USING (
  is_system_admin() OR (
    tenant_id = ANY(get_user_tenant_ids()) AND EXISTS (
      SELECT 1 FROM tenant_memberships tm
      WHERE tm.tenant_id = tenant_audit_logs.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner','admin')
    )
  )
);

DROP POLICY IF EXISTS tenant_audit_logs_insert ON public.tenant_audit_logs;
CREATE POLICY tenant_audit_logs_insert ON public.tenant_audit_logs
FOR INSERT WITH CHECK (
  is_system_admin() OR (
    tenant_id = ANY(get_user_tenant_ids()) AND EXISTS (
      SELECT 1 FROM tenant_memberships tm
      WHERE tm.tenant_id = tenant_audit_logs.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner','admin')
    )
  )
);
