-- Admin Gamification Analytics v4
-- Adds anomaly detection signals (simple heuristics) without breaking v3.

begin;

create or replace function public.admin_get_gamification_analytics_v4(
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
  shop jsonb,
  campaigns jsonb,
  automations jsonb,
  anomalies jsonb
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

  v_campaign_bonus_total bigint;
  v_top_campaigns jsonb;

  v_automation_reward_total bigint;
  v_top_rules jsonb;

  -- Anomaly detection (simple heuristics)
  v_last24_earned bigint;
  v_prev6_earned bigint;
  v_prev6_earned_avg numeric;

  v_last24_awards bigint;
  v_prev6_awards bigint;
  v_prev6_awards_avg numeric;

  v_last24_automation bigint;
  v_prev6_automation bigint;
  v_prev6_automation_avg numeric;

  v_last24_campaign_bonus bigint;
  v_prev6_campaign_bonus bigint;
  v_prev6_campaign_bonus_avg numeric;

  v_top_rule_total bigint;

  v_anomaly_items jsonb := '[]'::jsonb;
begin
  if p_tenant_id is null then
    raise exception 'p_tenant_id is required';
  end if;

  if p_window_days is null or p_window_days < 1 or p_window_days > 365 then
    raise exception 'p_window_days must be between 1 and 365';
  end if;

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

  -- Campaign bonus reporting (from coin ledger metadata)
  select coalesce(sum(ct.amount), 0)
    into v_campaign_bonus_total
    from public.coin_transactions ct
    where ct.tenant_id = p_tenant_id
      and ct.created_at >= v_since
      and ct.type = 'earn'
      and ct.reason_code = 'campaign_bonus';

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'campaignId', x.campaign_id,
        'name', x.name,
        'count', x.cnt,
        'totalAmount', x.total_amount
      )
      order by x.total_amount desc
    ),
    '[]'::jsonb
  )
  into v_top_campaigns
  from (
    select
      (ct.metadata->>'campaignId')::uuid as campaign_id,
      coalesce(gc.name, ct.metadata->>'campaignId') as name,
      count(*)::int as cnt,
      coalesce(sum(ct.amount), 0)::int as total_amount
    from public.coin_transactions ct
    left join public.gamification_campaigns gc
      on gc.id = (ct.metadata->>'campaignId')::uuid
     and gc.tenant_id = ct.tenant_id
    where ct.tenant_id = p_tenant_id
      and ct.created_at >= v_since
      and ct.type = 'earn'
      and ct.reason_code = 'campaign_bonus'
      and (ct.metadata ? 'campaignId')
    group by campaign_id, gc.name
    order by total_amount desc
    limit 10
  ) x;

  -- Automation rule rewards reporting (from coin ledger metadata)
  select coalesce(sum(ct.amount), 0)
    into v_automation_reward_total
    from public.coin_transactions ct
    where ct.tenant_id = p_tenant_id
      and ct.created_at >= v_since
      and ct.type = 'earn'
      and ct.reason_code = 'automation_rule';

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'ruleId', x.rule_id,
        'name', x.name,
        'count', x.cnt,
        'totalAmount', x.total_amount
      )
      order by x.total_amount desc
    ),
    '[]'::jsonb
  )
  into v_top_rules
  from (
    select
      (ct.metadata->>'ruleId')::uuid as rule_id,
      coalesce(ar.name, ct.metadata->>'ruleId') as name,
      count(*)::int as cnt,
      coalesce(sum(ct.amount), 0)::int as total_amount
    from public.coin_transactions ct
    left join public.gamification_automation_rules ar
      on ar.id = (ct.metadata->>'ruleId')::uuid
     and ar.tenant_id = ct.tenant_id
    where ct.tenant_id = p_tenant_id
      and ct.created_at >= v_since
      and ct.type = 'earn'
      and ct.reason_code = 'automation_rule'
      and (ct.metadata ? 'ruleId')
    group by rule_id, ar.name
    order by total_amount desc
    limit 10
  ) x;

  -- === Anomaly detection signals ===
  select coalesce(sum(ct.amount), 0)
    into v_last24_earned
    from public.coin_transactions ct
    where ct.tenant_id = p_tenant_id
      and ct.type = 'earn'
      and ct.created_at >= now() - interval '24 hours';

  select coalesce(sum(ct.amount), 0)
    into v_prev6_earned
    from public.coin_transactions ct
    where ct.tenant_id = p_tenant_id
      and ct.type = 'earn'
      and ct.created_at >= now() - interval '168 hours'
      and ct.created_at < now() - interval '24 hours';

  v_prev6_earned_avg := v_prev6_earned::numeric / 6;

  if v_prev6_earned_avg > 0 and v_last24_earned > (v_prev6_earned_avg * 3) and v_last24_earned > 1000 then
    v_anomaly_items := v_anomaly_items || jsonb_build_array(
      jsonb_build_object(
        'code', 'mint_spike_24h',
        'severity', 'warn',
        'title', 'Mint spike senaste 24h',
        'details', format('Minted %s coins senaste 24h (snitt föregående 6d: %s).', v_last24_earned, round(v_prev6_earned_avg)),
        'last24h', v_last24_earned,
        'prev6dAvg', round(v_prev6_earned_avg)
      )
    );
  end if;

  select coalesce(sum(gaa.amount), 0)
    into v_last24_awards
    from public.gamification_admin_awards gaa
    where gaa.tenant_id = p_tenant_id
      and gaa.created_at >= now() - interval '24 hours';

  select coalesce(sum(gaa.amount), 0)
    into v_prev6_awards
    from public.gamification_admin_awards gaa
    where gaa.tenant_id = p_tenant_id
      and gaa.created_at >= now() - interval '168 hours'
      and gaa.created_at < now() - interval '24 hours';

  v_prev6_awards_avg := v_prev6_awards::numeric / 6;

  if v_prev6_awards_avg > 0 and v_last24_awards > (v_prev6_awards_avg * 3) and v_last24_awards > 500 then
    v_anomaly_items := v_anomaly_items || jsonb_build_array(
      jsonb_build_object(
        'code', 'admin_awards_spike_24h',
        'severity', 'warn',
        'title', 'Admin awards spike senaste 24h',
        'details', format('Utdelat %s coins via admin awards senaste 24h (snitt föregående 6d: %s).', v_last24_awards, round(v_prev6_awards_avg)),
        'last24h', v_last24_awards,
        'prev6dAvg', round(v_prev6_awards_avg)
      )
    );
  end if;

  select coalesce(sum(ct.amount), 0)
    into v_last24_automation
    from public.coin_transactions ct
    where ct.tenant_id = p_tenant_id
      and ct.type = 'earn'
      and ct.reason_code = 'automation_rule'
      and ct.created_at >= now() - interval '24 hours';

  select coalesce(sum(ct.amount), 0)
    into v_prev6_automation
    from public.coin_transactions ct
    where ct.tenant_id = p_tenant_id
      and ct.type = 'earn'
      and ct.reason_code = 'automation_rule'
      and ct.created_at >= now() - interval '168 hours'
      and ct.created_at < now() - interval '24 hours';

  v_prev6_automation_avg := v_prev6_automation::numeric / 6;

  if v_prev6_automation_avg > 0 and v_last24_automation > (v_prev6_automation_avg * 3) and v_last24_automation > 500 then
    v_anomaly_items := v_anomaly_items || jsonb_build_array(
      jsonb_build_object(
        'code', 'automation_spike_24h',
        'severity', 'warn',
        'title', 'Automation rewards spike senaste 24h',
        'details', format('Minted %s coins via automation rules senaste 24h (snitt föregående 6d: %s).', v_last24_automation, round(v_prev6_automation_avg)),
        'last24h', v_last24_automation,
        'prev6dAvg', round(v_prev6_automation_avg)
      )
    );
  end if;

  select coalesce(sum(ct.amount), 0)
    into v_last24_campaign_bonus
    from public.coin_transactions ct
    where ct.tenant_id = p_tenant_id
      and ct.type = 'earn'
      and ct.reason_code = 'campaign_bonus'
      and ct.created_at >= now() - interval '24 hours';

  select coalesce(sum(ct.amount), 0)
    into v_prev6_campaign_bonus
    from public.coin_transactions ct
    where ct.tenant_id = p_tenant_id
      and ct.type = 'earn'
      and ct.reason_code = 'campaign_bonus'
      and ct.created_at >= now() - interval '168 hours'
      and ct.created_at < now() - interval '24 hours';

  v_prev6_campaign_bonus_avg := v_prev6_campaign_bonus::numeric / 6;

  if v_prev6_campaign_bonus_avg > 0 and v_last24_campaign_bonus > (v_prev6_campaign_bonus_avg * 3) and v_last24_campaign_bonus > 500 then
    v_anomaly_items := v_anomaly_items || jsonb_build_array(
      jsonb_build_object(
        'code', 'campaign_bonus_spike_24h',
        'severity', 'warn',
        'title', 'Campaign bonus spike senaste 24h',
        'details', format('Minted %s coins via kampanjer senaste 24h (snitt föregående 6d: %s).', v_last24_campaign_bonus, round(v_prev6_campaign_bonus_avg)),
        'last24h', v_last24_campaign_bonus,
        'prev6dAvg', round(v_prev6_campaign_bonus_avg)
      )
    );
  end if;

  -- Concentration heuristic: one rule dominates automation rewards
  v_top_rule_total := 0;
  if jsonb_typeof(v_top_rules) = 'array' and jsonb_array_length(v_top_rules) > 0 then
    begin
      v_top_rule_total := coalesce((v_top_rules->0->>'totalAmount')::bigint, 0);
    exception when others then
      v_top_rule_total := 0;
    end;
  end if;

  if v_automation_reward_total > 500 and v_top_rule_total::numeric >= (v_automation_reward_total::numeric * 0.8) then
    v_anomaly_items := v_anomaly_items || jsonb_build_array(
      jsonb_build_object(
        'code', 'automation_concentration',
        'severity', 'info',
        'title', 'Automation rewards koncentrerade',
        'details', format('Top rule står för %s/%s coins (%s%%) i perioden.', v_top_rule_total, v_automation_reward_total, round((v_top_rule_total::numeric / nullif(v_automation_reward_total::numeric, 0)) * 100)),
        'topRuleTotal', v_top_rule_total,
        'automationTotal', v_automation_reward_total
      )
    );
  end if;

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

  campaigns := jsonb_build_object(
    'bonusTotalAmount', v_campaign_bonus_total,
    'topCampaigns', v_top_campaigns
  );

  automations := jsonb_build_object(
    'rewardTotalAmount', v_automation_reward_total,
    'topRules', v_top_rules
  );

  anomalies := jsonb_build_object(
    'items', v_anomaly_items
  );

  return next;
end;
$$;

revoke all on function public.admin_get_gamification_analytics_v4(uuid, integer) from public;
grant execute on function public.admin_get_gamification_analytics_v4(uuid, integer) to service_role;

commit;
