alter policy achievement_award_recipients_service_role on public.achievement_award_recipients
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy achievement_awards_service_role on public.achievement_awards
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy service_can_insert_coin_transactions on public.coin_transactions
  with check ((select auth.role()) = 'service_role');

alter policy users_update_own_demo_sessions on public.demo_sessions
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

alter policy gamification_admin_award_recipients_service_all on public.gamification_admin_award_recipients
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy gamification_admin_awards_service_all on public.gamification_admin_awards
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy gamification_burn_log_service on public.gamification_burn_log
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy gamification_burn_sinks_service on public.gamification_burn_sinks
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy gamification_cooldowns_service on public.gamification_cooldowns
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy gamification_daily_earnings_service on public.gamification_daily_earnings
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy gamification_softcap_service on public.gamification_softcap_config
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy leader_profile_service_all on public.leader_profile
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy service_role_insert_leaderboards on public.social_leaderboards
  with check ((select auth.role()) = 'service_role');

alter policy service_role_update_leaderboards on public.social_leaderboards
  using ((select auth.role()) = 'service_role');

do $$
begin
  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'tenant_product_entitlements'
      and policyname = 'tenant_product_entitlements_manage_service'
  ) then
    alter policy tenant_product_entitlements_manage_service on public.tenant_product_entitlements
      using (((select auth.role()) = 'service_role') or is_system_admin())
      with check (((select auth.role()) = 'service_role') or is_system_admin());
  elsif exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'tenant_product_entitlements'
      and policyname = 'tenant_product_entitlements_manage'
  ) then
    alter policy tenant_product_entitlements_manage on public.tenant_product_entitlements
      using (((select auth.role()) = 'service_role') or is_system_admin())
      with check (((select auth.role()) = 'service_role') or is_system_admin());
  end if;
end;
$$;

alter policy service_can_modify_user_coins on public.user_coins
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy user_gamification_prefs_service on public.user_gamification_preferences
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy service_can_modify_user_progress on public.user_progress
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy service_can_modify_user_streaks on public.user_streaks
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');