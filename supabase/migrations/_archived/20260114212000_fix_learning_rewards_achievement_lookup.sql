-- Fix: learning_grant_course_rewards_v1 should search by achievement ID if UUID, else by key
-- The course rewards_json.achievement_id stores the UUID directly, not the achievement_key

create or replace function public.learning_grant_course_rewards_v1(
  p_user_id uuid,
  p_tenant_id uuid,
  p_course_id uuid,
  p_attempt_id uuid
)
returns table (
  dicecoin_granted integer,
  xp_granted integer,
  achievement_unlocked text,
  level_up boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rewards jsonb;
  v_dicecoin integer;
  v_xp integer;
  v_achievement_id text;
  v_achievement_uuid uuid;
  v_idempotency_key text;
  v_coin_result record;
  v_xp_result record;
  v_level_up boolean := false;
  v_achievement_unlocked text := null;
  v_already_granted boolean;
begin
  -- Check if rewards already granted for this course
  select lup.rewards_granted_at is not null
  into v_already_granted
  from public.learning_user_progress lup
  where lup.user_id = p_user_id
    and lup.tenant_id = p_tenant_id
    and lup.course_id = p_course_id;

  if v_already_granted then
    dicecoin_granted := 0;
    xp_granted := 0;
    achievement_unlocked := null;
    level_up := false;
    return next;
    return;
  end if;

  -- Get course rewards
  select lc.rewards_json
  into v_rewards
  from public.learning_courses lc
  where lc.id = p_course_id;

  if v_rewards is null then
    dicecoin_granted := 0;
    xp_granted := 0;
    achievement_unlocked := null;
    level_up := false;
    return next;
    return;
  end if;

  v_dicecoin := (v_rewards->>'dicecoin_amount')::integer;
  v_xp := (v_rewards->>'xp_amount')::integer;
  v_achievement_id := v_rewards->>'achievement_id';
  v_idempotency_key := 'learning:course:' || p_course_id::text || ':' || p_user_id::text;

  -- Grant DiceCoin
  if v_dicecoin is not null and v_dicecoin > 0 then
    select * into v_coin_result
    from public.apply_coin_transaction_v1(
      p_user_id,
      p_tenant_id,
      'earn',
      v_dicecoin,
      'learning_course_complete',
      v_idempotency_key,
      'Kursbelöning: ' || (select title from public.learning_courses where id = p_course_id),
      'learning',
      jsonb_build_object('course_id', p_course_id, 'attempt_id', p_attempt_id)
    );
  end if;

  -- Grant XP
  if v_xp is not null and v_xp > 0 then
    select * into v_xp_result
    from public.apply_xp_transaction_v1(
      p_user_id,
      p_tenant_id,
      v_xp,
      'learning_course_complete',
      v_idempotency_key,
      'learning',
      jsonb_build_object('course_id', p_course_id, 'attempt_id', p_attempt_id)
    );
    v_level_up := v_xp_result.level_up;
  end if;

  -- Unlock achievement if specified
  if v_achievement_id is not null and length(v_achievement_id) > 0 then
    -- Try to parse as UUID first (achievement_id might be a UUID directly)
    begin
      v_achievement_uuid := v_achievement_id::uuid;
      
      -- It's a valid UUID, search by ID
      insert into public.user_achievements (user_id, tenant_id, achievement_id, unlocked_at, source)
      select p_user_id, p_tenant_id, a.id, now(), 'learning_course'
      from public.achievements a
      where a.id = v_achievement_uuid
        and (a.tenant_id = p_tenant_id or a.tenant_id is null)
      on conflict (user_id, tenant_id, achievement_id) do nothing
      returning achievement_id::text into v_achievement_unlocked;
    exception when invalid_text_representation then
      -- Not a valid UUID, search by achievement_key
      insert into public.user_achievements (user_id, tenant_id, achievement_id, unlocked_at, source)
      select p_user_id, p_tenant_id, a.id, now(), 'learning_course'
      from public.achievements a
      where a.achievement_key = v_achievement_id
        and (a.tenant_id = p_tenant_id or a.tenant_id is null)
      on conflict (user_id, tenant_id, achievement_id) do nothing
      returning achievement_id::text into v_achievement_unlocked;
    end;
    
    if v_achievement_unlocked is not null then
      v_achievement_unlocked := v_achievement_id;
    end if;
  end if;

  -- Mark rewards as granted
  update public.learning_user_progress
  set rewards_granted_at = now(),
      updated_at = now()
  where user_id = p_user_id
    and tenant_id = p_tenant_id
    and course_id = p_course_id;

  dicecoin_granted := coalesce(v_dicecoin, 0);
  xp_granted := coalesce(v_xp, 0);
  achievement_unlocked := v_achievement_unlocked;
  level_up := v_level_up;
  return next;
end;
$$;

comment on function public.learning_grant_course_rewards_v1 is 
  'Grant all rewards (DiceCoin, XP, Achievement) for completing a learning course. Idempotent via rewards_granted_at. Achievement can be referenced by UUID or achievement_key.';
