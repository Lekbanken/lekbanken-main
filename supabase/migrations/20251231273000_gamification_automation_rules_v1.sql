-- Gamification Automation Rules v1
-- Minimal tenant-scoped automation: if event_type then mint coins.

begin;

create table if not exists public.gamification_automation_rules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  event_type text not null,
  reward_amount integer not null check (reward_amount > 0),
  is_active boolean not null default true,
  created_by_user_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_gamification_automation_rules_tenant_event_active
  on public.gamification_automation_rules(tenant_id, event_type, is_active);

alter table public.gamification_automation_rules enable row level security;

-- Select: tenant owner/admin or system_admin
drop policy if exists gamification_automation_rules_select on public.gamification_automation_rules;
create policy gamification_automation_rules_select
  on public.gamification_automation_rules for select
  using (
    public.is_system_admin()
    or public.has_tenant_role(tenant_id, array['owner','admin']::public.tenant_role_enum[])
  );

-- Service role can manage
drop policy if exists gamification_automation_rules_service_all on public.gamification_automation_rules;
create policy gamification_automation_rules_service_all
  on public.gamification_automation_rules for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Apply automation reward (service only, idempotent)
create or replace function public.apply_automation_rule_reward_v1(
  p_rule_id uuid,
  p_user_id uuid,
  p_tenant_id uuid,
  p_event_id uuid,
  p_event_type text,
  p_idempotency_key text
)
returns table (applied boolean, coin_transaction_id uuid, balance integer, reward_amount integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rule public.gamification_automation_rules%rowtype;
  v_now timestamptz := now();
  v_tx_id uuid;
  v_balance integer;
  v_existing_tx_id uuid;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role only';
  end if;

  if p_rule_id is null then raise exception 'p_rule_id is required'; end if;
  if p_user_id is null then raise exception 'p_user_id is required'; end if;
  if p_tenant_id is null then raise exception 'p_tenant_id is required'; end if;
  if p_event_id is null then raise exception 'p_event_id is required'; end if;
  if p_event_type is null or length(trim(p_event_type)) = 0 then raise exception 'p_event_type is required'; end if;
  if p_idempotency_key is null or length(trim(p_idempotency_key)) < 8 then raise exception 'p_idempotency_key is required'; end if;

  -- Idempotency: if already applied, do not mint again.
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
    reward_amount := 0;
    return next;
    return;
  end if;

  select * into v_rule
    from public.gamification_automation_rules r
    where r.id = p_rule_id
      and r.tenant_id = p_tenant_id
    limit 1;

  if v_rule.id is null then
    applied := false;
    coin_transaction_id := null;
    balance := 0;
    reward_amount := 0;
    return next;
    return;
  end if;

  if v_rule.is_active is distinct from true then
    applied := false;
    coin_transaction_id := null;
    balance := 0;
    reward_amount := 0;
    return next;
    return;
  end if;

  if v_rule.event_type <> p_event_type then
    applied := false;
    coin_transaction_id := null;
    balance := 0;
    reward_amount := 0;
    return next;
    return;
  end if;

  select transaction_id, balance
    into v_tx_id, v_balance
    from public.apply_coin_transaction_v1(
      p_user_id := p_user_id,
      p_tenant_id := p_tenant_id,
      p_type := 'earn',
      p_amount := v_rule.reward_amount,
      p_reason_code := 'automation_rule',
      p_idempotency_key := p_idempotency_key,
      p_description := 'Automation rule: ' || v_rule.name,
      p_source := 'automation',
      p_metadata := jsonb_build_object(
        'ruleId', p_rule_id,
        'eventId', p_event_id,
        'eventType', p_event_type
      )
    )
    limit 1;

  applied := true;
  coin_transaction_id := v_tx_id;
  balance := coalesce(v_balance, 0);
  reward_amount := v_rule.reward_amount;
  return next;
end;
$$;

revoke all on function public.apply_automation_rule_reward_v1(uuid,uuid,uuid,uuid,text,text) from public;
revoke all on function public.apply_automation_rule_reward_v1(uuid,uuid,uuid,uuid,text,text) from anon;
revoke all on function public.apply_automation_rule_reward_v1(uuid,uuid,uuid,uuid,text,text) from authenticated;

grant execute on function public.apply_automation_rule_reward_v1(uuid,uuid,uuid,uuid,text,text) to service_role;

commit;
