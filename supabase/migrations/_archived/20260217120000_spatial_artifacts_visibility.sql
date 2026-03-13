-- Spatial Artifacts – patch: nullable tenant_id + visibility column
-- Enables 3-tier scope: global/system, user-private, tenant-owned.
--
-- visibility semantics:
--   'private'  – only creator can see (personal drafts, tenant_id NULL)
--   'tenant'   – visible to all tenant members (tenant_id NOT NULL)
--   'public'   – visible to everyone (templates, system content)

-- 1) Make tenant_id nullable
alter table public.spatial_artifacts
  alter column tenant_id drop not null;

-- 2) Add visibility column
alter table public.spatial_artifacts
  add column if not exists visibility text not null default 'private'
  constraint spatial_artifacts_visibility_check
    check (visibility in ('private', 'tenant', 'public'));

-- 3) Back-fill: existing rows (all tenant-owned) → visibility = 'tenant'
update public.spatial_artifacts
  set visibility = 'tenant'
  where tenant_id is not null and visibility = 'private';

-- 4) Drop old RLS policies
drop policy if exists "tenant_members_can_select_artifacts"  on public.spatial_artifacts;
drop policy if exists "tenant_members_can_insert_artifacts"  on public.spatial_artifacts;
drop policy if exists "tenant_members_can_update_artifacts"  on public.spatial_artifacts;
drop policy if exists "tenant_members_can_delete_artifacts"  on public.spatial_artifacts;

-- 5) New RLS policies — 3-tier scope

-- SELECT: tenant-owned (member) OR global-public OR own private
create policy "select_artifact"
  on public.spatial_artifacts for select
  using (
    -- tenant-owned: user is member of the owning tenant
    (tenant_id is not null and tenant_id = any(get_user_tenant_ids()))
    or
    -- global public: anyone can read
    (tenant_id is null and visibility = 'public')
    or
    -- user-private: only creator
    (tenant_id is null and visibility = 'private' and created_by = auth.uid())
  );

-- INSERT: into own tenant, or personal private (null tenant)
create policy "insert_artifact"
  on public.spatial_artifacts for insert
  with check (
    -- tenant-owned
    (tenant_id is not null and tenant_id = any(get_user_tenant_ids()))
    or
    -- personal private (no tenant)
    (tenant_id is null and visibility = 'private' and created_by = auth.uid())
    or
    -- public templates — only service_role should insert these in practice,
    -- but allow if user is system_admin (checked at app layer for now)
    (tenant_id is null and visibility = 'public')
  );

-- UPDATE: own tenant artifacts, or own private globals
create policy "update_artifact"
  on public.spatial_artifacts for update
  using (
    (tenant_id is not null and tenant_id = any(get_user_tenant_ids()))
    or
    (tenant_id is null and created_by = auth.uid())
  )
  with check (
    (tenant_id is not null and tenant_id = any(get_user_tenant_ids()))
    or
    (tenant_id is null and created_by = auth.uid())
  );

-- DELETE: own tenant artifacts, or own private globals
create policy "delete_artifact"
  on public.spatial_artifacts for delete
  using (
    (tenant_id is not null and tenant_id = any(get_user_tenant_ids()))
    or
    (tenant_id is null and created_by = auth.uid())
  );

-- 6) Indexes
-- Composite for tenant listing
drop index if exists idx_spatial_artifacts_tenant;
create index idx_spatial_artifacts_tenant_updated
  on public.spatial_artifacts (tenant_id, updated_at desc);

-- Partial index for global artifacts (tenant_id IS NULL)
create index idx_spatial_artifacts_global
  on public.spatial_artifacts (visibility, updated_at desc)
  where tenant_id is null;

-- Creator index (for personal-private lookups)
create index if not exists idx_spatial_artifacts_created_by_vis
  on public.spatial_artifacts (created_by, visibility)
  where tenant_id is null;
