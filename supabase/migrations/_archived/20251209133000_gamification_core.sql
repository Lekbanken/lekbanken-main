-- Gamification Core: coins, streaks, progress, transactions
-- Adds minimal tables to support gamification snapshot API

-- User Coins (simple balance store)
create table if not exists public.user_coins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users on delete cascade,
  tenant_id uuid references public.tenants on delete cascade,
  balance integer not null default 0,
  total_earned integer not null default 0,
  total_spent integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, tenant_id)
);

-- Coin Transactions (earn/spend log)
create table if not exists public.coin_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users on delete cascade,
  tenant_id uuid references public.tenants on delete cascade,
  type text not null check (type in ('earn','spend')),
  amount integer not null,
  description text,
  created_at timestamptz not null default now()
);

-- User Streaks
create table if not exists public.user_streaks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users on delete cascade,
  tenant_id uuid references public.tenants on delete cascade,
  current_streak_days integer not null default 0,
  best_streak_days integer not null default 0,
  last_active_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, tenant_id)
);

-- User Progress (levels/xp)
create table if not exists public.user_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users on delete cascade,
  tenant_id uuid references public.tenants on delete cascade,
  level integer not null default 1,
  current_xp integer not null default 0,
  next_level_xp integer not null default 1000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, tenant_id)
);

-- Indexes
create index if not exists idx_user_coins_user on public.user_coins(user_id);
create index if not exists idx_user_coins_tenant on public.user_coins(tenant_id);
create index if not exists idx_coin_transactions_user on public.coin_transactions(user_id);
create index if not exists idx_coin_transactions_tenant on public.coin_transactions(tenant_id);
create index if not exists idx_coin_transactions_created on public.coin_transactions(created_at desc);
create index if not exists idx_user_streaks_user on public.user_streaks(user_id);
create index if not exists idx_user_streaks_tenant on public.user_streaks(tenant_id);
create index if not exists idx_user_progress_user on public.user_progress(user_id);
create index if not exists idx_user_progress_tenant on public.user_progress(tenant_id);

-- RLS
alter table public.user_coins enable row level security;
alter table public.coin_transactions enable row level security;
alter table public.user_streaks enable row level security;
alter table public.user_progress enable row level security;

-- Policies: users can read their own rows; service role can manage
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_coins' and policyname='users_can_select_own_user_coins') then
    create policy "users_can_select_own_user_coins"
      on public.user_coins for select
      using (auth.uid() = user_id or tenant_id = any(get_user_tenant_ids()));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_coins' and policyname='service_can_modify_user_coins') then
    create policy "service_can_modify_user_coins"
      on public.user_coins for all
      using (auth.role() = 'service_role')
      with check (auth.role() = 'service_role');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='coin_transactions' and policyname='users_can_select_own_coin_transactions') then
    create policy "users_can_select_own_coin_transactions"
      on public.coin_transactions for select
      using (auth.uid() = user_id or tenant_id = any(get_user_tenant_ids()));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='coin_transactions' and policyname='service_can_insert_coin_transactions') then
    create policy "service_can_insert_coin_transactions"
      on public.coin_transactions for insert
      with check (auth.role() = 'service_role');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_streaks' and policyname='users_can_select_own_user_streaks') then
    create policy "users_can_select_own_user_streaks"
      on public.user_streaks for select
      using (auth.uid() = user_id or tenant_id = any(get_user_tenant_ids()));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_streaks' and policyname='service_can_modify_user_streaks') then
    create policy "service_can_modify_user_streaks"
      on public.user_streaks for all
      using (auth.role() = 'service_role')
      with check (auth.role() = 'service_role');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_progress' and policyname='users_can_select_own_user_progress') then
    create policy "users_can_select_own_user_progress"
      on public.user_progress for select
      using (auth.uid() = user_id or tenant_id = any(get_user_tenant_ids()));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_progress' and policyname='service_can_modify_user_progress') then
    create policy "service_can_modify_user_progress"
      on public.user_progress for all
      using (auth.role() = 'service_role')
      with check (auth.role() = 'service_role');
  end if;
end $$;

comment on table public.user_coins is 'Gamification coin balances per user and tenant';
comment on table public.coin_transactions is 'Earn/spend ledger for gamification coins';
comment on table public.user_streaks is 'User streak tracking for gamification';
comment on table public.user_progress is 'User level/xp tracking for gamification';
