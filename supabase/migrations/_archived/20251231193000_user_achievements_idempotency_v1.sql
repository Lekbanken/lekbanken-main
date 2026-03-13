-- Gamification: user_achievements idempotency v1
-- Prevent duplicate unlock rows under retries/concurrency.

begin;

-- Ensure tenant_id can be NULL (personal/global unlocks), but still idempotent.
-- Use a coalesced unique index so NULL tenant unlocks are deduped as well.

-- Some environments may already have a UNIQUE constraint on (user_id, achievement_id, tenant_id).
-- Drop it if present so we can replace it with a NULL-safe uniqueness rule.
do $$ begin
  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.user_achievements'::regclass
      and contype = 'u'
      and conname = 'user_achievements_user_id_achievement_id_tenant_id_key'
  ) then
    alter table public.user_achievements
      drop constraint user_achievements_user_id_achievement_id_tenant_id_key;
  end if;
end $$;

drop index if exists public.idx_user_achievements_unique_v1;

create unique index if not exists idx_user_achievements_unique_v1
  on public.user_achievements (
    user_id,
    achievement_id,
    coalesce(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

commit;
