-- v3.0b: Dedicated global preferences table for Journey personalization.
-- Replaces the faction_id column on tenant-scoped user_progress.
-- 1 row per user (PK on user_id), no tenant dependency.

create table if not exists public.user_journey_preferences (
  user_id     uuid primary key references auth.users on delete cascade,
  faction_id  text null,
  updated_at  timestamptz not null default now()
);

comment on table public.user_journey_preferences is
  'Global per-user Journey preferences (faction, future cosmetics). Not tenant-scoped.';

-- Migrate any existing faction choices from user_progress
insert into public.user_journey_preferences (user_id, faction_id, updated_at)
select distinct on (user_id)
  user_id,
  faction_id,
  coalesce(updated_at, now())
from public.user_progress
where faction_id is not null
order by user_id, updated_at desc
on conflict (user_id) do nothing;

-- RLS: users can read/write only their own row
alter table public.user_journey_preferences enable row level security;

create policy "Users can read own journey preferences"
  on public.user_journey_preferences for select
  using (auth.uid() = user_id);

create policy "Users can upsert own journey preferences"
  on public.user_journey_preferences for insert
  with check (auth.uid() = user_id);

create policy "Users can update own journey preferences"
  on public.user_journey_preferences for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Drop the column from user_progress (cleanup)
alter table public.user_progress
  drop column if exists faction_id;
