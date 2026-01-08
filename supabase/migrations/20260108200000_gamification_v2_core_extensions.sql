-- Gamification v2: Core Extensions
-- Adds: achievement scopes, leaderboard opt-out, cooldowns, softcap config, multiplier cap, burn foundation
-- Date: 2026-01-08

begin;

--------------------------------------------------------------------------------
-- 1) ACHIEVEMENT SCOPE (global vs tenant)
--------------------------------------------------------------------------------

-- Add scope column to achievements table
alter table public.achievements
  add column if not exists scope text not null default 'global'
    check (scope in ('global', 'tenant'));

-- Add scope_tenant_id for tenant-scoped achievements
alter table public.achievements
  add column if not exists scope_tenant_id uuid references public.tenants(id) on delete cascade;

-- Note: Constraint is only for new/updated rows. Existing global achievements may have 
-- NULL scope_tenant_id which is correct. We skip the update statements since they
-- would fail on generated columns if any exist.

-- Constraint: tenant scope requires scope_tenant_id (only applies to new inserts/updates)
alter table public.achievements
  drop constraint if exists achievements_scope_tenant_check;
alter table public.achievements
  add constraint achievements_scope_tenant_check
    check (
      (scope = 'global' and scope_tenant_id is null) or
      (scope = 'tenant' and scope_tenant_id is not null)
    ) not valid; -- Apply to new rows only, don't validate existing

-- Validate the constraint in a separate step (will fail if data is invalid)
-- Uncomment when ready: alter table public.achievements validate constraint achievements_scope_tenant_check;

-- Index for fast tenant-scoped lookups
create index if not exists idx_achievements_scope_tenant
  on public.achievements(scope, scope_tenant_id)
  where scope = 'tenant';

-- Update RLS: users can see global achievements OR achievements for their tenants
drop policy if exists "achievements_select" on public.achievements;
create policy "achievements_select_v2" on public.achievements
  for select to authenticated
  using (
    scope = 'global'
    or scope_tenant_id = any(public.get_user_tenant_ids())
    or public.is_system_admin()
  );

-- Admin can manage tenant achievements
drop policy if exists "achievements_admin_manage" on public.achievements;
create policy "achievements_admin_manage" on public.achievements
  for all
  using (
    public.is_system_admin()
    or (scope = 'tenant' and public.has_tenant_role(scope_tenant_id, array['owner','admin']::public.tenant_role_enum[]))
  )
  with check (
    public.is_system_admin()
    or (scope = 'tenant' and public.has_tenant_role(scope_tenant_id, array['owner','admin']::public.tenant_role_enum[]))
  );

comment on column public.achievements.scope is 'Achievement visibility: global (all users) or tenant (specific org)';
comment on column public.achievements.scope_tenant_id is 'For tenant-scoped achievements, the owning tenant';

--------------------------------------------------------------------------------
-- 2) LEADERBOARD OPT-OUT
--------------------------------------------------------------------------------

-- User gamification preferences table
create table if not exists public.user_gamification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  tenant_id uuid references public.tenants(id) on delete cascade,
  
  -- Leaderboard settings
  leaderboard_visible boolean not null default true,
  leaderboard_opted_out_at timestamptz,
  
  -- Future preference hooks
  notifications_enabled boolean not null default true,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  unique (user_id, tenant_id)
);

create index if not exists idx_user_gamification_prefs_user on public.user_gamification_preferences(user_id);
create index if not exists idx_user_gamification_prefs_tenant on public.user_gamification_preferences(tenant_id);
create index if not exists idx_user_gamification_prefs_leaderboard on public.user_gamification_preferences(tenant_id, leaderboard_visible)
  where leaderboard_visible = true;

alter table public.user_gamification_preferences enable row level security;

-- Users can read/update their own preferences
create policy "user_gamification_prefs_select" on public.user_gamification_preferences
  for select using (auth.uid() = user_id);

create policy "user_gamification_prefs_update" on public.user_gamification_preferences
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Service role can manage all
create policy "user_gamification_prefs_service" on public.user_gamification_preferences
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- Admins can view (for analytics) but not modify
create policy "user_gamification_prefs_admin_select" on public.user_gamification_preferences
  for select using (
    public.is_system_admin()
    or (tenant_id is not null and public.has_tenant_role(tenant_id, array['owner','admin']::public.tenant_role_enum[]))
  );

comment on table public.user_gamification_preferences is 'Per-user gamification preferences including leaderboard opt-out';
comment on column public.user_gamification_preferences.leaderboard_visible is 'If false, user is excluded from leaderboard rankings';

-- Function to toggle leaderboard visibility (user-callable)
create or replace function public.set_leaderboard_visibility(
  p_tenant_id uuid,
  p_visible boolean
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;
  
  insert into public.user_gamification_preferences (user_id, tenant_id, leaderboard_visible, leaderboard_opted_out_at)
  values (
    v_user_id,
    p_tenant_id,
    p_visible,
    case when p_visible then null else now() end
  )
  on conflict (user_id, tenant_id)
  do update set
    leaderboard_visible = p_visible,
    leaderboard_opted_out_at = case when p_visible then null else now() end,
    updated_at = now();
  
  return true;
end;
$$;

grant execute on function public.set_leaderboard_visibility(uuid, boolean) to authenticated;

--------------------------------------------------------------------------------
-- 3) COOLDOWN TRACKING
--------------------------------------------------------------------------------

create table if not exists public.gamification_cooldowns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  tenant_id uuid references public.tenants(id) on delete cascade,
  event_type text not null,
  cooldown_type text not null check (cooldown_type in ('daily', 'weekly', 'once', 'once_per_streak')),
  
  -- Tracking
  trigger_count integer not null default 1,
  first_triggered_at timestamptz not null default now(),
  last_triggered_at timestamptz not null default now(),
  
  -- For streak-based cooldowns
  streak_id integer, -- Links to specific streak period
  
  created_at timestamptz not null default now(),
  
  -- Unique per user+tenant+event+cooldown combination
  unique (user_id, tenant_id, event_type, cooldown_type)
);

-- For once_per_streak, also include streak_id in uniqueness
create unique index if not exists idx_gamification_cooldowns_streak
  on public.gamification_cooldowns(user_id, tenant_id, event_type, cooldown_type, streak_id)
  where cooldown_type = 'once_per_streak' and streak_id is not null;

create index if not exists idx_gamification_cooldowns_user_tenant on public.gamification_cooldowns(user_id, tenant_id);
create index if not exists idx_gamification_cooldowns_event on public.gamification_cooldowns(event_type, cooldown_type);
create index if not exists idx_gamification_cooldowns_last_triggered on public.gamification_cooldowns(last_triggered_at);

alter table public.gamification_cooldowns enable row level security;

-- Users can see their own cooldowns
create policy "gamification_cooldowns_select" on public.gamification_cooldowns
  for select using (auth.uid() = user_id);

-- Service role manages cooldowns
create policy "gamification_cooldowns_service" on public.gamification_cooldowns
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

comment on table public.gamification_cooldowns is 'Tracks trigger cooldowns per user/event to enforce daily/weekly/once limits';

-- Function to check if cooldown has elapsed
create or replace function public.check_cooldown_eligible_v1(
  p_user_id uuid,
  p_tenant_id uuid,
  p_event_type text,
  p_cooldown_type text,
  p_streak_id integer default null
)
returns table (eligible boolean, last_triggered_at timestamptz, trigger_count integer)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_record public.gamification_cooldowns%rowtype;
  v_now timestamptz := now();
  v_cutoff timestamptz;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role only';
  end if;

  -- Find existing cooldown record
  select * into v_record
    from public.gamification_cooldowns gc
    where gc.user_id = p_user_id
      and gc.tenant_id is not distinct from p_tenant_id
      and gc.event_type = p_event_type
      and gc.cooldown_type = p_cooldown_type
      and (p_cooldown_type <> 'once_per_streak' or gc.streak_id is not distinct from p_streak_id)
    limit 1;

  if v_record.id is null then
    -- No record = eligible
    eligible := true;
    last_triggered_at := null;
    trigger_count := 0;
    return next;
    return;
  end if;

  last_triggered_at := v_record.last_triggered_at;
  trigger_count := v_record.trigger_count;

  case p_cooldown_type
    when 'once' then
      -- Once means never again
      eligible := false;
    when 'once_per_streak' then
      -- Once per streak period (handled by streak_id)
      eligible := false;
    when 'daily' then
      -- Eligible if last trigger was before today (UTC)
      v_cutoff := date_trunc('day', v_now);
      eligible := v_record.last_triggered_at < v_cutoff;
    when 'weekly' then
      -- Eligible if last trigger was before this week (Monday start)
      v_cutoff := date_trunc('week', v_now);
      eligible := v_record.last_triggered_at < v_cutoff;
    else
      eligible := true;
  end case;

  return next;
end;
$$;

-- Function to record a cooldown trigger
create or replace function public.record_cooldown_trigger_v1(
  p_user_id uuid,
  p_tenant_id uuid,
  p_event_type text,
  p_cooldown_type text,
  p_streak_id integer default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role only';
  end if;

  insert into public.gamification_cooldowns (
    user_id, tenant_id, event_type, cooldown_type, streak_id,
    trigger_count, first_triggered_at, last_triggered_at
  )
  values (
    p_user_id, p_tenant_id, p_event_type, p_cooldown_type, p_streak_id,
    1, now(), now()
  )
  on conflict (user_id, tenant_id, event_type, cooldown_type)
  do update set
    trigger_count = gamification_cooldowns.trigger_count + 1,
    last_triggered_at = now();
end;
$$;

--------------------------------------------------------------------------------
-- 4) SOFTCAP CONFIGURATION
--------------------------------------------------------------------------------

create table if not exists public.gamification_softcap_config (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  
  -- Daily thresholds before diminishing returns kick in
  daily_coin_threshold integer not null default 100,
  daily_xp_threshold integer not null default 500,
  
  -- Diminishing returns factor (0.5 = 50% reduction per threshold exceeded)
  coin_diminishing_factor numeric(4,3) not null default 0.500
    check (coin_diminishing_factor > 0 and coin_diminishing_factor < 1),
  xp_diminishing_factor numeric(4,3) not null default 0.500
    check (xp_diminishing_factor > 0 and xp_diminishing_factor < 1),
  
  -- Minimum reward percentage (floor, never go below this)
  coin_floor_pct numeric(4,3) not null default 0.100
    check (coin_floor_pct >= 0 and coin_floor_pct <= 1),
  xp_floor_pct numeric(4,3) not null default 0.100
    check (xp_floor_pct >= 0 and xp_floor_pct <= 1),
  
  -- Max multiplier cap (absolute ceiling on stacked multipliers)
  max_multiplier_cap numeric(4,2) not null default 2.00
    check (max_multiplier_cap >= 1 and max_multiplier_cap <= 10),
  
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- Only one config per tenant (null = global default)
  unique (tenant_id)
);

-- Ensure exactly one global default exists
create unique index if not exists idx_gamification_softcap_global
  on public.gamification_softcap_config((true))
  where tenant_id is null;

create index if not exists idx_gamification_softcap_tenant on public.gamification_softcap_config(tenant_id);

alter table public.gamification_softcap_config enable row level security;

-- Admins can view/manage softcap config
create policy "gamification_softcap_select" on public.gamification_softcap_config
  for select using (
    public.is_system_admin()
    or (tenant_id is not null and public.has_tenant_role(tenant_id, array['owner','admin']::public.tenant_role_enum[]))
  );

create policy "gamification_softcap_manage" on public.gamification_softcap_config
  for all using (
    public.is_system_admin()
    or (tenant_id is not null and public.has_tenant_role(tenant_id, array['owner','admin']::public.tenant_role_enum[]))
  )
  with check (
    public.is_system_admin()
    or (tenant_id is not null and public.has_tenant_role(tenant_id, array['owner','admin']::public.tenant_role_enum[]))
  );

create policy "gamification_softcap_service" on public.gamification_softcap_config
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

comment on table public.gamification_softcap_config is 'Softcap configuration for diminishing returns on rewards';
comment on column public.gamification_softcap_config.daily_coin_threshold is 'Daily coin earnings before diminishing returns apply';
comment on column public.gamification_softcap_config.coin_diminishing_factor is 'Multiplier applied per threshold exceeded (0.5 = halve rewards)';
comment on column public.gamification_softcap_config.coin_floor_pct is 'Minimum reward percentage (floor), never less than this';
comment on column public.gamification_softcap_config.max_multiplier_cap is 'Absolute cap on stacked multipliers (default 2.0x)';

-- Insert global default
insert into public.gamification_softcap_config (
  tenant_id,
  daily_coin_threshold,
  daily_xp_threshold,
  coin_diminishing_factor,
  xp_diminishing_factor,
  coin_floor_pct,
  xp_floor_pct,
  max_multiplier_cap
) values (
  null,  -- global
  100,   -- 100 coins/day before softcap
  500,   -- 500 XP/day before softcap
  0.500, -- 50% diminishing
  0.500,
  0.100, -- 10% floor
  0.100,
  2.00   -- 2.0x max multiplier
) on conflict do nothing;

-- Function to get effective softcap config (tenant override or global)
create or replace function public.get_softcap_config_v1(p_tenant_id uuid)
returns table (
  daily_coin_threshold integer,
  daily_xp_threshold integer,
  coin_diminishing_factor numeric,
  xp_diminishing_factor numeric,
  coin_floor_pct numeric,
  xp_floor_pct numeric,
  max_multiplier_cap numeric,
  source text
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  -- Try tenant-specific first
  return query
    select
      sc.daily_coin_threshold,
      sc.daily_xp_threshold,
      sc.coin_diminishing_factor,
      sc.xp_diminishing_factor,
      sc.coin_floor_pct,
      sc.xp_floor_pct,
      sc.max_multiplier_cap,
      'tenant'::text as source
    from public.gamification_softcap_config sc
    where sc.tenant_id = p_tenant_id
      and sc.is_active = true
    limit 1;
  
  if found then return; end if;
  
  -- Fall back to global
  return query
    select
      sc.daily_coin_threshold,
      sc.daily_xp_threshold,
      sc.coin_diminishing_factor,
      sc.xp_diminishing_factor,
      sc.coin_floor_pct,
      sc.xp_floor_pct,
      sc.max_multiplier_cap,
      'global'::text as source
    from public.gamification_softcap_config sc
    where sc.tenant_id is null
      and sc.is_active = true
    limit 1;
end;
$$;

--------------------------------------------------------------------------------
-- 5) DAILY EARNINGS TRACKER (for softcap calculation)
--------------------------------------------------------------------------------

create table if not exists public.gamification_daily_earnings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  tenant_id uuid references public.tenants(id) on delete cascade,
  earning_date date not null default current_date,
  
  -- Accumulated earnings for the day
  coins_earned integer not null default 0,
  xp_earned integer not null default 0,
  
  -- Pre-softcap values (what would have been earned without caps)
  coins_earned_raw integer not null default 0,
  xp_earned_raw integer not null default 0,
  
  -- How much was reduced by softcap
  coins_reduced integer not null default 0,
  xp_reduced integer not null default 0,
  
  -- Tracking
  event_count integer not null default 0,
  last_event_at timestamptz not null default now(),
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  unique (user_id, tenant_id, earning_date)
);

create index if not exists idx_gamification_daily_earnings_user_date
  on public.gamification_daily_earnings(user_id, tenant_id, earning_date desc);
create index if not exists idx_gamification_daily_earnings_date
  on public.gamification_daily_earnings(earning_date);

alter table public.gamification_daily_earnings enable row level security;

create policy "gamification_daily_earnings_select" on public.gamification_daily_earnings
  for select using (auth.uid() = user_id);

create policy "gamification_daily_earnings_service" on public.gamification_daily_earnings
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy "gamification_daily_earnings_admin_select" on public.gamification_daily_earnings
  for select using (
    public.is_system_admin()
    or (tenant_id is not null and public.has_tenant_role(tenant_id, array['owner','admin']::public.tenant_role_enum[]))
  );

comment on table public.gamification_daily_earnings is 'Tracks daily coin/XP earnings for softcap calculation';

-- Function to calculate softcap-adjusted reward
create or replace function public.calculate_softcap_reward_v1(
  p_user_id uuid,
  p_tenant_id uuid,
  p_base_coins integer,
  p_base_xp integer,
  p_multiplier numeric default 1.0
)
returns table (
  adjusted_coins integer,
  adjusted_xp integer,
  effective_multiplier numeric,
  softcap_applied boolean,
  coins_reduced integer,
  xp_reduced integer
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_config record;
  v_today date := current_date;
  v_current_coins integer;
  v_current_xp integer;
  v_capped_multiplier numeric;
  v_coin_factor numeric;
  v_xp_factor numeric;
  v_raw_coins integer;
  v_raw_xp integer;
  v_final_coins integer;
  v_final_xp integer;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role only';
  end if;

  -- Get softcap config
  select * into v_config from public.get_softcap_config_v1(p_tenant_id) limit 1;
  
  if v_config is null then
    -- No config, return base values with capped multiplier
    v_capped_multiplier := least(p_multiplier, 2.0);
    adjusted_coins := greatest(0, round(p_base_coins * v_capped_multiplier)::integer);
    adjusted_xp := greatest(0, round(p_base_xp * v_capped_multiplier)::integer);
    effective_multiplier := v_capped_multiplier;
    softcap_applied := false;
    coins_reduced := 0;
    xp_reduced := 0;
    return next;
    return;
  end if;

  -- Cap the multiplier
  v_capped_multiplier := least(p_multiplier, v_config.max_multiplier_cap);
  
  -- Calculate raw (pre-softcap) rewards
  v_raw_coins := greatest(0, round(p_base_coins * v_capped_multiplier)::integer);
  v_raw_xp := greatest(0, round(p_base_xp * v_capped_multiplier)::integer);

  -- Get current daily earnings
  select coalesce(de.coins_earned, 0), coalesce(de.xp_earned, 0)
    into v_current_coins, v_current_xp
    from public.gamification_daily_earnings de
    where de.user_id = p_user_id
      and de.tenant_id is not distinct from p_tenant_id
      and de.earning_date = v_today
    limit 1;
  
  v_current_coins := coalesce(v_current_coins, 0);
  v_current_xp := coalesce(v_current_xp, 0);

  -- Calculate diminishing factor for coins
  if v_current_coins >= v_config.daily_coin_threshold then
    -- How many "thresholds" over we are
    v_coin_factor := power(
      v_config.coin_diminishing_factor,
      floor((v_current_coins - v_config.daily_coin_threshold)::numeric / v_config.daily_coin_threshold) + 1
    );
    v_coin_factor := greatest(v_coin_factor, v_config.coin_floor_pct);
  else
    v_coin_factor := 1.0;
  end if;

  -- Calculate diminishing factor for XP
  if v_current_xp >= v_config.daily_xp_threshold then
    v_xp_factor := power(
      v_config.xp_diminishing_factor,
      floor((v_current_xp - v_config.daily_xp_threshold)::numeric / v_config.daily_xp_threshold) + 1
    );
    v_xp_factor := greatest(v_xp_factor, v_config.xp_floor_pct);
  else
    v_xp_factor := 1.0;
  end if;

  -- Apply softcap
  v_final_coins := greatest(1, round(v_raw_coins * v_coin_factor)::integer);
  v_final_xp := greatest(1, round(v_raw_xp * v_xp_factor)::integer);
  
  -- If base was 0, keep it 0
  if p_base_coins = 0 then v_final_coins := 0; end if;
  if p_base_xp = 0 then v_final_xp := 0; end if;

  adjusted_coins := v_final_coins;
  adjusted_xp := v_final_xp;
  effective_multiplier := v_capped_multiplier;
  softcap_applied := (v_coin_factor < 1.0 or v_xp_factor < 1.0);
  coins_reduced := v_raw_coins - v_final_coins;
  xp_reduced := v_raw_xp - v_final_xp;
  
  return next;
end;
$$;

-- Function to record daily earnings (called after reward application)
create or replace function public.record_daily_earning_v1(
  p_user_id uuid,
  p_tenant_id uuid,
  p_coins integer,
  p_xp integer,
  p_coins_raw integer default null,
  p_xp_raw integer default null,
  p_coins_reduced integer default 0,
  p_xp_reduced integer default 0
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role only';
  end if;

  insert into public.gamification_daily_earnings (
    user_id, tenant_id, earning_date,
    coins_earned, xp_earned,
    coins_earned_raw, xp_earned_raw,
    coins_reduced, xp_reduced,
    event_count, last_event_at
  ) values (
    p_user_id, p_tenant_id, current_date,
    coalesce(p_coins, 0), coalesce(p_xp, 0),
    coalesce(p_coins_raw, p_coins, 0), coalesce(p_xp_raw, p_xp, 0),
    coalesce(p_coins_reduced, 0), coalesce(p_xp_reduced, 0),
    1, now()
  )
  on conflict (user_id, tenant_id, earning_date)
  do update set
    coins_earned = gamification_daily_earnings.coins_earned + coalesce(p_coins, 0),
    xp_earned = gamification_daily_earnings.xp_earned + coalesce(p_xp, 0),
    coins_earned_raw = gamification_daily_earnings.coins_earned_raw + coalesce(p_coins_raw, p_coins, 0),
    xp_earned_raw = gamification_daily_earnings.xp_earned_raw + coalesce(p_xp_raw, p_xp, 0),
    coins_reduced = gamification_daily_earnings.coins_reduced + coalesce(p_coins_reduced, 0),
    xp_reduced = gamification_daily_earnings.xp_reduced + coalesce(p_xp_reduced, 0),
    event_count = gamification_daily_earnings.event_count + 1,
    last_event_at = now(),
    updated_at = now();
end;
$$;

--------------------------------------------------------------------------------
-- 6) BURN FOUNDATION (Shop/Sink Preparation)
--------------------------------------------------------------------------------

-- Burn sinks registry (extensible for future shop items, boosts, etc.)
create table if not exists public.gamification_burn_sinks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  
  sink_type text not null check (sink_type in ('shop_item', 'boost', 'cosmetic', 'donation', 'custom')),
  name text not null,
  description text,
  
  -- Cost configuration
  cost_coins integer not null check (cost_coins >= 0),
  
  -- Availability
  is_available boolean not null default false,
  available_from timestamptz,
  available_until timestamptz,
  
  -- Stock limits (null = unlimited)
  total_stock integer,
  remaining_stock integer,
  per_user_limit integer,
  
  -- Metadata for sink-specific config
  metadata jsonb,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_gamification_burn_sinks_tenant on public.gamification_burn_sinks(tenant_id);
create index if not exists idx_gamification_burn_sinks_type on public.gamification_burn_sinks(sink_type, is_available);
create index if not exists idx_gamification_burn_sinks_available on public.gamification_burn_sinks(is_available, available_from, available_until)
  where is_available = true;

alter table public.gamification_burn_sinks enable row level security;

-- Users can view available sinks
create policy "gamification_burn_sinks_select" on public.gamification_burn_sinks
  for select to authenticated
  using (
    is_available = true
    and (tenant_id is null or tenant_id = any(public.get_user_tenant_ids()))
  );

-- Admins can manage
create policy "gamification_burn_sinks_admin" on public.gamification_burn_sinks
  for all using (
    public.is_system_admin()
    or (tenant_id is not null and public.has_tenant_role(tenant_id, array['owner','admin']::public.tenant_role_enum[]))
  )
  with check (
    public.is_system_admin()
    or (tenant_id is not null and public.has_tenant_role(tenant_id, array['owner','admin']::public.tenant_role_enum[]))
  );

create policy "gamification_burn_sinks_service" on public.gamification_burn_sinks
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

comment on table public.gamification_burn_sinks is 'Registry of coin burn mechanisms (shop items, boosts, etc.) for future extensibility';

-- Burn transaction log (links to coin_transactions)
create table if not exists public.gamification_burn_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  tenant_id uuid references public.tenants(id) on delete cascade,
  sink_id uuid references public.gamification_burn_sinks(id) on delete set null,
  coin_transaction_id uuid references public.coin_transactions(id) on delete set null,
  
  -- Burn details
  sink_type text not null,
  amount_spent integer not null check (amount_spent > 0),
  
  -- Result tracking
  result_status text not null default 'completed' check (result_status in ('completed', 'refunded', 'failed')),
  refund_transaction_id uuid references public.coin_transactions(id) on delete set null,
  
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_gamification_burn_log_user on public.gamification_burn_log(user_id, tenant_id);
create index if not exists idx_gamification_burn_log_sink on public.gamification_burn_log(sink_id);
create index if not exists idx_gamification_burn_log_created on public.gamification_burn_log(created_at desc);

alter table public.gamification_burn_log enable row level security;

create policy "gamification_burn_log_select" on public.gamification_burn_log
  for select using (auth.uid() = user_id);

create policy "gamification_burn_log_service" on public.gamification_burn_log
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy "gamification_burn_log_admin_select" on public.gamification_burn_log
  for select using (
    public.is_system_admin()
    or (tenant_id is not null and public.has_tenant_role(tenant_id, array['owner','admin']::public.tenant_role_enum[]))
  );

comment on table public.gamification_burn_log is 'Audit log of all coin burn transactions (purchases, boosts, etc.)';

-- Atomic burn function (prevents negative balance, double spend)
create or replace function public.burn_coins_v1(
  p_user_id uuid,
  p_tenant_id uuid,
  p_sink_id uuid,
  p_amount integer,
  p_idempotency_key text,
  p_metadata jsonb default null
)
returns table (
  success boolean,
  burn_log_id uuid,
  coin_transaction_id uuid,
  new_balance integer,
  error_message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sink public.gamification_burn_sinks%rowtype;
  v_tx_result record;
  v_burn_id uuid;
  v_now timestamptz := now();
  v_lock_key bigint;
  v_existing_burn_id uuid;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role only';
  end if;

  -- Idempotency check
  v_lock_key := hashtextextended(p_user_id::text || ':' || p_tenant_id::text || ':burn:' || p_idempotency_key, 0);
  perform pg_advisory_xact_lock(v_lock_key);

  select bl.id into v_existing_burn_id
    from public.gamification_burn_log bl
    join public.coin_transactions ct on ct.id = bl.coin_transaction_id
    where ct.user_id = p_user_id
      and ct.tenant_id is not distinct from p_tenant_id
      and ct.idempotency_key = p_idempotency_key
    limit 1;

  if v_existing_burn_id is not null then
    -- Already processed
    select true, v_existing_burn_id, bl.coin_transaction_id, uc.balance, null::text
      into success, burn_log_id, coin_transaction_id, new_balance, error_message
      from public.gamification_burn_log bl
      join public.user_coins uc on uc.user_id = p_user_id and uc.tenant_id is not distinct from p_tenant_id
      where bl.id = v_existing_burn_id;
    return next;
    return;
  end if;

  -- Validate sink if provided
  if p_sink_id is not null then
    select * into v_sink
      from public.gamification_burn_sinks
      where id = p_sink_id
        and is_available = true
        and (available_from is null or available_from <= v_now)
        and (available_until is null or available_until >= v_now)
      limit 1;
    
    if v_sink.id is null then
      success := false;
      error_message := 'Sink not available';
      return next;
      return;
    end if;

    -- Check stock
    if v_sink.remaining_stock is not null and v_sink.remaining_stock <= 0 then
      success := false;
      error_message := 'Out of stock';
      return next;
      return;
    end if;
  end if;

  -- Execute spend transaction (will fail if insufficient funds)
  begin
    select * into v_tx_result
      from public.apply_coin_transaction_v1(
        p_user_id := p_user_id,
        p_tenant_id := p_tenant_id,
        p_type := 'spend',
        p_amount := p_amount,
        p_reason_code := 'burn:' || coalesce(v_sink.sink_type, 'manual'),
        p_idempotency_key := p_idempotency_key,
        p_description := coalesce(v_sink.name, 'Coin burn'),
        p_source := 'burn',
        p_metadata := jsonb_build_object(
          'sinkId', p_sink_id,
          'sinkType', v_sink.sink_type
        ) || coalesce(p_metadata, '{}'::jsonb)
      )
      limit 1;
  exception
    when others then
      success := false;
      error_message := sqlerrm;
      return next;
      return;
  end;

  -- Log the burn
  insert into public.gamification_burn_log (
    user_id, tenant_id, sink_id, coin_transaction_id,
    sink_type, amount_spent, result_status, metadata
  ) values (
    p_user_id, p_tenant_id, p_sink_id, v_tx_result.transaction_id,
    coalesce(v_sink.sink_type, 'custom'), p_amount, 'completed', p_metadata
  ) returning id into v_burn_id;

  -- Update stock if applicable
  if v_sink.id is not null and v_sink.remaining_stock is not null then
    update public.gamification_burn_sinks
      set remaining_stock = remaining_stock - 1,
          updated_at = now()
      where id = p_sink_id
        and remaining_stock > 0;
  end if;

  success := true;
  burn_log_id := v_burn_id;
  coin_transaction_id := v_tx_result.transaction_id;
  new_balance := v_tx_result.balance;
  error_message := null;
  return next;
end;
$$;

--------------------------------------------------------------------------------
-- 7) REWARD RULES TABLE (extends automation for full rule engine)
--------------------------------------------------------------------------------

-- Extended reward rules with cooldown and XP support
alter table public.gamification_automation_rules
  add column if not exists xp_amount integer default 0 check (xp_amount >= 0);

alter table public.gamification_automation_rules
  add column if not exists cooldown_type text default 'none'
    check (cooldown_type in ('none', 'daily', 'weekly', 'once', 'once_per_streak'));

alter table public.gamification_automation_rules
  add column if not exists base_multiplier numeric(4,2) default 1.00
    check (base_multiplier >= 0 and base_multiplier <= 10);

alter table public.gamification_automation_rules
  add column if not exists conditions jsonb default '[]'::jsonb;

-- Global rules (tenant_id = null)
alter table public.gamification_automation_rules
  alter column tenant_id drop not null;

-- Index for global rules
create index if not exists idx_gamification_automation_rules_global
  on public.gamification_automation_rules(event_type, is_active)
  where tenant_id is null;

comment on column public.gamification_automation_rules.xp_amount is 'XP reward for this event (in addition to coins)';
comment on column public.gamification_automation_rules.cooldown_type is 'Rate limiting: none, daily, weekly, once, once_per_streak';
comment on column public.gamification_automation_rules.base_multiplier is 'Base multiplier before stacking (capped by softcap config)';
comment on column public.gamification_automation_rules.conditions is 'JSON array of conditions that must be met for rule to apply';

--------------------------------------------------------------------------------
-- 8) HELPER VIEWS FOR ADMIN DASHBOARD
--------------------------------------------------------------------------------

-- View: Daily mint/burn rates per tenant
create or replace view public.v_gamification_daily_economy as
select
  ct.tenant_id,
  date_trunc('day', ct.created_at)::date as day,
  sum(case when ct.type = 'earn' then ct.amount else 0 end) as coins_minted,
  sum(case when ct.type = 'spend' then ct.amount else 0 end) as coins_burned,
  sum(case when ct.type = 'earn' then ct.amount else 0 end) -
    sum(case when ct.type = 'spend' then ct.amount else 0 end) as net_flow,
  count(*) filter (where ct.type = 'earn') as mint_tx_count,
  count(*) filter (where ct.type = 'spend') as burn_tx_count
from public.coin_transactions ct
group by ct.tenant_id, date_trunc('day', ct.created_at)::date;

-- View: Top earners (respects leaderboard opt-out)
create or replace view public.v_gamification_leaderboard as
select
  uc.tenant_id,
  uc.user_id,
  u.email,
  uc.balance,
  uc.total_earned,
  uc.total_spent,
  up.level,
  up.current_xp,
  us.current_streak_days,
  us.best_streak_days,
  rank() over (partition by uc.tenant_id order by uc.total_earned desc) as rank_by_earned,
  rank() over (partition by uc.tenant_id order by up.current_xp desc) as rank_by_xp
from public.user_coins uc
join public.users u on u.id = uc.user_id
left join public.user_progress up on up.user_id = uc.user_id and up.tenant_id is not distinct from uc.tenant_id
left join public.user_streaks us on us.user_id = uc.user_id and us.tenant_id is not distinct from uc.tenant_id
left join public.user_gamification_preferences gp on gp.user_id = uc.user_id and gp.tenant_id is not distinct from uc.tenant_id
where coalesce(gp.leaderboard_visible, true) = true;

--------------------------------------------------------------------------------
-- GRANTS
--------------------------------------------------------------------------------

-- Restrict new functions to service_role
revoke all on function public.check_cooldown_eligible_v1(uuid, uuid, text, text, integer) from public, anon, authenticated;
grant execute on function public.check_cooldown_eligible_v1(uuid, uuid, text, text, integer) to service_role;

revoke all on function public.record_cooldown_trigger_v1(uuid, uuid, text, text, integer) from public, anon, authenticated;
grant execute on function public.record_cooldown_trigger_v1(uuid, uuid, text, text, integer) to service_role;

revoke all on function public.calculate_softcap_reward_v1(uuid, uuid, integer, integer, numeric) from public, anon, authenticated;
grant execute on function public.calculate_softcap_reward_v1(uuid, uuid, integer, integer, numeric) to service_role;

revoke all on function public.record_daily_earning_v1(uuid, uuid, integer, integer, integer, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.record_daily_earning_v1(uuid, uuid, integer, integer, integer, integer, integer, integer) to service_role;

revoke all on function public.burn_coins_v1(uuid, uuid, uuid, integer, text, jsonb) from public, anon, authenticated;
grant execute on function public.burn_coins_v1(uuid, uuid, uuid, integer, text, jsonb) to service_role;

-- User-callable functions
grant execute on function public.set_leaderboard_visibility(uuid, boolean) to authenticated;
grant execute on function public.get_softcap_config_v1(uuid) to authenticated, service_role;

commit;
