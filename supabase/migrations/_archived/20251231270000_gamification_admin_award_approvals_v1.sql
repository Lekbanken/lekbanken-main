-- Gamification Admin Award Approvals v1
-- Adds a pending-approval flow for large manual awards.

begin;

-- 1) Request tables
create table if not exists public.gamification_admin_award_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  requester_user_id uuid references public.users(id) on delete set null,
  amount integer not null,
  message text,
  idempotency_key text not null,
  status text not null default 'pending',
  award_id uuid references public.gamification_admin_awards(id) on delete set null,
  decided_by_user_id uuid references public.users(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

do $$ begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'gamification_admin_award_requests_amount_positive'
  ) then
    alter table public.gamification_admin_award_requests
      add constraint gamification_admin_award_requests_amount_positive check (amount > 0);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'gamification_admin_award_requests_status_valid'
  ) then
    alter table public.gamification_admin_award_requests
      add constraint gamification_admin_award_requests_status_valid check (status in ('pending','approved','rejected'));
  end if;
end $$;

create unique index if not exists idx_gamification_admin_award_requests_idempotency
  on public.gamification_admin_award_requests(tenant_id, idempotency_key);

create index if not exists idx_gamification_admin_award_requests_tenant_created
  on public.gamification_admin_award_requests(tenant_id, created_at desc);

create index if not exists idx_gamification_admin_award_requests_tenant_status_created
  on public.gamification_admin_award_requests(tenant_id, status, created_at desc);

create table if not exists public.gamification_admin_award_request_recipients (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.gamification_admin_award_requests(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (request_id, user_id)
);

create index if not exists idx_gamification_admin_award_request_recipients_tenant_user
  on public.gamification_admin_award_request_recipients(tenant_id, user_id);

-- 2) RLS: select allowed for system_admin or tenant owner/admin; service_role can do all
alter table public.gamification_admin_award_requests enable row level security;
alter table public.gamification_admin_award_request_recipients enable row level security;

drop policy if exists gamification_admin_award_requests_select on public.gamification_admin_award_requests;
create policy gamification_admin_award_requests_select
  on public.gamification_admin_award_requests for select
  using (
    public.is_system_admin()
    or public.has_tenant_role(tenant_id, array['owner','admin']::public.tenant_role_enum[])
  );

drop policy if exists gamification_admin_award_requests_service_all on public.gamification_admin_award_requests;
create policy gamification_admin_award_requests_service_all
  on public.gamification_admin_award_requests for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists gamification_admin_award_request_recipients_select on public.gamification_admin_award_request_recipients;
create policy gamification_admin_award_request_recipients_select
  on public.gamification_admin_award_request_recipients for select
  using (
    public.is_system_admin()
    or public.has_tenant_role(tenant_id, array['owner','admin']::public.tenant_role_enum[])
  );

drop policy if exists gamification_admin_award_request_recipients_service_all on public.gamification_admin_award_request_recipients;
create policy gamification_admin_award_request_recipients_service_all
  on public.gamification_admin_award_request_recipients for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- 3) Service-only RPC: create award request (idempotent)
create or replace function public.admin_request_award_coins_v1(
  p_tenant_id uuid,
  p_actor_user_id uuid,
  p_target_user_ids uuid[],
  p_amount integer,
  p_message text,
  p_idempotency_key text
)
returns table (
  request_id uuid,
  status text,
  recipient_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request_id uuid;
  v_existing_id uuid;
  v_lock_key bigint;
  v_now timestamptz := now();
  v_user_id uuid;
  v_count integer;
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

  if auth.role() <> 'service_role' then
    raise exception 'service role only';
  end if;

  v_lock_key := hashtextextended(p_tenant_id::text || ':' || p_idempotency_key, 0);
  perform pg_advisory_xact_lock(v_lock_key);

  select r.id
    into v_existing_id
    from public.gamification_admin_award_requests r
    where r.tenant_id = p_tenant_id
      and r.idempotency_key = p_idempotency_key
    limit 1;

  if v_existing_id is not null then
    select count(*)::int
      into v_count
      from public.gamification_admin_award_request_recipients rr
      where rr.request_id = v_existing_id;

    request_id := v_existing_id;
    status := (select r2.status from public.gamification_admin_award_requests r2 where r2.id = v_existing_id);
    recipient_count := coalesce(v_count, 0);
    return next;
    return;
  end if;

  insert into public.gamification_admin_award_requests(
    tenant_id,
    requester_user_id,
    amount,
    message,
    idempotency_key,
    status,
    created_at
  ) values (
    p_tenant_id,
    p_actor_user_id,
    p_amount,
    nullif(p_message, ''),
    p_idempotency_key,
    'pending',
    v_now
  ) returning id into v_request_id;

  for v_user_id in (select distinct unnest(p_target_user_ids)) loop
    insert into public.gamification_admin_award_request_recipients(
      request_id,
      tenant_id,
      user_id,
      created_at
    ) values (
      v_request_id,
      p_tenant_id,
      v_user_id,
      v_now
    )
    on conflict (request_id, user_id) do nothing;
  end loop;

  select count(*)::int
    into v_count
    from public.gamification_admin_award_request_recipients rr
    where rr.request_id = v_request_id;

  insert into public.tenant_audit_logs(tenant_id, actor_user_id, event_type, payload, created_at)
  values (
    p_tenant_id,
    p_actor_user_id,
    'gamification.admin_award_request.coins',
    jsonb_build_object(
      'request_id', v_request_id,
      'amount', p_amount,
      'message', nullif(p_message, ''),
      'recipient_count', v_count,
      'idempotency_key', p_idempotency_key
    ),
    v_now
  );

  request_id := v_request_id;
  status := 'pending';
  recipient_count := v_count;
  return next;
end;
$$;

revoke all on function public.admin_request_award_coins_v1(uuid,uuid,uuid[],integer,text,text) from public;
revoke all on function public.admin_request_award_coins_v1(uuid,uuid,uuid[],integer,text,text) from anon;
revoke all on function public.admin_request_award_coins_v1(uuid,uuid,uuid[],integer,text,text) from authenticated;

grant execute on function public.admin_request_award_coins_v1(uuid,uuid,uuid[],integer,text,text) to service_role;

-- 4) Service-only RPC: approve/reject a request (idempotent)
create or replace function public.admin_decide_award_request_v1(
  p_request_id uuid,
  p_decider_user_id uuid,
  p_action text
)
returns table (
  request_id uuid,
  status text,
  award_id uuid,
  awarded_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req record;
  v_lock_key bigint;
  v_now timestamptz := now();
  v_recipient_ids uuid[];
  v_award_id uuid;
  v_awarded_count int := 0;
  v_ignore uuid;
  v_ignore2 uuid;
  v_ignore3 int;
  v_ignore4 int;
begin
  if p_request_id is null then
    raise exception 'p_request_id is required';
  end if;
  if p_decider_user_id is null then
    raise exception 'p_decider_user_id is required';
  end if;
  if p_action is null or not (p_action in ('approve','reject')) then
    raise exception 'p_action must be approve or reject';
  end if;

  if auth.role() <> 'service_role' then
    raise exception 'service role only';
  end if;

  v_lock_key := hashtextextended(p_request_id::text, 0);
  perform pg_advisory_xact_lock(v_lock_key);

  select *
    into v_req
    from public.gamification_admin_award_requests r
    where r.id = p_request_id
    limit 1;

  if v_req is null then
    raise exception 'request not found';
  end if;

  if v_req.status <> 'pending' then
    request_id := v_req.id;
    status := v_req.status;
    award_id := v_req.award_id;
    awarded_count := 0;
    return next;
    return;
  end if;

  if p_action = 'reject' then
    update public.gamification_admin_award_requests
      set status = 'rejected',
          decided_by_user_id = p_decider_user_id,
          decided_at = v_now
      where id = p_request_id;

    insert into public.tenant_audit_logs(tenant_id, actor_user_id, event_type, payload, created_at)
    values (
      v_req.tenant_id,
      p_decider_user_id,
      'gamification.admin_award_request.rejected',
      jsonb_build_object('request_id', p_request_id),
      v_now
    );

    request_id := p_request_id;
    status := 'rejected';
    award_id := null;
    awarded_count := 0;
    return next;
    return;
  end if;

  select coalesce(array_agg(distinct rr.user_id), '{}'::uuid[])
    into v_recipient_ids
    from public.gamification_admin_award_request_recipients rr
    where rr.request_id = p_request_id;

  if v_recipient_ids is null or array_length(v_recipient_ids, 1) is null or array_length(v_recipient_ids, 1) = 0 then
    raise exception 'request has no recipients';
  end if;

  -- Approve: apply the award exactly once via a deterministic idempotency key per request
  -- We only need award_id; the function returns one row per recipient.
  select a.award_id
    into v_award_id
    from public.admin_award_coins_v1(
      v_req.tenant_id,
      v_req.requester_user_id,
      v_recipient_ids,
      v_req.amount,
      v_req.message,
      'award-request:' || p_request_id::text
    ) as a
    limit 1;

  select count(*)::int
    into v_awarded_count
    from public.gamification_admin_award_recipients gar
    where gar.award_id = v_award_id;

  update public.gamification_admin_award_requests
    set status = 'approved',
        award_id = v_award_id,
        decided_by_user_id = p_decider_user_id,
        decided_at = v_now
    where id = p_request_id;

  insert into public.tenant_audit_logs(tenant_id, actor_user_id, event_type, payload, created_at)
  values (
    v_req.tenant_id,
    p_decider_user_id,
    'gamification.admin_award_request.approved',
    jsonb_build_object('request_id', p_request_id, 'award_id', v_award_id),
    v_now
  );

  request_id := p_request_id;
  status := 'approved';
  award_id := v_award_id;
  awarded_count := v_awarded_count;
  return next;
end;
$$;

revoke all on function public.admin_decide_award_request_v1(uuid,uuid,text) from public;
revoke all on function public.admin_decide_award_request_v1(uuid,uuid,text) from anon;
revoke all on function public.admin_decide_award_request_v1(uuid,uuid,text) from authenticated;

grant execute on function public.admin_decide_award_request_v1(uuid,uuid,text) to service_role;

commit;
