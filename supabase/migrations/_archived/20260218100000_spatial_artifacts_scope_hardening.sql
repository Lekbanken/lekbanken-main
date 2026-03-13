-- Spatial Artifacts – scope hardening
-- Fixes identified in code review:
--   1) Coupled CHECK constraint: enforce valid (tenant_id, visibility) combos
--   2) INSERT policy: block regular users from creating public templates
--   3) UPDATE policy: prevent scope mutation (tenant_id / visibility changes)

-- ============================================================================
-- 1) Coupled CHECK constraint
-- ============================================================================
-- Prevents invalid combinations like tenant_id=123 + visibility='private'
-- or tenant_id=NULL + visibility='tenant'.

-- Drop the simple visibility enum check (we'll inline it in the coupled one)
alter table public.spatial_artifacts
  drop constraint if exists spatial_artifacts_visibility_check;

alter table public.spatial_artifacts
  add constraint spatial_artifacts_visibility_scope_ck
  check (
    (tenant_id is null     and visibility in ('private', 'public'))
    or
    (tenant_id is not null and visibility = 'tenant')
  );

-- ============================================================================
-- 2) Tighten INSERT policy – no public templates from regular users
-- ============================================================================
-- Old policy allowed (tenant_id is null and visibility = 'public') with no
-- auth check. Only service_role should create public templates.

drop policy if exists "insert_artifact" on public.spatial_artifacts;

create policy "insert_artifact"
  on public.spatial_artifacts for insert
  with check (
    -- Tenant-owned: user is member, must be 'tenant' visibility, must own it
    (
      tenant_id is not null
      and tenant_id = any(get_user_tenant_ids())
      and visibility = 'tenant'
      and created_by = auth.uid()
    )
    or
    -- Personal private: no tenant, private only, must own it
    (
      tenant_id is null
      and visibility = 'private'
      and created_by = auth.uid()
    )
    -- Public templates: NOT allowed via user INSERT.
    -- Use service_role or an admin RPC to create public artifacts.
  );

-- ============================================================================
-- 3) Tighten UPDATE policy – prevent scope mutation
-- ============================================================================
-- Old WITH CHECK let users flip tenant_id or visibility freely.
-- New: require tenant_id and visibility to stay unchanged, enforced via
-- a BEFORE UPDATE trigger (Postgres RLS cannot compare OLD vs NEW directly
-- in policies). The WITH CHECK still validates the final state.

-- Trigger function: block changes to scope fields (tenant_id, visibility)
-- unless the caller is service_role.
create or replace function public.spatial_artifacts_guard_scope()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Allow service_role through (for admin operations)
  if current_setting('request.jwt.claim.role', true) = 'service_role' then
    return new;
  end if;

  -- Block scope field changes
  if new.tenant_id is distinct from old.tenant_id then
    raise exception 'Cannot change tenant_id. Delete and re-create instead.'
      using errcode = 'check_violation';
  end if;

  if new.visibility is distinct from old.visibility then
    raise exception 'Cannot change visibility. Delete and re-create instead.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

-- Drop if exists to make idempotent
drop trigger if exists trg_spatial_artifacts_guard_scope
  on public.spatial_artifacts;

create trigger trg_spatial_artifacts_guard_scope
  before update on public.spatial_artifacts
  for each row
  execute function public.spatial_artifacts_guard_scope();

-- Re-create UPDATE policy with tighter WITH CHECK
-- (keeps existing USING + WITH CHECK for belt-and-suspenders)
drop policy if exists "update_artifact" on public.spatial_artifacts;

create policy "update_artifact"
  on public.spatial_artifacts for update
  using (
    -- Can update tenant artifacts where user is member
    (tenant_id is not null and tenant_id = any(get_user_tenant_ids()))
    or
    -- Can update own private globals (NOT public — those need service_role)
    (tenant_id is null and visibility = 'private' and created_by = auth.uid())
  )
  with check (
    (tenant_id is not null and tenant_id = any(get_user_tenant_ids()))
    or
    (tenant_id is null and visibility = 'private' and created_by = auth.uid())
  );

-- Re-create DELETE policy (add visibility guard — no deleting public via RLS)
drop policy if exists "delete_artifact" on public.spatial_artifacts;

create policy "delete_artifact"
  on public.spatial_artifacts for delete
  using (
    (tenant_id is not null and tenant_id = any(get_user_tenant_ids()))
    or
    (tenant_id is null and visibility = 'private' and created_by = auth.uid())
  );
