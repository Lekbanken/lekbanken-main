-- Spatial Artifacts – persistent library for spatial editor maps
-- Each artifact stores the full document JSON + metadata.
-- Tenant-scoped: only members of the owning tenant can access.

create table if not exists public.spatial_artifacts (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  created_by  uuid not null references auth.users(id) on delete set null,
  title       text not null default 'Untitled',
  description text not null default '',
  mode        text not null default 'free',
  document    jsonb not null,
  preview_url text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.spatial_artifacts is
  'Spatial Editor artifacts – saved maps/diagrams with checkpoints, objects, and background.';

-- RLS
alter table public.spatial_artifacts enable row level security;

create policy "tenant_members_can_select_artifacts"
  on public.spatial_artifacts for select
  using (tenant_id = any(get_user_tenant_ids()));

create policy "tenant_members_can_insert_artifacts"
  on public.spatial_artifacts for insert
  with check (tenant_id = any(get_user_tenant_ids()));

create policy "tenant_members_can_update_artifacts"
  on public.spatial_artifacts for update
  using (tenant_id = any(get_user_tenant_ids()))
  with check (tenant_id = any(get_user_tenant_ids()));

create policy "tenant_members_can_delete_artifacts"
  on public.spatial_artifacts for delete
  using (tenant_id = any(get_user_tenant_ids()));

-- Indexes
create index if not exists idx_spatial_artifacts_tenant
  on public.spatial_artifacts (tenant_id);

create index if not exists idx_spatial_artifacts_created_by
  on public.spatial_artifacts (created_by);

create index if not exists idx_spatial_artifacts_updated_at
  on public.spatial_artifacts (updated_at desc);
