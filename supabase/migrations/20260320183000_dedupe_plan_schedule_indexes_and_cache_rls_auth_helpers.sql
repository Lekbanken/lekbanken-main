drop index if exists public.idx_plan_schedules_date;
drop index if exists public.idx_plan_schedules_plan;

alter policy "Hosts can create sessions" on public.participant_sessions
  with check ((select auth.uid()) = host_user_id);

alter policy "Hosts can view their own sessions" on public.participant_sessions
  using ((select auth.uid()) = host_user_id);

alter policy "Hosts can update their own sessions" on public.participant_sessions
  using ((select auth.uid()) = host_user_id);

alter policy "Hosts can delete their own sessions" on public.participant_sessions
  using ((select auth.uid()) = host_user_id);

alter policy "Hosts can view participants in their sessions" on public.participants
  using (
    exists (
      select 1
      from public.participant_sessions
      where participant_sessions.id = participants.session_id
        and participant_sessions.host_user_id = (select auth.uid())
    )
  );

alter policy "Hosts can update participants in their sessions" on public.participants
  using (
    exists (
      select 1
      from public.participant_sessions
      where participant_sessions.id = participants.session_id
        and participant_sessions.host_user_id = (select auth.uid())
    )
  );

alter policy session_trigger_state_service on public.session_trigger_state
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');