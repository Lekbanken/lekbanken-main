-- Add unique constraint on user_achievements for ON CONFLICT clause
-- This is required by learning_grant_course_rewards_v1 which uses:
-- ON CONFLICT (user_id, tenant_id, achievement_id) DO NOTHING

-- First add the source column if it doesn't exist (from 20260104100000_learning_rewards_v1.sql)
alter table public.user_achievements
  add column if not exists source text;

-- Create unique index for the ON CONFLICT clause
create unique index if not exists user_achievements_user_tenant_achievement_unique
  on public.user_achievements (user_id, tenant_id, achievement_id);

comment on index public.user_achievements_user_tenant_achievement_unique is 
  'Ensures a user can only unlock an achievement once per tenant. Used by ON CONFLICT in learning_grant_course_rewards_v1.';
