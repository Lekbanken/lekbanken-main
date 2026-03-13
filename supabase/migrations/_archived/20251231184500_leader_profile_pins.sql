-- Gamification: leader profile (dashboard pins)
-- Minimal MVP: allow each user to pin up to 3 achievements per tenant for dashboard display.

begin;

create table if not exists public.leader_profile (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  display_achievement_ids uuid[] not null default '{}'::uuid[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leader_profile_display_achievement_ids_max_3
    check (coalesce(array_length(display_achievement_ids, 1), 0) <= 3),
  unique (user_id, tenant_id)
);

create index if not exists idx_leader_profile_user_tenant on public.leader_profile(user_id, tenant_id);

alter table public.leader_profile enable row level security;

-- Self access (read/write) - used via server/API with user session.
drop policy if exists leader_profile_select_own on public.leader_profile;
create policy leader_profile_select_own
  on public.leader_profile for select
  using (auth.uid() = user_id);

drop policy if exists leader_profile_insert_own on public.leader_profile;
create policy leader_profile_insert_own
  on public.leader_profile for insert
  with check (auth.uid() = user_id);

drop policy if exists leader_profile_update_own on public.leader_profile;
create policy leader_profile_update_own
  on public.leader_profile for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Service role can manage (support/admin tooling)
drop policy if exists leader_profile_service_all on public.leader_profile;
create policy leader_profile_service_all
  on public.leader_profile for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

commit;
