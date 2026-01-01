-- Admin Gamification Analytics v1 (server-only)
-- Aggregated metrics for dashboards without sampling.

begin;

create or replace function public.admin_get_gamification_analytics_v1(
  p_tenant_id uuid,
  p_window_days integer default 30
)
returns table (
  tenant_id uuid,
  window_days integer,
  since timestamptz,
  economy jsonb,
  events jsonb,
  awards jsonb,
  shop jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_since timestamptz;
  v_earned bigint;
  v_spent bigint;
  v_tx_count bigint;

  v_events_total bigint;
  v_top_event_types jsonb;

  v_awards_count bigint;
  v_awards_total bigint;

  v_purchases_count bigint;
  v_total_spent numeric;
  v_top_items jsonb;
begin
  if p_tenant_id is null then
    raise exception 'p_tenant_id is required';
  end if;

  if p_window_days is null or p_window_days < 1 or p_window_days > 365 then
    raise exception 'p_window_days must be between 1 and 365';
  end if;

  -- Service-role only
  if auth.role() <> 'service_role' then
    raise exception 'service role only';
  end if;

  v_since := now() - make_interval(days => p_window_days);

  select
    coalesce(sum(ct.amount) filter (where ct.type = 'earn'), 0),
    coalesce(sum(ct.amount) filter (where ct.type = 'spend'), 0),
    count(*)
  into v_earned, v_spent, v_tx_count
  from public.coin_transactions ct
  where ct.tenant_id = p_tenant_id
    and ct.created_at >= v_since;

  select count(*)
    into v_events_total
    from public.gamification_events ge
    where ge.tenant_id = p_tenant_id
      and ge.created_at >= v_since;

  select coalesce(
    jsonb_agg(
      jsonb_build_object('eventType', x.event_type, 'count', x.cnt)
      order by x.cnt desc
    ),
    '[]'::jsonb
  )
  into v_top_event_types
  from (
    select ge.event_type, count(*)::int as cnt
      from public.gamification_events ge
      where ge.tenant_id = p_tenant_id
        and ge.created_at >= v_since
      group by ge.event_type
      order by cnt desc
      limit 10
  ) x;

  select
    count(*),
    coalesce(sum(gaa.amount), 0)
  into v_awards_count, v_awards_total
  from public.gamification_admin_awards gaa
  where gaa.tenant_id = p_tenant_id
    and gaa.created_at >= v_since;

  select
    count(*),
    coalesce(sum(up.price_paid), 0)
  into v_purchases_count, v_total_spent
  from public.user_purchases up
  where up.tenant_id = p_tenant_id
    and up.created_at >= v_since;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'shopItemId', x.shop_item_id,
        'name', x.name,
        'category', x.category,
        'count', x.cnt,
        'revenue', x.revenue
      )
      order by x.cnt desc
    ),
    '[]'::jsonb
  )
  into v_top_items
  from (
    select
      up.shop_item_id,
      coalesce(si.name, up.shop_item_id::text) as name,
      coalesce(si.category, 'unknown') as category,
      count(*)::int as cnt,
      coalesce(sum(up.price_paid), 0) as revenue
    from public.user_purchases up
    left join public.shop_items si
      on si.id = up.shop_item_id
     and si.tenant_id = up.tenant_id
    where up.tenant_id = p_tenant_id
      and up.created_at >= v_since
    group by up.shop_item_id, si.name, si.category
    order by cnt desc
    limit 10
  ) x;

  tenant_id := p_tenant_id;
  window_days := p_window_days;
  since := v_since;

  economy := jsonb_build_object(
    'earned', v_earned,
    'spent', v_spent,
    'net', (v_earned - v_spent),
    'transactionsCount', v_tx_count
  );

  events := jsonb_build_object(
    'total', v_events_total,
    'topTypes', v_top_event_types
  );

  awards := jsonb_build_object(
    'awardsCount', v_awards_count,
    'totalAmount', v_awards_total
  );

  shop := jsonb_build_object(
    'purchasesCount', v_purchases_count,
    'totalSpent', v_total_spent,
    'topItems', v_top_items
  );

  return next;
end;
$$;

revoke all on function public.admin_get_gamification_analytics_v1(uuid, integer) from public;
grant execute on function public.admin_get_gamification_analytics_v1(uuid, integer) to service_role;

commit;
