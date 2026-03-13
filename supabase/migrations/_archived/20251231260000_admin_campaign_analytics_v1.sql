-- Admin Campaign Analytics v1
-- Per-campaign reporting for campaign bonus outcomes.

begin;

create or replace function public.admin_get_campaign_analytics_v1(
  p_tenant_id uuid,
  p_campaign_id uuid,
  p_window_days integer default 30
)
returns table (
  tenant_id uuid,
  campaign_id uuid,
  window_days integer,
  since timestamptz,
  totals jsonb,
  daily jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_since timestamptz;
  v_total_amount bigint;
  v_count bigint;
  v_avg_amount numeric;
  v_daily jsonb;
begin
  if p_tenant_id is null then
    raise exception 'p_tenant_id is required';
  end if;

  if p_campaign_id is null then
    raise exception 'p_campaign_id is required';
  end if;

  if p_window_days is null or p_window_days < 1 or p_window_days > 365 then
    raise exception 'p_window_days must be between 1 and 365';
  end if;

  if auth.role() <> 'service_role' then
    raise exception 'service role only';
  end if;

  v_since := now() - make_interval(days => p_window_days);

  select
    coalesce(sum(ct.amount), 0),
    count(*)
  into v_total_amount, v_count
  from public.coin_transactions ct
  where ct.tenant_id = p_tenant_id
    and ct.created_at >= v_since
    and ct.type = 'earn'
    and ct.reason_code = 'campaign_bonus'
    and (ct.metadata ? 'campaignId')
    and (ct.metadata->>'campaignId')::uuid = p_campaign_id;

  v_avg_amount := case when v_count > 0 then (v_total_amount::numeric / v_count::numeric) else 0 end;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'date', x.day,
        'count', x.cnt,
        'totalAmount', x.total_amount
      )
      order by x.day asc
    ),
    '[]'::jsonb
  )
  into v_daily
  from (
    select
      (date_trunc('day', ct.created_at))::date as day,
      count(*)::int as cnt,
      coalesce(sum(ct.amount), 0)::int as total_amount
    from public.coin_transactions ct
    where ct.tenant_id = p_tenant_id
      and ct.created_at >= v_since
      and ct.type = 'earn'
      and ct.reason_code = 'campaign_bonus'
      and (ct.metadata ? 'campaignId')
      and (ct.metadata->>'campaignId')::uuid = p_campaign_id
    group by day
  ) x;

  tenant_id := p_tenant_id;
  campaign_id := p_campaign_id;
  window_days := p_window_days;
  since := v_since;

  totals := jsonb_build_object(
    'count', v_count,
    'totalAmount', v_total_amount,
    'avgAmount', v_avg_amount
  );

  daily := v_daily;

  return next;
end;
$$;

revoke all on function public.admin_get_campaign_analytics_v1(uuid, uuid, integer) from public;
grant execute on function public.admin_get_campaign_analytics_v1(uuid, uuid, integer) to service_role;

commit;
