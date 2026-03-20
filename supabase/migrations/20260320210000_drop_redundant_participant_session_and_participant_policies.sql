drop policy if exists "Hosts can create sessions" on public.participant_sessions;
drop policy if exists "Hosts can view their own sessions" on public.participant_sessions;
drop policy if exists "Hosts can update their own sessions" on public.participant_sessions;
drop policy if exists "Hosts can delete their own sessions" on public.participant_sessions;

drop policy if exists participant_sessions_insert on public.participant_sessions;
drop policy if exists participant_sessions_select on public.participant_sessions;
drop policy if exists participant_sessions_update on public.participant_sessions;
drop policy if exists participant_sessions_delete on public.participant_sessions;

drop policy if exists "Hosts can view participants in their sessions" on public.participants;
drop policy if exists "Hosts can update participants in their sessions" on public.participants;