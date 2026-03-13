-- Gamification: tighten RLS for personal progression data
-- Goal: prevent normal tenant members from reading other users' gamification rows.
-- Allow: self, system_admin, and explicit tenant admins (owner/admin).

begin;

-- user_coins
alter table public.user_coins enable row level security;

drop policy if exists "users_can_select_own_user_coins" on public.user_coins;
create policy "users_can_select_own_user_coins"
  on public.user_coins for select
  using (
    auth.uid() = user_id
    or public.is_system_admin()
    or (
      tenant_id is not null
      and public.has_tenant_role(tenant_id, array['owner','admin']::public.tenant_role_enum[])
    )
  );

-- coin_transactions
alter table public.coin_transactions enable row level security;

drop policy if exists "users_can_select_own_coin_transactions" on public.coin_transactions;
create policy "users_can_select_own_coin_transactions"
  on public.coin_transactions for select
  using (
    auth.uid() = user_id
    or public.is_system_admin()
    or (
      tenant_id is not null
      and public.has_tenant_role(tenant_id, array['owner','admin']::public.tenant_role_enum[])
    )
  );

-- user_streaks
alter table public.user_streaks enable row level security;

drop policy if exists "users_can_select_own_user_streaks" on public.user_streaks;
create policy "users_can_select_own_user_streaks"
  on public.user_streaks for select
  using (
    auth.uid() = user_id
    or public.is_system_admin()
    or (
      tenant_id is not null
      and public.has_tenant_role(tenant_id, array['owner','admin']::public.tenant_role_enum[])
    )
  );

-- user_progress
alter table public.user_progress enable row level security;

drop policy if exists "users_can_select_own_user_progress" on public.user_progress;
create policy "users_can_select_own_user_progress"
  on public.user_progress for select
  using (
    auth.uid() = user_id
    or public.is_system_admin()
    or (
      tenant_id is not null
      and public.has_tenant_role(tenant_id, array['owner','admin']::public.tenant_role_enum[])
    )
  );

-- user_achievements
alter table public.user_achievements enable row level security;

drop policy if exists "users_can_select_own_achievements" on public.user_achievements;
create policy "users_can_select_own_achievements"
  on public.user_achievements for select
  using (
    auth.uid() = user_id
    or public.is_system_admin()
    or (
      tenant_id is not null
      and public.has_tenant_role(tenant_id, array['owner','admin']::public.tenant_role_enum[])
    )
  );

commit;
