-- Gamification Admin Awards v1: manual coin awards with message + audit

begin;

-- 1) Audit tables
create table if not exists public.gamification_admin_awards (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  actor_user_id uuid references public.users(id) on delete set null,
  award_type text not null,
  amount integer not null,
  message text,
  idempotency_key text not null,
  source text not null default 'admin_award',
  created_at timestamptz not null default now()
);

do $$ begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'gamification_admin_awards_amount_positive'
  ) then
    alter table public.gamification_admin_awards
      add constraint gamification_admin_awards_amount_positive check (amount > 0);
  end if;
end $$;

create unique index if not exists idx_gamification_admin_awards_idempotency
  on public.gamification_admin_awards(tenant_id, idempotency_key);

create index if not exists idx_gamification_admin_awards_tenant_created
  on public.gamification_admin_awards(tenant_id, created_at desc);

create table if not exists public.gamification_admin_award_recipients (
  id uuid primary key default gen_random_uuid(),
  award_id uuid not null references public.gamification_admin_awards(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  coin_transaction_id uuid references public.coin_transactions(id) on delete set null,
  balance_after integer,
  created_at timestamptz not null default now(),
  unique (award_id, user_id)
);

create index if not exists idx_gamification_admin_award_recipients_tenant_user
  on public.gamification_admin_award_recipients(tenant_id, user_id);

-- 2) RLS: select allowed for system_admin or tenant owner/admin; service_role can do all
alter table public.gamification_admin_awards enable row level security;
alter table public.gamification_admin_award_recipients enable row level security;

drop policy if exists gamification_admin_awards_select on public.gamification_admin_awards;
create policy gamification_admin_awards_select
  on public.gamification_admin_awards for select
  using (
    public.is_system_admin()
    or public.has_tenant_role(tenant_id, array['owner','admin']::public.tenant_role_enum[])
  );

drop policy if exists gamification_admin_awards_service_all on public.gamification_admin_awards;
create policy gamification_admin_awards_service_all
  on public.gamification_admin_awards for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists gamification_admin_award_recipients_select on public.gamification_admin_award_recipients;
create policy gamification_admin_award_recipients_select
  on public.gamification_admin_award_recipients for select
  using (
    public.is_system_admin()
    or public.has_tenant_role(tenant_id, array['owner','admin']::public.tenant_role_enum[])
  );

drop policy if exists gamification_admin_award_recipients_service_all on public.gamification_admin_award_recipients;
create policy gamification_admin_award_recipients_service_all
  on public.gamification_admin_award_recipients for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- 3) Atomic, idempotent award function (service only)
create or replace function public.admin_award_coins_v1(
  p_tenant_id uuid,
  p_actor_user_id uuid,
  p_target_user_ids uuid[],
  p_amount integer,
  p_message text,
  p_idempotency_key text
)
returns table (
  award_id uuid,
  recipient_user_id uuid,
  coin_transaction_id uuid,
  balance integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_award_id uuid;
  v_existing_id uuid;
  v_user_id uuid;
  v_lock_key bigint;
  v_tx_id uuid;
  v_balance integer;
  v_now timestamptz := now();
  v_metadata jsonb;
  v_per_user_idempotency text;
begin
  if p_tenant_id is null then
    raise exception 'p_tenant_id is required';
  end if;
  if p_actor_user_id is null then
    raise exception 'p_actor_user_id is required';
  end if;
  if p_target_user_ids is null or array_length(p_target_user_ids, 1) is null or array_length(p_target_user_ids, 1) = 0 then
    raise exception 'p_target_user_ids is required';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'p_amount must be > 0';
  end if;
  if p_idempotency_key is null or length(trim(p_idempotency_key)) = 0 then
    raise exception 'p_idempotency_key is required';
  end if;

  v_lock_key := hashtextextended(p_tenant_id::text || ':' || p_idempotency_key, 0);
  perform pg_advisory_xact_lock(v_lock_key);

  select gaa.id
    into v_existing_id
    from public.gamification_admin_awards gaa
    where gaa.tenant_id = p_tenant_id
      and gaa.idempotency_key = p_idempotency_key
    limit 1;

  if v_existing_id is not null then
    award_id := v_existing_id;
    for recipient_user_id, coin_transaction_id, balance in
      select gar.user_id, gar.coin_transaction_id, gar.balance_after
        from public.gamification_admin_award_recipients gar
        where gar.award_id = v_existing_id
        order by gar.created_at asc
    loop
      return next;
    end loop;
    return;
  end if;

  insert into public.gamification_admin_awards(
    tenant_id,
    actor_user_id,
    award_type,
    amount,
    message,
    idempotency_key,
    source,
    created_at
  ) values (
    p_tenant_id,
    p_actor_user_id,
    'coins',
    p_amount,
    nullif(p_message, ''),
    p_idempotency_key,
    'admin_award',
    v_now
  ) returning id into v_award_id;

  -- Optional: also write to tenant_audit_logs for cross-domain audit browsing
  insert into public.tenant_audit_logs(tenant_id, actor_user_id, event_type, payload, created_at)
  values (
    p_tenant_id,
    p_actor_user_id,
    'gamification.admin_award.coins',
    jsonb_build_object(
      'award_id', v_award_id,
      'amount', p_amount,
      'message', nullif(p_message, ''),
      'recipient_count', array_length(p_target_user_ids, 1),
      'idempotency_key', p_idempotency_key
    ),
    v_now
  );

  for v_user_id in (select distinct unnest(p_target_user_ids)) loop
    v_per_user_idempotency := p_idempotency_key || ':' || v_user_id::text;
    v_metadata := jsonb_build_object(
      'award_id', v_award_id,
      'actor_user_id', p_actor_user_id,
      'source', 'admin_award'
    );

    select t.transaction_id, t.balance
      into v_tx_id, v_balance
      from public.apply_coin_transaction_v1(
        v_user_id,
        p_tenant_id,
        'earn',
        p_amount,
        'admin_award',
        v_per_user_idempotency,
        nullif(p_message, ''),
        'admin_award',
        v_metadata
      ) as t;

    insert into public.gamification_admin_award_recipients(
      award_id,
      tenant_id,
      user_id,
      coin_transaction_id,
      balance_after,
      created_at
    ) values (
      v_award_id,
      p_tenant_id,
      v_user_id,
      v_tx_id,
      v_balance,
      v_now
    )
    on conflict (award_id, user_id)
    do update set
      coin_transaction_id = excluded.coin_transaction_id,
      balance_after = excluded.balance_after;

    award_id := v_award_id;
    recipient_user_id := v_user_id;
    coin_transaction_id := v_tx_id;
    balance := v_balance;
    return next;
  end loop;
end;
$$;

revoke all on function public.admin_award_coins_v1(uuid,uuid,uuid[],integer,text,text) from public;
revoke all on function public.admin_award_coins_v1(uuid,uuid,uuid[],integer,text,text) from anon;
revoke all on function public.admin_award_coins_v1(uuid,uuid,uuid[],integer,text,text) from authenticated;

grant execute on function public.admin_award_coins_v1(uuid,uuid,uuid[],integer,text,text) to service_role;
commit;
