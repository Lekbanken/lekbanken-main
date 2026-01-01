-- Award Builder canonical export persistence (v1)
-- Stores versioned export JSON as the canonical source of truth.

begin;

create table if not exists public.award_builder_exports (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  scope_type text not null check (scope_type in ('global','tenant')),
  schema_version text not null,
  exported_at timestamptz not null default now(),
  exported_by_user_id uuid,
  exported_by_tool text,
  export jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint award_builder_exports_scope_matches_tenant
    check (
      (scope_type = 'global' and tenant_id is null)
      or (scope_type = 'tenant' and tenant_id is not null)
    )
);

create index if not exists award_builder_exports_tenant_created_at_idx
  on public.award_builder_exports (tenant_id, created_at desc);

create index if not exists award_builder_exports_scope_created_at_idx
  on public.award_builder_exports (scope_type, created_at desc);

alter table public.award_builder_exports enable row level security;

-- Admin-only access (owner/admin per tenant; system_admin for everything).
-- Service role is always allowed.

drop policy if exists "admins_can_select_award_builder_exports" on public.award_builder_exports;
create policy "admins_can_select_award_builder_exports"
  on public.award_builder_exports for select
  using (
    auth.role() = 'service_role'
    or public.is_system_admin()
    or (
      tenant_id is not null
      and public.has_tenant_role(tenant_id, array['owner','admin']::public.tenant_role_enum[])
    )
  );

drop policy if exists "admins_can_insert_award_builder_exports" on public.award_builder_exports;
create policy "admins_can_insert_award_builder_exports"
  on public.award_builder_exports for insert
  with check (
    auth.role() = 'service_role'
    or public.is_system_admin()
    or (
      tenant_id is not null
      and public.has_tenant_role(tenant_id, array['owner','admin']::public.tenant_role_enum[])
    )
  );

drop policy if exists "admins_can_update_award_builder_exports" on public.award_builder_exports;
create policy "admins_can_update_award_builder_exports"
  on public.award_builder_exports for update
  using (
    auth.role() = 'service_role'
    or public.is_system_admin()
    or (
      tenant_id is not null
      and public.has_tenant_role(tenant_id, array['owner','admin']::public.tenant_role_enum[])
    )
  )
  with check (
    auth.role() = 'service_role'
    or public.is_system_admin()
    or (
      tenant_id is not null
      and public.has_tenant_role(tenant_id, array['owner','admin']::public.tenant_role_enum[])
    )
  );

drop policy if exists "admins_can_delete_award_builder_exports" on public.award_builder_exports;
create policy "admins_can_delete_award_builder_exports"
  on public.award_builder_exports for delete
  using (
    auth.role() = 'service_role'
    or public.is_system_admin()
    or (
      tenant_id is not null
      and public.has_tenant_role(tenant_id, array['owner','admin']::public.tenant_role_enum[])
    )
  );

comment on table public.award_builder_exports is 'Canonical award/achievement definitions exported by Award Builder UIs (versioned JSON).';

commit;
