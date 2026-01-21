-- Licensing: allow tenant members to read their own seat assignments (needed for in-app gating)

begin;

alter table public.tenant_entitlement_seat_assignments enable row level security;

drop policy if exists tenant_entitlement_seat_assignments_select on public.tenant_entitlement_seat_assignments;
create policy tenant_entitlement_seat_assignments_select
  on public.tenant_entitlement_seat_assignments
  for select
  using (
    public.is_system_admin()
    or public.has_tenant_role(tenant_id, array['owner','admin']::public.tenant_role_enum[])
    or (
      auth.uid() = user_id
      and public.has_tenant_role(tenant_id, array['owner','admin','member']::public.tenant_role_enum[])
    )
  );

commit;
