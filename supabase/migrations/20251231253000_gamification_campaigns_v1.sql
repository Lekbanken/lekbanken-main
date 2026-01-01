-- Gamification Campaigns v1 (tenant-scoped)
-- Minimal campaign engine: award bonus DiceCoin for specific event_type during a timeframe, with optional budget cap.

begin;

create table if not exists public.gamification_campaigns (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  event_type text not null,
  bonus_amount integer not null check (bonus_amount > 0),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  is_active boolean not null default true,
  budget_amount integer null check (budget_amount is null or budget_amount >= 0),
  spent_amount integer not null default 0 check (spent_amount >= 0),
  created_by_user_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    where c.conname = 'gamification_campaigns_valid_timeframe'
      and c.conrelid = 'public.gamification_campaigns'::regclass
  ) then
    execute 'alter table public.gamification_campaigns add constraint gamification_campaigns_valid_timeframe check (ends_at > starts_at)';
  end if;
end
$$;

create index if not exists idx_gamification_campaigns_tenant_active
  on public.gamification_campaigns(tenant_id, is_active, starts_at, ends_at);

alter table public.gamification_campaigns enable row level security;

-- Select: tenant owner/admin or system_admin
drop policy if exists gamification_campaigns_select on public.gamification_campaigns;
create policy gamification_campaigns_select
  on public.gamification_campaigns for select
  using (
    public.is_system_admin()
    or public.has_tenant_role(tenant_id, array['owner','admin']::public.tenant_role_enum[])
  );

-- Service role can manage
drop policy if exists gamification_campaigns_service_all on public.gamification_campaigns;
create policy gamification_campaigns_service_all
  on public.gamification_campaigns for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Apply campaign bonus (service only, idempotent)
create or replace function public.apply_campaign_bonus_v1(
  p_campaign_id uuid,
  p_user_id uuid,
  p_tenant_id uuid,
  p_event_id uuid,
  p_event_type text,
  p_idempotency_key text
)
returns table (applied boolean, coin_transaction_id uuid, balance integer, bonus_amount integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campaign public.gamification_campaigns%rowtype;
  v_now timestamptz := now();
  v_lock_key bigint;
  v_budget_remaining integer;
  v_tx_id uuid;
  v_balance integer;
  v_existing_tx_id uuid;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role only';
  end if;

  if p_campaign_id is null then raise exception 'p_campaign_id is required'; end if;
  if p_user_id is null then raise exception 'p_user_id is required'; end if;
  if p_tenant_id is null then raise exception 'p_tenant_id is required'; end if;
  if p_event_id is null then raise exception 'p_event_id is required'; end if;
  if p_event_type is null or length(trim(p_event_type)) = 0 then raise exception 'p_event_type is required'; end if;
  if p_idempotency_key is null or length(trim(p_idempotency_key)) < 8 then raise exception 'p_idempotency_key is required'; end if;

  -- Serialize budget updates per campaign + tenant
  v_lock_key := hashtextextended(p_campaign_id::text || ':' || p_tenant_id::text, 0);
  perform pg_advisory_xact_lock(v_lock_key);

  -- Idempotency: if this campaign bonus was already applied, do not increment spent again.
  select ct.id
    into v_existing_tx_id
    from public.coin_transactions ct
    where ct.user_id = p_user_id
      and ct.tenant_id = p_tenant_id
      and ct.idempotency_key = p_idempotency_key
    limit 1;

  if v_existing_tx_id is not null then
    select uc.balance
      into v_balance
      from public.user_coins uc
      where uc.user_id = p_user_id
        and uc.tenant_id = p_tenant_id
      limit 1;

    applied := true;
    coin_transaction_id := v_existing_tx_id;
    balance := coalesce(v_balance, 0);
    bonus_amount := 0;
    return next;
    return;
  end if;

  select * into v_campaign
    from public.gamification_campaigns gc
    where gc.id = p_campaign_id
      and gc.tenant_id = p_tenant_id
    limit 1;

  if v_campaign.id is null then
    applied := false;
    coin_transaction_id := null;
    balance := 0;
    bonus_amount := 0;
    return next;
    return;
  end if;

  if v_campaign.is_active is distinct from true then
    applied := false;
    coin_transaction_id := null;
    balance := 0;
    bonus_amount := 0;
    return next;
    return;
  end if;

  if not (v_now >= v_campaign.starts_at and v_now <= v_campaign.ends_at) then
    applied := false;
    coin_transaction_id := null;
    balance := 0;
    bonus_amount := 0;
    return next;
    return;
  end if;

  if v_campaign.event_type <> p_event_type then
    applied := false;
    coin_transaction_id := null;
    balance := 0;
    bonus_amount := 0;
    return next;
    return;
  end if;

  if v_campaign.budget_amount is not null then
    v_budget_remaining := greatest(v_campaign.budget_amount - v_campaign.spent_amount, 0);
    if v_campaign.bonus_amount > v_budget_remaining then
      applied := false;
      coin_transaction_id := null;
      balance := 0;
      bonus_amount := 0;
      return next;
      return;
    end if;
  end if;

  select transaction_id, balance
    into v_tx_id, v_balance
    from public.apply_coin_transaction_v1(
      p_user_id := p_user_id,
      p_tenant_id := p_tenant_id,
      p_type := 'earn',
      p_amount := v_campaign.bonus_amount,
      p_reason_code := 'campaign_bonus',
      p_idempotency_key := p_idempotency_key,
      p_description := 'Campaign bonus: ' || v_campaign.name,
      p_source := 'campaign',
      p_metadata := jsonb_build_object(
        'campaignId', p_campaign_id,
        'eventId', p_event_id,
        'eventType', p_event_type
      )
    )
    limit 1;

  if v_tx_id is not null then
    update public.gamification_campaigns
      set spent_amount = spent_amount + v_campaign.bonus_amount,
          updated_at = now()
      where id = p_campaign_id
        and tenant_id = p_tenant_id;
  end if;

  applied := true;
  coin_transaction_id := v_tx_id;
  balance := coalesce(v_balance, 0);
  bonus_amount := v_campaign.bonus_amount;
  return next;
end;
$$;

revoke all on function public.apply_campaign_bonus_v1(uuid,uuid,uuid,uuid,text,text) from public;
revoke all on function public.apply_campaign_bonus_v1(uuid,uuid,uuid,uuid,text,text) from anon;
revoke all on function public.apply_campaign_bonus_v1(uuid,uuid,uuid,uuid,text,text) from authenticated;
grant execute on function public.apply_campaign_bonus_v1(uuid,uuid,uuid,uuid,text,text) to service_role;

commit;
