-- Achievements Advanced Domain Tables

-- Community Challenges Table
create table public.community_challenges (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants on delete cascade,
  title varchar not null,
  description text,
  challenge_type varchar not null, -- 'score', 'participation', 'speed', 'cooperation'
  difficulty varchar not null default 'normal', -- 'easy', 'normal', 'hard', 'legendary'
  target_value integer not null,
  reward_points integer not null,
  reward_currency_amount integer,
  status varchar not null default 'active', -- 'active', 'completed', 'archived'
  starts_at timestamp with time zone not null,
  ends_at timestamp with time zone not null,
  participation_count integer not null default 0,
  completion_count integer not null default 0,
  created_by_user_id uuid not null references public.users on delete cascade,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- Challenge Participation Table
create table public.challenge_participation (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants on delete cascade,
  challenge_id uuid not null references public.community_challenges on delete cascade,
  user_id uuid not null references public.users on delete cascade,
  progress_value integer not null default 0,
  completed boolean not null default false,
  completed_at timestamp with time zone,
  reward_claimed boolean not null default false,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique (challenge_id, user_id)
);

-- Limited-Time Events Table
create table public.limited_time_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants on delete cascade,
  title varchar not null,
  description text,
  event_type varchar not null, -- 'seasonal', 'special', 'collaboration', 'anniversary'
  theme varchar,
  reward_type varchar not null, -- 'badge', 'cosmetic', 'points', 'currency'
  reward_amount integer not null,
  starts_at timestamp with time zone not null,
  ends_at timestamp with time zone not null,
  participant_count integer not null default 0,
  completion_count integer not null default 0,
  status varchar not null default 'upcoming', -- 'upcoming', 'active', 'ended'
  created_by_user_id uuid not null references public.users on delete cascade,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- Event Rewards Table
create table public.event_rewards (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants on delete cascade,
  event_id uuid not null references public.limited_time_events on delete cascade,
  user_id uuid not null references public.users on delete cascade,
  reward_id varchar not null,
  reward_name varchar not null,
  claimed boolean not null default false,
  claimed_at timestamp with time zone,
  created_at timestamp with time zone not null default now()
);

-- Seasonal Achievements Table
create table public.seasonal_achievements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants on delete cascade,
  season_name varchar not null,
  season_number integer not null,
  achievement_id uuid not null references public.achievements on delete cascade,
  rarity varchar not null default 'common', -- 'common', 'rare', 'epic', 'legendary'
  exclusive_to_season boolean not null default true,
  reward_bonus_percent integer not null default 0,
  released_at timestamp with time zone not null,
  available_until timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique (tenant_id, season_name, achievement_id)
);

-- Achievement Leaderboard Table
create table public.achievement_leaderboards (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants on delete cascade,
  user_id uuid not null references public.users on delete cascade,
  achievement_count integer not null default 0,
  seasonal_achievement_count integer not null default 0,
  total_achievement_points integer not null default 0,
  rank integer,
  season_number integer,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique (tenant_id, user_id, season_number)
);

-- Indexes
create index idx_community_challenges_tenant_id on public.community_challenges(tenant_id);
create index idx_community_challenges_status on public.community_challenges(status);
create index idx_community_challenges_ends_at on public.community_challenges(ends_at);
create index idx_community_challenges_active on public.community_challenges(status) where status = 'active';

create index idx_challenge_participation_tenant_id on public.challenge_participation(tenant_id);
create index idx_challenge_participation_user_id on public.challenge_participation(user_id);
create index idx_challenge_participation_challenge_id on public.challenge_participation(challenge_id);
create index idx_challenge_participation_completed on public.challenge_participation(completed);

create index idx_limited_time_events_tenant_id on public.limited_time_events(tenant_id);
create index idx_limited_time_events_status on public.limited_time_events(status);
create index idx_limited_time_events_ends_at on public.limited_time_events(ends_at);
create index idx_limited_time_events_active on public.limited_time_events(status) where status = 'active';

create index idx_event_rewards_tenant_id on public.event_rewards(tenant_id);
create index idx_event_rewards_user_id on public.event_rewards(user_id);
create index idx_event_rewards_event_id on public.event_rewards(event_id);
create index idx_event_rewards_claimed on public.event_rewards(claimed);

create index idx_seasonal_achievements_tenant_id on public.seasonal_achievements(tenant_id);
create index idx_seasonal_achievements_season on public.seasonal_achievements(season_number);
create index idx_seasonal_achievements_achievement_id on public.seasonal_achievements(achievement_id);

create index idx_achievement_leaderboards_tenant_id on public.achievement_leaderboards(tenant_id);
create index idx_achievement_leaderboards_season on public.achievement_leaderboards(season_number);
create index idx_achievement_leaderboards_rank on public.achievement_leaderboards(rank);

-- RLS Policies
create policy "Users can view challenges"
  on public.community_challenges for select
  using (
    exists (
      select 1 from public.user_tenant_memberships
      where user_id = auth.uid()
      and tenant_id = community_challenges.tenant_id
    )
  );

create policy "Admins can manage challenges"
  on public.community_challenges for all
  using (
    exists (
      select 1 from public.user_tenant_memberships
      where user_id = auth.uid()
      and tenant_id = community_challenges.tenant_id
      and role = 'admin'
    )
  );

create policy "Users can view own participation"
  on public.challenge_participation for select
  using (user_id = auth.uid());

create policy "Users can create participation"
  on public.challenge_participation for insert
  with check (user_id = auth.uid());

create policy "Users can view events"
  on public.limited_time_events for select
  using (
    exists (
      select 1 from public.user_tenant_memberships
      where user_id = auth.uid()
      and tenant_id = limited_time_events.tenant_id
    )
  );

create policy "Admins can manage events"
  on public.limited_time_events for all
  using (
    exists (
      select 1 from public.user_tenant_memberships
      where user_id = auth.uid()
      and tenant_id = limited_time_events.tenant_id
      and role = 'admin'
    )
  );

create policy "Users can view own rewards"
  on public.event_rewards for select
  using (user_id = auth.uid());

create policy "Users can view seasonal achievements"
  on public.seasonal_achievements for select
  using (
    exists (
      select 1 from public.user_tenant_memberships
      where user_id = auth.uid()
      and tenant_id = seasonal_achievements.tenant_id
    )
  );

create policy "Users can view achievement leaderboards"
  on public.achievement_leaderboards for select
  using (
    exists (
      select 1 from public.user_tenant_memberships
      where user_id = auth.uid()
      and tenant_id = achievement_leaderboards.tenant_id
    )
  );
