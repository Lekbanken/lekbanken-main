-- Learning Domain: Rewards Integration v1
-- Adds XP granting function and course completion reward function

-- 1) XP granting function (mirrors apply_coin_transaction_v1 pattern)
create or replace function public.apply_xp_transaction_v1(
  p_user_id uuid,
  p_tenant_id uuid,
  p_amount integer,
  p_reason_code text,
  p_idempotency_key text,
  p_source text default null,
  p_metadata jsonb default null
)
returns table (new_xp integer, new_level integer, level_up boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing boolean;
  v_current_xp integer;
  v_current_level integer;
  v_next_level_xp integer;
  v_new_xp integer;
  v_new_level integer;
  v_level_up boolean := false;
  v_now timestamptz := now();
begin
  if p_user_id is null then
    raise exception 'p_user_id is required';
  end if;
  if p_tenant_id is null then
    raise exception 'p_tenant_id is required';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'p_amount must be > 0';
  end if;
  if p_idempotency_key is null or length(trim(p_idempotency_key)) = 0 then
    raise exception 'p_idempotency_key is required';
  end if;

  -- Check idempotency via metadata in user_progress
  -- We store granted XP keys in a jsonb array
  select exists(
    select 1 from public.user_progress up
    where up.user_id = p_user_id
      and up.tenant_id = p_tenant_id
      and up.xp_grants ? p_idempotency_key
  ) into v_existing;

  if v_existing then
    -- Already granted, return current state
    select up.current_xp, up.level
    into v_current_xp, v_current_level
    from public.user_progress up
    where up.user_id = p_user_id
      and up.tenant_id = p_tenant_id;
    
    new_xp := coalesce(v_current_xp, 0);
    new_level := coalesce(v_current_level, 1);
    level_up := false;
    return next;
    return;
  end if;

  -- Ensure user_progress row exists
  insert into public.user_progress(user_id, tenant_id, level, current_xp, next_level_xp, xp_grants, created_at, updated_at)
  values (p_user_id, p_tenant_id, 1, 0, 1000, '[]'::jsonb, v_now, v_now)
  on conflict (user_id, tenant_id) do nothing;

  -- Get current state
  select up.current_xp, up.level, up.next_level_xp
  into v_current_xp, v_current_level, v_next_level_xp
  from public.user_progress up
  where up.user_id = p_user_id
    and up.tenant_id = p_tenant_id;

  v_new_xp := v_current_xp + p_amount;
  v_new_level := v_current_level;

  -- Check for level up (simple threshold check)
  while v_new_xp >= v_next_level_xp loop
    v_new_xp := v_new_xp - v_next_level_xp;
    v_new_level := v_new_level + 1;
    v_level_up := true;
    -- Get next level threshold from definitions or use default scaling
    select gld.next_level_xp into v_next_level_xp
    from public.gamification_level_definitions gld
    where (gld.tenant_id = p_tenant_id or gld.tenant_id is null)
      and gld.level = v_new_level
    order by gld.tenant_id nulls last
    limit 1;
    
    if v_next_level_xp is null then
      -- Default: each level requires 1000 * level XP
      v_next_level_xp := 1000 * v_new_level;
    end if;
  end loop;

  -- Update user_progress with new XP, level, and mark idempotency key
  update public.user_progress
  set current_xp = v_new_xp,
      level = v_new_level,
      next_level_xp = v_next_level_xp,
      xp_grants = coalesce(xp_grants, '[]'::jsonb) || to_jsonb(p_idempotency_key),
      updated_at = v_now
  where user_id = p_user_id
    and tenant_id = p_tenant_id;

  new_xp := v_new_xp;
  new_level := v_new_level;
  level_up := v_level_up;
  return next;
end;
$$;

-- Add xp_grants column if not exists
alter table public.user_progress
  add column if not exists xp_grants jsonb default '[]'::jsonb;

-- 2) Learning course completion reward function
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
    -- Check if achievement exists and isn't already unlocked
    insert into public.user_achievements (user_id, tenant_id, achievement_id, unlocked_at, source)
    select p_user_id, p_tenant_id, a.id, now(), 'learning_course'
    from public.achievements a
    where a.achievement_key = v_achievement_id
      and (a.tenant_id = p_tenant_id or a.tenant_id is null)
    on conflict (user_id, tenant_id, achievement_id) do nothing
    returning achievement_id::text into v_achievement_unlocked;
    
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

-- 3) Add source column to user_achievements if not exists
alter table public.user_achievements
  add column if not exists source text;

comment on function public.apply_xp_transaction_v1 is 
  'Idempotent XP granting with level-up calculation. Uses xp_grants array for deduplication.';

comment on function public.learning_grant_course_rewards_v1 is 
  'Grant all rewards (DiceCoin, XP, Achievement) for completing a learning course. Idempotent via rewards_granted_at.';
