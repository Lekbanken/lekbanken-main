-- Learning Domain: Requirements Evaluation v1
-- Server-side gating check for activities/games/roles

-- 1) Enhanced get_unsatisfied_requirements function
-- Returns detailed information about what courses need to be completed
create or replace function public.learning_get_unsatisfied_requirements_v2(
  p_user_id uuid,
  p_tenant_id uuid,
  p_target_kind text,
  p_target_id text
)
returns table (
  requirement_id uuid,
  requirement_type text,
  required_course_id uuid,
  course_title text,
  course_slug text,
  is_completed boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select 
    lr.id as requirement_id,
    lr.requirement_type::text,
    lr.required_course_id,
    lc.title as course_title,
    lc.slug as course_slug,
    coalesce(lup.status = 'completed', false) as is_completed
  from public.learning_requirements lr
  join public.learning_courses lc on lc.id = lr.required_course_id
  left join public.learning_user_progress lup 
    on lup.user_id = p_user_id 
    and lup.tenant_id = p_tenant_id 
    and lup.course_id = lr.required_course_id
  where (lr.tenant_id = p_tenant_id or lr.tenant_id is null)
    and lr.target_ref->>'kind' = p_target_kind
    and lr.target_ref->>'id' = p_target_id
    and lr.is_active = true
    and coalesce(lup.status, 'not_started') != 'completed';
end;
$$;

-- 2) Check if all requirements are satisfied (boolean helper)
create or replace function public.learning_all_requirements_satisfied(
  p_user_id uuid,
  p_tenant_id uuid,
  p_target_kind text,
  p_target_id text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_unsatisfied_count integer;
begin
  select count(*)
  into v_unsatisfied_count
  from public.learning_get_unsatisfied_requirements_v2(
    p_user_id, p_tenant_id, p_target_kind, p_target_id
  );
  
  return v_unsatisfied_count = 0;
end;
$$;

-- 3) Get requirement summary for UI
create or replace function public.learning_get_requirement_summary(
  p_user_id uuid,
  p_tenant_id uuid,
  p_target_kind text,
  p_target_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
  v_total integer;
  v_completed integer;
  v_unsatisfied jsonb;
begin
  -- Get all requirements for this target
  select count(*), count(*) filter (where r.is_completed)
  into v_total, v_completed
  from (
    select 
      lr.id,
      coalesce(lup.status = 'completed', false) as is_completed
    from public.learning_requirements lr
    left join public.learning_user_progress lup 
      on lup.user_id = p_user_id 
      and lup.tenant_id = p_tenant_id 
      and lup.course_id = lr.required_course_id
    where (lr.tenant_id = p_tenant_id or lr.tenant_id is null)
      and lr.target_ref->>'kind' = p_target_kind
      and lr.target_ref->>'id' = p_target_id
      and lr.is_active = true
  ) r;

  -- Get unsatisfied requirements
  select jsonb_agg(jsonb_build_object(
    'courseId', required_course_id,
    'courseTitle', course_title,
    'courseSlug', course_slug
  ))
  into v_unsatisfied
  from public.learning_get_unsatisfied_requirements_v2(
    p_user_id, p_tenant_id, p_target_kind, p_target_id
  );

  v_result := jsonb_build_object(
    'satisfied', v_total = v_completed,
    'total', v_total,
    'completed', v_completed,
    'remaining', v_total - v_completed,
    'unsatisfiedCourses', coalesce(v_unsatisfied, '[]'::jsonb)
  );

  return v_result;
end;
$$;

-- 4) Add is_active column to requirements if not exists
alter table public.learning_requirements
  add column if not exists is_active boolean default true;

-- 5) Create index for faster requirement lookups
create index if not exists idx_learning_requirements_target
  on public.learning_requirements using gin (target_ref);

create index if not exists idx_learning_requirements_active
  on public.learning_requirements(is_active)
  where is_active = true;

comment on function public.learning_get_unsatisfied_requirements_v2 is 
  'Returns detailed info about unsatisfied learning requirements for a target (game, activity, role).';

comment on function public.learning_all_requirements_satisfied is 
  'Boolean check if all learning requirements are satisfied for a target.';

comment on function public.learning_get_requirement_summary is 
  'Returns JSON summary of requirement status for UI display.';
