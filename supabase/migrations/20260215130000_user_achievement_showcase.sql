-- User-level achievement showcase for Journey hub.
-- Each user can pin up to 4 achievements to display.
-- Slot 1 = hero (featured large), slots 2-4 = grid below.
-- Global per-user (not tenant-scoped), like user_journey_preferences.

create table if not exists public.user_achievement_showcase (
  user_id        uuid not null references auth.users(id) on delete cascade,
  slot           smallint not null check (slot between 1 and 4),
  achievement_id uuid not null references public.achievements(id) on delete cascade,
  pinned_at      timestamptz not null default now(),
  primary key (user_id, slot),
  unique (user_id, achievement_id)
);

comment on table public.user_achievement_showcase is
  'Per-user Journey showcase: up to 4 pinned achievements (slot 1 = hero). Not tenant-scoped.';

-- RLS: users can only read/write their own rows
alter table public.user_achievement_showcase enable row level security;

create policy "Users can read own showcase"
  on public.user_achievement_showcase for select
  using (auth.uid() = user_id);

create policy "Users can insert own showcase"
  on public.user_achievement_showcase for insert
  with check (auth.uid() = user_id);

create policy "Users can update own showcase"
  on public.user_achievement_showcase for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own showcase"
  on public.user_achievement_showcase for delete
  using (auth.uid() = user_id);

-- Index for fast snapshot lookup
create index if not exists idx_user_achievement_showcase_user
  on public.user_achievement_showcase (user_id);
