-- Gamification Campaign Templates: Create campaign from template v1
-- Adds a service-role-only RPC that creates a campaign deterministically from a global template.

begin;

do $$
begin
  if to_regclass('public.gamification_campaigns') is null then
    raise exception 'Missing table public.gamification_campaigns. Apply migration 20251231253000_gamification_campaigns_v1.sql first.';
  end if;

  if to_regclass('public.gamification_campaign_templates') is null then
    raise exception 'Missing table public.gamification_campaign_templates. Apply migration 20260101090000_gamification_campaign_templates_v1.sql first.';
  end if;
end;
$$;

alter table public.gamification_campaigns
  add column if not exists source_template_id uuid null references public.gamification_campaign_templates(id) on delete set null;

alter table public.gamification_campaigns
  add column if not exists idempotency_key text;

create unique index if not exists uq_gamification_campaigns_tenant_idempotency
  on public.gamification_campaigns(tenant_id, idempotency_key)
  where idempotency_key is not null;

create or replace function public.create_gamification_campaign_from_template_v1(
  p_tenant_id uuid,
  p_template_id uuid,
  p_starts_at timestamptz default now(),
  p_actor_user_id uuid default null,
  p_idempotency_key text default null
)
returns table (campaign_id uuid, created boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_template public.gamification_campaign_templates%rowtype;
  v_campaign_id uuid;
  v_idempotency_key text;
  v_lock_key bigint;
  v_ends_at timestamptz;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role only';
  end if;

  if p_tenant_id is null then raise exception 'p_tenant_id is required'; end if;
  if p_template_id is null then raise exception 'p_template_id is required'; end if;
  if p_starts_at is null then raise exception 'p_starts_at is required'; end if;

  v_idempotency_key := nullif(trim(p_idempotency_key), '');
  if v_idempotency_key is null then
    v_idempotency_key := 'campaign_template:' || p_template_id::text || ':' || extract(epoch from p_starts_at)::bigint::text;
  end if;

  v_lock_key := hashtextextended(p_tenant_id::text || ':' || v_idempotency_key, 0);
  perform pg_advisory_xact_lock(v_lock_key);

  select gc.id
    into v_campaign_id
    from public.gamification_campaigns gc
    where gc.tenant_id = p_tenant_id
      and gc.idempotency_key = v_idempotency_key
    limit 1;

  if v_campaign_id is not null then
    campaign_id := v_campaign_id;
    created := false;
    return next;
    return;
  end if;

  select *
    into v_template
    from public.gamification_campaign_templates t
    where t.id = p_template_id
    limit 1;

  if v_template.id is null then
    raise exception 'template not found';
  end if;

  v_ends_at := p_starts_at + make_interval(days => v_template.duration_days);

  insert into public.gamification_campaigns(
    tenant_id,
    name,
    event_type,
    bonus_amount,
    starts_at,
    ends_at,
    is_active,
    budget_amount,
    created_by_user_id,
    source_template_id,
    idempotency_key
  )
  values (
    p_tenant_id,
    v_template.name,
    v_template.event_type,
    v_template.bonus_amount,
    p_starts_at,
    v_ends_at,
    v_template.is_active_default,
    v_template.budget_amount,
    p_actor_user_id,
    v_template.id,
    v_idempotency_key
  )
  returning id into v_campaign_id;

  campaign_id := v_campaign_id;
  created := true;
  return next;
end;
$$;

revoke all on function public.create_gamification_campaign_from_template_v1(uuid,uuid,timestamptz,uuid,text) from public;
revoke all on function public.create_gamification_campaign_from_template_v1(uuid,uuid,timestamptz,uuid,text) from anon;
revoke all on function public.create_gamification_campaign_from_template_v1(uuid,uuid,timestamptz,uuid,text) from authenticated;
grant execute on function public.create_gamification_campaign_from_template_v1(uuid,uuid,timestamptz,uuid,text) to service_role;

commit;
