-- Moderation Domain Tables

-- Content Reports Table
create table public.content_reports (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants on delete cascade,
  reported_by_user_id uuid not null references public.users on delete cascade,
  content_type varchar not null, -- 'game', 'comment', 'user_profile', 'chat_message'
  content_id varchar not null,
  reason varchar not null, -- 'inappropriate', 'spam', 'abuse', 'copyright', 'other'
  description text,
  status varchar not null default 'pending', -- 'pending', 'under_review', 'resolved', 'dismissed'
  priority varchar not null default 'normal', -- 'low', 'normal', 'high', 'critical'
  assigned_to_user_id uuid references public.users on delete set null,
  resolution_reason text,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- Content Filter Rules Table
create table public.content_filter_rules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants on delete cascade,
  pattern varchar not null unique,
  rule_type varchar not null, -- 'keyword', 'regex', 'pattern'
  severity varchar not null, -- 'warning', 'block', 'auto_remove'
  categories text[] not null default array[]::text[], -- 'game', 'comment', 'username', etc
  is_active boolean not null default true,
  created_by_user_id uuid not null references public.users on delete cascade,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- Moderation Actions Table
create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants on delete cascade,
  taken_by_user_id uuid not null references public.users on delete cascade,
  action_type varchar not null, -- 'warn', 'mute', 'suspend', 'ban', 'content_removal'
  target_user_id uuid references public.users on delete cascade,
  target_content_id varchar,
  reason text not null,
  duration_minutes integer, -- null for permanent
  severity varchar not null default 'warning', -- 'warning', 'moderate', 'severe'
  is_appealable boolean not null default true,
  expires_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- User Restrictions Table
create table public.user_restrictions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants on delete cascade,
  user_id uuid not null references public.users on delete cascade,
  restriction_type varchar not null, -- 'chat_mute', 'game_suspend', 'account_ban', 'content_flag'
  reason text not null,
  severity varchar not null default 'warning',
  active boolean not null default true,
  active_until timestamp with time zone,
  appeal_count integer not null default 0,
  can_appeal boolean not null default true,
  created_by_user_id uuid not null references public.users on delete cascade,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique (user_id, restriction_type)
);

-- Moderation Queue Table
create table public.moderation_queue (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants on delete cascade,
  report_id uuid not null references public.content_reports on delete cascade,
  priority varchar not null default 'normal',
  assigned_to_user_id uuid references public.users on delete set null,
  status varchar not null default 'pending', -- 'pending', 'in_progress', 'completed'
  assigned_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- Moderation Analytics Table
create table public.moderation_analytics (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants on delete cascade,
  date date not null,
  total_reports integer not null default 0,
  pending_reports integer not null default 0,
  resolved_reports integer not null default 0,
  actions_taken integer not null default 0,
  users_warned integer not null default 0,
  users_suspended integer not null default 0,
  users_banned integer not null default 0,
  average_resolution_time_hours numeric,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique (tenant_id, date)
);

-- Indexes for performance
create index idx_content_reports_tenant_id on public.content_reports(tenant_id);
create index idx_content_reports_status on public.content_reports(status);
create index idx_content_reports_priority on public.content_reports(priority);
create index idx_content_reports_reported_by on public.content_reports(reported_by_user_id);
create index idx_content_reports_assigned_to on public.content_reports(assigned_to_user_id);
create index idx_content_reports_created_at on public.content_reports(created_at);

create index idx_content_filter_rules_tenant_id on public.content_filter_rules(tenant_id);
create index idx_content_filter_rules_active on public.content_filter_rules(is_active);
create index idx_content_filter_rules_pattern on public.content_filter_rules(pattern);

create index idx_moderation_actions_tenant_id on public.moderation_actions(tenant_id);
create index idx_moderation_actions_target_user on public.moderation_actions(target_user_id);
create index idx_moderation_actions_taken_by on public.moderation_actions(taken_by_user_id);
create index idx_moderation_actions_expires_at on public.moderation_actions(expires_at);

create index idx_user_restrictions_tenant_id on public.user_restrictions(tenant_id);
create index idx_user_restrictions_user_id on public.user_restrictions(user_id);
create index idx_user_restrictions_active on public.user_restrictions(active);
create index idx_user_restrictions_expires on public.user_restrictions(active_until);

create index idx_moderation_queue_tenant_id on public.moderation_queue(tenant_id);
create index idx_moderation_queue_status on public.moderation_queue(status);
create index idx_moderation_queue_assigned_to on public.moderation_queue(assigned_to_user_id);
create index idx_moderation_queue_priority on public.moderation_queue(priority);

create index idx_moderation_analytics_tenant_id on public.moderation_analytics(tenant_id);
create index idx_moderation_analytics_date on public.moderation_analytics(date);

-- RLS Policies

-- Users can view their own reports
create policy "Users can view own reports"
  on public.content_reports for select
  using (reported_by_user_id = auth.uid());

-- Moderators can view all reports for their tenant
create policy "Moderators can view all reports"
  on public.content_reports for select
  using (
    exists (
      select 1 from public.user_tenant_memberships
      where user_id = auth.uid()
      and tenant_id = content_reports.tenant_id
      and role in ('admin', 'moderator')
    )
  );

-- Users can create reports
create policy "Users can create reports"
  on public.content_reports for insert
  with check (
    exists (
      select 1 from public.user_tenant_memberships
      where user_id = auth.uid()
      and tenant_id = content_reports.tenant_id
    )
  );

-- Moderators can update reports
create policy "Moderators can update reports"
  on public.content_reports for update
  using (
    exists (
      select 1 from public.user_tenant_memberships
      where user_id = auth.uid()
      and tenant_id = content_reports.tenant_id
      and role in ('admin', 'moderator')
    )
  );

-- Admins only for filter rules
create policy "Admins can manage filter rules"
  on public.content_filter_rules for all
  using (
    exists (
      select 1 from public.user_tenant_memberships
      where user_id = auth.uid()
      and tenant_id = content_filter_rules.tenant_id
      and role = 'admin'
    )
  );

-- Moderators can manage moderation actions
create policy "Moderators can manage actions"
  on public.moderation_actions for all
  using (
    exists (
      select 1 from public.user_tenant_memberships
      where user_id = auth.uid()
      and tenant_id = moderation_actions.tenant_id
      and role in ('admin', 'moderator')
    )
  );

-- Users can view their own restrictions
create policy "Users can view own restrictions"
  on public.user_restrictions for select
  using (user_id = auth.uid());

-- Moderators can manage restrictions
create policy "Moderators can manage restrictions"
  on public.user_restrictions for all
  using (
    exists (
      select 1 from public.user_tenant_memberships
      where user_id = auth.uid()
      and tenant_id = user_restrictions.tenant_id
      and role in ('admin', 'moderator')
    )
  );

-- Moderators can view and manage queue
create policy "Moderators can manage queue"
  on public.moderation_queue for all
  using (
    exists (
      select 1 from public.user_tenant_memberships
      where user_id = auth.uid()
      and tenant_id = moderation_queue.tenant_id
      and role in ('admin', 'moderator')
    )
  );

-- Moderators can view analytics
create policy "Moderators can view analytics"
  on public.moderation_analytics for select
  using (
    exists (
      select 1 from public.user_tenant_memberships
      where user_id = auth.uid()
      and tenant_id = moderation_analytics.tenant_id
      and role in ('admin', 'moderator')
    )
  );
