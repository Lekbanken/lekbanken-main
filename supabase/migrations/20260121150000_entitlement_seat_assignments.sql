-- Phase 4: Seat allocation for entitlements (capacity enforcement + assignments)

begin;

create table if not exists public.tenant_entitlement_seat_assignments (
  id uuid primary key default gen_random_uuid(),

  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entitlement_id uuid not null references public.tenant_product_entitlements(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,

  status text not null default 'active',

  assigned_by uuid references public.users(id) on delete set null,
  assigned_at timestamptz not null default now(),
  released_at timestamptz,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint tenant_entitlement_seat_assignments_status_chk check (status in ('active','released','revoked'))
);

create index if not exists tenant_entitlement_seat_assignments_tenant_idx
  on public.tenant_entitlement_seat_assignments(tenant_id);

create index if not exists tenant_entitlement_seat_assignments_entitlement_idx
  on public.tenant_entitlement_seat_assignments(entitlement_id);

create index if not exists tenant_entitlement_seat_assignments_user_idx
  on public.tenant_entitlement_seat_assignments(user_id);

create unique index if not exists tenant_entitlement_seat_assignments_unique_active
  on public.tenant_entitlement_seat_assignments(entitlement_id, user_id)
  where status = 'active';

create or replace function public.update_tenant_entitlement_seat_assignments_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tenant_entitlement_seat_assignments_updated_at on public.tenant_entitlement_seat_assignments;
create trigger tenant_entitlement_seat_assignments_updated_at
  before update on public.tenant_entitlement_seat_assignments
  for each row
  execute function public.update_tenant_entitlement_seat_assignments_updated_at();

-- Capacity enforcement at the DB layer (prevents race conditions across concurrent inserts)
create or replace function public.assert_entitlement_seat_capacity()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  max_seats integer;
  used_seats integer;
begin
  -- Only enforce when transitioning into active
  if (new.status <> 'active') then
    return new;
  end if;

  if (tg_op = 'UPDATE' and old.status = 'active') then
    return new;
  end if;

  -- Lock the entitlement row to avoid concurrent over-allocation.
  select e.quantity_seats
    into max_seats
    from public.tenant_product_entitlements e
    where e.id = new.entitlement_id
    for update;

  if max_seats is null then
    raise exception 'Invalid entitlement_id';
  end if;

  select count(*)
    into used_seats
    from public.tenant_entitlement_seat_assignments s
    where s.entitlement_id = new.entitlement_id
      and s.status = 'active'
      and (tg_op <> 'UPDATE' or s.id <> new.id);

  if used_seats >= max_seats then
    raise exception 'No seats available for entitlement %', new.entitlement_id;
  end if;

  return new;
end;
$$;

drop trigger if exists tenant_entitlement_seat_assignments_capacity on public.tenant_entitlement_seat_assignments;
create trigger tenant_entitlement_seat_assignments_capacity
  before insert or update on public.tenant_entitlement_seat_assignments
  for each row
  execute function public.assert_entitlement_seat_capacity();

alter table public.tenant_entitlement_seat_assignments enable row level security;

-- Read: tenant owner/admin + system admin
drop policy if exists tenant_entitlement_seat_assignments_select on public.tenant_entitlement_seat_assignments;
create policy tenant_entitlement_seat_assignments_select
  on public.tenant_entitlement_seat_assignments
  for select
  using (
    public.is_system_admin()
    or public.has_tenant_role(tenant_id, array['owner','admin']::public.tenant_role_enum[])
  );

-- Writes: tenant owner/admin + system admin + service_role
drop policy if exists tenant_entitlement_seat_assignments_manage on public.tenant_entitlement_seat_assignments;
create policy tenant_entitlement_seat_assignments_manage
  on public.tenant_entitlement_seat_assignments
  for all
  using (
    auth.role() = 'service_role'
    or public.is_system_admin()
    or public.has_tenant_role(tenant_id, array['owner','admin']::public.tenant_role_enum[])
  )
  with check (
    auth.role() = 'service_role'
    or public.is_system_admin()
    or public.has_tenant_role(tenant_id, array['owner','admin']::public.tenant_role_enum[])
  );

commit;
