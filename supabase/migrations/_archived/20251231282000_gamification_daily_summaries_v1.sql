-- Gamification daily summaries v1
-- Materialized rollups for very large tenants (service-refreshed).

begin;

create table if not exists public.gamification_daily_summaries (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  day date not null,

  earned bigint not null default 0,
  spent bigint not null default 0,
  tx_count bigint not null default 0,

  events_count bigint not null default 0,

  awards_total bigint not null default 0,
  awards_count bigint not null default 0,

  purchases_count bigint not null default 0,
  purchases_spent numeric not null default 0,

  campaign_bonus_total bigint not null default 0,
  automation_total bigint not null default 0,

  updated_at timestamptz not null default now(),

  primary key (tenant_id, day)
);

create index if not exists idx_gamification_daily_summaries_tenant_day
  on public.gamification_daily_summaries(tenant_id, day desc);

alter table public.gamification_daily_summaries enable row level security;

drop policy if exists gamification_daily_summaries_select on public.gamification_daily_summaries;
create policy gamification_daily_summaries_select
  on public.gamification_daily_summaries for select
  using (
    public.is_system_admin()
    or public.has_tenant_role(tenant_id, array['owner','admin']::public.tenant_role_enum[])
  );

drop policy if exists gamification_daily_summaries_service_all on public.gamification_daily_summaries;
create policy gamification_daily_summaries_service_all
  on public.gamification_daily_summaries for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Refresh rollups for a tenant over the last N days.
create or replace function public.refresh_gamification_daily_summaries_v1(
  p_tenant_id uuid,
  p_days integer default 90
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start date;
  v_end date;
  v_days integer;
  v_count integer;
begin
  if p_tenant_id is null then
    raise exception 'p_tenant_id is required';
  end if;

  if p_days is null or p_days < 1 or p_days > 3650 then
    raise exception 'p_days must be between 1 and 3650';
  end if;

  if auth.role() <> 'service_role' then
    raise exception 'service role only';
  end if;

  v_days := p_days;
  v_end := current_date;
  v_start := (current_date - (v_days - 1));

  with
    days as (
      select generate_series(v_start, v_end, interval '1 day')::date as day
    ),
    tx as (
      select
        ct.created_at::date as day,
        coalesce(sum(ct.amount) filter (where ct.type = 'earn'), 0)::bigint as earned,
        coalesce(sum(ct.amount) filter (where ct.type = 'spend'), 0)::bigint as spent,
        count(*)::bigint as tx_count,
        coalesce(sum(ct.amount) filter (where ct.type = 'earn' and ct.reason_code = 'campaign_bonus'), 0)::bigint as campaign_bonus_total,
        coalesce(sum(ct.amount) filter (where ct.type = 'earn' and ct.reason_code = 'automation_rule'), 0)::bigint as automation_total
      from public.coin_transactions ct
      where ct.tenant_id = p_tenant_id
        and ct.created_at >= v_start::timestamptz
        and ct.created_at < (v_end + 1)::timestamptz
      group by ct.created_at::date
    ),
    ev as (
      select
        ge.created_at::date as day,
        count(*)::bigint as events_count
      from public.gamification_events ge
      where ge.tenant_id = p_tenant_id
        and ge.created_at >= v_start::timestamptz
        and ge.created_at < (v_end + 1)::timestamptz
      group by ge.created_at::date
    ),
    aw as (
      select
        gaa.created_at::date as day,
        count(*)::bigint as awards_count,
        coalesce(sum(gaa.amount), 0)::bigint as awards_total
      from public.gamification_admin_awards gaa
      where gaa.tenant_id = p_tenant_id
        and gaa.created_at >= v_start::timestamptz
        and gaa.created_at < (v_end + 1)::timestamptz
      group by gaa.created_at::date
    ),
    pu as (
      select
        up.created_at::date as day,
        count(*)::bigint as purchases_count,
        coalesce(sum(up.price_paid), 0)::numeric as purchases_spent
      from public.user_purchases up
      where up.tenant_id = p_tenant_id
        and up.created_at >= v_start::timestamptz
        and up.created_at < (v_end + 1)::timestamptz
      group by up.created_at::date
    )
  insert into public.gamification_daily_summaries (
    tenant_id,
    day,
    earned,
    spent,
    tx_count,
    events_count,
    awards_total,
    awards_count,
    purchases_count,
    purchases_spent,
    campaign_bonus_total,
    automation_total,
    updated_at
  )
  select
    p_tenant_id,
    d.day,
    coalesce(tx.earned, 0),
    coalesce(tx.spent, 0),
    coalesce(tx.tx_count, 0),
    coalesce(ev.events_count, 0),
    coalesce(aw.awards_total, 0),
    coalesce(aw.awards_count, 0),
    coalesce(pu.purchases_count, 0),
    coalesce(pu.purchases_spent, 0),
    coalesce(tx.campaign_bonus_total, 0),
    coalesce(tx.automation_total, 0),
    now()
  from days d
  left join tx on tx.day = d.day
  left join ev on ev.day = d.day
  left join aw on aw.day = d.day
  left join pu on pu.day = d.day
  on conflict (tenant_id, day) do update set
    earned = excluded.earned,
    spent = excluded.spent,
    tx_count = excluded.tx_count,
    events_count = excluded.events_count,
    awards_total = excluded.awards_total,
    awards_count = excluded.awards_count,
    purchases_count = excluded.purchases_count,
    purchases_spent = excluded.purchases_spent,
    campaign_bonus_total = excluded.campaign_bonus_total,
    automation_total = excluded.automation_total,
    updated_at = excluded.updated_at;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.refresh_gamification_daily_summaries_v1(uuid, integer) from public;
grant execute on function public.refresh_gamification_daily_summaries_v1(uuid, integer) to service_role;

commit;
