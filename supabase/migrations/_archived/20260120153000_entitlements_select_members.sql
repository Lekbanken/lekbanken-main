-- Licensing: allow tenant members to read entitlements (needed for in-app gating)

begin;

alter table public.tenant_product_entitlements enable row level security;

drop policy if exists tenant_product_entitlements_select on public.tenant_product_entitlements;
create policy tenant_product_entitlements_select
  on public.tenant_product_entitlements
  for select
  using (
    public.is_system_admin()
    or public.has_tenant_role(tenant_id, array['owner','admin','member']::public.tenant_role_enum[])
  );

commit;
