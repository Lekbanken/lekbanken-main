-- Gamification Levels Config v1
-- Adds configurable level definitions (names, XP thresholds, next reward) with tenant override + global fallback.

begin;

do $$
begin
  if to_regclass('public.tenants') is null then
    raise exception 'Missing table public.tenants. Apply tenant migrations first.';
  end if;

  if to_regclass('public.user_tenant_memberships') is null then
    raise exception 'Missing table public.user_tenant_memberships. Apply tenant membership migrations first.';
  end if;

  if to_regprocedure('public.get_user_tenant_ids()') is null then
    raise exception 'Missing function public.get_user_tenant_ids(). Apply role/permission migrations first.';
  end if;
end;
$$;

create table if not exists public.gamification_level_definitions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  level integer not null check (level >= 1),
  name text,
  next_level_xp integer not null default 1000 check (next_level_xp >= 0),
  next_reward text,
  reward_asset_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Prevent duplicates for both tenant-scoped and global rows.
create unique index if not exists uq_gamification_level_definitions_scope_level
  on public.gamification_level_definitions(
    coalesce(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid),
    level
  );

create index if not exists idx_gamification_level_definitions_tenant
  on public.gamification_level_definitions(tenant_id);

alter table public.gamification_level_definitions enable row level security;

-- Read-only for end users: allow viewing global config and configs for their tenants.
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='gamification_level_definitions'
      and policyname='users_can_select_level_definitions'
  ) then
    create policy "users_can_select_level_definitions"
      on public.gamification_level_definitions
      for select
      using (
        tenant_id is null
        or tenant_id = any(get_user_tenant_ids())
      );
  end if;
end $$;

-- Mutations are service role only.
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='gamification_level_definitions'
      and policyname='service_can_modify_level_definitions'
  ) then
    create policy "service_can_modify_level_definitions"
      on public.gamification_level_definitions
      for all
      using (auth.role() = 'service_role')
      with check (auth.role() = 'service_role');
  end if;
end $$;

create or replace function public.get_gamification_level_definitions_v1(
  p_tenant_id uuid default null
)
returns table(
  level integer,
  name text,
  next_level_xp integer,
  next_reward text,
  reward_asset_key text,
  scope_tenant_id uuid
)
language plpgsql
set search_path = public
as $$
declare
  v_has_tenant_rows boolean;
begin
  v_has_tenant_rows := false;
  if p_tenant_id is not null then
    select exists(
      select 1 from public.gamification_level_definitions gld
      where gld.tenant_id = p_tenant_id
      limit 1
    ) into v_has_tenant_rows;
  end if;

  if v_has_tenant_rows then
    return query
      select gld.level, gld.name, gld.next_level_xp, gld.next_reward, gld.reward_asset_key, gld.tenant_id
      from public.gamification_level_definitions gld
      where gld.tenant_id = p_tenant_id
      order by gld.level asc;
  else
    return query
      select gld.level, gld.name, gld.next_level_xp, gld.next_reward, gld.reward_asset_key, gld.tenant_id
      from public.gamification_level_definitions gld
      where gld.tenant_id is null
      order by gld.level asc;
  end if;
end;
$$;

create or replace function public.replace_gamification_level_definitions_v1(
  p_tenant_id uuid,
  p_levels jsonb,
  p_actor_user_id uuid default null
)
returns table(replaced_count integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_level integer;
  v_next_level_xp integer;
  v_name text;
  v_next_reward text;
  v_reward_asset_key text;
  v_count integer;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role only';
  end if;

  if p_tenant_id is null then
    raise exception 'p_tenant_id is required';
  end if;

  if p_levels is null or jsonb_typeof(p_levels) <> 'array' then
    raise exception 'p_levels must be a JSON array';
  end if;

  delete from public.gamification_level_definitions where tenant_id = p_tenant_id;

  v_count := 0;
  for v_item in select * from jsonb_array_elements(p_levels)
  loop
    if jsonb_typeof(v_item) <> 'object' then
      raise exception 'each level entry must be an object';
    end if;

    v_level := null;
    v_next_level_xp := null;

    if (v_item ? 'level') then
      v_level := (v_item->>'level')::integer;
    end if;

    if (v_item ? 'nextLevelXp') then
      v_next_level_xp := (v_item->>'nextLevelXp')::integer;
    elsif (v_item ? 'next_level_xp') then
      v_next_level_xp := (v_item->>'next_level_xp')::integer;
    end if;

    if v_level is null or v_level < 1 then
      raise exception 'invalid level in config';
    end if;

    if v_next_level_xp is null or v_next_level_xp < 0 then
      raise exception 'invalid nextLevelXp in config';
    end if;

    v_name := nullif(trim(coalesce(v_item->>'name','')), '');
    v_next_reward := nullif(trim(coalesce(v_item->>'nextReward','')), '');
    v_reward_asset_key := nullif(trim(coalesce(v_item->>'rewardAssetKey','')), '');

    insert into public.gamification_level_definitions(
      tenant_id,
      level,
      name,
      next_level_xp,
      next_reward,
      reward_asset_key
    )
    values (
      p_tenant_id,
      v_level,
      v_name,
      v_next_level_xp,
      v_next_reward,
      v_reward_asset_key
    )
    on conflict (
      coalesce(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid),
      level
    ) do update set
      name = excluded.name,
      next_level_xp = excluded.next_level_xp,
      next_reward = excluded.next_reward,
      reward_asset_key = excluded.reward_asset_key,
      updated_at = now();

    v_count := v_count + 1;
  end loop;

  replaced_count := v_count;
  return next;
end;
$$;

revoke all on function public.get_gamification_level_definitions_v1(uuid) from public;
revoke all on function public.get_gamification_level_definitions_v1(uuid) from anon;
revoke all on function public.get_gamification_level_definitions_v1(uuid) from authenticated;
grant execute on function public.get_gamification_level_definitions_v1(uuid) to authenticated;

revoke all on function public.replace_gamification_level_definitions_v1(uuid,jsonb,uuid) from public;
revoke all on function public.replace_gamification_level_definitions_v1(uuid,jsonb,uuid) from anon;
revoke all on function public.replace_gamification_level_definitions_v1(uuid,jsonb,uuid) from authenticated;
grant execute on function public.replace_gamification_level_definitions_v1(uuid,jsonb,uuid) to service_role;

-- Seed a small global baseline if empty.
insert into public.gamification_level_definitions (tenant_id, level, name, next_level_xp, next_reward)
select null, v.level, v.name, v.next_level_xp, v.next_reward
from (
  values
    (1, 'Nybörjare', 1000, 'Ny badge snart'),
    (2, 'Upptäckare', 1500, 'Ny badge snart'),
    (3, 'Utforskare', 2000, 'Ny badge snart'),
    (4, 'Vägvisare', 2500, 'Ny badge snart'),
    (5, 'Mästare', 3000, 'Ny badge snart')
) as v(level, name, next_level_xp, next_reward)
where not exists (
  select 1 from public.gamification_level_definitions where tenant_id is null
);

commit;
