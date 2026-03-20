create index if not exists idx_achievement_award_recipients_user_achievement_id
  on public.achievement_award_recipients (user_achievement_id)
  where user_achievement_id is not null;

create index if not exists idx_achievement_leaderboards_user_id
  on public.achievement_leaderboards (user_id);

create index if not exists idx_achievement_translations_created_by
  on public.achievement_translations (created_by)
  where created_by is not null;

create index if not exists idx_achievement_translations_updated_by
  on public.achievement_translations (updated_by)
  where updated_by is not null;

create index if not exists idx_achievements_updated_by
  on public.achievements (updated_by)
  where updated_by is not null;

create index if not exists idx_consent_policy_versions_created_by
  on public.consent_policy_versions (created_by)
  where created_by is not null;

create index if not exists idx_data_breach_notifications_closed_by
  on public.data_breach_notifications (closed_by)
  where closed_by is not null;

create index if not exists idx_data_breach_notifications_created_by
  on public.data_breach_notifications (created_by)
  where created_by is not null;

create index if not exists idx_game_snapshots_created_by
  on public.game_snapshots (created_by)
  where created_by is not null;

create index if not exists idx_leader_profile_tenant_id
  on public.leader_profile (tenant_id)
  where tenant_id is not null;