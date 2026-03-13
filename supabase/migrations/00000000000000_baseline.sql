-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- LEKBANKEN CANONICAL BASELINE
-- Generated: 2026-03-13
-- Source: sandbox DB (vmpdejhgpsrfulimsoqn) after 307 migrations
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

SET search_path TO public, extensions;

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- 1. EXTENSIONS
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA graphql;
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA vault;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- 2. ENUM TYPES
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

CREATE TYPE public.achievement_status_enum AS ENUM ('draft', 'active', 'archived');
CREATE TYPE public.energy_level_enum AS ENUM ('low', 'medium', 'high');
CREATE TYPE public.feedback_type_enum AS ENUM ('bug', 'feature_request', 'improvement', 'other');
CREATE TYPE public.game_media_kind AS ENUM ('cover', 'gallery');
CREATE TYPE public.game_status_enum AS ENUM ('draft', 'published');
CREATE TYPE public.global_role_enum AS ENUM ('system_admin', 'private_user', 'demo_private_user', 'member');
CREATE TYPE public.invoice_status_enum AS ENUM ('draft', 'issued', 'sent', 'paid', 'overdue', 'canceled');
CREATE TYPE public.language_code_enum AS ENUM ('NO', 'SE', 'EN');
CREATE TYPE public.location_type_enum AS ENUM ('indoor', 'outdoor', 'both');
CREATE TYPE public.media_type_enum AS ENUM ('template', 'upload', 'ai', 'diagram');
CREATE TYPE public.participant_role AS ENUM ('observer', 'player', 'team_lead', 'facilitator');
CREATE TYPE public.participant_session_status AS ENUM ('draft', 'lobby', 'active', 'paused', 'locked', 'ended', 'archived', 'cancelled');
CREATE TYPE public.participant_status AS ENUM ('active', 'idle', 'disconnected', 'kicked', 'blocked');
CREATE TYPE public.payment_status_enum AS ENUM ('pending', 'confirmed', 'failed', 'refunded');
CREATE TYPE public.plan_block_type_enum AS ENUM ('game', 'pause', 'preparation', 'custom', 'section', 'session_game');
CREATE TYPE public.plan_run_status_enum AS ENUM ('not_started', 'in_progress', 'completed', 'abandoned');
CREATE TYPE public.plan_visibility_enum AS ENUM ('private', 'tenant', 'public');
CREATE TYPE public.purpose_type_enum AS ENUM ('main', 'sub');
CREATE TYPE public.seat_assignment_status_enum AS ENUM ('active', 'released', 'pending', 'revoked');
CREATE TYPE public.session_status_enum AS ENUM ('active', 'paused', 'completed', 'abandoned');
CREATE TYPE public.subscription_status_enum AS ENUM ('active', 'paused', 'canceled', 'trial');
CREATE TYPE public.system_audit_event_type AS ENUM ('TENANT_ANONYMIZED', 'TENANT_RESTORED', 'TENANT_PURGED', 'TENANT_PURGED_AUTO');
CREATE TYPE public.system_job_run_status AS ENUM ('running', 'ok', 'warn', 'fail');
CREATE TYPE public.tenant_role_enum AS ENUM ('owner', 'admin', 'editor', 'member', 'organisation_admin', 'organisation_user', 'demo_org_admin', 'demo_org_user');
CREATE TYPE public.tenant_status_enum AS ENUM ('active', 'suspended', 'trial', 'demo', 'archived', 'anonymized');
CREATE TYPE public.tenant_type_enum AS ENUM ('school', 'sports', 'workplace', 'private', 'demo');
CREATE TYPE public.ticket_priority_enum AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE public.ticket_status_enum AS ENUM ('open', 'in_progress', 'waiting_for_user', 'resolved', 'closed');

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- 3. TABLES
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

-- Table: achievement_award_recipients
CREATE TABLE public.achievement_award_recipients (
  id uuid DEFAULT gen_random_uuid(),
  award_id uuid NOT NULL,
  user_id uuid NOT NULL,
  user_achievement_id uuid,
  was_duplicate boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

-- Table: achievement_awards
CREATE TABLE public.achievement_awards (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid,
  achievement_id uuid NOT NULL,
  awarded_by uuid NOT NULL,
  message text,
  recipient_count integer DEFAULT 0 NOT NULL,
  idempotency_key text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

-- Table: achievement_leaderboards
CREATE TABLE public.achievement_leaderboards (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  achievement_count integer DEFAULT 0 NOT NULL,
  seasonal_achievement_count integer DEFAULT 0 NOT NULL,
  total_achievement_points integer DEFAULT 0 NOT NULL,
  rank integer,
  season_number integer,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT achievement_leaderboards_tenant_id_user_id_season_number_key UNIQUE (tenant_id, user_id, season_number)
);

-- Table: achievement_translations
CREATE TABLE public.achievement_translations (
  id uuid DEFAULT gen_random_uuid(),
  achievement_id uuid NOT NULL,
  locale text NOT NULL,
  name text NOT NULL,
  description text,
  hint_text text,
  criteria_text text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid,
  updated_by uuid,
  PRIMARY KEY (id),
  CONSTRAINT achievement_translations_achievement_id_locale_key UNIQUE (achievement_id, locale),
  CONSTRAINT achievement_translations_locale_check CHECK ((locale = ANY (ARRAY['sv'::text, 'en'::text, 'no'::text])))
);

-- Table: achievements
CREATE TABLE public.achievements (
  id uuid DEFAULT gen_random_uuid(),
  achievement_key text,
  name text NOT NULL,
  description text,
  icon_url text,
  badge_color text,
  condition_type text NOT NULL,
  condition_value integer,
  created_at timestamptz DEFAULT now() NOT NULL,
  icon_media_id uuid,
  is_easter_egg boolean DEFAULT false NOT NULL,
  hint_text text,
  tenant_id uuid,
  scope_tenant_id uuid,
  scope text DEFAULT 'global'::text NOT NULL,
  status public.achievement_status_enum DEFAULT 'draft'::public.achievement_status_enum NOT NULL,
  icon_config jsonb,
  created_by uuid,
  updated_by uuid,
  updated_at timestamptz,
  PRIMARY KEY (id),
  CONSTRAINT achievements_scope_check CHECK ((scope = ANY (ARRAY['global'::text, 'tenant'::text]))),
  CONSTRAINT achievements_tenant_id_not_zero CHECK (((tenant_id IS NULL) OR (tenant_id <> '00000000-0000-0000-0000-000000000000'::uuid)))
);

-- Table: analytics_timeseries
CREATE TABLE public.analytics_timeseries (
  id uuid DEFAULT gen_random_uuid(),
  timeseries_key text,
  tenant_id uuid,
  metric_type text NOT NULL,
  metric_name text NOT NULL,
  value numeric NOT NULL,
  count integer DEFAULT 1 NOT NULL,
  breakdown_by text,
  breakdown_value text,
  time_bucket timestamptz NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT analytics_timeseries_timeseries_key_key UNIQUE (timeseries_key)
);

-- Table: anonymous_cookie_consents
CREATE TABLE public.anonymous_cookie_consents (
  id uuid DEFAULT gen_random_uuid(),
  consent_id text NOT NULL,
  necessary boolean DEFAULT true NOT NULL,
  functional boolean DEFAULT false NOT NULL,
  analytics boolean DEFAULT false NOT NULL,
  marketing boolean DEFAULT false NOT NULL,
  consent_version text NOT NULL,
  locale text NOT NULL,
  granted_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  expires_at timestamptz DEFAULT (now() + '1 year'::interval) NOT NULL,
  ip_address inet,
  user_agent text,
  dnt_enabled boolean DEFAULT false NOT NULL,
  gpc_enabled boolean DEFAULT false NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT anonymous_cookie_consents_consent_id_key UNIQUE (consent_id)
);

-- Table: award_builder_exports
CREATE TABLE public.award_builder_exports (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid,
  scope_type text NOT NULL,
  schema_version text NOT NULL,
  exported_at timestamptz DEFAULT now() NOT NULL,
  exported_by_user_id uuid,
  exported_by_tool text,
  export jsonb NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT award_builder_exports_scope_type_check CHECK ((scope_type = ANY (ARRAY['global'::text, 'tenant'::text])))
);

-- Table: badge_presets
CREATE TABLE public.badge_presets (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid,
  name text NOT NULL,
  description text,
  icon_config jsonb NOT NULL,
  category text DEFAULT 'custom'::text,
  tags text[] DEFAULT '{}'::text[],
  usage_count integer DEFAULT 0,
  created_by_user_id uuid,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT badge_presets_category_check CHECK ((category = ANY (ARRAY['custom'::text, 'system'::text, 'template'::text]))),
  CONSTRAINT badge_presets_name_check CHECK (((char_length(name) >= 1) AND (char_length(name) <= 100))),
  CONSTRAINT badge_presets_usage_count_check CHECK ((usage_count >= 0))
);

-- Table: billing_accounts
CREATE TABLE public.billing_accounts (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid,
  user_id uuid,
  provider text NOT NULL,
  provider_customer_id text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

-- Table: billing_events
CREATE TABLE public.billing_events (
  id uuid DEFAULT gen_random_uuid(),
  event_key text,
  event_type text NOT NULL,
  status text DEFAULT 'received'::text NOT NULL,
  source text,
  payload jsonb DEFAULT '{}'::jsonb NOT NULL,
  subscription_id uuid,
  invoice_id uuid,
  payment_id uuid,
  created_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT billing_events_event_key_key UNIQUE (event_key)
);

-- Table: billing_history
CREATE TABLE public.billing_history (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  subscription_id uuid,
  event_type varchar(100) NOT NULL,
  from_plan_id uuid,
  to_plan_id uuid,
  amount_charged numeric,
  amount_credited numeric,
  notes text,
  created_at timestamp DEFAULT now(),
  PRIMARY KEY (id)
);

-- Table: billing_plans
CREATE TABLE public.billing_plans (
  id uuid DEFAULT gen_random_uuid(),
  name varchar(255) NOT NULL,
  slug varchar(50) NOT NULL,
  description text,
  price_monthly numeric NOT NULL,
  price_yearly numeric,
  features jsonb DEFAULT '{}'::jsonb NOT NULL,
  user_limit integer,
  api_limit_daily integer,
  storage_gb integer,
  support_level varchar(50),
  is_active boolean DEFAULT true,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT billing_plans_slug_key UNIQUE (slug)
);

-- Table: billing_product_features
CREATE TABLE public.billing_product_features (
  id uuid DEFAULT gen_random_uuid(),
  billing_product_id uuid NOT NULL,
  feature_key text NOT NULL,
  label text,
  description text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT billing_product_features_billing_product_id_feature_key_key UNIQUE (billing_product_id, feature_key)
);

-- Table: billing_products
CREATE TABLE public.billing_products (
  id uuid DEFAULT gen_random_uuid(),
  billing_product_key text,
  name text NOT NULL,
  type text NOT NULL,
  price_per_seat numeric NOT NULL,
  currency text DEFAULT 'NOK'::text NOT NULL,
  seats_included integer DEFAULT 1 NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT billing_products_billing_product_key_key UNIQUE (billing_product_key)
);

-- Table: browse_search_logs
CREATE TABLE public.browse_search_logs (
  id uuid DEFAULT gen_random_uuid(),
  user_id uuid,
  tenant_id uuid,
  search_term text,
  filters_applied jsonb,
  results_count integer,
  result_ids uuid[],
  created_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

-- Table: bug_reports
CREATE TABLE public.bug_reports (
  id uuid DEFAULT gen_random_uuid(),
  bug_report_key text,
  user_id uuid NOT NULL,
  tenant_id uuid,
  game_id uuid,
  title text NOT NULL,
  description text NOT NULL,
  error_message text,
  steps_to_reproduce text,
  browser_info text,
  status text DEFAULT 'new'::text NOT NULL,
  is_resolved boolean DEFAULT false NOT NULL,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT bug_reports_bug_report_key_key UNIQUE (bug_report_key)
);

-- Table: bundle_items
CREATE TABLE public.bundle_items (
  id uuid DEFAULT gen_random_uuid(),
  bundle_product_id uuid NOT NULL,
  child_product_id uuid NOT NULL,
  quantity integer DEFAULT 1 NOT NULL,
  duration_days integer,
  display_order integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT bundle_items_bundle_product_id_child_product_id_key UNIQUE (bundle_product_id, child_product_id),
  CONSTRAINT bundle_items_duration_days_check CHECK (((duration_days IS NULL) OR (duration_days > 0))),
  CONSTRAINT bundle_items_quantity_check CHECK ((quantity > 0))
);

-- Table: categories
CREATE TABLE public.categories (
  id uuid DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  name text NOT NULL,
  description_short text,
  icon_key text,
  sort_order integer DEFAULT 0 NOT NULL,
  is_public boolean DEFAULT true NOT NULL,
  bundle_product_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT categories_slug_key UNIQUE (slug)
);

-- Table: challenge_participation
CREATE TABLE public.challenge_participation (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  challenge_id uuid NOT NULL,
  user_id uuid NOT NULL,
  progress_value integer DEFAULT 0 NOT NULL,
  completed boolean DEFAULT false NOT NULL,
  completed_at timestamptz,
  reward_claimed boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT challenge_participation_challenge_id_user_id_key UNIQUE (challenge_id, user_id)
);

-- Table: coach_diagram_exports
CREATE TABLE public.coach_diagram_exports (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid,
  scope_type text NOT NULL,
  schema_version text NOT NULL,
  title text NOT NULL,
  sport_type text NOT NULL,
  field_template_id text NOT NULL,
  exported_at timestamptz DEFAULT now() NOT NULL,
  exported_by_user_id uuid,
  exported_by_tool text,
  document jsonb NOT NULL,
  svg text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  source text,
  PRIMARY KEY (id),
  CONSTRAINT coach_diagram_exports_scope_type_check CHECK ((scope_type = ANY (ARRAY['global'::text, 'tenant'::text])))
);

-- Table: coin_transactions
CREATE TABLE public.coin_transactions (
  id uuid DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tenant_id uuid,
  type text NOT NULL,
  amount integer NOT NULL,
  description text,
  created_at timestamptz DEFAULT now() NOT NULL,
  reason_code text,
  idempotency_key text,
  source text,
  metadata jsonb,
  reversal_of uuid,
  PRIMARY KEY (id),
  CONSTRAINT coin_transactions_amount_positive CHECK ((amount > 0)),
  CONSTRAINT coin_transactions_type_check CHECK ((type = ANY (ARRAY['earn'::text, 'spend'::text])))
);

-- Table: collection_items
CREATE TABLE public.collection_items (
  id uuid DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL,
  game_id uuid NOT NULL,
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (id)
);

-- Table: community_challenges
CREATE TABLE public.community_challenges (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  challenge_type text NOT NULL,
  difficulty text DEFAULT 'normal'::character varying NOT NULL,
  target_value integer NOT NULL,
  reward_points integer NOT NULL,
  reward_currency_amount integer,
  status text DEFAULT 'active'::character varying NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  participation_count integer DEFAULT 0 NOT NULL,
  completion_count integer DEFAULT 0 NOT NULL,
  created_by_user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

-- Table: consent_policy_versions
CREATE TABLE public.consent_policy_versions (
  id uuid DEFAULT gen_random_uuid(),
  version text NOT NULL,
  policy_text_translations jsonb DEFAULT '{}'::jsonb NOT NULL,
  change_summary text,
  requires_reconsent boolean DEFAULT false NOT NULL,
  effective_date timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid,
  PRIMARY KEY (id),
  CONSTRAINT consent_policy_versions_version_key UNIQUE (version)
);

-- Table: content_analytics
CREATE TABLE public.content_analytics (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  content_id uuid NOT NULL,
  view_count integer DEFAULT 0,
  click_count integer DEFAULT 0,
  engagement_score numeric DEFAULT 0,
  last_viewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT content_analytics_tenant_id_content_id_key UNIQUE (tenant_id, content_id)
);

-- Table: content_collections
CREATE TABLE public.content_collections (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  category text NOT NULL,
  cover_image_url text,
  game_count integer DEFAULT 0,
  view_count integer DEFAULT 0,
  is_published boolean DEFAULT false,
  is_featured boolean DEFAULT false,
  order_index integer DEFAULT 0,
  created_by_user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (id)
);

-- Table: content_filter_rules
CREATE TABLE public.content_filter_rules (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  pattern text NOT NULL,
  rule_type text NOT NULL,
  severity text NOT NULL,
  categories text[] DEFAULT ARRAY[]::text[] NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_by_user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT content_filter_rules_pattern_key UNIQUE (pattern)
);

-- Table: content_items
CREATE TABLE public.content_items (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  description text,
  image_url text,
  is_published boolean DEFAULT false,
  is_featured boolean DEFAULT false,
  featured_until timestamptz,
  view_count integer DEFAULT 0,
  created_by_user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  PRIMARY KEY (id),
  CONSTRAINT content_items_type_check CHECK ((type = ANY (ARRAY['game'::text, 'collection'::text, 'event'::text, 'challenge'::text])))
);

-- Table: content_preferences
CREATE TABLE public.content_preferences (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  content_category varchar(100),
  preference_level varchar(20) DEFAULT 'neutral'::character varying,
  frequency_preference varchar(20),
  engagement_count integer DEFAULT 0,
  last_engaged_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT content_preferences_tenant_id_user_id_content_category_key UNIQUE (tenant_id, user_id, content_category)
);

-- Table: content_reports
CREATE TABLE public.content_reports (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  reported_by_user_id uuid NOT NULL,
  content_type text NOT NULL,
  content_id text NOT NULL,
  reason text NOT NULL,
  description text,
  status text DEFAULT 'pending'::character varying NOT NULL,
  priority text DEFAULT 'normal'::character varying NOT NULL,
  assigned_to_user_id uuid,
  resolution_reason text,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

-- Table: content_schedules
CREATE TABLE public.content_schedules (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  content_id uuid NOT NULL,
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (id)
);

-- Table: conversation_card_collection_secondary_purposes
CREATE TABLE public.conversation_card_collection_secondary_purposes (
  collection_id uuid,
  purpose_id uuid,
  PRIMARY KEY (collection_id, purpose_id)
);

-- Table: conversation_card_collections
CREATE TABLE public.conversation_card_collections (
  id uuid DEFAULT gen_random_uuid(),
  scope_type text DEFAULT 'tenant'::text NOT NULL,
  tenant_id uuid,
  title text NOT NULL,
  description text,
  audience text,
  language text,
  main_purpose_id uuid,
  status text DEFAULT 'draft'::text NOT NULL,
  created_by_user_id uuid,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT conversation_card_collections_scope_type_check CHECK ((scope_type = ANY (ARRAY['global'::text, 'tenant'::text]))),
  CONSTRAINT conversation_card_collections_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text])))
);

-- Table: conversation_cards
CREATE TABLE public.conversation_cards (
  id uuid DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL,
  sort_order integer DEFAULT 0 NOT NULL,
  card_title text,
  primary_prompt text NOT NULL,
  followup_1 text,
  followup_2 text,
  followup_3 text,
  leader_tip text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

-- Table: cookie_catalog
CREATE TABLE public.cookie_catalog (
  key text,
  category text NOT NULL,
  purpose text NOT NULL,
  provider text,
  ttl_days integer,
  default_on boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  purpose_translations jsonb DEFAULT '{}'::jsonb NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  sort_order integer DEFAULT 0 NOT NULL,
  PRIMARY KEY (key),
  CONSTRAINT cookie_catalog_category_check CHECK ((category = ANY (ARRAY['necessary'::text, 'functional'::text, 'analytics'::text, 'marketing'::text])))
);

-- Table: cookie_consent_audit
CREATE TABLE public.cookie_consent_audit (
  id uuid DEFAULT gen_random_uuid(),
  consent_id text NOT NULL,
  user_id uuid,
  event_type text NOT NULL,
  previous_state jsonb,
  new_state jsonb,
  consent_version text NOT NULL,
  ip_address inet,
  user_agent text,
  page_url text,
  referrer text,
  locale text,
  dnt_enabled boolean DEFAULT false NOT NULL,
  gpc_enabled boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT cookie_consent_audit_event_type_check CHECK ((event_type = ANY (ARRAY['granted'::text, 'updated'::text, 'withdrawn'::text, 'expired'::text, 'reprompted'::text])))
);

-- Table: cookie_consents
CREATE TABLE public.cookie_consents (
  id uuid DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  cookie_key text NOT NULL,
  consent boolean NOT NULL,
  given_at timestamptz DEFAULT now() NOT NULL,
  schema_version integer NOT NULL,
  source text NOT NULL,
  tenant_id_snapshot uuid,
  PRIMARY KEY (id),
  CONSTRAINT cookie_consents_user_id_cookie_key_schema_version_key UNIQUE (user_id, cookie_key, schema_version),
  CONSTRAINT cookie_consents_source_check CHECK ((source = ANY (ARRAY['banner'::text, 'settings'::text])))
);

-- Table: cosmetic_unlock_rules
CREATE TABLE public.cosmetic_unlock_rules (
  id uuid DEFAULT gen_random_uuid(),
  cosmetic_id uuid NOT NULL,
  unlock_type text NOT NULL,
  unlock_config jsonb NOT NULL,
  priority integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (id)
);

-- Table: cosmetics
CREATE TABLE public.cosmetics (
  id uuid DEFAULT gen_random_uuid(),
  key text NOT NULL,
  category text NOT NULL,
  faction_id text,
  rarity text DEFAULT 'common'::text NOT NULL,
  name_key text NOT NULL,
  description_key text NOT NULL,
  render_type text NOT NULL,
  render_config jsonb DEFAULT '{}'::jsonb NOT NULL,
  preview_url text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT cosmetics_key_key UNIQUE (key)
);

-- Table: data_access_log
CREATE TABLE public.data_access_log (
  id uuid DEFAULT gen_random_uuid(),
  accessor_user_id uuid,
  accessor_role text,
  accessor_ip inet,
  accessor_user_agent text,
  subject_user_id uuid NOT NULL,
  data_category text NOT NULL,
  fields_accessed text[],
  operation text NOT NULL,
  tenant_id uuid,
  request_path text,
  request_method text,
  legal_basis text,
  purpose text,
  created_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT data_access_log_legal_basis_check CHECK ((legal_basis = ANY (ARRAY['consent'::text, 'contract'::text, 'legal_obligation'::text, 'vital_interest'::text, 'public_task'::text, 'legitimate_interest'::text]))),
  CONSTRAINT data_access_log_operation_check CHECK ((operation = ANY (ARRAY['read'::text, 'create'::text, 'update'::text, 'delete'::text, 'export'::text, 'bulk_read'::text])))
);

-- Table: data_breach_notifications
CREATE TABLE public.data_breach_notifications (
  id uuid DEFAULT gen_random_uuid(),
  incident_id text NOT NULL,
  breach_type text NOT NULL,
  description text NOT NULL,
  discovered_at timestamptz NOT NULL,
  occurred_at timestamptz,
  affected_users_count integer,
  affected_tenants jsonb,
  data_categories_affected text[],
  risk_assessment text,
  dpa_notified boolean DEFAULT false NOT NULL,
  dpa_notified_at timestamptz,
  dpa_notification_deadline timestamptz,
  users_notified boolean DEFAULT false NOT NULL,
  users_notified_at timestamptz,
  users_notification_required boolean,
  remediation_steps text[],
  preventive_measures text[],
  status text DEFAULT 'open'::text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid,
  closed_at timestamptz,
  closed_by uuid,
  PRIMARY KEY (id),
  CONSTRAINT data_breach_notifications_incident_id_key UNIQUE (incident_id),
  CONSTRAINT data_breach_notifications_risk_assessment_check CHECK ((risk_assessment = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text]))),
  CONSTRAINT data_breach_notifications_status_check CHECK ((status = ANY (ARRAY['open'::text, 'investigating'::text, 'contained'::text, 'resolved'::text, 'closed'::text])))
);

-- Table: data_retention_policies
CREATE TABLE public.data_retention_policies (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid,
  data_category text NOT NULL,
  table_name text,
  retention_period interval NOT NULL,
  rationale text NOT NULL,
  legal_basis text,
  action_on_expiry text NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  last_executed_at timestamptz,
  next_execution_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid,
  PRIMARY KEY (id),
  CONSTRAINT data_retention_policies_action_on_expiry_check CHECK ((action_on_expiry = ANY (ARRAY['delete'::text, 'anonymize'::text, 'archive'::text])))
);

-- Table: demo_sessions
CREATE TABLE public.demo_sessions (
  id uuid DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  demo_tier text DEFAULT 'free'::text NOT NULL,
  started_at timestamptz DEFAULT now() NOT NULL,
  expires_at timestamptz DEFAULT (now() + '02:00:00'::interval) NOT NULL,
  ended_at timestamptz,
  converted boolean DEFAULT false,
  conversion_type text,
  conversion_plan text,
  features_used jsonb DEFAULT '[]'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT demo_sessions_conversion_type_check CHECK ((conversion_type = ANY (ARRAY['signup'::text, 'contact_sales'::text, NULL::text]))),
  CONSTRAINT demo_sessions_demo_tier_check CHECK ((demo_tier = ANY (ARRAY['free'::text, 'premium'::text])))
);

-- Table: dunning_actions
CREATE TABLE public.dunning_actions (
  id uuid DEFAULT gen_random_uuid(),
  payment_failure_id uuid NOT NULL,
  action_type text NOT NULL,
  action_result text,
  action_details jsonb DEFAULT '{}'::jsonb,
  performed_by text,
  created_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

-- Table: dunning_config
CREATE TABLE public.dunning_config (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid,
  max_retry_attempts integer DEFAULT 3 NOT NULL,
  retry_interval_hours integer DEFAULT 24 NOT NULL,
  grace_period_days integer DEFAULT 7 NOT NULL,
  pause_after_failure boolean DEFAULT true NOT NULL,
  cancel_after_grace_period boolean DEFAULT false NOT NULL,
  send_failure_email boolean DEFAULT true NOT NULL,
  send_reminder_email boolean DEFAULT true NOT NULL,
  reminder_days int4[] DEFAULT ARRAY[1, 3, 7] NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT dunning_config_unique_tenant UNIQUE (tenant_id)
);

-- Table: error_tracking
CREATE TABLE public.error_tracking (
  id uuid DEFAULT gen_random_uuid(),
  error_key text,
  user_id uuid,
  tenant_id uuid,
  error_type text NOT NULL,
  error_message text,
  stack_trace text,
  page_path text,
  severity text DEFAULT 'warning'::text,
  resolved boolean DEFAULT false NOT NULL,
  occurrence_count integer DEFAULT 1 NOT NULL,
  last_occurred_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT error_tracking_error_key_key UNIQUE (error_key)
);

-- Table: event_rewards
CREATE TABLE public.event_rewards (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  event_id uuid NOT NULL,
  user_id uuid NOT NULL,
  reward_id text NOT NULL,
  reward_name text NOT NULL,
  claimed boolean DEFAULT false NOT NULL,
  claimed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

-- Table: feature_usage
CREATE TABLE public.feature_usage (
  id uuid DEFAULT gen_random_uuid(),
  feature_key text,
  user_id uuid,
  tenant_id uuid,
  feature_name text NOT NULL,
  category text,
  action_type text NOT NULL,
  metadata jsonb,
  duration_ms integer,
  success boolean DEFAULT true,
  error_message text,
  created_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT feature_usage_feature_key_key UNIQUE (feature_key)
);

-- Table: feedback
CREATE TABLE public.feedback (
  id uuid DEFAULT gen_random_uuid(),
  feedback_key text,
  user_id uuid NOT NULL,
  tenant_id uuid,
  game_id uuid,
  type public.feedback_type_enum DEFAULT 'other'::public.feedback_type_enum NOT NULL,
  title text NOT NULL,
  description text,
  rating integer,
  is_anonymous boolean DEFAULT false NOT NULL,
  status text DEFAULT 'received'::text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT feedback_feedback_key_key UNIQUE (feedback_key),
  CONSTRAINT feedback_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);

-- Table: friend_requests
CREATE TABLE public.friend_requests (
  id uuid DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  status varchar(50) DEFAULT 'pending'::character varying NOT NULL,
  created_at timestamp DEFAULT now(),
  responded_at timestamp,
  PRIMARY KEY (id),
  CONSTRAINT friend_requests_requester_id_recipient_id_key UNIQUE (requester_id, recipient_id),
  CONSTRAINT different_users CHECK ((requester_id <> recipient_id))
);

-- Table: friends
CREATE TABLE public.friends (
  id uuid DEFAULT gen_random_uuid(),
  user_id_1 uuid NOT NULL,
  user_id_2 uuid NOT NULL,
  tenant_id_1 uuid,
  tenant_id_2 uuid,
  created_at timestamp DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT friends_user_id_1_user_id_2_key UNIQUE (user_id_1, user_id_2),
  CONSTRAINT different_users CHECK ((user_id_1 < user_id_2)),
  CONSTRAINT users_not_same CHECK ((user_id_1 <> user_id_2))
);

-- Table: funnel_analytics
CREATE TABLE public.funnel_analytics (
  id uuid DEFAULT gen_random_uuid(),
  funnel_key text,
  user_id uuid,
  tenant_id uuid,
  funnel_name text NOT NULL,
  step_1 boolean DEFAULT false NOT NULL,
  step_2 boolean DEFAULT false NOT NULL,
  step_3 boolean DEFAULT false NOT NULL,
  step_4 boolean DEFAULT false NOT NULL,
  step_5 boolean DEFAULT false NOT NULL,
  completed boolean DEFAULT false NOT NULL,
  abandoned_at_step integer,
  duration_seconds integer,
  created_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT funnel_analytics_funnel_key_key UNIQUE (funnel_key)
);

-- Table: game_artifact_variants
CREATE TABLE public.game_artifact_variants (
  id uuid DEFAULT gen_random_uuid(),
  artifact_id uuid NOT NULL,
  visibility text DEFAULT 'public'::text NOT NULL,
  visible_to_role_id uuid,
  title text,
  body text,
  media_ref uuid,
  variant_order integer DEFAULT 0 NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT game_artifact_variants_visibility_check CHECK ((visibility = ANY (ARRAY['public'::text, 'leader_only'::text, 'role_private'::text])))
);

-- Table: game_artifacts
CREATE TABLE public.game_artifacts (
  id uuid DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL,
  locale text,
  title text NOT NULL,
  description text,
  artifact_type text DEFAULT 'card'::text NOT NULL,
  artifact_order integer DEFAULT 0 NOT NULL,
  tags text[] DEFAULT '{}'::text[],
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

-- Table: game_board_config
CREATE TABLE public.game_board_config (
  id uuid DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL,
  locale text,
  show_game_name boolean DEFAULT true,
  show_current_phase boolean DEFAULT true,
  show_timer boolean DEFAULT true,
  show_participants boolean DEFAULT true,
  show_public_roles boolean DEFAULT true,
  show_leaderboard boolean DEFAULT false,
  show_qr_code boolean DEFAULT false,
  welcome_message text,
  theme text DEFAULT 'neutral'::text,
  background_media_id uuid,
  background_color text,
  layout_variant text DEFAULT 'standard'::text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT game_board_config_game_id_locale_key UNIQUE (game_id, locale)
);

-- Table: game_materials
CREATE TABLE public.game_materials (
  id uuid DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL,
  locale text,
  items text[] DEFAULT '{}'::text[],
  safety_notes text,
  preparation text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

-- Table: game_media
CREATE TABLE public.game_media (
  id uuid DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL,
  media_id uuid NOT NULL,
  tenant_id uuid,
  kind public.game_media_kind DEFAULT 'gallery'::public.game_media_kind NOT NULL,
  position integer DEFAULT 0 NOT NULL,
  alt_text text,
  created_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

-- Table: game_phases
CREATE TABLE public.game_phases (
  id uuid DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL,
  locale text,
  name text NOT NULL,
  phase_type text DEFAULT 'round'::text NOT NULL,
  phase_order integer DEFAULT 0 NOT NULL,
  duration_seconds integer,
  timer_visible boolean DEFAULT true,
  timer_style text DEFAULT 'countdown'::text,
  description text,
  board_message text,
  auto_advance boolean DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

-- Table: game_reactions
CREATE TABLE public.game_reactions (
  id uuid DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  game_id uuid NOT NULL,
  reaction text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT game_reactions_user_game_unique UNIQUE (user_id, game_id),
  CONSTRAINT game_reactions_reaction_check CHECK ((reaction = ANY (ARRAY['like'::text, 'dislike'::text])))
);

-- Table: game_roles
CREATE TABLE public.game_roles (
  id uuid DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL,
  locale text,
  name text NOT NULL,
  icon text,
  color text,
  role_order integer DEFAULT 0 NOT NULL,
  public_description text,
  private_instructions text NOT NULL,
  private_hints text,
  min_count integer DEFAULT 1 NOT NULL,
  max_count integer,
  assignment_strategy text DEFAULT 'random'::text NOT NULL,
  scaling_rules jsonb,
  conflicts_with uuid[] DEFAULT '{}'::uuid[],
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

-- Table: game_scores
CREATE TABLE public.game_scores (
  id uuid DEFAULT gen_random_uuid(),
  score_key text,
  session_id uuid NOT NULL,
  game_id uuid NOT NULL,
  user_id uuid NOT NULL,
  tenant_id uuid,
  score integer DEFAULT 0 NOT NULL,
  score_type text DEFAULT 'points'::text,
  metadata jsonb,
  recorded_at timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT game_scores_score_key_key UNIQUE (score_key)
);

-- Table: game_secondary_purposes
CREATE TABLE public.game_secondary_purposes (
  game_id uuid,
  purpose_id uuid,
  PRIMARY KEY (game_id, purpose_id)
);

-- Table: game_sessions
CREATE TABLE public.game_sessions (
  id uuid DEFAULT gen_random_uuid(),
  session_key text,
  game_id uuid NOT NULL,
  user_id uuid NOT NULL,
  tenant_id uuid,
  status public.session_status_enum DEFAULT 'active'::public.session_status_enum NOT NULL,
  score integer DEFAULT 0,
  duration_seconds integer DEFAULT 0,
  started_at timestamptz DEFAULT now() NOT NULL,
  ended_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT game_sessions_session_key_key UNIQUE (session_key)
);

-- Table: game_snapshots
CREATE TABLE public.game_snapshots (
  id uuid DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL,
  version integer DEFAULT 1 NOT NULL,
  version_label text,
  snapshot_data jsonb NOT NULL,
  includes_steps boolean DEFAULT true NOT NULL,
  includes_phases boolean DEFAULT false NOT NULL,
  includes_roles boolean DEFAULT false NOT NULL,
  includes_artifacts boolean DEFAULT false NOT NULL,
  includes_triggers boolean DEFAULT false NOT NULL,
  includes_board_config boolean DEFAULT false NOT NULL,
  checksum text,
  created_by uuid,
  created_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

-- Table: game_steps
CREATE TABLE public.game_steps (
  id uuid DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL,
  locale text,
  phase_id uuid,
  step_order integer DEFAULT 0 NOT NULL,
  title text,
  body text,
  duration_seconds integer,
  leader_script text,
  participant_prompt text,
  board_text text,
  media_ref uuid,
  optional boolean DEFAULT false,
  conditional text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  display_mode text DEFAULT 'instant'::text,
  PRIMARY KEY (id)
);

-- Table: game_tools
CREATE TABLE public.game_tools (
  id uuid DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL,
  tool_key text NOT NULL,
  enabled boolean DEFAULT true NOT NULL,
  scope text DEFAULT 'both'::text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT game_tools_game_id_tool_key_key UNIQUE (game_id, tool_key),
  CONSTRAINT game_tools_scope_check CHECK ((scope = ANY (ARRAY['host'::text, 'participants'::text, 'both'::text])))
);

-- Table: game_translations
CREATE TABLE public.game_translations (
  game_id uuid,
  locale text,
  title text NOT NULL,
  short_description text NOT NULL,
  instructions jsonb DEFAULT '[]'::jsonb NOT NULL,
  materials text[] DEFAULT '{}'::text[],
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (game_id, locale)
);

-- Table: game_triggers
CREATE TABLE public.game_triggers (
  id uuid DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  enabled boolean DEFAULT true NOT NULL,
  condition jsonb NOT NULL,
  actions jsonb DEFAULT '[]'::jsonb NOT NULL,
  execute_once boolean DEFAULT false NOT NULL,
  delay_seconds integer DEFAULT 0,
  sort_order integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

-- Table: games
CREATE TABLE public.games (
  id uuid DEFAULT gen_random_uuid(),
  game_key text,
  name text NOT NULL,
  description text,
  instructions text,
  product_id uuid,
  main_purpose_id uuid,
  owner_tenant_id uuid,
  status public.game_status_enum DEFAULT 'draft'::public.game_status_enum NOT NULL,
  energy_level public.energy_level_enum,
  time_estimate_min integer,
  min_players integer,
  max_players integer,
  age_min integer,
  age_max integer,
  location_type public.location_type_enum,
  materials text[],
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  category text,
  short_description text,
  version integer DEFAULT 1 NOT NULL,
  season_tags text[] DEFAULT '{}'::text[],
  holiday_tags text[] DEFAULT '{}'::text[],
  created_by uuid,
  updated_by uuid,
  popularity_score double precision DEFAULT 0 NOT NULL,
  rating_average double precision,
  rating_count integer DEFAULT 0 NOT NULL,
  play_mode text DEFAULT 'basic'::text,
  game_content_version text DEFAULT 'v1'::text,
  duration_max integer,
  players_recommended integer,
  difficulty text,
  accessibility_notes text,
  space_requirements text,
  leader_tips text,
  is_demo_content boolean DEFAULT false,
  external_ref text,
  import_source text,
  imported_at timestamptz,
  game_content_schema_version integer DEFAULT 1 NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT games_game_key_key UNIQUE (game_key)
);

-- Table: gamification_admin_award_recipients
CREATE TABLE public.gamification_admin_award_recipients (
  id uuid DEFAULT gen_random_uuid(),
  award_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  coin_transaction_id uuid,
  balance_after integer,
  created_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT gamification_admin_award_recipients_award_id_user_id_key UNIQUE (award_id, user_id)
);

-- Table: gamification_admin_award_request_recipients
CREATE TABLE public.gamification_admin_award_request_recipients (
  id uuid DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT gamification_admin_award_request_recipie_request_id_user_id_key UNIQUE (request_id, user_id)
);

-- Table: gamification_admin_award_requests
CREATE TABLE public.gamification_admin_award_requests (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  requester_user_id uuid,
  amount integer NOT NULL,
  message text,
  idempotency_key text NOT NULL,
  status text DEFAULT 'pending'::text NOT NULL,
  award_id uuid,
  decided_by_user_id uuid,
  decided_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT gamification_admin_award_requests_amount_positive CHECK ((amount > 0)),
  CONSTRAINT gamification_admin_award_requests_status_valid CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);

-- Table: gamification_admin_awards
CREATE TABLE public.gamification_admin_awards (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  actor_user_id uuid,
  award_type text NOT NULL,
  amount integer NOT NULL,
  message text,
  idempotency_key text NOT NULL,
  source text DEFAULT 'admin_award'::text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT gamification_admin_awards_amount_positive CHECK ((amount > 0))
);

-- Table: gamification_automation_rules
CREATE TABLE public.gamification_automation_rules (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid,
  name text NOT NULL,
  event_type text NOT NULL,
  reward_amount integer NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_by_user_id uuid,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  xp_amount integer DEFAULT 0,
  cooldown_type text DEFAULT 'none'::text,
  base_multiplier numeric DEFAULT 1.00,
  conditions jsonb DEFAULT '[]'::jsonb,
  PRIMARY KEY (id),
  CONSTRAINT gamification_automation_rules_base_multiplier_check CHECK (((base_multiplier >= (0)::numeric) AND (base_multiplier <= (10)::numeric))),
  CONSTRAINT gamification_automation_rules_cooldown_type_check CHECK ((cooldown_type = ANY (ARRAY['none'::text, 'daily'::text, 'weekly'::text, 'once'::text, 'once_per_streak'::text]))),
  CONSTRAINT gamification_automation_rules_reward_amount_check CHECK ((reward_amount > 0)),
  CONSTRAINT gamification_automation_rules_xp_amount_check CHECK ((xp_amount >= 0))
);

-- Table: gamification_burn_log
CREATE TABLE public.gamification_burn_log (
  id uuid DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tenant_id uuid,
  sink_id uuid,
  coin_transaction_id uuid,
  sink_type text NOT NULL,
  amount_spent integer NOT NULL,
  result_status text DEFAULT 'completed'::text NOT NULL,
  refund_transaction_id uuid,
  metadata jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT gamification_burn_log_amount_spent_check CHECK ((amount_spent > 0)),
  CONSTRAINT gamification_burn_log_result_status_check CHECK ((result_status = ANY (ARRAY['completed'::text, 'refunded'::text, 'failed'::text])))
);

-- Table: gamification_burn_sinks
CREATE TABLE public.gamification_burn_sinks (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid,
  sink_type text NOT NULL,
  name text NOT NULL,
  description text,
  cost_coins integer NOT NULL,
  is_available boolean DEFAULT false NOT NULL,
  available_from timestamptz,
  available_until timestamptz,
  total_stock integer,
  remaining_stock integer,
  per_user_limit integer,
  metadata jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT gamification_burn_sinks_cost_coins_check CHECK ((cost_coins >= 0)),
  CONSTRAINT gamification_burn_sinks_sink_type_check CHECK ((sink_type = ANY (ARRAY['shop_item'::text, 'boost'::text, 'cosmetic'::text, 'donation'::text, 'custom'::text])))
);

-- Table: gamification_campaign_templates
CREATE TABLE public.gamification_campaign_templates (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid,
  label text NOT NULL,
  name text NOT NULL,
  event_type text NOT NULL,
  bonus_amount integer NOT NULL,
  budget_amount integer,
  duration_days integer NOT NULL,
  is_active_default boolean DEFAULT true NOT NULL,
  sort_order integer DEFAULT 0 NOT NULL,
  created_by_user_id uuid,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT gamification_campaign_templates_bonus_amount_check CHECK ((bonus_amount > 0)),
  CONSTRAINT gamification_campaign_templates_budget_amount_check CHECK (((budget_amount IS NULL) OR (budget_amount >= 0))),
  CONSTRAINT gamification_campaign_templates_duration_days_check CHECK (((duration_days >= 1) AND (duration_days <= 365))),
  CONSTRAINT gamification_campaign_templates_global_only CHECK ((tenant_id IS NULL))
);

-- Table: gamification_campaigns
CREATE TABLE public.gamification_campaigns (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  event_type text NOT NULL,
  bonus_amount integer NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  budget_amount integer,
  spent_amount integer DEFAULT 0 NOT NULL,
  created_by_user_id uuid,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  source_template_id uuid,
  idempotency_key text,
  PRIMARY KEY (id),
  CONSTRAINT gamification_campaigns_bonus_amount_check CHECK ((bonus_amount > 0)),
  CONSTRAINT gamification_campaigns_budget_amount_check CHECK (((budget_amount IS NULL) OR (budget_amount >= 0))),
  CONSTRAINT gamification_campaigns_spent_amount_check CHECK ((spent_amount >= 0)),
  CONSTRAINT gamification_campaigns_valid_timeframe CHECK ((ends_at > starts_at))
);

-- Table: gamification_cooldowns
CREATE TABLE public.gamification_cooldowns (
  id uuid DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tenant_id uuid,
  event_type text NOT NULL,
  cooldown_type text NOT NULL,
  trigger_count integer DEFAULT 1 NOT NULL,
  first_triggered_at timestamptz DEFAULT now() NOT NULL,
  last_triggered_at timestamptz DEFAULT now() NOT NULL,
  streak_id integer,
  created_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT gamification_cooldowns_user_id_tenant_id_event_type_cooldow_key UNIQUE (user_id, tenant_id, event_type, cooldown_type),
  CONSTRAINT gamification_cooldowns_cooldown_type_check CHECK ((cooldown_type = ANY (ARRAY['daily'::text, 'weekly'::text, 'once'::text, 'once_per_streak'::text])))
);

-- Table: gamification_daily_earnings
CREATE TABLE public.gamification_daily_earnings (
  id uuid DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tenant_id uuid,
  earning_date date DEFAULT CURRENT_DATE NOT NULL,
  coins_earned integer DEFAULT 0 NOT NULL,
  xp_earned integer DEFAULT 0 NOT NULL,
  coins_earned_raw integer DEFAULT 0 NOT NULL,
  xp_earned_raw integer DEFAULT 0 NOT NULL,
  coins_reduced integer DEFAULT 0 NOT NULL,
  xp_reduced integer DEFAULT 0 NOT NULL,
  event_count integer DEFAULT 0 NOT NULL,
  last_event_at timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT gamification_daily_earnings_user_id_tenant_id_earning_date_key UNIQUE (user_id, tenant_id, earning_date)
);

-- Table: gamification_daily_summaries
CREATE TABLE public.gamification_daily_summaries (
  tenant_id uuid,
  day date,
  earned bigint DEFAULT 0 NOT NULL,
  spent bigint DEFAULT 0 NOT NULL,
  tx_count bigint DEFAULT 0 NOT NULL,
  events_count bigint DEFAULT 0 NOT NULL,
  awards_total bigint DEFAULT 0 NOT NULL,
  awards_count bigint DEFAULT 0 NOT NULL,
  purchases_count bigint DEFAULT 0 NOT NULL,
  purchases_spent numeric DEFAULT 0 NOT NULL,
  campaign_bonus_total bigint DEFAULT 0 NOT NULL,
  automation_total bigint DEFAULT 0 NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (tenant_id, day)
);

-- Table: gamification_events
CREATE TABLE public.gamification_events (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid,
  actor_user_id uuid NOT NULL,
  event_type text NOT NULL,
  source text NOT NULL,
  idempotency_key text NOT NULL,
  metadata jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

-- Table: gamification_level_definitions
CREATE TABLE public.gamification_level_definitions (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid,
  level integer NOT NULL,
  name text,
  next_level_xp integer DEFAULT 1000 NOT NULL,
  next_reward text,
  reward_asset_key text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT gamification_level_definitions_level_check CHECK ((level >= 1)),
  CONSTRAINT gamification_level_definitions_next_level_xp_check CHECK ((next_level_xp >= 0))
);

-- Table: gamification_softcap_config
CREATE TABLE public.gamification_softcap_config (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid,
  daily_coin_threshold integer DEFAULT 100 NOT NULL,
  daily_xp_threshold integer DEFAULT 500 NOT NULL,
  coin_diminishing_factor numeric DEFAULT 0.500 NOT NULL,
  xp_diminishing_factor numeric DEFAULT 0.500 NOT NULL,
  coin_floor_pct numeric DEFAULT 0.100 NOT NULL,
  xp_floor_pct numeric DEFAULT 0.100 NOT NULL,
  max_multiplier_cap numeric DEFAULT 2.00 NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT gamification_softcap_config_tenant_id_key UNIQUE (tenant_id),
  CONSTRAINT gamification_softcap_config_coin_diminishing_factor_check CHECK (((coin_diminishing_factor > (0)::numeric) AND (coin_diminishing_factor < (1)::numeric))),
  CONSTRAINT gamification_softcap_config_coin_floor_pct_check CHECK (((coin_floor_pct >= (0)::numeric) AND (coin_floor_pct <= (1)::numeric))),
  CONSTRAINT gamification_softcap_config_max_multiplier_cap_check CHECK (((max_multiplier_cap >= (1)::numeric) AND (max_multiplier_cap <= (10)::numeric))),
  CONSTRAINT gamification_softcap_config_xp_diminishing_factor_check CHECK (((xp_diminishing_factor > (0)::numeric) AND (xp_diminishing_factor < (1)::numeric))),
  CONSTRAINT gamification_softcap_config_xp_floor_pct_check CHECK (((xp_floor_pct >= (0)::numeric) AND (xp_floor_pct <= (1)::numeric)))
);

-- Table: gdpr_requests
CREATE TABLE public.gdpr_requests (
  id uuid DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tenant_id uuid,
  request_type text NOT NULL,
  status text DEFAULT 'pending'::text NOT NULL,
  request_details jsonb,
  response_details jsonb,
  rejection_reason text,
  handled_by uuid,
  requested_at timestamptz DEFAULT now() NOT NULL,
  acknowledged_at timestamptz,
  completed_at timestamptz,
  response_deadline timestamptz DEFAULT (now() + '30 days'::interval) NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT gdpr_requests_request_type_check CHECK ((request_type = ANY (ARRAY['access'::text, 'rectification'::text, 'erasure'::text, 'restriction'::text, 'portability'::text, 'objection'::text]))),
  CONSTRAINT gdpr_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text, 'rejected'::text, 'cancelled'::text])))
);

-- Table: gift_purchases
CREATE TABLE public.gift_purchases (
  id uuid DEFAULT gen_random_uuid(),
  purchaser_user_id uuid NOT NULL,
  purchaser_email text NOT NULL,
  product_id uuid NOT NULL,
  product_price_id uuid NOT NULL,
  recipient_email text,
  recipient_name text,
  gift_message text,
  redemption_code text NOT NULL,
  redemption_code_expires_at timestamptz NOT NULL,
  redeemed_at timestamptz,
  redeemed_by_user_id uuid,
  redeemed_tenant_id uuid,
  status text DEFAULT 'pending'::text NOT NULL,
  purchase_intent_id uuid,
  stripe_payment_intent_id text,
  amount integer NOT NULL,
  currency text DEFAULT 'sek'::text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT gift_purchases_redemption_code_key UNIQUE (redemption_code)
);

-- Table: interest_profiles
CREATE TABLE public.interest_profiles (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  interest_category varchar(100),
  interest_weight double precision DEFAULT 0.5,
  interest_activity integer DEFAULT 0,
  is_trending boolean DEFAULT false,
  trend_score double precision DEFAULT 0,
  last_engagement_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT interest_profiles_tenant_id_user_id_interest_category_key UNIQUE (tenant_id, user_id, interest_category)
);

-- Table: invoices
CREATE TABLE public.invoices (
  id uuid DEFAULT gen_random_uuid(),
  invoice_key text,
  name text NOT NULL,
  tenant_id uuid NOT NULL,
  subscription_id uuid,
  billing_product_id uuid,
  amount numeric NOT NULL,
  currency text DEFAULT 'NOK'::text NOT NULL,
  status public.invoice_status_enum DEFAULT 'draft'::public.invoice_status_enum NOT NULL,
  due_date date NOT NULL,
  issued_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  invoice_number text,
  amount_subtotal numeric DEFAULT 0,
  amount_tax numeric DEFAULT 0,
  amount_total numeric,
  pdf_url text,
  notes text,
  stripe_invoice_id text,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT invoices_invoice_key_key UNIQUE (invoice_key)
);

-- Table: leader_profile
CREATE TABLE public.leader_profile (
  id uuid DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  display_achievement_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT leader_profile_user_id_tenant_id_key UNIQUE (user_id, tenant_id),
  CONSTRAINT leader_profile_display_achievement_ids_max_3 CHECK ((COALESCE(array_length(display_achievement_ids, 1), 0) <= 3))
);

-- Table: leaderboards
CREATE TABLE public.leaderboards (
  id uuid DEFAULT gen_random_uuid(),
  leaderboard_key text,
  game_id uuid,
  tenant_id uuid,
  leaderboard_type text DEFAULT 'global'::text NOT NULL,
  user_id uuid,
  total_score integer DEFAULT 0 NOT NULL,
  total_sessions integer DEFAULT 0 NOT NULL,
  avg_score numeric,
  best_score integer,
  worst_score integer,
  last_played_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT leaderboards_leaderboard_key_key UNIQUE (leaderboard_key)
);

-- Table: learning_course_attempts
CREATE TABLE public.learning_course_attempts (
  id uuid DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  course_id uuid NOT NULL,
  started_at timestamptz DEFAULT now() NOT NULL,
  submitted_at timestamptz,
  score integer,
  passed boolean,
  answers_json jsonb DEFAULT '[]'::jsonb,
  time_spent_seconds integer,
  created_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

-- Table: learning_course_translations
CREATE TABLE public.learning_course_translations (
  id uuid DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL,
  locale text NOT NULL,
  title text NOT NULL,
  description text,
  content_json jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid,
  updated_by uuid,
  PRIMARY KEY (id),
  CONSTRAINT learning_course_translations_course_id_locale_key UNIQUE (course_id, locale),
  CONSTRAINT learning_course_translations_locale_check CHECK ((locale = ANY (ARRAY['sv'::text, 'en'::text, 'no'::text])))
);

-- Table: learning_courses
CREATE TABLE public.learning_courses (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid,
  slug text NOT NULL,
  title text NOT NULL,
  description text,
  status text DEFAULT 'draft'::text NOT NULL,
  difficulty text DEFAULT 'beginner'::text,
  tags jsonb DEFAULT '[]'::jsonb,
  content_json jsonb DEFAULT '[]'::jsonb,
  quiz_json jsonb DEFAULT '[]'::jsonb,
  pass_score integer DEFAULT 70,
  rewards_json jsonb DEFAULT '{}'::jsonb,
  duration_minutes integer,
  cover_image_url text,
  version integer DEFAULT 1,
  created_by uuid,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT learning_courses_tenant_id_slug_key UNIQUE (tenant_id, slug),
  CONSTRAINT learning_courses_difficulty_check CHECK ((difficulty = ANY (ARRAY['beginner'::text, 'intermediate'::text, 'advanced'::text, 'expert'::text]))),
  CONSTRAINT learning_courses_pass_score_check CHECK (((pass_score >= 0) AND (pass_score <= 100))),
  CONSTRAINT learning_courses_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'archived'::text])))
);

-- Table: learning_path_edges
CREATE TABLE public.learning_path_edges (
  id uuid DEFAULT gen_random_uuid(),
  path_id uuid NOT NULL,
  from_course_id uuid NOT NULL,
  to_course_id uuid NOT NULL,
  rule_json jsonb DEFAULT '{"type": "completed"}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT learning_path_edges_path_id_from_course_id_to_course_id_key UNIQUE (path_id, from_course_id, to_course_id)
);

-- Table: learning_path_nodes
CREATE TABLE public.learning_path_nodes (
  id uuid DEFAULT gen_random_uuid(),
  path_id uuid NOT NULL,
  course_id uuid NOT NULL,
  position_json jsonb DEFAULT '{"x": 0, "y": 0}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT learning_path_nodes_path_id_course_id_key UNIQUE (path_id, course_id)
);

-- Table: learning_path_translations
CREATE TABLE public.learning_path_translations (
  id uuid DEFAULT gen_random_uuid(),
  path_id uuid NOT NULL,
  locale text NOT NULL,
  title text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid,
  updated_by uuid,
  PRIMARY KEY (id),
  CONSTRAINT learning_path_translations_path_id_locale_key UNIQUE (path_id, locale),
  CONSTRAINT learning_path_translations_locale_check CHECK ((locale = ANY (ARRAY['sv'::text, 'en'::text, 'no'::text])))
);

-- Table: learning_paths
CREATE TABLE public.learning_paths (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid,
  slug text NOT NULL,
  title text NOT NULL,
  description text,
  status text DEFAULT 'draft'::text NOT NULL,
  kind text DEFAULT 'theme'::text NOT NULL,
  cover_image_url text,
  created_by uuid,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT learning_paths_tenant_id_slug_key UNIQUE (tenant_id, slug),
  CONSTRAINT learning_paths_kind_check CHECK ((kind = ANY (ARRAY['onboarding'::text, 'role'::text, 'theme'::text, 'compliance'::text]))),
  CONSTRAINT learning_paths_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'archived'::text])))
);

-- Table: learning_requirements
CREATE TABLE public.learning_requirements (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid,
  requirement_type text NOT NULL,
  target_ref jsonb NOT NULL,
  required_course_id uuid NOT NULL,
  required_status text DEFAULT 'completed'::text NOT NULL,
  priority integer DEFAULT 0,
  is_active boolean DEFAULT true,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT learning_requirements_required_status_check CHECK ((required_status = ANY (ARRAY['completed'::text, 'in_progress'::text]))),
  CONSTRAINT learning_requirements_requirement_type_check CHECK ((requirement_type = ANY (ARRAY['role_unlock'::text, 'activity_unlock'::text, 'game_unlock'::text, 'onboarding_required'::text])))
);

-- Table: learning_user_progress
CREATE TABLE public.learning_user_progress (
  id uuid DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  course_id uuid NOT NULL,
  status text DEFAULT 'not_started'::text NOT NULL,
  best_score integer,
  last_score integer,
  attempts_count integer DEFAULT 0,
  completed_at timestamptz,
  last_attempt_at timestamptz,
  rewards_granted_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT learning_user_progress_user_id_tenant_id_course_id_key UNIQUE (user_id, tenant_id, course_id),
  CONSTRAINT learning_user_progress_status_check CHECK ((status = ANY (ARRAY['not_started'::text, 'in_progress'::text, 'completed'::text, 'failed'::text])))
);

-- Table: legal_audit_log
CREATE TABLE public.legal_audit_log (
  id uuid DEFAULT gen_random_uuid(),
  scope text NOT NULL,
  tenant_id uuid,
  document_id uuid,
  actor_user_id uuid,
  event_type text NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT legal_audit_log_scope_check CHECK ((scope = ANY (ARRAY['global'::text, 'tenant'::text])))
);

-- Table: legal_document_drafts
CREATE TABLE public.legal_document_drafts (
  id uuid DEFAULT gen_random_uuid(),
  scope text NOT NULL,
  tenant_id uuid,
  type text NOT NULL,
  locale text NOT NULL,
  title text NOT NULL,
  content_markdown text NOT NULL,
  requires_acceptance boolean DEFAULT true NOT NULL,
  change_summary text DEFAULT ''::text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  updated_by uuid,
  PRIMARY KEY (id),
  CONSTRAINT legal_document_drafts_locale_check CHECK ((locale = ANY (ARRAY['no'::text, 'sv'::text, 'en'::text]))),
  CONSTRAINT legal_document_drafts_scope_check CHECK ((scope = ANY (ARRAY['global'::text, 'tenant'::text]))),
  CONSTRAINT legal_document_drafts_type_check CHECK ((type = ANY (ARRAY['terms'::text, 'privacy'::text, 'org_terms'::text, 'dpa'::text, 'cookie_policy'::text])))
);

-- Table: legal_documents
CREATE TABLE public.legal_documents (
  id uuid DEFAULT gen_random_uuid(),
  scope text NOT NULL,
  tenant_id uuid,
  type text NOT NULL,
  locale text NOT NULL,
  title text NOT NULL,
  content_markdown text NOT NULL,
  version_int integer NOT NULL,
  is_active boolean DEFAULT false NOT NULL,
  requires_acceptance boolean DEFAULT true NOT NULL,
  change_summary text NOT NULL,
  previous_version_id uuid,
  created_by uuid,
  created_at timestamptz DEFAULT now() NOT NULL,
  published_at timestamptz,
  PRIMARY KEY (id),
  CONSTRAINT legal_documents_locale_check CHECK ((locale = ANY (ARRAY['no'::text, 'sv'::text, 'en'::text]))),
  CONSTRAINT legal_documents_scope_check CHECK ((scope = ANY (ARRAY['global'::text, 'tenant'::text]))),
  CONSTRAINT legal_documents_type_check CHECK ((type = ANY (ARRAY['terms'::text, 'privacy'::text, 'org_terms'::text, 'dpa'::text, 'cookie_policy'::text])))
);

-- Table: limited_time_events
CREATE TABLE public.limited_time_events (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  event_type text NOT NULL,
  theme text,
  reward_type text NOT NULL,
  reward_amount integer NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  participant_count integer DEFAULT 0 NOT NULL,
  completion_count integer DEFAULT 0 NOT NULL,
  status text DEFAULT 'upcoming'::character varying NOT NULL,
  created_by_user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

-- Table: marketing_features
CREATE TABLE public.marketing_features (
  id uuid DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text,
  description text,
  icon_name text,
  image_url text,
  audience text DEFAULT 'all'::text NOT NULL,
  use_case text DEFAULT 'planning'::text NOT NULL,
  context text DEFAULT 'any'::text NOT NULL,
  tags text[] DEFAULT '{}'::text[] NOT NULL,
  related_games_count integer DEFAULT 0,
  priority integer DEFAULT 0 NOT NULL,
  is_featured boolean DEFAULT false NOT NULL,
  status text DEFAULT 'draft'::text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT marketing_features_audience_check CHECK ((audience = ANY (ARRAY['school'::text, 'business'::text, 'sports'::text, 'event'::text, 'all'::text]))),
  CONSTRAINT marketing_features_context_check CHECK ((context = ANY (ARRAY['indoor'::text, 'outdoor'::text, 'digital'::text, 'hybrid'::text, 'any'::text]))),
  CONSTRAINT marketing_features_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text]))),
  CONSTRAINT marketing_features_use_case_check CHECK ((use_case = ANY (ARRAY['planning'::text, 'execution'::text, 'export'::text, 'collaboration'::text, 'safety'::text])))
);

-- Table: marketing_updates
CREATE TABLE public.marketing_updates (
  id uuid DEFAULT gen_random_uuid(),
  type text DEFAULT 'feature'::text NOT NULL,
  title text NOT NULL,
  body text,
  image_url text,
  tags text[] DEFAULT '{}'::text[] NOT NULL,
  published_at timestamptz,
  status text DEFAULT 'draft'::text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT marketing_updates_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text]))),
  CONSTRAINT marketing_updates_type_check CHECK ((type = ANY (ARRAY['feature'::text, 'improvement'::text, 'fix'::text, 'milestone'::text, 'content'::text])))
);

-- Table: marketplace_analytics
CREATE TABLE public.marketplace_analytics (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  date date DEFAULT CURRENT_DATE,
  total_purchases integer DEFAULT 0,
  total_revenue numeric DEFAULT 0,
  unique_buyers integer DEFAULT 0,
  average_purchase_value numeric DEFAULT 0,
  most_popular_item_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT marketplace_analytics_tenant_id_date_key UNIQUE (tenant_id, date)
);

-- Table: media
CREATE TABLE public.media (
  id uuid DEFAULT gen_random_uuid(),
  media_key text,
  name text NOT NULL,
  type public.media_type_enum NOT NULL,
  product_id uuid,
  purpose_id uuid,
  game_id uuid,
  url text NOT NULL,
  alt_text text,
  created_at timestamptz DEFAULT now() NOT NULL,
  tenant_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  PRIMARY KEY (id),
  CONSTRAINT media_media_key_key UNIQUE (media_key)
);

-- Table: media_ai_generations
CREATE TABLE public.media_ai_generations (
  id uuid DEFAULT gen_random_uuid(),
  media_id uuid NOT NULL,
  tenant_id uuid,
  user_id uuid,
  prompt text NOT NULL,
  model text NOT NULL,
  model_version text,
  seed integer,
  parameters jsonb DEFAULT '{}'::jsonb,
  revision integer DEFAULT 1 NOT NULL,
  generation_time_ms integer,
  cost_credits integer,
  status text DEFAULT 'pending'::text NOT NULL,
  error_message text,
  created_at timestamptz DEFAULT now() NOT NULL,
  completed_at timestamptz,
  PRIMARY KEY (id)
);

-- Table: media_templates
CREATE TABLE public.media_templates (
  id uuid DEFAULT gen_random_uuid(),
  template_key text NOT NULL,
  name text NOT NULL,
  description text,
  product_id uuid,
  main_purpose_id uuid,
  sub_purpose_id uuid,
  media_id uuid NOT NULL,
  priority integer DEFAULT 0 NOT NULL,
  is_default boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT media_templates_template_key_key UNIQUE (template_key)
);

-- Table: mfa_audit_log
CREATE TABLE public.mfa_audit_log (
  id uuid DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tenant_id uuid,
  event_type text NOT NULL,
  method text,
  ip_address inet,
  user_agent text,
  device_fingerprint text,
  success boolean DEFAULT true NOT NULL,
  failure_reason text,
  failure_count integer,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT mfa_audit_log_event_type_check CHECK ((event_type = ANY (ARRAY['enrollment_started'::text, 'enrollment_completed'::text, 'enrollment_cancelled'::text, 'verification_success'::text, 'verification_failed'::text, 'disabled_by_user'::text, 'disabled_by_admin'::text, 'recovery_code_generated'::text, 'recovery_code_used'::text, 'device_trusted'::text, 'device_revoked'::text, 'enforcement_triggered'::text, 'grace_period_warning'::text]))),
  CONSTRAINT mfa_audit_log_method_check CHECK ((method = ANY (ARRAY['totp'::text, 'recovery_code'::text, 'sms'::text, 'webauthn'::text, NULL::text])))
);

-- Table: mfa_trusted_devices
CREATE TABLE public.mfa_trusted_devices (
  id uuid DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  device_fingerprint text NOT NULL,
  device_name text,
  user_agent text,
  ip_address inet,
  browser text,
  os text,
  trust_token_hash text NOT NULL,
  trusted_at timestamptz DEFAULT now() NOT NULL,
  expires_at timestamptz NOT NULL,
  last_used_at timestamptz,
  is_revoked boolean DEFAULT false NOT NULL,
  revoked_at timestamptz,
  revoked_reason text,
  created_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT mfa_trusted_devices_user_id_tenant_id_device_fingerprint_key UNIQUE (user_id, tenant_id, device_fingerprint)
);

-- Table: migration_log
CREATE TABLE public.migration_log (
  id uuid DEFAULT gen_random_uuid(),
  migration_name text NOT NULL,
  executed_at timestamptz DEFAULT now() NOT NULL,
  notes text,
  PRIMARY KEY (id),
  CONSTRAINT migration_log_migration_name_key UNIQUE (migration_name)
);

-- Table: moderation_actions
CREATE TABLE public.moderation_actions (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  taken_by_user_id uuid NOT NULL,
  action_type text NOT NULL,
  target_user_id uuid,
  target_content_id text,
  reason text NOT NULL,
  duration_minutes integer,
  severity text DEFAULT 'warning'::character varying NOT NULL,
  is_appealable boolean DEFAULT true NOT NULL,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

-- Table: moderation_analytics
CREATE TABLE public.moderation_analytics (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  date date NOT NULL,
  total_reports integer DEFAULT 0 NOT NULL,
  pending_reports integer DEFAULT 0 NOT NULL,
  resolved_reports integer DEFAULT 0 NOT NULL,
  actions_taken integer DEFAULT 0 NOT NULL,
  users_warned integer DEFAULT 0 NOT NULL,
  users_suspended integer DEFAULT 0 NOT NULL,
  users_banned integer DEFAULT 0 NOT NULL,
  average_resolution_time_hours numeric,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT moderation_analytics_tenant_id_date_key UNIQUE (tenant_id, date)
);

-- Table: moderation_queue
CREATE TABLE public.moderation_queue (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  report_id uuid NOT NULL,
  priority text DEFAULT 'normal'::character varying NOT NULL,
  assigned_to_user_id uuid,
  status text DEFAULT 'pending'::character varying NOT NULL,
  assigned_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

-- Table: multiplayer_participants
CREATE TABLE public.multiplayer_participants (
  id uuid DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  user_id uuid NOT NULL,
  score integer,
  placement integer,
  joined_at timestamp DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT multiplayer_participants_session_id_user_id_key UNIQUE (session_id, user_id)
);

-- Table: multiplayer_sessions
CREATE TABLE public.multiplayer_sessions (
  id uuid DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL,
  created_by_user_id uuid NOT NULL,
  max_players integer DEFAULT 2 NOT NULL,
  current_players integer DEFAULT 1,
  status varchar(50) DEFAULT 'waiting'::character varying,
  started_at timestamp,
  ended_at timestamp,
  winner_user_id uuid,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  PRIMARY KEY (id)
);

-- Table: notification_deliveries
CREATE TABLE public.notification_deliveries (
  id uuid DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL,
  user_id uuid NOT NULL,
  read_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  delivered_at timestamptz DEFAULT now() NOT NULL,
  dismissed_at timestamptz,
  PRIMARY KEY (id),
  CONSTRAINT notification_read_status_notification_id_user_id_key UNIQUE (notification_id, user_id)
);

-- Table: notification_log
CREATE TABLE public.notification_log (
  id uuid DEFAULT gen_random_uuid(),
  notification_id uuid,
  user_id uuid,
  delivery_method varchar(50),
  status varchar(50) DEFAULT 'pending'::character varying,
  sent_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (id)
);

-- Table: notification_preferences
CREATE TABLE public.notification_preferences (
  id uuid DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tenant_id uuid,
  email_enabled boolean DEFAULT true,
  push_enabled boolean DEFAULT true,
  sms_enabled boolean DEFAULT false,
  in_app_enabled boolean DEFAULT true,
  billing_notifications boolean DEFAULT true,
  gameplay_notifications boolean DEFAULT true,
  achievement_notifications boolean DEFAULT true,
  support_notifications boolean DEFAULT true,
  system_notifications boolean DEFAULT true,
  digest_frequency varchar(50) DEFAULT 'realtime'::character varying,
  quiet_hours_start time without time zone,
  quiet_hours_end time without time zone,
  quiet_hours_enabled boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT notification_preferences_user_id_tenant_id_key UNIQUE (user_id, tenant_id)
);

-- Table: notification_template_translations
CREATE TABLE public.notification_template_translations (
  id uuid DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL,
  locale text NOT NULL,
  title_template text NOT NULL,
  message_template text NOT NULL,
  action_label text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid,
  updated_by uuid,
  PRIMARY KEY (id),
  CONSTRAINT notification_template_translations_template_id_locale_key UNIQUE (template_id, locale),
  CONSTRAINT notification_template_translations_locale_check CHECK ((locale = ANY (ARRAY['sv'::text, 'en'::text, 'no'::text])))
);

-- Table: notification_templates
CREATE TABLE public.notification_templates (
  id uuid DEFAULT gen_random_uuid(),
  template_key text NOT NULL,
  tenant_id uuid,
  name text NOT NULL,
  description text,
  title_template text NOT NULL,
  message_template text NOT NULL,
  type text DEFAULT 'info'::text NOT NULL,
  category text DEFAULT 'support'::text NOT NULL,
  action_url_template text,
  action_label text,
  is_active boolean DEFAULT true NOT NULL,
  is_system boolean DEFAULT false NOT NULL,
  created_by uuid,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT notification_templates_template_key_key UNIQUE (template_key)
);

-- Table: notifications
CREATE TABLE public.notifications (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid,
  user_id uuid,
  title varchar(255) NOT NULL,
  message text NOT NULL,
  type varchar(50) DEFAULT 'info'::character varying NOT NULL,
  category varchar(50),
  related_entity_id uuid,
  related_entity_type varchar(50),
  action_url varchar(512),
  action_label varchar(100),
  is_read boolean DEFAULT false,
  read_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  event_key text,
  scope text DEFAULT 'tenant'::text NOT NULL,
  schedule_at timestamptz,
  status text DEFAULT 'draft'::text NOT NULL,
  created_by uuid,
  sent_at timestamptz,
  PRIMARY KEY (id),
  CONSTRAINT notifications_scope_check CHECK ((scope = ANY (ARRAY['all'::text, 'tenant'::text]))),
  CONSTRAINT notifications_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'scheduled'::text, 'sent'::text, 'cancelled'::text])))
);

-- Table: org_legal_acceptances
CREATE TABLE public.org_legal_acceptances (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  document_id uuid NOT NULL,
  accepted_by uuid NOT NULL,
  accepted_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT org_legal_acceptances_tenant_id_document_id_key UNIQUE (tenant_id, document_id)
);

-- Table: page_views
CREATE TABLE public.page_views (
  id uuid DEFAULT gen_random_uuid(),
  page_view_key text,
  user_id uuid,
  tenant_id uuid,
  page_path text NOT NULL,
  page_title text,
  referrer text,
  duration_seconds integer,
  device_type text,
  browser_name text,
  browser_version text,
  os_name text,
  os_version text,
  ip_address text,
  country_code text,
  region text,
  created_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT page_views_page_view_key_key UNIQUE (page_view_key)
);

-- Table: participant_achievement_unlocks
CREATE TABLE public.participant_achievement_unlocks (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  session_id uuid NOT NULL,
  participant_id uuid NOT NULL,
  game_progress_id uuid,
  achievement_id uuid NOT NULL,
  achievement_name varchar(255) NOT NULL,
  achievement_points integer DEFAULT 0,
  rarity varchar(20),
  unlock_context jsonb DEFAULT '{}'::jsonb,
  unlocked_at timestamptz DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT participant_achievement_unloc_participant_id_achievement_id_key UNIQUE (participant_id, achievement_id)
);

-- Table: participant_activity_log
CREATE TABLE public.participant_activity_log (
  id uuid DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  participant_id uuid,
  event_type text NOT NULL,
  event_data jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT valid_participant_event_type CHECK ((length(event_type) > 0))
);

-- Table: participant_game_progress
CREATE TABLE public.participant_game_progress (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  session_id uuid NOT NULL,
  participant_id uuid NOT NULL,
  game_id uuid NOT NULL,
  status varchar(20) DEFAULT 'not_started'::character varying NOT NULL,
  score integer DEFAULT 0,
  max_score integer,
  progress_percentage numeric DEFAULT 0.00,
  time_spent_seconds integer DEFAULT 0,
  current_level integer,
  current_checkpoint varchar(100),
  game_data jsonb DEFAULT '{}'::jsonb,
  achievements_unlocked uuid[] DEFAULT ARRAY[]::uuid[],
  achievement_count integer DEFAULT 0,
  started_at timestamptz,
  completed_at timestamptz,
  last_updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT participant_game_progress_participant_id_game_id_key UNIQUE (participant_id, game_id),
  CONSTRAINT valid_progress_percentage CHECK (((progress_percentage >= (0)::numeric) AND (progress_percentage <= (100)::numeric))),
  CONSTRAINT valid_score CHECK ((score >= 0)),
  CONSTRAINT valid_time_spent CHECK ((time_spent_seconds >= 0))
);

-- Table: participant_role_assignments
CREATE TABLE public.participant_role_assignments (
  id uuid DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  participant_id uuid NOT NULL,
  session_role_id uuid NOT NULL,
  assigned_at timestamptz DEFAULT now() NOT NULL,
  assigned_by uuid,
  revealed_at timestamptz,
  secret_instructions_revealed_at timestamptz,
  PRIMARY KEY (id),
  CONSTRAINT participant_role_assignments_session_id_participant_id_role_key UNIQUE (session_id, participant_id, session_role_id)
);

-- Table: participant_sessions
CREATE TABLE public.participant_sessions (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  host_user_id uuid NOT NULL,
  session_code text NOT NULL,
  display_name text NOT NULL,
  description text,
  status public.participant_session_status DEFAULT 'draft'::public.participant_session_status NOT NULL,
  started_at timestamptz,
  paused_at timestamptz,
  ended_at timestamptz,
  expires_at timestamptz,
  archived_at timestamptz,
  settings jsonb DEFAULT '{"enable_chat": false, "allow_rejoin": true, "allow_anonymous": true, "max_participants": 100, "require_approval": false, "token_expiry_hours": 24, "enable_progress_tracking": true}'::jsonb NOT NULL,
  plan_id uuid,
  game_id uuid,
  participant_count integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  current_step_index integer DEFAULT 0,
  current_phase_index integer DEFAULT 0,
  timer_state jsonb,
  board_state jsonb,
  secret_instructions_unlocked_at timestamptz,
  secret_instructions_unlocked_by uuid,
  game_snapshot_id uuid,
  broadcast_seq bigint DEFAULT 0 NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT participant_sessions_session_code_key UNIQUE (session_code),
  CONSTRAINT valid_dates CHECK (((started_at IS NULL) OR (((ended_at IS NULL) OR (ended_at >= started_at)) AND ((paused_at IS NULL) OR (paused_at >= started_at)) AND ((archived_at IS NULL) OR (archived_at >= started_at))))),
  CONSTRAINT valid_participant_count CHECK ((participant_count >= 0)),
  CONSTRAINT valid_participant_session_dates CHECK ((((ended_at IS NULL) OR (ended_at >= started_at)) AND ((paused_at IS NULL) OR (paused_at >= started_at)) AND ((archived_at IS NULL) OR (archived_at >= started_at))))
);

-- Table: participant_token_quotas
CREATE TABLE public.participant_token_quotas (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  no_expiry_tokens_used integer DEFAULT 0 NOT NULL,
  no_expiry_tokens_limit integer DEFAULT 2 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT unique_tenant_quota UNIQUE (tenant_id),
  CONSTRAINT valid_participant_quota CHECK (((no_expiry_tokens_used >= 0) AND (no_expiry_tokens_limit >= 0)))
);

-- Table: participants
CREATE TABLE public.participants (
  id uuid DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  display_name text NOT NULL,
  participant_token text NOT NULL,
  avatar_url text,
  role public.participant_role DEFAULT 'player'::public.participant_role NOT NULL,
  status public.participant_status DEFAULT 'active'::public.participant_status NOT NULL,
  joined_at timestamptz DEFAULT now() NOT NULL,
  last_seen_at timestamptz DEFAULT now() NOT NULL,
  disconnected_at timestamptz,
  token_expires_at timestamptz,
  progress jsonb DEFAULT '{"score": 0, "games_completed": 0, "time_active_seconds": 0, "achievements_unlocked": []}'::jsonb NOT NULL,
  user_agent text,
  ip_address inet,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT participants_participant_token_key UNIQUE (participant_token),
  CONSTRAINT valid_participant_display_name CHECK (((length(display_name) >= 1) AND (length(display_name) <= 50))),
  CONSTRAINT valid_participant_token_expiry CHECK (((token_expires_at IS NULL) OR (token_expires_at > joined_at)))
);

-- Table: payment_failures
CREATE TABLE public.payment_failures (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  subscription_id text,
  invoice_id text,
  stripe_customer_id text,
  failure_code text,
  failure_message text,
  amount integer NOT NULL,
  currency text DEFAULT 'sek'::text NOT NULL,
  retry_count integer DEFAULT 0 NOT NULL,
  max_retries integer DEFAULT 3 NOT NULL,
  next_retry_at timestamptz,
  last_retry_at timestamptz,
  status text DEFAULT 'pending'::text NOT NULL,
  resolved_at timestamptz,
  resolution_method text,
  notification_sent_at timestamptz,
  reminder_count integer DEFAULT 0 NOT NULL,
  grace_period_ends_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

-- Table: payment_methods
CREATE TABLE public.payment_methods (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  stripe_payment_method_id text,
  type text DEFAULT 'card'::text NOT NULL,
  card_brand text,
  card_last_four text,
  card_exp_month integer,
  card_exp_year integer,
  is_default boolean DEFAULT false,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  PRIMARY KEY (id)
);

-- Table: payments
CREATE TABLE public.payments (
  id uuid DEFAULT gen_random_uuid(),
  payment_key text,
  name text NOT NULL,
  invoice_id uuid NOT NULL,
  amount numeric NOT NULL,
  currency text DEFAULT 'NOK'::text NOT NULL,
  status public.payment_status_enum DEFAULT 'pending'::public.payment_status_enum NOT NULL,
  provider text,
  transaction_reference text,
  paid_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT payments_payment_key_key UNIQUE (payment_key)
);

-- Table: personalization_events
CREATE TABLE public.personalization_events (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  event_type varchar(50) NOT NULL,
  item_type varchar(50),
  item_id uuid,
  item_title varchar(255),
  event_metadata jsonb,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (id)
);

-- Table: plan_blocks
CREATE TABLE public.plan_blocks (
  id uuid DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL,
  position integer NOT NULL,
  block_type public.plan_block_type_enum NOT NULL,
  game_id uuid,
  duration_minutes integer,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  title text,
  metadata jsonb DEFAULT '{}'::jsonb,
  is_optional boolean DEFAULT false,
  created_by uuid,
  updated_by uuid,
  PRIMARY KEY (id),
  CONSTRAINT plan_blocks_plan_id_position_key UNIQUE (plan_id, position)
);

-- Table: plan_notes_private
CREATE TABLE public.plan_notes_private (
  id uuid DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL,
  content text NOT NULL,
  created_by uuid NOT NULL,
  updated_by uuid NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT plan_notes_private_plan_id_created_by_key UNIQUE (plan_id, created_by)
);

-- Table: plan_notes_tenant
CREATE TABLE public.plan_notes_tenant (
  id uuid DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  content text NOT NULL,
  created_by uuid NOT NULL,
  updated_by uuid NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT plan_notes_tenant_plan_id_tenant_id_key UNIQUE (plan_id, tenant_id)
);

-- Table: plan_play_progress
CREATE TABLE public.plan_play_progress (
  id uuid DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL,
  user_id uuid NOT NULL,
  current_block_id uuid,
  current_position integer,
  status public.plan_run_status_enum DEFAULT 'not_started'::public.plan_run_status_enum NOT NULL,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT plan_play_progress_plan_id_user_id_key UNIQUE (plan_id, user_id)
);

-- Table: plan_version_blocks
CREATE TABLE public.plan_version_blocks (
  id uuid DEFAULT gen_random_uuid(),
  plan_version_id uuid NOT NULL,
  position integer NOT NULL,
  block_type public.plan_block_type_enum NOT NULL,
  duration_minutes integer DEFAULT 0 NOT NULL,
  title text,
  notes text,
  is_optional boolean DEFAULT false,
  game_id uuid,
  game_snapshot jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  PRIMARY KEY (id)
);

-- Table: plan_versions
CREATE TABLE public.plan_versions (
  id uuid DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL,
  version_number integer NOT NULL,
  name text NOT NULL,
  description text,
  total_time_minutes integer DEFAULT 0 NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  published_at timestamptz DEFAULT now() NOT NULL,
  published_by uuid NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT plan_versions_plan_id_version_number_key UNIQUE (plan_id, version_number)
);

-- Table: plans
CREATE TABLE public.plans (
  id uuid DEFAULT gen_random_uuid(),
  plan_key text,
  name text NOT NULL,
  description text,
  owner_user_id uuid NOT NULL,
  owner_tenant_id uuid,
  visibility public.plan_visibility_enum DEFAULT 'private'::public.plan_visibility_enum NOT NULL,
  total_time_minutes integer,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_by uuid,
  updated_by uuid,
  status text DEFAULT 'draft'::text NOT NULL,
  current_version_id uuid,
  PRIMARY KEY (id),
  CONSTRAINT plans_plan_key_key UNIQUE (plan_key),
  CONSTRAINT plans_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'modified'::text, 'archived'::text])))
);

-- Table: play_chat_messages
CREATE TABLE public.play_chat_messages (
  id uuid DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  visibility text NOT NULL,
  message text NOT NULL,
  anonymous boolean DEFAULT false NOT NULL,
  sender_participant_id uuid,
  sender_user_id uuid,
  sender_name text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  recipient_participant_id uuid,
  PRIMARY KEY (id),
  CONSTRAINT play_chat_messages_visibility_check CHECK ((visibility = ANY (ARRAY['public'::text, 'host'::text])))
);

-- Table: player_cosmetics
CREATE TABLE public.player_cosmetics (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  shop_item_id uuid NOT NULL,
  is_equipped boolean DEFAULT false,
  equipped_at timestamptz,
  acquired_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (id)
);

-- Table: private_subscriptions
CREATE TABLE public.private_subscriptions (
  id uuid DEFAULT gen_random_uuid(),
  subscription_key text,
  user_id uuid NOT NULL,
  billing_product_id uuid NOT NULL,
  status public.subscription_status_enum DEFAULT 'trial'::public.subscription_status_enum NOT NULL,
  start_date date NOT NULL,
  renewal_date date,
  cancelled_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  stripe_subscription_id text,
  PRIMARY KEY (id),
  CONSTRAINT private_subscriptions_subscription_key_key UNIQUE (subscription_key)
);

-- Table: product_audit_log
CREATE TABLE public.product_audit_log (
  id uuid DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  event_type text NOT NULL,
  event_data jsonb DEFAULT '{}'::jsonb NOT NULL,
  actor_id uuid,
  actor_email text,
  created_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT product_audit_log_event_type_check CHECK ((event_type = ANY (ARRAY['created'::text, 'status_changed'::text, 'field_updated'::text, 'price_created'::text, 'price_updated'::text, 'price_deleted'::text, 'default_price_changed'::text, 'stripe_synced'::text, 'stripe_sync_failed'::text, 'archived'::text, 'restored'::text])))
);

-- Table: product_prices
CREATE TABLE public.product_prices (
  id uuid DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  stripe_price_id text,
  amount integer NOT NULL,
  currency text DEFAULT 'NOK'::text NOT NULL,
  interval text NOT NULL,
  interval_count integer DEFAULT 1,
  tax_behavior text DEFAULT 'exclusive'::text,
  billing_model text DEFAULT 'per_seat'::text,
  nickname text,
  is_default boolean DEFAULT false,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  lookup_key text,
  trial_period_days integer DEFAULT 0,
  PRIMARY KEY (id),
  CONSTRAINT product_prices_stripe_price_id_key UNIQUE (stripe_price_id),
  CONSTRAINT product_prices_billing_model_check CHECK ((billing_model = ANY (ARRAY['per_seat'::text, 'per_tenant'::text, 'per_user'::text, 'flat'::text]))),
  CONSTRAINT product_prices_currency_check CHECK ((currency = ANY (ARRAY['NOK'::text, 'SEK'::text, 'EUR'::text]))),
  CONSTRAINT product_prices_interval_check CHECK (("interval" = ANY (ARRAY['month'::text, 'year'::text, 'one_time'::text]))),
  CONSTRAINT product_prices_tax_behavior_check CHECK ((tax_behavior = ANY (ARRAY['inclusive'::text, 'exclusive'::text, 'unspecified'::text]))),
  CONSTRAINT product_prices_trial_check CHECK ((trial_period_days >= 0))
);

-- Table: product_purposes
CREATE TABLE public.product_purposes (
  product_id uuid,
  purpose_id uuid,
  PRIMARY KEY (product_id, purpose_id)
);

-- Table: product_usage_pricing
CREATE TABLE public.product_usage_pricing (
  id uuid DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  meter_id uuid NOT NULL,
  unit_price integer NOT NULL,
  included_units integer DEFAULT 0 NOT NULL,
  pricing_tiers jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT product_usage_pricing_unique UNIQUE (product_id, meter_id)
);

-- Table: products
CREATE TABLE public.products (
  id uuid DEFAULT gen_random_uuid(),
  product_key text NOT NULL,
  name text NOT NULL,
  category text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  status text DEFAULT 'active'::text NOT NULL,
  capabilities jsonb DEFAULT '[]'::jsonb NOT NULL,
  stripe_product_id text,
  stripe_default_price_id text,
  stripe_sync_status text DEFAULT 'unsynced'::text,
  stripe_last_synced_at timestamptz,
  stripe_sync_error text,
  internal_description text,
  customer_description text,
  product_type text DEFAULT 'license'::text,
  unit_label text DEFAULT 'seat'::text,
  statement_descriptor text,
  image_url text,
  target_audience text DEFAULT 'all'::text,
  feature_tier text DEFAULT 'standard'::text,
  min_seats integer DEFAULT 1,
  max_seats integer DEFAULT 100,
  is_bundle boolean DEFAULT false NOT NULL,
  category_slug text,
  is_marketing_visible boolean DEFAULT true NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT products_product_key_key UNIQUE (product_key),
  CONSTRAINT products_stripe_product_id_key UNIQUE (stripe_product_id),
  CONSTRAINT products_feature_tier_check CHECK ((feature_tier = ANY (ARRAY['free'::text, 'basic'::text, 'standard'::text, 'pro'::text, 'enterprise'::text]))),
  CONSTRAINT products_product_type_check CHECK ((product_type = ANY (ARRAY['license'::text, 'addon'::text, 'consumable'::text, 'one_time'::text, 'bundle'::text]))),
  CONSTRAINT products_seats_range_check CHECK (((min_seats >= 1) AND (max_seats >= min_seats))),
  CONSTRAINT products_statement_descriptor_length CHECK (((statement_descriptor IS NULL) OR (length(statement_descriptor) <= 22))),
  CONSTRAINT products_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'archived'::text]))),
  CONSTRAINT products_stripe_sync_status_check CHECK ((stripe_sync_status = ANY (ARRAY['unsynced'::text, 'synced'::text, 'drift'::text, 'error'::text, 'locked'::text]))),
  CONSTRAINT products_target_audience_check CHECK ((target_audience = ANY (ARRAY['all'::text, 'school'::text, 'club'::text, 'individual'::text, 'enterprise'::text]))),
  CONSTRAINT products_unit_label_check CHECK ((unit_label = ANY (ARRAY['seat'::text, 'license'::text, 'user'::text])))
);

-- Table: promo_codes
CREATE TABLE public.promo_codes (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  code text NOT NULL,
  discount_percentage numeric,
  discount_amount numeric,
  max_uses integer,
  times_used integer DEFAULT 0,
  valid_from timestamptz NOT NULL,
  valid_until timestamptz NOT NULL,
  is_active boolean DEFAULT true,
  created_by_user_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT promo_codes_tenant_id_code_key UNIQUE (tenant_id, code)
);

-- Table: purchase_intents
CREATE TABLE public.purchase_intents (
  id uuid DEFAULT gen_random_uuid(),
  kind text DEFAULT 'organisation_subscription'::text NOT NULL,
  status text DEFAULT 'draft'::text NOT NULL,
  email text,
  user_id uuid,
  tenant_name text,
  tenant_id uuid,
  product_id uuid,
  product_price_id uuid,
  quantity_seats integer DEFAULT 1 NOT NULL,
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_checkout_session_id text,
  metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT purchase_intents_kind_chk CHECK ((kind = ANY (ARRAY['organisation_subscription'::text, 'user_subscription'::text, 'one_time'::text]))),
  CONSTRAINT purchase_intents_quantity_seats_chk CHECK ((quantity_seats >= 1)),
  CONSTRAINT purchase_intents_status_chk CHECK ((status = ANY (ARRAY['draft'::text, 'awaiting_payment'::text, 'paid'::text, 'provisioned'::text, 'failed'::text, 'expired'::text])))
);

-- Table: purposes
CREATE TABLE public.purposes (
  id uuid DEFAULT gen_random_uuid(),
  purpose_key text,
  name text NOT NULL,
  type public.purpose_type_enum NOT NULL,
  parent_id uuid,
  created_at timestamptz DEFAULT now() NOT NULL,
  tenant_id uuid,
  is_standard boolean DEFAULT false NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT purposes_purpose_key_key UNIQUE (purpose_key)
);

-- Table: quote_activities
CREATE TABLE public.quote_activities (
  id uuid DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL,
  activity_type text NOT NULL,
  activity_data jsonb DEFAULT '{}'::jsonb,
  performed_by uuid,
  created_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

-- Table: quote_line_items
CREATE TABLE public.quote_line_items (
  id uuid DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL,
  product_id uuid,
  product_price_id uuid,
  name text NOT NULL,
  description text,
  quantity integer DEFAULT 1 NOT NULL,
  unit_price integer NOT NULL,
  discount_percent numeric DEFAULT 0,
  total_price integer NOT NULL,
  billing_type text DEFAULT 'recurring'::text NOT NULL,
  billing_interval text,
  position integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

-- Table: quotes
CREATE TABLE public.quotes (
  id uuid DEFAULT gen_random_uuid(),
  quote_number text NOT NULL,
  tenant_id uuid,
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  company_name text NOT NULL,
  title text NOT NULL,
  description text,
  currency text DEFAULT 'sek'::text NOT NULL,
  subtotal integer DEFAULT 0 NOT NULL,
  discount_amount integer DEFAULT 0 NOT NULL,
  discount_percent numeric,
  tax_amount integer DEFAULT 0 NOT NULL,
  total_amount integer DEFAULT 0 NOT NULL,
  valid_until date NOT NULL,
  payment_terms text DEFAULT 'net_30'::text,
  contract_length_months integer DEFAULT 12,
  status text DEFAULT 'draft'::text NOT NULL,
  accepted_at timestamptz,
  accepted_by text,
  signature_data text,
  created_by uuid NOT NULL,
  assigned_to uuid,
  notes_internal text,
  converted_to_invoice_id uuid,
  converted_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT quotes_quote_number_key UNIQUE (quote_number)
);

-- Table: recommendation_history
CREATE TABLE public.recommendation_history (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  recommendation_id uuid DEFAULT gen_random_uuid(),
  item_type varchar(50),
  item_id uuid,
  item_title varchar(255),
  reason varchar(255),
  confidence_score double precision DEFAULT 0.5,
  rank_position integer,
  was_clicked boolean DEFAULT false,
  was_completed boolean DEFAULT false,
  interaction_timestamp timestamptz,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  PRIMARY KEY (id)
);

-- Table: role_permissions
CREATE TABLE public.role_permissions (
  id uuid DEFAULT gen_random_uuid(),
  role public.tenant_role_enum NOT NULL,
  scope text NOT NULL,
  resource text NOT NULL,
  action text NOT NULL,
  allowed boolean DEFAULT true NOT NULL,
  metadata jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

-- Table: run_sessions
CREATE TABLE public.run_sessions (
  id uuid DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL,
  step_index integer NOT NULL,
  session_id uuid,
  status text DEFAULT 'created'::text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT run_sessions_run_id_step_index_key UNIQUE (run_id, step_index),
  CONSTRAINT run_sessions_status_check CHECK ((status = ANY (ARRAY['created'::text, 'active'::text, 'completed'::text, 'ended'::text, 'abandoned'::text])))
);

-- Table: runs
CREATE TABLE public.runs (
  id uuid DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL,
  plan_version_id uuid NOT NULL,
  user_id uuid NOT NULL,
  tenant_id uuid,
  status public.plan_run_status_enum DEFAULT 'not_started'::public.plan_run_status_enum NOT NULL,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  current_step_index integer DEFAULT 0,
  elapsed_seconds integer DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_heartbeat_at timestamptz,
  PRIMARY KEY (id)
);

-- Table: saved_items
CREATE TABLE public.saved_items (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  item_type varchar(50) NOT NULL,
  item_id uuid NOT NULL,
  item_title varchar(255),
  item_metadata jsonb,
  saved_at timestamptz DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT saved_items_tenant_id_user_id_item_type_item_id_key UNIQUE (tenant_id, user_id, item_type, item_id)
);

-- Table: scheduled_job_runs
CREATE TABLE public.scheduled_job_runs (
  id uuid DEFAULT gen_random_uuid(),
  job_name text NOT NULL,
  status text DEFAULT 'success'::text NOT NULL,
  result jsonb,
  error_message text,
  started_at timestamptz DEFAULT now() NOT NULL,
  completed_at timestamptz,
  duration_ms integer,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT scheduled_job_runs_status_check CHECK ((status = ANY (ARRAY['success'::text, 'error'::text, 'running'::text])))
);

-- Table: seasonal_achievements
CREATE TABLE public.seasonal_achievements (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  season_name text NOT NULL,
  season_number integer NOT NULL,
  achievement_id uuid NOT NULL,
  rarity text DEFAULT 'common'::character varying NOT NULL,
  exclusive_to_season boolean DEFAULT true NOT NULL,
  reward_bonus_percent integer DEFAULT 0 NOT NULL,
  released_at timestamptz NOT NULL,
  available_until timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT seasonal_achievements_tenant_id_season_name_achievement_id_key UNIQUE (tenant_id, season_name, achievement_id)
);

-- Table: seasonal_events
CREATE TABLE public.seasonal_events (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  theme text,
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  reward_multiplier numeric DEFAULT 1.0,
  featured_content_id uuid,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (id)
);

-- Table: session_analytics
CREATE TABLE public.session_analytics (
  id uuid DEFAULT gen_random_uuid(),
  session_key text,
  user_id uuid,
  tenant_id uuid,
  game_id uuid,
  session_duration integer NOT NULL,
  pages_visited integer DEFAULT 0 NOT NULL,
  actions_count integer DEFAULT 0 NOT NULL,
  score integer,
  completed boolean DEFAULT false NOT NULL,
  exit_page text,
  device_type text,
  referrer text,
  entry_point text,
  created_at timestamptz DEFAULT now() NOT NULL,
  ended_at timestamptz,
  PRIMARY KEY (id),
  CONSTRAINT session_analytics_session_key_key UNIQUE (session_key)
);

-- Table: session_artifact_assignments
CREATE TABLE public.session_artifact_assignments (
  id uuid DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  participant_id uuid NOT NULL,
  session_artifact_variant_id uuid NOT NULL,
  assigned_at timestamptz DEFAULT now() NOT NULL,
  assigned_by uuid,
  PRIMARY KEY (id),
  CONSTRAINT session_artifact_assignments_session_id_participant_id_sess_key UNIQUE (session_id, participant_id, session_artifact_variant_id)
);

-- Table: session_artifact_state
CREATE TABLE public.session_artifact_state (
  id uuid DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  game_artifact_id uuid NOT NULL,
  state jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT session_artifact_state_unique UNIQUE (session_id, game_artifact_id)
);

-- Table: session_artifact_variant_assignments_v2
CREATE TABLE public.session_artifact_variant_assignments_v2 (
  id uuid DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  participant_id uuid NOT NULL,
  game_artifact_variant_id uuid NOT NULL,
  assigned_by uuid,
  assigned_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT session_artifact_variant_assignments_v2_unique UNIQUE (session_id, participant_id, game_artifact_variant_id)
);

-- Table: session_artifact_variant_state
CREATE TABLE public.session_artifact_variant_state (
  id uuid DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  game_artifact_variant_id uuid NOT NULL,
  revealed_at timestamptz,
  highlighted_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT session_artifact_variant_state_unique UNIQUE (session_id, game_artifact_variant_id)
);

-- Table: session_artifact_variants
CREATE TABLE public.session_artifact_variants (
  id uuid DEFAULT gen_random_uuid(),
  session_artifact_id uuid NOT NULL,
  source_variant_id uuid,
  visibility text DEFAULT 'public'::text NOT NULL,
  visible_to_session_role_id uuid,
  title text,
  body text,
  media_ref uuid,
  variant_order integer DEFAULT 0 NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  revealed_at timestamptz,
  highlighted_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT session_artifact_variants_visibility_check CHECK ((visibility = ANY (ARRAY['public'::text, 'leader_only'::text, 'role_private'::text])))
);

-- Table: session_artifacts
CREATE TABLE public.session_artifacts (
  id uuid DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  source_artifact_id uuid,
  title text NOT NULL,
  description text,
  artifact_type text DEFAULT 'card'::text NOT NULL,
  artifact_order integer DEFAULT 0 NOT NULL,
  tags text[] DEFAULT '{}'::text[],
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

-- Table: session_commands
CREATE TABLE public.session_commands (
  id uuid DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  issued_by uuid NOT NULL,
  command_type text NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb NOT NULL,
  client_id text NOT NULL,
  client_seq bigint NOT NULL,
  applied boolean DEFAULT false NOT NULL,
  applied_at timestamptz,
  error text,
  created_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

-- Table: session_decisions
CREATE TABLE public.session_decisions (
  id uuid DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  title text NOT NULL,
  prompt text,
  decision_type text DEFAULT 'single_choice'::text NOT NULL,
  options jsonb DEFAULT '[]'::jsonb NOT NULL,
  max_choices integer DEFAULT 1 NOT NULL,
  status text DEFAULT 'draft'::text NOT NULL,
  allow_anonymous boolean DEFAULT false NOT NULL,
  allow_multiple boolean DEFAULT false NOT NULL,
  opened_at timestamptz,
  closed_at timestamptz,
  revealed_at timestamptz,
  step_index integer,
  phase_index integer,
  created_by uuid,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT session_decisions_max_choices_check CHECK ((max_choices >= 1)),
  CONSTRAINT session_decisions_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'open'::text, 'closed'::text, 'revealed'::text])))
);

-- Table: session_events
CREATE TABLE public.session_events (
  id uuid DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  event_type text DEFAULT 'unknown'::text NOT NULL,
  event_data jsonb DEFAULT '{}'::jsonb,
  actor_user_id uuid,
  actor_participant_id uuid,
  created_at timestamptz DEFAULT now() NOT NULL,
  event_category text DEFAULT 'unknown'::text NOT NULL,
  actor_type text DEFAULT 'system'::text NOT NULL,
  actor_id uuid,
  actor_name text,
  target_type text,
  target_id text,
  target_name text,
  payload jsonb DEFAULT '{}'::jsonb,
  correlation_id uuid,
  parent_event_id uuid,
  severity text DEFAULT 'info'::text NOT NULL,
  PRIMARY KEY (id)
);

-- Table: session_outcomes
CREATE TABLE public.session_outcomes (
  id uuid DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  title text NOT NULL,
  body text,
  outcome_type text DEFAULT 'text'::text NOT NULL,
  related_decision_id uuid,
  revealed_at timestamptz,
  step_index integer,
  phase_index integer,
  created_by uuid,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

-- Table: session_roles
CREATE TABLE public.session_roles (
  id uuid DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  source_role_id uuid,
  name text NOT NULL,
  icon text,
  color text,
  role_order integer DEFAULT 0 NOT NULL,
  public_description text,
  private_instructions text NOT NULL,
  private_hints text,
  min_count integer DEFAULT 1 NOT NULL,
  max_count integer,
  assignment_strategy text DEFAULT 'random'::text NOT NULL,
  scaling_rules jsonb,
  conflicts_with text[] DEFAULT '{}'::text[],
  assigned_count integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

-- Table: session_signals
CREATE TABLE public.session_signals (
  id uuid DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  channel text NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb NOT NULL,
  sender_user_id uuid,
  sender_participant_id uuid,
  created_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

-- Table: session_statistics
CREATE TABLE public.session_statistics (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  session_id uuid NOT NULL,
  total_participants integer DEFAULT 0,
  active_participants integer DEFAULT 0,
  games_started integer DEFAULT 0,
  games_completed integer DEFAULT 0,
  total_score integer DEFAULT 0,
  average_score numeric DEFAULT 0,
  total_achievements_unlocked integer DEFAULT 0,
  unique_achievements_unlocked integer DEFAULT 0,
  total_time_played_seconds integer DEFAULT 0,
  average_time_per_participant_seconds integer DEFAULT 0,
  top_scorers jsonb DEFAULT '[]'::jsonb,
  most_achievements jsonb DEFAULT '[]'::jsonb,
  calculated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT session_statistics_session_id_key UNIQUE (session_id)
);

-- Table: session_time_bank
CREATE TABLE public.session_time_bank (
  session_id uuid,
  balance_seconds integer DEFAULT 0 NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (session_id),
  CONSTRAINT session_time_bank_balance_nonnegative CHECK ((balance_seconds >= 0))
);

-- Table: session_time_bank_ledger
CREATE TABLE public.session_time_bank_ledger (
  id uuid DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  delta_seconds integer NOT NULL,
  reason text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
  event_id uuid,
  actor_user_id uuid,
  actor_participant_id uuid,
  created_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

-- Table: session_trigger_idempotency
CREATE TABLE public.session_trigger_idempotency (
  session_id uuid,
  game_trigger_id uuid,
  idempotency_key text,
  created_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (session_id, game_trigger_id, idempotency_key)
);

-- Table: session_trigger_state
CREATE TABLE public.session_trigger_state (
  id uuid DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  game_trigger_id uuid NOT NULL,
  status text DEFAULT 'armed'::text NOT NULL,
  fired_count integer DEFAULT 0 NOT NULL,
  fired_at timestamptz,
  last_error text,
  enabled boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT session_trigger_state_unique UNIQUE (session_id, game_trigger_id),
  CONSTRAINT session_trigger_state_status_check CHECK ((status = ANY (ARRAY['armed'::text, 'fired'::text, 'disabled'::text, 'error'::text])))
);

-- Table: session_triggers
CREATE TABLE public.session_triggers (
  id uuid DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  source_trigger_id uuid,
  name text NOT NULL,
  description text,
  enabled boolean DEFAULT true NOT NULL,
  condition jsonb NOT NULL,
  actions jsonb DEFAULT '[]'::jsonb NOT NULL,
  execute_once boolean DEFAULT false NOT NULL,
  delay_seconds integer DEFAULT 0,
  sort_order integer DEFAULT 0 NOT NULL,
  status text DEFAULT 'armed'::text NOT NULL,
  fired_at timestamptz,
  fired_count integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  last_error text,
  last_error_at timestamptz,
  error_count integer DEFAULT 0 NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT session_triggers_status_check CHECK ((status = ANY (ARRAY['armed'::text, 'fired'::text, 'disabled'::text, 'error'::text])))
);

-- Table: session_votes
CREATE TABLE public.session_votes (
  id uuid DEFAULT gen_random_uuid(),
  decision_id uuid NOT NULL,
  participant_id uuid NOT NULL,
  option_key text NOT NULL,
  value jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT session_votes_one_per_decision_participant UNIQUE (decision_id, participant_id)
);

-- Table: shop_item_translations
CREATE TABLE public.shop_item_translations (
  id uuid DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL,
  locale text NOT NULL,
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid,
  updated_by uuid,
  PRIMARY KEY (id),
  CONSTRAINT shop_item_translations_item_id_locale_key UNIQUE (item_id, locale),
  CONSTRAINT shop_item_translations_locale_check CHECK ((locale = ANY (ARRAY['sv'::text, 'en'::text, 'no'::text])))
);

-- Table: shop_items
CREATE TABLE public.shop_items (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  category text NOT NULL,
  image_url text,
  price numeric NOT NULL,
  currency_id uuid NOT NULL,
  quantity_limit integer,
  quantity_sold integer DEFAULT 0,
  is_available boolean DEFAULT true,
  is_featured boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_by_user_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  cosmetic_id uuid,
  PRIMARY KEY (id)
);

-- Table: social_leaderboards
CREATE TABLE public.social_leaderboards (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  game_id uuid NOT NULL,
  score integer DEFAULT 0 NOT NULL,
  rank integer,
  total_plays integer DEFAULT 0,
  best_score integer,
  avg_score numeric,
  achievements_unlocked integer DEFAULT 0,
  last_played_at timestamp,
  updated_at timestamp DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT social_leaderboards_tenant_id_user_id_game_id_key UNIQUE (tenant_id, user_id, game_id)
);

-- Table: spatial_artifacts
CREATE TABLE public.spatial_artifacts (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid,
  created_by uuid NOT NULL,
  title text DEFAULT 'Untitled'::text NOT NULL,
  description text DEFAULT ''::text NOT NULL,
  mode text DEFAULT 'free'::text NOT NULL,
  document jsonb NOT NULL,
  preview_url text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  visibility text DEFAULT 'private'::text NOT NULL,
  PRIMARY KEY (id)
);

-- Table: subscription_items
CREATE TABLE public.subscription_items (
  id uuid DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL,
  billing_product_id uuid NOT NULL,
  quantity integer DEFAULT 1 NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT subscription_items_subscription_id_billing_product_id_key UNIQUE (subscription_id, billing_product_id)
);

-- Table: subscriptions
CREATE TABLE public.subscriptions (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  billing_plan_id uuid NOT NULL,
  status varchar(50) DEFAULT 'active'::character varying NOT NULL,
  stripe_subscription_id varchar(255),
  stripe_customer_id varchar(255),
  current_period_start timestamp,
  current_period_end timestamp,
  canceled_at timestamp,
  ended_at timestamp,
  billing_cycle varchar(20) DEFAULT 'monthly'::character varying NOT NULL,
  auto_renew boolean DEFAULT true,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT subscriptions_tenant_id_stripe_subscription_id_key UNIQUE (tenant_id, stripe_subscription_id)
);

-- Table: support_faq_entries
CREATE TABLE public.support_faq_entries (
  id uuid DEFAULT gen_random_uuid(),
  faq_key text,
  tenant_id uuid,
  question text NOT NULL,
  answer_markdown text NOT NULL,
  category text,
  tags jsonb DEFAULT '[]'::jsonb,
  position integer DEFAULT 0 NOT NULL,
  is_published boolean DEFAULT false NOT NULL,
  view_count integer DEFAULT 0 NOT NULL,
  helpful_count integer DEFAULT 0 NOT NULL,
  not_helpful_count integer DEFAULT 0 NOT NULL,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT support_faq_entries_faq_key_key UNIQUE (faq_key)
);

-- Table: support_reports
CREATE TABLE public.support_reports (
  id uuid DEFAULT gen_random_uuid(),
  report_key text,
  tenant_id uuid,
  total_tickets integer DEFAULT 0 NOT NULL,
  open_tickets integer DEFAULT 0 NOT NULL,
  avg_resolution_time integer,
  satisfaction_score numeric,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT support_reports_report_key_key UNIQUE (report_key)
);

-- Table: support_tickets
CREATE TABLE public.support_tickets (
  id uuid DEFAULT gen_random_uuid(),
  ticket_key text,
  user_id uuid NOT NULL,
  tenant_id uuid,
  assigned_to_user_id uuid,
  title text NOT NULL,
  description text,
  category text,
  status public.ticket_status_enum DEFAULT 'open'::public.ticket_status_enum NOT NULL,
  priority public.ticket_priority_enum DEFAULT 'medium'::public.ticket_priority_enum NOT NULL,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  first_response_at timestamptz,
  sla_deadline timestamptz,
  escalation_level integer DEFAULT 0 NOT NULL,
  last_escalated_at timestamptz,
  sla_breached boolean DEFAULT false NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT support_tickets_ticket_key_key UNIQUE (ticket_key)
);

-- Table: system_audit_logs
CREATE TABLE public.system_audit_logs (
  id uuid DEFAULT gen_random_uuid(),
  event_type public.system_audit_event_type NOT NULL,
  actor_user_id uuid,
  tenant_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

-- Table: system_design_config
CREATE TABLE public.system_design_config (
  id uuid DEFAULT gen_random_uuid(),
  brand jsonb DEFAULT '{}'::jsonb NOT NULL,
  media jsonb DEFAULT '{}'::jsonb NOT NULL,
  typography jsonb DEFAULT '{}'::jsonb NOT NULL,
  tokens jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

-- Table: system_jobs_runs
CREATE TABLE public.system_jobs_runs (
  id uuid,
  job_name text NOT NULL,
  status public.system_job_run_status DEFAULT 'running'::public.system_job_run_status NOT NULL,
  started_at timestamptz DEFAULT now() NOT NULL,
  finished_at timestamptz,
  purged integer DEFAULT 0 NOT NULL,
  remaining integer DEFAULT 0 NOT NULL,
  skipped_timeout integer DEFAULT 0 NOT NULL,
  elapsed_ms integer,
  errors jsonb DEFAULT '[]'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  PRIMARY KEY (id)
);

-- Table: tenant_audit_logs
CREATE TABLE public.tenant_audit_logs (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  actor_user_id uuid,
  event_type text NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

-- Table: tenant_branding
CREATE TABLE public.tenant_branding (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  logo_media_id uuid,
  primary_color text,
  secondary_color text,
  accent_color text,
  theme text,
  brand_name_override text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT tenant_branding_tenant_id_key UNIQUE (tenant_id)
);

-- Table: tenant_design_config
CREATE TABLE public.tenant_design_config (
  tenant_id uuid,
  overrides jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (tenant_id)
);

-- Table: tenant_domains
CREATE TABLE public.tenant_domains (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  hostname text NOT NULL,
  status text DEFAULT 'pending'::text NOT NULL,
  is_primary boolean DEFAULT false NOT NULL,
  verified_at timestamptz,
  verification_token text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  kind text DEFAULT 'custom'::text,
  PRIMARY KEY (id),
  CONSTRAINT tenant_domains_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'active'::text, 'suspended'::text])))
);

-- Table: tenant_entitlement_seat_assignments
CREATE TABLE public.tenant_entitlement_seat_assignments (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  entitlement_id uuid NOT NULL,
  user_id uuid NOT NULL,
  status text DEFAULT 'active'::text NOT NULL,
  assigned_by uuid,
  assigned_at timestamptz DEFAULT now() NOT NULL,
  released_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT tenant_entitlement_seat_assignments_status_chk CHECK ((status = ANY (ARRAY['active'::text, 'released'::text, 'revoked'::text])))
);

-- Table: tenant_features
CREATE TABLE public.tenant_features (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  feature_key text NOT NULL,
  enabled boolean DEFAULT false NOT NULL,
  value jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT tenant_features_tenant_id_feature_key_key UNIQUE (tenant_id, feature_key)
);

-- Table: tenant_invitations
CREATE TABLE public.tenant_invitations (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  email text NOT NULL,
  role text DEFAULT 'organisation_user'::text NOT NULL,
  token text NOT NULL,
  invited_by uuid,
  expires_at timestamptz,
  accepted_at timestamptz,
  status text DEFAULT 'pending'::text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT tenant_invitations_token_key UNIQUE (token)
);

-- Table: tenant_mfa_policies
CREATE TABLE public.tenant_mfa_policies (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  is_enforced boolean DEFAULT false NOT NULL,
  enforcement_level text DEFAULT 'admins_required'::text NOT NULL,
  grace_period_days integer DEFAULT 7 NOT NULL,
  allow_totp boolean DEFAULT true NOT NULL,
  allow_sms boolean DEFAULT false NOT NULL,
  allow_webauthn boolean DEFAULT false NOT NULL,
  require_backup_email boolean DEFAULT false NOT NULL,
  recovery_codes_required boolean DEFAULT true NOT NULL,
  allow_trusted_devices boolean DEFAULT true NOT NULL,
  trusted_device_duration_days integer DEFAULT 30 NOT NULL,
  enforced_at timestamptz,
  enforced_by uuid,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT tenant_mfa_policies_tenant_id_key UNIQUE (tenant_id),
  CONSTRAINT tenant_mfa_policies_enforcement_level_check CHECK ((enforcement_level = ANY (ARRAY['optional'::text, 'admins_required'::text, 'all_users'::text]))),
  CONSTRAINT tenant_mfa_policies_grace_period_days_check CHECK (((grace_period_days >= 0) AND (grace_period_days <= 90))),
  CONSTRAINT tenant_mfa_policies_trusted_device_duration_days_check CHECK (((trusted_device_duration_days >= 1) AND (trusted_device_duration_days <= 365)))
);

-- Table: tenant_product_entitlements
CREATE TABLE public.tenant_product_entitlements (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  product_id uuid NOT NULL,
  status text DEFAULT 'active'::text NOT NULL,
  source text DEFAULT 'stripe_subscription'::text NOT NULL,
  quantity_seats integer DEFAULT 1 NOT NULL,
  valid_from timestamptz DEFAULT now() NOT NULL,
  valid_to timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_by uuid,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT tenant_product_entitlements_quantity_seats_chk CHECK (((quantity_seats >= 1) AND (quantity_seats <= 100000))),
  CONSTRAINT tenant_product_entitlements_status_chk CHECK ((status = ANY (ARRAY['active'::text, 'revoked'::text, 'expired'::text])))
);

-- Table: tenant_restore_vault
CREATE TABLE public.tenant_restore_vault (
  tenant_id uuid,
  encrypted_payload text NOT NULL,
  purge_after timestamptz NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid,
  kms_version text DEFAULT 'v1'::text NOT NULL,
  PRIMARY KEY (tenant_id)
);

-- Table: tenant_seat_assignments
CREATE TABLE public.tenant_seat_assignments (
  id uuid DEFAULT gen_random_uuid(),
  seat_assignment_key text,
  name text,
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  subscription_id uuid NOT NULL,
  billing_product_id uuid NOT NULL,
  status public.seat_assignment_status_enum DEFAULT 'pending'::public.seat_assignment_status_enum NOT NULL,
  assigned_at timestamptz DEFAULT now() NOT NULL,
  assigned_by_user_id uuid,
  released_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT tenant_seat_assignments_seat_assignment_key_key UNIQUE (seat_assignment_key),
  CONSTRAINT tenant_seat_assignments_tenant_id_user_id_subscription_id_key UNIQUE (tenant_id, user_id, subscription_id)
);

-- Table: tenant_settings
CREATE TABLE public.tenant_settings (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  modules jsonb DEFAULT '{}'::jsonb,
  product_access jsonb DEFAULT '{}'::jsonb,
  preferences jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT tenant_settings_tenant_id_key UNIQUE (tenant_id)
);

-- Table: tenant_subscriptions
CREATE TABLE public.tenant_subscriptions (
  id uuid DEFAULT gen_random_uuid(),
  subscription_key text,
  tenant_id uuid NOT NULL,
  billing_product_id uuid NOT NULL,
  status public.subscription_status_enum DEFAULT 'trial'::public.subscription_status_enum NOT NULL,
  seats_purchased integer DEFAULT 1 NOT NULL,
  start_date date NOT NULL,
  renewal_date date,
  cancelled_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  stripe_subscription_id text,
  PRIMARY KEY (id),
  CONSTRAINT tenant_subscriptions_subscription_key_key UNIQUE (subscription_key)
);

-- Table: tenant_translation_overrides
CREATE TABLE public.tenant_translation_overrides (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  key text NOT NULL,
  namespace text,
  locale text NOT NULL,
  original_value text,
  override_value text NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid,
  updated_by uuid,
  PRIMARY KEY (id),
  CONSTRAINT tenant_translation_overrides_tenant_id_key_locale_key UNIQUE (tenant_id, key, locale),
  CONSTRAINT tenant_translation_overrides_locale_check CHECK ((locale = ANY (ARRAY['sv'::text, 'en'::text, 'no'::text])))
);

-- Table: tenants
CREATE TABLE public.tenants (
  id uuid DEFAULT gen_random_uuid(),
  tenant_key text,
  name text NOT NULL,
  type text NOT NULL,
  status text DEFAULT 'active'::text NOT NULL,
  main_language public.language_code_enum DEFAULT 'NO'::public.language_code_enum NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  slug text,
  description text,
  logo_url text,
  subscription_tier text DEFAULT 'free'::text,
  subscription_status text DEFAULT 'active'::text,
  contact_name text,
  contact_email text,
  contact_phone text,
  default_language text,
  default_theme text,
  primary_color text,
  secondary_color text,
  demo_flag boolean DEFAULT false,
  trial_ends_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_by uuid,
  updated_by uuid,
  tenant_branding_enabled boolean DEFAULT false NOT NULL,
  anonymized_at timestamptz,
  purge_after timestamptz,
  anonymized_by uuid,
  anonymization_reason text,
  anonymization_version integer DEFAULT 1,
  PRIMARY KEY (id),
  CONSTRAINT tenants_tenant_key_key UNIQUE (tenant_key)
);

-- Table: ticket_messages
CREATE TABLE public.ticket_messages (
  id uuid DEFAULT gen_random_uuid(),
  message_key text,
  ticket_id uuid NOT NULL,
  user_id uuid NOT NULL,
  message text NOT NULL,
  is_internal boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT ticket_messages_message_key_key UNIQUE (message_key)
);

-- Table: ticket_routing_rules
CREATE TABLE public.ticket_routing_rules (
  id uuid DEFAULT gen_random_uuid(),
  rule_key text,
  tenant_id uuid,
  name text NOT NULL,
  description text,
  match_category text,
  match_priority public.ticket_priority_enum,
  match_tenant_id uuid,
  assign_to_user_id uuid,
  set_priority public.ticket_priority_enum,
  set_sla_hours integer,
  add_tags jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true NOT NULL,
  priority_order integer DEFAULT 0 NOT NULL,
  created_by uuid,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT ticket_routing_rules_rule_key_key UNIQUE (rule_key)
);

-- Table: translation_audit_log
CREATE TABLE public.translation_audit_log (
  id uuid DEFAULT gen_random_uuid(),
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  locale text,
  parent_id uuid,
  old_value jsonb,
  new_value jsonb,
  changed_fields text[],
  user_id uuid,
  tenant_id uuid,
  created_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT translation_audit_log_action_check CHECK ((action = ANY (ARRAY['create'::text, 'update'::text, 'delete'::text])))
);

-- Table: translation_missing_keys
CREATE TABLE public.translation_missing_keys (
  id uuid DEFAULT gen_random_uuid(),
  key text NOT NULL,
  locale text NOT NULL,
  namespace text,
  first_seen timestamptz DEFAULT now() NOT NULL,
  last_seen timestamptz DEFAULT now() NOT NULL,
  occurrence_count integer DEFAULT 1 NOT NULL,
  source_urls text[],
  resolved_at timestamptz,
  resolved_by uuid,
  PRIMARY KEY (id),
  CONSTRAINT translation_missing_keys_key_locale_key UNIQUE (key, locale),
  CONSTRAINT translation_missing_keys_locale_check CHECK ((locale = ANY (ARRAY['sv'::text, 'en'::text, 'no'::text])))
);

-- Table: trial_usage
CREATE TABLE public.trial_usage (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  trial_start_date timestamp NOT NULL,
  trial_end_date timestamp NOT NULL,
  users_created integer DEFAULT 0,
  games_created integer DEFAULT 0,
  api_calls_made integer DEFAULT 0,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT trial_usage_tenant_id_key UNIQUE (tenant_id)
);

-- Table: usage_meters
CREATE TABLE public.usage_meters (
  id uuid DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  unit_name text DEFAULT 'unit'::text NOT NULL,
  unit_name_plural text DEFAULT 'units'::text NOT NULL,
  aggregation_type text DEFAULT 'sum'::text NOT NULL,
  reset_period text DEFAULT 'month'::text NOT NULL,
  default_unit_price integer,
  default_included_units integer DEFAULT 0,
  status text DEFAULT 'active'::text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT usage_meters_slug_key UNIQUE (slug)
);

-- Table: usage_records
CREATE TABLE public.usage_records (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  meter_id uuid NOT NULL,
  quantity numeric NOT NULL,
  timestamp timestamptz DEFAULT now() NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  source text,
  idempotency_key text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

-- Table: usage_summaries
CREATE TABLE public.usage_summaries (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  meter_id uuid NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_quantity numeric DEFAULT 0 NOT NULL,
  billable_quantity numeric DEFAULT 0 NOT NULL,
  unit_price integer NOT NULL,
  included_units integer DEFAULT 0 NOT NULL,
  amount_due integer DEFAULT 0 NOT NULL,
  billed boolean DEFAULT false NOT NULL,
  billed_at timestamptz,
  invoice_id uuid,
  stripe_usage_record_id text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT usage_summaries_unique_period UNIQUE (tenant_id, meter_id, period_start, period_end)
);

-- Table: user_achievement_showcase
CREATE TABLE public.user_achievement_showcase (
  user_id uuid,
  slot smallint,
  achievement_id uuid NOT NULL,
  pinned_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (user_id, slot),
  CONSTRAINT user_achievement_showcase_user_id_achievement_id_key UNIQUE (user_id, achievement_id),
  CONSTRAINT user_achievement_showcase_slot_check CHECK (((slot >= 1) AND (slot <= 4)))
);

-- Table: user_achievements
CREATE TABLE public.user_achievements (
  id uuid DEFAULT gen_random_uuid(),
  achievement_id uuid NOT NULL,
  user_id uuid NOT NULL,
  tenant_id uuid,
  unlocked_at timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  source text,
  PRIMARY KEY (id),
  CONSTRAINT user_achievements_user_achievement_unique UNIQUE (user_id, achievement_id)
);

-- Table: user_audit_logs
CREATE TABLE public.user_audit_logs (
  id uuid DEFAULT gen_random_uuid(),
  user_id uuid,
  actor_user_id uuid,
  event_type text NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

-- Table: user_coins
CREATE TABLE public.user_coins (
  id uuid DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tenant_id uuid,
  balance integer DEFAULT 0 NOT NULL,
  total_earned integer DEFAULT 0 NOT NULL,
  total_spent integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT user_coins_user_id_tenant_id_key UNIQUE (user_id, tenant_id)
);

-- Table: user_consents
CREATE TABLE public.user_consents (
  id uuid DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tenant_id uuid,
  consent_type text NOT NULL,
  purpose text NOT NULL,
  granted boolean NOT NULL,
  policy_version text NOT NULL,
  granted_at timestamptz,
  withdrawn_at timestamptz,
  expires_at timestamptz,
  ip_address inet,
  user_agent text,
  parental_consent boolean DEFAULT false,
  parent_user_id uuid,
  verified_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT user_consents_user_id_consent_type_purpose_policy_version_key UNIQUE (user_id, consent_type, purpose, policy_version),
  CONSTRAINT user_consents_consent_type_check CHECK ((consent_type = ANY (ARRAY['essential'::text, 'functional'::text, 'analytics'::text, 'marketing'::text, 'special_category'::text, 'parental'::text])))
);

-- Table: user_cosmetic_loadout
CREATE TABLE public.user_cosmetic_loadout (
  id uuid DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  slot text NOT NULL,
  cosmetic_id uuid NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT user_cosmetic_loadout_user_id_slot_key UNIQUE (user_id, slot)
);

-- Table: user_cosmetics
CREATE TABLE public.user_cosmetics (
  id uuid DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  cosmetic_id uuid NOT NULL,
  unlock_type text NOT NULL,
  unlocked_at timestamptz DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT user_cosmetics_user_id_cosmetic_id_key UNIQUE (user_id, cosmetic_id)
);

-- Table: user_currency_balances
CREATE TABLE public.user_currency_balances (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  currency_id uuid NOT NULL,
  balance numeric DEFAULT 0,
  total_earned numeric DEFAULT 0,
  total_spent numeric DEFAULT 0,
  last_transaction_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT user_currency_balances_tenant_id_user_id_currency_id_key UNIQUE (tenant_id, user_id, currency_id)
);

-- Table: user_devices
CREATE TABLE public.user_devices (
  id uuid DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  device_fingerprint text,
  user_agent text,
  device_type text,
  ip_last inet,
  first_seen_at timestamptz DEFAULT now(),
  last_seen_at timestamptz DEFAULT now(),
  risk_score numeric,
  metadata jsonb DEFAULT '{}'::jsonb,
  PRIMARY KEY (id)
);

-- Table: user_gamification_preferences
CREATE TABLE public.user_gamification_preferences (
  id uuid DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tenant_id uuid,
  leaderboard_visible boolean DEFAULT true NOT NULL,
  leaderboard_opted_out_at timestamptz,
  notifications_enabled boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT user_gamification_preferences_user_id_tenant_id_key UNIQUE (user_id, tenant_id)
);

-- Table: user_journey_preferences
CREATE TABLE public.user_journey_preferences (
  user_id uuid,
  faction_id text,
  updated_at timestamptz DEFAULT now() NOT NULL,
  journey_enabled boolean DEFAULT false NOT NULL,
  journey_decision_at timestamptz,
  PRIMARY KEY (user_id)
);

-- Table: user_legal_acceptances
CREATE TABLE public.user_legal_acceptances (
  id uuid DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  document_id uuid NOT NULL,
  tenant_id_snapshot uuid,
  accepted_locale text NOT NULL,
  accepted_at timestamptz DEFAULT now() NOT NULL,
  ip_hash text,
  user_agent text,
  PRIMARY KEY (id),
  CONSTRAINT user_legal_acceptances_user_id_document_id_key UNIQUE (user_id, document_id),
  CONSTRAINT user_legal_acceptances_accepted_locale_check CHECK ((accepted_locale = ANY (ARRAY['no'::text, 'sv'::text, 'en'::text])))
);

-- Table: user_mfa
CREATE TABLE public.user_mfa (
  user_id uuid,
  enforced_reason text,
  enrolled_at timestamptz,
  last_verified_at timestamptz,
  recovery_codes_hashed text[],
  methods jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  tenant_id uuid,
  backup_email text,
  recovery_codes_count integer DEFAULT 10,
  recovery_codes_used integer DEFAULT 0,
  recovery_codes_generated_at timestamptz,
  notification_preferences jsonb DEFAULT '{"email_on_new_device": true, "email_on_mfa_disabled": true, "email_on_recovery_use": true}'::jsonb,
  grace_period_end timestamptz,
  PRIMARY KEY (user_id)
);

-- Table: user_powerup_consumptions
CREATE TABLE public.user_powerup_consumptions (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  shop_item_id uuid NOT NULL,
  idempotency_key text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT user_powerup_consumptions_tenant_id_user_id_idempotency_key_key UNIQUE (tenant_id, user_id, idempotency_key)
);

-- Table: user_powerup_effects
CREATE TABLE public.user_powerup_effects (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  shop_item_id uuid NOT NULL,
  consumption_id uuid NOT NULL,
  effect_type text NOT NULL,
  multiplier numeric DEFAULT 1 NOT NULL,
  starts_at timestamptz DEFAULT now() NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT user_powerup_effects_tenant_id_user_id_consumption_id_key UNIQUE (tenant_id, user_id, consumption_id)
);

-- Table: user_powerup_inventory
CREATE TABLE public.user_powerup_inventory (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  shop_item_id uuid NOT NULL,
  quantity integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT user_powerup_inventory_tenant_id_user_id_shop_item_id_key UNIQUE (tenant_id, user_id, shop_item_id),
  CONSTRAINT user_powerup_inventory_quantity_nonnegative CHECK ((quantity >= 0))
);

-- Table: user_preferences
CREATE TABLE public.user_preferences (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  language varchar(10),
  theme varchar(20) DEFAULT 'auto'::character varying,
  notifications_enabled boolean DEFAULT true,
  email_frequency varchar(20) DEFAULT 'weekly'::character varying,
  preferred_game_categories text[] DEFAULT '{}'::text[],
  difficulty_preference varchar(20),
  content_maturity_level varchar(20) DEFAULT 'teen'::character varying,
  profile_visibility varchar(20) DEFAULT 'public'::character varying,
  show_stats_publicly boolean DEFAULT true,
  allow_friend_requests boolean DEFAULT true,
  allow_messages boolean DEFAULT true,
  enable_recommendations boolean DEFAULT true,
  recommendation_frequency varchar(20) DEFAULT 'weekly'::character varying,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT user_preferences_tenant_id_user_id_key UNIQUE (tenant_id, user_id),
  CONSTRAINT user_preferences_theme_check CHECK (((theme)::text = ANY ((ARRAY['light'::character varying, 'dark'::character varying, 'system'::character varying, 'auto'::character varying])::text[])))
);

-- Table: user_profiles
CREATE TABLE public.user_profiles (
  user_id uuid,
  display_name text,
  phone text,
  job_title text,
  organisation text,
  timezone text,
  locale text,
  avatar_url text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (user_id)
);

-- Table: user_progress
CREATE TABLE public.user_progress (
  id uuid DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tenant_id uuid,
  level integer DEFAULT 1 NOT NULL,
  current_xp integer DEFAULT 0 NOT NULL,
  next_level_xp integer DEFAULT 1000 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  xp_grants jsonb DEFAULT '[]'::jsonb,
  PRIMARY KEY (id),
  CONSTRAINT user_progress_user_id_tenant_id_key UNIQUE (user_id, tenant_id)
);

-- Table: user_purchases
CREATE TABLE public.user_purchases (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  shop_item_id uuid NOT NULL,
  quantity integer DEFAULT 1,
  price_paid numeric NOT NULL,
  currency_id uuid NOT NULL,
  is_gift boolean DEFAULT false,
  gifted_from_user_id uuid,
  created_at timestamptz DEFAULT now(),
  idempotency_key text,
  coin_transaction_id uuid,
  PRIMARY KEY (id)
);

-- Table: user_restrictions
CREATE TABLE public.user_restrictions (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  restriction_type text NOT NULL,
  reason text NOT NULL,
  severity text DEFAULT 'warning'::character varying NOT NULL,
  active boolean DEFAULT true NOT NULL,
  active_until timestamptz,
  appeal_count integer DEFAULT 0 NOT NULL,
  can_appeal boolean DEFAULT true NOT NULL,
  created_by_user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT user_restrictions_user_id_restriction_type_key UNIQUE (user_id, restriction_type)
);

-- Table: user_sessions
CREATE TABLE public.user_sessions (
  id uuid DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  supabase_session_id text,
  device_id uuid,
  ip inet,
  user_agent text,
  last_login_at timestamptz DEFAULT now(),
  last_seen_at timestamptz DEFAULT now(),
  revoked_at timestamptz,
  risk_flags jsonb DEFAULT '{}'::jsonb,
  PRIMARY KEY (id)
);

-- Table: user_streaks
CREATE TABLE public.user_streaks (
  id uuid DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tenant_id uuid,
  current_streak_days integer DEFAULT 0 NOT NULL,
  best_streak_days integer DEFAULT 0 NOT NULL,
  last_active_date date,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT user_streaks_user_id_tenant_id_key UNIQUE (user_id, tenant_id)
);

-- Table: user_tenant_memberships
CREATE TABLE public.user_tenant_memberships (
  id uuid DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  role public.tenant_role_enum DEFAULT 'member'::public.tenant_role_enum NOT NULL,
  is_primary boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  status text DEFAULT 'active'::text,
  seat_assignment_id uuid,
  PRIMARY KEY (id),
  CONSTRAINT user_tenant_memberships_user_id_tenant_id_key UNIQUE (user_id, tenant_id)
);

-- Table: users
CREATE TABLE public.users (
  id uuid,
  email text NOT NULL,
  full_name text,
  role text DEFAULT 'member'::text NOT NULL,
  language public.language_code_enum DEFAULT 'NO'::public.language_code_enum NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  preferred_theme text DEFAULT 'system'::text,
  show_theme_toggle_in_header boolean DEFAULT true NOT NULL,
  avatar_url text,
  global_role public.global_role_enum DEFAULT 'member'::public.global_role_enum,
  email_verified boolean DEFAULT false,
  mfa_enforced boolean DEFAULT false,
  is_demo_user boolean DEFAULT false,
  is_ephemeral boolean DEFAULT false,
  demo_last_used_at timestamptz,
  demo_session_count integer DEFAULT 0,
  avatar_config jsonb,
  avatar_updated_at timestamptz,
  PRIMARY KEY (id),
  CONSTRAINT users_email_key UNIQUE (email),
  CONSTRAINT preferred_theme_valid CHECK ((preferred_theme = ANY (ARRAY['light'::text, 'dark'::text, 'system'::text])))
);

-- Table: virtual_currencies
CREATE TABLE public.virtual_currencies (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  code text NOT NULL,
  symbol text,
  exchange_rate numeric DEFAULT 1.0,
  is_premium boolean DEFAULT false,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT virtual_currencies_code_key UNIQUE (code)
);

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- 4. FOREIGN KEYS
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

ALTER TABLE public.achievement_award_recipients ADD CONSTRAINT achievement_award_recipients_award_id_fkey FOREIGN KEY (award_id) REFERENCES public.achievement_awards(id) ON DELETE CASCADE;
ALTER TABLE public.achievement_award_recipients ADD CONSTRAINT achievement_award_recipients_user_achievement_id_fkey FOREIGN KEY (user_achievement_id) REFERENCES public.user_achievements(id) ON DELETE SET NULL;
ALTER TABLE public.achievement_award_recipients ADD CONSTRAINT achievement_award_recipients_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.achievement_awards ADD CONSTRAINT achievement_awards_achievement_id_fkey FOREIGN KEY (achievement_id) REFERENCES public.achievements(id) ON DELETE CASCADE;
ALTER TABLE public.achievement_awards ADD CONSTRAINT achievement_awards_awarded_by_fkey FOREIGN KEY (awarded_by) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.achievement_awards ADD CONSTRAINT achievement_awards_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.achievement_leaderboards ADD CONSTRAINT achievement_leaderboards_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.achievement_leaderboards ADD CONSTRAINT achievement_leaderboards_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.achievement_translations ADD CONSTRAINT achievement_translations_achievement_id_fkey FOREIGN KEY (achievement_id) REFERENCES public.achievements(id) ON DELETE CASCADE;
ALTER TABLE public.achievement_translations ADD CONSTRAINT achievement_translations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);
ALTER TABLE public.achievement_translations ADD CONSTRAINT achievement_translations_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);
ALTER TABLE public.achievements ADD CONSTRAINT achievements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.achievements ADD CONSTRAINT achievements_icon_media_id_fkey FOREIGN KEY (icon_media_id) REFERENCES public.media(id) ON DELETE SET NULL;
ALTER TABLE public.achievements ADD CONSTRAINT achievements_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.achievements ADD CONSTRAINT achievements_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.analytics_timeseries ADD CONSTRAINT analytics_timeseries_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.award_builder_exports ADD CONSTRAINT award_builder_exports_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.badge_presets ADD CONSTRAINT badge_presets_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.billing_accounts ADD CONSTRAINT billing_accounts_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.billing_accounts ADD CONSTRAINT billing_accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.billing_events ADD CONSTRAINT billing_events_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE SET NULL;
ALTER TABLE public.billing_events ADD CONSTRAINT billing_events_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE SET NULL;
ALTER TABLE public.billing_events ADD CONSTRAINT billing_events_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.tenant_subscriptions(id) ON DELETE SET NULL;
ALTER TABLE public.billing_history ADD CONSTRAINT billing_history_from_plan_id_fkey FOREIGN KEY (from_plan_id) REFERENCES public.billing_plans(id);
ALTER TABLE public.billing_history ADD CONSTRAINT billing_history_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id) ON DELETE SET NULL;
ALTER TABLE public.billing_history ADD CONSTRAINT billing_history_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.billing_history ADD CONSTRAINT billing_history_to_plan_id_fkey FOREIGN KEY (to_plan_id) REFERENCES public.billing_plans(id);
ALTER TABLE public.billing_product_features ADD CONSTRAINT billing_product_features_billing_product_id_fkey FOREIGN KEY (billing_product_id) REFERENCES public.billing_products(id) ON DELETE CASCADE;
ALTER TABLE public.browse_search_logs ADD CONSTRAINT browse_search_logs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;
ALTER TABLE public.browse_search_logs ADD CONSTRAINT browse_search_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.bug_reports ADD CONSTRAINT bug_reports_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE SET NULL;
ALTER TABLE public.bug_reports ADD CONSTRAINT bug_reports_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.bug_reports ADD CONSTRAINT bug_reports_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.bundle_items ADD CONSTRAINT bundle_items_bundle_product_id_fkey FOREIGN KEY (bundle_product_id) REFERENCES public.products(id) ON DELETE CASCADE;
ALTER TABLE public.bundle_items ADD CONSTRAINT bundle_items_child_product_id_fkey FOREIGN KEY (child_product_id) REFERENCES public.products(id) ON DELETE CASCADE;
ALTER TABLE public.categories ADD CONSTRAINT categories_bundle_product_id_fkey FOREIGN KEY (bundle_product_id) REFERENCES public.products(id) ON DELETE SET NULL;
ALTER TABLE public.challenge_participation ADD CONSTRAINT challenge_participation_challenge_id_fkey FOREIGN KEY (challenge_id) REFERENCES public.community_challenges(id) ON DELETE CASCADE;
ALTER TABLE public.challenge_participation ADD CONSTRAINT challenge_participation_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.challenge_participation ADD CONSTRAINT challenge_participation_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.coach_diagram_exports ADD CONSTRAINT coach_diagram_exports_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.coin_transactions ADD CONSTRAINT coin_transactions_reversal_of_fkey FOREIGN KEY (reversal_of) REFERENCES public.coin_transactions(id);
ALTER TABLE public.coin_transactions ADD CONSTRAINT coin_transactions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.coin_transactions ADD CONSTRAINT coin_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.collection_items ADD CONSTRAINT collection_items_collection_id_fkey FOREIGN KEY (collection_id) REFERENCES public.content_collections(id) ON DELETE CASCADE;
ALTER TABLE public.collection_items ADD CONSTRAINT collection_items_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;
ALTER TABLE public.community_challenges ADD CONSTRAINT community_challenges_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.community_challenges ADD CONSTRAINT community_challenges_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.consent_policy_versions ADD CONSTRAINT consent_policy_versions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.content_analytics ADD CONSTRAINT content_analytics_content_id_fkey FOREIGN KEY (content_id) REFERENCES public.content_items(id) ON DELETE CASCADE;
ALTER TABLE public.content_analytics ADD CONSTRAINT content_analytics_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.content_collections ADD CONSTRAINT content_collections_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.content_collections ADD CONSTRAINT content_collections_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.content_filter_rules ADD CONSTRAINT content_filter_rules_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.content_filter_rules ADD CONSTRAINT content_filter_rules_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.content_items ADD CONSTRAINT content_items_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.content_items ADD CONSTRAINT content_items_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.content_preferences ADD CONSTRAINT content_preferences_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.content_preferences ADD CONSTRAINT content_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.content_preferences ADD CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.content_preferences ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES public.users(id);
ALTER TABLE public.content_reports ADD CONSTRAINT content_reports_assigned_to_user_id_fkey FOREIGN KEY (assigned_to_user_id) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.content_reports ADD CONSTRAINT content_reports_reported_by_user_id_fkey FOREIGN KEY (reported_by_user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.content_reports ADD CONSTRAINT content_reports_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.content_schedules ADD CONSTRAINT content_schedules_content_id_fkey FOREIGN KEY (content_id) REFERENCES public.content_items(id) ON DELETE CASCADE;
ALTER TABLE public.content_schedules ADD CONSTRAINT content_schedules_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.conversation_card_collection_secondary_purposes ADD CONSTRAINT conversation_card_collection_secondary_purpo_collection_id_fkey FOREIGN KEY (collection_id) REFERENCES public.conversation_card_collections(id) ON DELETE CASCADE;
ALTER TABLE public.conversation_card_collection_secondary_purposes ADD CONSTRAINT conversation_card_collection_secondary_purposes_purpose_id_fkey FOREIGN KEY (purpose_id) REFERENCES public.purposes(id) ON DELETE CASCADE;
ALTER TABLE public.conversation_card_collections ADD CONSTRAINT conversation_card_collections_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.conversation_card_collections ADD CONSTRAINT conversation_card_collections_main_purpose_id_fkey FOREIGN KEY (main_purpose_id) REFERENCES public.purposes(id) ON DELETE SET NULL;
ALTER TABLE public.conversation_card_collections ADD CONSTRAINT conversation_card_collections_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.conversation_cards ADD CONSTRAINT conversation_cards_collection_id_fkey FOREIGN KEY (collection_id) REFERENCES public.conversation_card_collections(id) ON DELETE CASCADE;
ALTER TABLE public.cookie_consent_audit ADD CONSTRAINT cookie_consent_audit_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.cookie_consents ADD CONSTRAINT cookie_consents_cookie_key_fkey FOREIGN KEY (cookie_key) REFERENCES public.cookie_catalog(key) ON DELETE CASCADE;
ALTER TABLE public.cookie_consents ADD CONSTRAINT cookie_consents_tenant_id_snapshot_fkey FOREIGN KEY (tenant_id_snapshot) REFERENCES public.tenants(id) ON DELETE SET NULL;
ALTER TABLE public.cookie_consents ADD CONSTRAINT cookie_consents_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.cosmetic_unlock_rules ADD CONSTRAINT cosmetic_unlock_rules_cosmetic_id_fkey FOREIGN KEY (cosmetic_id) REFERENCES public.cosmetics(id) ON DELETE CASCADE;
ALTER TABLE public.data_access_log ADD CONSTRAINT data_access_log_accessor_user_id_fkey FOREIGN KEY (accessor_user_id) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.data_access_log ADD CONSTRAINT data_access_log_subject_user_id_fkey FOREIGN KEY (subject_user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.data_access_log ADD CONSTRAINT data_access_log_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;
ALTER TABLE public.data_breach_notifications ADD CONSTRAINT data_breach_notifications_closed_by_fkey FOREIGN KEY (closed_by) REFERENCES public.users(id);
ALTER TABLE public.data_breach_notifications ADD CONSTRAINT data_breach_notifications_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);
ALTER TABLE public.data_retention_policies ADD CONSTRAINT data_retention_policies_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);
ALTER TABLE public.data_retention_policies ADD CONSTRAINT data_retention_policies_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.demo_sessions ADD CONSTRAINT demo_sessions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.demo_sessions ADD CONSTRAINT demo_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.dunning_actions ADD CONSTRAINT dunning_actions_payment_failure_id_fkey FOREIGN KEY (payment_failure_id) REFERENCES public.payment_failures(id) ON DELETE CASCADE;
ALTER TABLE public.dunning_config ADD CONSTRAINT dunning_config_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.error_tracking ADD CONSTRAINT error_tracking_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.error_tracking ADD CONSTRAINT error_tracking_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.event_rewards ADD CONSTRAINT event_rewards_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.limited_time_events(id) ON DELETE CASCADE;
ALTER TABLE public.event_rewards ADD CONSTRAINT event_rewards_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.event_rewards ADD CONSTRAINT event_rewards_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.feature_usage ADD CONSTRAINT feature_usage_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.feature_usage ADD CONSTRAINT feature_usage_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.feedback ADD CONSTRAINT feedback_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE SET NULL;
ALTER TABLE public.feedback ADD CONSTRAINT feedback_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.feedback ADD CONSTRAINT feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.friends ADD CONSTRAINT friends_tenant_id_1_fkey FOREIGN KEY (tenant_id_1) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.friends ADD CONSTRAINT friends_tenant_id_2_fkey FOREIGN KEY (tenant_id_2) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.funnel_analytics ADD CONSTRAINT funnel_analytics_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.funnel_analytics ADD CONSTRAINT funnel_analytics_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.game_artifact_variants ADD CONSTRAINT game_artifact_variants_artifact_id_fkey FOREIGN KEY (artifact_id) REFERENCES public.game_artifacts(id) ON DELETE CASCADE;
ALTER TABLE public.game_artifact_variants ADD CONSTRAINT game_artifact_variants_media_ref_fkey FOREIGN KEY (media_ref) REFERENCES public.game_media(id) ON DELETE SET NULL;
ALTER TABLE public.game_artifact_variants ADD CONSTRAINT game_artifact_variants_visible_to_role_id_fkey FOREIGN KEY (visible_to_role_id) REFERENCES public.game_roles(id) ON DELETE SET NULL;
ALTER TABLE public.game_artifacts ADD CONSTRAINT game_artifacts_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;
ALTER TABLE public.game_board_config ADD CONSTRAINT game_board_config_background_media_id_fkey FOREIGN KEY (background_media_id) REFERENCES public.game_media(id) ON DELETE SET NULL;
ALTER TABLE public.game_board_config ADD CONSTRAINT game_board_config_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;
ALTER TABLE public.game_materials ADD CONSTRAINT game_materials_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;
ALTER TABLE public.game_media ADD CONSTRAINT game_media_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;
ALTER TABLE public.game_media ADD CONSTRAINT game_media_media_id_fkey FOREIGN KEY (media_id) REFERENCES public.media(id) ON DELETE CASCADE;
ALTER TABLE public.game_media ADD CONSTRAINT game_media_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;
ALTER TABLE public.game_phases ADD CONSTRAINT game_phases_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;
ALTER TABLE public.game_reactions ADD CONSTRAINT game_reactions_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;
ALTER TABLE public.game_reactions ADD CONSTRAINT game_reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.game_roles ADD CONSTRAINT game_roles_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;
ALTER TABLE public.game_scores ADD CONSTRAINT game_scores_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;
ALTER TABLE public.game_scores ADD CONSTRAINT game_scores_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.game_sessions(id) ON DELETE CASCADE;
ALTER TABLE public.game_scores ADD CONSTRAINT game_scores_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.game_scores ADD CONSTRAINT game_scores_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.game_secondary_purposes ADD CONSTRAINT game_secondary_purposes_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;
ALTER TABLE public.game_secondary_purposes ADD CONSTRAINT game_secondary_purposes_purpose_id_fkey FOREIGN KEY (purpose_id) REFERENCES public.purposes(id) ON DELETE CASCADE;
ALTER TABLE public.game_sessions ADD CONSTRAINT game_sessions_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;
ALTER TABLE public.game_sessions ADD CONSTRAINT game_sessions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.game_sessions ADD CONSTRAINT game_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.game_snapshots ADD CONSTRAINT game_snapshots_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;
ALTER TABLE public.game_steps ADD CONSTRAINT fk_game_steps_phase FOREIGN KEY (phase_id) REFERENCES public.game_phases(id) ON DELETE SET NULL;
ALTER TABLE public.game_steps ADD CONSTRAINT game_steps_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;
ALTER TABLE public.game_steps ADD CONSTRAINT game_steps_media_ref_fkey FOREIGN KEY (media_ref) REFERENCES public.game_media(id) ON DELETE SET NULL;
ALTER TABLE public.game_tools ADD CONSTRAINT game_tools_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;
ALTER TABLE public.game_translations ADD CONSTRAINT game_translations_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;
ALTER TABLE public.game_triggers ADD CONSTRAINT game_triggers_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;
ALTER TABLE public.games ADD CONSTRAINT games_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);
ALTER TABLE public.games ADD CONSTRAINT games_main_purpose_id_fkey FOREIGN KEY (main_purpose_id) REFERENCES public.purposes(id) ON DELETE SET NULL;
ALTER TABLE public.games ADD CONSTRAINT games_owner_tenant_id_fkey FOREIGN KEY (owner_tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;
ALTER TABLE public.games ADD CONSTRAINT games_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;
ALTER TABLE public.games ADD CONSTRAINT games_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);
ALTER TABLE public.gamification_admin_award_recipients ADD CONSTRAINT gamification_admin_award_recipients_award_id_fkey FOREIGN KEY (award_id) REFERENCES public.gamification_admin_awards(id) ON DELETE CASCADE;
ALTER TABLE public.gamification_admin_award_recipients ADD CONSTRAINT gamification_admin_award_recipients_coin_transaction_id_fkey FOREIGN KEY (coin_transaction_id) REFERENCES public.coin_transactions(id) ON DELETE SET NULL;
ALTER TABLE public.gamification_admin_award_recipients ADD CONSTRAINT gamification_admin_award_recipients_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.gamification_admin_award_recipients ADD CONSTRAINT gamification_admin_award_recipients_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.gamification_admin_award_request_recipients ADD CONSTRAINT gamification_admin_award_request_recipients_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.gamification_admin_award_requests(id) ON DELETE CASCADE;
ALTER TABLE public.gamification_admin_award_request_recipients ADD CONSTRAINT gamification_admin_award_request_recipients_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.gamification_admin_award_request_recipients ADD CONSTRAINT gamification_admin_award_request_recipients_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.gamification_admin_award_requests ADD CONSTRAINT gamification_admin_award_requests_award_id_fkey FOREIGN KEY (award_id) REFERENCES public.gamification_admin_awards(id) ON DELETE SET NULL;
ALTER TABLE public.gamification_admin_award_requests ADD CONSTRAINT gamification_admin_award_requests_decided_by_user_id_fkey FOREIGN KEY (decided_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.gamification_admin_award_requests ADD CONSTRAINT gamification_admin_award_requests_requester_user_id_fkey FOREIGN KEY (requester_user_id) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.gamification_admin_award_requests ADD CONSTRAINT gamification_admin_award_requests_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.gamification_admin_awards ADD CONSTRAINT gamification_admin_awards_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.gamification_admin_awards ADD CONSTRAINT gamification_admin_awards_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.gamification_automation_rules ADD CONSTRAINT gamification_automation_rules_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.gamification_automation_rules ADD CONSTRAINT gamification_automation_rules_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.gamification_burn_log ADD CONSTRAINT gamification_burn_log_coin_transaction_id_fkey FOREIGN KEY (coin_transaction_id) REFERENCES public.coin_transactions(id) ON DELETE SET NULL;
ALTER TABLE public.gamification_burn_log ADD CONSTRAINT gamification_burn_log_refund_transaction_id_fkey FOREIGN KEY (refund_transaction_id) REFERENCES public.coin_transactions(id) ON DELETE SET NULL;
ALTER TABLE public.gamification_burn_log ADD CONSTRAINT gamification_burn_log_sink_id_fkey FOREIGN KEY (sink_id) REFERENCES public.gamification_burn_sinks(id) ON DELETE SET NULL;
ALTER TABLE public.gamification_burn_log ADD CONSTRAINT gamification_burn_log_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.gamification_burn_log ADD CONSTRAINT gamification_burn_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.gamification_burn_sinks ADD CONSTRAINT gamification_burn_sinks_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.gamification_campaign_templates ADD CONSTRAINT gamification_campaign_templates_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.gamification_campaign_templates ADD CONSTRAINT gamification_campaign_templates_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.gamification_campaigns ADD CONSTRAINT gamification_campaigns_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.gamification_campaigns ADD CONSTRAINT gamification_campaigns_source_template_id_fkey FOREIGN KEY (source_template_id) REFERENCES public.gamification_campaign_templates(id) ON DELETE SET NULL;
ALTER TABLE public.gamification_campaigns ADD CONSTRAINT gamification_campaigns_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.gamification_cooldowns ADD CONSTRAINT gamification_cooldowns_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.gamification_cooldowns ADD CONSTRAINT gamification_cooldowns_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.gamification_daily_earnings ADD CONSTRAINT gamification_daily_earnings_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.gamification_daily_earnings ADD CONSTRAINT gamification_daily_earnings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.gamification_daily_summaries ADD CONSTRAINT gamification_daily_summaries_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.gamification_events ADD CONSTRAINT gamification_events_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.gamification_events ADD CONSTRAINT gamification_events_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.gamification_level_definitions ADD CONSTRAINT gamification_level_definitions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.gamification_softcap_config ADD CONSTRAINT gamification_softcap_config_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.gdpr_requests ADD CONSTRAINT gdpr_requests_handled_by_fkey FOREIGN KEY (handled_by) REFERENCES public.users(id);
ALTER TABLE public.gdpr_requests ADD CONSTRAINT gdpr_requests_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;
ALTER TABLE public.gdpr_requests ADD CONSTRAINT gdpr_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.gift_purchases ADD CONSTRAINT gift_purchases_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;
ALTER TABLE public.gift_purchases ADD CONSTRAINT gift_purchases_product_price_id_fkey FOREIGN KEY (product_price_id) REFERENCES public.product_prices(id) ON DELETE RESTRICT;
ALTER TABLE public.gift_purchases ADD CONSTRAINT gift_purchases_purchase_intent_id_fkey FOREIGN KEY (purchase_intent_id) REFERENCES public.purchase_intents(id) ON DELETE SET NULL;
ALTER TABLE public.gift_purchases ADD CONSTRAINT gift_purchases_purchaser_user_id_fkey FOREIGN KEY (purchaser_user_id) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.gift_purchases ADD CONSTRAINT gift_purchases_redeemed_by_user_id_fkey FOREIGN KEY (redeemed_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.gift_purchases ADD CONSTRAINT gift_purchases_redeemed_tenant_id_fkey FOREIGN KEY (redeemed_tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;
ALTER TABLE public.interest_profiles ADD CONSTRAINT interest_profiles_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.interest_profiles ADD CONSTRAINT interest_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_billing_product_id_fkey FOREIGN KEY (billing_product_id) REFERENCES public.billing_products(id);
ALTER TABLE public.invoices ADD CONSTRAINT invoices_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.tenant_subscriptions(id);
ALTER TABLE public.invoices ADD CONSTRAINT invoices_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.leader_profile ADD CONSTRAINT leader_profile_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.leader_profile ADD CONSTRAINT leader_profile_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.leaderboards ADD CONSTRAINT leaderboards_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;
ALTER TABLE public.leaderboards ADD CONSTRAINT leaderboards_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.leaderboards ADD CONSTRAINT leaderboards_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.learning_course_attempts ADD CONSTRAINT learning_course_attempts_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.learning_courses(id) ON DELETE CASCADE;
ALTER TABLE public.learning_course_attempts ADD CONSTRAINT learning_course_attempts_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.learning_course_attempts ADD CONSTRAINT learning_course_attempts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.learning_course_translations ADD CONSTRAINT learning_course_translations_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.learning_courses(id) ON DELETE CASCADE;
ALTER TABLE public.learning_course_translations ADD CONSTRAINT learning_course_translations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);
ALTER TABLE public.learning_course_translations ADD CONSTRAINT learning_course_translations_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);
ALTER TABLE public.learning_courses ADD CONSTRAINT learning_courses_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.learning_courses ADD CONSTRAINT learning_courses_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.learning_path_edges ADD CONSTRAINT learning_path_edges_from_course_id_fkey FOREIGN KEY (from_course_id) REFERENCES public.learning_courses(id) ON DELETE CASCADE;
ALTER TABLE public.learning_path_edges ADD CONSTRAINT learning_path_edges_path_id_fkey FOREIGN KEY (path_id) REFERENCES public.learning_paths(id) ON DELETE CASCADE;
ALTER TABLE public.learning_path_edges ADD CONSTRAINT learning_path_edges_to_course_id_fkey FOREIGN KEY (to_course_id) REFERENCES public.learning_courses(id) ON DELETE CASCADE;
ALTER TABLE public.learning_path_nodes ADD CONSTRAINT learning_path_nodes_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.learning_courses(id) ON DELETE CASCADE;
ALTER TABLE public.learning_path_nodes ADD CONSTRAINT learning_path_nodes_path_id_fkey FOREIGN KEY (path_id) REFERENCES public.learning_paths(id) ON DELETE CASCADE;
ALTER TABLE public.learning_path_translations ADD CONSTRAINT learning_path_translations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);
ALTER TABLE public.learning_path_translations ADD CONSTRAINT learning_path_translations_path_id_fkey FOREIGN KEY (path_id) REFERENCES public.learning_paths(id) ON DELETE CASCADE;
ALTER TABLE public.learning_path_translations ADD CONSTRAINT learning_path_translations_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);
ALTER TABLE public.learning_paths ADD CONSTRAINT learning_paths_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.learning_paths ADD CONSTRAINT learning_paths_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.learning_requirements ADD CONSTRAINT learning_requirements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.learning_requirements ADD CONSTRAINT learning_requirements_required_course_id_fkey FOREIGN KEY (required_course_id) REFERENCES public.learning_courses(id) ON DELETE CASCADE;
ALTER TABLE public.learning_requirements ADD CONSTRAINT learning_requirements_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.learning_user_progress ADD CONSTRAINT learning_user_progress_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.learning_courses(id) ON DELETE CASCADE;
ALTER TABLE public.learning_user_progress ADD CONSTRAINT learning_user_progress_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.learning_user_progress ADD CONSTRAINT learning_user_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.legal_audit_log ADD CONSTRAINT legal_audit_log_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES public.users(id);
ALTER TABLE public.legal_audit_log ADD CONSTRAINT legal_audit_log_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.legal_documents(id) ON DELETE SET NULL;
ALTER TABLE public.legal_audit_log ADD CONSTRAINT legal_audit_log_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.legal_document_drafts ADD CONSTRAINT legal_document_drafts_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.legal_document_drafts ADD CONSTRAINT legal_document_drafts_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);
ALTER TABLE public.legal_documents ADD CONSTRAINT legal_documents_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);
ALTER TABLE public.legal_documents ADD CONSTRAINT legal_documents_previous_version_id_fkey FOREIGN KEY (previous_version_id) REFERENCES public.legal_documents(id);
ALTER TABLE public.legal_documents ADD CONSTRAINT legal_documents_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.limited_time_events ADD CONSTRAINT limited_time_events_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.limited_time_events ADD CONSTRAINT limited_time_events_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.marketplace_analytics ADD CONSTRAINT marketplace_analytics_most_popular_item_id_fkey FOREIGN KEY (most_popular_item_id) REFERENCES public.shop_items(id) ON DELETE SET NULL;
ALTER TABLE public.marketplace_analytics ADD CONSTRAINT marketplace_analytics_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.media ADD CONSTRAINT media_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;
ALTER TABLE public.media ADD CONSTRAINT media_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;
ALTER TABLE public.media ADD CONSTRAINT media_purpose_id_fkey FOREIGN KEY (purpose_id) REFERENCES public.purposes(id) ON DELETE SET NULL;
ALTER TABLE public.media ADD CONSTRAINT media_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.media_ai_generations ADD CONSTRAINT media_ai_generations_media_id_fkey FOREIGN KEY (media_id) REFERENCES public.media(id) ON DELETE CASCADE;
ALTER TABLE public.media_ai_generations ADD CONSTRAINT media_ai_generations_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.media_ai_generations ADD CONSTRAINT media_ai_generations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.media_templates ADD CONSTRAINT media_templates_main_purpose_id_fkey FOREIGN KEY (main_purpose_id) REFERENCES public.purposes(id) ON DELETE CASCADE;
ALTER TABLE public.media_templates ADD CONSTRAINT media_templates_media_id_fkey FOREIGN KEY (media_id) REFERENCES public.media(id) ON DELETE CASCADE;
ALTER TABLE public.media_templates ADD CONSTRAINT media_templates_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;
ALTER TABLE public.media_templates ADD CONSTRAINT media_templates_sub_purpose_id_fkey FOREIGN KEY (sub_purpose_id) REFERENCES public.purposes(id) ON DELETE SET NULL;
ALTER TABLE public.mfa_audit_log ADD CONSTRAINT mfa_audit_log_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;
ALTER TABLE public.mfa_audit_log ADD CONSTRAINT mfa_audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.mfa_trusted_devices ADD CONSTRAINT mfa_trusted_devices_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.mfa_trusted_devices ADD CONSTRAINT mfa_trusted_devices_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.moderation_actions ADD CONSTRAINT moderation_actions_taken_by_user_id_fkey FOREIGN KEY (taken_by_user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.moderation_actions ADD CONSTRAINT moderation_actions_target_user_id_fkey FOREIGN KEY (target_user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.moderation_actions ADD CONSTRAINT moderation_actions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.moderation_analytics ADD CONSTRAINT moderation_analytics_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.moderation_queue ADD CONSTRAINT moderation_queue_assigned_to_user_id_fkey FOREIGN KEY (assigned_to_user_id) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.moderation_queue ADD CONSTRAINT moderation_queue_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.content_reports(id) ON DELETE CASCADE;
ALTER TABLE public.moderation_queue ADD CONSTRAINT moderation_queue_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.multiplayer_participants ADD CONSTRAINT multiplayer_participants_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.multiplayer_sessions(id) ON DELETE CASCADE;
ALTER TABLE public.multiplayer_sessions ADD CONSTRAINT multiplayer_sessions_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;
ALTER TABLE public.notification_deliveries ADD CONSTRAINT notification_read_status_notification_id_fkey FOREIGN KEY (notification_id) REFERENCES public.notifications(id) ON DELETE CASCADE;
ALTER TABLE public.notification_log ADD CONSTRAINT notification_log_notification_id_fkey FOREIGN KEY (notification_id) REFERENCES public.notifications(id) ON DELETE CASCADE;
ALTER TABLE public.notification_preferences ADD CONSTRAINT notification_preferences_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.notification_template_translations ADD CONSTRAINT notification_template_translations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);
ALTER TABLE public.notification_template_translations ADD CONSTRAINT notification_template_translations_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.notification_templates(id) ON DELETE CASCADE;
ALTER TABLE public.notification_template_translations ADD CONSTRAINT notification_template_translations_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);
ALTER TABLE public.notification_templates ADD CONSTRAINT notification_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.notification_templates ADD CONSTRAINT notification_templates_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.org_legal_acceptances ADD CONSTRAINT org_legal_acceptances_accepted_by_fkey FOREIGN KEY (accepted_by) REFERENCES public.users(id);
ALTER TABLE public.org_legal_acceptances ADD CONSTRAINT org_legal_acceptances_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.legal_documents(id) ON DELETE CASCADE;
ALTER TABLE public.org_legal_acceptances ADD CONSTRAINT org_legal_acceptances_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.page_views ADD CONSTRAINT page_views_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.page_views ADD CONSTRAINT page_views_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.participant_achievement_unlocks ADD CONSTRAINT participant_achievement_unlocks_achievement_id_fkey FOREIGN KEY (achievement_id) REFERENCES public.achievements(id) ON DELETE CASCADE;
ALTER TABLE public.participant_achievement_unlocks ADD CONSTRAINT participant_achievement_unlocks_game_progress_id_fkey FOREIGN KEY (game_progress_id) REFERENCES public.participant_game_progress(id) ON DELETE CASCADE;
ALTER TABLE public.participant_achievement_unlocks ADD CONSTRAINT participant_achievement_unlocks_participant_id_fkey FOREIGN KEY (participant_id) REFERENCES public.participants(id) ON DELETE CASCADE;
ALTER TABLE public.participant_achievement_unlocks ADD CONSTRAINT participant_achievement_unlocks_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.participant_sessions(id) ON DELETE CASCADE;
ALTER TABLE public.participant_achievement_unlocks ADD CONSTRAINT participant_achievement_unlocks_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.participant_activity_log ADD CONSTRAINT participant_activity_log_participant_id_fkey FOREIGN KEY (participant_id) REFERENCES public.participants(id) ON DELETE SET NULL;
ALTER TABLE public.participant_activity_log ADD CONSTRAINT participant_activity_log_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.participant_sessions(id) ON DELETE CASCADE;
ALTER TABLE public.participant_game_progress ADD CONSTRAINT participant_game_progress_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;
ALTER TABLE public.participant_game_progress ADD CONSTRAINT participant_game_progress_participant_id_fkey FOREIGN KEY (participant_id) REFERENCES public.participants(id) ON DELETE CASCADE;
ALTER TABLE public.participant_game_progress ADD CONSTRAINT participant_game_progress_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.participant_sessions(id) ON DELETE CASCADE;
ALTER TABLE public.participant_game_progress ADD CONSTRAINT participant_game_progress_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.participant_role_assignments ADD CONSTRAINT participant_role_assignments_participant_id_fkey FOREIGN KEY (participant_id) REFERENCES public.participants(id) ON DELETE CASCADE;
ALTER TABLE public.participant_role_assignments ADD CONSTRAINT participant_role_assignments_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.participant_sessions(id) ON DELETE CASCADE;
ALTER TABLE public.participant_role_assignments ADD CONSTRAINT participant_role_assignments_session_role_id_fkey FOREIGN KEY (session_role_id) REFERENCES public.session_roles(id) ON DELETE CASCADE;
ALTER TABLE public.participant_sessions ADD CONSTRAINT participant_sessions_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE SET NULL;
ALTER TABLE public.participant_sessions ADD CONSTRAINT participant_sessions_game_snapshot_id_fkey FOREIGN KEY (game_snapshot_id) REFERENCES public.game_snapshots(id) ON DELETE SET NULL;
ALTER TABLE public.participant_sessions ADD CONSTRAINT participant_sessions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id) ON DELETE SET NULL;
ALTER TABLE public.participant_sessions ADD CONSTRAINT participant_sessions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.participant_token_quotas ADD CONSTRAINT participant_token_quotas_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.participants ADD CONSTRAINT participants_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.participant_sessions(id) ON DELETE CASCADE;
ALTER TABLE public.payment_failures ADD CONSTRAINT payment_failures_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.payment_methods ADD CONSTRAINT payment_methods_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.payments ADD CONSTRAINT payments_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;
ALTER TABLE public.personalization_events ADD CONSTRAINT personalization_events_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.personalization_events ADD CONSTRAINT personalization_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.plan_blocks ADD CONSTRAINT plan_blocks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);
ALTER TABLE public.plan_blocks ADD CONSTRAINT plan_blocks_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE SET NULL;
ALTER TABLE public.plan_blocks ADD CONSTRAINT plan_blocks_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id) ON DELETE CASCADE;
ALTER TABLE public.plan_blocks ADD CONSTRAINT plan_blocks_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);
ALTER TABLE public.plan_notes_private ADD CONSTRAINT plan_notes_private_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);
ALTER TABLE public.plan_notes_private ADD CONSTRAINT plan_notes_private_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id) ON DELETE CASCADE;
ALTER TABLE public.plan_notes_private ADD CONSTRAINT plan_notes_private_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);
ALTER TABLE public.plan_notes_tenant ADD CONSTRAINT plan_notes_tenant_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);
ALTER TABLE public.plan_notes_tenant ADD CONSTRAINT plan_notes_tenant_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id) ON DELETE CASCADE;
ALTER TABLE public.plan_notes_tenant ADD CONSTRAINT plan_notes_tenant_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.plan_notes_tenant ADD CONSTRAINT plan_notes_tenant_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);
ALTER TABLE public.plan_play_progress ADD CONSTRAINT plan_play_progress_current_block_id_fkey FOREIGN KEY (current_block_id) REFERENCES public.plan_blocks(id) ON DELETE SET NULL;
ALTER TABLE public.plan_play_progress ADD CONSTRAINT plan_play_progress_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id) ON DELETE CASCADE;
ALTER TABLE public.plan_play_progress ADD CONSTRAINT plan_play_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.plan_version_blocks ADD CONSTRAINT plan_version_blocks_plan_version_id_fkey FOREIGN KEY (plan_version_id) REFERENCES public.plan_versions(id) ON DELETE CASCADE;
ALTER TABLE public.plan_versions ADD CONSTRAINT plan_versions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id) ON DELETE CASCADE;
ALTER TABLE public.plans ADD CONSTRAINT plans_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);
ALTER TABLE public.plans ADD CONSTRAINT plans_current_version_id_fkey FOREIGN KEY (current_version_id) REFERENCES public.plan_versions(id);
ALTER TABLE public.plans ADD CONSTRAINT plans_owner_tenant_id_fkey FOREIGN KEY (owner_tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.plans ADD CONSTRAINT plans_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.plans ADD CONSTRAINT plans_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);
ALTER TABLE public.play_chat_messages ADD CONSTRAINT play_chat_messages_recipient_participant_id_fkey FOREIGN KEY (recipient_participant_id) REFERENCES public.participants(id) ON DELETE SET NULL;
ALTER TABLE public.play_chat_messages ADD CONSTRAINT play_chat_messages_sender_participant_id_fkey FOREIGN KEY (sender_participant_id) REFERENCES public.participants(id) ON DELETE SET NULL;
ALTER TABLE public.play_chat_messages ADD CONSTRAINT play_chat_messages_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.participant_sessions(id) ON DELETE CASCADE;
ALTER TABLE public.player_cosmetics ADD CONSTRAINT player_cosmetics_shop_item_id_fkey FOREIGN KEY (shop_item_id) REFERENCES public.shop_items(id) ON DELETE CASCADE;
ALTER TABLE public.player_cosmetics ADD CONSTRAINT player_cosmetics_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.player_cosmetics ADD CONSTRAINT player_cosmetics_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.private_subscriptions ADD CONSTRAINT private_subscriptions_billing_product_id_fkey FOREIGN KEY (billing_product_id) REFERENCES public.billing_products(id);
ALTER TABLE public.private_subscriptions ADD CONSTRAINT private_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.product_audit_log ADD CONSTRAINT product_audit_log_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.product_audit_log ADD CONSTRAINT product_audit_log_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;
ALTER TABLE public.product_prices ADD CONSTRAINT product_prices_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;
ALTER TABLE public.product_purposes ADD CONSTRAINT product_purposes_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;
ALTER TABLE public.product_purposes ADD CONSTRAINT product_purposes_purpose_id_fkey FOREIGN KEY (purpose_id) REFERENCES public.purposes(id) ON DELETE CASCADE;
ALTER TABLE public.product_usage_pricing ADD CONSTRAINT product_usage_pricing_meter_id_fkey FOREIGN KEY (meter_id) REFERENCES public.usage_meters(id) ON DELETE CASCADE;
ALTER TABLE public.product_usage_pricing ADD CONSTRAINT product_usage_pricing_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;
ALTER TABLE public.products ADD CONSTRAINT products_category_slug_fkey FOREIGN KEY (category_slug) REFERENCES public.categories(slug) ON DELETE SET NULL;
ALTER TABLE public.promo_codes ADD CONSTRAINT promo_codes_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.promo_codes ADD CONSTRAINT promo_codes_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.purchase_intents ADD CONSTRAINT purchase_intents_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;
ALTER TABLE public.purchase_intents ADD CONSTRAINT purchase_intents_product_price_id_fkey FOREIGN KEY (product_price_id) REFERENCES public.product_prices(id) ON DELETE SET NULL;
ALTER TABLE public.purchase_intents ADD CONSTRAINT purchase_intents_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;
ALTER TABLE public.purchase_intents ADD CONSTRAINT purchase_intents_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.purposes ADD CONSTRAINT purposes_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.purposes(id) ON DELETE CASCADE;
ALTER TABLE public.purposes ADD CONSTRAINT purposes_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.quote_activities ADD CONSTRAINT quote_activities_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.quote_activities ADD CONSTRAINT quote_activities_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE CASCADE;
ALTER TABLE public.quote_line_items ADD CONSTRAINT quote_line_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;
ALTER TABLE public.quote_line_items ADD CONSTRAINT quote_line_items_product_price_id_fkey FOREIGN KEY (product_price_id) REFERENCES public.product_prices(id) ON DELETE SET NULL;
ALTER TABLE public.quote_line_items ADD CONSTRAINT quote_line_items_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE CASCADE;
ALTER TABLE public.quotes ADD CONSTRAINT quotes_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.quotes ADD CONSTRAINT quotes_converted_to_invoice_id_fkey FOREIGN KEY (converted_to_invoice_id) REFERENCES public.invoices(id) ON DELETE SET NULL;
ALTER TABLE public.quotes ADD CONSTRAINT quotes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.quotes ADD CONSTRAINT quotes_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;
ALTER TABLE public.recommendation_history ADD CONSTRAINT recommendation_history_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.recommendation_history ADD CONSTRAINT recommendation_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.run_sessions ADD CONSTRAINT run_sessions_run_id_fkey FOREIGN KEY (run_id) REFERENCES public.runs(id) ON DELETE CASCADE;
ALTER TABLE public.run_sessions ADD CONSTRAINT run_sessions_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.participant_sessions(id) ON DELETE SET NULL;
ALTER TABLE public.runs ADD CONSTRAINT runs_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id) ON DELETE CASCADE;
ALTER TABLE public.runs ADD CONSTRAINT runs_plan_version_id_fkey FOREIGN KEY (plan_version_id) REFERENCES public.plan_versions(id) ON DELETE CASCADE;
ALTER TABLE public.runs ADD CONSTRAINT runs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;
ALTER TABLE public.saved_items ADD CONSTRAINT saved_items_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.saved_items ADD CONSTRAINT saved_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.seasonal_achievements ADD CONSTRAINT seasonal_achievements_achievement_id_fkey FOREIGN KEY (achievement_id) REFERENCES public.achievements(id) ON DELETE CASCADE;
ALTER TABLE public.seasonal_achievements ADD CONSTRAINT seasonal_achievements_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.seasonal_events ADD CONSTRAINT seasonal_events_featured_content_id_fkey FOREIGN KEY (featured_content_id) REFERENCES public.content_items(id) ON DELETE SET NULL;
ALTER TABLE public.seasonal_events ADD CONSTRAINT seasonal_events_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.session_analytics ADD CONSTRAINT session_analytics_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE SET NULL;
ALTER TABLE public.session_analytics ADD CONSTRAINT session_analytics_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.session_analytics ADD CONSTRAINT session_analytics_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.session_artifact_assignments ADD CONSTRAINT session_artifact_assignments_participant_id_fkey FOREIGN KEY (participant_id) REFERENCES public.participants(id) ON DELETE CASCADE;
ALTER TABLE public.session_artifact_assignments ADD CONSTRAINT session_artifact_assignments_session_artifact_variant_id_fkey FOREIGN KEY (session_artifact_variant_id) REFERENCES public.session_artifact_variants(id) ON DELETE CASCADE;
ALTER TABLE public.session_artifact_assignments ADD CONSTRAINT session_artifact_assignments_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.participant_sessions(id) ON DELETE CASCADE;
ALTER TABLE public.session_artifact_state ADD CONSTRAINT session_artifact_state_game_artifact_id_fkey FOREIGN KEY (game_artifact_id) REFERENCES public.game_artifacts(id) ON DELETE CASCADE;
ALTER TABLE public.session_artifact_state ADD CONSTRAINT session_artifact_state_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.participant_sessions(id) ON DELETE CASCADE;
ALTER TABLE public.session_artifact_variant_assignments_v2 ADD CONSTRAINT session_artifact_variant_assignme_game_artifact_variant_id_fkey FOREIGN KEY (game_artifact_variant_id) REFERENCES public.game_artifact_variants(id) ON DELETE CASCADE;
ALTER TABLE public.session_artifact_variant_assignments_v2 ADD CONSTRAINT session_artifact_variant_assignments_v2_participant_id_fkey FOREIGN KEY (participant_id) REFERENCES public.participants(id) ON DELETE CASCADE;
ALTER TABLE public.session_artifact_variant_assignments_v2 ADD CONSTRAINT session_artifact_variant_assignments_v2_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.participant_sessions(id) ON DELETE CASCADE;
ALTER TABLE public.session_artifact_variant_state ADD CONSTRAINT session_artifact_variant_state_game_artifact_variant_id_fkey FOREIGN KEY (game_artifact_variant_id) REFERENCES public.game_artifact_variants(id) ON DELETE CASCADE;
ALTER TABLE public.session_artifact_variant_state ADD CONSTRAINT session_artifact_variant_state_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.participant_sessions(id) ON DELETE CASCADE;
ALTER TABLE public.session_artifact_variants ADD CONSTRAINT session_artifact_variants_media_ref_fkey FOREIGN KEY (media_ref) REFERENCES public.game_media(id) ON DELETE SET NULL;
ALTER TABLE public.session_artifact_variants ADD CONSTRAINT session_artifact_variants_session_artifact_id_fkey FOREIGN KEY (session_artifact_id) REFERENCES public.session_artifacts(id) ON DELETE CASCADE;
ALTER TABLE public.session_artifact_variants ADD CONSTRAINT session_artifact_variants_source_variant_id_fkey FOREIGN KEY (source_variant_id) REFERENCES public.game_artifact_variants(id) ON DELETE SET NULL;
ALTER TABLE public.session_artifact_variants ADD CONSTRAINT session_artifact_variants_visible_to_session_role_id_fkey FOREIGN KEY (visible_to_session_role_id) REFERENCES public.session_roles(id) ON DELETE SET NULL;
ALTER TABLE public.session_artifacts ADD CONSTRAINT session_artifacts_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.participant_sessions(id) ON DELETE CASCADE;
ALTER TABLE public.session_artifacts ADD CONSTRAINT session_artifacts_source_artifact_id_fkey FOREIGN KEY (source_artifact_id) REFERENCES public.game_artifacts(id) ON DELETE SET NULL;
ALTER TABLE public.session_commands ADD CONSTRAINT session_commands_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.participant_sessions(id) ON DELETE CASCADE;
ALTER TABLE public.session_decisions ADD CONSTRAINT session_decisions_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.participant_sessions(id) ON DELETE CASCADE;
ALTER TABLE public.session_events ADD CONSTRAINT session_events_actor_participant_id_fkey FOREIGN KEY (actor_participant_id) REFERENCES public.participants(id) ON DELETE SET NULL;
ALTER TABLE public.session_events ADD CONSTRAINT session_events_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.participant_sessions(id) ON DELETE CASCADE;
ALTER TABLE public.session_outcomes ADD CONSTRAINT session_outcomes_related_decision_id_fkey FOREIGN KEY (related_decision_id) REFERENCES public.session_decisions(id) ON DELETE SET NULL;
ALTER TABLE public.session_outcomes ADD CONSTRAINT session_outcomes_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.participant_sessions(id) ON DELETE CASCADE;
ALTER TABLE public.session_roles ADD CONSTRAINT session_roles_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.participant_sessions(id) ON DELETE CASCADE;
ALTER TABLE public.session_roles ADD CONSTRAINT session_roles_source_role_id_fkey FOREIGN KEY (source_role_id) REFERENCES public.game_roles(id) ON DELETE SET NULL;
ALTER TABLE public.session_signals ADD CONSTRAINT session_signals_sender_participant_id_fkey FOREIGN KEY (sender_participant_id) REFERENCES public.participants(id) ON DELETE SET NULL;
ALTER TABLE public.session_signals ADD CONSTRAINT session_signals_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.participant_sessions(id) ON DELETE CASCADE;
ALTER TABLE public.session_statistics ADD CONSTRAINT session_statistics_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.participant_sessions(id) ON DELETE CASCADE;
ALTER TABLE public.session_statistics ADD CONSTRAINT session_statistics_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.session_time_bank ADD CONSTRAINT session_time_bank_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.participant_sessions(id) ON DELETE CASCADE;
ALTER TABLE public.session_time_bank_ledger ADD CONSTRAINT session_time_bank_ledger_actor_participant_id_fkey FOREIGN KEY (actor_participant_id) REFERENCES public.participants(id) ON DELETE SET NULL;
ALTER TABLE public.session_time_bank_ledger ADD CONSTRAINT session_time_bank_ledger_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.session_events(id) ON DELETE SET NULL;
ALTER TABLE public.session_time_bank_ledger ADD CONSTRAINT session_time_bank_ledger_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.participant_sessions(id) ON DELETE CASCADE;
ALTER TABLE public.session_trigger_idempotency ADD CONSTRAINT session_trigger_idempotency_game_trigger_id_fkey FOREIGN KEY (game_trigger_id) REFERENCES public.game_triggers(id) ON DELETE CASCADE;
ALTER TABLE public.session_trigger_idempotency ADD CONSTRAINT session_trigger_idempotency_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.participant_sessions(id) ON DELETE CASCADE;
ALTER TABLE public.session_trigger_state ADD CONSTRAINT session_trigger_state_game_trigger_id_fkey FOREIGN KEY (game_trigger_id) REFERENCES public.game_triggers(id) ON DELETE CASCADE;
ALTER TABLE public.session_trigger_state ADD CONSTRAINT session_trigger_state_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.participant_sessions(id) ON DELETE CASCADE;
ALTER TABLE public.session_triggers ADD CONSTRAINT session_triggers_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.participant_sessions(id) ON DELETE CASCADE;
ALTER TABLE public.session_triggers ADD CONSTRAINT session_triggers_source_trigger_id_fkey FOREIGN KEY (source_trigger_id) REFERENCES public.game_triggers(id) ON DELETE SET NULL;
ALTER TABLE public.session_votes ADD CONSTRAINT session_votes_decision_id_fkey FOREIGN KEY (decision_id) REFERENCES public.session_decisions(id) ON DELETE CASCADE;
ALTER TABLE public.session_votes ADD CONSTRAINT session_votes_participant_id_fkey FOREIGN KEY (participant_id) REFERENCES public.participants(id) ON DELETE CASCADE;
ALTER TABLE public.shop_item_translations ADD CONSTRAINT shop_item_translations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);
ALTER TABLE public.shop_item_translations ADD CONSTRAINT shop_item_translations_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.shop_items(id) ON DELETE CASCADE;
ALTER TABLE public.shop_item_translations ADD CONSTRAINT shop_item_translations_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);
ALTER TABLE public.shop_items ADD CONSTRAINT shop_items_cosmetic_id_fkey FOREIGN KEY (cosmetic_id) REFERENCES public.cosmetics(id) ON DELETE SET NULL;
ALTER TABLE public.shop_items ADD CONSTRAINT shop_items_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.shop_items ADD CONSTRAINT shop_items_currency_id_fkey FOREIGN KEY (currency_id) REFERENCES public.virtual_currencies(id) ON DELETE SET NULL;
ALTER TABLE public.shop_items ADD CONSTRAINT shop_items_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.social_leaderboards ADD CONSTRAINT social_leaderboards_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;
ALTER TABLE public.social_leaderboards ADD CONSTRAINT social_leaderboards_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.spatial_artifacts ADD CONSTRAINT spatial_artifacts_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.subscription_items ADD CONSTRAINT subscription_items_billing_product_id_fkey FOREIGN KEY (billing_product_id) REFERENCES public.billing_products(id);
ALTER TABLE public.subscription_items ADD CONSTRAINT subscription_items_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.tenant_subscriptions(id) ON DELETE CASCADE;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_billing_plan_id_fkey FOREIGN KEY (billing_plan_id) REFERENCES public.billing_plans(id);
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.support_faq_entries ADD CONSTRAINT support_faq_entries_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.support_faq_entries ADD CONSTRAINT support_faq_entries_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.support_faq_entries ADD CONSTRAINT support_faq_entries_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.support_reports ADD CONSTRAINT support_reports_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.support_tickets ADD CONSTRAINT support_tickets_assigned_to_user_id_fkey FOREIGN KEY (assigned_to_user_id) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.support_tickets ADD CONSTRAINT support_tickets_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.support_tickets ADD CONSTRAINT support_tickets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.tenant_audit_logs ADD CONSTRAINT tenant_audit_logs_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES public.users(id);
ALTER TABLE public.tenant_audit_logs ADD CONSTRAINT tenant_audit_logs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.tenant_branding ADD CONSTRAINT tenant_branding_logo_media_id_fkey FOREIGN KEY (logo_media_id) REFERENCES public.media(id);
ALTER TABLE public.tenant_branding ADD CONSTRAINT tenant_branding_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.tenant_design_config ADD CONSTRAINT tenant_design_config_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.tenant_domains ADD CONSTRAINT tenant_domains_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.tenant_entitlement_seat_assignments ADD CONSTRAINT tenant_entitlement_seat_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.tenant_entitlement_seat_assignments ADD CONSTRAINT tenant_entitlement_seat_assignments_entitlement_id_fkey FOREIGN KEY (entitlement_id) REFERENCES public.tenant_product_entitlements(id) ON DELETE CASCADE;
ALTER TABLE public.tenant_entitlement_seat_assignments ADD CONSTRAINT tenant_entitlement_seat_assignments_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.tenant_entitlement_seat_assignments ADD CONSTRAINT tenant_entitlement_seat_assignments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.tenant_features ADD CONSTRAINT tenant_features_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.tenant_invitations ADD CONSTRAINT tenant_invitations_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.users(id);
ALTER TABLE public.tenant_invitations ADD CONSTRAINT tenant_invitations_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.tenant_mfa_policies ADD CONSTRAINT tenant_mfa_policies_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.tenant_product_entitlements ADD CONSTRAINT tenant_product_entitlements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.tenant_product_entitlements ADD CONSTRAINT tenant_product_entitlements_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;
ALTER TABLE public.tenant_product_entitlements ADD CONSTRAINT tenant_product_entitlements_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.tenant_restore_vault ADD CONSTRAINT tenant_restore_vault_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.tenant_restore_vault ADD CONSTRAINT tenant_restore_vault_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.tenant_seat_assignments ADD CONSTRAINT tenant_seat_assignments_assigned_by_user_id_fkey FOREIGN KEY (assigned_by_user_id) REFERENCES public.users(id);
ALTER TABLE public.tenant_seat_assignments ADD CONSTRAINT tenant_seat_assignments_billing_product_id_fkey FOREIGN KEY (billing_product_id) REFERENCES public.billing_products(id);
ALTER TABLE public.tenant_seat_assignments ADD CONSTRAINT tenant_seat_assignments_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.tenant_subscriptions(id) ON DELETE CASCADE;
ALTER TABLE public.tenant_seat_assignments ADD CONSTRAINT tenant_seat_assignments_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.tenant_seat_assignments ADD CONSTRAINT tenant_seat_assignments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.tenant_settings ADD CONSTRAINT tenant_settings_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.tenant_subscriptions ADD CONSTRAINT tenant_subscriptions_billing_product_id_fkey FOREIGN KEY (billing_product_id) REFERENCES public.billing_products(id);
ALTER TABLE public.tenant_subscriptions ADD CONSTRAINT tenant_subscriptions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.tenant_translation_overrides ADD CONSTRAINT tenant_translation_overrides_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);
ALTER TABLE public.tenant_translation_overrides ADD CONSTRAINT tenant_translation_overrides_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.tenant_translation_overrides ADD CONSTRAINT tenant_translation_overrides_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);
ALTER TABLE public.tenants ADD CONSTRAINT tenants_anonymized_by_fkey FOREIGN KEY (anonymized_by) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.tenants ADD CONSTRAINT tenants_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);
ALTER TABLE public.tenants ADD CONSTRAINT tenants_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);
ALTER TABLE public.ticket_messages ADD CONSTRAINT ticket_messages_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id) ON DELETE CASCADE;
ALTER TABLE public.ticket_messages ADD CONSTRAINT ticket_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.ticket_routing_rules ADD CONSTRAINT ticket_routing_rules_assign_to_user_id_fkey FOREIGN KEY (assign_to_user_id) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.ticket_routing_rules ADD CONSTRAINT ticket_routing_rules_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.ticket_routing_rules ADD CONSTRAINT ticket_routing_rules_match_tenant_id_fkey FOREIGN KEY (match_tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;
ALTER TABLE public.ticket_routing_rules ADD CONSTRAINT ticket_routing_rules_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.translation_audit_log ADD CONSTRAINT translation_audit_log_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;
ALTER TABLE public.translation_audit_log ADD CONSTRAINT translation_audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
ALTER TABLE public.translation_missing_keys ADD CONSTRAINT translation_missing_keys_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.users(id);
ALTER TABLE public.trial_usage ADD CONSTRAINT trial_usage_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.usage_records ADD CONSTRAINT usage_records_meter_id_fkey FOREIGN KEY (meter_id) REFERENCES public.usage_meters(id) ON DELETE RESTRICT;
ALTER TABLE public.usage_records ADD CONSTRAINT usage_records_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.usage_summaries ADD CONSTRAINT usage_summaries_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE SET NULL;
ALTER TABLE public.usage_summaries ADD CONSTRAINT usage_summaries_meter_id_fkey FOREIGN KEY (meter_id) REFERENCES public.usage_meters(id) ON DELETE RESTRICT;
ALTER TABLE public.usage_summaries ADD CONSTRAINT usage_summaries_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.user_achievement_showcase ADD CONSTRAINT user_achievement_showcase_achievement_id_fkey FOREIGN KEY (achievement_id) REFERENCES public.achievements(id) ON DELETE CASCADE;
ALTER TABLE public.user_achievements ADD CONSTRAINT user_achievements_achievement_id_fkey FOREIGN KEY (achievement_id) REFERENCES public.achievements(id) ON DELETE CASCADE;
ALTER TABLE public.user_achievements ADD CONSTRAINT user_achievements_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.user_achievements ADD CONSTRAINT user_achievements_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.user_audit_logs ADD CONSTRAINT user_audit_logs_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES public.users(id);
ALTER TABLE public.user_audit_logs ADD CONSTRAINT user_audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.user_coins ADD CONSTRAINT user_coins_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.user_coins ADD CONSTRAINT user_coins_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.user_consents ADD CONSTRAINT user_consents_parent_user_id_fkey FOREIGN KEY (parent_user_id) REFERENCES public.users(id);
ALTER TABLE public.user_consents ADD CONSTRAINT user_consents_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.user_consents ADD CONSTRAINT user_consents_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.user_cosmetic_loadout ADD CONSTRAINT user_cosmetic_loadout_cosmetic_id_fkey FOREIGN KEY (cosmetic_id) REFERENCES public.cosmetics(id) ON DELETE CASCADE;
ALTER TABLE public.user_cosmetics ADD CONSTRAINT user_cosmetics_cosmetic_id_fkey FOREIGN KEY (cosmetic_id) REFERENCES public.cosmetics(id) ON DELETE CASCADE;
ALTER TABLE public.user_currency_balances ADD CONSTRAINT user_currency_balances_currency_id_fkey FOREIGN KEY (currency_id) REFERENCES public.virtual_currencies(id) ON DELETE CASCADE;
ALTER TABLE public.user_currency_balances ADD CONSTRAINT user_currency_balances_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.user_currency_balances ADD CONSTRAINT user_currency_balances_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.user_devices ADD CONSTRAINT user_devices_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.user_gamification_preferences ADD CONSTRAINT user_gamification_preferences_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.user_gamification_preferences ADD CONSTRAINT user_gamification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.user_legal_acceptances ADD CONSTRAINT user_legal_acceptances_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.legal_documents(id) ON DELETE CASCADE;
ALTER TABLE public.user_legal_acceptances ADD CONSTRAINT user_legal_acceptances_tenant_id_snapshot_fkey FOREIGN KEY (tenant_id_snapshot) REFERENCES public.tenants(id) ON DELETE SET NULL;
ALTER TABLE public.user_legal_acceptances ADD CONSTRAINT user_legal_acceptances_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.user_mfa ADD CONSTRAINT user_mfa_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.user_mfa ADD CONSTRAINT user_mfa_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.user_powerup_consumptions ADD CONSTRAINT user_powerup_consumptions_shop_item_id_fkey FOREIGN KEY (shop_item_id) REFERENCES public.shop_items(id) ON DELETE CASCADE;
ALTER TABLE public.user_powerup_consumptions ADD CONSTRAINT user_powerup_consumptions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.user_powerup_consumptions ADD CONSTRAINT user_powerup_consumptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.user_powerup_effects ADD CONSTRAINT user_powerup_effects_consumption_id_fkey FOREIGN KEY (consumption_id) REFERENCES public.user_powerup_consumptions(id) ON DELETE CASCADE;
ALTER TABLE public.user_powerup_effects ADD CONSTRAINT user_powerup_effects_shop_item_id_fkey FOREIGN KEY (shop_item_id) REFERENCES public.shop_items(id) ON DELETE CASCADE;
ALTER TABLE public.user_powerup_effects ADD CONSTRAINT user_powerup_effects_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.user_powerup_effects ADD CONSTRAINT user_powerup_effects_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.user_powerup_inventory ADD CONSTRAINT user_powerup_inventory_shop_item_id_fkey FOREIGN KEY (shop_item_id) REFERENCES public.shop_items(id) ON DELETE CASCADE;
ALTER TABLE public.user_powerup_inventory ADD CONSTRAINT user_powerup_inventory_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.user_powerup_inventory ADD CONSTRAINT user_powerup_inventory_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.user_preferences ADD CONSTRAINT user_preferences_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.user_preferences ADD CONSTRAINT user_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.user_progress ADD CONSTRAINT user_progress_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.user_progress ADD CONSTRAINT user_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.user_purchases ADD CONSTRAINT user_purchases_coin_transaction_id_fkey FOREIGN KEY (coin_transaction_id) REFERENCES public.coin_transactions(id) ON DELETE SET NULL;
ALTER TABLE public.user_purchases ADD CONSTRAINT user_purchases_currency_id_fkey FOREIGN KEY (currency_id) REFERENCES public.virtual_currencies(id) ON DELETE SET NULL;
ALTER TABLE public.user_purchases ADD CONSTRAINT user_purchases_gifted_from_user_id_fkey FOREIGN KEY (gifted_from_user_id) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.user_purchases ADD CONSTRAINT user_purchases_shop_item_id_fkey FOREIGN KEY (shop_item_id) REFERENCES public.shop_items(id) ON DELETE CASCADE;
ALTER TABLE public.user_purchases ADD CONSTRAINT user_purchases_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.user_purchases ADD CONSTRAINT user_purchases_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.user_restrictions ADD CONSTRAINT user_restrictions_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.user_restrictions ADD CONSTRAINT user_restrictions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.user_restrictions ADD CONSTRAINT user_restrictions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.user_sessions ADD CONSTRAINT user_sessions_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.user_devices(id) ON DELETE SET NULL;
ALTER TABLE public.user_sessions ADD CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.user_streaks ADD CONSTRAINT user_streaks_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.user_streaks ADD CONSTRAINT user_streaks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.user_tenant_memberships ADD CONSTRAINT user_tenant_memberships_seat_assignment_id_fkey FOREIGN KEY (seat_assignment_id) REFERENCES public.tenant_seat_assignments(id);
ALTER TABLE public.user_tenant_memberships ADD CONSTRAINT user_tenant_memberships_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.user_tenant_memberships ADD CONSTRAINT user_tenant_memberships_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.virtual_currencies ADD CONSTRAINT virtual_currencies_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- 5. VIEWS
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

CREATE VIEW public.cookie_consent_statistics AS  SELECT date_trunc('day'::text, created_at) AS date,
    event_type,
    consent_version,
    count(*) AS event_count,
    count(DISTINCT consent_id) AS unique_consents,
    sum(
        CASE
            WHEN ((new_state ->> 'functional'::text))::boolean THEN 1
            ELSE 0
        END) AS functional_accepted,
    sum(
        CASE
            WHEN ((new_state ->> 'analytics'::text))::boolean THEN 1
            ELSE 0
        END) AS analytics_accepted,
    sum(
        CASE
            WHEN ((new_state ->> 'marketing'::text))::boolean THEN 1
            ELSE 0
        END) AS marketing_accepted,
    sum(
        CASE
            WHEN dnt_enabled THEN 1
            ELSE 0
        END) AS dnt_count,
    sum(
        CASE
            WHEN gpc_enabled THEN 1
            ELSE 0
        END) AS gpc_count
   FROM public.cookie_consent_audit
  WHERE (created_at > (now() - '90 days'::interval))
  GROUP BY (date_trunc('day'::text, created_at)), event_type, consent_version
  ORDER BY (date_trunc('day'::text, created_at)) DESC;

CREATE VIEW public.tenant_memberships
WITH (security_invoker = on)
AS  SELECT id,
    user_id,
    tenant_id,
    role,
    is_primary,
    created_at,
    updated_at,
    status,
    seat_assignment_id
   FROM public.user_tenant_memberships;

CREATE VIEW public.v_gamification_daily_economy AS  SELECT tenant_id,
    (date_trunc('day'::text, created_at))::date AS day,
    sum(
        CASE
            WHEN (type = 'earn'::text) THEN amount
            ELSE 0
        END) AS coins_minted,
    sum(
        CASE
            WHEN (type = 'spend'::text) THEN amount
            ELSE 0
        END) AS coins_burned,
    (sum(
        CASE
            WHEN (type = 'earn'::text) THEN amount
            ELSE 0
        END) - sum(
        CASE
            WHEN (type = 'spend'::text) THEN amount
            ELSE 0
        END)) AS net_flow,
    count(*) FILTER (WHERE (type = 'earn'::text)) AS mint_tx_count,
    count(*) FILTER (WHERE (type = 'spend'::text)) AS burn_tx_count
   FROM public.coin_transactions ct
  GROUP BY tenant_id, ((date_trunc('day'::text, created_at))::date);

CREATE VIEW public.v_gamification_leaderboard AS  SELECT uc.tenant_id,
    uc.user_id,
    u.email,
    uc.balance,
    uc.total_earned,
    uc.total_spent,
    up.level,
    up.current_xp,
    us.current_streak_days,
    us.best_streak_days,
    rank() OVER (PARTITION BY uc.tenant_id ORDER BY uc.total_earned DESC) AS rank_by_earned,
    rank() OVER (PARTITION BY uc.tenant_id ORDER BY up.current_xp DESC) AS rank_by_xp
   FROM ((((public.user_coins uc
     JOIN public.users u ON ((u.id = uc.user_id)))
     LEFT JOIN public.user_progress up ON (((up.user_id = uc.user_id) AND (NOT (up.tenant_id IS DISTINCT FROM uc.tenant_id)))))
     LEFT JOIN public.user_streaks us ON (((us.user_id = uc.user_id) AND (NOT (us.tenant_id IS DISTINCT FROM uc.tenant_id)))))
     LEFT JOIN public.user_gamification_preferences gp ON (((gp.user_id = uc.user_id) AND (NOT (gp.tenant_id IS DISTINCT FROM uc.tenant_id)))))
  WHERE (COALESCE(gp.leaderboard_visible, true) = true);

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- 6. INDEXES
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

CREATE INDEX idx_achievement_award_recipients_award_id ON public.achievement_award_recipients USING btree (award_id);
CREATE UNIQUE INDEX idx_achievement_award_recipients_unique ON public.achievement_award_recipients USING btree (award_id, user_id);
CREATE INDEX idx_achievement_award_recipients_user_id ON public.achievement_award_recipients USING btree (user_id);
CREATE INDEX idx_achievement_awards_achievement_id ON public.achievement_awards USING btree (achievement_id);
CREATE INDEX idx_achievement_awards_awarded_by ON public.achievement_awards USING btree (awarded_by);
CREATE INDEX idx_achievement_awards_created_at ON public.achievement_awards USING btree (created_at DESC);
CREATE UNIQUE INDEX idx_achievement_awards_idempotency ON public.achievement_awards USING btree (COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), idempotency_key);
CREATE INDEX idx_achievement_awards_tenant_id ON public.achievement_awards USING btree (tenant_id);
CREATE INDEX idx_achievement_leaderboards_rank ON public.achievement_leaderboards USING btree (rank);
CREATE INDEX idx_achievement_leaderboards_season ON public.achievement_leaderboards USING btree (season_number);
CREATE INDEX idx_achievement_leaderboards_tenant_id ON public.achievement_leaderboards USING btree (tenant_id);
CREATE INDEX idx_achievement_translations_achievement_locale ON public.achievement_translations USING btree (achievement_id, locale);
CREATE INDEX achievements_achievement_key_idx ON public.achievements USING btree (achievement_key);
CREATE INDEX achievements_condition_type_idx ON public.achievements USING btree (condition_type);
CREATE UNIQUE INDEX achievements_scope_tenant_id_achievement_key_ux ON public.achievements USING btree (scope_tenant_id, achievement_key) WHERE (achievement_key IS NOT NULL);
CREATE INDEX achievements_tenant_id_idx ON public.achievements USING btree (tenant_id);
CREATE INDEX idx_achievements_created_by ON public.achievements USING btree (created_by);
CREATE INDEX idx_achievements_icon_media ON public.achievements USING btree (icon_media_id);
CREATE INDEX idx_achievements_scope_tenant ON public.achievements USING btree (scope, scope_tenant_id) WHERE (scope = 'tenant'::text);
CREATE INDEX idx_achievements_status ON public.achievements USING btree (status);
CREATE INDEX analytics_timeseries_metric_idx ON public.analytics_timeseries USING btree (metric_type, metric_name);
CREATE INDEX analytics_timeseries_tenant_idx ON public.analytics_timeseries USING btree (tenant_id);
CREATE INDEX analytics_timeseries_time_bucket_idx ON public.analytics_timeseries USING btree (time_bucket DESC);
CREATE INDEX analytics_timeseries_timeseries_key_idx ON public.analytics_timeseries USING btree (timeseries_key);
CREATE INDEX idx_anonymous_cookie_consents_consent_id ON public.anonymous_cookie_consents USING btree (consent_id);
CREATE INDEX idx_anonymous_cookie_consents_expires ON public.anonymous_cookie_consents USING btree (expires_at);
CREATE INDEX award_builder_exports_scope_created_at_idx ON public.award_builder_exports USING btree (scope_type, created_at DESC);
CREATE INDEX award_builder_exports_tenant_created_at_idx ON public.award_builder_exports USING btree (tenant_id, created_at DESC);
CREATE INDEX idx_badge_presets_category ON public.badge_presets USING btree (category);
CREATE INDEX idx_badge_presets_created_by ON public.badge_presets USING btree (created_by_user_id);
CREATE INDEX idx_badge_presets_tags ON public.badge_presets USING gin (tags);
CREATE INDEX idx_badge_presets_tenant_id ON public.badge_presets USING btree (tenant_id);
CREATE UNIQUE INDEX billing_accounts_provider_tenant_uidx ON public.billing_accounts USING btree (provider, tenant_id) WHERE (tenant_id IS NOT NULL);
CREATE UNIQUE INDEX billing_accounts_provider_user_uidx ON public.billing_accounts USING btree (provider, user_id) WHERE (user_id IS NOT NULL);
CREATE INDEX idx_billing_events_invoice_id ON public.billing_events USING btree (invoice_id);
CREATE INDEX idx_billing_events_payment_id ON public.billing_events USING btree (payment_id);
CREATE INDEX idx_billing_events_subscription_id ON public.billing_events USING btree (subscription_id);
CREATE INDEX idx_billing_history_created_at ON public.billing_history USING btree (created_at);
CREATE INDEX idx_billing_history_from_plan_id ON public.billing_history USING btree (from_plan_id);
CREATE INDEX idx_billing_history_subscription_id ON public.billing_history USING btree (subscription_id);
CREATE INDEX idx_billing_history_tenant_id ON public.billing_history USING btree (tenant_id);
CREATE INDEX idx_billing_history_to_plan_id ON public.billing_history USING btree (to_plan_id);
CREATE INDEX billing_products_active_idx ON public.billing_products USING btree (is_active);
CREATE INDEX billing_products_type_idx ON public.billing_products USING btree (type);
CREATE INDEX browse_search_logs_created_idx ON public.browse_search_logs USING btree (created_at);
CREATE INDEX browse_search_logs_tenant_idx ON public.browse_search_logs USING btree (tenant_id);
CREATE INDEX browse_search_logs_user_idx ON public.browse_search_logs USING btree (user_id);
CREATE INDEX bug_reports_bug_report_key_idx ON public.bug_reports USING btree (bug_report_key);
CREATE INDEX bug_reports_created_at_idx ON public.bug_reports USING btree (created_at DESC);
CREATE INDEX bug_reports_game_idx ON public.bug_reports USING btree (game_id);
CREATE INDEX bug_reports_is_resolved_idx ON public.bug_reports USING btree (is_resolved);
CREATE INDEX bug_reports_status_idx ON public.bug_reports USING btree (status);
CREATE INDEX bug_reports_tenant_idx ON public.bug_reports USING btree (tenant_id);
CREATE INDEX bug_reports_user_idx ON public.bug_reports USING btree (user_id);
CREATE INDEX idx_bundle_items_bundle_product_id ON public.bundle_items USING btree (bundle_product_id);
CREATE INDEX idx_bundle_items_child_product_id ON public.bundle_items USING btree (child_product_id);
CREATE INDEX idx_categories_is_public ON public.categories USING btree (is_public) WHERE (is_public = true);
CREATE INDEX idx_categories_slug ON public.categories USING btree (slug);
CREATE INDEX idx_categories_sort_order ON public.categories USING btree (sort_order);
CREATE INDEX idx_challenge_participation_challenge_id ON public.challenge_participation USING btree (challenge_id);
CREATE INDEX idx_challenge_participation_completed ON public.challenge_participation USING btree (completed);
CREATE INDEX idx_challenge_participation_tenant_id ON public.challenge_participation USING btree (tenant_id);
CREATE INDEX idx_challenge_participation_user_id ON public.challenge_participation USING btree (user_id);
CREATE INDEX coach_diagram_exports_scope_created_at_idx ON public.coach_diagram_exports USING btree (scope_type, created_at DESC);
CREATE INDEX coach_diagram_exports_tenant_created_at_idx ON public.coach_diagram_exports USING btree (tenant_id, created_at DESC);
CREATE INDEX idx_coin_transactions_created ON public.coin_transactions USING btree (created_at DESC);
CREATE UNIQUE INDEX idx_coin_transactions_idempotency ON public.coin_transactions USING btree (user_id, tenant_id, idempotency_key) WHERE (idempotency_key IS NOT NULL);
CREATE INDEX idx_coin_transactions_reversal_of ON public.coin_transactions USING btree (reversal_of);
CREATE INDEX idx_coin_transactions_tenant ON public.coin_transactions USING btree (tenant_id);
CREATE INDEX idx_coin_transactions_user ON public.coin_transactions USING btree (user_id);
CREATE INDEX idx_collection_items_collection_id ON public.collection_items USING btree (collection_id);
CREATE INDEX idx_collection_items_game_id ON public.collection_items USING btree (game_id);
CREATE INDEX idx_community_challenges_active ON public.community_challenges USING btree (status) WHERE ((status)::text = 'active'::text);
CREATE INDEX idx_community_challenges_created_by_user_id ON public.community_challenges USING btree (created_by_user_id);
CREATE INDEX idx_community_challenges_ends_at ON public.community_challenges USING btree (ends_at);
CREATE INDEX idx_community_challenges_status ON public.community_challenges USING btree (status);
CREATE INDEX idx_community_challenges_tenant_id ON public.community_challenges USING btree (tenant_id);
CREATE INDEX idx_consent_policy_versions_effective ON public.consent_policy_versions USING btree (effective_date DESC);
CREATE INDEX idx_content_analytics_content_id ON public.content_analytics USING btree (content_id);
CREATE INDEX idx_content_analytics_tenant_id ON public.content_analytics USING btree (tenant_id);
CREATE INDEX idx_content_collections_category ON public.content_collections USING btree (category);
CREATE INDEX idx_content_collections_created_by_user_id ON public.content_collections USING btree (created_by_user_id);
CREATE INDEX idx_content_collections_is_featured ON public.content_collections USING btree (is_featured);
CREATE INDEX idx_content_collections_is_published ON public.content_collections USING btree (is_published);
CREATE INDEX idx_content_collections_tenant_id ON public.content_collections USING btree (tenant_id);
CREATE INDEX idx_content_filter_rules_active ON public.content_filter_rules USING btree (is_active);
CREATE INDEX idx_content_filter_rules_created_by_user_id ON public.content_filter_rules USING btree (created_by_user_id);
CREATE INDEX idx_content_filter_rules_pattern ON public.content_filter_rules USING btree (pattern);
CREATE INDEX idx_content_filter_rules_tenant_id ON public.content_filter_rules USING btree (tenant_id);
CREATE INDEX idx_content_items_created_by_user_id ON public.content_items USING btree (created_by_user_id);
CREATE INDEX idx_content_items_is_featured ON public.content_items USING btree (is_featured);
CREATE INDEX idx_content_items_is_published ON public.content_items USING btree (is_published);
CREATE INDEX idx_content_items_tenant_id ON public.content_items USING btree (tenant_id);
CREATE INDEX idx_content_items_type ON public.content_items USING btree (type);
CREATE INDEX idx_content_preferences_category ON public.content_preferences USING btree (content_category);
CREATE INDEX idx_content_preferences_tenant ON public.content_preferences USING btree (tenant_id);
CREATE INDEX idx_content_preferences_user ON public.content_preferences USING btree (user_id);
CREATE INDEX idx_content_reports_assigned_to ON public.content_reports USING btree (assigned_to_user_id);
CREATE INDEX idx_content_reports_created_at ON public.content_reports USING btree (created_at);
CREATE INDEX idx_content_reports_priority ON public.content_reports USING btree (priority);
CREATE INDEX idx_content_reports_reported_by ON public.content_reports USING btree (reported_by_user_id);
CREATE INDEX idx_content_reports_status ON public.content_reports USING btree (status);
CREATE INDEX idx_content_reports_tenant_id ON public.content_reports USING btree (tenant_id);
CREATE INDEX idx_content_schedules_content_id ON public.content_schedules USING btree (content_id);
CREATE INDEX idx_content_schedules_end_date ON public.content_schedules USING btree (end_date);
CREATE INDEX idx_content_schedules_start_date ON public.content_schedules USING btree (start_date);
CREATE INDEX idx_content_schedules_tenant_id ON public.content_schedules USING btree (tenant_id);
CREATE INDEX idx_ccc_secondary_purposes_purpose ON public.conversation_card_collection_secondary_purposes USING btree (purpose_id);
CREATE INDEX idx_conversation_card_collections_created_by_user_id ON public.conversation_card_collections USING btree (created_by_user_id);
CREATE INDEX idx_conversation_card_collections_main_purpose ON public.conversation_card_collections USING btree (main_purpose_id);
CREATE INDEX idx_conversation_card_collections_scope ON public.conversation_card_collections USING btree (scope_type, tenant_id);
CREATE INDEX idx_conversation_card_collections_status ON public.conversation_card_collections USING btree (status);
CREATE INDEX idx_conversation_cards_collection_order ON public.conversation_cards USING btree (collection_id, sort_order);
CREATE INDEX idx_cookie_consent_audit_consent_id ON public.cookie_consent_audit USING btree (consent_id, created_at DESC);
CREATE INDEX idx_cookie_consent_audit_created ON public.cookie_consent_audit USING btree (created_at DESC);
CREATE INDEX idx_cookie_consent_audit_event_type ON public.cookie_consent_audit USING btree (event_type, created_at DESC);
CREATE INDEX idx_cookie_consent_audit_user_id ON public.cookie_consent_audit USING btree (user_id) WHERE (user_id IS NOT NULL);
CREATE INDEX idx_cookie_consents_cookie ON public.cookie_consents USING btree (cookie_key);
CREATE INDEX idx_cookie_consents_user ON public.cookie_consents USING btree (user_id, schema_version);
CREATE INDEX idx_unlock_rules_cosmetic ON public.cosmetic_unlock_rules USING btree (cosmetic_id);
CREATE INDEX idx_unlock_rules_type ON public.cosmetic_unlock_rules USING btree (unlock_type);
CREATE INDEX idx_cosmetics_category ON public.cosmetics USING btree (category);
CREATE INDEX idx_cosmetics_faction ON public.cosmetics USING btree (faction_id);
CREATE INDEX idx_cosmetics_rarity ON public.cosmetics USING btree (rarity);
CREATE INDEX idx_data_access_log_accessor ON public.data_access_log USING btree (accessor_user_id, created_at DESC);
CREATE INDEX idx_data_access_log_operation ON public.data_access_log USING btree (operation, created_at DESC);
CREATE INDEX idx_data_access_log_subject ON public.data_access_log USING btree (subject_user_id, created_at DESC);
CREATE INDEX idx_data_access_log_tenant ON public.data_access_log USING btree (tenant_id, created_at DESC);
CREATE UNIQUE INDEX idx_data_retention_policies_unique ON public.data_retention_policies USING btree (COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), data_category);
CREATE INDEX idx_demo_sessions_converted ON public.demo_sessions USING btree (converted, created_at);
CREATE INDEX idx_demo_sessions_ended ON public.demo_sessions USING btree (ended_at) WHERE (ended_at IS NOT NULL);
CREATE INDEX idx_demo_sessions_expires ON public.demo_sessions USING btree (expires_at) WHERE (ended_at IS NULL);
CREATE INDEX idx_demo_sessions_tenant_id ON public.demo_sessions USING btree (tenant_id);
CREATE INDEX idx_demo_sessions_tier ON public.demo_sessions USING btree (demo_tier, created_at);
CREATE INDEX idx_demo_sessions_user_id ON public.demo_sessions USING btree (user_id);
CREATE INDEX idx_dunning_actions_failure ON public.dunning_actions USING btree (payment_failure_id);
CREATE INDEX idx_dunning_actions_type ON public.dunning_actions USING btree (action_type);
CREATE INDEX error_tracking_created_at_idx ON public.error_tracking USING btree (created_at DESC);
CREATE INDEX error_tracking_error_key_idx ON public.error_tracking USING btree (error_key);
CREATE INDEX error_tracking_error_type_idx ON public.error_tracking USING btree (error_type);
CREATE INDEX error_tracking_resolved_idx ON public.error_tracking USING btree (resolved);
CREATE INDEX error_tracking_tenant_idx ON public.error_tracking USING btree (tenant_id);
CREATE INDEX error_tracking_user_idx ON public.error_tracking USING btree (user_id);
CREATE INDEX idx_event_rewards_claimed ON public.event_rewards USING btree (claimed);
CREATE INDEX idx_event_rewards_event_id ON public.event_rewards USING btree (event_id);
CREATE INDEX idx_event_rewards_tenant_id ON public.event_rewards USING btree (tenant_id);
CREATE INDEX idx_event_rewards_user_id ON public.event_rewards USING btree (user_id);
CREATE INDEX feature_usage_action_type_idx ON public.feature_usage USING btree (action_type);
CREATE INDEX feature_usage_created_at_idx ON public.feature_usage USING btree (created_at DESC);
CREATE INDEX feature_usage_feature_key_idx ON public.feature_usage USING btree (feature_key);
CREATE INDEX feature_usage_feature_name_idx ON public.feature_usage USING btree (feature_name);
CREATE INDEX feature_usage_success_idx ON public.feature_usage USING btree (success);
CREATE INDEX feature_usage_tenant_idx ON public.feature_usage USING btree (tenant_id);
CREATE INDEX feature_usage_user_idx ON public.feature_usage USING btree (user_id);
CREATE INDEX feedback_created_at_idx ON public.feedback USING btree (created_at DESC);
CREATE INDEX feedback_feedback_key_idx ON public.feedback USING btree (feedback_key);
CREATE INDEX feedback_game_idx ON public.feedback USING btree (game_id);
CREATE INDEX feedback_status_idx ON public.feedback USING btree (status);
CREATE INDEX feedback_tenant_idx ON public.feedback USING btree (tenant_id);
CREATE INDEX feedback_type_idx ON public.feedback USING btree (type);
CREATE INDEX feedback_user_idx ON public.feedback USING btree (user_id);
CREATE INDEX idx_friend_requests_recipient ON public.friend_requests USING btree (recipient_id);
CREATE INDEX idx_friend_requests_requester ON public.friend_requests USING btree (requester_id);
CREATE INDEX idx_friend_requests_status ON public.friend_requests USING btree (status);
CREATE INDEX idx_friends_tenant_id_1 ON public.friends USING btree (tenant_id_1);
CREATE INDEX idx_friends_tenant_id_2 ON public.friends USING btree (tenant_id_2);
CREATE INDEX idx_friends_user_id_1 ON public.friends USING btree (user_id_1);
CREATE INDEX idx_friends_user_id_2 ON public.friends USING btree (user_id_2);
CREATE INDEX funnel_analytics_completed_idx ON public.funnel_analytics USING btree (completed);
CREATE INDEX funnel_analytics_created_at_idx ON public.funnel_analytics USING btree (created_at DESC);
CREATE INDEX funnel_analytics_funnel_key_idx ON public.funnel_analytics USING btree (funnel_key);
CREATE INDEX funnel_analytics_funnel_name_idx ON public.funnel_analytics USING btree (funnel_name);
CREATE INDEX funnel_analytics_tenant_idx ON public.funnel_analytics USING btree (tenant_id);
CREATE INDEX funnel_analytics_user_idx ON public.funnel_analytics USING btree (user_id);
CREATE INDEX idx_game_artifact_variants_artifact_order ON public.game_artifact_variants USING btree (artifact_id, variant_order);
CREATE INDEX idx_game_artifact_variants_media_ref ON public.game_artifact_variants USING btree (media_ref);
CREATE INDEX idx_game_artifact_variants_visible_to_role_id ON public.game_artifact_variants USING btree (visible_to_role_id);
CREATE INDEX idx_game_artifacts_game_locale ON public.game_artifacts USING btree (game_id, locale);
CREATE INDEX idx_game_artifacts_game_order ON public.game_artifacts USING btree (game_id, artifact_order);
CREATE INDEX idx_game_board_config_background_media_id ON public.game_board_config USING btree (background_media_id);
CREATE INDEX idx_game_board_config_game_locale ON public.game_board_config USING btree (game_id, locale);
CREATE UNIQUE INDEX idx_game_materials_unique_locale ON public.game_materials USING btree (game_id, locale);
CREATE UNIQUE INDEX game_media_unique_cover ON public.game_media USING btree (game_id) WHERE (kind = 'cover'::public.game_media_kind);
CREATE INDEX idx_game_media_game_id ON public.game_media USING btree (game_id);
CREATE INDEX idx_game_media_media_id ON public.game_media USING btree (media_id);
CREATE INDEX idx_game_media_position ON public.game_media USING btree (game_id, "position");
CREATE INDEX idx_game_media_tenant_id ON public.game_media USING btree (tenant_id);
CREATE INDEX idx_game_phases_game_locale ON public.game_phases USING btree (game_id, locale);
CREATE INDEX idx_game_phases_game_order ON public.game_phases USING btree (game_id, phase_order);
CREATE INDEX game_reactions_game_id_idx ON public.game_reactions USING btree (game_id);
CREATE INDEX game_reactions_user_id_idx ON public.game_reactions USING btree (user_id);
CREATE INDEX game_reactions_user_reaction_idx ON public.game_reactions USING btree (user_id, reaction);
CREATE INDEX idx_game_roles_game_locale ON public.game_roles USING btree (game_id, locale);
CREATE INDEX idx_game_roles_game_order ON public.game_roles USING btree (game_id, role_order);
CREATE INDEX game_scores_created_at_idx ON public.game_scores USING btree (created_at);
CREATE INDEX game_scores_game_idx ON public.game_scores USING btree (game_id);
CREATE INDEX game_scores_score_key_idx ON public.game_scores USING btree (score_key);
CREATE INDEX game_scores_session_idx ON public.game_scores USING btree (session_id);
CREATE INDEX game_scores_tenant_idx ON public.game_scores USING btree (tenant_id);
CREATE INDEX game_scores_user_idx ON public.game_scores USING btree (user_id);
CREATE INDEX game_secondary_purposes_game_idx ON public.game_secondary_purposes USING btree (game_id);
CREATE INDEX game_secondary_purposes_purpose_idx ON public.game_secondary_purposes USING btree (purpose_id);
CREATE INDEX game_sessions_created_at_idx ON public.game_sessions USING btree (created_at);
CREATE INDEX game_sessions_game_idx ON public.game_sessions USING btree (game_id);
CREATE INDEX game_sessions_session_key_idx ON public.game_sessions USING btree (session_key);
CREATE INDEX game_sessions_status_idx ON public.game_sessions USING btree (status);
CREATE INDEX game_sessions_tenant_idx ON public.game_sessions USING btree (tenant_id);
CREATE INDEX game_sessions_user_idx ON public.game_sessions USING btree (user_id);
CREATE INDEX idx_game_snapshots_created ON public.game_snapshots USING btree (created_at DESC);
CREATE INDEX idx_game_snapshots_game ON public.game_snapshots USING btree (game_id);
CREATE UNIQUE INDEX idx_game_snapshots_game_version ON public.game_snapshots USING btree (game_id, version);
CREATE INDEX idx_game_snapshots_version ON public.game_snapshots USING btree (game_id, version DESC);
CREATE INDEX idx_game_steps_game_order ON public.game_steps USING btree (game_id, step_order);
CREATE INDEX idx_game_steps_locale ON public.game_steps USING btree (locale) WHERE (locale IS NOT NULL);
CREATE INDEX idx_game_steps_media_ref ON public.game_steps USING btree (media_ref);
CREATE INDEX idx_game_steps_phase_id ON public.game_steps USING btree (phase_id);
CREATE INDEX idx_game_tools_game_id ON public.game_tools USING btree (game_id);
CREATE INDEX idx_game_translations_locale ON public.game_translations USING btree (locale);
CREATE INDEX idx_game_triggers_condition_type ON public.game_triggers USING btree (((condition ->> 'type'::text)));
CREATE INDEX idx_game_triggers_game_id ON public.game_triggers USING btree (game_id);
CREATE INDEX games_game_key_idx ON public.games USING btree (game_key);
CREATE INDEX games_main_purpose_idx ON public.games USING btree (main_purpose_id);
CREATE INDEX games_owner_tenant_idx ON public.games USING btree (owner_tenant_id);
CREATE INDEX games_popularity_score_idx ON public.games USING btree (popularity_score DESC NULLS LAST);
CREATE INDEX games_product_idx ON public.games USING btree (product_id);
CREATE INDEX games_rating_idx ON public.games USING btree (rating_average DESC NULLS LAST, rating_count DESC NULLS LAST);
CREATE INDEX games_status_idx ON public.games USING btree (status);
CREATE INDEX idx_games_age_range ON public.games USING btree (age_min, age_max);
CREATE INDEX idx_games_browse_sort ON public.games USING btree (popularity_score DESC, created_at DESC, id DESC) WHERE (status = 'published'::public.game_status_enum);
CREATE INDEX idx_games_category ON public.games USING btree (category);
CREATE INDEX idx_games_created_by ON public.games USING btree (created_by);
CREATE INDEX idx_games_demo_content ON public.games USING btree (is_demo_content) WHERE (is_demo_content = true);
CREATE INDEX idx_games_energy_level ON public.games USING btree (energy_level);
CREATE INDEX idx_games_external_ref ON public.games USING btree (external_ref) WHERE (external_ref IS NOT NULL);
CREATE UNIQUE INDEX idx_games_external_ref_source ON public.games USING btree (import_source, external_ref) WHERE ((external_ref IS NOT NULL) AND (import_source IS NOT NULL));
CREATE INDEX idx_games_location_type ON public.games USING btree (location_type);
CREATE INDEX idx_games_player_range ON public.games USING btree (min_players, max_players) WHERE (status = 'published'::public.game_status_enum);
CREATE INDEX idx_games_status_playmode ON public.games USING btree (status, play_mode) WHERE (play_mode IS NOT NULL);
CREATE INDEX idx_games_status_product ON public.games USING btree (status, product_id) WHERE (product_id IS NOT NULL);
CREATE INDEX idx_games_status_purpose ON public.games USING btree (status, main_purpose_id) WHERE (main_purpose_id IS NOT NULL);
CREATE INDEX idx_games_time_estimate ON public.games USING btree (time_estimate_min);
CREATE INDEX idx_games_updated_by ON public.games USING btree (updated_by);
CREATE INDEX idx_gamification_admin_award_recipients_coin_transaction_id ON public.gamification_admin_award_recipients USING btree (coin_transaction_id);
CREATE INDEX idx_gamification_admin_award_recipients_tenant_user ON public.gamification_admin_award_recipients USING btree (tenant_id, user_id);
CREATE INDEX idx_gamification_admin_award_request_recipients_tenant_user ON public.gamification_admin_award_request_recipients USING btree (tenant_id, user_id);
CREATE INDEX idx_gamification_admin_award_requests_award_id ON public.gamification_admin_award_requests USING btree (award_id);
CREATE INDEX idx_gamification_admin_award_requests_decided_by_user_id ON public.gamification_admin_award_requests USING btree (decided_by_user_id);
CREATE UNIQUE INDEX idx_gamification_admin_award_requests_idempotency ON public.gamification_admin_award_requests USING btree (tenant_id, idempotency_key);
CREATE INDEX idx_gamification_admin_award_requests_requester_user_id ON public.gamification_admin_award_requests USING btree (requester_user_id);
CREATE INDEX idx_gamification_admin_award_requests_tenant_created ON public.gamification_admin_award_requests USING btree (tenant_id, created_at DESC);
CREATE INDEX idx_gamification_admin_award_requests_tenant_status_created ON public.gamification_admin_award_requests USING btree (tenant_id, status, created_at DESC);
CREATE INDEX idx_gamification_admin_awards_actor_user_id ON public.gamification_admin_awards USING btree (actor_user_id);
CREATE UNIQUE INDEX idx_gamification_admin_awards_idempotency ON public.gamification_admin_awards USING btree (tenant_id, idempotency_key);
CREATE INDEX idx_gamification_admin_awards_tenant_created ON public.gamification_admin_awards USING btree (tenant_id, created_at DESC);
CREATE INDEX idx_gamification_automation_rules_created_by_user_id ON public.gamification_automation_rules USING btree (created_by_user_id);
CREATE INDEX idx_gamification_automation_rules_global ON public.gamification_automation_rules USING btree (event_type, is_active) WHERE (tenant_id IS NULL);
CREATE INDEX idx_gamification_automation_rules_tenant_event_active ON public.gamification_automation_rules USING btree (tenant_id, event_type, is_active);
CREATE INDEX idx_gamification_burn_log_created ON public.gamification_burn_log USING btree (created_at DESC);
CREATE INDEX idx_gamification_burn_log_sink ON public.gamification_burn_log USING btree (sink_id);
CREATE INDEX idx_gamification_burn_log_user ON public.gamification_burn_log USING btree (user_id, tenant_id);
CREATE INDEX idx_gamification_burn_sinks_available ON public.gamification_burn_sinks USING btree (is_available, available_from, available_until) WHERE (is_available = true);
CREATE INDEX idx_gamification_burn_sinks_tenant ON public.gamification_burn_sinks USING btree (tenant_id);
CREATE INDEX idx_gamification_burn_sinks_type ON public.gamification_burn_sinks USING btree (sink_type, is_available);
CREATE INDEX idx_gamification_campaign_templates_created_by_user_id ON public.gamification_campaign_templates USING btree (created_by_user_id);
CREATE INDEX idx_gamification_campaign_templates_tenant ON public.gamification_campaign_templates USING btree (tenant_id, sort_order, created_at DESC);
CREATE INDEX idx_gamification_campaigns_created_by_user_id ON public.gamification_campaigns USING btree (created_by_user_id);
CREATE INDEX idx_gamification_campaigns_source_template_id ON public.gamification_campaigns USING btree (source_template_id);
CREATE INDEX idx_gamification_campaigns_tenant_active ON public.gamification_campaigns USING btree (tenant_id, is_active, starts_at, ends_at);
CREATE UNIQUE INDEX uq_gamification_campaigns_tenant_idempotency ON public.gamification_campaigns USING btree (tenant_id, idempotency_key) WHERE (idempotency_key IS NOT NULL);
CREATE INDEX idx_gamification_cooldowns_event ON public.gamification_cooldowns USING btree (event_type, cooldown_type);
CREATE INDEX idx_gamification_cooldowns_last_triggered ON public.gamification_cooldowns USING btree (last_triggered_at);
CREATE UNIQUE INDEX idx_gamification_cooldowns_streak ON public.gamification_cooldowns USING btree (user_id, tenant_id, event_type, cooldown_type, streak_id) WHERE ((cooldown_type = 'once_per_streak'::text) AND (streak_id IS NOT NULL));
CREATE INDEX idx_gamification_cooldowns_user_tenant ON public.gamification_cooldowns USING btree (user_id, tenant_id);
CREATE INDEX idx_gamification_daily_earnings_date ON public.gamification_daily_earnings USING btree (earning_date);
CREATE INDEX idx_gamification_daily_earnings_user_date ON public.gamification_daily_earnings USING btree (user_id, tenant_id, earning_date DESC);
CREATE INDEX idx_gamification_daily_summaries_tenant_day ON public.gamification_daily_summaries USING btree (tenant_id, day DESC);
CREATE INDEX idx_gamification_events_actor_created ON public.gamification_events USING btree (tenant_id, actor_user_id, created_at DESC);
CREATE UNIQUE INDEX idx_gamification_events_idempotency_v2 ON public.gamification_events USING btree (COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), source, idempotency_key);
CREATE INDEX idx_gamification_events_tenant_created ON public.gamification_events USING btree (tenant_id, created_at DESC);
CREATE INDEX idx_gamification_level_definitions_tenant ON public.gamification_level_definitions USING btree (tenant_id);
CREATE UNIQUE INDEX uq_gamification_level_definitions_scope_level ON public.gamification_level_definitions USING btree (COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), level);
CREATE UNIQUE INDEX idx_gamification_softcap_global ON public.gamification_softcap_config USING btree ((true)) WHERE (tenant_id IS NULL);
CREATE INDEX idx_gamification_softcap_tenant ON public.gamification_softcap_config USING btree (tenant_id);
CREATE INDEX idx_gdpr_requests_deadline ON public.gdpr_requests USING btree (response_deadline) WHERE (status = ANY (ARRAY['pending'::text, 'in_progress'::text]));
CREATE INDEX idx_gdpr_requests_handler ON public.gdpr_requests USING btree (handled_by) WHERE (status = 'in_progress'::text);
CREATE INDEX idx_gdpr_requests_user ON public.gdpr_requests USING btree (user_id, status);
CREATE INDEX idx_gift_purchases_code ON public.gift_purchases USING btree (redemption_code);
CREATE INDEX idx_gift_purchases_expires ON public.gift_purchases USING btree (redemption_code_expires_at) WHERE (status = 'paid'::text);
CREATE INDEX idx_gift_purchases_purchaser ON public.gift_purchases USING btree (purchaser_user_id);
CREATE INDEX idx_gift_purchases_recipient_email ON public.gift_purchases USING btree (recipient_email) WHERE (recipient_email IS NOT NULL);
CREATE INDEX idx_gift_purchases_status ON public.gift_purchases USING btree (status);
CREATE INDEX idx_interest_profiles_category ON public.interest_profiles USING btree (interest_category);
CREATE INDEX idx_interest_profiles_tenant ON public.interest_profiles USING btree (tenant_id);
CREATE INDEX idx_interest_profiles_user ON public.interest_profiles USING btree (user_id);
CREATE INDEX idx_invoices_billing_product_id ON public.invoices USING btree (billing_product_id);
CREATE INDEX invoices_due_date_idx ON public.invoices USING btree (due_date);
CREATE INDEX invoices_status_idx ON public.invoices USING btree (status);
CREATE INDEX invoices_subscription_idx ON public.invoices USING btree (subscription_id);
CREATE INDEX invoices_tenant_idx ON public.invoices USING btree (tenant_id);
CREATE INDEX idx_leader_profile_user_tenant ON public.leader_profile USING btree (user_id, tenant_id);
CREATE INDEX leaderboards_game_idx ON public.leaderboards USING btree (game_id);
CREATE INDEX leaderboards_leaderboard_key_idx ON public.leaderboards USING btree (leaderboard_key);
CREATE INDEX leaderboards_leaderboard_type_idx ON public.leaderboards USING btree (leaderboard_type);
CREATE INDEX leaderboards_tenant_idx ON public.leaderboards USING btree (tenant_id);
CREATE INDEX leaderboards_total_score_idx ON public.leaderboards USING btree (total_score DESC);
CREATE INDEX leaderboards_updated_at_idx ON public.leaderboards USING btree (updated_at);
CREATE INDEX leaderboards_user_idx ON public.leaderboards USING btree (user_id);
CREATE INDEX learning_course_attempts_course_idx ON public.learning_course_attempts USING btree (course_id);
CREATE INDEX learning_course_attempts_submitted_idx ON public.learning_course_attempts USING btree (submitted_at);
CREATE INDEX learning_course_attempts_tenant_idx ON public.learning_course_attempts USING btree (tenant_id);
CREATE INDEX learning_course_attempts_user_idx ON public.learning_course_attempts USING btree (user_id);
CREATE INDEX idx_learning_course_translations_course_locale ON public.learning_course_translations USING btree (course_id, locale);
CREATE INDEX idx_learning_courses_created_by ON public.learning_courses USING btree (created_by);
CREATE INDEX learning_courses_created_at_idx ON public.learning_courses USING btree (created_at);
CREATE INDEX learning_courses_slug_idx ON public.learning_courses USING btree (slug);
CREATE INDEX learning_courses_status_idx ON public.learning_courses USING btree (status);
CREATE INDEX learning_courses_tenant_idx ON public.learning_courses USING btree (tenant_id);
CREATE INDEX learning_path_edges_from_idx ON public.learning_path_edges USING btree (from_course_id);
CREATE INDEX learning_path_edges_path_idx ON public.learning_path_edges USING btree (path_id);
CREATE INDEX learning_path_edges_to_idx ON public.learning_path_edges USING btree (to_course_id);
CREATE INDEX learning_path_nodes_course_idx ON public.learning_path_nodes USING btree (course_id);
CREATE INDEX learning_path_nodes_path_idx ON public.learning_path_nodes USING btree (path_id);
CREATE INDEX idx_learning_path_translations_path_locale ON public.learning_path_translations USING btree (path_id, locale);
CREATE INDEX idx_learning_paths_created_by ON public.learning_paths USING btree (created_by);
CREATE INDEX learning_paths_kind_idx ON public.learning_paths USING btree (kind);
CREATE INDEX learning_paths_status_idx ON public.learning_paths USING btree (status);
CREATE INDEX learning_paths_tenant_idx ON public.learning_paths USING btree (tenant_id);
CREATE INDEX idx_learning_requirements_active ON public.learning_requirements USING btree (is_active) WHERE (is_active = true);
CREATE INDEX idx_learning_requirements_created_by ON public.learning_requirements USING btree (created_by);
CREATE INDEX idx_learning_requirements_target ON public.learning_requirements USING gin (target_ref);
CREATE INDEX learning_requirements_active_idx ON public.learning_requirements USING btree (is_active);
CREATE INDEX learning_requirements_course_idx ON public.learning_requirements USING btree (required_course_id);
CREATE INDEX learning_requirements_tenant_idx ON public.learning_requirements USING btree (tenant_id);
CREATE INDEX learning_requirements_type_idx ON public.learning_requirements USING btree (requirement_type);
CREATE INDEX learning_user_progress_completed_idx ON public.learning_user_progress USING btree (completed_at);
CREATE INDEX learning_user_progress_course_idx ON public.learning_user_progress USING btree (course_id);
CREATE INDEX learning_user_progress_status_idx ON public.learning_user_progress USING btree (status);
CREATE INDEX learning_user_progress_tenant_idx ON public.learning_user_progress USING btree (tenant_id);
CREATE INDEX learning_user_progress_user_idx ON public.learning_user_progress USING btree (user_id);
CREATE INDEX idx_legal_audit_log_created ON public.legal_audit_log USING btree (created_at DESC);
CREATE INDEX idx_legal_audit_log_doc ON public.legal_audit_log USING btree (document_id);
CREATE INDEX idx_legal_audit_log_tenant ON public.legal_audit_log USING btree (tenant_id);
CREATE INDEX idx_legal_document_drafts_updated ON public.legal_document_drafts USING btree (updated_at DESC);
CREATE UNIQUE INDEX legal_document_drafts_unique ON public.legal_document_drafts USING btree (type, locale, scope, COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE INDEX idx_legal_documents_active ON public.legal_documents USING btree (type, locale) WHERE is_active;
CREATE UNIQUE INDEX legal_documents_unique_active ON public.legal_documents USING btree (type, locale, scope, COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid)) WHERE is_active;
CREATE UNIQUE INDEX legal_documents_unique_version ON public.legal_documents USING btree (type, locale, scope, COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), version_int);
CREATE INDEX idx_limited_time_events_active ON public.limited_time_events USING btree (status) WHERE ((status)::text = 'active'::text);
CREATE INDEX idx_limited_time_events_created_by_user_id ON public.limited_time_events USING btree (created_by_user_id);
CREATE INDEX idx_limited_time_events_ends_at ON public.limited_time_events USING btree (ends_at);
CREATE INDEX idx_limited_time_events_status ON public.limited_time_events USING btree (status);
CREATE INDEX idx_limited_time_events_tenant_id ON public.limited_time_events USING btree (tenant_id);
CREATE INDEX idx_marketing_features_audience ON public.marketing_features USING btree (audience);
CREATE INDEX idx_marketing_features_featured ON public.marketing_features USING btree (is_featured) WHERE (is_featured = true);
CREATE INDEX idx_marketing_features_priority ON public.marketing_features USING btree (priority DESC);
CREATE INDEX idx_marketing_features_status ON public.marketing_features USING btree (status);
CREATE INDEX idx_marketing_features_use_case ON public.marketing_features USING btree (use_case);
CREATE INDEX idx_marketing_updates_published ON public.marketing_updates USING btree (published_at DESC NULLS LAST);
CREATE INDEX idx_marketing_updates_status ON public.marketing_updates USING btree (status);
CREATE INDEX idx_marketing_updates_type ON public.marketing_updates USING btree (type);
CREATE INDEX idx_marketplace_analytics_date ON public.marketplace_analytics USING btree (date);
CREATE INDEX idx_marketplace_analytics_most_popular_item_id ON public.marketplace_analytics USING btree (most_popular_item_id);
CREATE INDEX idx_marketplace_analytics_tenant_id ON public.marketplace_analytics USING btree (tenant_id);
CREATE INDEX idx_media_tenant_id ON public.media USING btree (tenant_id);
CREATE INDEX media_game_idx ON public.media USING btree (game_id);
CREATE INDEX media_media_key_idx ON public.media USING btree (media_key);
CREATE INDEX media_product_idx ON public.media USING btree (product_id);
CREATE INDEX media_purpose_idx ON public.media USING btree (purpose_id);
CREATE INDEX media_type_idx ON public.media USING btree (type);
CREATE INDEX idx_media_ai_created ON public.media_ai_generations USING btree (created_at DESC);
CREATE INDEX idx_media_ai_generations_media_id ON public.media_ai_generations USING btree (media_id);
CREATE INDEX idx_media_ai_status ON public.media_ai_generations USING btree (status);
CREATE INDEX idx_media_ai_tenant ON public.media_ai_generations USING btree (tenant_id);
CREATE INDEX idx_media_ai_user ON public.media_ai_generations USING btree (user_id);
CREATE INDEX idx_media_templates_main_purpose ON public.media_templates USING btree (main_purpose_id);
CREATE INDEX idx_media_templates_media_id ON public.media_templates USING btree (media_id);
CREATE INDEX idx_media_templates_priority ON public.media_templates USING btree (priority DESC);
CREATE INDEX idx_media_templates_product ON public.media_templates USING btree (product_id);
CREATE INDEX idx_media_templates_sub_purpose ON public.media_templates USING btree (sub_purpose_id);
CREATE INDEX idx_mfa_audit_log_event_type ON public.mfa_audit_log USING btree (event_type, created_at DESC);
CREATE INDEX idx_mfa_audit_log_failures ON public.mfa_audit_log USING btree (user_id, created_at DESC) WHERE (success = false);
CREATE INDEX idx_mfa_audit_log_tenant ON public.mfa_audit_log USING btree (tenant_id, created_at DESC);
CREATE INDEX idx_mfa_audit_log_user ON public.mfa_audit_log USING btree (user_id, created_at DESC);
CREATE INDEX idx_mfa_trusted_devices_expiry ON public.mfa_trusted_devices USING btree (expires_at) WHERE (NOT is_revoked);
CREATE INDEX idx_mfa_trusted_devices_lookup ON public.mfa_trusted_devices USING btree (trust_token_hash) WHERE (NOT is_revoked);
CREATE INDEX idx_mfa_trusted_devices_tenant ON public.mfa_trusted_devices USING btree (tenant_id);
CREATE INDEX idx_mfa_trusted_devices_user ON public.mfa_trusted_devices USING btree (user_id);
CREATE INDEX idx_mfa_trusted_devices_user_tenant ON public.mfa_trusted_devices USING btree (user_id, tenant_id) WHERE (NOT is_revoked);
CREATE INDEX idx_moderation_actions_expires_at ON public.moderation_actions USING btree (expires_at);
CREATE INDEX idx_moderation_actions_taken_by ON public.moderation_actions USING btree (taken_by_user_id);
CREATE INDEX idx_moderation_actions_target_user ON public.moderation_actions USING btree (target_user_id);
CREATE INDEX idx_moderation_actions_tenant_id ON public.moderation_actions USING btree (tenant_id);
CREATE INDEX idx_moderation_analytics_date ON public.moderation_analytics USING btree (date);
CREATE INDEX idx_moderation_analytics_tenant_id ON public.moderation_analytics USING btree (tenant_id);
CREATE INDEX idx_moderation_queue_assigned_to ON public.moderation_queue USING btree (assigned_to_user_id);
CREATE INDEX idx_moderation_queue_priority ON public.moderation_queue USING btree (priority);
CREATE INDEX idx_moderation_queue_report_id ON public.moderation_queue USING btree (report_id);
CREATE INDEX idx_moderation_queue_status ON public.moderation_queue USING btree (status);
CREATE INDEX idx_moderation_queue_tenant_id ON public.moderation_queue USING btree (tenant_id);
CREATE INDEX idx_multiplayer_participants_session_id ON public.multiplayer_participants USING btree (session_id);
CREATE INDEX idx_multiplayer_participants_user_id ON public.multiplayer_participants USING btree (user_id);
CREATE INDEX idx_multiplayer_sessions_created_by ON public.multiplayer_sessions USING btree (created_by_user_id);
CREATE INDEX idx_multiplayer_sessions_game_id ON public.multiplayer_sessions USING btree (game_id);
CREATE INDEX idx_multiplayer_sessions_status ON public.multiplayer_sessions USING btree (status);
CREATE INDEX idx_notification_deliveries_notification ON public.notification_deliveries USING btree (notification_id);
CREATE INDEX idx_notification_deliveries_unread ON public.notification_deliveries USING btree (user_id, read_at) WHERE (read_at IS NULL);
CREATE INDEX idx_notification_deliveries_user ON public.notification_deliveries USING btree (user_id);
CREATE INDEX idx_notification_deliveries_user_active ON public.notification_deliveries USING btree (user_id, delivered_at DESC) WHERE (dismissed_at IS NULL);
CREATE INDEX idx_notification_read_status_notification_id ON public.notification_deliveries USING btree (notification_id);
CREATE INDEX idx_notification_read_status_user_id ON public.notification_deliveries USING btree (user_id);
CREATE INDEX idx_notification_read_status_user_notification ON public.notification_deliveries USING btree (user_id, notification_id);
CREATE INDEX idx_notification_log_notification_id ON public.notification_log USING btree (notification_id);
CREATE INDEX idx_notification_log_status ON public.notification_log USING btree (status);
CREATE INDEX idx_notification_log_user_id ON public.notification_log USING btree (user_id);
CREATE INDEX idx_notification_preferences_tenant_id ON public.notification_preferences USING btree (tenant_id);
CREATE INDEX idx_notification_preferences_user_id ON public.notification_preferences USING btree (user_id);
CREATE INDEX idx_notification_template_translations_template_locale ON public.notification_template_translations USING btree (template_id, locale);
CREATE INDEX notification_templates_category_idx ON public.notification_templates USING btree (category);
CREATE INDEX notification_templates_key_idx ON public.notification_templates USING btree (template_key);
CREATE INDEX notification_templates_tenant_idx ON public.notification_templates USING btree (tenant_id);
CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at);
CREATE INDEX idx_notifications_expires_at ON public.notifications USING btree (expires_at);
CREATE INDEX idx_notifications_is_read ON public.notifications USING btree (is_read);
CREATE INDEX idx_notifications_status_schedule ON public.notifications USING btree (status, schedule_at) WHERE (status = 'scheduled'::text);
CREATE INDEX idx_notifications_tenant_id ON public.notifications USING btree (tenant_id);
CREATE INDEX idx_notifications_type ON public.notifications USING btree (type);
CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);
CREATE UNIQUE INDEX notifications_event_key_unique_idx ON public.notifications USING btree (user_id, event_key) WHERE (event_key IS NOT NULL);
CREATE INDEX idx_org_legal_acceptances_tenant ON public.org_legal_acceptances USING btree (tenant_id);
CREATE INDEX page_views_created_at_idx ON public.page_views USING btree (created_at DESC);
CREATE INDEX page_views_page_path_idx ON public.page_views USING btree (page_path);
CREATE INDEX page_views_page_view_key_idx ON public.page_views USING btree (page_view_key);
CREATE INDEX page_views_tenant_idx ON public.page_views USING btree (tenant_id);
CREATE INDEX page_views_user_idx ON public.page_views USING btree (user_id);
CREATE INDEX idx_participant_achievement_unlocks_achievement ON public.participant_achievement_unlocks USING btree (achievement_id);
CREATE INDEX idx_participant_achievement_unlocks_game_progress_id ON public.participant_achievement_unlocks USING btree (game_progress_id);
CREATE INDEX idx_participant_achievement_unlocks_participant ON public.participant_achievement_unlocks USING btree (participant_id);
CREATE INDEX idx_participant_achievement_unlocks_session ON public.participant_achievement_unlocks USING btree (session_id);
CREATE INDEX idx_participant_achievement_unlocks_tenant ON public.participant_achievement_unlocks USING btree (tenant_id);
CREATE INDEX idx_activity_log_event_type ON public.participant_activity_log USING btree (event_type, session_id);
CREATE INDEX idx_activity_log_participant ON public.participant_activity_log USING btree (participant_id, created_at DESC);
CREATE INDEX idx_activity_log_session ON public.participant_activity_log USING btree (session_id, created_at DESC);
CREATE INDEX idx_participant_game_progress_game ON public.participant_game_progress USING btree (game_id);
CREATE INDEX idx_participant_game_progress_participant ON public.participant_game_progress USING btree (participant_id);
CREATE INDEX idx_participant_game_progress_session ON public.participant_game_progress USING btree (session_id);
CREATE INDEX idx_participant_game_progress_status ON public.participant_game_progress USING btree (status);
CREATE INDEX idx_participant_game_progress_tenant ON public.participant_game_progress USING btree (tenant_id);
CREATE INDEX idx_role_assignments_participant ON public.participant_role_assignments USING btree (participant_id);
CREATE INDEX idx_role_assignments_session ON public.participant_role_assignments USING btree (session_id);
CREATE INDEX idx_role_assignments_session_secret_revealed ON public.participant_role_assignments USING btree (session_id, secret_instructions_revealed_at);
CREATE INDEX idx_participant_sessions_code ON public.participant_sessions USING btree (session_code) WHERE (status = 'active'::public.participant_session_status);
CREATE INDEX idx_participant_sessions_expires ON public.participant_sessions USING btree (expires_at) WHERE (expires_at IS NOT NULL);
CREATE INDEX idx_participant_sessions_game_id ON public.participant_sessions USING btree (game_id);
CREATE INDEX idx_participant_sessions_host ON public.participant_sessions USING btree (host_user_id);
CREATE INDEX idx_participant_sessions_plan_id ON public.participant_sessions USING btree (plan_id);
CREATE INDEX idx_participant_sessions_snapshot ON public.participant_sessions USING btree (game_snapshot_id);
CREATE INDEX idx_participant_sessions_status ON public.participant_sessions USING btree (status, tenant_id);
CREATE INDEX idx_participant_sessions_tenant ON public.participant_sessions USING btree (tenant_id);
CREATE INDEX idx_participants_last_seen ON public.participants USING btree (last_seen_at) WHERE (status = 'active'::public.participant_status);
CREATE INDEX idx_participants_session ON public.participants USING btree (session_id, status);
CREATE INDEX idx_participants_token ON public.participants USING btree (participant_token) WHERE (status <> ALL (ARRAY['kicked'::public.participant_status, 'blocked'::public.participant_status]));
CREATE INDEX idx_participants_token_expiry ON public.participants USING btree (token_expires_at) WHERE (token_expires_at IS NOT NULL);
CREATE INDEX idx_payment_failures_grace_period ON public.payment_failures USING btree (grace_period_ends_at) WHERE (grace_period_ends_at IS NOT NULL);
CREATE INDEX idx_payment_failures_next_retry ON public.payment_failures USING btree (next_retry_at) WHERE (status = ANY (ARRAY['pending'::text, 'retrying'::text]));
CREATE INDEX idx_payment_failures_status ON public.payment_failures USING btree (status);
CREATE INDEX idx_payment_failures_tenant ON public.payment_failures USING btree (tenant_id);
CREATE INDEX idx_payment_methods_tenant_id ON public.payment_methods USING btree (tenant_id);
CREATE INDEX payments_invoice_idx ON public.payments USING btree (invoice_id);
CREATE INDEX payments_provider_idx ON public.payments USING btree (provider);
CREATE INDEX payments_status_idx ON public.payments USING btree (status);
CREATE INDEX payments_transaction_reference_idx ON public.payments USING btree (transaction_reference);
CREATE INDEX idx_personalization_events_tenant ON public.personalization_events USING btree (tenant_id);
CREATE INDEX idx_personalization_events_type ON public.personalization_events USING btree (event_type);
CREATE INDEX idx_personalization_events_user ON public.personalization_events USING btree (user_id);
CREATE INDEX idx_plan_blocks_created_by ON public.plan_blocks USING btree (created_by);
CREATE INDEX idx_plan_blocks_game_id ON public.plan_blocks USING btree (game_id);
CREATE INDEX idx_plan_blocks_updated_by ON public.plan_blocks USING btree (updated_by);
CREATE INDEX plan_blocks_plan_idx ON public.plan_blocks USING btree (plan_id);
CREATE INDEX plan_blocks_position_idx ON public.plan_blocks USING btree (plan_id, "position");
CREATE INDEX idx_plan_notes_private_author ON public.plan_notes_private USING btree (created_by);
CREATE INDEX idx_plan_notes_private_plan ON public.plan_notes_private USING btree (plan_id);
CREATE INDEX idx_plan_notes_private_updated_by ON public.plan_notes_private USING btree (updated_by);
CREATE INDEX idx_plan_notes_tenant_created_by ON public.plan_notes_tenant USING btree (created_by);
CREATE INDEX idx_plan_notes_tenant_plan ON public.plan_notes_tenant USING btree (plan_id);
CREATE INDEX idx_plan_notes_tenant_tenant ON public.plan_notes_tenant USING btree (tenant_id);
CREATE INDEX idx_plan_notes_tenant_updated_by ON public.plan_notes_tenant USING btree (updated_by);
CREATE INDEX idx_plan_play_progress_current_block_id ON public.plan_play_progress USING btree (current_block_id);
CREATE INDEX idx_plan_play_progress_plan ON public.plan_play_progress USING btree (plan_id);
CREATE INDEX idx_plan_play_progress_user ON public.plan_play_progress USING btree (user_id);
CREATE INDEX idx_plan_version_blocks_version ON public.plan_version_blocks USING btree (plan_version_id);
CREATE INDEX idx_plans_created_by ON public.plans USING btree (created_by);
CREATE INDEX idx_plans_current_version_id ON public.plans USING btree (current_version_id);
CREATE INDEX idx_plans_updated_by ON public.plans USING btree (updated_by);
CREATE INDEX plans_owner_tenant_idx ON public.plans USING btree (owner_tenant_id);
CREATE INDEX plans_owner_user_idx ON public.plans USING btree (owner_user_id);
CREATE INDEX plans_plan_key_idx ON public.plans USING btree (plan_key);
CREATE INDEX plans_visibility_idx ON public.plans USING btree (visibility);
CREATE INDEX idx_play_chat_messages_recipient ON public.play_chat_messages USING btree (recipient_participant_id) WHERE (recipient_participant_id IS NOT NULL);
CREATE INDEX idx_play_chat_messages_sender_participant_id ON public.play_chat_messages USING btree (sender_participant_id);
CREATE INDEX idx_play_chat_messages_session_created ON public.play_chat_messages USING btree (session_id, created_at DESC);
CREATE INDEX idx_player_cosmetics_is_equipped ON public.player_cosmetics USING btree (is_equipped);
CREATE INDEX idx_player_cosmetics_tenant_id ON public.player_cosmetics USING btree (tenant_id);
CREATE UNIQUE INDEX idx_player_cosmetics_unique_item ON public.player_cosmetics USING btree (user_id, tenant_id, shop_item_id);
CREATE INDEX idx_player_cosmetics_user_id ON public.player_cosmetics USING btree (user_id);
CREATE INDEX idx_private_subscriptions_stripe_id ON public.private_subscriptions USING btree (stripe_subscription_id);
CREATE INDEX private_subscriptions_billing_product_idx ON public.private_subscriptions USING btree (billing_product_id);
CREATE INDEX private_subscriptions_status_idx ON public.private_subscriptions USING btree (status);
CREATE UNIQUE INDEX private_subscriptions_stripe_id_uidx ON public.private_subscriptions USING btree (stripe_subscription_id) WHERE (stripe_subscription_id IS NOT NULL);
CREATE INDEX private_subscriptions_user_idx ON public.private_subscriptions USING btree (user_id);
CREATE INDEX idx_product_audit_log_actor ON public.product_audit_log USING btree (actor_id) WHERE (actor_id IS NOT NULL);
CREATE INDEX idx_product_audit_log_event_type ON public.product_audit_log USING btree (event_type);
CREATE INDEX idx_product_audit_log_product_created ON public.product_audit_log USING btree (product_id, created_at DESC);
CREATE INDEX product_prices_active_idx ON public.product_prices USING btree (active);
CREATE INDEX product_prices_currency_idx ON public.product_prices USING btree (currency);
CREATE UNIQUE INDEX product_prices_default_unique_idx ON public.product_prices USING btree (product_id, currency, "interval") WHERE (is_default = true);
CREATE UNIQUE INDEX product_prices_lookup_key_unique_idx ON public.product_prices USING btree (lookup_key) WHERE (lookup_key IS NOT NULL);
CREATE INDEX product_prices_product_id_idx ON public.product_prices USING btree (product_id);
CREATE INDEX product_prices_stripe_price_id_idx ON public.product_prices USING btree (stripe_price_id);
CREATE INDEX product_purposes_product_idx ON public.product_purposes USING btree (product_id);
CREATE INDEX product_purposes_purpose_idx ON public.product_purposes USING btree (purpose_id);
CREATE INDEX idx_products_category_slug ON public.products USING btree (category_slug);
CREATE INDEX idx_products_category_slug_visible ON public.products USING btree (category_slug, is_marketing_visible) WHERE (is_marketing_visible = true);
CREATE INDEX idx_products_is_bundle ON public.products USING btree (is_bundle) WHERE (is_bundle = true);
CREATE INDEX idx_products_marketing_visible ON public.products USING btree (is_marketing_visible) WHERE (is_marketing_visible = true);
CREATE INDEX products_category_idx ON public.products USING btree (category);
CREATE INDEX products_product_key_idx ON public.products USING btree (product_key);
CREATE INDEX products_status_idx ON public.products USING btree (status);
CREATE INDEX products_stripe_product_id_idx ON public.products USING btree (stripe_product_id);
CREATE INDEX products_stripe_sync_status_idx ON public.products USING btree (stripe_sync_status);
CREATE INDEX products_unit_label_idx ON public.products USING btree (unit_label);
CREATE INDEX idx_promo_codes_code ON public.promo_codes USING btree (code);
CREATE INDEX idx_promo_codes_created_by_user_id ON public.promo_codes USING btree (created_by_user_id);
CREATE INDEX idx_promo_codes_is_active ON public.promo_codes USING btree (is_active);
CREATE INDEX idx_promo_codes_tenant_id ON public.promo_codes USING btree (tenant_id);
CREATE UNIQUE INDEX purchase_intents_pending_unique ON public.purchase_intents USING btree (user_id, product_id) WHERE (status = ANY (ARRAY['draft'::text, 'awaiting_payment'::text]));
CREATE INDEX purchase_intents_status_idx ON public.purchase_intents USING btree (status);
CREATE INDEX purchase_intents_tenant_idx ON public.purchase_intents USING btree (tenant_id);
CREATE INDEX purchase_intents_user_idx ON public.purchase_intents USING btree (user_id);
CREATE INDEX idx_purposes_standard ON public.purposes USING btree (is_standard);
CREATE INDEX idx_purposes_tenant ON public.purposes USING btree (tenant_id);
CREATE INDEX purposes_parent_idx ON public.purposes USING btree (parent_id);
CREATE INDEX purposes_purpose_key_idx ON public.purposes USING btree (purpose_key);
CREATE INDEX purposes_type_idx ON public.purposes USING btree (type);
CREATE INDEX idx_quote_activities_quote ON public.quote_activities USING btree (quote_id);
CREATE INDEX idx_quote_line_items_quote ON public.quote_line_items USING btree (quote_id);
CREATE INDEX idx_quotes_created_by ON public.quotes USING btree (created_by);
CREATE INDEX idx_quotes_status ON public.quotes USING btree (status);
CREATE INDEX idx_quotes_tenant ON public.quotes USING btree (tenant_id);
CREATE INDEX idx_quotes_valid_until ON public.quotes USING btree (valid_until) WHERE (status = ANY (ARRAY['sent'::text, 'viewed'::text]));
CREATE INDEX idx_recommendation_history_clicked ON public.recommendation_history USING btree (was_clicked);
CREATE INDEX idx_recommendation_history_tenant ON public.recommendation_history USING btree (tenant_id);
CREATE INDEX idx_recommendation_history_user ON public.recommendation_history USING btree (user_id);
CREATE UNIQUE INDEX role_permissions_unique_idx ON public.role_permissions USING btree (role, scope, resource, action);
CREATE INDEX idx_run_sessions_run_id ON public.run_sessions USING btree (run_id);
CREATE UNIQUE INDEX idx_run_sessions_session_id ON public.run_sessions USING btree (session_id) WHERE (session_id IS NOT NULL);
CREATE UNIQUE INDEX idx_runs_active_per_user_version ON public.runs USING btree (plan_version_id, user_id) WHERE (status = ANY (ARRAY['not_started'::public.plan_run_status_enum, 'in_progress'::public.plan_run_status_enum]));
CREATE INDEX idx_runs_heartbeat_active ON public.runs USING btree (last_heartbeat_at) WHERE (status = ANY (ARRAY['not_started'::public.plan_run_status_enum, 'in_progress'::public.plan_run_status_enum]));
CREATE INDEX idx_runs_plan ON public.runs USING btree (plan_id);
CREATE INDEX idx_runs_status ON public.runs USING btree (status) WHERE (status = ANY (ARRAY['not_started'::public.plan_run_status_enum, 'in_progress'::public.plan_run_status_enum]));
CREATE INDEX idx_runs_tenant_id ON public.runs USING btree (tenant_id);
CREATE INDEX idx_runs_user ON public.runs USING btree (user_id);
CREATE INDEX idx_runs_version ON public.runs USING btree (plan_version_id);
CREATE INDEX idx_saved_items_tenant ON public.saved_items USING btree (tenant_id);
CREATE INDEX idx_saved_items_type ON public.saved_items USING btree (item_type);
CREATE INDEX idx_saved_items_user ON public.saved_items USING btree (user_id);
CREATE INDEX idx_scheduled_job_runs_name_date ON public.scheduled_job_runs USING btree (job_name, started_at DESC);
CREATE INDEX idx_scheduled_job_runs_started_at ON public.scheduled_job_runs USING btree (started_at);
CREATE INDEX idx_seasonal_achievements_achievement_id ON public.seasonal_achievements USING btree (achievement_id);
CREATE INDEX idx_seasonal_achievements_season ON public.seasonal_achievements USING btree (season_number);
CREATE INDEX idx_seasonal_achievements_tenant_id ON public.seasonal_achievements USING btree (tenant_id);
CREATE INDEX idx_seasonal_events_featured_content_id ON public.seasonal_events USING btree (featured_content_id);
CREATE INDEX idx_seasonal_events_is_active ON public.seasonal_events USING btree (is_active);
CREATE INDEX idx_seasonal_events_start_date ON public.seasonal_events USING btree (start_date);
CREATE INDEX idx_seasonal_events_tenant_id ON public.seasonal_events USING btree (tenant_id);
CREATE INDEX session_analytics_completed_idx ON public.session_analytics USING btree (completed);
CREATE INDEX session_analytics_created_at_idx ON public.session_analytics USING btree (created_at DESC);
CREATE INDEX session_analytics_game_idx ON public.session_analytics USING btree (game_id);
CREATE INDEX session_analytics_session_key_idx ON public.session_analytics USING btree (session_key);
CREATE INDEX session_analytics_tenant_idx ON public.session_analytics USING btree (tenant_id);
CREATE INDEX session_analytics_user_idx ON public.session_analytics USING btree (user_id);
CREATE INDEX idx_session_artifact_assignments_participant ON public.session_artifact_assignments USING btree (participant_id);
CREATE INDEX idx_session_artifact_assignments_session ON public.session_artifact_assignments USING btree (session_id);
CREATE INDEX idx_session_artifact_state_artifact ON public.session_artifact_state USING btree (game_artifact_id);
CREATE INDEX idx_session_artifact_state_session ON public.session_artifact_state USING btree (session_id);
CREATE INDEX idx_session_artifact_variant_assignments_v2_participant ON public.session_artifact_variant_assignments_v2 USING btree (participant_id);
CREATE INDEX idx_session_artifact_variant_assignments_v2_session ON public.session_artifact_variant_assignments_v2 USING btree (session_id);
CREATE INDEX idx_session_artifact_variant_assignments_v2_variant ON public.session_artifact_variant_assignments_v2 USING btree (game_artifact_variant_id);
CREATE INDEX idx_session_artifact_variant_state_highlighted ON public.session_artifact_variant_state USING btree (session_id) WHERE (highlighted_at IS NOT NULL);
CREATE INDEX idx_session_artifact_variant_state_revealed ON public.session_artifact_variant_state USING btree (session_id) WHERE (revealed_at IS NOT NULL);
CREATE INDEX idx_session_artifact_variant_state_session ON public.session_artifact_variant_state USING btree (session_id);
CREATE INDEX idx_session_artifact_variants_artifact_order ON public.session_artifact_variants USING btree (session_artifact_id, variant_order);
CREATE INDEX idx_session_artifact_variants_media_ref ON public.session_artifact_variants USING btree (media_ref);
CREATE INDEX idx_session_artifact_variants_source_variant_id ON public.session_artifact_variants USING btree (source_variant_id);
CREATE INDEX idx_session_artifact_variants_visible_to_session_role_id ON public.session_artifact_variants USING btree (visible_to_session_role_id);
CREATE INDEX idx_session_artifacts_session_order ON public.session_artifacts USING btree (session_id, artifact_order);
CREATE INDEX idx_session_artifacts_source_artifact_id ON public.session_artifacts USING btree (source_artifact_id);
CREATE UNIQUE INDEX idx_session_commands_idempotent ON public.session_commands USING btree (session_id, client_id, client_seq);
CREATE INDEX idx_session_commands_session_time ON public.session_commands USING btree (session_id, created_at);
CREATE INDEX idx_session_decisions_session_status ON public.session_decisions USING btree (session_id, status);
CREATE INDEX idx_session_events_actor ON public.session_events USING btree (actor_type, actor_id) WHERE (actor_id IS NOT NULL);
CREATE INDEX idx_session_events_actor_participant_id ON public.session_events USING btree (actor_participant_id);
CREATE INDEX idx_session_events_correlation_id ON public.session_events USING btree (correlation_id) WHERE (correlation_id IS NOT NULL);
CREATE INDEX idx_session_events_event_category ON public.session_events USING btree (event_category);
CREATE INDEX idx_session_events_event_type ON public.session_events USING btree (event_type);
CREATE INDEX idx_session_events_session_created ON public.session_events USING btree (session_id, created_at DESC);
CREATE INDEX idx_session_events_session_id ON public.session_events USING btree (session_id);
CREATE INDEX idx_session_events_severity ON public.session_events USING btree (severity) WHERE (severity = ANY (ARRAY['warning'::text, 'error'::text]));
CREATE INDEX idx_session_events_target ON public.session_events USING btree (target_type, target_id) WHERE (target_id IS NOT NULL);
CREATE INDEX idx_session_events_type ON public.session_events USING btree (session_id, event_type);
CREATE INDEX idx_session_outcomes_related_decision_id ON public.session_outcomes USING btree (related_decision_id);
CREATE INDEX idx_session_outcomes_session ON public.session_outcomes USING btree (session_id);
CREATE INDEX idx_session_roles_order ON public.session_roles USING btree (session_id, role_order);
CREATE INDEX idx_session_roles_session ON public.session_roles USING btree (session_id);
CREATE INDEX idx_session_roles_source_role_id ON public.session_roles USING btree (source_role_id);
CREATE INDEX idx_session_signals_sender_participant_id ON public.session_signals USING btree (sender_participant_id);
CREATE INDEX idx_session_signals_session_channel ON public.session_signals USING btree (session_id, channel);
CREATE INDEX idx_session_signals_session_created ON public.session_signals USING btree (session_id, created_at DESC);
CREATE INDEX idx_session_statistics_session ON public.session_statistics USING btree (session_id);
CREATE INDEX idx_session_statistics_tenant ON public.session_statistics USING btree (tenant_id);
CREATE INDEX idx_session_time_bank_ledger_actor_participant_id ON public.session_time_bank_ledger USING btree (actor_participant_id);
CREATE INDEX idx_session_time_bank_ledger_event_id ON public.session_time_bank_ledger USING btree (event_id);
CREATE INDEX idx_time_bank_ledger_session_created ON public.session_time_bank_ledger USING btree (session_id, created_at DESC);
CREATE INDEX idx_time_bank_ledger_session_reason ON public.session_time_bank_ledger USING btree (session_id, reason);
CREATE INDEX idx_session_trigger_idempotency_session ON public.session_trigger_idempotency USING btree (session_id);
CREATE INDEX idx_session_trigger_state_armed ON public.session_trigger_state USING btree (session_id, status) WHERE (status = 'armed'::text);
CREATE INDEX idx_session_trigger_state_session ON public.session_trigger_state USING btree (session_id);
CREATE INDEX idx_session_trigger_state_trigger ON public.session_trigger_state USING btree (game_trigger_id);
CREATE INDEX idx_session_triggers_condition_type ON public.session_triggers USING btree (((condition ->> 'type'::text)));
CREATE INDEX idx_session_triggers_error ON public.session_triggers USING btree (session_id, status) WHERE (status = 'error'::text);
CREATE INDEX idx_session_triggers_session_id ON public.session_triggers USING btree (session_id);
CREATE INDEX idx_session_triggers_source_trigger_id ON public.session_triggers USING btree (source_trigger_id);
CREATE INDEX idx_session_triggers_status ON public.session_triggers USING btree (status);
CREATE INDEX idx_session_votes_decision ON public.session_votes USING btree (decision_id);
CREATE INDEX idx_session_votes_decision_option ON public.session_votes USING btree (decision_id, option_key);
CREATE INDEX idx_session_votes_participant ON public.session_votes USING btree (participant_id);
CREATE INDEX idx_shop_item_translations_item_locale ON public.shop_item_translations USING btree (item_id, locale);
CREATE INDEX idx_shop_items_category ON public.shop_items USING btree (category);
CREATE INDEX idx_shop_items_created_by_user_id ON public.shop_items USING btree (created_by_user_id);
CREATE INDEX idx_shop_items_currency_id ON public.shop_items USING btree (currency_id);
CREATE INDEX idx_shop_items_is_available ON public.shop_items USING btree (is_available);
CREATE INDEX idx_shop_items_is_featured ON public.shop_items USING btree (is_featured);
CREATE INDEX idx_shop_items_tenant_id ON public.shop_items USING btree (tenant_id);
CREATE INDEX idx_social_leaderboards_game_id ON public.social_leaderboards USING btree (game_id);
CREATE INDEX idx_social_leaderboards_score ON public.social_leaderboards USING btree (score DESC);
CREATE INDEX idx_social_leaderboards_tenant_id ON public.social_leaderboards USING btree (tenant_id);
CREATE INDEX idx_social_leaderboards_user_id ON public.social_leaderboards USING btree (user_id);
CREATE INDEX idx_spatial_artifacts_created_by ON public.spatial_artifacts USING btree (created_by);
CREATE INDEX idx_spatial_artifacts_created_by_vis ON public.spatial_artifacts USING btree (created_by, visibility) WHERE (tenant_id IS NULL);
CREATE INDEX idx_spatial_artifacts_global ON public.spatial_artifacts USING btree (visibility, updated_at DESC) WHERE (tenant_id IS NULL);
CREATE INDEX idx_spatial_artifacts_tenant_updated ON public.spatial_artifacts USING btree (tenant_id, updated_at DESC);
CREATE INDEX idx_spatial_artifacts_updated_at ON public.spatial_artifacts USING btree (updated_at DESC);
CREATE INDEX idx_subscriptions_billing_plan_id ON public.subscriptions USING btree (billing_plan_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions USING btree (status);
CREATE INDEX idx_subscriptions_tenant_id ON public.subscriptions USING btree (tenant_id);
CREATE INDEX support_faq_entries_category_idx ON public.support_faq_entries USING btree (category);
CREATE INDEX support_faq_entries_created_at_idx ON public.support_faq_entries USING btree (created_at DESC);
CREATE INDEX support_faq_entries_faq_key_idx ON public.support_faq_entries USING btree (faq_key);
CREATE INDEX support_faq_entries_is_published_idx ON public.support_faq_entries USING btree (is_published);
CREATE INDEX support_faq_entries_position_idx ON public.support_faq_entries USING btree ("position");
CREATE INDEX support_faq_entries_question_search_idx ON public.support_faq_entries USING gin (to_tsvector('swedish'::regconfig, question));
CREATE INDEX support_faq_entries_tenant_idx ON public.support_faq_entries USING btree (tenant_id);
CREATE INDEX support_reports_created_at_idx ON public.support_reports USING btree (created_at DESC);
CREATE INDEX support_reports_report_key_idx ON public.support_reports USING btree (report_key);
CREATE INDEX support_reports_tenant_idx ON public.support_reports USING btree (tenant_id);
CREATE INDEX support_tickets_assigned_to_idx ON public.support_tickets USING btree (assigned_to_user_id);
CREATE INDEX support_tickets_created_at_idx ON public.support_tickets USING btree (created_at DESC);
CREATE INDEX support_tickets_escalation_idx ON public.support_tickets USING btree (sla_deadline, escalation_level, status) WHERE ((sla_deadline IS NOT NULL) AND (status = ANY (ARRAY['open'::public.ticket_status_enum, 'in_progress'::public.ticket_status_enum])));
CREATE INDEX support_tickets_first_response_idx ON public.support_tickets USING btree (first_response_at);
CREATE INDEX support_tickets_needs_response_idx ON public.support_tickets USING btree (status, first_response_at, created_at DESC) WHERE ((first_response_at IS NULL) AND (status = ANY (ARRAY['open'::public.ticket_status_enum, 'in_progress'::public.ticket_status_enum])));
CREATE INDEX support_tickets_priority_idx ON public.support_tickets USING btree (priority);
CREATE INDEX support_tickets_sla_deadline_idx ON public.support_tickets USING btree (sla_deadline);
CREATE INDEX support_tickets_status_idx ON public.support_tickets USING btree (status);
CREATE INDEX support_tickets_tenant_idx ON public.support_tickets USING btree (tenant_id);
CREATE INDEX support_tickets_ticket_key_idx ON public.support_tickets USING btree (ticket_key);
CREATE INDEX support_tickets_user_idx ON public.support_tickets USING btree (user_id);
CREATE INDEX idx_system_audit_logs_created ON public.system_audit_logs USING btree (created_at DESC);
CREATE INDEX idx_system_audit_logs_event_created ON public.system_audit_logs USING btree (event_type, created_at DESC);
CREATE INDEX idx_system_audit_logs_tenant_created ON public.system_audit_logs USING btree (tenant_id, created_at DESC);
CREATE UNIQUE INDEX system_design_config_singleton ON public.system_design_config USING btree ((true));
CREATE INDEX idx_system_jobs_runs_job_name_started ON public.system_jobs_runs USING btree (job_name, started_at DESC);
CREATE INDEX idx_system_jobs_runs_status ON public.system_jobs_runs USING btree (status) WHERE (status <> 'ok'::public.system_job_run_status);
CREATE INDEX idx_tenant_audit_logs_actor_user_id ON public.tenant_audit_logs USING btree (actor_user_id);
CREATE INDEX idx_tenant_audit_logs_tenant_id ON public.tenant_audit_logs USING btree (tenant_id);
CREATE INDEX idx_tenant_branding_logo_media_id ON public.tenant_branding USING btree (logo_media_id);
CREATE INDEX tenant_domains_active_hostname_idx ON public.tenant_domains USING btree (hostname) WHERE (status = 'active'::text);
CREATE UNIQUE INDEX tenant_domains_hostname_unique_idx ON public.tenant_domains USING btree (hostname);
CREATE INDEX tenant_domains_tenant_id_idx ON public.tenant_domains USING btree (tenant_id);
CREATE INDEX tenant_entitlement_seat_assignments_entitlement_idx ON public.tenant_entitlement_seat_assignments USING btree (entitlement_id);
CREATE INDEX tenant_entitlement_seat_assignments_tenant_idx ON public.tenant_entitlement_seat_assignments USING btree (tenant_id);
CREATE UNIQUE INDEX tenant_entitlement_seat_assignments_unique_active ON public.tenant_entitlement_seat_assignments USING btree (entitlement_id, user_id) WHERE (status = 'active'::text);
CREATE INDEX tenant_entitlement_seat_assignments_user_idx ON public.tenant_entitlement_seat_assignments USING btree (user_id);
CREATE INDEX idx_tenant_invitations_invited_by ON public.tenant_invitations USING btree (invited_by);
CREATE INDEX idx_tenant_invitations_tenant_id ON public.tenant_invitations USING btree (tenant_id);
CREATE INDEX idx_tenant_mfa_policies_tenant ON public.tenant_mfa_policies USING btree (tenant_id);
CREATE INDEX tenant_product_entitlements_product_idx ON public.tenant_product_entitlements USING btree (product_id);
CREATE INDEX tenant_product_entitlements_tenant_idx ON public.tenant_product_entitlements USING btree (tenant_id);
CREATE INDEX idx_tenant_seat_assignments_assigned_by_user_id ON public.tenant_seat_assignments USING btree (assigned_by_user_id);
CREATE INDEX idx_tenant_seat_assignments_billing_product_id ON public.tenant_seat_assignments USING btree (billing_product_id);
CREATE INDEX tenant_seat_assignments_status_idx ON public.tenant_seat_assignments USING btree (status);
CREATE INDEX tenant_seat_assignments_subscription_idx ON public.tenant_seat_assignments USING btree (subscription_id);
CREATE INDEX tenant_seat_assignments_tenant_idx ON public.tenant_seat_assignments USING btree (tenant_id);
CREATE INDEX tenant_seat_assignments_user_idx ON public.tenant_seat_assignments USING btree (user_id);
CREATE INDEX idx_tenant_subscriptions_stripe_id ON public.tenant_subscriptions USING btree (stripe_subscription_id);
CREATE INDEX tenant_subscriptions_billing_product_idx ON public.tenant_subscriptions USING btree (billing_product_id);
CREATE INDEX tenant_subscriptions_status_idx ON public.tenant_subscriptions USING btree (status);
CREATE UNIQUE INDEX tenant_subscriptions_stripe_id_uidx ON public.tenant_subscriptions USING btree (stripe_subscription_id) WHERE (stripe_subscription_id IS NOT NULL);
CREATE INDEX tenant_subscriptions_tenant_idx ON public.tenant_subscriptions USING btree (tenant_id);
CREATE INDEX idx_tenant_translation_overrides_active ON public.tenant_translation_overrides USING btree (tenant_id, locale) WHERE (is_active = true);
CREATE INDEX idx_tenant_translation_overrides_tenant ON public.tenant_translation_overrides USING btree (tenant_id);
CREATE INDEX idx_tenants_created_by ON public.tenants USING btree (created_by);
CREATE INDEX idx_tenants_purge_after ON public.tenants USING btree (purge_after) WHERE ((status = 'anonymized'::text) AND (purge_after IS NOT NULL));
CREATE UNIQUE INDEX idx_tenants_slug ON public.tenants USING btree (slug);
CREATE INDEX idx_tenants_updated_by ON public.tenants USING btree (updated_by);
CREATE INDEX tenants_status_idx ON public.tenants USING btree (status);
CREATE INDEX tenants_tenant_key_idx ON public.tenants USING btree (tenant_key);
CREATE INDEX ticket_messages_created_at_idx ON public.ticket_messages USING btree (created_at);
CREATE INDEX ticket_messages_message_key_idx ON public.ticket_messages USING btree (message_key);
CREATE INDEX ticket_messages_ticket_idx ON public.ticket_messages USING btree (ticket_id);
CREATE INDEX ticket_messages_user_idx ON public.ticket_messages USING btree (user_id);
CREATE INDEX ticket_routing_rules_active_idx ON public.ticket_routing_rules USING btree (is_active, priority_order);
CREATE INDEX ticket_routing_rules_category_idx ON public.ticket_routing_rules USING btree (match_category);
CREATE INDEX ticket_routing_rules_tenant_idx ON public.ticket_routing_rules USING btree (tenant_id);
CREATE INDEX idx_translation_audit_log_created ON public.translation_audit_log USING btree (created_at DESC);
CREATE INDEX idx_translation_audit_log_record ON public.translation_audit_log USING btree (record_id);
CREATE INDEX idx_translation_audit_log_table ON public.translation_audit_log USING btree (table_name);
CREATE INDEX idx_translation_audit_log_tenant ON public.translation_audit_log USING btree (tenant_id);
CREATE INDEX idx_translation_audit_log_user ON public.translation_audit_log USING btree (user_id);
CREATE INDEX idx_translation_missing_keys_last_seen ON public.translation_missing_keys USING btree (last_seen DESC);
CREATE INDEX idx_translation_missing_keys_locale ON public.translation_missing_keys USING btree (locale);
CREATE INDEX idx_translation_missing_keys_namespace ON public.translation_missing_keys USING btree (namespace);
CREATE INDEX idx_translation_missing_keys_unresolved ON public.translation_missing_keys USING btree (resolved_at) WHERE (resolved_at IS NULL);
CREATE INDEX idx_usage_records_idempotency ON public.usage_records USING btree (idempotency_key) WHERE (idempotency_key IS NOT NULL);
CREATE INDEX idx_usage_records_period ON public.usage_records USING btree (period_start, period_end);
CREATE INDEX idx_usage_records_tenant_meter ON public.usage_records USING btree (tenant_id, meter_id);
CREATE INDEX idx_usage_records_timestamp ON public.usage_records USING btree ("timestamp");
CREATE INDEX idx_usage_summaries_tenant ON public.usage_summaries USING btree (tenant_id);
CREATE INDEX idx_usage_summaries_unbilled ON public.usage_summaries USING btree (billed) WHERE (billed = false);
CREATE INDEX idx_user_achievement_showcase_user ON public.user_achievement_showcase USING btree (user_id);
CREATE UNIQUE INDEX idx_user_achievements_unique_v1 ON public.user_achievements USING btree (user_id, achievement_id, COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE INDEX user_achievements_achievement_idx ON public.user_achievements USING btree (achievement_id);
CREATE INDEX user_achievements_tenant_idx ON public.user_achievements USING btree (tenant_id);
CREATE INDEX user_achievements_unlocked_at_idx ON public.user_achievements USING btree (unlocked_at);
CREATE INDEX user_achievements_user_idx ON public.user_achievements USING btree (user_id);
CREATE UNIQUE INDEX user_achievements_user_tenant_achievement_unique ON public.user_achievements USING btree (user_id, tenant_id, achievement_id);
CREATE INDEX idx_user_audit_logs_actor ON public.user_audit_logs USING btree (actor_user_id);
CREATE INDEX idx_user_audit_logs_created ON public.user_audit_logs USING btree (created_at);
CREATE INDEX idx_user_audit_logs_user ON public.user_audit_logs USING btree (user_id);
CREATE INDEX idx_user_coins_tenant ON public.user_coins USING btree (tenant_id);
CREATE INDEX idx_user_coins_user ON public.user_coins USING btree (user_id);
CREATE INDEX idx_user_consents_granted ON public.user_consents USING btree (user_id) WHERE (granted = true);
CREATE INDEX idx_user_consents_tenant ON public.user_consents USING btree (tenant_id) WHERE (tenant_id IS NOT NULL);
CREATE INDEX idx_user_consents_user ON public.user_consents USING btree (user_id, consent_type);
CREATE INDEX idx_loadout_user ON public.user_cosmetic_loadout USING btree (user_id);
CREATE INDEX idx_user_cosmetics_user ON public.user_cosmetics USING btree (user_id);
CREATE INDEX idx_user_currency_balances_currency_id ON public.user_currency_balances USING btree (currency_id);
CREATE INDEX idx_user_currency_balances_tenant_id ON public.user_currency_balances USING btree (tenant_id);
CREATE INDEX idx_user_currency_balances_user_id ON public.user_currency_balances USING btree (user_id);
CREATE INDEX idx_user_devices_last_seen ON public.user_devices USING btree (last_seen_at);
CREATE INDEX idx_user_devices_user ON public.user_devices USING btree (user_id);
CREATE INDEX idx_user_gamification_prefs_leaderboard ON public.user_gamification_preferences USING btree (tenant_id, leaderboard_visible) WHERE (leaderboard_visible = true);
CREATE INDEX idx_user_gamification_prefs_tenant ON public.user_gamification_preferences USING btree (tenant_id);
CREATE INDEX idx_user_gamification_prefs_user ON public.user_gamification_preferences USING btree (user_id);
CREATE INDEX idx_user_legal_acceptances_created ON public.user_legal_acceptances USING btree (accepted_at);
CREATE INDEX idx_user_legal_acceptances_document ON public.user_legal_acceptances USING btree (document_id);
CREATE INDEX idx_user_legal_acceptances_user ON public.user_legal_acceptances USING btree (user_id);
CREATE INDEX idx_user_mfa_grace_period ON public.user_mfa USING btree (grace_period_end) WHERE (grace_period_end IS NOT NULL);
CREATE INDEX idx_user_mfa_tenant ON public.user_mfa USING btree (tenant_id);
CREATE INDEX idx_user_powerup_consumptions_shop_item_id ON public.user_powerup_consumptions USING btree (shop_item_id);
CREATE INDEX idx_user_powerup_effects_shop_item_id ON public.user_powerup_effects USING btree (shop_item_id);
CREATE INDEX idx_user_preferences_tenant ON public.user_preferences USING btree (tenant_id);
CREATE INDEX idx_user_preferences_user ON public.user_preferences USING btree (user_id);
CREATE INDEX idx_user_preferences_user_tenant ON public.user_preferences USING btree (user_id, tenant_id);
CREATE INDEX idx_user_progress_tenant ON public.user_progress USING btree (tenant_id);
CREATE INDEX idx_user_progress_user ON public.user_progress USING btree (user_id);
CREATE INDEX idx_user_purchases_coin_transaction_id ON public.user_purchases USING btree (coin_transaction_id);
CREATE INDEX idx_user_purchases_created_at ON public.user_purchases USING btree (created_at);
CREATE INDEX idx_user_purchases_currency_id ON public.user_purchases USING btree (currency_id);
CREATE INDEX idx_user_purchases_gifted_from_user_id ON public.user_purchases USING btree (gifted_from_user_id);
CREATE UNIQUE INDEX idx_user_purchases_idempotency ON public.user_purchases USING btree (user_id, tenant_id, idempotency_key) WHERE (idempotency_key IS NOT NULL);
CREATE INDEX idx_user_purchases_shop_item_id ON public.user_purchases USING btree (shop_item_id);
CREATE INDEX idx_user_purchases_tenant_id ON public.user_purchases USING btree (tenant_id);
CREATE INDEX idx_user_purchases_user_id ON public.user_purchases USING btree (user_id);
CREATE INDEX idx_user_restrictions_active ON public.user_restrictions USING btree (active);
CREATE INDEX idx_user_restrictions_created_by_user_id ON public.user_restrictions USING btree (created_by_user_id);
CREATE INDEX idx_user_restrictions_expires ON public.user_restrictions USING btree (active_until);
CREATE INDEX idx_user_restrictions_tenant_id ON public.user_restrictions USING btree (tenant_id);
CREATE INDEX idx_user_restrictions_user_id ON public.user_restrictions USING btree (user_id);
CREATE INDEX idx_user_sessions_device_id ON public.user_sessions USING btree (device_id);
CREATE INDEX idx_user_sessions_session ON public.user_sessions USING btree (supabase_session_id);
CREATE INDEX idx_user_sessions_user ON public.user_sessions USING btree (user_id);
CREATE INDEX idx_user_streaks_tenant ON public.user_streaks USING btree (tenant_id);
CREATE INDEX idx_user_streaks_user ON public.user_streaks USING btree (user_id);
CREATE INDEX idx_user_tenant_memberships_seat_assignment_id ON public.user_tenant_memberships USING btree (seat_assignment_id);
CREATE INDEX idx_utm_user_status ON public.user_tenant_memberships USING btree (user_id, status);
CREATE INDEX user_tenant_memberships_role_idx ON public.user_tenant_memberships USING btree (role);
CREATE INDEX user_tenant_memberships_tenant_idx ON public.user_tenant_memberships USING btree (tenant_id);
CREATE INDEX user_tenant_memberships_user_idx ON public.user_tenant_memberships USING btree (user_id);
CREATE INDEX idx_users_demo_users ON public.users USING btree (is_demo_user, demo_last_used_at) WHERE (is_demo_user = true);
CREATE INDEX idx_users_ephemeral_users ON public.users USING btree (is_ephemeral, created_at) WHERE (is_ephemeral = true);
CREATE INDEX users_email_idx ON public.users USING btree (email);
CREATE INDEX users_role_idx ON public.users USING btree (role);
CREATE INDEX idx_virtual_currencies_code ON public.virtual_currencies USING btree (code);
CREATE INDEX idx_virtual_currencies_tenant_id ON public.virtual_currencies USING btree (tenant_id);

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- 7. FUNCTIONS
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

-- Forward declarations: these functions are referenced by other LANGUAGE sql functions
-- They will be replaced with full definitions later in alphabetical order.
CREATE OR REPLACE FUNCTION public.is_system_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN RETURN FALSE; END;
$function$;

CREATE OR REPLACE FUNCTION public.is_system_admin_jwt_only()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN RETURN FALSE; END;
$function$;

CREATE OR REPLACE FUNCTION public.achievements_set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.add_demo_feature_usage(session_id uuid, feature_name text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  UPDATE public.demo_sessions
  SET
    features_used = features_used || jsonb_build_object(
      'feature', feature_name,
      'timestamp', now(),
      'iso_timestamp', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    ),
    updated_at = now()
  WHERE id = session_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.add_initial_tenant_owner(target_tenant uuid, desired_role public.tenant_role_enum DEFAULT 'owner'::public.tenant_role_enum)
 RETURNS public.user_tenant_memberships
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  result public.user_tenant_memberships;
BEGIN
  -- Must be authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Prevent re-use: only works on fresh tenants with no members
  IF EXISTS (SELECT 1 FROM public.user_tenant_memberships WHERE tenant_id = target_tenant) THEN
    RAISE EXCEPTION 'Tenant already has members';
  END IF;

  -- Validate role
  IF desired_role NOT IN ('owner', 'admin', 'editor', 'member') THEN
    RAISE EXCEPTION 'Invalid role: %', desired_role;
  END IF;

  INSERT INTO user_tenant_memberships (user_id, tenant_id, role, is_primary)
  VALUES (auth.uid(), target_tenant, desired_role, TRUE)
  RETURNING * INTO result;

  RETURN result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_award_achievement_v1(p_achievement_id uuid, p_user_ids uuid[], p_message text DEFAULT NULL::text, p_tenant_id uuid DEFAULT NULL::uuid, p_idempotency_key text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_actor_id UUID;
  v_award_id UUID;
  v_existing_award_id UUID;
  v_achievement RECORD;
  v_user_id UUID;
  v_user_achievement_id UUID;
  v_existing_ua_id UUID;
  v_inserted_count INTEGER := 0;
  v_duplicate_count INTEGER := 0;
  v_lock_key BIGINT;
  v_final_idempotency_key TEXT;
  v_recipient_ids UUID[] := '{}';
  v_duplicate_ids UUID[] := '{}';
BEGIN
  -- Get actor from auth context
  v_actor_id := auth.uid();
  
  -- Validate caller is system_admin (using JWT-only version to avoid recursion)
  IF NOT public.is_system_admin_jwt_only() THEN
    RAISE EXCEPTION 'Forbidden: only system_admin can award achievements';
  END IF;
  
  -- Validate inputs
  IF p_achievement_id IS NULL THEN
    RAISE EXCEPTION 'p_achievement_id is required';
  END IF;
  
  IF p_user_ids IS NULL OR array_length(p_user_ids, 1) IS NULL OR array_length(p_user_ids, 1) = 0 THEN
    RAISE EXCEPTION 'p_user_ids must contain at least one user';
  END IF;
  
  -- Generate idempotency key if not provided
  v_final_idempotency_key := COALESCE(p_idempotency_key, gen_random_uuid()::text);
  
  -- Validate achievement exists and is awardable
  SELECT id, name, status, scope, tenant_id
  INTO v_achievement
  FROM public.achievements
  WHERE id = p_achievement_id;
  
  IF v_achievement IS NULL THEN
    RAISE EXCEPTION 'Achievement not found: %', p_achievement_id;
  END IF;
  
  IF v_achievement.status = 'archived' THEN
    RAISE EXCEPTION 'Cannot award archived achievement';
  END IF;
  
  -- For tenant-scoped achievements, validate tenant context
  IF v_achievement.scope = 'tenant' AND v_achievement.tenant_id IS NOT NULL THEN
    IF p_tenant_id IS NULL OR p_tenant_id != v_achievement.tenant_id THEN
      RAISE EXCEPTION 'Tenant context mismatch for tenant-scoped achievement';
    END IF;
  END IF;
  
  -- Advisory lock for idempotency
  v_lock_key := hashtextextended(
    COALESCE(p_tenant_id::text, 'global') || ':' || v_final_idempotency_key, 
    0
  );
  PERFORM pg_advisory_xact_lock(v_lock_key);
  
  -- Check for existing award with same idempotency key
  SELECT id INTO v_existing_award_id
  FROM public.achievement_awards
  WHERE idempotency_key = v_final_idempotency_key
    AND COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid) = 
        COALESCE(p_tenant_id, '00000000-0000-0000-0000-000000000000'::uuid)
  LIMIT 1;
  
  IF v_existing_award_id IS NOT NULL THEN
    -- Return existing award summary
    RETURN jsonb_build_object(
      'status', 'duplicate',
      'award_id', v_existing_award_id,
      'message', 'Award already processed with this idempotency key'
    );
  END IF;
  
  -- Create award event
  INSERT INTO public.achievement_awards (
    tenant_id,
    achievement_id,
    awarded_by,
    message,
    recipient_count,
    idempotency_key
  ) VALUES (
    p_tenant_id,
    p_achievement_id,
    v_actor_id,
    p_message,
    array_length(p_user_ids, 1),
    v_final_idempotency_key
  )
  RETURNING id INTO v_award_id;
  
  -- Process each user
  FOREACH v_user_id IN ARRAY p_user_ids
  LOOP
    -- Check if user already has this achievement
    SELECT id INTO v_existing_ua_id
    FROM public.user_achievements
    WHERE user_id = v_user_id AND achievement_id = p_achievement_id
    LIMIT 1;
    
    IF v_existing_ua_id IS NOT NULL THEN
      -- User already has achievement - record as duplicate
      INSERT INTO public.achievement_award_recipients (
        award_id,
        user_id,
        user_achievement_id,
        was_duplicate
      ) VALUES (
        v_award_id,
        v_user_id,
        v_existing_ua_id,
        TRUE
      );
      
      v_duplicate_count := v_duplicate_count + 1;
      v_duplicate_ids := array_append(v_duplicate_ids, v_user_id);
    ELSE
      -- Insert new user_achievement
      INSERT INTO public.user_achievements (
        achievement_id,
        user_id,
        tenant_id,
        unlocked_at
      ) VALUES (
        p_achievement_id,
        v_user_id,
        p_tenant_id,
        NOW()
      )
      ON CONFLICT (user_id, achievement_id) DO NOTHING
      RETURNING id INTO v_user_achievement_id;
      
      -- Handle race condition where ON CONFLICT triggered
      IF v_user_achievement_id IS NULL THEN
        SELECT id INTO v_user_achievement_id
        FROM public.user_achievements
        WHERE user_id = v_user_id AND achievement_id = p_achievement_id;
        
        INSERT INTO public.achievement_award_recipients (
          award_id,
          user_id,
          user_achievement_id,
          was_duplicate
        ) VALUES (
          v_award_id,
          v_user_id,
          v_user_achievement_id,
          TRUE
        );
        
        v_duplicate_count := v_duplicate_count + 1;
        v_duplicate_ids := array_append(v_duplicate_ids, v_user_id);
      ELSE
        -- Successfully created new unlock
        INSERT INTO public.achievement_award_recipients (
          award_id,
          user_id,
          user_achievement_id,
          was_duplicate
        ) VALUES (
          v_award_id,
          v_user_id,
          v_user_achievement_id,
          FALSE
        );
        
        v_inserted_count := v_inserted_count + 1;
        v_recipient_ids := array_append(v_recipient_ids, v_user_id);
      END IF;
    END IF;
  END LOOP;
  
  -- Return summary
  RETURN jsonb_build_object(
    'status', 'success',
    'award_id', v_award_id,
    'achievement_id', p_achievement_id,
    'achievement_name', v_achievement.name,
    'total_targeted', array_length(p_user_ids, 1),
    'inserted_count', v_inserted_count,
    'duplicate_count', v_duplicate_count,
    'awarded_user_ids', v_recipient_ids,
    'duplicate_user_ids', v_duplicate_ids,
    'message', p_message,
    'idempotency_key', v_final_idempotency_key
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_award_coins_v1(p_tenant_id uuid, p_actor_user_id uuid, p_target_user_ids uuid[], p_amount integer, p_message text, p_idempotency_key text)
 RETURNS TABLE(award_id uuid, recipient_user_id uuid, coin_transaction_id uuid, balance integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_award_id uuid;
  v_existing_id uuid;
  v_user_id uuid;
  v_lock_key bigint;
  v_tx_id uuid;
  v_balance integer;
  v_now timestamptz := now();
  v_metadata jsonb;
  v_per_user_idempotency text;
begin
  if p_tenant_id is null then
    raise exception 'p_tenant_id is required';
  end if;
  if p_actor_user_id is null then
    raise exception 'p_actor_user_id is required';
  end if;
  if p_target_user_ids is null or array_length(p_target_user_ids, 1) is null or array_length(p_target_user_ids, 1) = 0 then
    raise exception 'p_target_user_ids is required';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'p_amount must be > 0';
  end if;
  if p_idempotency_key is null or length(trim(p_idempotency_key)) = 0 then
    raise exception 'p_idempotency_key is required';
  end if;

  v_lock_key := hashtextextended(p_tenant_id::text || ':' || p_idempotency_key, 0);
  perform pg_advisory_xact_lock(v_lock_key);

  select gaa.id
    into v_existing_id
    from public.gamification_admin_awards gaa
    where gaa.tenant_id = p_tenant_id
      and gaa.idempotency_key = p_idempotency_key
    limit 1;

  if v_existing_id is not null then
    award_id := v_existing_id;
    for recipient_user_id, coin_transaction_id, balance in
      select gar.user_id, gar.coin_transaction_id, gar.balance_after
        from public.gamification_admin_award_recipients gar
        where gar.award_id = v_existing_id
        order by gar.created_at asc
    loop
      return next;
    end loop;
    return;
  end if;

  insert into public.gamification_admin_awards(
    tenant_id,
    actor_user_id,
    award_type,
    amount,
    message,
    idempotency_key,
    source,
    created_at
  ) values (
    p_tenant_id,
    p_actor_user_id,
    'coins',
    p_amount,
    nullif(p_message, ''),
    p_idempotency_key,
    'admin_award',
    v_now
  ) returning id into v_award_id;

  -- Optional: also write to tenant_audit_logs for cross-domain audit browsing
  insert into public.tenant_audit_logs(tenant_id, actor_user_id, event_type, payload, created_at)
  values (
    p_tenant_id,
    p_actor_user_id,
    'gamification.admin_award.coins',
    jsonb_build_object(
      'award_id', v_award_id,
      'amount', p_amount,
      'message', nullif(p_message, ''),
      'recipient_count', array_length(p_target_user_ids, 1),
      'idempotency_key', p_idempotency_key
    ),
    v_now
  );

  for v_user_id in (select distinct unnest(p_target_user_ids)) loop
    v_per_user_idempotency := p_idempotency_key || ':' || v_user_id::text;
    v_metadata := jsonb_build_object(
      'award_id', v_award_id,
      'actor_user_id', p_actor_user_id,
      'source', 'admin_award'
    );

    select t.transaction_id, t.balance
      into v_tx_id, v_balance
      from public.apply_coin_transaction_v1(
        v_user_id,
        p_tenant_id,
        'earn',
        p_amount,
        'admin_award',
        v_per_user_idempotency,
        nullif(p_message, ''),
        'admin_award',
        v_metadata
      ) as t;

    insert into public.gamification_admin_award_recipients(
      award_id,
      tenant_id,
      user_id,
      coin_transaction_id,
      balance_after,
      created_at
    ) values (
      v_award_id,
      p_tenant_id,
      v_user_id,
      v_tx_id,
      v_balance,
      v_now
    )
    on conflict (award_id, user_id)
    do update set
      coin_transaction_id = excluded.coin_transaction_id,
      balance_after = excluded.balance_after;

    award_id := v_award_id;
    recipient_user_id := v_user_id;
    coin_transaction_id := v_tx_id;
    balance := v_balance;
    return next;
  end loop;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_decide_award_request_v1(p_request_id uuid, p_decider_user_id uuid, p_action text)
 RETURNS TABLE(request_id uuid, status text, award_id uuid, awarded_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_req record;
  v_lock_key bigint;
  v_now timestamptz := now();
  v_recipient_ids uuid[];
  v_award_id uuid;
  v_awarded_count int := 0;
  v_ignore uuid;
  v_ignore2 uuid;
  v_ignore3 int;
  v_ignore4 int;
begin
  if p_request_id is null then
    raise exception 'p_request_id is required';
  end if;
  if p_decider_user_id is null then
    raise exception 'p_decider_user_id is required';
  end if;
  if p_action is null or not (p_action in ('approve','reject')) then
    raise exception 'p_action must be approve or reject';
  end if;

  if auth.role() <> 'service_role' then
    raise exception 'service role only';
  end if;

  v_lock_key := hashtextextended(p_request_id::text, 0);
  perform pg_advisory_xact_lock(v_lock_key);

  select *
    into v_req
    from public.gamification_admin_award_requests r
    where r.id = p_request_id
    limit 1;

  if v_req is null then
    raise exception 'request not found';
  end if;

  if v_req.status <> 'pending' then
    request_id := v_req.id;
    status := v_req.status;
    award_id := v_req.award_id;
    awarded_count := 0;
    return next;
    return;
  end if;

  if p_action = 'reject' then
    update public.gamification_admin_award_requests
      set status = 'rejected',
          decided_by_user_id = p_decider_user_id,
          decided_at = v_now
      where id = p_request_id;

    insert into public.tenant_audit_logs(tenant_id, actor_user_id, event_type, payload, created_at)
    values (
      v_req.tenant_id,
      p_decider_user_id,
      'gamification.admin_award_request.rejected',
      jsonb_build_object('request_id', p_request_id),
      v_now
    );

    request_id := p_request_id;
    status := 'rejected';
    award_id := null;
    awarded_count := 0;
    return next;
    return;
  end if;

  select coalesce(array_agg(distinct rr.user_id), '{}'::uuid[])
    into v_recipient_ids
    from public.gamification_admin_award_request_recipients rr
    where rr.request_id = p_request_id;

  if v_recipient_ids is null or array_length(v_recipient_ids, 1) is null or array_length(v_recipient_ids, 1) = 0 then
    raise exception 'request has no recipients';
  end if;

  -- Approve: apply the award exactly once via a deterministic idempotency key per request
  -- We only need award_id; the function returns one row per recipient.
  select a.award_id
    into v_award_id
    from public.admin_award_coins_v1(
      v_req.tenant_id,
      v_req.requester_user_id,
      v_recipient_ids,
      v_req.amount,
      v_req.message,
      'award-request:' || p_request_id::text
    ) as a
    limit 1;

  select count(*)::int
    into v_awarded_count
    from public.gamification_admin_award_recipients gar
    where gar.award_id = v_award_id;

  update public.gamification_admin_award_requests
    set status = 'approved',
        award_id = v_award_id,
        decided_by_user_id = p_decider_user_id,
        decided_at = v_now
    where id = p_request_id;

  insert into public.tenant_audit_logs(tenant_id, actor_user_id, event_type, payload, created_at)
  values (
    v_req.tenant_id,
    p_decider_user_id,
    'gamification.admin_award_request.approved',
    jsonb_build_object('request_id', p_request_id, 'award_id', v_award_id),
    v_now
  );

  request_id := p_request_id;
  status := 'approved';
  award_id := v_award_id;
  awarded_count := v_awarded_count;
  return next;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_get_campaign_analytics_v1(p_tenant_id uuid, p_campaign_id uuid, p_window_days integer DEFAULT 30)
 RETURNS TABLE(tenant_id uuid, campaign_id uuid, window_days integer, since timestamp with time zone, totals jsonb, daily jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_since timestamptz;
  v_total_amount bigint;
  v_count bigint;
  v_avg_amount numeric;
  v_daily jsonb;
begin
  if p_tenant_id is null then
    raise exception 'p_tenant_id is required';
  end if;

  if p_campaign_id is null then
    raise exception 'p_campaign_id is required';
  end if;

  if p_window_days is null or p_window_days < 1 or p_window_days > 365 then
    raise exception 'p_window_days must be between 1 and 365';
  end if;

  if auth.role() <> 'service_role' then
    raise exception 'service role only';
  end if;

  v_since := now() - make_interval(days => p_window_days);

  select
    coalesce(sum(ct.amount), 0),
    count(*)
  into v_total_amount, v_count
  from public.coin_transactions ct
  where ct.tenant_id = p_tenant_id
    and ct.created_at >= v_since
    and ct.type = 'earn'
    and ct.reason_code = 'campaign_bonus'
    and (ct.metadata ? 'campaignId')
    and (ct.metadata->>'campaignId')::uuid = p_campaign_id;

  v_avg_amount := case when v_count > 0 then (v_total_amount::numeric / v_count::numeric) else 0 end;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'date', x.day,
        'count', x.cnt,
        'totalAmount', x.total_amount
      )
      order by x.day asc
    ),
    '[]'::jsonb
  )
  into v_daily
  from (
    select
      (date_trunc('day', ct.created_at))::date as day,
      count(*)::int as cnt,
      coalesce(sum(ct.amount), 0)::int as total_amount
    from public.coin_transactions ct
    where ct.tenant_id = p_tenant_id
      and ct.created_at >= v_since
      and ct.type = 'earn'
      and ct.reason_code = 'campaign_bonus'
      and (ct.metadata ? 'campaignId')
      and (ct.metadata->>'campaignId')::uuid = p_campaign_id
    group by day
  ) x;

  tenant_id := p_tenant_id;
  campaign_id := p_campaign_id;
  window_days := p_window_days;
  since := v_since;

  totals := jsonb_build_object(
    'count', v_count,
    'totalAmount', v_total_amount,
    'avgAmount', v_avg_amount
  );

  daily := v_daily;

  return next;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_get_gamification_analytics_v1(p_tenant_id uuid, p_window_days integer DEFAULT 30)
 RETURNS TABLE(tenant_id uuid, window_days integer, since timestamp with time zone, economy jsonb, events jsonb, awards jsonb, shop jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_since timestamptz;
  v_earned bigint;
  v_spent bigint;
  v_tx_count bigint;

  v_events_total bigint;
  v_top_event_types jsonb;

  v_awards_count bigint;
  v_awards_total bigint;

  v_purchases_count bigint;
  v_total_spent numeric;
  v_top_items jsonb;
begin
  if p_tenant_id is null then
    raise exception 'p_tenant_id is required';
  end if;

  if p_window_days is null or p_window_days < 1 or p_window_days > 365 then
    raise exception 'p_window_days must be between 1 and 365';
  end if;

  -- Service-role only
  if auth.role() <> 'service_role' then
    raise exception 'service role only';
  end if;

  v_since := now() - make_interval(days => p_window_days);

  select
    coalesce(sum(ct.amount) filter (where ct.type = 'earn'), 0),
    coalesce(sum(ct.amount) filter (where ct.type = 'spend'), 0),
    count(*)
  into v_earned, v_spent, v_tx_count
  from public.coin_transactions ct
  where ct.tenant_id = p_tenant_id
    and ct.created_at >= v_since;

  select count(*)
    into v_events_total
    from public.gamification_events ge
    where ge.tenant_id = p_tenant_id
      and ge.created_at >= v_since;

  select coalesce(
    jsonb_agg(
      jsonb_build_object('eventType', x.event_type, 'count', x.cnt)
      order by x.cnt desc
    ),
    '[]'::jsonb
  )
  into v_top_event_types
  from (
    select ge.event_type, count(*)::int as cnt
      from public.gamification_events ge
      where ge.tenant_id = p_tenant_id
        and ge.created_at >= v_since
      group by ge.event_type
      order by cnt desc
      limit 10
  ) x;

  select
    count(*),
    coalesce(sum(gaa.amount), 0)
  into v_awards_count, v_awards_total
  from public.gamification_admin_awards gaa
  where gaa.tenant_id = p_tenant_id
    and gaa.created_at >= v_since;

  select
    count(*),
    coalesce(sum(up.price_paid), 0)
  into v_purchases_count, v_total_spent
  from public.user_purchases up
  where up.tenant_id = p_tenant_id
    and up.created_at >= v_since;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'shopItemId', x.shop_item_id,
        'name', x.name,
        'category', x.category,
        'count', x.cnt,
        'revenue', x.revenue
      )
      order by x.cnt desc
    ),
    '[]'::jsonb
  )
  into v_top_items
  from (
    select
      up.shop_item_id,
      coalesce(si.name, up.shop_item_id::text) as name,
      coalesce(si.category, 'unknown') as category,
      count(*)::int as cnt,
      coalesce(sum(up.price_paid), 0) as revenue
    from public.user_purchases up
    left join public.shop_items si
      on si.id = up.shop_item_id
     and si.tenant_id = up.tenant_id
    where up.tenant_id = p_tenant_id
      and up.created_at >= v_since
    group by up.shop_item_id, si.name, si.category
    order by cnt desc
    limit 10
  ) x;

  tenant_id := p_tenant_id;
  window_days := p_window_days;
  since := v_since;

  economy := jsonb_build_object(
    'earned', v_earned,
    'spent', v_spent,
    'net', (v_earned - v_spent),
    'transactionsCount', v_tx_count
  );

  events := jsonb_build_object(
    'total', v_events_total,
    'topTypes', v_top_event_types
  );

  awards := jsonb_build_object(
    'awardsCount', v_awards_count,
    'totalAmount', v_awards_total
  );

  shop := jsonb_build_object(
    'purchasesCount', v_purchases_count,
    'totalSpent', v_total_spent,
    'topItems', v_top_items
  );

  return next;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_get_gamification_analytics_v2(p_tenant_id uuid, p_window_days integer DEFAULT 30)
 RETURNS TABLE(tenant_id uuid, window_days integer, since timestamp with time zone, economy jsonb, events jsonb, awards jsonb, shop jsonb, campaigns jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_since timestamptz;
  v_earned bigint;
  v_spent bigint;
  v_tx_count bigint;

  v_events_total bigint;
  v_top_event_types jsonb;

  v_awards_count bigint;
  v_awards_total bigint;

  v_purchases_count bigint;
  v_total_spent numeric;
  v_top_items jsonb;

  v_campaign_bonus_total bigint;
  v_top_campaigns jsonb;
begin
  if p_tenant_id is null then
    raise exception 'p_tenant_id is required';
  end if;

  if p_window_days is null or p_window_days < 1 or p_window_days > 365 then
    raise exception 'p_window_days must be between 1 and 365';
  end if;

  if auth.role() <> 'service_role' then
    raise exception 'service role only';
  end if;

  v_since := now() - make_interval(days => p_window_days);

  select
    coalesce(sum(ct.amount) filter (where ct.type = 'earn'), 0),
    coalesce(sum(ct.amount) filter (where ct.type = 'spend'), 0),
    count(*)
  into v_earned, v_spent, v_tx_count
  from public.coin_transactions ct
  where ct.tenant_id = p_tenant_id
    and ct.created_at >= v_since;

  select count(*)
    into v_events_total
    from public.gamification_events ge
    where ge.tenant_id = p_tenant_id
      and ge.created_at >= v_since;

  select coalesce(
    jsonb_agg(
      jsonb_build_object('eventType', x.event_type, 'count', x.cnt)
      order by x.cnt desc
    ),
    '[]'::jsonb
  )
  into v_top_event_types
  from (
    select ge.event_type, count(*)::int as cnt
      from public.gamification_events ge
      where ge.tenant_id = p_tenant_id
        and ge.created_at >= v_since
      group by ge.event_type
      order by cnt desc
      limit 10
  ) x;

  select
    count(*),
    coalesce(sum(gaa.amount), 0)
  into v_awards_count, v_awards_total
  from public.gamification_admin_awards gaa
  where gaa.tenant_id = p_tenant_id
    and gaa.created_at >= v_since;

  select
    count(*),
    coalesce(sum(up.price_paid), 0)
  into v_purchases_count, v_total_spent
  from public.user_purchases up
  where up.tenant_id = p_tenant_id
    and up.created_at >= v_since;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'shopItemId', x.shop_item_id,
        'name', x.name,
        'category', x.category,
        'count', x.cnt,
        'revenue', x.revenue
      )
      order by x.cnt desc
    ),
    '[]'::jsonb
  )
  into v_top_items
  from (
    select
      up.shop_item_id,
      coalesce(si.name, up.shop_item_id::text) as name,
      coalesce(si.category, 'unknown') as category,
      count(*)::int as cnt,
      coalesce(sum(up.price_paid), 0) as revenue
    from public.user_purchases up
    left join public.shop_items si
      on si.id = up.shop_item_id
     and si.tenant_id = up.tenant_id
    where up.tenant_id = p_tenant_id
      and up.created_at >= v_since
    group by up.shop_item_id, si.name, si.category
    order by cnt desc
    limit 10
  ) x;

  -- Campaign bonus reporting (from coin ledger metadata)
  select coalesce(sum(ct.amount), 0)
    into v_campaign_bonus_total
    from public.coin_transactions ct
    where ct.tenant_id = p_tenant_id
      and ct.created_at >= v_since
      and ct.type = 'earn'
      and ct.reason_code = 'campaign_bonus';

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'campaignId', x.campaign_id,
        'name', x.name,
        'count', x.cnt,
        'totalAmount', x.total_amount
      )
      order by x.total_amount desc
    ),
    '[]'::jsonb
  )
  into v_top_campaigns
  from (
    select
      (ct.metadata->>'campaignId')::uuid as campaign_id,
      coalesce(gc.name, ct.metadata->>'campaignId') as name,
      count(*)::int as cnt,
      coalesce(sum(ct.amount), 0)::int as total_amount
    from public.coin_transactions ct
    left join public.gamification_campaigns gc
      on gc.id = (ct.metadata->>'campaignId')::uuid
     and gc.tenant_id = ct.tenant_id
    where ct.tenant_id = p_tenant_id
      and ct.created_at >= v_since
      and ct.type = 'earn'
      and ct.reason_code = 'campaign_bonus'
      and (ct.metadata ? 'campaignId')
    group by campaign_id, gc.name
    order by total_amount desc
    limit 10
  ) x;

  tenant_id := p_tenant_id;
  window_days := p_window_days;
  since := v_since;

  economy := jsonb_build_object(
    'earned', v_earned,
    'spent', v_spent,
    'net', (v_earned - v_spent),
    'transactionsCount', v_tx_count
  );

  events := jsonb_build_object(
    'total', v_events_total,
    'topTypes', v_top_event_types
  );

  awards := jsonb_build_object(
    'awardsCount', v_awards_count,
    'totalAmount', v_awards_total
  );

  shop := jsonb_build_object(
    'purchasesCount', v_purchases_count,
    'totalSpent', v_total_spent,
    'topItems', v_top_items
  );

  campaigns := jsonb_build_object(
    'bonusTotalAmount', v_campaign_bonus_total,
    'topCampaigns', v_top_campaigns
  );

  return next;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_get_gamification_analytics_v3(p_tenant_id uuid, p_window_days integer DEFAULT 30)
 RETURNS TABLE(tenant_id uuid, window_days integer, since timestamp with time zone, economy jsonb, events jsonb, awards jsonb, shop jsonb, campaigns jsonb, automations jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_since timestamptz;
  v_earned bigint;
  v_spent bigint;
  v_tx_count bigint;

  v_events_total bigint;
  v_top_event_types jsonb;

  v_awards_count bigint;
  v_awards_total bigint;

  v_purchases_count bigint;
  v_total_spent numeric;
  v_top_items jsonb;

  v_campaign_bonus_total bigint;
  v_top_campaigns jsonb;

  v_automation_reward_total bigint;
  v_top_rules jsonb;
begin
  if p_tenant_id is null then
    raise exception 'p_tenant_id is required';
  end if;

  if p_window_days is null or p_window_days < 1 or p_window_days > 365 then
    raise exception 'p_window_days must be between 1 and 365';
  end if;

  if auth.role() <> 'service_role' then
    raise exception 'service role only';
  end if;

  v_since := now() - make_interval(days => p_window_days);

  select
    coalesce(sum(ct.amount) filter (where ct.type = 'earn'), 0),
    coalesce(sum(ct.amount) filter (where ct.type = 'spend'), 0),
    count(*)
  into v_earned, v_spent, v_tx_count
  from public.coin_transactions ct
  where ct.tenant_id = p_tenant_id
    and ct.created_at >= v_since;

  select count(*)
    into v_events_total
    from public.gamification_events ge
    where ge.tenant_id = p_tenant_id
      and ge.created_at >= v_since;

  select coalesce(
    jsonb_agg(
      jsonb_build_object('eventType', x.event_type, 'count', x.cnt)
      order by x.cnt desc
    ),
    '[]'::jsonb
  )
  into v_top_event_types
  from (
    select ge.event_type, count(*)::int as cnt
      from public.gamification_events ge
      where ge.tenant_id = p_tenant_id
        and ge.created_at >= v_since
      group by ge.event_type
      order by cnt desc
      limit 10
  ) x;

  select
    count(*),
    coalesce(sum(gaa.amount), 0)
  into v_awards_count, v_awards_total
  from public.gamification_admin_awards gaa
  where gaa.tenant_id = p_tenant_id
    and gaa.created_at >= v_since;

  select
    count(*),
    coalesce(sum(up.price_paid), 0)
  into v_purchases_count, v_total_spent
  from public.user_purchases up
  where up.tenant_id = p_tenant_id
    and up.created_at >= v_since;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'shopItemId', x.shop_item_id,
        'name', x.name,
        'category', x.category,
        'count', x.cnt,
        'revenue', x.revenue
      )
      order by x.cnt desc
    ),
    '[]'::jsonb
  )
  into v_top_items
  from (
    select
      up.shop_item_id,
      coalesce(si.name, up.shop_item_id::text) as name,
      coalesce(si.category, 'unknown') as category,
      count(*)::int as cnt,
      coalesce(sum(up.price_paid), 0) as revenue
    from public.user_purchases up
    left join public.shop_items si
      on si.id = up.shop_item_id
     and si.tenant_id = up.tenant_id
    where up.tenant_id = p_tenant_id
      and up.created_at >= v_since
    group by up.shop_item_id, si.name, si.category
    order by cnt desc
    limit 10
  ) x;

  -- Campaign bonus reporting (from coin ledger metadata)
  select coalesce(sum(ct.amount), 0)
    into v_campaign_bonus_total
    from public.coin_transactions ct
    where ct.tenant_id = p_tenant_id
      and ct.created_at >= v_since
      and ct.type = 'earn'
      and ct.reason_code = 'campaign_bonus';

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'campaignId', x.campaign_id,
        'name', x.name,
        'count', x.cnt,
        'totalAmount', x.total_amount
      )
      order by x.total_amount desc
    ),
    '[]'::jsonb
  )
  into v_top_campaigns
  from (
    select
      (ct.metadata->>'campaignId')::uuid as campaign_id,
      coalesce(gc.name, ct.metadata->>'campaignId') as name,
      count(*)::int as cnt,
      coalesce(sum(ct.amount), 0)::int as total_amount
    from public.coin_transactions ct
    left join public.gamification_campaigns gc
      on gc.id = (ct.metadata->>'campaignId')::uuid
     and gc.tenant_id = ct.tenant_id
    where ct.tenant_id = p_tenant_id
      and ct.created_at >= v_since
      and ct.type = 'earn'
      and ct.reason_code = 'campaign_bonus'
      and (ct.metadata ? 'campaignId')
    group by campaign_id, gc.name
    order by total_amount desc
    limit 10
  ) x;

  -- Automation rule rewards reporting (from coin ledger metadata)
  select coalesce(sum(ct.amount), 0)
    into v_automation_reward_total
    from public.coin_transactions ct
    where ct.tenant_id = p_tenant_id
      and ct.created_at >= v_since
      and ct.type = 'earn'
      and ct.reason_code = 'automation_rule';

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'ruleId', x.rule_id,
        'name', x.name,
        'count', x.cnt,
        'totalAmount', x.total_amount
      )
      order by x.total_amount desc
    ),
    '[]'::jsonb
  )
  into v_top_rules
  from (
    select
      (ct.metadata->>'ruleId')::uuid as rule_id,
      coalesce(ar.name, ct.metadata->>'ruleId') as name,
      count(*)::int as cnt,
      coalesce(sum(ct.amount), 0)::int as total_amount
    from public.coin_transactions ct
    left join public.gamification_automation_rules ar
      on ar.id = (ct.metadata->>'ruleId')::uuid
     and ar.tenant_id = ct.tenant_id
    where ct.tenant_id = p_tenant_id
      and ct.created_at >= v_since
      and ct.type = 'earn'
      and ct.reason_code = 'automation_rule'
      and (ct.metadata ? 'ruleId')
    group by rule_id, ar.name
    order by total_amount desc
    limit 10
  ) x;

  tenant_id := p_tenant_id;
  window_days := p_window_days;
  since := v_since;

  economy := jsonb_build_object(
    'earned', v_earned,
    'spent', v_spent,
    'net', (v_earned - v_spent),
    'transactionsCount', v_tx_count
  );

  events := jsonb_build_object(
    'total', v_events_total,
    'topTypes', v_top_event_types
  );

  awards := jsonb_build_object(
    'awardsCount', v_awards_count,
    'totalAmount', v_awards_total
  );

  shop := jsonb_build_object(
    'purchasesCount', v_purchases_count,
    'totalSpent', v_total_spent,
    'topItems', v_top_items
  );

  campaigns := jsonb_build_object(
    'bonusTotalAmount', v_campaign_bonus_total,
    'topCampaigns', v_top_campaigns
  );

  automations := jsonb_build_object(
    'rewardTotalAmount', v_automation_reward_total,
    'topRules', v_top_rules
  );

  return next;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_get_gamification_analytics_v4(p_tenant_id uuid, p_window_days integer DEFAULT 30)
 RETURNS TABLE(tenant_id uuid, window_days integer, since timestamp with time zone, economy jsonb, events jsonb, awards jsonb, shop jsonb, campaigns jsonb, automations jsonb, anomalies jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_since timestamptz;
  v_earned bigint;
  v_spent bigint;
  v_tx_count bigint;

  v_events_total bigint;
  v_top_event_types jsonb;

  v_awards_count bigint;
  v_awards_total bigint;

  v_purchases_count bigint;
  v_total_spent numeric;
  v_top_items jsonb;

  v_campaign_bonus_total bigint;
  v_top_campaigns jsonb;

  v_automation_reward_total bigint;
  v_top_rules jsonb;

  -- Anomaly detection (simple heuristics)
  v_last24_earned bigint;
  v_prev6_earned bigint;
  v_prev6_earned_avg numeric;

  v_last24_awards bigint;
  v_prev6_awards bigint;
  v_prev6_awards_avg numeric;

  v_last24_automation bigint;
  v_prev6_automation bigint;
  v_prev6_automation_avg numeric;

  v_last24_campaign_bonus bigint;
  v_prev6_campaign_bonus bigint;
  v_prev6_campaign_bonus_avg numeric;

  v_top_rule_total bigint;

  v_anomaly_items jsonb := '[]'::jsonb;
begin
  if p_tenant_id is null then
    raise exception 'p_tenant_id is required';
  end if;

  if p_window_days is null or p_window_days < 1 or p_window_days > 365 then
    raise exception 'p_window_days must be between 1 and 365';
  end if;

  if auth.role() <> 'service_role' then
    raise exception 'service role only';
  end if;

  v_since := now() - make_interval(days => p_window_days);

  select
    coalesce(sum(ct.amount) filter (where ct.type = 'earn'), 0),
    coalesce(sum(ct.amount) filter (where ct.type = 'spend'), 0),
    count(*)
  into v_earned, v_spent, v_tx_count
  from public.coin_transactions ct
  where ct.tenant_id = p_tenant_id
    and ct.created_at >= v_since;

  select count(*)
    into v_events_total
    from public.gamification_events ge
    where ge.tenant_id = p_tenant_id
      and ge.created_at >= v_since;

  select coalesce(
    jsonb_agg(
      jsonb_build_object('eventType', x.event_type, 'count', x.cnt)
      order by x.cnt desc
    ),
    '[]'::jsonb
  )
  into v_top_event_types
  from (
    select ge.event_type, count(*)::int as cnt
      from public.gamification_events ge
      where ge.tenant_id = p_tenant_id
        and ge.created_at >= v_since
      group by ge.event_type
      order by cnt desc
      limit 10
  ) x;

  select
    count(*),
    coalesce(sum(gaa.amount), 0)
  into v_awards_count, v_awards_total
  from public.gamification_admin_awards gaa
  where gaa.tenant_id = p_tenant_id
    and gaa.created_at >= v_since;

  select
    count(*),
    coalesce(sum(up.price_paid), 0)
  into v_purchases_count, v_total_spent
  from public.user_purchases up
  where up.tenant_id = p_tenant_id
    and up.created_at >= v_since;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'shopItemId', x.shop_item_id,
        'name', x.name,
        'category', x.category,
        'count', x.cnt,
        'revenue', x.revenue
      )
      order by x.cnt desc
    ),
    '[]'::jsonb
  )
  into v_top_items
  from (
    select
      up.shop_item_id,
      coalesce(si.name, up.shop_item_id::text) as name,
      coalesce(si.category, 'unknown') as category,
      count(*)::int as cnt,
      coalesce(sum(up.price_paid), 0) as revenue
    from public.user_purchases up
    left join public.shop_items si
      on si.id = up.shop_item_id
     and si.tenant_id = up.tenant_id
    where up.tenant_id = p_tenant_id
      and up.created_at >= v_since
    group by up.shop_item_id, si.name, si.category
    order by cnt desc
    limit 10
  ) x;

  -- Campaign bonus reporting (from coin ledger metadata)
  select coalesce(sum(ct.amount), 0)
    into v_campaign_bonus_total
    from public.coin_transactions ct
    where ct.tenant_id = p_tenant_id
      and ct.created_at >= v_since
      and ct.type = 'earn'
      and ct.reason_code = 'campaign_bonus';

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'campaignId', x.campaign_id,
        'name', x.name,
        'count', x.cnt,
        'totalAmount', x.total_amount
      )
      order by x.total_amount desc
    ),
    '[]'::jsonb
  )
  into v_top_campaigns
  from (
    select
      (ct.metadata->>'campaignId')::uuid as campaign_id,
      coalesce(gc.name, ct.metadata->>'campaignId') as name,
      count(*)::int as cnt,
      coalesce(sum(ct.amount), 0)::int as total_amount
    from public.coin_transactions ct
    left join public.gamification_campaigns gc
      on gc.id = (ct.metadata->>'campaignId')::uuid
     and gc.tenant_id = ct.tenant_id
    where ct.tenant_id = p_tenant_id
      and ct.created_at >= v_since
      and ct.type = 'earn'
      and ct.reason_code = 'campaign_bonus'
      and (ct.metadata ? 'campaignId')
    group by campaign_id, gc.name
    order by total_amount desc
    limit 10
  ) x;

  -- Automation rule rewards reporting (from coin ledger metadata)
  select coalesce(sum(ct.amount), 0)
    into v_automation_reward_total
    from public.coin_transactions ct
    where ct.tenant_id = p_tenant_id
      and ct.created_at >= v_since
      and ct.type = 'earn'
      and ct.reason_code = 'automation_rule';

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'ruleId', x.rule_id,
        'name', x.name,
        'count', x.cnt,
        'totalAmount', x.total_amount
      )
      order by x.total_amount desc
    ),
    '[]'::jsonb
  )
  into v_top_rules
  from (
    select
      (ct.metadata->>'ruleId')::uuid as rule_id,
      coalesce(ar.name, ct.metadata->>'ruleId') as name,
      count(*)::int as cnt,
      coalesce(sum(ct.amount), 0)::int as total_amount
    from public.coin_transactions ct
    left join public.gamification_automation_rules ar
      on ar.id = (ct.metadata->>'ruleId')::uuid
     and ar.tenant_id = ct.tenant_id
    where ct.tenant_id = p_tenant_id
      and ct.created_at >= v_since
      and ct.type = 'earn'
      and ct.reason_code = 'automation_rule'
      and (ct.metadata ? 'ruleId')
    group by rule_id, ar.name
    order by total_amount desc
    limit 10
  ) x;

  -- === Anomaly detection signals ===
  select coalesce(sum(ct.amount), 0)
    into v_last24_earned
    from public.coin_transactions ct
    where ct.tenant_id = p_tenant_id
      and ct.type = 'earn'
      and ct.created_at >= now() - interval '24 hours';

  select coalesce(sum(ct.amount), 0)
    into v_prev6_earned
    from public.coin_transactions ct
    where ct.tenant_id = p_tenant_id
      and ct.type = 'earn'
      and ct.created_at >= now() - interval '168 hours'
      and ct.created_at < now() - interval '24 hours';

  v_prev6_earned_avg := v_prev6_earned::numeric / 6;

  if v_prev6_earned_avg > 0 and v_last24_earned > (v_prev6_earned_avg * 3) and v_last24_earned > 1000 then
    v_anomaly_items := v_anomaly_items || jsonb_build_array(
      jsonb_build_object(
        'code', 'mint_spike_24h',
        'severity', 'warn',
        'title', 'Mint spike senaste 24h',
        'details', format('Minted %s coins senaste 24h (snitt fÃ¶regÃ¥ende 6d: %s).', v_last24_earned, round(v_prev6_earned_avg)),
        'last24h', v_last24_earned,
        'prev6dAvg', round(v_prev6_earned_avg)
      )
    );
  end if;

  select coalesce(sum(gaa.amount), 0)
    into v_last24_awards
    from public.gamification_admin_awards gaa
    where gaa.tenant_id = p_tenant_id
      and gaa.created_at >= now() - interval '24 hours';

  select coalesce(sum(gaa.amount), 0)
    into v_prev6_awards
    from public.gamification_admin_awards gaa
    where gaa.tenant_id = p_tenant_id
      and gaa.created_at >= now() - interval '168 hours'
      and gaa.created_at < now() - interval '24 hours';

  v_prev6_awards_avg := v_prev6_awards::numeric / 6;

  if v_prev6_awards_avg > 0 and v_last24_awards > (v_prev6_awards_avg * 3) and v_last24_awards > 500 then
    v_anomaly_items := v_anomaly_items || jsonb_build_array(
      jsonb_build_object(
        'code', 'admin_awards_spike_24h',
        'severity', 'warn',
        'title', 'Admin awards spike senaste 24h',
        'details', format('Utdelat %s coins via admin awards senaste 24h (snitt fÃ¶regÃ¥ende 6d: %s).', v_last24_awards, round(v_prev6_awards_avg)),
        'last24h', v_last24_awards,
        'prev6dAvg', round(v_prev6_awards_avg)
      )
    );
  end if;

  select coalesce(sum(ct.amount), 0)
    into v_last24_automation
    from public.coin_transactions ct
    where ct.tenant_id = p_tenant_id
      and ct.type = 'earn'
      and ct.reason_code = 'automation_rule'
      and ct.created_at >= now() - interval '24 hours';

  select coalesce(sum(ct.amount), 0)
    into v_prev6_automation
    from public.coin_transactions ct
    where ct.tenant_id = p_tenant_id
      and ct.type = 'earn'
      and ct.reason_code = 'automation_rule'
      and ct.created_at >= now() - interval '168 hours'
      and ct.created_at < now() - interval '24 hours';

  v_prev6_automation_avg := v_prev6_automation::numeric / 6;

  if v_prev6_automation_avg > 0 and v_last24_automation > (v_prev6_automation_avg * 3) and v_last24_automation > 500 then
    v_anomaly_items := v_anomaly_items || jsonb_build_array(
      jsonb_build_object(
        'code', 'automation_spike_24h',
        'severity', 'warn',
        'title', 'Automation rewards spike senaste 24h',
        'details', format('Minted %s coins via automation rules senaste 24h (snitt fÃ¶regÃ¥ende 6d: %s).', v_last24_automation, round(v_prev6_automation_avg)),
        'last24h', v_last24_automation,
        'prev6dAvg', round(v_prev6_automation_avg)
      )
    );
  end if;

  select coalesce(sum(ct.amount), 0)
    into v_last24_campaign_bonus
    from public.coin_transactions ct
    where ct.tenant_id = p_tenant_id
      and ct.type = 'earn'
      and ct.reason_code = 'campaign_bonus'
      and ct.created_at >= now() - interval '24 hours';

  select coalesce(sum(ct.amount), 0)
    into v_prev6_campaign_bonus
    from public.coin_transactions ct
    where ct.tenant_id = p_tenant_id
      and ct.type = 'earn'
      and ct.reason_code = 'campaign_bonus'
      and ct.created_at >= now() - interval '168 hours'
      and ct.created_at < now() - interval '24 hours';

  v_prev6_campaign_bonus_avg := v_prev6_campaign_bonus::numeric / 6;

  if v_prev6_campaign_bonus_avg > 0 and v_last24_campaign_bonus > (v_prev6_campaign_bonus_avg * 3) and v_last24_campaign_bonus > 500 then
    v_anomaly_items := v_anomaly_items || jsonb_build_array(
      jsonb_build_object(
        'code', 'campaign_bonus_spike_24h',
        'severity', 'warn',
        'title', 'Campaign bonus spike senaste 24h',
        'details', format('Minted %s coins via kampanjer senaste 24h (snitt fÃ¶regÃ¥ende 6d: %s).', v_last24_campaign_bonus, round(v_prev6_campaign_bonus_avg)),
        'last24h', v_last24_campaign_bonus,
        'prev6dAvg', round(v_prev6_campaign_bonus_avg)
      )
    );
  end if;

  -- Concentration heuristic: one rule dominates automation rewards
  v_top_rule_total := 0;
  if jsonb_typeof(v_top_rules) = 'array' and jsonb_array_length(v_top_rules) > 0 then
    begin
      v_top_rule_total := coalesce((v_top_rules->0->>'totalAmount')::bigint, 0);
    exception when others then
      v_top_rule_total := 0;
    end;
  end if;

  if v_automation_reward_total > 500 and v_top_rule_total::numeric >= (v_automation_reward_total::numeric * 0.8) then
    v_anomaly_items := v_anomaly_items || jsonb_build_array(
      jsonb_build_object(
        'code', 'automation_concentration',
        'severity', 'info',
        'title', 'Automation rewards koncentrerade',
        'details', format('Top rule stÃ¥r fÃ¶r %s/%s coins (%s%%) i perioden.', v_top_rule_total, v_automation_reward_total, round((v_top_rule_total::numeric / nullif(v_automation_reward_total::numeric, 0)) * 100)),
        'topRuleTotal', v_top_rule_total,
        'automationTotal', v_automation_reward_total
      )
    );
  end if;

  tenant_id := p_tenant_id;
  window_days := p_window_days;
  since := v_since;

  economy := jsonb_build_object(
    'earned', v_earned,
    'spent', v_spent,
    'net', (v_earned - v_spent),
    'transactionsCount', v_tx_count
  );

  events := jsonb_build_object(
    'total', v_events_total,
    'topTypes', v_top_event_types
  );

  awards := jsonb_build_object(
    'awardsCount', v_awards_count,
    'totalAmount', v_awards_total
  );

  shop := jsonb_build_object(
    'purchasesCount', v_purchases_count,
    'totalSpent', v_total_spent,
    'topItems', v_top_items
  );

  campaigns := jsonb_build_object(
    'bonusTotalAmount', v_campaign_bonus_total,
    'topCampaigns', v_top_campaigns
  );

  automations := jsonb_build_object(
    'rewardTotalAmount', v_automation_reward_total,
    'topRules', v_top_rules
  );

  anomalies := jsonb_build_object(
    'items', v_anomaly_items
  );

  return next;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_get_gamification_analytics_v5(p_tenant_id uuid, p_window_days integer DEFAULT 30)
 RETURNS TABLE(tenant_id uuid, window_days integer, since timestamp with time zone, economy jsonb, events jsonb, awards jsonb, shop jsonb, campaigns jsonb, automations jsonb, anomalies jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_since timestamptz;
  v_earned bigint;
  v_spent bigint;
  v_tx_count bigint;

  v_events_total bigint;
  v_top_event_types jsonb;

  v_awards_count bigint;
  v_awards_total bigint;

  v_purchases_count bigint;
  v_total_spent numeric;
  v_top_items jsonb;

  v_campaign_bonus_total bigint;
  v_top_campaigns jsonb;

  v_automation_reward_total bigint;
  v_top_rules jsonb;

  -- Rollup usage
  v_since_day date;
  v_full_start date;
  v_full_end date;
  v_expected_full_days integer;
  v_rollup_days integer;
  v_use_rollup boolean := false;

  -- Anomaly detection (simple heuristics)
  v_last24_earned bigint;
  v_prev6_earned bigint;
  v_prev6_earned_avg numeric;

  v_last24_awards bigint;
  v_prev6_awards bigint;
  v_prev6_awards_avg numeric;

  v_last24_automation bigint;
  v_prev6_automation bigint;
  v_prev6_automation_avg numeric;

  v_last24_campaign_bonus bigint;
  v_prev6_campaign_bonus bigint;
  v_prev6_campaign_bonus_avg numeric;

  v_top_rule_total bigint;

  v_anomaly_items jsonb := '[]'::jsonb;
begin
  if p_tenant_id is null then
    raise exception 'p_tenant_id is required';
  end if;

  if p_window_days is null or p_window_days < 1 or p_window_days > 365 then
    raise exception 'p_window_days must be between 1 and 365';
  end if;

  if auth.role() <> 'service_role' then
    raise exception 'service role only';
  end if;

  v_since := now() - make_interval(days => p_window_days);
  v_since_day := date_trunc('day', v_since)::date;

  -- Attempt rollup usage only for large windows.
  if p_window_days >= 90 then
    v_full_start := v_since_day + 1;
    v_full_end := current_date - 1;

    if v_full_start <= v_full_end then
      v_expected_full_days := (v_full_end - v_full_start) + 1;

      select count(*)::int
        into v_rollup_days
        from public.gamification_daily_summaries s
        where s.tenant_id = p_tenant_id
          and s.day between v_full_start and v_full_end;

      if v_rollup_days = v_expected_full_days then
        v_use_rollup := true;
      end if;
    end if;
  end if;

  if v_use_rollup then
    -- Full days from rollups
    select
      coalesce(sum(s.earned), 0),
      coalesce(sum(s.spent), 0),
      coalesce(sum(s.tx_count), 0),
      coalesce(sum(s.events_count), 0),
      coalesce(sum(s.awards_count), 0),
      coalesce(sum(s.awards_total), 0),
      coalesce(sum(s.purchases_count), 0),
      coalesce(sum(s.purchases_spent), 0),
      coalesce(sum(s.campaign_bonus_total), 0),
      coalesce(sum(s.automation_total), 0)
    into
      v_earned,
      v_spent,
      v_tx_count,
      v_events_total,
      v_awards_count,
      v_awards_total,
      v_purchases_count,
      v_total_spent,
      v_campaign_bonus_total,
      v_automation_reward_total
    from public.gamification_daily_summaries s
    where s.tenant_id = p_tenant_id
      and s.day between v_full_start and v_full_end;

    -- Partial start-day slice (from v_since until next midnight)
    select
      v_earned + coalesce(sum(ct.amount) filter (where ct.type = 'earn'), 0),
      v_spent + coalesce(sum(ct.amount) filter (where ct.type = 'spend'), 0),
      v_tx_count + count(*),
      v_campaign_bonus_total + coalesce(sum(ct.amount) filter (where ct.type = 'earn' and ct.reason_code = 'campaign_bonus'), 0),
      v_automation_reward_total + coalesce(sum(ct.amount) filter (where ct.type = 'earn' and ct.reason_code = 'automation_rule'), 0)
    into v_earned, v_spent, v_tx_count, v_campaign_bonus_total, v_automation_reward_total
    from public.coin_transactions ct
    where ct.tenant_id = p_tenant_id
      and ct.created_at >= v_since
      and ct.created_at < (date_trunc('day', v_since) + interval '1 day');

    select
      v_events_total + count(*)
    into v_events_total
    from public.gamification_events ge
    where ge.tenant_id = p_tenant_id
      and ge.created_at >= v_since
      and ge.created_at < (date_trunc('day', v_since) + interval '1 day');

    select
      v_awards_count + count(*),
      v_awards_total + coalesce(sum(gaa.amount), 0)
    into v_awards_count, v_awards_total
    from public.gamification_admin_awards gaa
    where gaa.tenant_id = p_tenant_id
      and gaa.created_at >= v_since
      and gaa.created_at < (date_trunc('day', v_since) + interval '1 day');

    select
      v_purchases_count + count(*),
      v_total_spent + coalesce(sum(up.price_paid), 0)
    into v_purchases_count, v_total_spent
    from public.user_purchases up
    where up.tenant_id = p_tenant_id
      and up.created_at >= v_since
      and up.created_at < (date_trunc('day', v_since) + interval '1 day');

    -- Current day slice (from midnight to now)
    select
      v_earned + coalesce(sum(ct.amount) filter (where ct.type = 'earn'), 0),
      v_spent + coalesce(sum(ct.amount) filter (where ct.type = 'spend'), 0),
      v_tx_count + count(*),
      v_campaign_bonus_total + coalesce(sum(ct.amount) filter (where ct.type = 'earn' and ct.reason_code = 'campaign_bonus'), 0),
      v_automation_reward_total + coalesce(sum(ct.amount) filter (where ct.type = 'earn' and ct.reason_code = 'automation_rule'), 0)
    into v_earned, v_spent, v_tx_count, v_campaign_bonus_total, v_automation_reward_total
    from public.coin_transactions ct
    where ct.tenant_id = p_tenant_id
      and ct.created_at >= date_trunc('day', now());

    select
      v_events_total + count(*)
    into v_events_total
    from public.gamification_events ge
    where ge.tenant_id = p_tenant_id
      and ge.created_at >= date_trunc('day', now());

    select
      v_awards_count + count(*),
      v_awards_total + coalesce(sum(gaa.amount), 0)
    into v_awards_count, v_awards_total
    from public.gamification_admin_awards gaa
    where gaa.tenant_id = p_tenant_id
      and gaa.created_at >= date_trunc('day', now());

    select
      v_purchases_count + count(*),
      v_total_spent + coalesce(sum(up.price_paid), 0)
    into v_purchases_count, v_total_spent
    from public.user_purchases up
    where up.tenant_id = p_tenant_id
      and up.created_at >= date_trunc('day', now());
  else
    -- Fallback: totals from base tables.
    select
      coalesce(sum(ct.amount) filter (where ct.type = 'earn'), 0),
      coalesce(sum(ct.amount) filter (where ct.type = 'spend'), 0),
      count(*)
    into v_earned, v_spent, v_tx_count
    from public.coin_transactions ct
    where ct.tenant_id = p_tenant_id
      and ct.created_at >= v_since;

    select count(*)
      into v_events_total
      from public.gamification_events ge
      where ge.tenant_id = p_tenant_id
        and ge.created_at >= v_since;

    select
      count(*),
      coalesce(sum(gaa.amount), 0)
    into v_awards_count, v_awards_total
    from public.gamification_admin_awards gaa
    where gaa.tenant_id = p_tenant_id
      and gaa.created_at >= v_since;

    select
      count(*),
      coalesce(sum(up.price_paid), 0)
    into v_purchases_count, v_total_spent
    from public.user_purchases up
    where up.tenant_id = p_tenant_id
      and up.created_at >= v_since;

    -- Campaign bonus reporting (from coin ledger metadata)
    select coalesce(sum(ct.amount), 0)
      into v_campaign_bonus_total
      from public.coin_transactions ct
      where ct.tenant_id = p_tenant_id
        and ct.created_at >= v_since
        and ct.type = 'earn'
        and ct.reason_code = 'campaign_bonus';

    -- Automation rule rewards reporting (from coin ledger metadata)
    select coalesce(sum(ct.amount), 0)
      into v_automation_reward_total
      from public.coin_transactions ct
      where ct.tenant_id = p_tenant_id
        and ct.created_at >= v_since
        and ct.type = 'earn'
        and ct.reason_code = 'automation_rule';
  end if;

  -- Top event types (base tables)
  select coalesce(
    jsonb_agg(
      jsonb_build_object('eventType', x.event_type, 'count', x.cnt)
      order by x.cnt desc
    ),
    '[]'::jsonb
  )
  into v_top_event_types
  from (
    select ge.event_type, count(*)::int as cnt
      from public.gamification_events ge
      where ge.tenant_id = p_tenant_id
        and ge.created_at >= v_since
      group by ge.event_type
      order by cnt desc
      limit 10
  ) x;

  -- Top shop items (base tables)
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'shopItemId', x.shop_item_id,
        'name', x.name,
        'category', x.category,
        'count', x.cnt,
        'revenue', x.revenue
      )
      order by x.cnt desc
    ),
    '[]'::jsonb
  )
  into v_top_items
  from (
    select
      up.shop_item_id,
      coalesce(si.name, up.shop_item_id::text) as name,
      coalesce(si.category, 'unknown') as category,
      count(*)::int as cnt,
      coalesce(sum(up.price_paid), 0) as revenue
    from public.user_purchases up
    left join public.shop_items si
      on si.id = up.shop_item_id
     and si.tenant_id = up.tenant_id
    where up.tenant_id = p_tenant_id
      and up.created_at >= v_since
    group by up.shop_item_id, si.name, si.category
    order by cnt desc
    limit 10
  ) x;

  -- Top campaigns (base tables)
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'campaignId', x.campaign_id,
        'name', x.name,
        'count', x.cnt,
        'totalAmount', x.total_amount
      )
      order by x.total_amount desc
    ),
    '[]'::jsonb
  )
  into v_top_campaigns
  from (
    select
      (ct.metadata->>'campaignId')::uuid as campaign_id,
      coalesce(gc.name, ct.metadata->>'campaignId') as name,
      count(*)::int as cnt,
      coalesce(sum(ct.amount), 0)::int as total_amount
    from public.coin_transactions ct
    left join public.gamification_campaigns gc
      on gc.id = (ct.metadata->>'campaignId')::uuid
     and gc.tenant_id = ct.tenant_id
    where ct.tenant_id = p_tenant_id
      and ct.created_at >= v_since
      and ct.type = 'earn'
      and ct.reason_code = 'campaign_bonus'
      and (ct.metadata ? 'campaignId')
    group by campaign_id, gc.name
    order by total_amount desc
    limit 10
  ) x;

  -- Top automation rules (base tables)
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'ruleId', x.rule_id,
        'name', x.name,
        'count', x.cnt,
        'totalAmount', x.total_amount
      )
      order by x.total_amount desc
    ),
    '[]'::jsonb
  )
  into v_top_rules
  from (
    select
      (ct.metadata->>'ruleId')::uuid as rule_id,
      coalesce(ar.name, ct.metadata->>'ruleId') as name,
      count(*)::int as cnt,
      coalesce(sum(ct.amount), 0)::int as total_amount
    from public.coin_transactions ct
    left join public.gamification_automation_rules ar
      on ar.id = (ct.metadata->>'ruleId')::uuid
     and ar.tenant_id = ct.tenant_id
    where ct.tenant_id = p_tenant_id
      and ct.created_at >= v_since
      and ct.type = 'earn'
      and ct.reason_code = 'automation_rule'
      and (ct.metadata ? 'ruleId')
    group by rule_id, ar.name
    order by total_amount desc
    limit 10
  ) x;

  -- === Anomaly detection signals ===
  select coalesce(sum(ct.amount), 0)
    into v_last24_earned
    from public.coin_transactions ct
    where ct.tenant_id = p_tenant_id
      and ct.type = 'earn'
      and ct.created_at >= now() - interval '24 hours';

  select coalesce(sum(ct.amount), 0)
    into v_prev6_earned
    from public.coin_transactions ct
    where ct.tenant_id = p_tenant_id
      and ct.type = 'earn'
      and ct.created_at >= now() - interval '168 hours'
      and ct.created_at < now() - interval '24 hours';

  v_prev6_earned_avg := v_prev6_earned::numeric / 6;

  if v_prev6_earned_avg > 0 and v_last24_earned > (v_prev6_earned_avg * 3) and v_last24_earned > 1000 then
    v_anomaly_items := v_anomaly_items || jsonb_build_array(
      jsonb_build_object(
        'code', 'mint_spike_24h',
        'severity', 'warn',
        'title', 'Mint spike senaste 24h',
        'details', format('Minted %s coins senaste 24h (snitt fÃ¶regÃ¥ende 6d: %s).', v_last24_earned, round(v_prev6_earned_avg)),
        'last24h', v_last24_earned,
        'prev6dAvg', round(v_prev6_earned_avg)
      )
    );
  end if;

  select coalesce(sum(gaa.amount), 0)
    into v_last24_awards
    from public.gamification_admin_awards gaa
    where gaa.tenant_id = p_tenant_id
      and gaa.created_at >= now() - interval '24 hours';

  select coalesce(sum(gaa.amount), 0)
    into v_prev6_awards
    from public.gamification_admin_awards gaa
    where gaa.tenant_id = p_tenant_id
      and gaa.created_at >= now() - interval '168 hours'
      and gaa.created_at < now() - interval '24 hours';

  v_prev6_awards_avg := v_prev6_awards::numeric / 6;

  if v_prev6_awards_avg > 0 and v_last24_awards > (v_prev6_awards_avg * 3) and v_last24_awards > 500 then
    v_anomaly_items := v_anomaly_items || jsonb_build_array(
      jsonb_build_object(
        'code', 'admin_awards_spike_24h',
        'severity', 'warn',
        'title', 'Admin awards spike senaste 24h',
        'details', format('Utdelat %s coins via admin awards senaste 24h (snitt fÃ¶regÃ¥ende 6d: %s).', v_last24_awards, round(v_prev6_awards_avg)),
        'last24h', v_last24_awards,
        'prev6dAvg', round(v_prev6_awards_avg)
      )
    );
  end if;

  select coalesce(sum(ct.amount), 0)
    into v_last24_automation
    from public.coin_transactions ct
    where ct.tenant_id = p_tenant_id
      and ct.type = 'earn'
      and ct.reason_code = 'automation_rule'
      and ct.created_at >= now() - interval '24 hours';

  select coalesce(sum(ct.amount), 0)
    into v_prev6_automation
    from public.coin_transactions ct
    where ct.tenant_id = p_tenant_id
      and ct.type = 'earn'
      and ct.reason_code = 'automation_rule'
      and ct.created_at >= now() - interval '168 hours'
      and ct.created_at < now() - interval '24 hours';

  v_prev6_automation_avg := v_prev6_automation::numeric / 6;

  if v_prev6_automation_avg > 0 and v_last24_automation > (v_prev6_automation_avg * 3) and v_last24_automation > 500 then
    v_anomaly_items := v_anomaly_items || jsonb_build_array(
      jsonb_build_object(
        'code', 'automation_spike_24h',
        'severity', 'warn',
        'title', 'Automation rewards spike senaste 24h',
        'details', format('Minted %s coins via automation rules senaste 24h (snitt fÃ¶regÃ¥ende 6d: %s).', v_last24_automation, round(v_prev6_automation_avg)),
        'last24h', v_last24_automation,
        'prev6dAvg', round(v_prev6_automation_avg)
      )
    );
  end if;

  select coalesce(sum(ct.amount), 0)
    into v_last24_campaign_bonus
    from public.coin_transactions ct
    where ct.tenant_id = p_tenant_id
      and ct.type = 'earn'
      and ct.reason_code = 'campaign_bonus'
      and ct.created_at >= now() - interval '24 hours';

  select coalesce(sum(ct.amount), 0)
    into v_prev6_campaign_bonus
    from public.coin_transactions ct
    where ct.tenant_id = p_tenant_id
      and ct.type = 'earn'
      and ct.reason_code = 'campaign_bonus'
      and ct.created_at >= now() - interval '168 hours'
      and ct.created_at < now() - interval '24 hours';

  v_prev6_campaign_bonus_avg := v_prev6_campaign_bonus::numeric / 6;

  if v_prev6_campaign_bonus_avg > 0 and v_last24_campaign_bonus > (v_prev6_campaign_bonus_avg * 3) and v_last24_campaign_bonus > 500 then
    v_anomaly_items := v_anomaly_items || jsonb_build_array(
      jsonb_build_object(
        'code', 'campaign_bonus_spike_24h',
        'severity', 'warn',
        'title', 'Campaign bonus spike senaste 24h',
        'details', format('Minted %s coins via kampanjer senaste 24h (snitt fÃ¶regÃ¥ende 6d: %s).', v_last24_campaign_bonus, round(v_prev6_campaign_bonus_avg)),
        'last24h', v_last24_campaign_bonus,
        'prev6dAvg', round(v_prev6_campaign_bonus_avg)
      )
    );
  end if;

  -- Concentration heuristic: one rule dominates automation rewards
  v_top_rule_total := 0;
  if jsonb_typeof(v_top_rules) = 'array' and jsonb_array_length(v_top_rules) > 0 then
    begin
      v_top_rule_total := coalesce((v_top_rules->0->>'totalAmount')::bigint, 0);
    exception when others then
      v_top_rule_total := 0;
    end;
  end if;

  if v_automation_reward_total > 500 and v_top_rule_total::numeric >= (v_automation_reward_total::numeric * 0.8) then
    v_anomaly_items := v_anomaly_items || jsonb_build_array(
      jsonb_build_object(
        'code', 'automation_concentration',
        'severity', 'info',
        'title', 'Automation rewards koncentrerade',
        'details', format('Top rule stÃ¥r fÃ¶r %s/%s coins (%s%%) i perioden.', v_top_rule_total, v_automation_reward_total, round((v_top_rule_total::numeric / nullif(v_automation_reward_total::numeric, 0)) * 100)),
        'topRuleTotal', v_top_rule_total,
        'automationTotal', v_automation_reward_total
      )
    );
  end if;

  tenant_id := p_tenant_id;
  window_days := p_window_days;
  since := v_since;

  economy := jsonb_build_object(
    'earned', v_earned,
    'spent', v_spent,
    'net', (v_earned - v_spent),
    'transactionsCount', v_tx_count,
    'usedRollup', v_use_rollup
  );

  events := jsonb_build_object(
    'total', v_events_total,
    'topTypes', v_top_event_types
  );

  awards := jsonb_build_object(
    'awardsCount', v_awards_count,
    'totalAmount', v_awards_total
  );

  shop := jsonb_build_object(
    'purchasesCount', v_purchases_count,
    'totalSpent', v_total_spent,
    'topItems', v_top_items
  );

  campaigns := jsonb_build_object(
    'bonusTotalAmount', v_campaign_bonus_total,
    'topCampaigns', v_top_campaigns
  );

  automations := jsonb_build_object(
    'rewardTotalAmount', v_automation_reward_total,
    'topRules', v_top_rules
  );

  anomalies := jsonb_build_object(
    'items', v_anomaly_items
  );

  return next;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_request_award_coins_v1(p_tenant_id uuid, p_actor_user_id uuid, p_target_user_ids uuid[], p_amount integer, p_message text, p_idempotency_key text)
 RETURNS TABLE(request_id uuid, status text, recipient_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_request_id uuid;
  v_existing_id uuid;
  v_lock_key bigint;
  v_now timestamptz := now();
  v_user_id uuid;
  v_count integer;
begin
  if p_tenant_id is null then
    raise exception 'p_tenant_id is required';
  end if;
  if p_actor_user_id is null then
    raise exception 'p_actor_user_id is required';
  end if;
  if p_target_user_ids is null or array_length(p_target_user_ids, 1) is null or array_length(p_target_user_ids, 1) = 0 then
    raise exception 'p_target_user_ids is required';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'p_amount must be > 0';
  end if;
  if p_idempotency_key is null or length(trim(p_idempotency_key)) = 0 then
    raise exception 'p_idempotency_key is required';
  end if;

  if auth.role() <> 'service_role' then
    raise exception 'service role only';
  end if;

  v_lock_key := hashtextextended(p_tenant_id::text || ':' || p_idempotency_key, 0);
  perform pg_advisory_xact_lock(v_lock_key);

  select r.id
    into v_existing_id
    from public.gamification_admin_award_requests r
    where r.tenant_id = p_tenant_id
      and r.idempotency_key = p_idempotency_key
    limit 1;

  if v_existing_id is not null then
    select count(*)::int
      into v_count
      from public.gamification_admin_award_request_recipients rr
      where rr.request_id = v_existing_id;

    request_id := v_existing_id;
    status := (select r2.status from public.gamification_admin_award_requests r2 where r2.id = v_existing_id);
    recipient_count := coalesce(v_count, 0);
    return next;
    return;
  end if;

  insert into public.gamification_admin_award_requests(
    tenant_id,
    requester_user_id,
    amount,
    message,
    idempotency_key,
    status,
    created_at
  ) values (
    p_tenant_id,
    p_actor_user_id,
    p_amount,
    nullif(p_message, ''),
    p_idempotency_key,
    'pending',
    v_now
  ) returning id into v_request_id;

  for v_user_id in (select distinct unnest(p_target_user_ids)) loop
    insert into public.gamification_admin_award_request_recipients(
      request_id,
      tenant_id,
      user_id,
      created_at
    ) values (
      v_request_id,
      p_tenant_id,
      v_user_id,
      v_now
    )
    on conflict (request_id, user_id) do nothing;
  end loop;

  select count(*)::int
    into v_count
    from public.gamification_admin_award_request_recipients rr
    where rr.request_id = v_request_id;

  insert into public.tenant_audit_logs(tenant_id, actor_user_id, event_type, payload, created_at)
  values (
    p_tenant_id,
    p_actor_user_id,
    'gamification.admin_award_request.coins',
    jsonb_build_object(
      'request_id', v_request_id,
      'amount', p_amount,
      'message', nullif(p_message, ''),
      'recipient_count', v_count,
      'idempotency_key', p_idempotency_key
    ),
    v_now
  );

  request_id := v_request_id;
  status := 'pending';
  recipient_count := v_count;
  return next;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.aggregate_usage_for_period(p_tenant_id uuid, p_metric_name text, p_start_date timestamp with time zone, p_end_date timestamp with time zone)
 RETURNS numeric
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_total NUMERIC;
BEGIN
  SELECT COALESCE(SUM(quantity), 0)
  INTO v_total
  FROM public.usage_records
  WHERE tenant_id = p_tenant_id
    AND metric_name = p_metric_name
    AND recorded_at >= p_start_date
    AND recorded_at < p_end_date;

  RETURN v_total;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.aggregate_usage_for_period(p_period_start date, p_period_end date)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_count INTEGER := 0;
  v_meter RECORD;
  v_tenant RECORD;
  v_total NUMERIC;
  v_unit_price INTEGER;
  v_included INTEGER;
  v_billable NUMERIC;
  v_amount INTEGER;
BEGIN
  -- Loop through all meters
  FOR v_meter IN SELECT * FROM public.usage_meters WHERE status = 'active' LOOP
    -- Loop through tenants with usage
    FOR v_tenant IN 
      SELECT DISTINCT tenant_id 
      FROM public.usage_records 
      WHERE meter_id = v_meter.id 
      AND period_start = p_period_start 
      AND period_end = p_period_end
    LOOP
      -- Aggregate based on type
      IF v_meter.aggregation_type = 'sum' THEN
        SELECT COALESCE(SUM(quantity), 0) INTO v_total
        FROM public.usage_records
        WHERE tenant_id = v_tenant.tenant_id
        AND meter_id = v_meter.id
        AND period_start = p_period_start;
      ELSIF v_meter.aggregation_type = 'max' THEN
        SELECT COALESCE(MAX(quantity), 0) INTO v_total
        FROM public.usage_records
        WHERE tenant_id = v_tenant.tenant_id
        AND meter_id = v_meter.id
        AND period_start = p_period_start;
      ELSE
        SELECT COALESCE(SUM(quantity), 0) INTO v_total
        FROM public.usage_records
        WHERE tenant_id = v_tenant.tenant_id
        AND meter_id = v_meter.id
        AND period_start = p_period_start;
      END IF;

      -- Get pricing
      v_unit_price := COALESCE(v_meter.default_unit_price, 0);
      v_included := COALESCE(v_meter.default_included_units, 0);

      -- Calculate billable
      v_billable := GREATEST(v_total - v_included, 0);
      v_amount := ROUND(v_billable * v_unit_price);

      -- Upsert summary
      INSERT INTO usage_summaries (
        tenant_id, meter_id, period_start, period_end,
        total_quantity, billable_quantity, unit_price, included_units, amount_due
      )
      VALUES (
        v_tenant.tenant_id, v_meter.id, p_period_start, p_period_end,
        v_total, v_billable, v_unit_price, v_included, v_amount
      )
      ON CONFLICT (tenant_id, meter_id, period_start, period_end)
      DO UPDATE SET
        total_quantity = EXCLUDED.total_quantity,
        billable_quantity = EXCLUDED.billable_quantity,
        amount_due = EXCLUDED.amount_due,
        updated_at = now();

      v_count := v_count + 1;
    END LOOP;
  END LOOP;

  RETURN v_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.apply_automation_rule_reward_v1(p_rule_id uuid, p_user_id uuid, p_tenant_id uuid, p_event_id uuid, p_event_type text, p_idempotency_key text)
 RETURNS TABLE(applied boolean, coin_transaction_id uuid, balance integer, reward_amount integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_rule public.gamification_automation_rules%rowtype;
  v_now timestamptz := now();
  v_tx_id uuid;
  v_balance integer;
  v_existing_tx_id uuid;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role only';
  end if;

  if p_rule_id is null then raise exception 'p_rule_id is required'; end if;
  if p_user_id is null then raise exception 'p_user_id is required'; end if;
  if p_tenant_id is null then raise exception 'p_tenant_id is required'; end if;
  if p_event_id is null then raise exception 'p_event_id is required'; end if;
  if p_event_type is null or length(trim(p_event_type)) = 0 then raise exception 'p_event_type is required'; end if;
  if p_idempotency_key is null or length(trim(p_idempotency_key)) < 8 then raise exception 'p_idempotency_key is required'; end if;

  -- Idempotency: if already applied, do not mint again.
  select ct.id
    into v_existing_tx_id
    from public.coin_transactions ct
    where ct.user_id = p_user_id
      and ct.tenant_id = p_tenant_id
      and ct.idempotency_key = p_idempotency_key
    limit 1;

  if v_existing_tx_id is not null then
    select uc.balance
      into v_balance
      from public.user_coins uc
      where uc.user_id = p_user_id
        and uc.tenant_id = p_tenant_id
      limit 1;

    applied := true;
    coin_transaction_id := v_existing_tx_id;
    balance := coalesce(v_balance, 0);
    reward_amount := 0;
    return next;
    return;
  end if;

  select * into v_rule
    from public.gamification_automation_rules r
    where r.id = p_rule_id
      and r.tenant_id = p_tenant_id
    limit 1;

  if v_rule.id is null then
    applied := false;
    coin_transaction_id := null;
    balance := 0;
    reward_amount := 0;
    return next;
    return;
  end if;

  if v_rule.is_active is distinct from true then
    applied := false;
    coin_transaction_id := null;
    balance := 0;
    reward_amount := 0;
    return next;
    return;
  end if;

  if v_rule.event_type <> p_event_type then
    applied := false;
    coin_transaction_id := null;
    balance := 0;
    reward_amount := 0;
    return next;
    return;
  end if;

  select transaction_id, balance
    into v_tx_id, v_balance
    from public.apply_coin_transaction_v1(
      p_user_id := p_user_id,
      p_tenant_id := p_tenant_id,
      p_type := 'earn',
      p_amount := v_rule.reward_amount,
      p_reason_code := 'automation_rule',
      p_idempotency_key := p_idempotency_key,
      p_description := 'Automation rule: ' || v_rule.name,
      p_source := 'automation',
      p_metadata := jsonb_build_object(
        'ruleId', p_rule_id,
        'eventId', p_event_id,
        'eventType', p_event_type
      )
    )
    limit 1;

  applied := true;
  coin_transaction_id := v_tx_id;
  balance := coalesce(v_balance, 0);
  reward_amount := v_rule.reward_amount;
  return next;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.apply_campaign_bonus_v1(p_campaign_id uuid, p_user_id uuid, p_tenant_id uuid, p_event_id uuid, p_event_type text, p_idempotency_key text)
 RETURNS TABLE(applied boolean, coin_transaction_id uuid, balance integer, bonus_amount integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_campaign public.gamification_campaigns%rowtype;
  v_now timestamptz := now();
  v_lock_key bigint;
  v_budget_remaining integer;
  v_tx_id uuid;
  v_balance integer;
  v_existing_tx_id uuid;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role only';
  end if;

  if p_campaign_id is null then raise exception 'p_campaign_id is required'; end if;
  if p_user_id is null then raise exception 'p_user_id is required'; end if;
  if p_tenant_id is null then raise exception 'p_tenant_id is required'; end if;
  if p_event_id is null then raise exception 'p_event_id is required'; end if;
  if p_event_type is null or length(trim(p_event_type)) = 0 then raise exception 'p_event_type is required'; end if;
  if p_idempotency_key is null or length(trim(p_idempotency_key)) < 8 then raise exception 'p_idempotency_key is required'; end if;

  -- Serialize budget updates per campaign + tenant
  v_lock_key := hashtextextended(p_campaign_id::text || ':' || p_tenant_id::text, 0);
  perform pg_advisory_xact_lock(v_lock_key);

  -- Idempotency: if this campaign bonus was already applied, do not increment spent again.
  select ct.id
    into v_existing_tx_id
    from public.coin_transactions ct
    where ct.user_id = p_user_id
      and ct.tenant_id = p_tenant_id
      and ct.idempotency_key = p_idempotency_key
    limit 1;

  if v_existing_tx_id is not null then
    select uc.balance
      into v_balance
      from public.user_coins uc
      where uc.user_id = p_user_id
        and uc.tenant_id = p_tenant_id
      limit 1;

    applied := true;
    coin_transaction_id := v_existing_tx_id;
    balance := coalesce(v_balance, 0);
    bonus_amount := 0;
    return next;
    return;
  end if;

  select * into v_campaign
    from public.gamification_campaigns gc
    where gc.id = p_campaign_id
      and gc.tenant_id = p_tenant_id
    limit 1;

  if v_campaign.id is null then
    applied := false;
    coin_transaction_id := null;
    balance := 0;
    bonus_amount := 0;
    return next;
    return;
  end if;

  if v_campaign.is_active is distinct from true then
    applied := false;
    coin_transaction_id := null;
    balance := 0;
    bonus_amount := 0;
    return next;
    return;
  end if;

  if not (v_now >= v_campaign.starts_at and v_now <= v_campaign.ends_at) then
    applied := false;
    coin_transaction_id := null;
    balance := 0;
    bonus_amount := 0;
    return next;
    return;
  end if;

  if v_campaign.event_type <> p_event_type then
    applied := false;
    coin_transaction_id := null;
    balance := 0;
    bonus_amount := 0;
    return next;
    return;
  end if;

  if v_campaign.budget_amount is not null then
    v_budget_remaining := greatest(v_campaign.budget_amount - v_campaign.spent_amount, 0);
    if v_campaign.bonus_amount > v_budget_remaining then
      applied := false;
      coin_transaction_id := null;
      balance := 0;
      bonus_amount := 0;
      return next;
      return;
    end if;
  end if;

  select transaction_id, balance
    into v_tx_id, v_balance
    from public.apply_coin_transaction_v1(
      p_user_id := p_user_id,
      p_tenant_id := p_tenant_id,
      p_type := 'earn',
      p_amount := v_campaign.bonus_amount,
      p_reason_code := 'campaign_bonus',
      p_idempotency_key := p_idempotency_key,
      p_description := 'Campaign bonus: ' || v_campaign.name,
      p_source := 'campaign',
      p_metadata := jsonb_build_object(
        'campaignId', p_campaign_id,
        'eventId', p_event_id,
        'eventType', p_event_type
      )
    )
    limit 1;

  if v_tx_id is not null then
    update public.gamification_campaigns
      set spent_amount = spent_amount + v_campaign.bonus_amount,
          updated_at = now()
      where id = p_campaign_id
        and tenant_id = p_tenant_id;
  end if;

  applied := true;
  coin_transaction_id := v_tx_id;
  balance := coalesce(v_balance, 0);
  bonus_amount := v_campaign.bonus_amount;
  return next;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.apply_coin_transaction_v1(p_user_id uuid, p_tenant_id uuid, p_type text, p_amount integer, p_reason_code text, p_idempotency_key text, p_description text DEFAULT NULL::text, p_source text DEFAULT NULL::text, p_metadata jsonb DEFAULT NULL::jsonb)
 RETURNS TABLE(transaction_id uuid, balance integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_existing_id uuid;
  v_balance integer;
  v_delta integer;
  v_earned_delta integer;
  v_spent_delta integer;
  v_now timestamptz := now();
  v_lock_key bigint;
begin
  if p_user_id is null then
    raise exception 'p_user_id is required';
  end if;
  if p_tenant_id is null then
    raise exception 'p_tenant_id is required';
  end if;
  if p_type is null or p_type not in ('earn','spend') then
    raise exception 'p_type must be earn|spend';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'p_amount must be > 0';
  end if;
  if p_idempotency_key is null or length(trim(p_idempotency_key)) = 0 then
    raise exception 'p_idempotency_key is required';
  end if;

  -- Serialize per idempotency key to prevent double-apply under concurrency.
  v_lock_key := hashtextextended(p_user_id::text || ':' || p_tenant_id::text || ':' || p_idempotency_key, 0);
  perform pg_advisory_xact_lock(v_lock_key);

  select ct.id
    into v_existing_id
    from public.coin_transactions ct
    where ct.user_id = p_user_id
      and ct.tenant_id = p_tenant_id
      and ct.idempotency_key = p_idempotency_key
    limit 1;

  if v_existing_id is not null then
    select uc.balance
      into v_balance
      from public.user_coins uc
      where uc.user_id = p_user_id
        and uc.tenant_id = p_tenant_id
      limit 1;

    transaction_id := v_existing_id;
    balance := coalesce(v_balance, 0);
    return next;
    return;
  end if;

  insert into public.user_coins(user_id, tenant_id, balance, total_earned, total_spent, created_at, updated_at)
  values (p_user_id, p_tenant_id, 0, 0, 0, v_now, v_now)
  on conflict (user_id, tenant_id) do nothing;

  v_delta := case when p_type = 'earn' then p_amount else -p_amount end;
  v_earned_delta := case when p_type = 'earn' then p_amount else 0 end;
  v_spent_delta := case when p_type = 'spend' then p_amount else 0 end;

  -- Use explicit table reference to avoid ambiguity with return column "balance"
  update public.user_coins as uc_update
    set balance = uc_update.balance + v_delta,
        total_earned = uc_update.total_earned + v_earned_delta,
        total_spent = uc_update.total_spent + v_spent_delta,
        updated_at = v_now
    where uc_update.user_id = p_user_id
      and uc_update.tenant_id = p_tenant_id
      and (p_type <> 'spend' or uc_update.balance >= p_amount)
    returning uc_update.balance into v_balance;

  if v_balance is null then
    raise exception 'insufficient funds';
  end if;

  insert into public.coin_transactions(
    user_id,
    tenant_id,
    type,
    amount,
    description,
    reason_code,
    idempotency_key,
    source,
    metadata,
    created_at
  ) values (
    p_user_id,
    p_tenant_id,
    p_type,
    p_amount,
    p_description,
    p_reason_code,
    p_idempotency_key,
    p_source,
    p_metadata,
    v_now
  ) returning id into transaction_id;

  balance := v_balance;
  return next;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.apply_ticket_routing_rules(p_ticket_id uuid)
 RETURNS TABLE(rule_id uuid, rule_name text, action_taken text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_ticket RECORD;
  v_rule RECORD;
  v_actions_taken text[] := '{}';
BEGIN
  -- Get ticket details
  SELECT * INTO v_ticket FROM public.support_tickets WHERE id = p_ticket_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Find matching rules (first match wins per action type)
  FOR v_rule IN 
    SELECT * FROM public.ticket_routing_rules 
    WHERE is_active = true
      AND (tenant_id IS NULL OR tenant_id = v_ticket.tenant_id)
      AND (match_category IS NULL OR match_category = v_ticket.category)
      AND (match_priority IS NULL OR match_priority = v_ticket.priority)
      AND (match_tenant_id IS NULL OR match_tenant_id = v_ticket.tenant_id)
    ORDER BY priority_order ASC
    LIMIT 5  -- Safety limit
  LOOP
    -- Apply assignment if not already assigned
    IF v_rule.assign_to_user_id IS NOT NULL 
       AND v_ticket.assigned_to_user_id IS NULL 
       AND NOT 'assigned' = ANY(v_actions_taken) THEN
      UPDATE support_tickets 
      SET assigned_to_user_id = v_rule.assign_to_user_id,
          updated_at = now()
      WHERE id = p_ticket_id;
      v_actions_taken := array_append(v_actions_taken, 'assigned');
      
      rule_id := v_rule.id;
      rule_name := v_rule.name;
      action_taken := 'assigned_to_user';
      RETURN NEXT;
    END IF;
    
    -- Apply SLA if not set
    IF v_rule.set_sla_hours IS NOT NULL 
       AND v_ticket.sla_deadline IS NULL
       AND NOT 'sla_set' = ANY(v_actions_taken) THEN
      UPDATE support_tickets 
      SET sla_deadline = now() + (v_rule.set_sla_hours || ' hours')::interval,
          updated_at = now()
      WHERE id = p_ticket_id;
      v_actions_taken := array_append(v_actions_taken, 'sla_set');
      
      rule_id := v_rule.id;
      rule_name := v_rule.name;
      action_taken := 'sla_deadline_set';
      RETURN NEXT;
    END IF;
    
    -- Apply priority override
    IF v_rule.set_priority IS NOT NULL 
       AND NOT 'priority_set' = ANY(v_actions_taken) THEN
      UPDATE support_tickets 
      SET priority = v_rule.set_priority,
          updated_at = now()
      WHERE id = p_ticket_id;
      v_actions_taken := array_append(v_actions_taken, 'priority_set');
      
      rule_id := v_rule.id;
      rule_name := v_rule.name;
      action_taken := 'priority_overridden';
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.apply_xp_transaction_v1(p_user_id uuid, p_tenant_id uuid, p_amount integer, p_reason_code text, p_idempotency_key text, p_source text DEFAULT NULL::text, p_metadata jsonb DEFAULT NULL::jsonb)
 RETURNS TABLE(new_xp integer, new_level integer, level_up boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_existing boolean;
  v_current_xp integer;
  v_current_level integer;
  v_next_level_xp integer;
  v_new_xp integer;
  v_new_level integer;
  v_level_up boolean := false;
  v_now timestamptz := now();
begin
  if p_user_id is null then
    raise exception 'p_user_id is required';
  end if;
  if p_tenant_id is null then
    raise exception 'p_tenant_id is required';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'p_amount must be > 0';
  end if;
  if p_idempotency_key is null or length(trim(p_idempotency_key)) = 0 then
    raise exception 'p_idempotency_key is required';
  end if;

  -- Check idempotency via metadata in user_progress
  -- We store granted XP keys in a jsonb array
  select exists(
    select 1 from public.user_progress up
    where up.user_id = p_user_id
      and up.tenant_id = p_tenant_id
      and up.xp_grants ? p_idempotency_key
  ) into v_existing;

  if v_existing then
    -- Already granted, return current state
    select up.current_xp, up.level
    into v_current_xp, v_current_level
    from public.user_progress up
    where up.user_id = p_user_id
      and up.tenant_id = p_tenant_id;
    
    new_xp := coalesce(v_current_xp, 0);
    new_level := coalesce(v_current_level, 1);
    level_up := false;
    return next;
    return;
  end if;

  -- Ensure user_progress row exists
  insert into public.user_progress(user_id, tenant_id, level, current_xp, next_level_xp, xp_grants, created_at, updated_at)
  values (p_user_id, p_tenant_id, 1, 0, 1000, '[]'::jsonb, v_now, v_now)
  on conflict (user_id, tenant_id) do nothing;

  -- Get current state
  select up.current_xp, up.level, up.next_level_xp
  into v_current_xp, v_current_level, v_next_level_xp
  from public.user_progress up
  where up.user_id = p_user_id
    and up.tenant_id = p_tenant_id;

  v_new_xp := v_current_xp + p_amount;
  v_new_level := v_current_level;

  -- Check for level up (simple threshold check)
  while v_new_xp >= v_next_level_xp loop
    v_new_xp := v_new_xp - v_next_level_xp;
    v_new_level := v_new_level + 1;
    v_level_up := true;
    -- Get next level threshold from definitions or use default scaling
    select gld.next_level_xp into v_next_level_xp
    from public.gamification_level_definitions gld
    where (gld.tenant_id = p_tenant_id or gld.tenant_id is null)
      and gld.level = v_new_level
    order by gld.tenant_id nulls last
    limit 1;
    
    if v_next_level_xp is null then
      -- Default: each level requires 1000 * level XP
      v_next_level_xp := 1000 * v_new_level;
    end if;
  end loop;

  -- Update user_progress with new XP, level, and mark idempotency key
  update public.user_progress
  set current_xp = v_new_xp,
      level = v_new_level,
      next_level_xp = v_next_level_xp,
      xp_grants = coalesce(xp_grants, '[]'::jsonb) || to_jsonb(p_idempotency_key),
      updated_at = v_now
  where user_id = p_user_id
    and tenant_id = p_tenant_id;

  new_xp := v_new_xp;
  new_level := v_new_level;
  level_up := v_level_up;
  return next;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.assert_entitlement_seat_capacity()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  max_seats integer;
  used_seats integer;
begin
  -- Only enforce when transitioning into active
  if (new.status <> 'active') then
    return new;
  end if;

  if (tg_op = 'UPDATE' and old.status = 'active') then
    return new;
  end if;

  -- Lock the entitlement row to avoid concurrent over-allocation.
  select e.quantity_seats
    into max_seats
    from public.tenant_product_entitlements e
    where e.id = new.entitlement_id
    for update;

  if max_seats is null then
    raise exception 'Invalid entitlement_id';
  end if;

  select count(*)
    into used_seats
    from public.tenant_entitlement_seat_assignments s
    where s.entitlement_id = new.entitlement_id
      and s.status = 'active'
      and (tg_op <> 'UPDATE' or s.id <> new.id);

  if used_seats >= max_seats then
    raise exception 'No seats available for entitlement %', new.entitlement_id;
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.attempt_keypad_unlock(p_artifact_id uuid, p_entered_code text, p_participant_id uuid, p_participant_name text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_session_id UUID;
  v_game_artifact_id UUID;
BEGIN
  -- Look up session and source artifact from session_artifacts
  SELECT sa.session_id, sa.source_artifact_id
  INTO v_session_id, v_game_artifact_id
  FROM public.session_artifacts sa
  WHERE sa.id = p_artifact_id;

  IF v_session_id IS NULL OR v_game_artifact_id IS NULL THEN
    -- Fall back to original behavior for artifacts without source
    -- This handles edge cases during migration
    RETURN jsonb_build_object('status', 'error', 'message', 'Artifact not found or not linked to game artifact');
  END IF;

  -- Delegate to V2 function
  RETURN public.attempt_keypad_unlock_v2(
    v_session_id,
    v_game_artifact_id,
    p_entered_code,
    p_participant_id,
    p_participant_name
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.attempt_keypad_unlock_v2(p_session_id uuid, p_game_artifact_id uuid, p_entered_code text, p_participant_id uuid, p_participant_name text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_game_artifact RECORD;
  v_session RECORD;
  v_state_row RECORD;
  v_config JSONB;
  v_state JSONB;
  v_correct_code TEXT;
  v_max_attempts INT;
  v_lock_on_fail BOOLEAN;
  v_is_unlocked BOOLEAN;
  v_is_locked_out BOOLEAN;
  v_attempt_count INT;
  v_new_attempt_count INT;
  v_is_correct BOOLEAN;
  v_should_lock BOOLEAN;
  v_attempts_left INT;
  v_new_state JSONB;
  v_success_message TEXT;
  v_fail_message TEXT;
  v_locked_message TEXT;
BEGIN
  -- ==========================================================================
  -- 1. Validate session exists and get game_id
  -- ==========================================================================
  SELECT id, game_id, status
  INTO v_session
  FROM public.participant_sessions
  WHERE id = p_session_id;

  IF v_session IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Session not found');
  END IF;

  IF v_session.status NOT IN ('active', 'paused') THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Session is not active');
  END IF;

  -- ==========================================================================
  -- 2. Validate game artifact exists and belongs to session's game
  -- ==========================================================================
  SELECT id, game_id, artifact_type, metadata
  INTO v_game_artifact
  FROM public.game_artifacts
  WHERE id = p_game_artifact_id;

  IF v_game_artifact IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Artifact not found');
  END IF;

  IF v_game_artifact.game_id != v_session.game_id THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Artifact does not belong to session game');
  END IF;

  IF v_game_artifact.artifact_type != 'keypad' THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Artifact is not a keypad');
  END IF;

  -- ==========================================================================
  -- 3. Parse config from game_artifacts.metadata
  -- ==========================================================================
  v_config := COALESCE(v_game_artifact.metadata, '{}'::jsonb);
  v_correct_code := COALESCE(v_config->>'correctCode', '');
  v_max_attempts := (v_config->>'maxAttempts')::INT;
  v_lock_on_fail := COALESCE((v_config->>'lockOnFail')::BOOLEAN, FALSE);
  v_success_message := COALESCE(v_config->>'successMessage', 'Koden Ã¤r korrekt!');
  v_fail_message := COALESCE(v_config->>'failMessage', 'Fel kod, fÃ¶rsÃ¶k igen.');
  v_locked_message := COALESCE(v_config->>'lockedMessage', 'Keypaden Ã¤r lÃ¥st.');

  -- ==========================================================================
  -- 4. Get or create state record (with row lock for race protection)
  -- ==========================================================================
  -- First, try to insert if not exists
  INSERT INTO public.session_artifact_state (session_id, game_artifact_id, state)
  VALUES (p_session_id, p_game_artifact_id, '{}'::jsonb)
  ON CONFLICT (session_id, game_artifact_id) DO NOTHING;

  -- Now lock and read the state row
  SELECT id, state
  INTO v_state_row
  FROM public.session_artifact_state
  WHERE session_id = p_session_id
    AND game_artifact_id = p_game_artifact_id
  FOR UPDATE;

  -- Parse current keypad state
  v_state := COALESCE(v_state_row.state->'keypadState', '{}'::jsonb);
  v_is_unlocked := COALESCE((v_state->>'isUnlocked')::BOOLEAN, FALSE);
  v_is_locked_out := COALESCE((v_state->>'isLockedOut')::BOOLEAN, FALSE);
  v_attempt_count := COALESCE((v_state->>'attemptCount')::INT, 0);

  -- ==========================================================================
  -- 5. Check current state
  -- ==========================================================================
  
  -- Already unlocked? Return idempotent success
  IF v_is_unlocked THEN
    RETURN jsonb_build_object(
      'status', 'already_unlocked',
      'message', v_success_message,
      'is_unlocked', TRUE,
      'is_locked_out', FALSE,
      'attempt_count', v_attempt_count
    );
  END IF;

  -- Already locked out? Return idempotent locked
  IF v_is_locked_out THEN
    RETURN jsonb_build_object(
      'status', 'locked',
      'message', v_locked_message,
      'is_unlocked', FALSE,
      'is_locked_out', TRUE,
      'attempt_count', v_attempt_count
    );
  END IF;

  -- ==========================================================================
  -- 6. Validate the code
  -- ==========================================================================
  v_is_correct := (p_entered_code = v_correct_code);
  v_new_attempt_count := v_attempt_count + 1;

  IF v_is_correct THEN
    -- SUCCESS: Update state to unlocked
    v_new_state := jsonb_build_object(
      'isUnlocked', TRUE,
      'isLockedOut', FALSE,
      'attemptCount', v_new_attempt_count,
      'unlockedAt', to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      'unlockedByParticipantId', p_participant_id
    );

    -- Update state table
    UPDATE public.session_artifact_state
    SET 
      state = jsonb_set(COALESCE(state, '{}'::jsonb), '{keypadState}', v_new_state),
      updated_at = now()
    WHERE id = v_state_row.id;

    RETURN jsonb_build_object(
      'status', 'success',
      'message', v_success_message,
      'is_unlocked', TRUE,
      'is_locked_out', FALSE,
      'attempt_count', v_new_attempt_count,
      'unlocked_by', p_participant_name
    );

  ELSE
    -- FAIL: Check if should lock
    v_should_lock := (v_max_attempts IS NOT NULL) 
                     AND (v_new_attempt_count >= v_max_attempts) 
                     AND v_lock_on_fail;
    v_attempts_left := CASE 
      WHEN v_max_attempts IS NOT NULL THEN GREATEST(0, v_max_attempts - v_new_attempt_count) 
      ELSE NULL 
    END;

    v_new_state := jsonb_build_object(
      'isUnlocked', FALSE,
      'isLockedOut', v_should_lock,
      'attemptCount', v_new_attempt_count,
      'unlockedAt', NULL,
      'unlockedByParticipantId', NULL
    );

    -- Update state table
    UPDATE public.session_artifact_state
    SET 
      state = jsonb_set(COALESCE(state, '{}'::jsonb), '{keypadState}', v_new_state),
      updated_at = now()
    WHERE id = v_state_row.id;

    IF v_should_lock THEN
      RETURN jsonb_build_object(
        'status', 'locked',
        'message', v_locked_message,
        'is_unlocked', FALSE,
        'is_locked_out', TRUE,
        'attempt_count', v_new_attempt_count,
        'attempts_left', 0
      );
    ELSE
      RETURN jsonb_build_object(
        'status', 'fail',
        'message', v_fail_message,
        'is_unlocked', FALSE,
        'is_locked_out', FALSE,
        'attempt_count', v_new_attempt_count,
        'attempts_left', v_attempts_left
      );
    END IF;
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.attempt_puzzle_counter_v2(p_session_id uuid, p_game_artifact_id uuid, p_action text, p_participant_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_game_artifact RECORD;
  v_session RECORD;
  v_state_row RECORD;
  v_config JSONB;
  v_state JSONB;
  v_puzzle_state JSONB;
  v_target INT;
  v_step INT;
  v_initial_value INT;
  v_current_value INT;
  v_is_completed BOOLEAN;
  v_history JSONB;
  v_new_entry JSONB;
  v_new_puzzle_state JSONB;
BEGIN
  -- 1. Validate session
  SELECT id, game_id, status INTO v_session
  FROM public.participant_sessions WHERE id = p_session_id;

  IF v_session IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Session not found');
  END IF;

  IF v_session.status NOT IN ('active', 'paused') THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Session is not active');
  END IF;

  -- 2. Validate artifact
  SELECT id, game_id, artifact_type, metadata INTO v_game_artifact
  FROM public.game_artifacts WHERE id = p_game_artifact_id;

  IF v_game_artifact IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Artifact not found');
  END IF;

  IF v_game_artifact.game_id != v_session.game_id THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Artifact does not belong to session game');
  END IF;

  -- 3. Parse config
  v_config := COALESCE(v_game_artifact.metadata, '{}'::jsonb);
  v_target := (v_config->>'target')::INT;  -- NULL = no target
  v_step := COALESCE((v_config->>'step')::INT, 1);
  v_initial_value := COALESCE((v_config->>'initialValue')::INT, 0);

  -- 4. Get or create state row with row lock
  INSERT INTO public.session_artifact_state (session_id, game_artifact_id, state)
  VALUES (p_session_id, p_game_artifact_id, '{}'::jsonb)
  ON CONFLICT (session_id, game_artifact_id) DO NOTHING;

  SELECT id, state INTO v_state_row
  FROM public.session_artifact_state
  WHERE session_id = p_session_id AND game_artifact_id = p_game_artifact_id
  FOR UPDATE;

  -- 5. Parse puzzle state
  v_state := COALESCE(v_state_row.state, '{}'::jsonb);
  v_puzzle_state := COALESCE(v_state->'puzzleState', '{}'::jsonb);
  v_current_value := COALESCE((v_puzzle_state->>'currentValue')::INT, v_initial_value);
  v_is_completed := COALESCE((v_puzzle_state->>'completed')::BOOLEAN, false);
  v_history := COALESCE(v_puzzle_state->'history', '[]'::jsonb);

  -- 6. Already completed?
  IF v_is_completed THEN
    RETURN jsonb_build_object(
      'status', 'already_solved',
      'message', 'RÃ¤knaren Ã¤r redan klar!',
      'solved', true,
      'state', v_puzzle_state
    );
  END IF;

  -- 7. Apply action
  IF p_action = 'increment' THEN
    v_current_value := v_current_value + v_step;
  ELSIF p_action = 'decrement' THEN
    v_current_value := GREATEST(0, v_current_value - v_step);
  ELSE
    RETURN jsonb_build_object('status', 'error', 'message', 'Invalid action: must be increment or decrement');
  END IF;

  -- 8. Append history
  v_new_entry := jsonb_build_object(
    'action', p_action,
    'timestamp', to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'participantId', p_participant_id
  );
  v_history := v_history || v_new_entry;

  -- 9. Check target
  IF v_target IS NOT NULL AND v_current_value >= v_target THEN
    v_is_completed := true;
  END IF;

  -- 10. Build and write new state
  v_new_puzzle_state := jsonb_build_object(
    'currentValue', v_current_value,
    'completed', v_is_completed,
    'history', v_history
  );

  UPDATE public.session_artifact_state
  SET state = jsonb_set(COALESCE(state, '{}'::jsonb), '{puzzleState}', v_new_puzzle_state),
      updated_at = now()
  WHERE id = v_state_row.id;

  -- 11. Return result
  IF v_is_completed THEN
    RETURN jsonb_build_object(
      'status', 'success',
      'message', 'ðŸŽ‰ Klart! ' || v_current_value || '/' || v_target,
      'solved', true,
      'state', v_new_puzzle_state
    );
  ELSE
    RETURN jsonb_build_object(
      'status', 'fail',
      'message', v_current_value || COALESCE('/' || v_target, ''),
      'solved', false,
      'state', v_new_puzzle_state
    );
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.attempt_puzzle_multi_answer_v2(p_session_id uuid, p_game_artifact_id uuid, p_item_id text, p_participant_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_game_artifact RECORD;
  v_session RECORD;
  v_state_row RECORD;
  v_config JSONB;
  v_state JSONB;
  v_puzzle_state JSONB;
  v_items JSONB;
  v_required_count INT;
  v_checked JSONB;
  v_is_completed BOOLEAN;
  v_item_index INT;
  v_new_checked JSONB;
  v_new_puzzle_state JSONB;
  v_checked_count INT;
  i INT;
BEGIN
  -- 1. Validate session
  SELECT id, game_id, status INTO v_session
  FROM public.participant_sessions WHERE id = p_session_id;

  IF v_session IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Session not found');
  END IF;

  IF v_session.status NOT IN ('active', 'paused') THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Session is not active');
  END IF;

  -- 2. Validate artifact
  SELECT id, game_id, artifact_type, metadata INTO v_game_artifact
  FROM public.game_artifacts WHERE id = p_game_artifact_id;

  IF v_game_artifact IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Artifact not found');
  END IF;

  IF v_game_artifact.game_id != v_session.game_id THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Artifact does not belong to session game');
  END IF;

  -- 3. Parse config
  v_config := COALESCE(v_game_artifact.metadata, '{}'::jsonb);
  v_items := COALESCE(v_config->'items', '[]'::jsonb);
  v_required_count := COALESCE((v_config->>'requiredCount')::INT, jsonb_array_length(v_items));

  -- 4. Get or create state row with row lock
  INSERT INTO public.session_artifact_state (session_id, game_artifact_id, state)
  VALUES (p_session_id, p_game_artifact_id, '{}'::jsonb)
  ON CONFLICT (session_id, game_artifact_id) DO NOTHING;

  SELECT id, state INTO v_state_row
  FROM public.session_artifact_state
  WHERE session_id = p_session_id AND game_artifact_id = p_game_artifact_id
  FOR UPDATE;

  -- 5. Parse puzzle state
  v_state := COALESCE(v_state_row.state, '{}'::jsonb);
  v_puzzle_state := COALESCE(v_state->'puzzleState', '{}'::jsonb);
  v_checked := COALESCE(v_puzzle_state->'checked', '[]'::jsonb);
  v_is_completed := COALESCE((v_puzzle_state->>'completed')::BOOLEAN, false);

  -- 6. Already completed?
  IF v_is_completed THEN
    RETURN jsonb_build_object(
      'status', 'already_solved',
      'message', 'Redan klart!',
      'solved', true,
      'state', v_puzzle_state
    );
  END IF;

  -- 7. Toggle item in checked array
  v_item_index := -1;
  FOR i IN 0..jsonb_array_length(v_checked) - 1 LOOP
    IF v_checked->>i = p_item_id THEN
      v_item_index := i;
      EXIT;
    END IF;
  END LOOP;

  IF v_item_index >= 0 THEN
    -- Remove: rebuild array without the item
    v_new_checked := '[]'::jsonb;
    FOR i IN 0..jsonb_array_length(v_checked) - 1 LOOP
      IF i != v_item_index THEN
        v_new_checked := v_new_checked || jsonb_build_array(v_checked->i);
      END IF;
    END LOOP;
  ELSE
    -- Add item
    v_new_checked := v_checked || to_jsonb(p_item_id);
  END IF;

  v_checked_count := jsonb_array_length(v_new_checked);

  -- 8. Check completion
  IF v_checked_count >= v_required_count THEN
    v_is_completed := true;
  END IF;

  -- 9. Build and write new state
  v_new_puzzle_state := jsonb_build_object(
    'checked', v_new_checked,
    'completed', v_is_completed
  );

  UPDATE public.session_artifact_state
  SET state = jsonb_set(COALESCE(state, '{}'::jsonb), '{puzzleState}', v_new_puzzle_state),
      updated_at = now()
  WHERE id = v_state_row.id;

  -- 10. Return result
  IF v_is_completed THEN
    RETURN jsonb_build_object(
      'status', 'success',
      'message', 'âœ… Alla klara!',
      'solved', true,
      'state', v_new_puzzle_state
    );
  ELSE
    RETURN jsonb_build_object(
      'status', 'fail',
      'message', v_checked_count || '/' || v_required_count || ' klara',
      'solved', false,
      'state', v_new_puzzle_state
    );
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.attempt_puzzle_qr_gate_v2(p_session_id uuid, p_game_artifact_id uuid, p_scanned_value text, p_participant_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_game_artifact RECORD;
  v_session RECORD;
  v_state_row RECORD;
  v_config JSONB;
  v_state JSONB;
  v_puzzle_state JSONB;
  v_expected_value TEXT;
  v_is_verified BOOLEAN;
  v_is_match BOOLEAN;
  v_new_puzzle_state JSONB;
  v_success_message TEXT;
BEGIN
  -- 1. Validate session
  SELECT id, game_id, status INTO v_session
  FROM public.participant_sessions WHERE id = p_session_id;

  IF v_session IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Session not found');
  END IF;

  IF v_session.status NOT IN ('active', 'paused') THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Session is not active');
  END IF;

  -- 2. Validate artifact
  SELECT id, game_id, artifact_type, metadata INTO v_game_artifact
  FROM public.game_artifacts WHERE id = p_game_artifact_id;

  IF v_game_artifact IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Artifact not found');
  END IF;

  IF v_game_artifact.game_id != v_session.game_id THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Artifact does not belong to session game');
  END IF;

  -- 3. Parse config
  v_config := COALESCE(v_game_artifact.metadata, '{}'::jsonb);
  v_expected_value := COALESCE(v_config->>'expectedValue', '');
  v_success_message := COALESCE(v_config->>'successMessage', 'âœ… Verifierad!');

  -- 4. Get or create state row with row lock
  INSERT INTO public.session_artifact_state (session_id, game_artifact_id, state)
  VALUES (p_session_id, p_game_artifact_id, '{}'::jsonb)
  ON CONFLICT (session_id, game_artifact_id) DO NOTHING;

  SELECT id, state INTO v_state_row
  FROM public.session_artifact_state
  WHERE session_id = p_session_id AND game_artifact_id = p_game_artifact_id
  FOR UPDATE;

  -- 5. Parse puzzle state
  v_state := COALESCE(v_state_row.state, '{}'::jsonb);
  v_puzzle_state := COALESCE(v_state->'puzzleState', '{}'::jsonb);
  v_is_verified := COALESCE((v_puzzle_state->>'verified')::BOOLEAN, false);

  -- 6. Already verified?
  IF v_is_verified THEN
    RETURN jsonb_build_object(
      'status', 'already_solved',
      'message', 'Redan verifierad!',
      'solved', true,
      'state', v_puzzle_state
    );
  END IF;

  -- 7. Check match (case-insensitive, trimmed)
  v_is_match := (lower(trim(p_scanned_value)) = lower(trim(v_expected_value)));

  IF v_is_match THEN
    -- 8. Build and write verified state
    v_new_puzzle_state := jsonb_build_object(
      'verified', true,
      'scannedAt', to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    );

    UPDATE public.session_artifact_state
    SET state = jsonb_set(COALESCE(state, '{}'::jsonb), '{puzzleState}', v_new_puzzle_state),
        updated_at = now()
    WHERE id = v_state_row.id;

    RETURN jsonb_build_object(
      'status', 'success',
      'message', v_success_message,
      'solved', true,
      'state', v_new_puzzle_state
    );
  ELSE
    -- No state change on failed scan
    RETURN jsonb_build_object(
      'status', 'fail',
      'message', 'âŒ Fel QR-kod. SÃ¶k efter rÃ¤tt kod.',
      'solved', false,
      'state', v_puzzle_state
    );
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.attempt_puzzle_riddle_v2(p_session_id uuid, p_game_artifact_id uuid, p_normalized_answer text, p_is_correct boolean, p_participant_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_game_artifact RECORD;
  v_session RECORD;
  v_state_row RECORD;
  v_config JSONB;
  v_state JSONB;
  v_puzzle_state JSONB;
  v_max_attempts INT;
  v_attempts JSONB;
  v_attempt_count INT;
  v_new_attempt JSONB;
  v_is_solved BOOLEAN;
  v_is_locked BOOLEAN;
  v_attempts_left INT;
  v_new_puzzle_state JSONB;
  v_success_message TEXT;
  v_fail_message TEXT;
  v_locked_message TEXT;
BEGIN
  -- 1. Validate session
  SELECT id, game_id, status INTO v_session
  FROM public.participant_sessions WHERE id = p_session_id;

  IF v_session IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Session not found');
  END IF;

  IF v_session.status NOT IN ('active', 'paused') THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Session is not active');
  END IF;

  -- 2. Validate artifact
  SELECT id, game_id, artifact_type, metadata INTO v_game_artifact
  FROM public.game_artifacts WHERE id = p_game_artifact_id;

  IF v_game_artifact IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Artifact not found');
  END IF;

  IF v_game_artifact.game_id != v_session.game_id THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Artifact does not belong to session game');
  END IF;

  -- 3. Parse config
  v_config := COALESCE(v_game_artifact.metadata, '{}'::jsonb);
  v_max_attempts := (v_config->>'maxAttempts')::INT;  -- NULL = unlimited
  v_success_message := COALESCE(v_config->>'successMessage', 'âœ… RÃ¤tt svar!');
  v_fail_message := COALESCE(v_config->>'failMessage', 'âŒ Fel svar. FÃ¶rsÃ¶k igen!');
  v_locked_message := COALESCE(v_config->>'lockedMessage', 'ðŸš« LÃ¥st - fÃ¶r mÃ¥nga fÃ¶rsÃ¶k');

  -- 4. Get or create state row with row lock
  INSERT INTO public.session_artifact_state (session_id, game_artifact_id, state)
  VALUES (p_session_id, p_game_artifact_id, '{}'::jsonb)
  ON CONFLICT (session_id, game_artifact_id) DO NOTHING;

  SELECT id, state INTO v_state_row
  FROM public.session_artifact_state
  WHERE session_id = p_session_id AND game_artifact_id = p_game_artifact_id
  FOR UPDATE;

  -- 5. Parse puzzle state
  v_state := COALESCE(v_state_row.state, '{}'::jsonb);
  v_puzzle_state := COALESCE(v_state->'puzzleState', '{}'::jsonb);
  v_is_solved := COALESCE((v_puzzle_state->>'solved')::boolean, false);
  v_is_locked := COALESCE((v_puzzle_state->>'locked')::boolean, false);
  v_attempts := COALESCE(v_puzzle_state->'attempts', '[]'::jsonb);
  v_attempt_count := jsonb_array_length(v_attempts);

  -- 6. Check current state (idempotent returns)
  IF v_is_solved THEN
    RETURN jsonb_build_object(
      'status', 'already_solved',
      'message', 'Redan lÃ¶st!',
      'solved', true,
      'locked', false,
      'attempts_left', null,
      'state', v_puzzle_state
    );
  END IF;

  IF v_is_locked THEN
    RETURN jsonb_build_object(
      'status', 'locked',
      'message', v_locked_message,
      'solved', false,
      'locked', true,
      'attempts_left', 0,
      'state', v_puzzle_state
    );
  END IF;

  -- 7. Build new attempt
  v_new_attempt := jsonb_build_object(
    'answer', p_normalized_answer,
    'timestamp', to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'participantId', p_participant_id
  );
  v_attempts := v_attempts || v_new_attempt;
  v_attempt_count := v_attempt_count + 1;

  -- 8. Determine outcome
  IF p_is_correct THEN
    v_is_solved := true;
    v_is_locked := false;
  ELSE
    IF v_max_attempts IS NOT NULL AND v_attempt_count >= v_max_attempts THEN
      v_is_locked := true;
    END IF;
  END IF;

  v_attempts_left := CASE
    WHEN v_max_attempts IS NOT NULL THEN GREATEST(0, v_max_attempts - v_attempt_count)
    ELSE NULL
  END;

  -- 9. Build and write new state
  v_new_puzzle_state := jsonb_build_object(
    'solved', v_is_solved,
    'locked', v_is_locked,
    'attempts', v_attempts
  );

  UPDATE public.session_artifact_state
  SET state = jsonb_set(COALESCE(state, '{}'::jsonb), '{puzzleState}', v_new_puzzle_state),
      updated_at = now()
  WHERE id = v_state_row.id;

  -- 10. Return result
  IF v_is_solved THEN
    RETURN jsonb_build_object(
      'status', 'success',
      'message', v_success_message,
      'solved', true,
      'locked', false,
      'attempts_left', v_attempts_left,
      'state', v_new_puzzle_state
    );
  ELSIF v_is_locked THEN
    RETURN jsonb_build_object(
      'status', 'locked',
      'message', v_locked_message,
      'solved', false,
      'locked', true,
      'attempts_left', 0,
      'state', v_new_puzzle_state
    );
  ELSE
    RETURN jsonb_build_object(
      'status', 'fail',
      'message', v_fail_message,
      'solved', false,
      'locked', false,
      'attempts_left', v_attempts_left,
      'state', v_new_puzzle_state
    );
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.badge_preset_increment_usage(preset_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  UPDATE public.badge_presets
  SET usage_count = usage_count + 1
  WHERE id = preset_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.badge_presets_set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.bundle_items_update_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.burn_coins_v1(p_user_id uuid, p_tenant_id uuid, p_sink_id uuid, p_amount integer, p_idempotency_key text, p_metadata jsonb DEFAULT NULL::jsonb)
 RETURNS TABLE(success boolean, burn_log_id uuid, coin_transaction_id uuid, new_balance integer, error_message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_sink public.gamification_burn_sinks%rowtype;
  v_tx_result record;
  v_burn_id uuid;
  v_now timestamptz := now();
  v_lock_key bigint;
  v_existing_burn_id uuid;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role only';
  end if;

  -- Idempotency check
  v_lock_key := hashtextextended(p_user_id::text || ':' || p_tenant_id::text || ':burn:' || p_idempotency_key, 0);
  perform pg_advisory_xact_lock(v_lock_key);

  select bl.id into v_existing_burn_id
    from public.gamification_burn_log bl
    join public.coin_transactions ct on ct.id = bl.coin_transaction_id
    where ct.user_id = p_user_id
      and ct.tenant_id is not distinct from p_tenant_id
      and ct.idempotency_key = p_idempotency_key
    limit 1;

  if v_existing_burn_id is not null then
    -- Already processed
    select true, v_existing_burn_id, bl.coin_transaction_id, uc.balance, null::text
      into success, burn_log_id, coin_transaction_id, new_balance, error_message
      from public.gamification_burn_log bl
      join public.user_coins uc on uc.user_id = p_user_id and uc.tenant_id is not distinct from p_tenant_id
      where bl.id = v_existing_burn_id;
    return next;
    return;
  end if;

  -- Validate sink if provided
  if p_sink_id is not null then
    select * into v_sink
      from public.gamification_burn_sinks
      where id = p_sink_id
        and is_available = true
        and (available_from is null or available_from <= v_now)
        and (available_until is null or available_until >= v_now)
      limit 1;
    
    if v_sink.id is null then
      success := false;
      error_message := 'Sink not available';
      return next;
      return;
    end if;

    -- Check stock
    if v_sink.remaining_stock is not null and v_sink.remaining_stock <= 0 then
      success := false;
      error_message := 'Out of stock';
      return next;
      return;
    end if;
  end if;

  -- Execute spend transaction (will fail if insufficient funds)
  begin
    select * into v_tx_result
      from public.apply_coin_transaction_v1(
        p_user_id := p_user_id,
        p_tenant_id := p_tenant_id,
        p_type := 'spend',
        p_amount := p_amount,
        p_reason_code := 'burn:' || coalesce(v_sink.sink_type, 'manual'),
        p_idempotency_key := p_idempotency_key,
        p_description := coalesce(v_sink.name, 'Coin burn'),
        p_source := 'burn',
        p_metadata := jsonb_build_object(
          'sinkId', p_sink_id,
          'sinkType', v_sink.sink_type
        ) || coalesce(p_metadata, '{}'::jsonb)
      )
      limit 1;
  exception
    when others then
      success := false;
      error_message := sqlerrm;
      return next;
      return;
  end;

  -- Log the burn
  insert into public.gamification_burn_log (
    user_id, tenant_id, sink_id, coin_transaction_id,
    sink_type, amount_spent, result_status, metadata
  ) values (
    p_user_id, p_tenant_id, p_sink_id, v_tx_result.transaction_id,
    coalesce(v_sink.sink_type, 'custom'), p_amount, 'completed', p_metadata
  ) returning id into v_burn_id;

  -- Update stock if applicable
  if v_sink.id is not null and v_sink.remaining_stock is not null then
    update public.gamification_burn_sinks
      set remaining_stock = remaining_stock - 1,
          updated_at = now()
      where id = p_sink_id
        and remaining_stock > 0;
  end if;

  success := true;
  burn_log_id := v_burn_id;
  coin_transaction_id := v_tx_result.transaction_id;
  new_balance := v_tx_result.balance;
  error_message := null;
  return next;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.calculate_line_item_total()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  NEW.total := NEW.quantity * NEW.unit_price * (1 - COALESCE(NEW.discount_percent, 0) / 100);
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.calculate_next_retry(p_retry_count integer, p_base_delay_seconds integer DEFAULT 60)
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
BEGIN
  -- Exponential backoff: base_delay * 2^retry_count
  RETURN now() + (p_base_delay_seconds * power(2, p_retry_count)) * INTERVAL '1 second';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.calculate_quote_totals()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
  v_subtotal NUMERIC;
  v_tax NUMERIC;
  v_total NUMERIC;
BEGIN
  SELECT COALESCE(SUM(total), 0)
  INTO v_subtotal
  FROM public.quote_line_items
  WHERE quote_id = NEW.quote_id;

  v_tax := v_subtotal * COALESCE(
    (SELECT tax_rate FROM public.quotes WHERE id = NEW.quote_id), 
    0.25
  );
  v_total := v_subtotal + v_tax;

  UPDATE public.quotes
  SET subtotal = v_subtotal,
      tax_amount = v_tax,
      total = v_total,
      updated_at = now()
  WHERE id = NEW.quote_id;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.calculate_quote_totals(p_quote_id uuid)
 RETURNS TABLE(subtotal integer, total_amount integer)
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_subtotal INTEGER;
  v_discount INTEGER;
  v_total INTEGER;
BEGIN
  SELECT COALESCE(SUM(total_price), 0) INTO v_subtotal
  FROM public.quote_line_items
  WHERE quote_id = p_quote_id;
  
  SELECT discount_amount INTO v_discount
  FROM public.quotes
  WHERE id = p_quote_id;
  
  v_total := v_subtotal - COALESCE(v_discount, 0);
  
  RETURN QUERY SELECT v_subtotal, v_total;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.calculate_softcap_reward_v1(p_user_id uuid, p_tenant_id uuid, p_base_coins integer, p_base_xp integer, p_multiplier numeric DEFAULT 1.0)
 RETURNS TABLE(adjusted_coins integer, adjusted_xp integer, effective_multiplier numeric, softcap_applied boolean, coins_reduced integer, xp_reduced integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_config record;
  v_today date := current_date;
  v_current_coins integer;
  v_current_xp integer;
  v_capped_multiplier numeric;
  v_coin_factor numeric;
  v_xp_factor numeric;
  v_raw_coins integer;
  v_raw_xp integer;
  v_final_coins integer;
  v_final_xp integer;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role only';
  end if;

  -- Get softcap config
  select * into v_config from public.get_softcap_config_v1(p_tenant_id) limit 1;
  
  if v_config is null then
    -- No config, return base values with capped multiplier
    v_capped_multiplier := least(p_multiplier, 2.0);
    adjusted_coins := greatest(0, round(p_base_coins * v_capped_multiplier)::integer);
    adjusted_xp := greatest(0, round(p_base_xp * v_capped_multiplier)::integer);
    effective_multiplier := v_capped_multiplier;
    softcap_applied := false;
    coins_reduced := 0;
    xp_reduced := 0;
    return next;
    return;
  end if;

  -- Cap the multiplier
  v_capped_multiplier := least(p_multiplier, v_config.max_multiplier_cap);
  
  -- Calculate raw (pre-softcap) rewards
  v_raw_coins := greatest(0, round(p_base_coins * v_capped_multiplier)::integer);
  v_raw_xp := greatest(0, round(p_base_xp * v_capped_multiplier)::integer);

  -- Get current daily earnings
  select coalesce(de.coins_earned, 0), coalesce(de.xp_earned, 0)
    into v_current_coins, v_current_xp
    from public.gamification_daily_earnings de
    where de.user_id = p_user_id
      and de.tenant_id is not distinct from p_tenant_id
      and de.earning_date = v_today
    limit 1;
  
  v_current_coins := coalesce(v_current_coins, 0);
  v_current_xp := coalesce(v_current_xp, 0);

  -- Calculate diminishing factor for coins
  if v_current_coins >= v_config.daily_coin_threshold then
    -- How many "thresholds" over we are
    v_coin_factor := power(
      v_config.coin_diminishing_factor,
      floor((v_current_coins - v_config.daily_coin_threshold)::numeric / v_config.daily_coin_threshold) + 1
    );
    v_coin_factor := greatest(v_coin_factor, v_config.coin_floor_pct);
  else
    v_coin_factor := 1.0;
  end if;

  -- Calculate diminishing factor for XP
  if v_current_xp >= v_config.daily_xp_threshold then
    v_xp_factor := power(
      v_config.xp_diminishing_factor,
      floor((v_current_xp - v_config.daily_xp_threshold)::numeric / v_config.daily_xp_threshold) + 1
    );
    v_xp_factor := greatest(v_xp_factor, v_config.xp_floor_pct);
  else
    v_xp_factor := 1.0;
  end if;

  -- Apply softcap
  v_final_coins := greatest(1, round(v_raw_coins * v_coin_factor)::integer);
  v_final_xp := greatest(1, round(v_raw_xp * v_xp_factor)::integer);
  
  -- If base was 0, keep it 0
  if p_base_coins = 0 then v_final_coins := 0; end if;
  if p_base_xp = 0 then v_final_xp := 0; end if;

  adjusted_coins := v_final_coins;
  adjusted_xp := v_final_xp;
  effective_multiplier := v_capped_multiplier;
  softcap_applied := (v_coin_factor < 1.0 or v_xp_factor < 1.0);
  coins_reduced := v_raw_coins - v_final_coins;
  xp_reduced := v_raw_xp - v_final_xp;
  
  return next;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.check_cooldown_eligible_v1(p_user_id uuid, p_tenant_id uuid, p_event_type text, p_cooldown_type text, p_streak_id integer DEFAULT NULL::integer)
 RETURNS TABLE(eligible boolean, last_triggered_at timestamp with time zone, trigger_count integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_record public.gamification_cooldowns%rowtype;
  v_now timestamptz := now();
  v_cutoff timestamptz;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role only';
  end if;

  -- Find existing cooldown record
  select * into v_record
    from public.gamification_cooldowns gc
    where gc.user_id = p_user_id
      and gc.tenant_id is not distinct from p_tenant_id
      and gc.event_type = p_event_type
      and gc.cooldown_type = p_cooldown_type
      and (p_cooldown_type <> 'once_per_streak' or gc.streak_id is not distinct from p_streak_id)
    limit 1;

  if v_record.id is null then
    -- No record = eligible
    eligible := true;
    last_triggered_at := null;
    trigger_count := 0;
    return next;
    return;
  end if;

  last_triggered_at := v_record.last_triggered_at;
  trigger_count := v_record.trigger_count;

  case p_cooldown_type
    when 'once' then
      -- Once means never again
      eligible := false;
    when 'once_per_streak' then
      -- Once per streak period (handled by streak_id)
      eligible := false;
    when 'daily' then
      -- Eligible if last trigger was before today (UTC)
      v_cutoff := date_trunc('day', v_now);
      eligible := v_record.last_triggered_at < v_cutoff;
    when 'weekly' then
      -- Eligible if last trigger was before this week (Monday start)
      v_cutoff := date_trunc('week', v_now);
      eligible := v_record.last_triggered_at < v_cutoff;
    else
      eligible := true;
  end case;

  return next;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.check_gdpr_deadlines()
 RETURNS TABLE(request_id uuid, user_id uuid, request_type text, days_remaining integer, is_overdue boolean)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT 
    id as request_id,
    user_id,
    request_type,
    EXTRACT(DAY FROM (response_deadline - now()))::int as days_remaining,
    now() > response_deadline as is_overdue
  FROM public.gdpr_requests
  WHERE status IN ('pending', 'in_progress')
  ORDER BY response_deadline ASC;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_demo_users()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_run_id uuid;
  v_start_time timestamptz;
  v_result jsonb;
  v_deleted_users int := 0;
  v_deleted_sessions int := 0;
  v_deleted_game_sessions int := 0;
  v_expiry_threshold timestamptz;
  v_user_ids uuid[];
BEGIN
  v_start_time := clock_timestamp();
  
  -- Skapa kÃ¶rningspost
  INSERT INTO public.scheduled_job_runs (job_name, status, started_at)
  VALUES ('cleanup_demo_users', 'running', v_start_time)
  RETURNING id INTO v_run_id;
  
  -- 24 timmar sedan
  v_expiry_threshold := now() - interval '24 hours';
  
  BEGIN
    -- Hitta alla ephemeral users Ã¤ldre Ã¤n 24h
    SELECT array_agg(id) INTO v_user_ids
    FROM public.users
    WHERE is_ephemeral = true
      AND created_at < v_expiry_threshold;
    
    -- Ta bort game_sessions fÃ¶r dessa anvÃ¤ndare
    -- FIX: Use user_id instead of player_id
    IF v_user_ids IS NOT NULL AND array_length(v_user_ids, 1) > 0 THEN
      DELETE FROM public.game_sessions
      WHERE user_id = ANY(v_user_ids);
      GET DIAGNOSTICS v_deleted_game_sessions = ROW_COUNT;
    END IF;
    
    -- Ta bort demo_sessions Ã¤ldre Ã¤n 24h
    DELETE FROM public.demo_sessions
    WHERE created_at < v_expiry_threshold;
    GET DIAGNOSTICS v_deleted_sessions = ROW_COUNT;
    
    -- Ta bort ephemeral users Ã¤ldre Ã¤n 24h
    DELETE FROM public.users
    WHERE is_ephemeral = true
      AND created_at < v_expiry_threshold;
    GET DIAGNOSTICS v_deleted_users = ROW_COUNT;
    
    v_result := jsonb_build_object(
      'success', true,
      'deleted_users', v_deleted_users,
      'deleted_sessions', v_deleted_sessions,
      'deleted_game_sessions', v_deleted_game_sessions,
      'expiry_threshold', v_expiry_threshold
    );
    
    -- Uppdatera kÃ¶rningspost
    UPDATE public.scheduled_job_runs
    SET status = 'success',
        result = v_result,
        completed_at = clock_timestamp(),
        duration_ms = EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::int
    WHERE id = v_run_id;
    
  EXCEPTION WHEN OTHERS THEN
    -- Logga fel
    UPDATE public.scheduled_job_runs
    SET status = 'error',
        error_message = SQLERRM,
        completed_at = clock_timestamp(),
        duration_ms = EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::int
    WHERE id = v_run_id;
    
    v_result := jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
  END;
  
  -- Rensa gamla kÃ¶rningsposter (behÃ¥ll 7 dagar)
  DELETE FROM public.scheduled_job_runs
  WHERE started_at < now() - interval '7 days';
  
  RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_trigger_idempotency_keys()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  DELETE FROM public.trigger_idempotency_keys
  WHERE created_at < now() - INTERVAL '24 hours';
  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_trigger_idempotency_keys(p_older_than_hours integer DEFAULT 24)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM public.session_trigger_idempotency
  WHERE created_at < now() - (p_older_than_hours || ' hours')::INTERVAL;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.consume_powerup_v1(p_user_id uuid, p_tenant_id uuid, p_shop_item_id uuid, p_idempotency_key text)
 RETURNS TABLE(remaining_quantity integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_now timestamptz := now();
  v_lock_key bigint;
  v_existing_id uuid;
  v_category text;
  v_base_category text;
  v_qty integer;
begin
  if p_user_id is null then
    raise exception 'p_user_id is required';
  end if;
  if p_tenant_id is null then
    raise exception 'p_tenant_id is required';
  end if;
  if p_shop_item_id is null then
    raise exception 'p_shop_item_id is required';
  end if;
  if p_idempotency_key is null or length(trim(p_idempotency_key)) = 0 then
    raise exception 'p_idempotency_key is required';
  end if;

  v_lock_key := hashtextextended(p_user_id::text || ':' || p_tenant_id::text || ':' || p_idempotency_key, 0);
  perform pg_advisory_xact_lock(v_lock_key);

  select upc.id
    into v_existing_id
    from public.user_powerup_consumptions upc
    where upc.tenant_id = p_tenant_id
      and upc.user_id = p_user_id
      and upc.idempotency_key = p_idempotency_key
    limit 1;

  if v_existing_id is not null then
    select coalesce(upi.quantity, 0)
      into v_qty
      from public.user_powerup_inventory upi
      where upi.tenant_id = p_tenant_id
        and upi.user_id = p_user_id
        and upi.shop_item_id = p_shop_item_id
      limit 1;

    remaining_quantity := coalesce(v_qty, 0);
    return next;
    return;
  end if;

  select si.category
    into v_category
    from public.shop_items si
    where si.id = p_shop_item_id
      and si.tenant_id = p_tenant_id
    limit 1;

  v_base_category := nullif(split_part(coalesce(v_category, ''), ':', 1), '');
  if v_base_category is null then
    v_base_category := v_category;
  end if;

  if v_base_category is distinct from 'powerup' then
    raise exception 'item is not a powerup';
  end if;

  select coalesce(upi.quantity, 0)
    into v_qty
    from public.user_powerup_inventory upi
    where upi.tenant_id = p_tenant_id
      and upi.user_id = p_user_id
      and upi.shop_item_id = p_shop_item_id
    limit 1;

  if coalesce(v_qty, 0) <= 0 then
    raise exception 'no remaining quantity';
  end if;

  update public.user_powerup_inventory
    set quantity = quantity - 1,
        updated_at = v_now
    where tenant_id = p_tenant_id
      and user_id = p_user_id
      and shop_item_id = p_shop_item_id;

  insert into public.user_powerup_consumptions(
    tenant_id,
    user_id,
    shop_item_id,
    idempotency_key,
    created_at
  ) values (
    p_tenant_id,
    p_user_id,
    p_shop_item_id,
    p_idempotency_key,
    v_now
  );

  select coalesce(upi.quantity, 0)
    into remaining_quantity
    from public.user_powerup_inventory upi
    where upi.tenant_id = p_tenant_id
      and upi.user_id = p_user_id
      and upi.shop_item_id = p_shop_item_id
    limit 1;

  return next;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.create_game_snapshot(p_game_id uuid, p_version_label text DEFAULT NULL::text, p_created_by uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_snapshot_id UUID;
  v_next_version INTEGER;
  v_snapshot JSONB;
  v_game RECORD;
  v_steps JSONB;
  v_phases JSONB;
  v_roles JSONB;
  v_artifacts JSONB;
  v_triggers JSONB;
  v_board_config JSONB;
  v_has_phases BOOLEAN := false;
  v_has_roles BOOLEAN := false;
  v_has_artifacts BOOLEAN := false;
  v_has_triggers BOOLEAN := false;
  v_has_board BOOLEAN := false;
BEGIN
  -- Get next version number
  SELECT COALESCE(MAX(version), 0) + 1 INTO v_next_version
  FROM public.game_snapshots
  WHERE game_id = p_game_id;
  
  -- Get base game data
  SELECT 
    id, game_key, name, short_description, description,
    play_mode, status, locale,
    energy_level, location_type, time_estimate_min, duration_max,
    min_players, max_players, players_recommended,
    age_min, age_max, difficulty,
    accessibility_notes, space_requirements, leader_tips,
    main_purpose_id, product_id, owner_tenant_id,
    cover_media_id
  INTO v_game
  FROM public.games
  WHERE id = p_game_id;
  
  IF v_game IS NULL THEN
    RAISE EXCEPTION 'Game not found: %', p_game_id;
  END IF;
  
  -- Get steps
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'step_order', step_order,
      'title', title,
      'body', body,
      'duration_seconds', duration_seconds,
      'leader_script', leader_script,
      'participant_prompt', participant_prompt,
      'board_text', board_text,
      'optional', optional
    ) ORDER BY step_order
  ), '[]'::jsonb) INTO v_steps
  FROM public.game_steps
  WHERE game_id = p_game_id;
  
  -- Get phases
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'phase_order', phase_order,
      'name', name,
      'phase_type', phase_type,
      'duration_seconds', duration_seconds,
      'timer_visible', timer_visible,
      'timer_style', timer_style,
      'description', description,
      'board_message', board_message,
      'auto_advance', auto_advance
    ) ORDER BY phase_order
  ), '[]'::jsonb) INTO v_phases
  FROM public.game_phases
  WHERE game_id = p_game_id;
  
  v_has_phases := jsonb_array_length(v_phases) > 0;
  
  -- Get roles
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'role_order', role_order,
      'name', name,
      'icon', icon,
      'color', color,
      'public_description', public_description,
      'private_instructions', private_instructions,
      'private_hints', private_hints,
      'min_count', min_count,
      'max_count', max_count,
      'assignment_strategy', assignment_strategy,
      'scaling_rules', scaling_rules,
      'conflicts_with', conflicts_with
    ) ORDER BY role_order
  ), '[]'::jsonb) INTO v_roles
  FROM public.game_roles
  WHERE game_id = p_game_id;
  
  v_has_roles := jsonb_array_length(v_roles) > 0;
  
  -- Get artifacts (if table exists)
  BEGIN
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'artifact_order', artifact_order,
        'title', title,
        'description', description,
        'artifact_type', artifact_type,
        'locale', locale,
        'tags', tags,
        'metadata', metadata
      ) ORDER BY artifact_order
    ), '[]'::jsonb) INTO v_artifacts
    FROM public.game_artifacts
    WHERE game_id = p_game_id;
    
    v_has_artifacts := jsonb_array_length(v_artifacts) > 0;
  EXCEPTION WHEN undefined_table THEN
    v_artifacts := '[]'::jsonb;
  END;
  
  -- Get triggers (if table exists)
  BEGIN
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'sort_order', sort_order,
        'name', name,
        'description', description,
        'enabled', enabled,
        'condition_type', condition_type,
        'condition_config', condition_config,
        'actions', actions,
        'execute_once', execute_once,
        'delay_seconds', delay_seconds
      ) ORDER BY sort_order
    ), '[]'::jsonb) INTO v_triggers
    FROM public.game_triggers
    WHERE game_id = p_game_id;
    
    v_has_triggers := jsonb_array_length(v_triggers) > 0;
  EXCEPTION WHEN undefined_table THEN
    v_triggers := '[]'::jsonb;
  END;
  
  -- Get board config (if table exists)
  BEGIN
    SELECT jsonb_build_object(
      'show_game_name', show_game_name,
      'show_current_phase', show_current_phase,
      'show_timer', show_timer,
      'show_participants', show_participants,
      'show_public_roles', show_public_roles,
      'show_leaderboard', show_leaderboard,
      'show_qr_code', show_qr_code,
      'welcome_message', welcome_message,
      'theme', theme,
      'background_color', background_color,
      'layout_variant', layout_variant
    ) INTO v_board_config
    FROM public.board_configs
    WHERE game_id = p_game_id
    LIMIT 1;
    
    v_has_board := v_board_config IS NOT NULL;
  EXCEPTION WHEN undefined_table THEN
    v_board_config := NULL;
  END;
  
  -- Build complete snapshot
  v_snapshot := jsonb_build_object(
    'game', jsonb_build_object(
      'id', v_game.id,
      'game_key', v_game.game_key,
      'name', v_game.name,
      'short_description', v_game.short_description,
      'description', v_game.description,
      'play_mode', v_game.play_mode,
      'status', v_game.status,
      'locale', v_game.locale,
      'energy_level', v_game.energy_level,
      'location_type', v_game.location_type,
      'time_estimate_min', v_game.time_estimate_min,
      'duration_max', v_game.duration_max,
      'min_players', v_game.min_players,
      'max_players', v_game.max_players,
      'players_recommended', v_game.players_recommended,
      'age_min', v_game.age_min,
      'age_max', v_game.age_max,
      'difficulty', v_game.difficulty,
      'accessibility_notes', v_game.accessibility_notes,
      'space_requirements', v_game.space_requirements,
      'leader_tips', v_game.leader_tips,
      'main_purpose_id', v_game.main_purpose_id,
      'product_id', v_game.product_id,
      'owner_tenant_id', v_game.owner_tenant_id,
      'cover_media_id', v_game.cover_media_id
    ),
    'steps', v_steps,
    'phases', v_phases,
    'roles', v_roles,
    'artifacts', v_artifacts,
    'triggers', v_triggers,
    'board_config', v_board_config,
    'snapshot_meta', jsonb_build_object(
      'created_at', now(),
      'game_id', p_game_id,
      'version', v_next_version
    )
  );
  
  -- Insert snapshot
  INSERT INTO public.game_snapshots (
    game_id,
    version,
    version_label,
    snapshot_data,
    includes_steps,
    includes_phases,
    includes_roles,
    includes_artifacts,
    includes_triggers,
    includes_board_config,
    checksum,
    created_by
  ) VALUES (
    p_game_id,
    v_next_version,
    p_version_label,
    v_snapshot,
    true,
    v_has_phases,
    v_has_roles,
    v_has_artifacts,
    v_has_triggers,
    v_has_board,
    md5(v_snapshot::text),
    p_created_by
  )
  RETURNING id INTO v_snapshot_id;
  
  RETURN v_snapshot_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_gamification_campaign_from_template_v1(p_tenant_id uuid, p_template_id uuid, p_starts_at timestamp with time zone DEFAULT now(), p_actor_user_id uuid DEFAULT NULL::uuid, p_idempotency_key text DEFAULT NULL::text)
 RETURNS TABLE(campaign_id uuid, created boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_template public.gamification_campaign_templates%rowtype;
  v_campaign_id uuid;
  v_idempotency_key text;
  v_lock_key bigint;
  v_ends_at timestamptz;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role only';
  end if;

  if p_tenant_id is null then raise exception 'p_tenant_id is required'; end if;
  if p_template_id is null then raise exception 'p_template_id is required'; end if;
  if p_starts_at is null then raise exception 'p_starts_at is required'; end if;

  v_idempotency_key := nullif(trim(p_idempotency_key), '');
  if v_idempotency_key is null then
    v_idempotency_key := 'campaign_template:' || p_template_id::text || ':' || extract(epoch from p_starts_at)::bigint::text;
  end if;

  v_lock_key := hashtextextended(p_tenant_id::text || ':' || v_idempotency_key, 0);
  perform pg_advisory_xact_lock(v_lock_key);

  select gc.id
    into v_campaign_id
    from public.gamification_campaigns gc
    where gc.tenant_id = p_tenant_id
      and gc.idempotency_key = v_idempotency_key
    limit 1;

  if v_campaign_id is not null then
    campaign_id := v_campaign_id;
    created := false;
    return next;
    return;
  end if;

  select *
    into v_template
    from public.gamification_campaign_templates t
    where t.id = p_template_id
    limit 1;

  if v_template.id is null then
    raise exception 'template not found';
  end if;

  v_ends_at := p_starts_at + make_interval(days => v_template.duration_days);

  insert into public.gamification_campaigns(
    tenant_id,
    name,
    event_type,
    bonus_amount,
    starts_at,
    ends_at,
    is_active,
    budget_amount,
    created_by_user_id,
    source_template_id,
    idempotency_key
  )
  values (
    p_tenant_id,
    v_template.name,
    v_template.event_type,
    v_template.bonus_amount,
    p_starts_at,
    v_ends_at,
    v_template.is_active_default,
    v_template.budget_amount,
    p_actor_user_id,
    v_template.id,
    v_idempotency_key
  )
  returning id into v_campaign_id;

  campaign_id := v_campaign_id;
  created := true;
  return next;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.create_session_with_snapshot(p_game_id uuid, p_host_user_id uuid, p_join_code text DEFAULT NULL::text, p_settings jsonb DEFAULT '{}'::jsonb)
 RETURNS TABLE(session_id uuid, snapshot_id uuid, join_code text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_session_id UUID;
  v_snapshot_id UUID;
  v_join_code TEXT;
BEGIN
  -- Create or get latest snapshot
  v_snapshot_id := public.get_latest_game_snapshot(p_game_id);
  
  IF v_snapshot_id IS NULL THEN
    -- No snapshot exists, create one
    v_snapshot_id := public.create_game_snapshot(p_game_id, NULL, p_host_user_id);
  END IF;
  
  -- Generate join code if not provided
  v_join_code := COALESCE(p_join_code, upper(substr(md5(random()::text), 1, 6)));
  
  -- Create session
  INSERT INTO public.participant_sessions (
    game_id,
    game_snapshot_id,
    host_user_id,
    join_code,
    settings,
    status
  ) VALUES (
    p_game_id,
    v_snapshot_id,
    p_host_user_id,
    v_join_code,
    p_settings,
    'pending'
  )
  RETURNING id INTO v_session_id;
  
  RETURN QUERY SELECT v_session_id, v_snapshot_id, v_join_code;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.disable_all_triggers_v2(p_session_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE session_trigger_state
  SET status = 'disabled', enabled = FALSE, updated_at = now()
  WHERE session_id = p_session_id AND status = 'armed';
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.disable_trigger_v2(p_session_id uuid, p_game_trigger_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  INSERT INTO session_trigger_state (session_id, game_trigger_id, status, enabled)
  VALUES (p_session_id, p_game_trigger_id, 'disabled', FALSE)
  ON CONFLICT (session_id, game_trigger_id)
  DO UPDATE SET
    status = 'disabled',
    enabled = FALSE,
    updated_at = now();
  
  RETURN TRUE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.dismiss_notification(p_delivery_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  UPDATE notification_deliveries
  SET dismissed_at = now()
  WHERE id = p_delivery_id
    AND user_id = auth.uid()
    AND dismissed_at IS NULL;
  RETURN FOUND;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.enforce_demo_flag_protection()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  -- Allow system admins to change anything
  IF public.is_system_admin_jwt_only() THEN
    RETURN NEW;
  END IF;

  -- Prevent non-admins from changing is_demo_user
  IF OLD.is_demo_user IS DISTINCT FROM NEW.is_demo_user THEN
    RAISE EXCEPTION 'Cannot modify is_demo_user flag'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Prevent non-admins from changing is_ephemeral
  IF OLD.is_ephemeral IS DISTINCT FROM NEW.is_ephemeral THEN
    RAISE EXCEPTION 'Cannot modify is_ephemeral flag'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.escalate_overdue_tickets()
 RETURNS TABLE(ticket_id uuid, old_priority text, new_priority text, old_escalation_level integer, new_escalation_level integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH escalated AS (
    UPDATE support_tickets
    SET 
      -- Escalate priority: low -> medium -> high -> urgent
      priority = CASE 
        WHEN priority = 'low' THEN 'medium'::public.ticket_priority_enum
        WHEN priority = 'medium' THEN 'high'::public.ticket_priority_enum
        WHEN priority = 'high' THEN 'urgent'::public.ticket_priority_enum
        ELSE priority
      END,
      escalation_level = escalation_level + 1,
      last_escalated_at = now(),
      sla_breached = true,
      updated_at = now()
    WHERE 
      sla_deadline IS NOT NULL
      AND sla_deadline < now()
      AND status IN ('open', 'in_progress', 'waiting_for_user')
      AND priority != 'urgent'  -- Don't escalate already urgent
      -- Prevent re-escalation within 1 hour
      AND (last_escalated_at IS NULL OR last_escalated_at < now() - interval '1 hour')
    RETURNING 
      id,
      CASE 
        WHEN escalation_level = 1 THEN 'low'
        WHEN escalation_level = 2 THEN 'medium'
        WHEN escalation_level = 3 THEN 'high'
        ELSE 'low'
      END as old_priority_text,
      priority::text as new_priority_text,
      escalation_level - 1 as old_level,
      escalation_level as new_level
  )
  SELECT 
    e.id,
    e.old_priority_text,
    e.new_priority_text,
    e.old_level,
    e.new_level
  FROM escalated e;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.expand_bundle_entitlements(p_purchase_intent_id uuid, p_tenant_id uuid, p_bundle_product_id uuid, p_base_quantity integer DEFAULT 1, p_expires_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS TABLE(child_product_id uuid, quantity_granted integer, entitlement_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_item RECORD;
  v_entitlement_id uuid;
  v_child_expires_at timestamptz;
BEGIN
  -- Loop through all bundle items
  FOR v_item IN
    SELECT 
      bi.child_product_id,
      bi.quantity,
      bi.duration_days
    FROM public.bundle_items bi
    WHERE bi.bundle_product_id = p_bundle_product_id
    ORDER BY bi.display_order
  LOOP
    -- Calculate expiration for this child
    v_child_expires_at := CASE
      WHEN v_item.duration_days IS NOT NULL THEN now() + (v_item.duration_days || ' days')::interval
      ELSE p_expires_at
    END;
    
    -- Insert or update entitlement for child product
    INSERT INTO public.tenant_product_entitlements (
      tenant_id,
      product_id,
      purchase_intent_id,
      quantity,
      status,
      valid_from,
      valid_until
    )
    VALUES (
      p_tenant_id,
      v_item.child_product_id,
      p_purchase_intent_id,
      v_item.quantity * p_base_quantity,
      'active',
      now(),
      v_child_expires_at
    )
    ON CONFLICT (tenant_id, product_id) DO UPDATE SET
      quantity = EXCLUDED.quantity,
      status = 'active',
      valid_until = EXCLUDED.valid_until,
      updated_at = now()
    RETURNING id INTO v_entitlement_id;
    
    -- Return result
    child_product_id := v_item.child_product_id;
    quantity_granted := v_item.quantity * p_base_quantity;
    entitlement_id := v_entitlement_id;
    RETURN NEXT;
  END LOOP;
  
  RETURN;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fire_trigger_v2(p_session_id uuid, p_game_trigger_id uuid)
 RETURNS TABLE(success boolean, new_status text, fired_count integer, fired_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_state session_trigger_state%ROWTYPE;
BEGIN
  -- Upsert and update atomically
  INSERT INTO session_trigger_state (session_id, game_trigger_id, status, fired_count, fired_at)
  VALUES (p_session_id, p_game_trigger_id, 'fired', 1, now())
  ON CONFLICT (session_id, game_trigger_id)
  DO UPDATE SET
    status = 'fired',
    fired_count = session_trigger_state.fired_count + 1,
    fired_at = now(),
    updated_at = now()
  RETURNING * INTO v_state;
  
  RETURN QUERY SELECT 
    TRUE,
    v_state.status,
    v_state.fired_count,
    v_state.fired_at;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fire_trigger_v2_safe(p_session_id uuid, p_game_trigger_id uuid, p_idempotency_key text, p_actor_user_id uuid)
 RETURNS TABLE(ok boolean, status text, reason text, replay boolean, fired_count integer, fired_at timestamp with time zone, original_fired_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_execute_once BOOLEAN;
  v_trigger_name TEXT;
  v_idempotency_inserted BOOLEAN := FALSE;
  v_current_state RECORD;
  v_result_status TEXT;
  v_result_reason TEXT;
  v_result_replay BOOLEAN := FALSE;
  v_result_fired_count INTEGER;
  v_result_fired_at TIMESTAMPTZ;
  v_original_fired_at TIMESTAMPTZ;
  v_did_fire BOOLEAN := FALSE;
BEGIN
  -- ==========================================================================
  -- Step 1: Get trigger config (execute_once)
  -- ==========================================================================
  SELECT gt.execute_once, gt.name
  INTO v_execute_once, v_trigger_name
  FROM public.game_triggers gt
  WHERE gt.id = p_game_trigger_id;
  
  IF NOT FOUND THEN
    -- Trigger doesn't exist - return error (route should have caught this)
    RETURN QUERY SELECT 
      FALSE::BOOLEAN,
      'error'::TEXT,
      'TRIGGER_NOT_FOUND'::TEXT,
      FALSE::BOOLEAN,
      0::INTEGER,
      NULL::TIMESTAMPTZ,
      NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  -- ==========================================================================
  -- Step 2: Idempotency check (INSERT ... ON CONFLICT DO NOTHING)
  -- ==========================================================================
  INSERT INTO public.session_trigger_idempotency (session_id, game_trigger_id, idempotency_key)
  VALUES (p_session_id, p_game_trigger_id, p_idempotency_key)
  ON CONFLICT (session_id, game_trigger_id, idempotency_key) DO NOTHING;
  
  -- Check if we inserted (new request) or conflict (replay)
  GET DIAGNOSTICS v_idempotency_inserted = ROW_COUNT;
  
  IF NOT v_idempotency_inserted OR v_idempotency_inserted IS NULL THEN
    -- This is a replay - get current state and return noop
    SELECT sts.fired_count, sts.fired_at
    INTO v_result_fired_count, v_original_fired_at
    FROM public.session_trigger_state sts
    WHERE sts.session_id = p_session_id 
      AND sts.game_trigger_id = p_game_trigger_id;
    
    v_result_status := 'noop';
    v_result_reason := 'IDEMPOTENCY_REPLAY';
    v_result_replay := TRUE;
    v_result_fired_at := v_original_fired_at;
    v_result_fired_count := COALESCE(v_result_fired_count, 0);
    
    -- Log the replay attempt
    PERFORM public.log_session_event(
      p_session_id := p_session_id,
      p_event_type := 'trigger_fire',
      p_event_category := 'trigger',
      p_actor_type := 'host',
      p_actor_id := p_actor_user_id,
      p_target_type := 'trigger',
      p_target_id := p_game_trigger_id::TEXT,
      p_target_name := v_trigger_name,
      p_payload := jsonb_build_object(
        'result', 'noop_replay',
        'idempotency_key', p_idempotency_key,
        'fired_count', v_result_fired_count
      ),
      p_severity := 'info'
    );
    
    RETURN QUERY SELECT 
      TRUE::BOOLEAN,
      v_result_status,
      v_result_reason,
      v_result_replay,
      v_result_fired_count,
      v_result_fired_at,
      v_original_fired_at;
    RETURN;
  END IF;

  -- ==========================================================================
  -- Step 3: Atomic fire with execute_once guard
  -- ==========================================================================
  -- Use INSERT ... ON CONFLICT DO UPDATE with CASE to handle execute_once
  
  INSERT INTO public.session_trigger_state (
    session_id, 
    game_trigger_id, 
    status, 
    fired_count, 
    fired_at,
    enabled
  )
  VALUES (
    p_session_id, 
    p_game_trigger_id, 
    'fired', 
    1, 
    now(),
    TRUE
  )
  ON CONFLICT (session_id, game_trigger_id)
  DO UPDATE SET
    status = 'fired',
    fired_count = CASE 
      WHEN v_execute_once AND session_trigger_state.fired_count > 0 
      THEN session_trigger_state.fired_count  -- noop: don't increment
      ELSE session_trigger_state.fired_count + 1  -- normal: increment
    END,
    fired_at = CASE 
      WHEN v_execute_once AND session_trigger_state.fired_count > 0 
      THEN session_trigger_state.fired_at  -- noop: keep original
      ELSE now()  -- normal: update
    END,
    updated_at = now()
  RETURNING 
    session_trigger_state.fired_count,
    session_trigger_state.fired_at
  INTO v_result_fired_count, v_result_fired_at;

  -- ==========================================================================
  -- Step 4: Determine result based on state
  -- ==========================================================================
  -- If execute_once and fired_count was already > 0 before our update,
  -- the fired_count won't have changed (still same value due to CASE)
  -- We detect this by checking if fired_count > 1 for execute_once triggers
  
  IF v_execute_once AND v_result_fired_count > 1 THEN
    -- This shouldn't happen due to our CASE, but handle edge case
    v_result_status := 'noop';
    v_result_reason := 'EXECUTE_ONCE_ALREADY_FIRED';
    v_did_fire := FALSE;
  ELSIF v_execute_once AND v_result_fired_count = 1 THEN
    -- First fire of execute_once trigger
    v_result_status := 'fired';
    v_result_reason := NULL;
    v_did_fire := TRUE;
  ELSIF NOT v_execute_once THEN
    -- Normal trigger, always fires
    v_result_status := 'fired';
    v_result_reason := NULL;
    v_did_fire := TRUE;
  ELSE
    -- execute_once already fired - need to detect this case
    -- Check if we were the ones who set fired_count to current value
    -- by looking at whether an idempotency record already existed
    -- (we already checked this above, so if we're here, we did fire)
    v_result_status := 'fired';
    v_result_reason := NULL;
    v_did_fire := TRUE;
  END IF;

  -- Handle execute_once case where trigger was already fired before this request
  -- We need to check the state BEFORE our upsert to know if we should noop
  -- The CASE in the upsert handles not incrementing, but we need to detect it here
  
  -- Re-check: if execute_once and there was already a state record with fired_count > 0
  -- before our INSERT (meaning ON CONFLICT triggered), and the CASE didn't increment,
  -- then we need to return noop
  
  -- Actually, the logic above needs refinement. Let's query the pre-state:
  -- We can't easily know pre-state after upsert. Better approach:
  -- Check if fired_count after upsert equals what we would have set for first fire (1)
  -- vs what it would be if already fired (unchanged or +1 depending on execute_once)
  
  -- Simplified: For execute_once, if fired_count > 1 after our upsert, it was already fired
  -- For non-execute_once, we always fire
  
  -- Actually even simpler: track whether the ON CONFLICT DO UPDATE was triggered
  -- and if execute_once was true AND old.fired_count > 0
  
  -- Let's use a different approach: check if this is a new row or update
  -- by seeing if fired_at equals what we just set (now()) within a small window
  -- This is fragile. Better: use a CTE approach or separate check.
  
  -- FINAL APPROACH: After the upsert, if execute_once and fired_count > 1,
  -- we know it was already fired. If fired_count = 1, it's first fire.
  -- For non-execute_once, it's always a successful fire.
  
  -- The issue: our CASE prevents increment for execute_once when already fired,
  -- so fired_count stays at 1 (or whatever it was), not incrementing.
  -- We need to distinguish: first fire (we just set it to 1) vs repeat (it was already 1+)
  
  -- Solution: Use a subquery/CTE to get old value. But we already did the upsert.
  -- Pragmatic solution: After upsert, if execute_once, check if our fired_at
  -- is very recent (< 1 second old). If not, it's a noop.
  
  -- BETTER SOLUTION: Query the state first, then do conditional upsert
  -- Let's refactor...
  
  -- Actually, let me re-read the CASE logic:
  -- If execute_once AND fired_count > 0 BEFORE update: don't change fired_count or fired_at
  -- So after upsert:
  -- - If fired_count = 1 and fired_at = now(): first fire
  -- - If fired_count >= 1 and fired_at < now() - interval '1 second': was already fired (noop)
  
  -- Check if this was actually a noop for execute_once
  IF v_execute_once AND v_result_fired_at < now() - interval '1 second' THEN
    v_result_status := 'noop';
    v_result_reason := 'EXECUTE_ONCE_ALREADY_FIRED';
    v_did_fire := FALSE;
    v_original_fired_at := v_result_fired_at;
  END IF;

  -- ==========================================================================
  -- Step 5: Log the fire attempt
  -- ==========================================================================
  PERFORM public.log_session_event(
    p_session_id := p_session_id,
    p_event_type := 'trigger_fire',
    p_event_category := 'trigger',
    p_actor_type := 'host',
    p_actor_id := p_actor_user_id,
    p_target_type := 'trigger',
    p_target_id := p_game_trigger_id::TEXT,
    p_target_name := v_trigger_name,
    p_payload := jsonb_build_object(
      'result', CASE 
        WHEN v_did_fire THEN 'fired' 
        ELSE 'noop_execute_once' 
      END,
      'idempotency_key', p_idempotency_key,
      'fired_count', v_result_fired_count,
      'execute_once', v_execute_once
    ),
    p_severity := 'info'
  );

  -- ==========================================================================
  -- Step 6: Return result
  -- ==========================================================================
  RETURN QUERY SELECT 
    TRUE::BOOLEAN,
    v_result_status,
    v_result_reason,
    v_result_replay,
    v_result_fired_count,
    v_result_fired_at,
    v_original_fired_at;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.game_reactions_set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_gift_code()
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..12 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
    IF i IN (4, 8) THEN
      result := result || '-';
    END IF;
  END LOOP;
  RETURN result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_notification_deliveries(p_notification_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_notification RECORD;
  v_count INTEGER := 0;
BEGIN
  -- Get notification details
  SELECT * INTO v_notification
  FROM public.notifications
  WHERE id = p_notification_id
    AND status = 'scheduled';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Notification not found or not in scheduled status';
  END IF;
  
  -- Generate deliveries based on scope
  IF v_notification.scope = 'all' THEN
    -- All users
    INSERT INTO notification_deliveries (notification_id, user_id, delivered_at)
    SELECT p_notification_id, u.id, now()
    FROM auth.users u
    ON CONFLICT (notification_id, user_id) DO NOTHING;
  ELSIF v_notification.scope = 'tenant' THEN
    -- Users in specific tenant
    INSERT INTO notification_deliveries (notification_id, user_id, delivered_at)
    SELECT p_notification_id, utm.user_id, now()
    FROM public.user_tenant_memberships utm
    WHERE utm.tenant_id = v_notification.tenant_id
    ON CONFLICT (notification_id, user_id) DO NOTHING;
  END IF;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  -- Update notification status to sent
  UPDATE notifications
  SET status = 'sent', sent_at = now()
  WHERE id = p_notification_id;
  
  RETURN v_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_quote_number()
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
  v_year TEXT;
  v_seq INTEGER;
BEGIN
  v_year := to_char(now(), 'YYYY');
  
  SELECT COALESCE(MAX(
    NULLIF(regexp_replace(quote_number, '^Q' || v_year || '-', ''), '')::INTEGER
  ), 0) + 1
  INTO v_seq
  FROM public.quotes
  WHERE quote_number LIKE 'Q' || v_year || '-%';

  RETURN 'Q' || v_year || '-' || lpad(v_seq::TEXT, 5, '0');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_active_coin_multiplier_v1(p_user_id uuid, p_tenant_id uuid, p_at timestamp with time zone)
 RETURNS TABLE(multiplier numeric, effect_id uuid)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  select
    upe.multiplier as multiplier,
    upe.id as effect_id
  from public.user_powerup_effects upe
  where upe.user_id = p_user_id
    and upe.tenant_id = p_tenant_id
    and upe.effect_type = 'coin_multiplier'
    and upe.starts_at <= p_at
    and upe.expires_at > p_at
  order by upe.multiplier desc
  limit 1;
$function$
;

CREATE OR REPLACE FUNCTION public.get_current_demo_session_id()
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_session_id UUID;
BEGIN
  -- Get most recent non-expired demo session for current user
  SELECT id INTO v_session_id
  FROM public.demo_sessions
  WHERE user_id = auth.uid()
    AND expires_at > now()
    AND ended_at IS NULL
  ORDER BY started_at DESC
  LIMIT 1;

  RETURN v_session_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_effective_design(p_tenant_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_system_config jsonb;
  v_tenant_overrides jsonb;
  v_branding_enabled boolean;
  v_result jsonb;
BEGIN
  -- Get system config
  SELECT jsonb_build_object(
    'brand', brand,
    'media', media,
    'typography', typography,
    'tokens', tokens
  ) INTO v_system_config
  FROM public.system_design_config
  LIMIT 1;
  
  IF v_system_config IS NULL THEN
    v_system_config := '{}'::jsonb;
  END IF;
  
  -- If no tenant specified, return system config
  IF p_tenant_id IS NULL THEN
    RETURN v_system_config;
  END IF;
  
  -- Check if tenant has branding enabled
  SELECT tenant_branding_enabled INTO v_branding_enabled
  FROM public.tenants
  WHERE id = p_tenant_id;
  
  IF NOT COALESCE(v_branding_enabled, false) THEN
    RETURN v_system_config;
  END IF;
  
  -- Get tenant overrides
  SELECT overrides INTO v_tenant_overrides
  FROM public.tenant_design_config
  WHERE tenant_id = p_tenant_id;
  
  IF v_tenant_overrides IS NULL OR v_tenant_overrides = '{}'::jsonb THEN
    RETURN v_system_config;
  END IF;
  
  -- Merge: tenant overrides take precedence (shallow merge per category)
  v_result := jsonb_build_object(
    'brand', COALESCE(v_tenant_overrides->'brand', '{}'::jsonb) || COALESCE(v_system_config->'brand', '{}'::jsonb),
    'media', COALESCE(v_tenant_overrides->'media', '{}'::jsonb) || COALESCE(v_system_config->'media', '{}'::jsonb),
    'typography', v_system_config->'typography', -- Typography NOT overridable by tenant
    'tokens', v_system_config->'tokens' -- Tokens NOT overridable by tenant
  );
  
  -- Actually we want tenant to override, so reverse the merge order for brand/media
  v_result := jsonb_build_object(
    'brand', COALESCE(v_system_config->'brand', '{}'::jsonb) || COALESCE(v_tenant_overrides->'brand', '{}'::jsonb),
    'media', COALESCE(v_system_config->'media', '{}'::jsonb) || COALESCE(v_tenant_overrides->'media', '{}'::jsonb),
    'typography', v_system_config->'typography',
    'tokens', v_system_config->'tokens'
  );
  
  RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_game_reaction_counts(p_game_ids uuid[])
 RETURNS TABLE(game_id uuid, like_count bigint, dislike_count bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    gr.game_id,
    COUNT(*) FILTER (WHERE gr.reaction = 'like')    AS like_count,
    COUNT(*) FILTER (WHERE gr.reaction = 'dislike') AS dislike_count
  FROM public.game_reactions gr
  WHERE gr.game_id = ANY(p_game_ids)
  GROUP BY gr.game_id;
$function$
;

CREATE OR REPLACE FUNCTION public.get_game_reactions_batch(p_game_ids uuid[])
 RETURNS TABLE(game_id uuid, reaction text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    -- Return empty for unauthenticated
    RETURN;
  END IF;

  RETURN QUERY
  SELECT gr.game_id, gr.reaction
  FROM public.game_reactions gr
  WHERE gr.user_id = v_user_id
    AND gr.game_id = ANY(p_game_ids);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_gamification_level_definitions_v1(p_tenant_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(level integer, name text, next_level_xp integer, next_reward text, reward_asset_key text, scope_tenant_id uuid)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_has_tenant_rows boolean;
begin
  v_has_tenant_rows := false;
  if p_tenant_id is not null then
    select exists(
      select 1 from public.gamification_level_definitions gld
      where gld.tenant_id = p_tenant_id
      limit 1
    ) into v_has_tenant_rows;
  end if;

  if v_has_tenant_rows then
    return query
      select gld.level, gld.name, gld.next_level_xp, gld.next_reward, gld.reward_asset_key, gld.tenant_id
      from public.gamification_level_definitions gld
      where gld.tenant_id = p_tenant_id
      order by gld.level asc;
  else
    return query
      select gld.level, gld.name, gld.next_level_xp, gld.next_reward, gld.reward_asset_key, gld.tenant_id
      from public.gamification_level_definitions gld
      where gld.tenant_id is null
      order by gld.level asc;
  end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_latest_game_snapshot(p_game_id uuid)
 RETURNS uuid
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT id
  FROM public.game_snapshots
  WHERE game_id = p_game_id
  ORDER BY version DESC
  LIMIT 1;
$function$
;

CREATE OR REPLACE FUNCTION public.get_liked_game_ids()
 RETURNS uuid[]
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN ARRAY[]::UUID[];
  END IF;

  RETURN ARRAY(
    SELECT gr.game_id
    FROM public.game_reactions gr
    WHERE gr.user_id = v_user_id
      AND gr.reaction = 'like'
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_next_plan_version_number(p_plan_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  RETURN COALESCE(
    (SELECT MAX(version_number) + 1 FROM public.plan_versions WHERE plan_id = p_plan_id),
    1
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_scheduled_jobs_status()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_result jsonb;
  v_jobs jsonb;
  v_runs jsonb;
BEGIN
  -- Kolla om anvÃ¤ndaren Ã¤r system admin
  IF NOT public.is_system_admin() THEN
    RETURN jsonb_build_object('error', 'Unauthorized');
  END IF;

  -- HÃ¤mta cron-jobb (om pg_cron finns)
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    SELECT jsonb_agg(jsonb_build_object(
      'jobid', jobid,
      'jobname', jobname,
      'schedule', schedule,
      'command', command,
      'active', active
    ))
    INTO v_jobs
    FROM cron.job
    WHERE jobname LIKE 'cleanup%' 
       OR jobname LIKE 'demo%'
       OR jobname LIKE 'process%'
       OR jobname LIKE 'notification%';
  ELSE
    v_jobs := '[]'::jsonb;
  END IF;

  -- HÃ¤mta senaste kÃ¶rningar (max 20)
  SELECT jsonb_agg(jsonb_build_object(
    'id', id,
    'job_name', job_name,
    'status', status,
    'result', result,
    'error_message', error_message,
    'started_at', started_at,
    'completed_at', completed_at,
    'duration_ms', duration_ms
  ) ORDER BY started_at DESC)
  INTO v_runs
  FROM (
    SELECT * FROM public.scheduled_job_runs
    ORDER BY started_at DESC
    LIMIT 20
  ) sub;

  v_result := jsonb_build_object(
    'jobs', COALESCE(v_jobs, '[]'::jsonb),
    'recent_runs', COALESCE(v_runs, '[]'::jsonb),
    'fetched_at', now()
  );

  RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_session_event_stats(p_session_id uuid)
 RETURNS TABLE(event_category text, event_count bigint, error_count bigint, warning_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    se.event_category,
    COUNT(*) AS event_count,
    COUNT(*) FILTER (WHERE se.severity = 'error') AS error_count,
    COUNT(*) FILTER (WHERE se.severity = 'warning') AS warning_count
  FROM public.session_events se
  WHERE se.session_id = p_session_id
  GROUP BY se.event_category
  ORDER BY event_count DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_session_events(p_session_id uuid, p_limit integer DEFAULT 100, p_offset integer DEFAULT 0, p_category text DEFAULT NULL::text, p_severity text DEFAULT NULL::text, p_since timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS TABLE(id uuid, event_type text, event_category text, actor_type text, actor_id uuid, actor_name text, target_type text, target_id text, target_name text, payload jsonb, correlation_id uuid, parent_event_id uuid, severity text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    se.id,
    se.event_type,
    se.event_category,
    se.actor_type,
    se.actor_id,
    se.actor_name,
    se.target_type,
    se.target_id,
    se.target_name,
    se.payload,
    se.correlation_id,
    se.parent_event_id,
    se.severity,
    se.created_at
  FROM public.session_events se
  WHERE se.session_id = p_session_id
    AND (p_category IS NULL OR se.event_category = p_category)
    AND (p_severity IS NULL OR se.severity = p_severity)
    AND (p_since IS NULL OR se.created_at >= p_since)
  ORDER BY se.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_softcap_config_v1(p_tenant_id uuid)
 RETURNS TABLE(daily_coin_threshold integer, daily_xp_threshold integer, coin_diminishing_factor numeric, xp_diminishing_factor numeric, coin_floor_pct numeric, xp_floor_pct numeric, max_multiplier_cap numeric, source text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin
  -- Try tenant-specific first
  return query
    select
      sc.daily_coin_threshold,
      sc.daily_xp_threshold,
      sc.coin_diminishing_factor,
      sc.xp_diminishing_factor,
      sc.coin_floor_pct,
      sc.xp_floor_pct,
      sc.max_multiplier_cap,
      'tenant'::text as source
    from public.gamification_softcap_config sc
    where sc.tenant_id = p_tenant_id
      and sc.is_active = true
    limit 1;
  
  if found then return; end if;
  
  -- Fall back to global
  return query
    select
      sc.daily_coin_threshold,
      sc.daily_xp_threshold,
      sc.coin_diminishing_factor,
      sc.xp_diminishing_factor,
      sc.coin_floor_pct,
      sc.xp_floor_pct,
      sc.max_multiplier_cap,
      'global'::text as source
    from public.gamification_softcap_config sc
    where sc.tenant_id is null
      and sc.is_active = true
    limit 1;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_tenant_id_by_hostname(p_hostname text)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT tenant_id
  FROM public.tenant_domains
  WHERE hostname = lower(trim(p_hostname))
    AND status = 'active'
  LIMIT 1;
$function$
;

CREATE OR REPLACE FUNCTION public.get_tenant_user_ids(p_tenant_id uuid)
 RETURNS uuid[]
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_user_ids UUID[];
BEGIN
  -- Validate caller is system_admin (using JWT-only version to avoid recursion)
  IF NOT public.is_system_admin_jwt_only() THEN
    RAISE EXCEPTION 'Forbidden: only system_admin can list tenant users';
  END IF;
  
  IF p_tenant_id IS NULL THEN
    RAISE EXCEPTION 'p_tenant_id is required';
  END IF;
  
  SELECT array_agg(user_id)
  INTO v_user_ids
  FROM public.user_tenant_memberships
  WHERE tenant_id = p_tenant_id
    AND status = 'active';
  
  RETURN COALESCE(v_user_ids, '{}');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_translated_content(p_table_name text, p_parent_id uuid, p_locale text, p_fallback_locale text DEFAULT 'sv'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result JSONB;
  v_query TEXT;
BEGIN
  -- Try requested locale first
  v_query := format(
    'SELECT row_to_json(t.*)::jsonb FROM %I t WHERE %I = $1 AND locale = $2 LIMIT 1',
    p_table_name,
    CASE p_table_name
      WHEN 'learning_course_translations' THEN 'course_id'
      WHEN 'learning_path_translations' THEN 'path_id'
      WHEN 'achievement_translations' THEN 'achievement_id'
      WHEN 'shop_item_translations' THEN 'item_id'
      WHEN 'notification_template_translations' THEN 'template_id'
      ELSE 'id'
    END
  );
  
  EXECUTE v_query INTO v_result USING p_parent_id, p_locale;
  
  -- Fallback to default locale if not found
  IF v_result IS NULL AND p_locale != p_fallback_locale THEN
    EXECUTE v_query INTO v_result USING p_parent_id, p_fallback_locale;
  END IF;
  
  RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_unread_notification_count()
 RETURNS integer
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT COUNT(*)::INTEGER
  FROM public.notification_deliveries
  WHERE user_id = auth.uid()
    AND read_at IS NULL
    AND dismissed_at IS NULL;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_admin_roles(target_user_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(is_system_admin boolean, tenant_admin_of uuid[])
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_is_system_admin BOOLEAN := false;
  v_tenant_ids UUID[];
BEGIN
  v_user_id := COALESCE(target_user_id, auth.uid());
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, ARRAY[]::UUID[];
    RETURN;
  END IF;
  
  -- Check system admin
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = v_user_id AND u.global_role = 'system_admin'
  ) INTO v_is_system_admin;
  
  -- Get tenant admin roles
  SELECT COALESCE(array_agg(utm.tenant_id), ARRAY[]::UUID[])
  INTO v_tenant_ids
  FROM public.user_tenant_memberships utm
  WHERE utm.user_id = v_user_id
    AND utm.status = 'active'
    AND utm.role IN ('owner', 'admin');
  
  RETURN QUERY SELECT v_is_system_admin, v_tenant_ids;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_notifications(p_limit integer DEFAULT 20)
 RETURNS TABLE(id uuid, notification_id uuid, delivered_at timestamp with time zone, read_at timestamp with time zone, dismissed_at timestamp with time zone, title text, message text, type text, category text, action_url text, action_label text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT
    nd.id,
    nd.notification_id,
    nd.delivered_at,
    nd.read_at,
    nd.dismissed_at,
    n.title,
    n.message,
    n.type,
    n.category,
    n.action_url,
    n.action_label
  FROM public.notification_deliveries nd
  JOIN public.notifications n ON n.id = nd.notification_id
  WHERE nd.user_id = auth.uid()
    AND nd.dismissed_at IS NULL
  ORDER BY nd.delivered_at DESC
  LIMIT p_limit;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_tenant_ids()
 RETURNS uuid[]
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT CASE
    WHEN public.is_system_admin() THEN ARRAY(SELECT id FROM public.tenants)
    ELSE COALESCE(
      (SELECT array_agg(tenant_id) FROM public.user_tenant_memberships WHERE user_id = auth.uid() AND status = 'active'),
      ARRAY[]::uuid[]
    )
  END;
$function$
;

CREATE OR REPLACE FUNCTION public.guard_category_slug_collision()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.products
    WHERE product_key = NEW.slug
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Category slug "%" collides with an existing product_key', NEW.slug
      USING ERRCODE = 'unique_violation';
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.guard_product_slug_collision()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  -- product_key is now NOT NULL, always check
  IF EXISTS (
    SELECT 1 FROM public.categories
    WHERE slug = NEW.product_key
  ) THEN
    RAISE EXCEPTION 'Product product_key "%" collides with an existing category slug', NEW.product_key
      USING ERRCODE = 'unique_violation';
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  -- Insert or update the public.users row
  INSERT INTO public.users (
    id,
    email,
    full_name,
    avatar_url,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture'
    ),
    NEW.created_at,
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
    updated_at = now();
  
  -- If there was an orphaned profile with same email but different ID, migrate it
  -- (This handles the case where a user signs up, deletes account, and signs up again)
  UPDATE public.user_tenant_memberships
  SET user_id = NEW.id
  WHERE user_id IN (
    SELECT id FROM public.users 
    WHERE email = NEW.email AND id != NEW.id
  );
  
  -- Remove orphaned profiles with same email
  DELETE FROM public.users 
  WHERE email = NEW.email AND id != NEW.id;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.has_tenant_role(p_tenant_id uuid, required_role public.tenant_role_enum)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  RETURN public.has_tenant_role(p_tenant_id, ARRAY[required_role]);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.has_tenant_role(p_tenant_id uuid, required_roles public.tenant_role_enum[])
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF public.is_system_admin() THEN
    RETURN TRUE;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.user_tenant_memberships
    WHERE user_id = auth.uid()
      AND tenant_id = p_tenant_id
      AND role = ANY(required_roles)
      AND status = 'active'
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.increment_broadcast_seq(p_session_id uuid)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_seq BIGINT;
BEGIN
  UPDATE public.participant_sessions
     SET broadcast_seq = broadcast_seq + 1
   WHERE id = p_session_id
   RETURNING broadcast_seq INTO v_seq;

  IF v_seq IS NULL THEN
    RAISE EXCEPTION 'participant_sessions.id % not found', p_session_id
      USING ERRCODE = 'P0002';
  END IF;

  RETURN v_seq;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_global_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT public.is_system_admin();
$function$
;

CREATE OR REPLACE FUNCTION public.is_system_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_uid uuid;
  v_is_admin boolean := false;
BEGIN
  -- Get current user ID
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check 1: JWT app_metadata.role
  IF COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') IN ('system_admin', 'superadmin', 'admin') THEN
    RETURN TRUE;
  END IF;
  
  -- Check 2: JWT app_metadata.global_role
  IF COALESCE(auth.jwt() -> 'app_metadata' ->> 'global_role', '') = 'system_admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Check 3: JWT user_metadata.global_role
  IF COALESCE(auth.jwt() -> 'user_metadata' ->> 'global_role', '') = 'system_admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Check 4: JWT root role claim
  IF COALESCE(auth.jwt() ->> 'role', '') IN ('system_admin', 'superadmin', 'admin') THEN
    RETURN TRUE;
  END IF;
  
  -- Check 5: Direct lookup in users table (bypassing RLS with SECURITY DEFINER)
  -- This is safe because we're only checking admin status, not exposing data
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = v_uid 
    AND (
      global_role = 'system_admin' 
      OR role IN ('system_admin', 'superadmin', 'admin')
    )
  ) INTO v_is_admin;
  
  RETURN v_is_admin;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_system_admin_jwt_only()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  -- Check JWT app_metadata for admin roles (ONLY JWT, no DB lookup)
  IF (auth.jwt() -> 'app_metadata' ->> 'role') IN ('system_admin', 'superadmin', 'admin') THEN
    RETURN TRUE;
  END IF;
  
  -- Check JWT root role claim
  IF (auth.jwt() ->> 'role') IN ('system_admin', 'superadmin', 'admin') THEN
    RETURN TRUE;
  END IF;
  
  -- Check global_role in user_metadata (also in JWT, no DB lookup)
  IF (auth.jwt() -> 'user_metadata' ->> 'global_role') = 'system_admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Do NOT check users table - that would cause infinite recursion
  RETURN FALSE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_tenant_member(p_tenant_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT 
    public.is_system_admin() 
    OR EXISTS (
      SELECT 1 FROM public.user_tenant_memberships
      WHERE user_id = auth.uid()
        AND tenant_id = p_tenant_id
        AND status = 'active'
    );
$function$
;

CREATE OR REPLACE FUNCTION public.learning_all_requirements_satisfied(p_user_id uuid, p_tenant_id uuid, p_target_kind text, p_target_id text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_unsatisfied_count integer;
begin
  select count(*)
  into v_unsatisfied_count
  from public.learning_get_unsatisfied_requirements_v2(
    p_user_id, p_tenant_id, p_target_kind, p_target_id
  );
  
  return v_unsatisfied_count = 0;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.learning_course_completed(p_user_id uuid, p_tenant_id uuid, p_course_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.learning_user_progress
    WHERE user_id = p_user_id
    AND tenant_id = p_tenant_id
    AND course_id = p_course_id
    AND status = 'completed'
  );
$function$
;

CREATE OR REPLACE FUNCTION public.learning_get_requirement_summary(p_user_id uuid, p_tenant_id uuid, p_target_kind text, p_target_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_result jsonb;
  v_total integer;
  v_completed integer;
  v_unsatisfied jsonb;
begin
  -- Get all requirements for this target
  select count(*), count(*) filter (where r.is_completed)
  into v_total, v_completed
  from (
    select 
      lr.id,
      coalesce(lup.status = 'completed', false) as is_completed
    from public.learning_requirements lr
    left join public.learning_user_progress lup 
      on lup.user_id = p_user_id 
      and lup.tenant_id = p_tenant_id 
      and lup.course_id = lr.required_course_id
    where (lr.tenant_id = p_tenant_id or lr.tenant_id is null)
      and lr.target_ref->>'kind' = p_target_kind
      and lr.target_ref->>'id' = p_target_id
      and lr.is_active = true
  ) r;

  -- Get unsatisfied requirements
  select jsonb_agg(jsonb_build_object(
    'courseId', required_course_id,
    'courseTitle', course_title,
    'courseSlug', course_slug
  ))
  into v_unsatisfied
  from public.learning_get_unsatisfied_requirements_v2(
    p_user_id, p_tenant_id, p_target_kind, p_target_id
  );

  v_result := jsonb_build_object(
    'satisfied', v_total = v_completed,
    'total', v_total,
    'completed', v_completed,
    'remaining', v_total - v_completed,
    'unsatisfiedCourses', coalesce(v_unsatisfied, '[]'::jsonb)
  );

  return v_result;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.learning_get_unsatisfied_requirements(p_user_id uuid, p_tenant_id uuid, p_target_kind text, p_target_id uuid)
 RETURNS TABLE(requirement_id uuid, course_id uuid, course_title text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT 
    lr.id as requirement_id,
    lr.required_course_id as course_id,
    lc.title as course_title
  FROM public.learning_requirements lr
  JOIN public.learning_courses lc ON lc.id = lr.required_course_id
  WHERE lr.is_active = true
  AND (lr.tenant_id IS NULL OR lr.tenant_id = p_tenant_id)
  AND lr.target_ref->>'kind' = p_target_kind
  AND (lr.target_ref->>'id')::uuid = p_target_id
  AND NOT public.learning_course_completed(p_user_id, p_tenant_id, lr.required_course_id)
  ORDER BY lr.priority;
$function$
;

CREATE OR REPLACE FUNCTION public.learning_get_unsatisfied_requirements_v2(p_user_id uuid, p_tenant_id uuid, p_target_kind text, p_target_id text)
 RETURNS TABLE(requirement_id uuid, requirement_type text, required_course_id uuid, course_title text, course_slug text, is_completed boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin
  return query
  select 
    lr.id as requirement_id,
    lr.requirement_type::text,
    lr.required_course_id,
    lc.title as course_title,
    lc.slug as course_slug,
    coalesce(lup.status = 'completed', false) as is_completed
  from public.learning_requirements lr
  join public.learning_courses lc on lc.id = lr.required_course_id
  left join public.learning_user_progress lup 
    on lup.user_id = p_user_id 
    and lup.tenant_id = p_tenant_id 
    and lup.course_id = lr.required_course_id
  where (lr.tenant_id = p_tenant_id or lr.tenant_id is null)
    and lr.target_ref->>'kind' = p_target_kind
    and lr.target_ref->>'id' = p_target_id
    and lr.is_active = true
    and coalesce(lup.status, 'not_started') != 'completed';
end;
$function$
;

CREATE OR REPLACE FUNCTION public.learning_grant_course_rewards_v1(p_user_id uuid, p_tenant_id uuid, p_course_id uuid, p_attempt_id uuid)
 RETURNS TABLE(dicecoin_granted integer, xp_granted integer, achievement_unlocked text, level_up boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_rewards jsonb;
  v_dicecoin integer;
  v_xp integer;
  v_achievement_id text;
  v_achievement_uuid uuid;
  v_idempotency_key text;
  v_coin_result record;
  v_xp_result record;
  v_level_up boolean := false;
  v_achievement_unlocked text := null;
  v_already_granted boolean;
begin
  -- Check if rewards already granted for this course
  select lup.rewards_granted_at is not null
  into v_already_granted
  from public.learning_user_progress lup
  where lup.user_id = p_user_id
    and lup.tenant_id = p_tenant_id
    and lup.course_id = p_course_id;

  if v_already_granted then
    dicecoin_granted := 0;
    xp_granted := 0;
    achievement_unlocked := null;
    level_up := false;
    return next;
    return;
  end if;

  -- Get course rewards
  select lc.rewards_json
  into v_rewards
  from public.learning_courses lc
  where lc.id = p_course_id;

  if v_rewards is null then
    dicecoin_granted := 0;
    xp_granted := 0;
    achievement_unlocked := null;
    level_up := false;
    return next;
    return;
  end if;

  v_dicecoin := (v_rewards->>'dicecoin_amount')::integer;
  v_xp := (v_rewards->>'xp_amount')::integer;
  v_achievement_id := v_rewards->>'achievement_id';
  v_idempotency_key := 'learning:course:' || p_course_id::text || ':' || p_user_id::text;

  -- Grant DiceCoin
  if v_dicecoin is not null and v_dicecoin > 0 then
    select * into v_coin_result
    from public.apply_coin_transaction_v1(
      p_user_id,
      p_tenant_id,
      'earn',
      v_dicecoin,
      'learning_course_complete',
      v_idempotency_key,
      'KursbelÃ¶ning: ' || (select title from public.learning_courses where id = p_course_id),
      'learning',
      jsonb_build_object('course_id', p_course_id, 'attempt_id', p_attempt_id)
    );
  end if;

  -- Grant XP
  if v_xp is not null and v_xp > 0 then
    select * into v_xp_result
    from public.apply_xp_transaction_v1(
      p_user_id,
      p_tenant_id,
      v_xp,
      'learning_course_complete',
      v_idempotency_key,
      'learning',
      jsonb_build_object('course_id', p_course_id, 'attempt_id', p_attempt_id)
    );
    v_level_up := v_xp_result.level_up;
  end if;

  -- Unlock achievement if specified
  if v_achievement_id is not null and length(v_achievement_id) > 0 then
    -- Try to parse as UUID first (achievement_id might be a UUID directly)
    begin
      v_achievement_uuid := v_achievement_id::uuid;
      
      -- It's a valid UUID, search by ID
      insert into public.user_achievements (user_id, tenant_id, achievement_id, unlocked_at, source)
      select p_user_id, p_tenant_id, a.id, now(), 'learning_course'
      from public.achievements a
      where a.id = v_achievement_uuid
        and (a.tenant_id = p_tenant_id or a.tenant_id is null)
      on conflict (user_id, tenant_id, achievement_id) do nothing
      returning achievement_id::text into v_achievement_unlocked;
    exception when invalid_text_representation then
      -- Not a valid UUID, search by achievement_key
      insert into public.user_achievements (user_id, tenant_id, achievement_id, unlocked_at, source)
      select p_user_id, p_tenant_id, a.id, now(), 'learning_course'
      from public.achievements a
      where a.achievement_key = v_achievement_id
        and (a.tenant_id = p_tenant_id or a.tenant_id is null)
      on conflict (user_id, tenant_id, achievement_id) do nothing
      returning achievement_id::text into v_achievement_unlocked;
    end;
    
    if v_achievement_unlocked is not null then
      v_achievement_unlocked := v_achievement_id;
    end if;
  end if;

  -- Mark rewards as granted
  update public.learning_user_progress
  set rewards_granted_at = now(),
      updated_at = now()
  where user_id = p_user_id
    and tenant_id = p_tenant_id
    and course_id = p_course_id;

  dicecoin_granted := coalesce(v_dicecoin, 0);
  xp_granted := coalesce(v_xp, 0);
  achievement_unlocked := v_achievement_unlocked;
  level_up := v_level_up;
  return next;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.learning_prerequisites_met(p_user_id uuid, p_tenant_id uuid, p_path_id uuid, p_course_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT NOT EXISTS (
    -- Find all edges where this course is the target
    SELECT 1 FROM public.learning_path_edges lpe
    WHERE lpe.path_id = p_path_id
    AND lpe.to_course_id = p_course_id
    -- And the prerequisite course is NOT completed
    AND NOT public.learning_course_completed(p_user_id, p_tenant_id, lpe.from_course_id)
  );
$function$
;

CREATE OR REPLACE FUNCTION public.learning_requirement_satisfied(p_user_id uuid, p_tenant_id uuid, p_requirement_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.learning_requirements lr
    WHERE lr.id = p_requirement_id
    AND lr.is_active = true
    AND public.learning_course_completed(p_user_id, p_tenant_id, lr.required_course_id)
  );
$function$
;

CREATE OR REPLACE FUNCTION public.log_data_access(p_subject_user_id uuid, p_data_category text, p_operation text, p_fields_accessed text[] DEFAULT NULL::text[], p_legal_basis text DEFAULT 'contract'::text, p_purpose text DEFAULT 'service_delivery'::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  INSERT INTO public.data_access_log (
    accessor_user_id,
    subject_user_id,
    data_category,
    fields_accessed,
    operation,
    tenant_id,
    legal_basis,
    purpose
  ) VALUES (
    auth.uid(),
    p_subject_user_id,
    p_data_category,
    p_fields_accessed,
    p_operation,
    NULL, -- Can be enhanced to detect tenant
    p_legal_basis,
    p_purpose
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_dunning_action(p_payment_failure_id uuid, p_action_type text, p_action_result text DEFAULT NULL::text, p_action_details jsonb DEFAULT '{}'::jsonb, p_performed_by text DEFAULT 'system'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_action_id UUID;
BEGIN
  INSERT INTO dunning_actions (payment_failure_id, action_type, action_result, action_details, performed_by)
  VALUES (p_payment_failure_id, p_action_type, p_action_result, p_action_details, p_performed_by)
  RETURNING id INTO v_action_id;
  
  RETURN v_action_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_dunning_action()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  INSERT INTO public.dunning_action_log (
    subscription_id,
    action_type,
    old_status,
    new_status,
    metadata
  ) VALUES (
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    OLD.status,
    NEW.status,
    jsonb_build_object(
      'triggered_at', now(),
      'trigger_name', TG_NAME
    )
  );
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_product_event(p_product_id uuid, p_event_type text, p_event_data jsonb DEFAULT '{}'::jsonb, p_actor_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
    v_actor_email TEXT;
    v_log_id UUID;
BEGIN
    -- Check product exists
    IF NOT EXISTS (SELECT 1 FROM public.products WHERE id = p_product_id) THEN
        RAISE EXCEPTION 'Product not found: %', p_product_id;
    END IF;
    
    -- Get actor email if actor_id provided
    IF p_actor_id IS NOT NULL THEN
        SELECT email INTO v_actor_email
        FROM public.users
        WHERE id = p_actor_id;
    END IF;
    
    -- Insert audit log
    INSERT INTO product_audit_log (
        product_id,
        event_type,
        event_data,
        actor_id,
        actor_email
    ) VALUES (
        p_product_id,
        p_event_type,
        p_event_data,
        p_actor_id,
        v_actor_email
    )
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_quote_activity(p_quote_id uuid, p_activity_type text, p_activity_data jsonb DEFAULT '{}'::jsonb, p_performed_by uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_activity_id UUID;
BEGIN
  INSERT INTO quote_activities (quote_id, activity_type, activity_data, performed_by)
  VALUES (p_quote_id, p_activity_type, p_activity_data, COALESCE(p_performed_by, auth.uid()))
  RETURNING id INTO v_activity_id;
  
  RETURN v_activity_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_quote_activity()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  INSERT INTO public.quote_activity_log (
    quote_id,
    action,
    old_data,
    new_data,
    performed_by
  ) VALUES (
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END,
    auth.uid()
  );
  RETURN COALESCE(NEW, OLD);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_session_event(p_session_id uuid, p_event_type text, p_event_category text, p_actor_type text DEFAULT 'system'::text, p_actor_id uuid DEFAULT NULL::uuid, p_actor_name text DEFAULT NULL::text, p_target_type text DEFAULT NULL::text, p_target_id text DEFAULT NULL::text, p_target_name text DEFAULT NULL::text, p_payload jsonb DEFAULT '{}'::jsonb, p_correlation_id uuid DEFAULT NULL::uuid, p_parent_event_id uuid DEFAULT NULL::uuid, p_severity text DEFAULT 'info'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO public.session_events (
    session_id,
    event_type,
    event_category,
    actor_type,
    actor_id,
    actor_name,
    target_type,
    target_id,
    target_name,
    payload,
    correlation_id,
    parent_event_id,
    severity
  ) VALUES (
    p_session_id,
    p_event_type,
    p_event_category,
    p_actor_type,
    p_actor_id,
    p_actor_name,
    p_target_type,
    p_target_id,
    p_target_name,
    p_payload,
    p_correlation_id,
    p_parent_event_id,
    p_severity
  )
  RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_translation_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_old_value JSONB;
  v_new_value JSONB;
  v_changed_fields TEXT[];
  v_locale TEXT;
  v_parent_id UUID;
  v_user_id UUID;
  v_tenant_id UUID;
BEGIN
  -- Get current user
  v_user_id := (SELECT auth.uid());
  
  -- Determine action and values
  IF TG_OP = 'DELETE' THEN
    v_old_value := to_jsonb(OLD);
    v_new_value := NULL;
    v_locale := OLD.locale;
    
    -- Get parent_id based on table
    v_parent_id := CASE TG_TABLE_NAME
      WHEN 'learning_course_translations' THEN OLD.course_id
      WHEN 'learning_path_translations' THEN OLD.path_id
      WHEN 'achievement_translations' THEN OLD.achievement_id
      WHEN 'shop_item_translations' THEN OLD.item_id
      WHEN 'notification_template_translations' THEN OLD.template_id
      ELSE NULL
    END;
    
  ELSIF TG_OP = 'INSERT' THEN
    v_old_value := NULL;
    v_new_value := to_jsonb(NEW);
    v_locale := NEW.locale;
    
    v_parent_id := CASE TG_TABLE_NAME
      WHEN 'learning_course_translations' THEN NEW.course_id
      WHEN 'learning_path_translations' THEN NEW.path_id
      WHEN 'achievement_translations' THEN NEW.achievement_id
      WHEN 'shop_item_translations' THEN NEW.item_id
      WHEN 'notification_template_translations' THEN NEW.template_id
      ELSE NULL
    END;
    
  ELSE -- UPDATE
    v_old_value := to_jsonb(OLD);
    v_new_value := to_jsonb(NEW);
    v_locale := NEW.locale;
    
    v_parent_id := CASE TG_TABLE_NAME
      WHEN 'learning_course_translations' THEN NEW.course_id
      WHEN 'learning_path_translations' THEN NEW.path_id
      WHEN 'achievement_translations' THEN NEW.achievement_id
      WHEN 'shop_item_translations' THEN NEW.item_id
      WHEN 'notification_template_translations' THEN NEW.template_id
      ELSE NULL
    END;
    
    -- Calculate changed fields
    SELECT array_agg(key) INTO v_changed_fields
    FROM jsonb_each(v_new_value) n
    LEFT JOIN jsonb_each(v_old_value) o ON n.key = o.key
    WHERE n.value IS DISTINCT FROM o.value
      AND n.key NOT IN ('updated_at', 'updated_by');
  END IF;
  
  -- Insert audit log entry
  INSERT INTO translation_audit_log (
    action,
    table_name,
    record_id,
    locale,
    parent_id,
    old_value,
    new_value,
    changed_fields,
    user_id,
    tenant_id
  ) VALUES (
    lower(TG_OP),
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    v_locale,
    v_parent_id,
    v_old_value,
    v_new_value,
    v_changed_fields,
    v_user_id,
    v_tenant_id
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE notification_deliveries
  SET read_at = now()
  WHERE user_id = auth.uid()
    AND read_at IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.mark_demo_session_converted(session_id uuid, conversion_type_param text DEFAULT 'signup'::text, conversion_plan_param text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  UPDATE public.demo_sessions
  SET
    converted = true,
    conversion_type = conversion_type_param,
    conversion_plan = conversion_plan_param,
    ended_at = COALESCE(ended_at, now()),
    updated_at = now()
  WHERE id = session_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.mark_notification_read(p_delivery_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  UPDATE notification_deliveries
  SET read_at = now()
  WHERE id = p_delivery_id
    AND user_id = auth.uid()
    AND read_at IS NULL;
  RETURN FOUND;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.process_scheduled_notifications()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_run_id uuid;
  v_start_time timestamptz;
  v_result jsonb;
  v_processed_count int := 0;
  v_total_deliveries int := 0;
  v_notification RECORD;
  v_delivery_count int;
BEGIN
  v_start_time := clock_timestamp();
  
  -- Create job run record
  INSERT INTO public.scheduled_job_runs (job_name, status, started_at)
  VALUES ('process_scheduled_notifications', 'running', v_start_time)
  RETURNING id INTO v_run_id;
  
  BEGIN
    -- Process each scheduled notification that is due
    FOR v_notification IN
      SELECT id, title, scope, tenant_id
      FROM public.notifications
      WHERE status = 'scheduled'
        AND (schedule_at IS NULL OR schedule_at <= now())
      ORDER BY schedule_at ASC NULLS FIRST
      FOR UPDATE SKIP LOCKED  -- Skip if another worker is processing
    LOOP
      -- Generate deliveries for this notification
      IF v_notification.scope = 'all' THEN
        -- All users
        INSERT INTO public.notification_deliveries (notification_id, user_id, delivered_at)
        SELECT v_notification.id, u.id, now()
        FROM auth.users u
        ON CONFLICT (notification_id, user_id) DO NOTHING;
      ELSIF v_notification.scope = 'tenant' THEN
        -- Users in specific tenant
        INSERT INTO public.notification_deliveries (notification_id, user_id, delivered_at)
        SELECT v_notification.id, utm.user_id, now()
        FROM public.user_tenant_memberships utm
        WHERE utm.tenant_id = v_notification.tenant_id
        ON CONFLICT (notification_id, user_id) DO NOTHING;
      END IF;
      
      GET DIAGNOSTICS v_delivery_count = ROW_COUNT;
      v_total_deliveries := v_total_deliveries + v_delivery_count;
      
      -- Update notification status to sent
      UPDATE public.notifications
      SET status = 'sent', sent_at = now()
      WHERE id = v_notification.id;
      
      v_processed_count := v_processed_count + 1;
    END LOOP;
    
    v_result := jsonb_build_object(
      'success', true,
      'processed_notifications', v_processed_count,
      'total_deliveries', v_total_deliveries
    );
    
    -- Update job run record
    UPDATE public.scheduled_job_runs
    SET status = 'success',
        result = v_result,
        completed_at = clock_timestamp(),
        duration_ms = EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::int
    WHERE id = v_run_id;
    
  EXCEPTION WHEN OTHERS THEN
    -- Log error
    UPDATE public.scheduled_job_runs
    SET status = 'error',
        error_message = SQLERRM,
        completed_at = clock_timestamp(),
        duration_ms = EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::int
    WHERE id = v_run_id;
    
    v_result := jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'processed_before_error', v_processed_count
    );
  END;
  
  RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.publish_legal_document_v1(p_scope text, p_tenant_id uuid, p_type text, p_locale text, p_title text, p_content_markdown text, p_requires_acceptance boolean, p_change_summary text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_prev_id uuid;
  v_version int;
  v_new_id uuid;
BEGIN
  IF p_scope = 'global' THEN
    IF NOT public.is_system_admin() THEN
      RAISE EXCEPTION 'Unauthorized';
    END IF;
  ELSE
    IF p_tenant_id IS NULL THEN
      RAISE EXCEPTION 'Tenant is required';
    END IF;
    IF NOT (
      public.is_system_admin()
      OR public.has_tenant_role(p_tenant_id, ARRAY['owner','admin']::public.tenant_role_enum[])
    ) THEN
      RAISE EXCEPTION 'Unauthorized';
    END IF;
  END IF;

  SELECT id, version_int INTO v_prev_id, v_version
  FROM public.legal_documents
  WHERE type = p_type
    AND locale = p_locale
    AND scope = p_scope
    AND (
      (p_scope = 'tenant' AND tenant_id = p_tenant_id)
      OR (p_scope = 'global' AND tenant_id IS NULL)
    )
  ORDER BY version_int DESC
  LIMIT 1;

  v_version := COALESCE(v_version, 0) + 1;

  UPDATE public.legal_documents
    SET is_active = false
  WHERE type = p_type
    AND locale = p_locale
    AND scope = p_scope
    AND (
      (p_scope = 'tenant' AND tenant_id = p_tenant_id)
      OR (p_scope = 'global' AND tenant_id IS NULL)
    )
    AND is_active = true;

  INSERT INTO public.legal_documents (
    scope,
    tenant_id,
    type,
    locale,
    title,
    content_markdown,
    version_int,
    is_active,
    requires_acceptance,
    change_summary,
    previous_version_id,
    created_by,
    created_at,
    published_at
  ) VALUES (
    p_scope,
    CASE WHEN p_scope = 'tenant' THEN p_tenant_id ELSE NULL END,
    p_type,
    p_locale,
    p_title,
    p_content_markdown,
    v_version,
    true,
    COALESCE(p_requires_acceptance, true),
    p_change_summary,
    v_prev_id,
    auth.uid(),
    now(),
    now()
  )
  RETURNING id INTO v_new_id;

  INSERT INTO public.legal_audit_log (
    scope,
    tenant_id,
    document_id,
    actor_user_id,
    event_type,
    payload,
    created_at
  ) VALUES (
    p_scope,
    CASE WHEN p_scope = 'tenant' THEN p_tenant_id ELSE NULL END,
    v_new_id,
    auth.uid(),
    'publish',
    jsonb_build_object(
      'previous_id', v_prev_id,
      'version', v_version,
      'requires_acceptance', p_requires_acceptance
    ),
    now()
  );

  RETURN v_new_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.purchase_shop_item_v1(p_user_id uuid, p_tenant_id uuid, p_shop_item_id uuid, p_idempotency_key text)
 RETURNS TABLE(purchase_id uuid, coin_transaction_id uuid, balance integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_existing_purchase_id uuid;
  v_existing_tx_id uuid;
  v_balance integer;
  v_now timestamptz := now();
  v_price_numeric numeric;
  v_price_coins integer;
  v_item_name text;
  v_item_category text;
  v_item_available boolean;
  v_lock_key bigint;
  v_coin_tx_id uuid;
  v_tmp_balance integer;
  v_base_category text;
  v_metadata jsonb;
  v_bundle_items jsonb;
  v_bundle_elem jsonb;
  v_child_item_id uuid;
  v_child_qty integer;
  v_child_category text;
  v_child_base_category text;
  v_child_available boolean;
  v_child_name text;
  v_child_metadata jsonb;
  v_required_level integer;
  v_child_required_level integer;
  v_user_level integer;

  v_required_level_text text;
  v_child_required_level_text text;
begin
  if p_user_id is null then
    raise exception 'p_user_id is required';
  end if;
  if p_tenant_id is null then
    raise exception 'p_tenant_id is required';
  end if;
  if p_shop_item_id is null then
    raise exception 'p_shop_item_id is required';
  end if;
  if p_idempotency_key is null or length(trim(p_idempotency_key)) = 0 then
    raise exception 'p_idempotency_key is required';
  end if;

  v_lock_key := hashtextextended(p_user_id::text || ':' || p_tenant_id::text || ':' || p_idempotency_key, 0);
  perform pg_advisory_xact_lock(v_lock_key);

  select up.id, up.coin_transaction_id
    into v_existing_purchase_id, v_existing_tx_id
    from public.user_purchases up
    where up.user_id = p_user_id
      and up.tenant_id = p_tenant_id
      and up.idempotency_key = p_idempotency_key
    limit 1;

  if v_existing_purchase_id is not null then
    select uc.balance
      into v_balance
      from public.user_coins uc
      where uc.user_id = p_user_id
        and uc.tenant_id = p_tenant_id
      limit 1;

    purchase_id := v_existing_purchase_id;
    coin_transaction_id := v_existing_tx_id;
    balance := coalesce(v_balance, 0);
    return next;
    return;
  end if;

  select si.price, si.name, si.category, si.is_available, coalesce(si.metadata, '{}'::jsonb)
    into v_price_numeric, v_item_name, v_item_category, v_item_available, v_metadata
    from public.shop_items si
    where si.id = p_shop_item_id
      and si.tenant_id = p_tenant_id
    limit 1;

  if v_item_name is null then
    raise exception 'shop item not found';
  end if;

  if coalesce(v_item_available, false) is not true then
    raise exception 'shop item not available';
  end if;

  -- Optional level gating
  v_required_level := null;
  v_required_level_text := null;
  begin
    v_required_level_text := nullif(trim(coalesce(v_metadata->>'minLevel', '')), '');
  exception when others then
    v_required_level_text := null;
  end;
  if v_required_level_text is null then
    begin
      v_required_level_text := nullif(trim(coalesce(v_metadata->>'min_level', '')), '');
    exception when others then
      v_required_level_text := null;
    end;
  end if;

  if v_required_level_text is not null then
    begin
      v_required_level := (v_required_level_text)::int;
    exception when others then
      v_required_level := null;
    end;
  end if;

  if v_required_level is not null and v_required_level > 1 then
    select up.level
      into v_user_level
      from public.user_progress up
      where up.user_id = p_user_id
        and up.tenant_id = p_tenant_id
      limit 1;

    v_user_level := coalesce(v_user_level, 1);

    if v_user_level < v_required_level then
      raise exception 'requires level %', v_required_level;
    end if;
  end if;

  v_base_category := nullif(split_part(coalesce(v_item_category, ''), ':', 1), '');
  if v_base_category is null then
    v_base_category := v_item_category;
  end if;

  v_price_coins := round(coalesce(v_price_numeric, 0))::int;
  if v_price_coins <= 0 then
    raise exception 'invalid price';
  end if;

  v_bundle_items := null;
  if v_base_category is not distinct from 'bundle' then
    v_bundle_items := v_metadata->'bundleItems';
    if v_bundle_items is null or jsonb_typeof(v_bundle_items) is distinct from 'array' or jsonb_array_length(v_bundle_items) = 0 then
      raise exception 'bundleItems metadata is required for bundle purchases';
    end if;
  end if;

  -- Spend DiceCoin (idempotent)
  select t.transaction_id, t.balance
    into v_coin_tx_id, v_tmp_balance
    from public.apply_coin_transaction_v1(
      p_user_id,
      p_tenant_id,
      'spend',
      v_price_coins,
      'shop:purchase',
      'shop:' || p_idempotency_key,
      'Purchase: ' || v_item_name,
      'shop',
      jsonb_build_object(
        'shopItemId', p_shop_item_id,
        'tenantId', p_tenant_id,
        'category', v_item_category,
        'bundleItems', v_bundle_items
      )
    ) as t;

  -- Create purchase row
  insert into public.user_purchases(
    tenant_id,
    user_id,
    shop_item_id,
    quantity,
    price_paid,
    currency_id,
    created_at,
    idempotency_key,
    coin_transaction_id
  )
  select
    p_tenant_id,
    p_user_id,
    si.id,
    1,
    si.price,
    si.currency_id,
    v_now,
    p_idempotency_key,
    v_coin_tx_id
  from public.shop_items si
  where si.id = p_shop_item_id
  returning id into purchase_id;

  if v_base_category is not distinct from 'cosmetic' then
    insert into public.player_cosmetics(
      tenant_id,
      user_id,
      shop_item_id,
      is_equipped,
      acquired_at,
      created_at
    ) values (
      p_tenant_id,
      p_user_id,
      p_shop_item_id,
      false,
      v_now,
      v_now
    )
    on conflict (user_id, tenant_id, shop_item_id) do nothing;
  elsif v_base_category is not distinct from 'powerup' then
    insert into public.user_powerup_inventory(
      tenant_id,
      user_id,
      shop_item_id,
      quantity,
      created_at,
      updated_at
    ) values (
      p_tenant_id,
      p_user_id,
      p_shop_item_id,
      1,
      v_now,
      v_now
    )
    on conflict (tenant_id, user_id, shop_item_id)
    do update set
      quantity = public.user_powerup_inventory.quantity + 1,
      updated_at = excluded.updated_at;
  elsif v_base_category is not distinct from 'bundle' then
    -- If parent required level was set, reuse computed v_user_level. Otherwise compute lazily if needed for children.
    if v_user_level is null then
      select up.level
        into v_user_level
        from public.user_progress up
        where up.user_id = p_user_id
          and up.tenant_id = p_tenant_id
        limit 1;
      v_user_level := coalesce(v_user_level, 1);
    end if;

    for v_bundle_elem in
      select value from jsonb_array_elements(v_bundle_items)
    loop
      begin
        v_child_item_id := (v_bundle_elem->>'shopItemId')::uuid;
      exception when others then
        raise exception 'Invalid bundleItems.shopItemId';
      end;

      begin
        v_child_qty := coalesce((v_bundle_elem->>'quantity')::int, 1);
      exception when others then
        v_child_qty := 1;
      end;

      if v_child_qty < 1 or v_child_qty > 100 then
        raise exception 'Invalid bundleItems.quantity';
      end if;

      select si.category, si.is_available, si.name, coalesce(si.metadata, '{}'::jsonb)
        into v_child_category, v_child_available, v_child_name, v_child_metadata
        from public.shop_items si
        where si.id = v_child_item_id
          and si.tenant_id = p_tenant_id
        limit 1;

      if v_child_name is null then
        raise exception 'bundle item not found';
      end if;

      if coalesce(v_child_available, false) is not true then
        raise exception 'bundle item not available';
      end if;

      -- Optional level gating for child items
      v_child_required_level := null;
      v_child_required_level_text := null;
      begin
        v_child_required_level_text := nullif(trim(coalesce(v_child_metadata->>'minLevel', '')), '');
      exception when others then
        v_child_required_level_text := null;
      end;
      if v_child_required_level_text is null then
        begin
          v_child_required_level_text := nullif(trim(coalesce(v_child_metadata->>'min_level', '')), '');
        exception when others then
          v_child_required_level_text := null;
        end;
      end if;

      if v_child_required_level_text is not null then
        begin
          v_child_required_level := (v_child_required_level_text)::int;
        exception when others then
          v_child_required_level := null;
        end;
      end if;

      if v_child_required_level is not null and v_child_required_level > 1 then
        if v_user_level < v_child_required_level then
          raise exception 'requires level %', v_child_required_level;
        end if;
      end if;

      v_child_base_category := nullif(split_part(coalesce(v_child_category, ''), ':', 1), '');
      if v_child_base_category is null then
        v_child_base_category := v_child_category;
      end if;

      if v_child_base_category is not distinct from 'cosmetic' then
        insert into public.player_cosmetics(
          tenant_id,
          user_id,
          shop_item_id,
          is_equipped,
          acquired_at,
          created_at
        ) values (
          p_tenant_id,
          p_user_id,
          v_child_item_id,
          false,
          v_now,
          v_now
        )
        on conflict (user_id, tenant_id, shop_item_id) do nothing;
      elsif v_child_base_category is not distinct from 'powerup' then
        insert into public.user_powerup_inventory(
          tenant_id,
          user_id,
          shop_item_id,
          quantity,
          created_at,
          updated_at
        ) values (
          p_tenant_id,
          p_user_id,
          v_child_item_id,
          v_child_qty,
          v_now,
          v_now
        )
        on conflict (tenant_id, user_id, shop_item_id)
        do update set
          quantity = public.user_powerup_inventory.quantity + excluded.quantity,
          updated_at = excluded.updated_at;
      else
        raise exception 'bundle item category not supported';
      end if;
    end loop;
  end if;

  coin_transaction_id := v_coin_tx_id;
  balance := v_tmp_balance;
  return next;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rearm_trigger_v2(p_session_id uuid, p_game_trigger_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  INSERT INTO session_trigger_state (session_id, game_trigger_id, status, enabled)
  VALUES (p_session_id, p_game_trigger_id, 'armed', TRUE)
  ON CONFLICT (session_id, game_trigger_id)
  DO UPDATE SET
    status = 'armed',
    enabled = TRUE,
    updated_at = now();
  
  RETURN TRUE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.recalc_plan_total_time_minutes(p_plan_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_total integer;
BEGIN
  SELECT COALESCE(
    SUM(
      COALESCE(pb.duration_minutes, g.time_estimate_min, 0)
    ),
    0
  )
  INTO v_total
  FROM public.plan_blocks pb
  LEFT JOIN public.games g ON g.id = pb.game_id
  WHERE pb.plan_id = p_plan_id;

  UPDATE public.plans
  SET total_time_minutes = v_total,
      updated_at = now()
  WHERE id = p_plan_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.record_cooldown_trigger_v1(p_user_id uuid, p_tenant_id uuid, p_event_type text, p_cooldown_type text, p_streak_id integer DEFAULT NULL::integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role only';
  end if;

  insert into public.gamification_cooldowns (
    user_id, tenant_id, event_type, cooldown_type, streak_id,
    trigger_count, first_triggered_at, last_triggered_at
  )
  values (
    p_user_id, p_tenant_id, p_event_type, p_cooldown_type, p_streak_id,
    1, now(), now()
  )
  on conflict (user_id, tenant_id, event_type, cooldown_type)
  do update set
    trigger_count = gamification_cooldowns.trigger_count + 1,
    last_triggered_at = now();
end;
$function$
;

CREATE OR REPLACE FUNCTION public.record_daily_earning_v1(p_user_id uuid, p_tenant_id uuid, p_coins integer, p_xp integer, p_coins_raw integer DEFAULT NULL::integer, p_xp_raw integer DEFAULT NULL::integer, p_coins_reduced integer DEFAULT 0, p_xp_reduced integer DEFAULT 0)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role only';
  end if;

  insert into public.gamification_daily_earnings (
    user_id, tenant_id, earning_date,
    coins_earned, xp_earned,
    coins_earned_raw, xp_earned_raw,
    coins_reduced, xp_reduced,
    event_count, last_event_at
  ) values (
    p_user_id, p_tenant_id, current_date,
    coalesce(p_coins, 0), coalesce(p_xp, 0),
    coalesce(p_coins_raw, p_coins, 0), coalesce(p_xp_raw, p_xp, 0),
    coalesce(p_coins_reduced, 0), coalesce(p_xp_reduced, 0),
    1, now()
  )
  on conflict (user_id, tenant_id, earning_date)
  do update set
    coins_earned = gamification_daily_earnings.coins_earned + coalesce(p_coins, 0),
    xp_earned = gamification_daily_earnings.xp_earned + coalesce(p_xp, 0),
    coins_earned_raw = gamification_daily_earnings.coins_earned_raw + coalesce(p_coins_raw, p_coins, 0),
    xp_earned_raw = gamification_daily_earnings.xp_earned_raw + coalesce(p_xp_raw, p_xp, 0),
    coins_reduced = gamification_daily_earnings.coins_reduced + coalesce(p_coins_reduced, 0),
    xp_reduced = gamification_daily_earnings.xp_reduced + coalesce(p_xp_reduced, 0),
    event_count = gamification_daily_earnings.event_count + 1,
    last_event_at = now(),
    updated_at = now();
end;
$function$
;

CREATE OR REPLACE FUNCTION public.record_usage(p_tenant_id uuid, p_meter_slug text, p_quantity numeric, p_idempotency_key text DEFAULT NULL::text, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_meter_id UUID;
  v_period_start DATE;
  v_period_end DATE;
  v_record_id UUID;
  v_existing_id UUID;
BEGIN
  -- Get meter
  SELECT id INTO v_meter_id FROM public.usage_meters WHERE slug = p_meter_slug AND status = 'active';
  IF v_meter_id IS NULL THEN
    RAISE EXCEPTION 'Unknown meter: %', p_meter_slug;
  END IF;

  -- Check idempotency
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_existing_id FROM public.usage_records WHERE idempotency_key = p_idempotency_key;
    IF v_existing_id IS NOT NULL THEN
      RETURN v_existing_id;
    END IF;
  END IF;

  -- Calculate period (current month)
  v_period_start := date_trunc('month', now())::DATE;
  v_period_end := (date_trunc('month', now()) + interval '1 month' - interval '1 day')::DATE;

  -- Insert record
  INSERT INTO usage_records (tenant_id, meter_id, quantity, period_start, period_end, idempotency_key, metadata)
  VALUES (p_tenant_id, v_meter_id, p_quantity, v_period_start, v_period_end, p_idempotency_key, p_metadata)
  RETURNING id INTO v_record_id;

  RETURN v_record_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.record_usage(p_tenant_id uuid, p_metric_name text, p_quantity numeric DEFAULT 1, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.usage_records (
    tenant_id,
    metric_name,
    quantity,
    metadata,
    recorded_at
  ) VALUES (
    p_tenant_id,
    p_metric_name,
    p_quantity,
    p_metadata,
    now()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.redeem_gift_code(p_code text, p_user_id uuid, p_tenant_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(success boolean, message text, gift_id uuid, product_id uuid, entitlement_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_gift gift_purchases%ROWTYPE;
  v_tenant_id UUID;
  v_entitlement_id UUID;
BEGIN
  -- Find the gift
  SELECT * INTO v_gift
  FROM public.gift_purchases
  WHERE redemption_code = upper(p_code)
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Invalid gift code'::TEXT, NULL::UUID, NULL::UUID, NULL::UUID;
    RETURN;
  END IF;

  IF v_gift.status != 'paid' THEN
    RETURN QUERY SELECT false, 
      CASE v_gift.status
        WHEN 'pending' THEN 'Gift payment not completed'
        WHEN 'redeemed' THEN 'Gift already redeemed'
        WHEN 'expired' THEN 'Gift has expired'
        WHEN 'canceled' THEN 'Gift was canceled'
        ELSE 'Gift not available'
      END::TEXT,
      NULL::UUID, NULL::UUID, NULL::UUID;
    RETURN;
  END IF;

  IF v_gift.redemption_code_expires_at < now() THEN
    -- Mark as expired
    UPDATE gift_purchases SET status = 'expired', updated_at = now()
    WHERE id = v_gift.id;
    
    RETURN QUERY SELECT false, 'Gift code has expired'::TEXT, NULL::UUID, NULL::UUID, NULL::UUID;
    RETURN;
  END IF;

  -- Determine tenant
  v_tenant_id := COALESCE(p_tenant_id, v_gift.redeemed_tenant_id);

  -- If no tenant provided, create a private tenant for the user
  IF v_tenant_id IS NULL THEN
    INSERT INTO tenants (name, slug, type, status, created_by, updated_by)
    VALUES (
      (SELECT COALESCE(display_name, split_part(email, '@', 1) || '''s Account') FROM public.users WHERE id = p_user_id),
      'gift-' || lower(substr(v_gift.redemption_code, 1, 8)),
      'private',
      'active',
      p_user_id,
      p_user_id
    )
    RETURNING id INTO v_tenant_id;

    -- Add user as owner
    INSERT INTO user_tenant_memberships (tenant_id, user_id, role, is_primary, status)
    VALUES (v_tenant_id, p_user_id, 'owner', true, 'active');
  END IF;

  -- Create entitlement
  INSERT INTO tenant_product_entitlements (
    tenant_id,
    product_id,
    status,
    source,
    quantity_seats,
    created_by,
    metadata
  )
  VALUES (
    v_tenant_id,
    v_gift.product_id,
    'active',
    'gift',
    1,
    p_user_id,
    jsonb_build_object(
      'gift_purchase_id', v_gift.id,
      'gift_code', v_gift.redemption_code,
      'gifted_by', v_gift.purchaser_user_id
    )
  )
  RETURNING id INTO v_entitlement_id;

  -- Assign seat to the user
  INSERT INTO tenant_entitlement_seat_assignments (
    tenant_id,
    entitlement_id,
    user_id,
    assigned_by,
    status
  )
  VALUES (v_tenant_id, v_entitlement_id, p_user_id, p_user_id, 'active');

  -- Mark gift as redeemed
  UPDATE gift_purchases
  SET 
    status = 'redeemed',
    redeemed_at = now(),
    redeemed_by_user_id = p_user_id,
    redeemed_tenant_id = v_tenant_id,
    updated_at = now()
  WHERE id = v_gift.id;

  RETURN QUERY SELECT true, 'Gift redeemed successfully'::TEXT, v_gift.id, v_gift.product_id, v_entitlement_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.redeem_gift_code(p_code text, p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_gift RECORD;
  v_result JSONB;
BEGIN
  -- Find and lock the gift code
  SELECT * INTO v_gift
  FROM public.gift_codes
  WHERE code = upper(trim(p_code))
    AND redeemed_at IS NULL
    AND (expires_at IS NULL OR expires_at > now())
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired code');
  END IF;

  -- Mark as redeemed
  UPDATE public.gift_codes
  SET redeemed_at = now(),
      redeemed_by = p_user_id
  WHERE id = v_gift.id;

  RETURN jsonb_build_object(
    'success', true,
    'gift_id', v_gift.id,
    'value', v_gift.value,
    'type', v_gift.gift_type
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.refresh_gamification_daily_summaries_v1(p_tenant_id uuid, p_days integer DEFAULT 90)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_start date;
  v_end date;
  v_days integer;
  v_count integer;
begin
  if p_tenant_id is null then
    raise exception 'p_tenant_id is required';
  end if;

  if p_days is null or p_days < 1 or p_days > 3650 then
    raise exception 'p_days must be between 1 and 3650';
  end if;

  if auth.role() <> 'service_role' then
    raise exception 'service role only';
  end if;

  v_days := p_days;
  v_end := current_date;
  v_start := (current_date - (v_days - 1));

  with
    days as (
      select generate_series(v_start, v_end, interval '1 day')::date as day
    ),
    tx as (
      select
        ct.created_at::date as day,
        coalesce(sum(ct.amount) filter (where ct.type = 'earn'), 0)::bigint as earned,
        coalesce(sum(ct.amount) filter (where ct.type = 'spend'), 0)::bigint as spent,
        count(*)::bigint as tx_count,
        coalesce(sum(ct.amount) filter (where ct.type = 'earn' and ct.reason_code = 'campaign_bonus'), 0)::bigint as campaign_bonus_total,
        coalesce(sum(ct.amount) filter (where ct.type = 'earn' and ct.reason_code = 'automation_rule'), 0)::bigint as automation_total
      from public.coin_transactions ct
      where ct.tenant_id = p_tenant_id
        and ct.created_at >= v_start::timestamptz
        and ct.created_at < (v_end + 1)::timestamptz
      group by ct.created_at::date
    ),
    ev as (
      select
        ge.created_at::date as day,
        count(*)::bigint as events_count
      from public.gamification_events ge
      where ge.tenant_id = p_tenant_id
        and ge.created_at >= v_start::timestamptz
        and ge.created_at < (v_end + 1)::timestamptz
      group by ge.created_at::date
    ),
    aw as (
      select
        gaa.created_at::date as day,
        count(*)::bigint as awards_count,
        coalesce(sum(gaa.amount), 0)::bigint as awards_total
      from public.gamification_admin_awards gaa
      where gaa.tenant_id = p_tenant_id
        and gaa.created_at >= v_start::timestamptz
        and gaa.created_at < (v_end + 1)::timestamptz
      group by gaa.created_at::date
    ),
    pu as (
      select
        up.created_at::date as day,
        count(*)::bigint as purchases_count,
        coalesce(sum(up.price_paid), 0)::numeric as purchases_spent
      from public.user_purchases up
      where up.tenant_id = p_tenant_id
        and up.created_at >= v_start::timestamptz
        and up.created_at < (v_end + 1)::timestamptz
      group by up.created_at::date
    )
  insert into public.gamification_daily_summaries (
    tenant_id,
    day,
    earned,
    spent,
    tx_count,
    events_count,
    awards_total,
    awards_count,
    purchases_count,
    purchases_spent,
    campaign_bonus_total,
    automation_total,
    updated_at
  )
  select
    p_tenant_id,
    d.day,
    coalesce(tx.earned, 0),
    coalesce(tx.spent, 0),
    coalesce(tx.tx_count, 0),
    coalesce(ev.events_count, 0),
    coalesce(aw.awards_total, 0),
    coalesce(aw.awards_count, 0),
    coalesce(pu.purchases_count, 0),
    coalesce(pu.purchases_spent, 0),
    coalesce(tx.campaign_bonus_total, 0),
    coalesce(tx.automation_total, 0),
    now()
  from days d
  left join tx on tx.day = d.day
  left join ev on ev.day = d.day
  left join aw on aw.day = d.day
  left join pu on pu.day = d.day
  on conflict (tenant_id, day) do update set
    earned = excluded.earned,
    spent = excluded.spent,
    tx_count = excluded.tx_count,
    events_count = excluded.events_count,
    awards_total = excluded.awards_total,
    awards_count = excluded.awards_count,
    purchases_count = excluded.purchases_count,
    purchases_spent = excluded.purchases_spent,
    campaign_bonus_total = excluded.campaign_bonus_total,
    automation_total = excluded.automation_total,
    updated_at = excluded.updated_at;

  get diagnostics v_count = row_count;
  return v_count;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.replace_gamification_level_definitions_v1(p_tenant_id uuid, p_levels jsonb, p_actor_user_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(replaced_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_item jsonb;
  v_level integer;
  v_next_level_xp integer;
  v_name text;
  v_next_reward text;
  v_reward_asset_key text;
  v_count integer;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role only';
  end if;

  if p_tenant_id is null then
    raise exception 'p_tenant_id is required';
  end if;

  if p_levels is null or jsonb_typeof(p_levels) <> 'array' then
    raise exception 'p_levels must be a JSON array';
  end if;

  delete from public.gamification_level_definitions where tenant_id = p_tenant_id;

  v_count := 0;
  for v_item in select * from jsonb_array_elements(p_levels)
  loop
    if jsonb_typeof(v_item) <> 'object' then
      raise exception 'each level entry must be an object';
    end if;

    v_level := null;
    v_next_level_xp := null;

    if (v_item ? 'level') then
      v_level := (v_item->>'level')::integer;
    end if;

    if (v_item ? 'nextLevelXp') then
      v_next_level_xp := (v_item->>'nextLevelXp')::integer;
    elsif (v_item ? 'next_level_xp') then
      v_next_level_xp := (v_item->>'next_level_xp')::integer;
    end if;

    if v_level is null or v_level < 1 then
      raise exception 'invalid level in config';
    end if;

    if v_next_level_xp is null or v_next_level_xp < 0 then
      raise exception 'invalid nextLevelXp in config';
    end if;

    v_name := nullif(trim(coalesce(v_item->>'name','')), '');
    v_next_reward := nullif(trim(coalesce(v_item->>'nextReward','')), '');
    v_reward_asset_key := nullif(trim(coalesce(v_item->>'rewardAssetKey','')), '');

    insert into public.gamification_level_definitions(
      tenant_id,
      level,
      name,
      next_level_xp,
      next_reward,
      reward_asset_key
    )
    values (
      p_tenant_id,
      v_level,
      v_name,
      v_next_level_xp,
      v_next_reward,
      v_reward_asset_key
    )
    on conflict (
      coalesce(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid),
      level
    ) do update set
      name = excluded.name,
      next_level_xp = excluded.next_level_xp,
      next_reward = excluded.next_reward,
      reward_asset_key = excluded.reward_asset_key,
      updated_at = now();

    v_count := v_count + 1;
  end loop;

  replaced_count := v_count;
  return next;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.session_trigger_clear_error(p_trigger_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  UPDATE public.session_triggers
  SET 
    status = 'armed',
    last_error = NULL,
    last_error_at = NULL,
    updated_at = NOW()
  WHERE id = p_trigger_id
  AND status = 'error';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.session_trigger_record_error(p_trigger_id uuid, p_error_message text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  UPDATE public.session_triggers
  SET 
    status = 'error',
    last_error = p_error_message,
    last_error_at = NOW(),
    error_count = error_count + 1,
    updated_at = NOW()
  WHERE id = p_trigger_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.session_triggers_disable_all(p_session_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  affected_count INT;
BEGIN
  UPDATE public.session_triggers
  SET 
    status = 'disabled',
    updated_at = NOW()
  WHERE session_id = p_session_id
  AND status IN ('armed', 'error');
  
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN affected_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.session_triggers_rearm_all(p_session_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  affected_count INT;
BEGIN
  UPDATE public.session_triggers
  SET 
    status = 'armed',
    last_error = NULL,
    last_error_at = NULL,
    updated_at = NOW()
  WHERE session_id = p_session_id
  AND status IN ('disabled', 'error')
  AND enabled = TRUE;
  
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN affected_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_leaderboard_visibility(p_tenant_id uuid, p_visible boolean)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;
  
  insert into public.user_gamification_preferences (user_id, tenant_id, leaderboard_visible, leaderboard_opted_out_at)
  values (
    v_user_id,
    p_tenant_id,
    p_visible,
    case when p_visible then null else now() end
  )
  on conflict (user_id, tenant_id)
  do update set
    leaderboard_visible = p_visible,
    leaderboard_opted_out_at = case when p_visible then null else now() end,
    updated_at = now();
  
  return true;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.snapshot_game_roles_to_session(p_session_id uuid, p_game_id uuid, p_locale text DEFAULT NULL::text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_count INTEGER := 0;
BEGIN
  -- Copy all roles from game_roles to session_roles
  INSERT INTO public.session_roles (
    session_id,
    source_role_id,
    name,
    icon,
    color,
    role_order,
    public_description,
    private_instructions,
    private_hints,
    min_count,
    max_count,
    assignment_strategy,
    scaling_rules,
    conflicts_with
  )
  SELECT
    p_session_id,
    gr.id,
    gr.name,
    gr.icon,
    gr.color,
    gr.role_order,
    gr.public_description,
    gr.private_instructions,
    gr.private_hints,
    gr.min_count,
    gr.max_count,
    gr.assignment_strategy,
    gr.scaling_rules,
    COALESCE(
      (SELECT array_agg(gr2.name) 
       FROM public.game_roles gr2 
       WHERE gr2.id = ANY(gr.conflicts_with)),
      '{}'::TEXT[]
    )
  FROM public.game_roles gr
  WHERE gr.game_id = p_game_id
    AND (gr.locale = p_locale OR gr.locale IS NULL)
  ORDER BY gr.role_order;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.spatial_artifacts_guard_scope()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin
  -- Allow service_role through (for admin operations)
  if current_setting('request.jwt.claim.role', true) = 'service_role' then
    return new;
  end if;

  -- Block scope field changes
  if new.tenant_id is distinct from old.tenant_id then
    raise exception 'Cannot change tenant_id. Delete and re-create instead.'
      using errcode = 'check_violation';
  end if;

  if new.visibility is distinct from old.visibility then
    raise exception 'Cannot change visibility. Delete and re-create instead.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_category_bundle(p_category_slug text)
 RETURNS TABLE(added_count integer, removed_count integer, total_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_bundle_product_id uuid;
  v_added   integer := 0;
  v_removed integer := 0;
  v_total   integer := 0;
BEGIN
  -- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  -- 0. SQL-enforced admin check (defense in depth)
  -- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  IF NOT public.is_system_admin() THEN
    RAISE EXCEPTION 'sync_category_bundle requires system_admin role';
  END IF;

  -- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  -- 1. Resolve the bundle product for this category
  -- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  SELECT c.bundle_product_id INTO v_bundle_product_id
  FROM public.categories c
  WHERE c.slug = p_category_slug;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Category with slug "%" not found', p_category_slug;
  END IF;

  IF v_bundle_product_id IS NULL THEN
    RAISE EXCEPTION 'Category "%" has no bundle_product_id set', p_category_slug;
  END IF;

  -- Verify the bundle product actually exists and is a bundle
  IF NOT EXISTS (
    SELECT 1 FROM public.products
    WHERE id = v_bundle_product_id
      AND is_bundle = true
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Bundle product (%) is not active or is_bundle is false', v_bundle_product_id;
  END IF;

  -- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  -- 2. Remove items that are no longer eligible
  -- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  -- Items where the child product is no longer in this category,
  -- or is no longer marketing-visible, or is itself a bundle.

  WITH removed AS (
    DELETE FROM public.bundle_items bi
    WHERE bi.bundle_product_id = v_bundle_product_id
      AND NOT EXISTS (
        SELECT 1 FROM public.products p
        WHERE p.id = bi.child_product_id
          AND p.category_slug = p_category_slug
          AND p.is_marketing_visible = true
          AND p.is_bundle = false
          AND p.status = 'active'
          AND p.id != v_bundle_product_id
      )
    RETURNING bi.id
  )
  SELECT count(*)::integer INTO v_removed FROM removed;

  -- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  -- 3. Add new eligible items that aren't already in the bundle
  -- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  WITH eligible AS (
    SELECT p.id, ROW_NUMBER() OVER (ORDER BY p.name) AS rn
    FROM public.products p
    WHERE p.category_slug = p_category_slug
      AND p.is_marketing_visible = true
      AND p.is_bundle = false
      AND p.status = 'active'
      AND p.id != v_bundle_product_id
      AND NOT EXISTS (
        SELECT 1 FROM public.bundle_items bi2
        WHERE bi2.bundle_product_id = v_bundle_product_id
          AND bi2.child_product_id = p.id
      )
  ),
  inserted AS (
    INSERT INTO public.bundle_items (bundle_product_id, child_product_id, quantity, display_order)
    SELECT
      v_bundle_product_id,
      e.id,
      1,
      -- Offset display_order to come after existing items
      COALESCE((
        SELECT MAX(bi3.display_order) FROM public.bundle_items bi3
        WHERE bi3.bundle_product_id = v_bundle_product_id
      ), 0) + e.rn::integer
    FROM eligible e
    RETURNING id
  )
  SELECT count(*)::integer INTO v_added FROM inserted;

  -- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  -- 4. Count total items in bundle
  -- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  SELECT count(*)::integer INTO v_total
  FROM public.bundle_items
  WHERE bundle_product_id = v_bundle_product_id;

  RETURN QUERY SELECT v_added, v_removed, v_total;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.tenant_award_achievement_v1(p_tenant_id uuid, p_achievement_id uuid, p_user_ids uuid[], p_message text DEFAULT NULL::text, p_idempotency_key text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_actor_id UUID;
  v_award_id UUID;
  v_existing_award_id UUID;
  v_achievement RECORD;
  v_user_id UUID;
  v_user_achievement_id UUID;
  v_existing_ua_id UUID;
  v_inserted_count INTEGER := 0;
  v_duplicate_count INTEGER := 0;
  v_invalid_member_count INTEGER := 0;
  v_lock_key BIGINT;
  v_final_idempotency_key TEXT;
  v_recipient_ids UUID[] := '{}';
  v_duplicate_ids UUID[] := '{}';
  v_invalid_member_ids UUID[] := '{}';
BEGIN
  -- Get actor from auth context
  v_actor_id := auth.uid();
  
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: authentication required';
  END IF;
  
  -- Validate inputs
  IF p_tenant_id IS NULL THEN
    RAISE EXCEPTION 'p_tenant_id is required';
  END IF;
  
  IF p_achievement_id IS NULL THEN
    RAISE EXCEPTION 'p_achievement_id is required';
  END IF;
  
  IF p_user_ids IS NULL OR array_length(p_user_ids, 1) IS NULL OR array_length(p_user_ids, 1) = 0 THEN
    RAISE EXCEPTION 'p_user_ids must contain at least one user';
  END IF;
  
  -- SECURITY CHECK: Caller must be system_admin OR tenant admin (owner/admin/editor)
  IF NOT (
    public.is_system_admin()
    OR public.has_tenant_role(p_tenant_id, ARRAY['owner', 'admin', 'editor']::public.tenant_role_enum[])
  ) THEN
    RAISE EXCEPTION 'Forbidden: requires tenant admin (owner/admin/editor) or system_admin role for tenant %', p_tenant_id;
  END IF;
  
  -- Generate idempotency key if not provided
  v_final_idempotency_key := COALESCE(p_idempotency_key, gen_random_uuid()::text);
  
  -- Validate achievement exists, belongs to this tenant, and is awardable
  SELECT id, name, status, scope, tenant_id
  INTO v_achievement
  FROM public.achievements
  WHERE id = p_achievement_id;
  
  IF v_achievement IS NULL THEN
    RAISE EXCEPTION 'Achievement not found: %', p_achievement_id;
  END IF;
  
  -- Achievement must belong to the specified tenant
  IF v_achievement.tenant_id IS NULL OR v_achievement.tenant_id != p_tenant_id THEN
    RAISE EXCEPTION 'Achievement % does not belong to tenant %', p_achievement_id, p_tenant_id;
  END IF;
  
  IF v_achievement.status = 'archived' THEN
    RAISE EXCEPTION 'Cannot award archived achievement';
  END IF;
  
  IF v_achievement.status = 'draft' THEN
    RAISE EXCEPTION 'Cannot award draft achievement - activate it first';
  END IF;
  
  -- Validate all recipients are active members of this tenant
  SELECT ARRAY(
    SELECT uid FROM unnest(p_user_ids) AS uid
    WHERE NOT EXISTS (
      SELECT 1 FROM public.tenant_memberships tm
      WHERE tm.tenant_id = p_tenant_id 
        AND tm.user_id = uid 
        AND tm.status = 'active'
    )
  ) INTO v_invalid_member_ids;
  
  IF array_length(v_invalid_member_ids, 1) > 0 THEN
    RAISE EXCEPTION 'Users not members of tenant %: %', p_tenant_id, v_invalid_member_ids;
  END IF;
  
  -- Advisory lock for idempotency
  v_lock_key := hashtextextended(p_tenant_id::text || ':' || v_final_idempotency_key, 0);
  PERFORM pg_advisory_xact_lock(v_lock_key);
  
  -- Check for existing award with same idempotency key for this tenant
  SELECT id INTO v_existing_award_id
  FROM public.achievement_awards
  WHERE idempotency_key = v_final_idempotency_key
    AND tenant_id = p_tenant_id
  LIMIT 1;
  
  IF v_existing_award_id IS NOT NULL THEN
    -- Return existing award summary
    RETURN jsonb_build_object(
      'status', 'duplicate',
      'award_id', v_existing_award_id,
      'message', 'Award already processed with this idempotency key'
    );
  END IF;
  
  -- Create award event
  INSERT INTO public.achievement_awards (
    tenant_id,
    achievement_id,
    awarded_by,
    message,
    recipient_count,
    idempotency_key
  ) VALUES (
    p_tenant_id,
    p_achievement_id,
    v_actor_id,
    p_message,
    array_length(p_user_ids, 1),
    v_final_idempotency_key
  )
  RETURNING id INTO v_award_id;
  
  -- Process each user
  FOREACH v_user_id IN ARRAY p_user_ids
  LOOP
    -- Check if user already has this achievement
    SELECT id INTO v_existing_ua_id
    FROM public.user_achievements
    WHERE user_id = v_user_id AND achievement_id = p_achievement_id
    LIMIT 1;
    
    IF v_existing_ua_id IS NOT NULL THEN
      -- User already has achievement - record as duplicate
      INSERT INTO public.achievement_award_recipients (
        award_id,
        user_id,
        user_achievement_id,
        was_duplicate
      ) VALUES (
        v_award_id,
        v_user_id,
        v_existing_ua_id,
        TRUE
      );
      
      v_duplicate_count := v_duplicate_count + 1;
      v_duplicate_ids := array_append(v_duplicate_ids, v_user_id);
    ELSE
      -- Insert new user_achievement
      INSERT INTO public.user_achievements (
        achievement_id,
        user_id,
        tenant_id,
        unlocked_at
      ) VALUES (
        p_achievement_id,
        v_user_id,
        p_tenant_id,
        NOW()
      )
      ON CONFLICT (user_id, achievement_id) DO NOTHING
      RETURNING id INTO v_user_achievement_id;
      
      -- Handle race condition where ON CONFLICT triggered
      IF v_user_achievement_id IS NULL THEN
        SELECT id INTO v_user_achievement_id
        FROM public.user_achievements
        WHERE user_id = v_user_id AND achievement_id = p_achievement_id;
        
        INSERT INTO public.achievement_award_recipients (
          award_id,
          user_id,
          user_achievement_id,
          was_duplicate
        ) VALUES (
          v_award_id,
          v_user_id,
          v_user_achievement_id,
          TRUE
        );
        
        v_duplicate_count := v_duplicate_count + 1;
        v_duplicate_ids := array_append(v_duplicate_ids, v_user_id);
      ELSE
        -- Successfully created new unlock
        INSERT INTO public.achievement_award_recipients (
          award_id,
          user_id,
          user_achievement_id,
          was_duplicate
        ) VALUES (
          v_award_id,
          v_user_id,
          v_user_achievement_id,
          FALSE
        );
        
        v_inserted_count := v_inserted_count + 1;
        v_recipient_ids := array_append(v_recipient_ids, v_user_id);
      END IF;
    END IF;
  END LOOP;
  
  -- Return summary
  RETURN jsonb_build_object(
    'status', 'success',
    'award_id', v_award_id,
    'tenant_id', p_tenant_id,
    'achievement_id', p_achievement_id,
    'awarded_count', v_inserted_count,
    'duplicate_count', v_duplicate_count,
    'total_processed', v_inserted_count + v_duplicate_count,
    'recipient_ids', v_recipient_ids,
    'duplicate_ids', v_duplicate_ids,
    'idempotency_key', v_final_idempotency_key
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.tenant_mfa_policies_set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.time_bank_apply_delta(p_session_id uuid, p_delta_seconds integer, p_reason text, p_metadata jsonb DEFAULT '{}'::jsonb, p_event_id uuid DEFAULT NULL::uuid, p_actor_user_id uuid DEFAULT NULL::uuid, p_actor_participant_id uuid DEFAULT NULL::uuid, p_min_balance integer DEFAULT 0, p_max_balance integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_current INTEGER;
  v_previous INTEGER;
  v_requested INTEGER;
  v_applied INTEGER;
  v_new INTEGER;
  v_status TEXT;
BEGIN
  v_requested := COALESCE(p_delta_seconds, 0);

  -- Ensure row exists
  INSERT INTO public.session_time_bank (session_id, balance_seconds)
  VALUES (p_session_id, GREATEST(COALESCE(p_min_balance, 0), 0))
  ON CONFLICT (session_id) DO NOTHING;

  -- Lock row
  SELECT balance_seconds
  INTO v_current
  FROM public.session_time_bank
  WHERE session_id = p_session_id
  FOR UPDATE;

  v_previous := COALESCE(v_current, 0);

  -- Apply delta
  v_new := v_previous + v_requested;

  -- Enforce min
  IF p_min_balance IS NOT NULL THEN
    v_new := GREATEST(v_new, p_min_balance);
  ELSE
    v_new := GREATEST(v_new, 0);
  END IF;

  -- Enforce max
  IF p_max_balance IS NOT NULL THEN
    v_new := LEAST(v_new, p_max_balance);
  END IF;

  v_applied := v_new - v_previous;
  v_status := CASE WHEN v_applied = v_requested THEN 'applied' ELSE 'clamped' END;

  UPDATE public.session_time_bank
  SET balance_seconds = v_new
  WHERE session_id = p_session_id;

  INSERT INTO public.session_time_bank_ledger (
    session_id,
    delta_seconds,
    reason,
    metadata,
    event_id,
    actor_user_id,
    actor_participant_id
  ) VALUES (
    p_session_id,
    v_applied,
    p_reason,
    COALESCE(p_metadata, '{}'::jsonb),
    p_event_id,
    p_actor_user_id,
    p_actor_participant_id
  );

  RETURN jsonb_build_object(
    'status', v_status,
    'previous_balance', v_previous,
    'new_balance', v_new,
    'requested_delta', v_requested,
    'applied_delta', v_applied
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.to_text_array_safe(input text)
 RETURNS text[]
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN input IS NULL THEN NULL
    WHEN input ~ '^\s*\[.*\]\s*$' THEN ARRAY(SELECT jsonb_array_elements_text(input::jsonb))
    ELSE regexp_split_to_array(input, '\s*,\s*')
  END;
$function$
;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trg_plan_blocks_recalc_plan_total_time_minutes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    IF (OLD.plan_id IS DISTINCT FROM NEW.plan_id) THEN
      PERFORM public.recalc_plan_total_time_minutes(OLD.plan_id);
    END IF;
    PERFORM public.recalc_plan_total_time_minutes(NEW.plan_id);
    RETURN NULL;
  END IF;

  IF (TG_OP = 'DELETE') THEN
    PERFORM public.recalc_plan_total_time_minutes(OLD.plan_id);
    RETURN NULL;
  END IF;

  -- INSERT
  PERFORM public.recalc_plan_total_time_minutes(NEW.plan_id);
  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trg_plan_blocks_update_plan_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_plan_id uuid;
BEGIN
  -- Get plan_id from NEW or OLD depending on operation
  IF TG_OP = 'DELETE' THEN
    v_plan_id := OLD.plan_id;
  ELSE
    v_plan_id := NEW.plan_id;
  END IF;
  
  -- If plan was published and blocks change, mark as modified
  UPDATE public.plans 
  SET status = 'modified', updated_at = now()
  WHERE id = v_plan_id
  AND status = 'published'
  AND current_version_id IS NOT NULL;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trg_plans_update_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  -- If plan was published and name/description/metadata changes, mark as modified
  IF OLD.status = 'published' AND OLD.current_version_id IS NOT NULL THEN
    IF OLD.name IS DISTINCT FROM NEW.name 
       OR OLD.description IS DISTINCT FROM NEW.description 
       OR OLD.metadata IS DISTINCT FROM NEW.metadata THEN
      NEW.status := 'modified';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_categories_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_demo_sessions_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_dunning_timestamps()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_gift_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_learning_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_marketing_features_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_marketing_updates_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_participant_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE participant_sessions
    SET participant_count = participant_count + 1,
        updated_at = NOW()
    WHERE id = NEW.session_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE participant_sessions
    SET participant_count = GREATEST(0, participant_count - 1),
        updated_at = NOW()
    WHERE id = OLD.session_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_product_prices_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_purchase_intents_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.update_quote_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_run_sessions_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_support_faq_entries_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_tenant_domains_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_tenant_entitlement_seat_assignments_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.update_tenant_product_entitlements_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.upsert_game_content_v1(p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_game_id uuid;
  v_is_update boolean;
  v_import_run_id uuid;
  v_owner_tenant_id uuid;
  v_expected_tenant_id uuid;
  v_game_exists boolean;
  v_jwt_role text;

  -- Counters for response
  v_steps_count int := 0;
  v_phases_count int := 0;
  v_artifacts_count int := 0;
  v_variants_count int := 0;
  v_triggers_count int := 0;
  v_roles_count int := 0;
begin
  -- ---------------------------------------------------------------------------
  -- 0) Basic payload validation
  -- ---------------------------------------------------------------------------
  v_game_id := nullif(p_payload->>'game_id', '')::uuid;
  v_is_update := coalesce((p_payload->>'is_update')::boolean, false);
  v_import_run_id := nullif(p_payload->>'import_run_id', '')::uuid;
  v_expected_tenant_id := nullif(p_payload->>'expected_tenant_id', '')::uuid;

  if v_game_id is null then
    return jsonb_build_object('ok', false, 'error', 'Missing game_id', 'code', 'MISSING_GAME_ID');
  end if;

  -- ---------------------------------------------------------------------------
  -- 1) Auth / caller guard
  -- ---------------------------------------------------------------------------
  -- Check JWT role claim (works with PostgREST + Supabase client)
  begin
    v_jwt_role := current_setting('request.jwt.claims', true)::jsonb->>'role';
  exception when others then
    v_jwt_role := null;
  end;

  -- Allow:
  --   - authenticated user (auth.uid() not null), or
  --   - service_role JWT
  if auth.uid() is null and v_jwt_role <> 'service_role' then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated', 'code', 'AUTH_REQUIRED');
  end if;

  -- ---------------------------------------------------------------------------
  -- 2) Game existence + Tenant ownership check (BEFORE any writes)
  -- ---------------------------------------------------------------------------
  select exists(select 1 from public.games where id = v_game_id)
    into v_game_exists;
    
  if not v_game_exists then
    return jsonb_build_object('ok', false, 'error', 'Game not found', 'code', 'GAME_NOT_FOUND');
  end if;

  select owner_tenant_id
    into v_owner_tenant_id
  from public.games
  where id = v_game_id;

  if v_expected_tenant_id is not null 
     and v_owner_tenant_id is not null 
     and v_expected_tenant_id <> v_owner_tenant_id then
    return jsonb_build_object('ok', false, 'error', 'Tenant mismatch', 'code', 'TENANT_MISMATCH');
  end if;

  raise log 'upsert_game_content_v1 run=% game=% is_update=%',
    coalesce(v_import_run_id::text, 'null'), v_game_id, v_is_update;

  -- ---------------------------------------------------------------------------
  -- 3) Atomic write block (subtransaction)
  -- ---------------------------------------------------------------------------
  begin
    if v_is_update then
      delete from public.game_artifact_variants
      where artifact_id in (
        select id from public.game_artifacts where game_id = v_game_id
      );
      delete from public.game_triggers where game_id = v_game_id;
      delete from public.game_artifacts where game_id = v_game_id;
      delete from public.game_steps where game_id = v_game_id;
      delete from public.game_phases where game_id = v_game_id;
      delete from public.game_roles where game_id = v_game_id;
      delete from public.game_materials where game_id = v_game_id;
      delete from public.game_board_config where game_id = v_game_id;
      delete from public.game_secondary_purposes where game_id = v_game_id;
    end if;

    -- Phases
    if (p_payload ? 'phases') 
       and jsonb_typeof(p_payload->'phases') = 'array' 
       and jsonb_array_length(p_payload->'phases') > 0 
    then
      insert into public.game_phases (
        id, game_id, phase_order, name, phase_type,
        duration_seconds, timer_visible, timer_style,
        description, board_message, auto_advance, locale
      )
      select
        (ph->>'id')::uuid, v_game_id, (ph->>'phase_order')::int,
        ph->>'name', coalesce(ph->>'phase_type', 'round'),
        nullif(ph->>'duration_seconds', '')::int,
        coalesce((ph->>'timer_visible')::boolean, true),
        coalesce(ph->>'timer_style', 'countdown'),
        ph->>'description', ph->>'board_message',
        coalesce((ph->>'auto_advance')::boolean, false),
        ph->>'locale'
      from jsonb_array_elements(p_payload->'phases') as ph;
      get diagnostics v_phases_count = row_count;
    end if;

    -- Steps
    if (p_payload ? 'steps') 
       and jsonb_typeof(p_payload->'steps') = 'array' 
       and jsonb_array_length(p_payload->'steps') > 0 
    then
      insert into public.game_steps (
        id, game_id, step_order, title, body,
        duration_seconds, leader_script, participant_prompt,
        board_text, optional, locale, phase_id,
        conditional, media_ref, display_mode
      )
      select
        (s->>'id')::uuid, v_game_id, (s->>'step_order')::int,
        s->>'title', s->>'body',
        nullif(s->>'duration_seconds', '')::int,
        s->>'leader_script', s->>'participant_prompt',
        s->>'board_text', coalesce((s->>'optional')::boolean, false),
        s->>'locale', nullif(s->>'phase_id', '')::uuid,
        s->>'conditional', nullif(s->>'media_ref', '')::uuid,
        s->>'display_mode'
      from jsonb_array_elements(p_payload->'steps') as s;
      get diagnostics v_steps_count = row_count;
    end if;

    -- Roles (fixed: safe check for conflicts_with array)
    if (p_payload ? 'roles') 
       and jsonb_typeof(p_payload->'roles') = 'array' 
       and jsonb_array_length(p_payload->'roles') > 0 
    then
      insert into public.game_roles (
        id, game_id, role_order, name, icon, color,
        public_description, private_instructions, private_hints,
        min_count, max_count, assignment_strategy,
        scaling_rules, conflicts_with, locale
      )
      select
        (r->>'id')::uuid, v_game_id, (r->>'role_order')::int,
        r->>'name', r->>'icon', r->>'color',
        r->>'public_description', coalesce(r->>'private_instructions', ''),
        r->>'private_hints', coalesce((r->>'min_count')::int, 1),
        nullif(r->>'max_count', '')::int,
        coalesce(r->>'assignment_strategy', 'random'),
        (r->'scaling_rules')::jsonb,
        -- FIXED: safe check for array type before getting length
        case 
          when r ? 'conflicts_with' 
               and r->'conflicts_with' is not null
               and jsonb_typeof(r->'conflicts_with') = 'array' 
               and jsonb_array_length(r->'conflicts_with') > 0 
          then (select array_agg(elem::uuid) from jsonb_array_elements_text(r->'conflicts_with') as elem)
          else null 
        end,
        r->>'locale'
      from jsonb_array_elements(p_payload->'roles') as r;
      get diagnostics v_roles_count = row_count;
    end if;

    -- Materials
    if (p_payload ? 'materials') and p_payload->'materials' is not null then
      insert into public.game_materials (game_id, items, safety_notes, preparation, locale)
      values (
        v_game_id,
        case when p_payload->'materials' ? 'items' 
             then array(select jsonb_array_elements_text(p_payload->'materials'->'items'))
             else array[]::text[] end,
        p_payload->'materials'->>'safety_notes',
        p_payload->'materials'->>'preparation',
        p_payload->'materials'->>'locale'
      );
    end if;

    -- Board config
    if (p_payload ? 'board_config') and p_payload->'board_config' is not null then
      insert into public.game_board_config (
        game_id, show_game_name, show_current_phase, show_timer,
        show_participants, show_public_roles, show_leaderboard, show_qr_code,
        welcome_message, theme, background_color, layout_variant,
        locale, background_media_id
      )
      values (
        v_game_id,
        coalesce((p_payload->'board_config'->>'show_game_name')::boolean, true),
        coalesce((p_payload->'board_config'->>'show_current_phase')::boolean, true),
        coalesce((p_payload->'board_config'->>'show_timer')::boolean, true),
        coalesce((p_payload->'board_config'->>'show_participants')::boolean, true),
        coalesce((p_payload->'board_config'->>'show_public_roles')::boolean, true),
        coalesce((p_payload->'board_config'->>'show_leaderboard')::boolean, false),
        coalesce((p_payload->'board_config'->>'show_qr_code')::boolean, true),
        p_payload->'board_config'->>'welcome_message',
        coalesce(p_payload->'board_config'->>'theme', 'neutral'),
        p_payload->'board_config'->>'background_color',
        coalesce(p_payload->'board_config'->>'layout_variant', 'standard'),
        p_payload->'board_config'->>'locale',
        nullif(p_payload->'board_config'->>'background_media_id', '')::uuid
      );
    end if;

    -- Secondary purposes
    if (p_payload ? 'secondary_purpose_ids') 
       and jsonb_typeof(p_payload->'secondary_purpose_ids') = 'array' 
       and jsonb_array_length(p_payload->'secondary_purpose_ids') > 0 
    then
      insert into public.game_secondary_purposes (game_id, purpose_id)
      select v_game_id, (elem)::uuid
      from jsonb_array_elements_text(p_payload->'secondary_purpose_ids') as elem;
    end if;

    -- Artifacts
    if (p_payload ? 'artifacts') 
       and jsonb_typeof(p_payload->'artifacts') = 'array' 
       and jsonb_array_length(p_payload->'artifacts') > 0 
    then
      insert into public.game_artifacts (
        id, game_id, artifact_order, artifact_type, title,
        description, metadata, tags, locale
      )
      select
        (a->>'id')::uuid, v_game_id, (a->>'artifact_order')::int,
        a->>'artifact_type', a->>'title', a->>'description',
        coalesce(a->'metadata', '{}'::jsonb),
        case when a ? 'tags' then array(select jsonb_array_elements_text(a->'tags')) else array[]::text[] end,
        a->>'locale'
      from jsonb_array_elements(p_payload->'artifacts') as a;
      get diagnostics v_artifacts_count = row_count;
    end if;

    -- Artifact variants
    if (p_payload ? 'artifact_variants') 
       and jsonb_typeof(p_payload->'artifact_variants') = 'array' 
       and jsonb_array_length(p_payload->'artifact_variants') > 0 
    then
      insert into public.game_artifact_variants (
        artifact_id, visibility, visible_to_role_id,
        title, body, media_ref, variant_order, metadata
      )
      select
        (v->>'artifact_id')::uuid, coalesce(v->>'visibility', 'public'),
        nullif(v->>'visible_to_role_id', '')::uuid,
        v->>'title', v->>'body', nullif(v->>'media_ref', '')::uuid,
        coalesce((v->>'variant_order')::int, 0),
        coalesce(v->'metadata', '{}'::jsonb)
      from jsonb_array_elements(p_payload->'artifact_variants') as v;
      get diagnostics v_variants_count = row_count;
    end if;

    -- Triggers
    if (p_payload ? 'triggers') 
       and jsonb_typeof(p_payload->'triggers') = 'array' 
       and jsonb_array_length(p_payload->'triggers') > 0 
    then
      insert into public.game_triggers (
        id, game_id, name, description, enabled,
        condition, actions, execute_once, delay_seconds, sort_order
      )
      select
        (t->>'id')::uuid, v_game_id, t->>'name', t->>'description',
        coalesce((t->>'enabled')::boolean, true),
        coalesce(t->'condition', '{}'::jsonb),
        coalesce(t->'actions', '[]'::jsonb),
        coalesce((t->>'execute_once')::boolean, false),
        coalesce((t->>'delay_seconds')::int, 0),
        coalesce((t->>'sort_order')::int, 0)
      from jsonb_array_elements(p_payload->'triggers') as t;
      get diagnostics v_triggers_count = row_count;
    end if;

  exception when others then
    raise log 'upsert_game_content_v1 FAILED run=% game=% error=% code=%',
      coalesce(v_import_run_id::text, 'null'), v_game_id, sqlerrm, sqlstate;
    return jsonb_build_object('ok', false, 'error', sqlerrm, 'code', sqlstate);
  end;

  raise log 'upsert_game_content_v1 SUCCESS run=% game=% steps=% phases=% artifacts=% triggers=%',
    coalesce(v_import_run_id::text, 'null'), v_game_id,
    v_steps_count, v_phases_count, v_artifacts_count, v_triggers_count;

  return jsonb_build_object(
    'ok', true,
    'counts', jsonb_build_object(
      'steps', v_steps_count,
      'phases', v_phases_count,
      'artifacts', v_artifacts_count,
      'variants', v_variants_count,
      'triggers', v_triggers_count,
      'roles', v_roles_count
    )
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.upsert_game_reaction(p_game_id uuid, p_reaction text DEFAULT NULL::text)
 RETURNS TABLE(reaction text, created boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_existing TEXT;
  v_created BOOLEAN := false;
BEGIN
  -- Validate user is authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate reaction value
  IF p_reaction IS NOT NULL AND p_reaction NOT IN ('like', 'dislike') THEN
    RAISE EXCEPTION 'Invalid reaction: %', p_reaction;
  END IF;

  -- Get current reaction
  SELECT gr.reaction INTO v_existing
  FROM public.game_reactions gr
  WHERE gr.user_id = v_user_id AND gr.game_id = p_game_id;

  IF p_reaction IS NULL THEN
    -- Delete (set to neutral)
    DELETE FROM public.game_reactions
    WHERE user_id = v_user_id AND game_id = p_game_id;
    
    RETURN QUERY SELECT NULL::TEXT, false;
  ELSIF v_existing IS NULL THEN
    -- Insert new reaction
    INSERT INTO game_reactions (user_id, game_id, reaction)
    VALUES (v_user_id, p_game_id, p_reaction);
    
    v_created := true;
    RETURN QUERY SELECT p_reaction, true;
  ELSIF v_existing = p_reaction THEN
    -- Same reaction = toggle off (delete)
    DELETE FROM public.game_reactions
    WHERE user_id = v_user_id AND game_id = p_game_id;
    
    RETURN QUERY SELECT NULL::TEXT, false;
  ELSE
    -- Different reaction = update
    UPDATE game_reactions
    SET reaction = p_reaction
    WHERE user_id = v_user_id AND game_id = p_game_id;
    
    RETURN QUERY SELECT p_reaction, false;
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.user_requires_mfa(target_user_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(required boolean, reason text, grace_period_end timestamp with time zone, enrolled boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_is_system_admin BOOLEAN := false;
  v_is_tenant_admin BOOLEAN := false;
  v_tenant_policy_requires BOOLEAN := false;
  v_enrolled_at TIMESTAMPTZ;
  v_grace_period_end TIMESTAMPTZ;
BEGIN
  -- Use provided user_id or current user
  v_user_id := COALESCE(target_user_id, auth.uid());
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::TEXT, NULL::TIMESTAMPTZ, false;
    RETURN;
  END IF;
  
  -- Check if user is enrolled
  SELECT um.enrolled_at, um.grace_period_end
  INTO v_enrolled_at, v_grace_period_end
  FROM public.user_mfa um
  WHERE um.user_id = v_user_id;
  
  -- Check if system admin
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = v_user_id AND u.global_role = 'system_admin'
  ) INTO v_is_system_admin;
  
  IF v_is_system_admin THEN
    RETURN QUERY SELECT 
      true,
      'system_admin'::TEXT,
      v_grace_period_end,
      (v_enrolled_at IS NOT NULL);
    RETURN;
  END IF;
  
  -- Check if tenant admin (owner or admin role in any tenant)
  SELECT EXISTS (
    SELECT 1 FROM public.user_tenant_memberships utm
    WHERE utm.user_id = v_user_id
      AND utm.status = 'active'
      AND utm.role IN ('owner', 'admin')
  ) INTO v_is_tenant_admin;
  
  IF v_is_tenant_admin THEN
    RETURN QUERY SELECT 
      true,
      'tenant_admin'::TEXT,
      v_grace_period_end,
      (v_enrolled_at IS NOT NULL);
    RETURN;
  END IF;
  
  -- Check tenant policies that enforce for all users
  SELECT EXISTS (
    SELECT 1 
    FROM public.tenant_mfa_policies tmp
    JOIN public.user_tenant_memberships utm ON utm.tenant_id = tmp.tenant_id
    WHERE utm.user_id = v_user_id
      AND utm.status = 'active'
      AND tmp.is_enforced = true
      AND tmp.enforcement_level = 'all_users'
  ) INTO v_tenant_policy_requires;
  
  IF v_tenant_policy_requires THEN
    RETURN QUERY SELECT 
      true,
      'tenant_policy'::TEXT,
      v_grace_period_end,
      (v_enrolled_at IS NOT NULL);
    RETURN;
  END IF;
  
  -- MFA not required
  RETURN QUERY SELECT 
    false,
    NULL::TEXT,
    NULL::TIMESTAMPTZ,
    (v_enrolled_at IS NOT NULL);
END;
$function$
;

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- 8. TRIGGERS
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

CREATE TRIGGER audit_achievement_translations AFTER INSERT OR DELETE OR UPDATE ON public.achievement_translations FOR EACH ROW EXECUTE FUNCTION public.log_translation_change();
CREATE TRIGGER update_achievement_translations_updated_at BEFORE UPDATE ON public.achievement_translations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER achievements_updated_at_trigger BEFORE UPDATE ON public.achievements FOR EACH ROW EXECUTE FUNCTION public.achievements_set_updated_at();
CREATE TRIGGER badge_presets_updated_at BEFORE UPDATE ON public.badge_presets FOR EACH ROW EXECUTE FUNCTION public.badge_presets_set_updated_at();
CREATE TRIGGER bundle_items_updated_at BEFORE UPDATE ON public.bundle_items FOR EACH ROW EXECUTE FUNCTION public.bundle_items_update_timestamp();
CREATE TRIGGER categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_categories_updated_at();
CREATE TRIGGER trg_categories_slug_collision BEFORE INSERT OR UPDATE OF slug ON public.categories FOR EACH ROW EXECUTE FUNCTION public.guard_category_slug_collision();
CREATE TRIGGER trg_conversation_card_collections_updated BEFORE UPDATE ON public.conversation_card_collections FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_conversation_cards_updated BEFORE UPDATE ON public.conversation_cards FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER data_breach_notifications_updated_at BEFORE UPDATE ON public.data_breach_notifications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER data_retention_policies_updated_at BEFORE UPDATE ON public.data_retention_policies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER demo_sessions_updated_at BEFORE UPDATE ON public.demo_sessions FOR EACH ROW EXECUTE FUNCTION public.update_demo_sessions_updated_at();
CREATE TRIGGER dunning_config_updated BEFORE UPDATE ON public.dunning_config FOR EACH ROW EXECUTE FUNCTION public.update_dunning_timestamps();
CREATE TRIGGER trg_game_artifact_variants_updated BEFORE UPDATE ON public.game_artifact_variants FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_game_artifacts_updated BEFORE UPDATE ON public.game_artifacts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_game_board_config_updated BEFORE UPDATE ON public.game_board_config FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_game_materials_updated BEFORE UPDATE ON public.game_materials FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_game_phases_updated BEFORE UPDATE ON public.game_phases FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER game_reactions_updated_at BEFORE UPDATE ON public.game_reactions FOR EACH ROW EXECUTE FUNCTION public.game_reactions_set_updated_at();
CREATE TRIGGER trg_game_roles_updated BEFORE UPDATE ON public.game_roles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_game_steps_updated BEFORE UPDATE ON public.game_steps FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_game_tools_updated BEFORE UPDATE ON public.game_tools FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_game_triggers_updated BEFORE UPDATE ON public.game_triggers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER gdpr_requests_updated_at BEFORE UPDATE ON public.gdpr_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER gift_purchases_updated BEFORE UPDATE ON public.gift_purchases FOR EACH ROW EXECUTE FUNCTION public.update_gift_timestamp();
CREATE TRIGGER audit_learning_course_translations AFTER INSERT OR DELETE OR UPDATE ON public.learning_course_translations FOR EACH ROW EXECUTE FUNCTION public.log_translation_change();
CREATE TRIGGER update_learning_course_translations_updated_at BEFORE UPDATE ON public.learning_course_translations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER learning_courses_updated_at BEFORE UPDATE ON public.learning_courses FOR EACH ROW EXECUTE FUNCTION public.update_learning_updated_at();
CREATE TRIGGER audit_learning_path_translations AFTER INSERT OR DELETE OR UPDATE ON public.learning_path_translations FOR EACH ROW EXECUTE FUNCTION public.log_translation_change();
CREATE TRIGGER update_learning_path_translations_updated_at BEFORE UPDATE ON public.learning_path_translations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER learning_paths_updated_at BEFORE UPDATE ON public.learning_paths FOR EACH ROW EXECUTE FUNCTION public.update_learning_updated_at();
CREATE TRIGGER learning_requirements_updated_at BEFORE UPDATE ON public.learning_requirements FOR EACH ROW EXECUTE FUNCTION public.update_learning_updated_at();
CREATE TRIGGER learning_user_progress_updated_at BEFORE UPDATE ON public.learning_user_progress FOR EACH ROW EXECUTE FUNCTION public.update_learning_updated_at();
CREATE TRIGGER marketing_features_updated_at BEFORE UPDATE ON public.marketing_features FOR EACH ROW EXECUTE FUNCTION public.update_marketing_features_updated_at();
CREATE TRIGGER marketing_updates_updated_at BEFORE UPDATE ON public.marketing_updates FOR EACH ROW EXECUTE FUNCTION public.update_marketing_updates_updated_at();
CREATE TRIGGER audit_notification_template_translations AFTER INSERT OR DELETE OR UPDATE ON public.notification_template_translations FOR EACH ROW EXECUTE FUNCTION public.log_translation_change();
CREATE TRIGGER update_notification_template_translations_updated_at BEFORE UPDATE ON public.notification_template_translations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trigger_participant_sessions_updated_at BEFORE UPDATE ON public.participant_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trigger_token_quotas_updated_at BEFORE UPDATE ON public.participant_token_quotas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trigger_participants_updated_at BEFORE UPDATE ON public.participants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trigger_update_participant_count AFTER INSERT OR DELETE ON public.participants FOR EACH ROW EXECUTE FUNCTION public.update_participant_count();
CREATE TRIGGER payment_failures_updated BEFORE UPDATE ON public.payment_failures FOR EACH ROW EXECUTE FUNCTION public.update_dunning_timestamps();
CREATE TRIGGER plan_blocks_recalc_plan_total_time_minutes_del AFTER DELETE ON public.plan_blocks FOR EACH ROW EXECUTE FUNCTION public.trg_plan_blocks_recalc_plan_total_time_minutes();
CREATE TRIGGER plan_blocks_recalc_plan_total_time_minutes_ins AFTER INSERT ON public.plan_blocks FOR EACH ROW EXECUTE FUNCTION public.trg_plan_blocks_recalc_plan_total_time_minutes();
CREATE TRIGGER plan_blocks_recalc_plan_total_time_minutes_upd AFTER UPDATE OF duration_minutes, game_id, block_type, plan_id ON public.plan_blocks FOR EACH ROW EXECUTE FUNCTION public.trg_plan_blocks_recalc_plan_total_time_minutes();
CREATE TRIGGER plan_blocks_update_status_del AFTER DELETE ON public.plan_blocks FOR EACH ROW EXECUTE FUNCTION public.trg_plan_blocks_update_plan_status();
CREATE TRIGGER plan_blocks_update_status_ins AFTER INSERT ON public.plan_blocks FOR EACH ROW EXECUTE FUNCTION public.trg_plan_blocks_update_plan_status();
CREATE TRIGGER plan_blocks_update_status_upd AFTER UPDATE ON public.plan_blocks FOR EACH ROW EXECUTE FUNCTION public.trg_plan_blocks_update_plan_status();
CREATE TRIGGER plans_update_status BEFORE UPDATE ON public.plans FOR EACH ROW EXECUTE FUNCTION public.trg_plans_update_status();
CREATE TRIGGER product_prices_updated_at BEFORE UPDATE ON public.product_prices FOR EACH ROW EXECUTE FUNCTION public.update_product_prices_updated_at();
CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_products_slug_collision BEFORE INSERT OR UPDATE OF product_key ON public.products FOR EACH ROW EXECUTE FUNCTION public.guard_product_slug_collision();
CREATE TRIGGER purchase_intents_updated_at BEFORE UPDATE ON public.purchase_intents FOR EACH ROW EXECUTE FUNCTION public.update_purchase_intents_updated_at();
CREATE TRIGGER quote_line_items_calculate_total BEFORE INSERT OR UPDATE ON public.quote_line_items FOR EACH ROW EXECUTE FUNCTION public.calculate_line_item_total();
CREATE TRIGGER quotes_updated BEFORE UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.update_quote_timestamp();
CREATE TRIGGER trg_run_sessions_updated_at BEFORE UPDATE ON public.run_sessions FOR EACH ROW EXECUTE FUNCTION public.update_run_sessions_updated_at();
CREATE TRIGGER trg_session_artifact_state_updated BEFORE UPDATE ON public.session_artifact_state FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_session_decisions_updated BEFORE UPDATE ON public.session_decisions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_session_outcomes_updated BEFORE UPDATE ON public.session_outcomes FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_session_time_bank_updated BEFORE UPDATE ON public.session_time_bank FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_session_trigger_state_updated BEFORE UPDATE ON public.session_trigger_state FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_session_triggers_updated BEFORE UPDATE ON public.session_triggers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER audit_shop_item_translations AFTER INSERT OR DELETE OR UPDATE ON public.shop_item_translations FOR EACH ROW EXECUTE FUNCTION public.log_translation_change();
CREATE TRIGGER update_shop_item_translations_updated_at BEFORE UPDATE ON public.shop_item_translations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_spatial_artifacts_guard_scope BEFORE UPDATE ON public.spatial_artifacts FOR EACH ROW EXECUTE FUNCTION public.spatial_artifacts_guard_scope();
CREATE TRIGGER trigger_update_support_faq_entries_updated_at BEFORE UPDATE ON public.support_faq_entries FOR EACH ROW EXECUTE FUNCTION public.update_support_faq_entries_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.system_design_config FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.tenant_design_config FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();
CREATE TRIGGER tenant_domains_updated_at_trigger BEFORE UPDATE ON public.tenant_domains FOR EACH ROW EXECUTE FUNCTION public.update_tenant_domains_updated_at();
CREATE TRIGGER tenant_entitlement_seat_assignments_capacity BEFORE INSERT OR UPDATE ON public.tenant_entitlement_seat_assignments FOR EACH ROW EXECUTE FUNCTION public.assert_entitlement_seat_capacity();
CREATE TRIGGER tenant_entitlement_seat_assignments_updated_at BEFORE UPDATE ON public.tenant_entitlement_seat_assignments FOR EACH ROW EXECUTE FUNCTION public.update_tenant_entitlement_seat_assignments_updated_at();
CREATE TRIGGER tenant_mfa_policies_updated_at BEFORE UPDATE ON public.tenant_mfa_policies FOR EACH ROW EXECUTE FUNCTION public.tenant_mfa_policies_set_updated_at();
CREATE TRIGGER tenant_product_entitlements_updated_at BEFORE UPDATE ON public.tenant_product_entitlements FOR EACH ROW EXECUTE FUNCTION public.update_tenant_product_entitlements_updated_at();
CREATE TRIGGER update_tenant_translation_overrides_updated_at BEFORE UPDATE ON public.tenant_translation_overrides FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER usage_meters_updated BEFORE UPDATE ON public.usage_meters FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER usage_summaries_updated BEFORE UPDATE ON public.usage_summaries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER user_consents_updated_at BEFORE UPDATE ON public.user_consents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER enforce_demo_flags BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.enforce_demo_flag_protection();

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- 9. ROW LEVEL SECURITY
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

ALTER TABLE public.achievement_award_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievement_awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievement_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_timeseries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anonymous_cookie_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.award_builder_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badge_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_product_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.browse_search_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bundle_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_diagram_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_policy_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_filter_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_card_collection_secondary_purposes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_card_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cookie_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cookie_consent_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cookie_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cosmetic_unlock_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cosmetics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_access_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_breach_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_retention_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dunning_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dunning_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funnel_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_artifact_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_board_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_secondary_purposes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gamification_admin_award_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gamification_admin_award_request_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gamification_admin_award_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gamification_admin_awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gamification_automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gamification_burn_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gamification_burn_sinks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gamification_campaign_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gamification_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gamification_cooldowns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gamification_daily_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gamification_daily_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gamification_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gamification_level_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gamification_softcap_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gdpr_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interest_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leader_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_course_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_course_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_path_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_path_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_path_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_document_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_ai_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mfa_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mfa_trusted_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.migration_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.multiplayer_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.multiplayer_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_template_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_legal_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participant_achievement_unlocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participant_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participant_game_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participant_role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participant_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participant_token_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_failures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personalization_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_notes_private ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_notes_tenant ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_play_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_version_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.play_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_cosmetics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_purposes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_usage_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purposes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.run_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_job_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasonal_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_artifact_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_artifact_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_artifact_variant_assignments_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_artifact_variant_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_artifact_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_time_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_time_bank_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_trigger_idempotency ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_trigger_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_item_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_leaderboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spatial_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_faq_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_design_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_jobs_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_design_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_entitlement_seat_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_mfa_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_product_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_restore_vault ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_seat_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_translation_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_routing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.translation_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.translation_missing_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trial_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_meters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievement_showcase ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_coins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_cosmetic_loadout ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_cosmetics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_currency_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_gamification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_journey_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_legal_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_mfa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_powerup_consumptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_powerup_effects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_powerup_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_restrictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tenant_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.virtual_currencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "achievement_award_recipients_service_role" ON public.achievement_award_recipients
  USING ((auth.role() = 'service_role'::text))
  WITH CHECK ((auth.role() = 'service_role'::text));
CREATE POLICY "achievement_award_recipients_system_admin" ON public.achievement_award_recipients
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());
CREATE POLICY "achievement_award_recipients_tenant_admin_insert" ON public.achievement_award_recipients FOR INSERT
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.achievement_awards aa
  WHERE ((aa.id = achievement_award_recipients.award_id) AND (aa.tenant_id IS NOT NULL) AND public.has_tenant_role(aa.tenant_id, ARRAY['owner'::public.tenant_role_enum, 'admin'::public.tenant_role_enum, 'editor'::public.tenant_role_enum])))));
CREATE POLICY "achievement_award_recipients_tenant_admin_select" ON public.achievement_award_recipients FOR SELECT
  USING ((EXISTS ( SELECT 1
   FROM public.achievement_awards aa
  WHERE ((aa.id = achievement_award_recipients.award_id) AND (aa.tenant_id IS NOT NULL) AND public.has_tenant_role(aa.tenant_id, ARRAY['owner'::public.tenant_role_enum, 'admin'::public.tenant_role_enum])))));
CREATE POLICY "achievement_awards_service_role" ON public.achievement_awards
  USING ((auth.role() = 'service_role'::text))
  WITH CHECK ((auth.role() = 'service_role'::text));
CREATE POLICY "achievement_awards_system_admin" ON public.achievement_awards
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());
CREATE POLICY "achievement_awards_tenant_admin_insert" ON public.achievement_awards FOR INSERT
  WITH CHECK (((tenant_id IS NOT NULL) AND public.has_tenant_role(tenant_id, ARRAY['owner'::public.tenant_role_enum, 'admin'::public.tenant_role_enum, 'editor'::public.tenant_role_enum])));
CREATE POLICY "achievement_awards_tenant_admin_select" ON public.achievement_awards FOR SELECT
  USING (((tenant_id IS NOT NULL) AND public.has_tenant_role(tenant_id, ARRAY['owner'::public.tenant_role_enum, 'admin'::public.tenant_role_enum])));
CREATE POLICY "achievement_leaderboards_select" ON public.achievement_leaderboards FOR SELECT
  USING (true);
CREATE POLICY "achievement_translations_admin_all" ON public.achievement_translations
  USING ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = ( SELECT auth.uid() AS uid)) AND (u.global_role = 'system_admin'::public.global_role_enum)))));
CREATE POLICY "achievement_translations_select" ON public.achievement_translations FOR SELECT
  USING (true);
CREATE POLICY "achievements_admin_manage" ON public.achievements
  USING ((public.is_system_admin() OR ((scope = 'tenant'::text) AND public.has_tenant_role(scope_tenant_id, ARRAY['owner'::public.tenant_role_enum, 'admin'::public.tenant_role_enum]))))
  WITH CHECK ((public.is_system_admin() OR ((scope = 'tenant'::text) AND public.has_tenant_role(scope_tenant_id, ARRAY['owner'::public.tenant_role_enum, 'admin'::public.tenant_role_enum]))));
CREATE POLICY "achievements_select_v2" ON public.achievements FOR SELECT
  USING (((scope = 'global'::text) OR (scope_tenant_id = ANY (public.get_user_tenant_ids())) OR public.is_system_admin()));
CREATE POLICY "achievements_tenant_admin_delete" ON public.achievements FOR DELETE
  USING (((tenant_id IS NOT NULL) AND public.has_tenant_role(tenant_id, ARRAY['owner'::public.tenant_role_enum, 'admin'::public.tenant_role_enum, 'editor'::public.tenant_role_enum])));
CREATE POLICY "achievements_tenant_admin_insert" ON public.achievements FOR INSERT
  WITH CHECK (((tenant_id IS NOT NULL) AND public.has_tenant_role(tenant_id, ARRAY['owner'::public.tenant_role_enum, 'admin'::public.tenant_role_enum, 'editor'::public.tenant_role_enum])));
CREATE POLICY "achievements_tenant_admin_select" ON public.achievements FOR SELECT
  USING (((tenant_id IS NOT NULL) AND public.has_tenant_role(tenant_id, ARRAY['owner'::public.tenant_role_enum, 'admin'::public.tenant_role_enum, 'editor'::public.tenant_role_enum])));
CREATE POLICY "achievements_tenant_admin_update" ON public.achievements FOR UPDATE
  USING (((tenant_id IS NOT NULL) AND public.has_tenant_role(tenant_id, ARRAY['owner'::public.tenant_role_enum, 'admin'::public.tenant_role_enum, 'editor'::public.tenant_role_enum])))
  WITH CHECK (((tenant_id IS NOT NULL) AND public.has_tenant_role(tenant_id, ARRAY['owner'::public.tenant_role_enum, 'admin'::public.tenant_role_enum, 'editor'::public.tenant_role_enum])));
CREATE POLICY "service_role_can_insert_timeseries" ON public.analytics_timeseries FOR INSERT
  WITH CHECK (true);
CREATE POLICY "anonymous_cookie_consents_admin_read" ON public.anonymous_cookie_consents FOR SELECT
  USING (public.is_system_admin());
CREATE POLICY "anonymous_cookie_consents_update" ON public.anonymous_cookie_consents FOR UPDATE
  USING ((expires_at > now()))
  WITH CHECK (((consent_id IS NOT NULL) AND (length(consent_id) >= 32)));
CREATE POLICY "anonymous_cookie_consents_upsert" ON public.anonymous_cookie_consents FOR INSERT
  WITH CHECK (((consent_id IS NOT NULL) AND (length(consent_id) >= 32)));
CREATE POLICY "award_exports_admin" ON public.award_builder_exports
  USING ((public.is_system_admin() OR public.has_tenant_role(tenant_id, 'admin'::public.tenant_role_enum)))
  WITH CHECK ((public.is_system_admin() OR public.has_tenant_role(tenant_id, 'admin'::public.tenant_role_enum)));
CREATE POLICY "badge_presets_delete_policy" ON public.badge_presets FOR DELETE
  USING ((public.is_system_admin() OR (created_by_user_id = ( SELECT auth.uid() AS uid)) OR ((tenant_id IS NOT NULL) AND public.has_tenant_role(tenant_id, ARRAY['admin'::public.tenant_role_enum]))));
CREATE POLICY "badge_presets_insert_policy" ON public.badge_presets FOR INSERT
  WITH CHECK ((((tenant_id IS NULL) AND public.is_system_admin()) OR ((tenant_id IS NOT NULL) AND (public.is_system_admin() OR public.has_tenant_role(tenant_id, ARRAY['admin'::public.tenant_role_enum])))));
CREATE POLICY "badge_presets_select_policy" ON public.badge_presets FOR SELECT
  USING (((tenant_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.tenant_memberships tm
  WHERE ((tm.tenant_id = badge_presets.tenant_id) AND (tm.user_id = ( SELECT auth.uid() AS uid)))))));
CREATE POLICY "badge_presets_update_policy" ON public.badge_presets FOR UPDATE
  USING ((public.is_system_admin() OR (created_by_user_id = ( SELECT auth.uid() AS uid)) OR ((tenant_id IS NOT NULL) AND public.has_tenant_role(tenant_id, ARRAY['admin'::public.tenant_role_enum]))))
  WITH CHECK ((public.is_system_admin() OR (created_by_user_id = ( SELECT auth.uid() AS uid)) OR ((tenant_id IS NOT NULL) AND public.has_tenant_role(tenant_id, ARRAY['admin'::public.tenant_role_enum]))));
CREATE POLICY "billing_accounts_select" ON public.billing_accounts FOR SELECT
  USING (((( SELECT auth.uid() AS uid) = user_id) OR ((tenant_id IS NOT NULL) AND (tenant_id = ANY (public.get_user_tenant_ids()))) OR public.is_system_admin()));
CREATE POLICY "billing_events_manage" ON public.billing_events
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());
CREATE POLICY "billing_history_select" ON public.billing_history FOR SELECT
  USING (((tenant_id = ANY (public.get_user_tenant_ids())) OR public.is_system_admin()));
CREATE POLICY "billing_history_service_insert" ON public.billing_history FOR INSERT
  WITH CHECK (public.is_system_admin());
CREATE POLICY "billing_plans_manage_admin" ON public.billing_plans
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());
CREATE POLICY "billing_plans_select_all" ON public.billing_plans FOR SELECT
  USING (true);
CREATE POLICY "billing_product_features_manage" ON public.billing_product_features
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());
CREATE POLICY "billing_product_features_select" ON public.billing_product_features FOR SELECT
  USING (true);
CREATE POLICY "billing_products_select" ON public.billing_products FOR SELECT
  USING (((is_active = true) OR public.is_system_admin()));
CREATE POLICY "billing_products_select_anon" ON public.billing_products FOR SELECT
  USING ((is_active = true));
CREATE POLICY "billing_products_write_admin" ON public.billing_products
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());
CREATE POLICY "browse_search_logs_insert" ON public.browse_search_logs FOR INSERT
  WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "bug_reports_user_access" ON public.bug_reports
  USING (((user_id = ( SELECT auth.uid() AS uid)) OR public.is_system_admin()))
  WITH CHECK (((user_id = ( SELECT auth.uid() AS uid)) OR public.is_system_admin()));
CREATE POLICY "bundle_items_admin_delete" ON public.bundle_items FOR DELETE
  USING (public.is_system_admin());
CREATE POLICY "bundle_items_admin_insert" ON public.bundle_items FOR INSERT
  WITH CHECK (public.is_system_admin());
CREATE POLICY "bundle_items_admin_update" ON public.bundle_items FOR UPDATE
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());
CREATE POLICY "bundle_items_select_public" ON public.bundle_items FOR SELECT
  USING ((EXISTS ( SELECT 1
   FROM public.products p
  WHERE ((p.id = bundle_items.bundle_product_id) AND (p.status = 'active'::text) AND (p.is_bundle = true)))));
CREATE POLICY "categories_admin_all" ON public.categories
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());
CREATE POLICY "categories_public_select" ON public.categories FOR SELECT
  USING ((is_public = true));
CREATE POLICY "challenge_participation_insert" ON public.challenge_participation FOR INSERT
  WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "challenge_participation_select" ON public.challenge_participation FOR SELECT
  USING ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "diagram_exports_admin" ON public.coach_diagram_exports
  USING ((public.is_system_admin() OR public.has_tenant_role(tenant_id, 'admin'::public.tenant_role_enum)))
  WITH CHECK ((public.is_system_admin() OR public.has_tenant_role(tenant_id, 'admin'::public.tenant_role_enum)));
CREATE POLICY "service_can_insert_coin_transactions" ON public.coin_transactions FOR INSERT
  WITH CHECK ((auth.role() = 'service_role'::text));
CREATE POLICY "users_can_select_own_coin_transactions" ON public.coin_transactions FOR SELECT
  USING ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY "collection_items_select" ON public.collection_items FOR SELECT
  USING ((EXISTS ( SELECT 1
   FROM public.content_collections cc
  WHERE ((cc.id = collection_items.collection_id) AND ((cc.is_published = true) OR (cc.created_by_user_id = ( SELECT auth.uid() AS uid)) OR public.is_system_admin())))));
CREATE POLICY "community_challenges_select" ON public.community_challenges FOR SELECT
  USING (true);
CREATE POLICY "consent_policy_versions_admin_all" ON public.consent_policy_versions
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());
CREATE POLICY "consent_policy_versions_public_read" ON public.consent_policy_versions FOR SELECT
  USING ((effective_date <= now()));
CREATE POLICY "content_analytics_insert" ON public.content_analytics FOR INSERT
  WITH CHECK (((tenant_id = ANY (public.get_user_tenant_ids())) OR public.is_system_admin()));
CREATE POLICY "content_analytics_select" ON public.content_analytics FOR SELECT
  USING (((EXISTS ( SELECT 1
   FROM public.user_tenant_memberships utm
  WHERE ((utm.user_id = ( SELECT auth.uid() AS uid)) AND (utm.tenant_id = content_analytics.tenant_id)))) OR public.is_system_admin()));
CREATE POLICY "content_analytics_update" ON public.content_analytics FOR UPDATE
  USING (((EXISTS ( SELECT 1
   FROM public.user_tenant_memberships utm
  WHERE ((utm.user_id = ( SELECT auth.uid() AS uid)) AND (utm.tenant_id = content_analytics.tenant_id)))) OR public.is_system_admin()))
  WITH CHECK (((EXISTS ( SELECT 1
   FROM public.user_tenant_memberships utm
  WHERE ((utm.user_id = ( SELECT auth.uid() AS uid)) AND (utm.tenant_id = content_analytics.tenant_id)))) OR public.is_system_admin()));
CREATE POLICY "content_collections_select" ON public.content_collections FOR SELECT
  USING (((is_published = true) OR (created_by_user_id = ( SELECT auth.uid() AS uid)) OR public.is_system_admin()));
CREATE POLICY "content_filter_rules_admin" ON public.content_filter_rules
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());
CREATE POLICY "content_items_select" ON public.content_items FOR SELECT
  USING (((is_published = true) OR (created_by_user_id = ( SELECT auth.uid() AS uid)) OR public.is_system_admin()));
CREATE POLICY "content_preferences_manage" ON public.content_preferences
  USING ((user_id = ( SELECT auth.uid() AS uid)))
  WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "Users can view own reports" ON public.content_reports FOR SELECT
  USING ((reported_by_user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "content_reports_insert" ON public.content_reports FOR INSERT
  WITH CHECK ((reported_by_user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "content_schedules_select" ON public.content_schedules FOR SELECT
  USING (((EXISTS ( SELECT 1
   FROM public.user_tenant_memberships utm
  WHERE ((utm.user_id = ( SELECT auth.uid() AS uid)) AND (utm.tenant_id = content_schedules.tenant_id)))) OR public.is_system_admin()));
CREATE POLICY "ccc_secondary_purposes_delete" ON public.conversation_card_collection_secondary_purposes FOR DELETE
  USING ((EXISTS ( SELECT 1
   FROM public.conversation_card_collections c
  WHERE ((c.id = conversation_card_collection_secondary_purposes.collection_id) AND (((c.scope_type = 'global'::text) AND (c.tenant_id IS NULL) AND public.is_global_admin()) OR ((c.scope_type = 'tenant'::text) AND (c.tenant_id IS NOT NULL) AND (EXISTS ( SELECT 1
           FROM public.user_tenant_memberships m
          WHERE ((m.user_id = auth.uid()) AND (m.tenant_id = c.tenant_id) AND (m.status = 'active'::text) AND (m.role = ANY (ARRAY['owner'::public.tenant_role_enum, 'admin'::public.tenant_role_enum])))))))))));
CREATE POLICY "ccc_secondary_purposes_insert" ON public.conversation_card_collection_secondary_purposes FOR INSERT
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.conversation_card_collections c
  WHERE ((c.id = conversation_card_collection_secondary_purposes.collection_id) AND (((c.scope_type = 'global'::text) AND (c.tenant_id IS NULL) AND public.is_global_admin()) OR ((c.scope_type = 'tenant'::text) AND (c.tenant_id IS NOT NULL) AND (EXISTS ( SELECT 1
           FROM public.user_tenant_memberships m
          WHERE ((m.user_id = auth.uid()) AND (m.tenant_id = c.tenant_id) AND (m.status = 'active'::text) AND (m.role = ANY (ARRAY['owner'::public.tenant_role_enum, 'admin'::public.tenant_role_enum])))))))))));
CREATE POLICY "ccc_secondary_purposes_select" ON public.conversation_card_collection_secondary_purposes FOR SELECT
  USING ((EXISTS ( SELECT 1
   FROM public.conversation_card_collections c
  WHERE ((c.id = conversation_card_collection_secondary_purposes.collection_id) AND (((c.scope_type = 'global'::text) AND (c.status = 'published'::text)) OR ((auth.role() = 'authenticated'::text) AND (c.scope_type = 'tenant'::text) AND (c.tenant_id IN ( SELECT user_tenant_memberships.tenant_id
           FROM public.user_tenant_memberships
          WHERE (user_tenant_memberships.user_id = auth.uid())))) OR public.is_global_admin())))));
CREATE POLICY "conversation_card_collections_delete" ON public.conversation_card_collections FOR DELETE
  USING ((((scope_type = 'global'::text) AND (tenant_id IS NULL) AND public.is_global_admin()) OR ((scope_type = 'tenant'::text) AND (tenant_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.user_tenant_memberships m
  WHERE ((m.user_id = auth.uid()) AND (m.tenant_id = conversation_card_collections.tenant_id) AND (m.status = 'active'::text) AND (m.role = ANY (ARRAY['owner'::public.tenant_role_enum, 'admin'::public.tenant_role_enum]))))))));
CREATE POLICY "conversation_card_collections_insert" ON public.conversation_card_collections FOR INSERT
  WITH CHECK ((((scope_type = 'global'::text) AND (tenant_id IS NULL) AND public.is_global_admin()) OR ((scope_type = 'tenant'::text) AND (tenant_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.user_tenant_memberships m
  WHERE ((m.user_id = auth.uid()) AND (m.tenant_id = conversation_card_collections.tenant_id) AND (m.status = 'active'::text) AND (m.role = ANY (ARRAY['owner'::public.tenant_role_enum, 'admin'::public.tenant_role_enum]))))))));
CREATE POLICY "conversation_card_collections_select" ON public.conversation_card_collections FOR SELECT
  USING ((((scope_type = 'global'::text) AND (status = 'published'::text)) OR ((auth.role() = 'authenticated'::text) AND (scope_type = 'tenant'::text) AND (tenant_id IN ( SELECT user_tenant_memberships.tenant_id
   FROM public.user_tenant_memberships
  WHERE (user_tenant_memberships.user_id = auth.uid())))) OR public.is_global_admin()));
CREATE POLICY "conversation_card_collections_update" ON public.conversation_card_collections FOR UPDATE
  USING ((((scope_type = 'global'::text) AND (tenant_id IS NULL) AND public.is_global_admin()) OR ((scope_type = 'tenant'::text) AND (tenant_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.user_tenant_memberships m
  WHERE ((m.user_id = auth.uid()) AND (m.tenant_id = conversation_card_collections.tenant_id) AND (m.status = 'active'::text) AND (m.role = ANY (ARRAY['owner'::public.tenant_role_enum, 'admin'::public.tenant_role_enum]))))))));
CREATE POLICY "conversation_cards_delete" ON public.conversation_cards FOR DELETE
  USING ((EXISTS ( SELECT 1
   FROM public.conversation_card_collections c
  WHERE ((c.id = conversation_cards.collection_id) AND (((c.scope_type = 'global'::text) AND (c.tenant_id IS NULL) AND public.is_global_admin()) OR ((c.scope_type = 'tenant'::text) AND (c.tenant_id IS NOT NULL) AND (EXISTS ( SELECT 1
           FROM public.user_tenant_memberships m
          WHERE ((m.user_id = auth.uid()) AND (m.tenant_id = c.tenant_id) AND (m.status = 'active'::text) AND (m.role = ANY (ARRAY['owner'::public.tenant_role_enum, 'admin'::public.tenant_role_enum])))))))))));
CREATE POLICY "conversation_cards_insert" ON public.conversation_cards FOR INSERT
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.conversation_card_collections c
  WHERE ((c.id = conversation_cards.collection_id) AND (((c.scope_type = 'global'::text) AND (c.tenant_id IS NULL) AND public.is_global_admin()) OR ((c.scope_type = 'tenant'::text) AND (c.tenant_id IS NOT NULL) AND (EXISTS ( SELECT 1
           FROM public.user_tenant_memberships m
          WHERE ((m.user_id = auth.uid()) AND (m.tenant_id = c.tenant_id) AND (m.status = 'active'::text) AND (m.role = ANY (ARRAY['owner'::public.tenant_role_enum, 'admin'::public.tenant_role_enum])))))))))));
CREATE POLICY "conversation_cards_select" ON public.conversation_cards FOR SELECT
  USING ((EXISTS ( SELECT 1
   FROM public.conversation_card_collections c
  WHERE ((c.id = conversation_cards.collection_id) AND (((c.scope_type = 'global'::text) AND (c.status = 'published'::text)) OR ((auth.role() = 'authenticated'::text) AND (c.scope_type = 'tenant'::text) AND (c.tenant_id IN ( SELECT user_tenant_memberships.tenant_id
           FROM public.user_tenant_memberships
          WHERE (user_tenant_memberships.user_id = auth.uid())))) OR public.is_global_admin())))));
CREATE POLICY "conversation_cards_update" ON public.conversation_cards FOR UPDATE
  USING ((EXISTS ( SELECT 1
   FROM public.conversation_card_collections c
  WHERE ((c.id = conversation_cards.collection_id) AND (((c.scope_type = 'global'::text) AND (c.tenant_id IS NULL) AND public.is_global_admin()) OR ((c.scope_type = 'tenant'::text) AND (c.tenant_id IS NOT NULL) AND (EXISTS ( SELECT 1
           FROM public.user_tenant_memberships m
          WHERE ((m.user_id = auth.uid()) AND (m.tenant_id = c.tenant_id) AND (m.status = 'active'::text) AND (m.role = ANY (ARRAY['owner'::public.tenant_role_enum, 'admin'::public.tenant_role_enum])))))))))));
CREATE POLICY "cookie_catalog_public_select" ON public.cookie_catalog FOR SELECT
  USING (true);
CREATE POLICY "cookie_catalog_system_admin_all" ON public.cookie_catalog
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());
CREATE POLICY "cookie_consent_audit_admin_read" ON public.cookie_consent_audit FOR SELECT
  USING ((public.is_system_admin() OR (user_id = ( SELECT auth.uid() AS uid))));
CREATE POLICY "cookie_consent_audit_insert" ON public.cookie_consent_audit FOR INSERT
  WITH CHECK ((consent_id IS NOT NULL));
CREATE POLICY "cookie_consents_insert" ON public.cookie_consents FOR INSERT
  WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "cookie_consents_select" ON public.cookie_consents FOR SELECT
  USING (((user_id = ( SELECT auth.uid() AS uid)) OR public.is_system_admin()));
CREATE POLICY "cookie_consents_update" ON public.cookie_consents FOR UPDATE
  USING ((user_id = ( SELECT auth.uid() AS uid)))
  WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "unlock_rules_select" ON public.cosmetic_unlock_rules FOR SELECT
  USING (true);
CREATE POLICY "cosmetics_select" ON public.cosmetics FOR SELECT
  USING ((is_active = true));
CREATE POLICY "data_access_log_subject" ON public.data_access_log FOR SELECT
  USING ((subject_user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "data_access_log_system_admin" ON public.data_access_log
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());
CREATE POLICY "data_access_log_tenant_admin" ON public.data_access_log FOR SELECT
  USING (((tenant_id IS NOT NULL) AND public.has_tenant_role(tenant_id, ARRAY['owner'::public.tenant_role_enum, 'admin'::public.tenant_role_enum])));
CREATE POLICY "data_breach_notifications_admin" ON public.data_breach_notifications
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());
CREATE POLICY "data_retention_policies_admin" ON public.data_retention_policies
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());
CREATE POLICY "service_role_full_demo_sessions_access" ON public.demo_sessions
  USING (true)
  WITH CHECK (true);
CREATE POLICY "users_view_own_demo_sessions" ON public.demo_sessions FOR SELECT
  USING ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "dunning_actions_admin_all" ON public.dunning_actions
  USING (public.is_system_admin());
CREATE POLICY "dunning_actions_select_own" ON public.dunning_actions FOR SELECT
  USING ((payment_failure_id IN ( SELECT pf.id
   FROM public.payment_failures pf
  WHERE (pf.tenant_id IN ( SELECT utm.tenant_id
           FROM public.user_tenant_memberships utm
          WHERE ((utm.user_id = ( SELECT auth.uid() AS uid)) AND (utm.role = ANY (ARRAY['owner'::public.tenant_role_enum, 'admin'::public.tenant_role_enum])) AND (utm.status = 'active'::text)))))));
CREATE POLICY "dunning_config_admin_all" ON public.dunning_config
  USING (public.is_system_admin());
CREATE POLICY "error_tracking_insert" ON public.error_tracking FOR INSERT
  WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "event_rewards_select" ON public.event_rewards FOR SELECT
  USING ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "feature_usage_insert" ON public.feature_usage FOR INSERT
  WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "feedback_select_own" ON public.feedback FOR SELECT
  USING ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "feedback_select_tenant" ON public.feedback FOR SELECT
  USING ((tenant_id = ANY (public.get_user_tenant_ids())));
CREATE POLICY "users_can_update_own_feedback" ON public.feedback FOR UPDATE
  USING ((user_id = ( SELECT auth.uid() AS uid)))
  WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "friend_requests_insert" ON public.friend_requests FOR INSERT
  WITH CHECK ((requester_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "friend_requests_select" ON public.friend_requests FOR SELECT
  USING (((requester_id = ( SELECT auth.uid() AS uid)) OR (recipient_id = ( SELECT auth.uid() AS uid))));
CREATE POLICY "friend_requests_update" ON public.friend_requests FOR UPDATE
  USING ((recipient_id = ( SELECT auth.uid() AS uid)))
  WITH CHECK ((recipient_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "friends_delete_own" ON public.friends FOR DELETE
  USING (((user_id_1 = ( SELECT auth.uid() AS uid)) OR (user_id_2 = ( SELECT auth.uid() AS uid))));
CREATE POLICY "friends_select_own" ON public.friends FOR SELECT
  USING (((user_id_1 = ( SELECT auth.uid() AS uid)) OR (user_id_2 = ( SELECT auth.uid() AS uid))));
CREATE POLICY "friends_service_insert" ON public.friends FOR INSERT
  WITH CHECK (public.is_system_admin());
CREATE POLICY "funnel_analytics_insert" ON public.funnel_analytics FOR INSERT
  WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "game_artifact_variants_delete" ON public.game_artifact_variants FOR DELETE
  USING (((EXISTS ( SELECT 1
   FROM ((public.game_artifacts a
     JOIN public.games g ON ((g.id = a.game_id)))
     JOIN public.user_tenant_memberships m ON ((m.tenant_id = g.owner_tenant_id)))
  WHERE ((a.id = game_artifact_variants.artifact_id) AND (m.user_id = auth.uid()) AND (m.role = ANY (ARRAY['admin'::public.tenant_role_enum, 'editor'::public.tenant_role_enum]))))) OR public.is_global_admin()));
CREATE POLICY "game_artifact_variants_insert" ON public.game_artifact_variants FOR INSERT
  WITH CHECK (((EXISTS ( SELECT 1
   FROM ((public.game_artifacts a
     JOIN public.games g ON ((g.id = a.game_id)))
     JOIN public.user_tenant_memberships m ON ((m.tenant_id = g.owner_tenant_id)))
  WHERE ((a.id = game_artifact_variants.artifact_id) AND (m.user_id = auth.uid()) AND (m.role = ANY (ARRAY['admin'::public.tenant_role_enum, 'editor'::public.tenant_role_enum]))))) OR public.is_global_admin()));
CREATE POLICY "game_artifact_variants_select" ON public.game_artifact_variants FOR SELECT
  USING (((EXISTS ( SELECT 1
   FROM (public.game_artifacts a
     JOIN public.games g ON ((g.id = a.game_id)))
  WHERE ((a.id = game_artifact_variants.artifact_id) AND ((g.status = 'published'::public.game_status_enum) OR (g.owner_tenant_id IN ( SELECT user_tenant_memberships.tenant_id
           FROM public.user_tenant_memberships
          WHERE (user_tenant_memberships.user_id = auth.uid()))))))) OR public.is_global_admin()));
CREATE POLICY "game_artifact_variants_update" ON public.game_artifact_variants FOR UPDATE
  USING (((EXISTS ( SELECT 1
   FROM ((public.game_artifacts a
     JOIN public.games g ON ((g.id = a.game_id)))
     JOIN public.user_tenant_memberships m ON ((m.tenant_id = g.owner_tenant_id)))
  WHERE ((a.id = game_artifact_variants.artifact_id) AND (m.user_id = auth.uid()) AND (m.role = ANY (ARRAY['admin'::public.tenant_role_enum, 'editor'::public.tenant_role_enum]))))) OR public.is_global_admin()));
CREATE POLICY "game_artifacts_delete" ON public.game_artifacts FOR DELETE
  USING (((EXISTS ( SELECT 1
   FROM (public.games g
     JOIN public.user_tenant_memberships m ON ((m.tenant_id = g.owner_tenant_id)))
  WHERE ((g.id = game_artifacts.game_id) AND (m.user_id = auth.uid()) AND (m.role = ANY (ARRAY['admin'::public.tenant_role_enum, 'editor'::public.tenant_role_enum]))))) OR public.is_global_admin()));
CREATE POLICY "game_artifacts_insert" ON public.game_artifacts FOR INSERT
  WITH CHECK (((EXISTS ( SELECT 1
   FROM (public.games g
     JOIN public.user_tenant_memberships m ON ((m.tenant_id = g.owner_tenant_id)))
  WHERE ((g.id = game_artifacts.game_id) AND (m.user_id = auth.uid()) AND (m.role = ANY (ARRAY['admin'::public.tenant_role_enum, 'editor'::public.tenant_role_enum]))))) OR public.is_global_admin()));
CREATE POLICY "game_artifacts_select" ON public.game_artifacts FOR SELECT
  USING (((EXISTS ( SELECT 1
   FROM public.games g
  WHERE ((g.id = game_artifacts.game_id) AND ((g.status = 'published'::public.game_status_enum) OR (g.owner_tenant_id IN ( SELECT user_tenant_memberships.tenant_id
           FROM public.user_tenant_memberships
          WHERE (user_tenant_memberships.user_id = auth.uid()))))))) OR public.is_global_admin()));
CREATE POLICY "game_artifacts_update" ON public.game_artifacts FOR UPDATE
  USING (((EXISTS ( SELECT 1
   FROM (public.games g
     JOIN public.user_tenant_memberships m ON ((m.tenant_id = g.owner_tenant_id)))
  WHERE ((g.id = game_artifacts.game_id) AND (m.user_id = auth.uid()) AND (m.role = ANY (ARRAY['admin'::public.tenant_role_enum, 'editor'::public.tenant_role_enum]))))) OR public.is_global_admin()));
CREATE POLICY "game_board_config_delete" ON public.game_board_config FOR DELETE
  USING (((EXISTS ( SELECT 1
   FROM (public.games g
     JOIN public.user_tenant_memberships m ON ((m.tenant_id = g.owner_tenant_id)))
  WHERE ((g.id = game_board_config.game_id) AND (m.user_id = auth.uid()) AND (m.role = ANY (ARRAY['admin'::public.tenant_role_enum, 'editor'::public.tenant_role_enum]))))) OR public.is_global_admin()));
CREATE POLICY "game_board_config_insert" ON public.game_board_config FOR INSERT
  WITH CHECK (((EXISTS ( SELECT 1
   FROM (public.games g
     JOIN public.user_tenant_memberships m ON ((m.tenant_id = g.owner_tenant_id)))
  WHERE ((g.id = game_board_config.game_id) AND (m.user_id = auth.uid()) AND (m.role = ANY (ARRAY['admin'::public.tenant_role_enum, 'editor'::public.tenant_role_enum]))))) OR public.is_global_admin()));
CREATE POLICY "game_board_config_manage" ON public.game_board_config
  USING ((public.is_system_admin() OR (EXISTS ( SELECT 1
   FROM public.games g
  WHERE ((g.id = game_board_config.game_id) AND public.has_tenant_role(g.owner_tenant_id, 'admin'::public.tenant_role_enum))))))
  WITH CHECK ((public.is_system_admin() OR (EXISTS ( SELECT 1
   FROM public.games g
  WHERE ((g.id = game_board_config.game_id) AND public.has_tenant_role(g.owner_tenant_id, 'admin'::public.tenant_role_enum))))));
CREATE POLICY "game_board_config_select" ON public.game_board_config FOR SELECT
  USING ((EXISTS ( SELECT 1
   FROM public.games g
  WHERE ((g.id = game_board_config.game_id) AND (g.owner_tenant_id = ANY (public.get_user_tenant_ids()))))));
CREATE POLICY "game_board_config_update" ON public.game_board_config FOR UPDATE
  USING (((EXISTS ( SELECT 1
   FROM (public.games g
     JOIN public.user_tenant_memberships m ON ((m.tenant_id = g.owner_tenant_id)))
  WHERE ((g.id = game_board_config.game_id) AND (m.user_id = auth.uid()) AND (m.role = ANY (ARRAY['admin'::public.tenant_role_enum, 'editor'::public.tenant_role_enum]))))) OR public.is_global_admin()));
CREATE POLICY "game_materials_modify_leader" ON public.game_materials
  USING (((EXISTS ( SELECT 1
   FROM public.games g
  WHERE ((g.id = game_materials.game_id) AND (g.owner_tenant_id = ANY (public.get_user_tenant_ids())) AND (public.has_tenant_role(g.owner_tenant_id, 'editor'::public.tenant_role_enum) OR public.has_tenant_role(g.owner_tenant_id, 'admin'::public.tenant_role_enum) OR public.has_tenant_role(g.owner_tenant_id, 'owner'::public.tenant_role_enum))))) OR public.is_system_admin()))
  WITH CHECK (((EXISTS ( SELECT 1
   FROM public.games g
  WHERE ((g.id = game_materials.game_id) AND (g.owner_tenant_id = ANY (public.get_user_tenant_ids())) AND (public.has_tenant_role(g.owner_tenant_id, 'editor'::public.tenant_role_enum) OR public.has_tenant_role(g.owner_tenant_id, 'admin'::public.tenant_role_enum) OR public.has_tenant_role(g.owner_tenant_id, 'owner'::public.tenant_role_enum))))) OR public.is_system_admin()));
CREATE POLICY "game_materials_select_member" ON public.game_materials FOR SELECT
  USING (((EXISTS ( SELECT 1
   FROM public.games g
  WHERE ((g.id = game_materials.game_id) AND (g.owner_tenant_id = ANY (public.get_user_tenant_ids()))))) OR public.is_system_admin()));
CREATE POLICY "game_media_select" ON public.game_media FOR SELECT
  USING (true);
CREATE POLICY "game_phases_select" ON public.game_phases FOR SELECT
  USING ((EXISTS ( SELECT 1
   FROM public.games g
  WHERE ((g.id = game_phases.game_id) AND (g.owner_tenant_id = ANY (public.get_user_tenant_ids()))))));
CREATE POLICY "game_phases_write" ON public.game_phases
  USING ((public.is_system_admin() OR (EXISTS ( SELECT 1
   FROM public.games g
  WHERE ((g.id = game_phases.game_id) AND public.has_tenant_role(g.owner_tenant_id, 'admin'::public.tenant_role_enum))))))
  WITH CHECK ((public.is_system_admin() OR (EXISTS ( SELECT 1
   FROM public.games g
  WHERE ((g.id = game_phases.game_id) AND public.has_tenant_role(g.owner_tenant_id, 'admin'::public.tenant_role_enum))))));
CREATE POLICY "game_reactions_delete_own" ON public.game_reactions FOR DELETE
  USING ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY "game_reactions_insert_own" ON public.game_reactions FOR INSERT
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY "game_reactions_select_own" ON public.game_reactions FOR SELECT
  USING ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY "game_reactions_update_own" ON public.game_reactions FOR UPDATE
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY "game_roles_delete" ON public.game_roles FOR DELETE
  USING (((EXISTS ( SELECT 1
   FROM (public.games g
     JOIN public.user_tenant_memberships m ON ((m.tenant_id = g.owner_tenant_id)))
  WHERE ((g.id = game_roles.game_id) AND (m.user_id = auth.uid()) AND (m.role = ANY (ARRAY['admin'::public.tenant_role_enum, 'editor'::public.tenant_role_enum]))))) OR public.is_global_admin()));
CREATE POLICY "game_roles_insert" ON public.game_roles FOR INSERT
  WITH CHECK (((EXISTS ( SELECT 1
   FROM (public.games g
     JOIN public.user_tenant_memberships m ON ((m.tenant_id = g.owner_tenant_id)))
  WHERE ((g.id = game_roles.game_id) AND (m.user_id = auth.uid()) AND (m.role = ANY (ARRAY['admin'::public.tenant_role_enum, 'editor'::public.tenant_role_enum]))))) OR public.is_global_admin()));
CREATE POLICY "game_roles_manage" ON public.game_roles
  USING ((public.is_system_admin() OR (EXISTS ( SELECT 1
   FROM public.games g
  WHERE ((g.id = game_roles.game_id) AND public.has_tenant_role(g.owner_tenant_id, 'admin'::public.tenant_role_enum))))))
  WITH CHECK ((public.is_system_admin() OR (EXISTS ( SELECT 1
   FROM public.games g
  WHERE ((g.id = game_roles.game_id) AND public.has_tenant_role(g.owner_tenant_id, 'admin'::public.tenant_role_enum))))));
CREATE POLICY "game_roles_select" ON public.game_roles FOR SELECT
  USING ((EXISTS ( SELECT 1
   FROM public.games g
  WHERE ((g.id = game_roles.game_id) AND (g.owner_tenant_id = ANY (public.get_user_tenant_ids()))))));
CREATE POLICY "game_roles_update" ON public.game_roles FOR UPDATE
  USING (((EXISTS ( SELECT 1
   FROM (public.games g
     JOIN public.user_tenant_memberships m ON ((m.tenant_id = g.owner_tenant_id)))
  WHERE ((g.id = game_roles.game_id) AND (m.user_id = auth.uid()) AND (m.role = ANY (ARRAY['admin'::public.tenant_role_enum, 'editor'::public.tenant_role_enum]))))) OR public.is_global_admin()));
CREATE POLICY "users_can_insert_own_game_scores" ON public.game_scores FOR INSERT
  WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "users_can_select_own_game_scores" ON public.game_scores FOR SELECT
  USING ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "game_purposes_read" ON public.game_secondary_purposes FOR SELECT
  USING (true);
CREATE POLICY "game_purposes_write" ON public.game_secondary_purposes
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());
CREATE POLICY "demo_session_ownership" ON public.game_sessions
  USING (((user_id = ( SELECT auth.uid() AS uid)) OR ((NOT (EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = ( SELECT auth.uid() AS uid)) AND ((users.is_demo_user = true) OR (users.is_ephemeral = true)))))) AND (tenant_id IN ( SELECT m.tenant_id
   FROM public.user_tenant_memberships m
  WHERE (m.user_id = ( SELECT auth.uid() AS uid)))))));
CREATE POLICY "game_sessions_select_own" ON public.game_sessions FOR SELECT
  USING ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "game_sessions_select_tenant" ON public.game_sessions FOR SELECT
  USING ((tenant_id = ANY (public.get_user_tenant_ids())));
CREATE POLICY "game_sessions_update" ON public.game_sessions FOR UPDATE
  USING ((user_id = ( SELECT auth.uid() AS uid)))
  WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "game_snapshots_delete" ON public.game_snapshots FOR DELETE
  USING (public.is_global_admin());
CREATE POLICY "game_snapshots_insert" ON public.game_snapshots FOR INSERT
  WITH CHECK ((public.is_system_admin() OR (EXISTS ( SELECT 1
   FROM public.games g
  WHERE ((g.id = game_snapshots.game_id) AND public.has_tenant_role(g.owner_tenant_id, 'admin'::public.tenant_role_enum))))));
CREATE POLICY "game_snapshots_select" ON public.game_snapshots FOR SELECT
  USING (true);
CREATE POLICY "game_steps_modify_leader" ON public.game_steps
  USING (((EXISTS ( SELECT 1
   FROM public.games g
  WHERE ((g.id = game_steps.game_id) AND (g.owner_tenant_id = ANY (public.get_user_tenant_ids())) AND (public.has_tenant_role(g.owner_tenant_id, 'editor'::public.tenant_role_enum) OR public.has_tenant_role(g.owner_tenant_id, 'admin'::public.tenant_role_enum) OR public.has_tenant_role(g.owner_tenant_id, 'owner'::public.tenant_role_enum))))) OR public.is_system_admin()))
  WITH CHECK (((EXISTS ( SELECT 1
   FROM public.games g
  WHERE ((g.id = game_steps.game_id) AND (g.owner_tenant_id = ANY (public.get_user_tenant_ids())) AND (public.has_tenant_role(g.owner_tenant_id, 'editor'::public.tenant_role_enum) OR public.has_tenant_role(g.owner_tenant_id, 'admin'::public.tenant_role_enum) OR public.has_tenant_role(g.owner_tenant_id, 'owner'::public.tenant_role_enum))))) OR public.is_system_admin()));
CREATE POLICY "game_steps_select_member" ON public.game_steps FOR SELECT
  USING (((EXISTS ( SELECT 1
   FROM public.games g
  WHERE ((g.id = game_steps.game_id) AND (g.owner_tenant_id = ANY (public.get_user_tenant_ids()))))) OR public.is_system_admin()));
CREATE POLICY "game_tools_delete" ON public.game_tools FOR DELETE
  USING ((EXISTS ( SELECT 1
   FROM public.games g
  WHERE ((g.id = game_tools.game_id) AND (((g.owner_tenant_id IS NOT NULL) AND (EXISTS ( SELECT 1
           FROM public.user_tenant_memberships m
          WHERE ((m.user_id = auth.uid()) AND (m.tenant_id = g.owner_tenant_id) AND (m.role = ANY (ARRAY['admin'::public.tenant_role_enum, 'editor'::public.tenant_role_enum])))))) OR public.is_global_admin())))));
CREATE POLICY "game_tools_insert" ON public.game_tools FOR INSERT
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.games g
  WHERE ((g.id = game_tools.game_id) AND (((g.owner_tenant_id IS NOT NULL) AND (EXISTS ( SELECT 1
           FROM public.user_tenant_memberships m
          WHERE ((m.user_id = auth.uid()) AND (m.tenant_id = g.owner_tenant_id) AND (m.role = ANY (ARRAY['admin'::public.tenant_role_enum, 'editor'::public.tenant_role_enum])))))) OR public.is_global_admin())))));
CREATE POLICY "game_tools_manage" ON public.game_tools
  USING ((public.is_system_admin() OR (EXISTS ( SELECT 1
   FROM public.games g
  WHERE ((g.id = game_tools.game_id) AND public.has_tenant_role(g.owner_tenant_id, 'admin'::public.tenant_role_enum))))))
  WITH CHECK ((public.is_system_admin() OR (EXISTS ( SELECT 1
   FROM public.games g
  WHERE ((g.id = game_tools.game_id) AND public.has_tenant_role(g.owner_tenant_id, 'admin'::public.tenant_role_enum))))));
CREATE POLICY "game_tools_select" ON public.game_tools FOR SELECT
  USING ((EXISTS ( SELECT 1
   FROM public.games g
  WHERE ((g.id = game_tools.game_id) AND (g.owner_tenant_id = ANY (public.get_user_tenant_ids()))))));
CREATE POLICY "game_tools_update" ON public.game_tools FOR UPDATE
  USING ((EXISTS ( SELECT 1
   FROM public.games g
  WHERE ((g.id = game_tools.game_id) AND (((g.owner_tenant_id IS NOT NULL) AND (EXISTS ( SELECT 1
           FROM public.user_tenant_memberships m
          WHERE ((m.user_id = auth.uid()) AND (m.tenant_id = g.owner_tenant_id) AND (m.role = ANY (ARRAY['admin'::public.tenant_role_enum, 'editor'::public.tenant_role_enum])))))) OR public.is_global_admin())))));
CREATE POLICY "game_translations_select" ON public.game_translations FOR SELECT
  USING (true);
CREATE POLICY "game_triggers_delete" ON public.game_triggers FOR DELETE
  USING ((EXISTS ( SELECT 1
   FROM public.games g
  WHERE ((g.id = game_triggers.game_id) AND (g.owner_tenant_id IN ( SELECT user_tenant_memberships.tenant_id
           FROM public.user_tenant_memberships
          WHERE ((user_tenant_memberships.user_id = auth.uid()) AND (user_tenant_memberships.role = ANY (ARRAY['owner'::public.tenant_role_enum, 'admin'::public.tenant_role_enum, 'member'::public.tenant_role_enum])))))))));
CREATE POLICY "game_triggers_insert" ON public.game_triggers FOR INSERT
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.games g
  WHERE ((g.id = game_triggers.game_id) AND (g.owner_tenant_id IN ( SELECT user_tenant_memberships.tenant_id
           FROM public.user_tenant_memberships
          WHERE ((user_tenant_memberships.user_id = auth.uid()) AND (user_tenant_memberships.role = ANY (ARRAY['owner'::public.tenant_role_enum, 'admin'::public.tenant_role_enum, 'member'::public.tenant_role_enum])))))))));
CREATE POLICY "game_triggers_manage" ON public.game_triggers
  USING ((public.is_system_admin() OR (EXISTS ( SELECT 1
   FROM public.games g
  WHERE ((g.id = game_triggers.game_id) AND public.has_tenant_role(g.owner_tenant_id, 'admin'::public.tenant_role_enum))))))
  WITH CHECK ((public.is_system_admin() OR (EXISTS ( SELECT 1
   FROM public.games g
  WHERE ((g.id = game_triggers.game_id) AND public.has_tenant_role(g.owner_tenant_id, 'admin'::public.tenant_role_enum))))));
CREATE POLICY "game_triggers_select" ON public.game_triggers FOR SELECT
  USING ((EXISTS ( SELECT 1
   FROM public.games g
  WHERE ((g.id = game_triggers.game_id) AND (g.owner_tenant_id = ANY (public.get_user_tenant_ids()))))));
CREATE POLICY "game_triggers_update" ON public.game_triggers FOR UPDATE
  USING ((EXISTS ( SELECT 1
   FROM public.games g
  WHERE ((g.id = game_triggers.game_id) AND (g.owner_tenant_id IN ( SELECT user_tenant_memberships.tenant_id
           FROM public.user_tenant_memberships
          WHERE ((user_tenant_memberships.user_id = auth.uid()) AND (user_tenant_memberships.role = ANY (ARRAY['owner'::public.tenant_role_enum, 'admin'::public.tenant_role_enum, 'member'::public.tenant_role_enum])))))))));
CREATE POLICY "demo_content_access" ON public.games FOR SELECT
  USING (
CASE
    WHEN (EXISTS ( SELECT 1
       FROM public.users
      WHERE ((users.id = ( SELECT auth.uid() AS uid)) AND ((users.is_demo_user = true) OR (users.is_ephemeral = true))))) THEN ((is_demo_content = true) OR (created_by = ( SELECT auth.uid() AS uid)))
    ELSE ((owner_tenant_id IN ( SELECT m.tenant_id
       FROM public.user_tenant_memberships m
      WHERE (m.user_id = ( SELECT auth.uid() AS uid)))) OR (owner_tenant_id IS NULL) OR (created_by = ( SELECT auth.uid() AS uid)))
END);
CREATE POLICY "games_delete_admin" ON public.games FOR DELETE
  USING (((owner_tenant_id = ANY (public.get_user_tenant_ids())) AND (public.has_tenant_role(owner_tenant_id, 'admin'::public.tenant_role_enum) OR public.has_tenant_role(owner_tenant_id, 'owner'::public.tenant_role_enum))));
CREATE POLICY "games_insert_leader" ON public.games FOR INSERT
  WITH CHECK (((owner_tenant_id = ANY (public.get_user_tenant_ids())) AND (public.has_tenant_role(owner_tenant_id, 'editor'::public.tenant_role_enum) OR public.has_tenant_role(owner_tenant_id, 'admin'::public.tenant_role_enum) OR public.has_tenant_role(owner_tenant_id, 'owner'::public.tenant_role_enum))));
CREATE POLICY "games_select" ON public.games FOR SELECT
  USING ((public.is_system_admin() OR (owner_tenant_id = ANY (public.get_user_tenant_ids())) OR ((owner_tenant_id IS NULL) AND (status = 'published'::public.game_status_enum)) OR ((status = 'published'::public.game_status_enum) AND (owner_tenant_id = ANY (public.get_user_tenant_ids())))));
CREATE POLICY "games_select_anon" ON public.games FOR SELECT
  USING (((owner_tenant_id IS NULL) AND (status = 'published'::public.game_status_enum)));
CREATE POLICY "games_update_leader" ON public.games FOR UPDATE
  USING (((owner_tenant_id = ANY (public.get_user_tenant_ids())) AND (public.has_tenant_role(owner_tenant_id, 'editor'::public.tenant_role_enum) OR public.has_tenant_role(owner_tenant_id, 'admin'::public.tenant_role_enum) OR public.has_tenant_role(owner_tenant_id, 'owner'::public.tenant_role_enum))))
  WITH CHECK (((owner_tenant_id = ANY (public.get_user_tenant_ids())) AND (public.has_tenant_role(owner_tenant_id, 'editor'::public.tenant_role_enum) OR public.has_tenant_role(owner_tenant_id, 'admin'::public.tenant_role_enum) OR public.has_tenant_role(owner_tenant_id, 'owner'::public.tenant_role_enum))));
CREATE POLICY "gamification_admin_award_recipients_service_all" ON public.gamification_admin_award_recipients
  USING ((auth.role() = 'service_role'::text))
  WITH CHECK ((auth.role() = 'service_role'::text));
CREATE POLICY "gamification_admin_award_request_recipients_service_all" ON public.gamification_admin_award_request_recipients
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());
CREATE POLICY "gamification_admin_award_requests_service_all" ON public.gamification_admin_award_requests
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());
CREATE POLICY "gamification_admin_awards_service_all" ON public.gamification_admin_awards
  USING ((auth.role() = 'service_role'::text))
  WITH CHECK ((auth.role() = 'service_role'::text));
CREATE POLICY "gamification_automation_rules_service_all" ON public.gamification_automation_rules
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());
CREATE POLICY "gamification_burn_log_admin_select" ON public.gamification_burn_log FOR SELECT
  USING ((public.is_system_admin() OR ((tenant_id IS NOT NULL) AND public.has_tenant_role(tenant_id, ARRAY['owner'::public.tenant_role_enum, 'admin'::public.tenant_role_enum]))));
CREATE POLICY "gamification_burn_log_select" ON public.gamification_burn_log FOR SELECT
  USING ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY "gamification_burn_log_service" ON public.gamification_burn_log
  USING ((auth.role() = 'service_role'::text))
  WITH CHECK ((auth.role() = 'service_role'::text));
CREATE POLICY "gamification_burn_sinks_admin" ON public.gamification_burn_sinks
  USING ((public.is_system_admin() OR ((tenant_id IS NOT NULL) AND public.has_tenant_role(tenant_id, ARRAY['owner'::public.tenant_role_enum, 'admin'::public.tenant_role_enum]))))
  WITH CHECK ((public.is_system_admin() OR ((tenant_id IS NOT NULL) AND public.has_tenant_role(tenant_id, ARRAY['owner'::public.tenant_role_enum, 'admin'::public.tenant_role_enum]))));
CREATE POLICY "gamification_burn_sinks_select" ON public.gamification_burn_sinks FOR SELECT
  USING (((is_available = true) AND ((tenant_id IS NULL) OR (tenant_id = ANY (public.get_user_tenant_ids())))));
CREATE POLICY "gamification_burn_sinks_service" ON public.gamification_burn_sinks
  USING ((auth.role() = 'service_role'::text))
  WITH CHECK ((auth.role() = 'service_role'::text));
CREATE POLICY "gamification_campaign_templates_service_all" ON public.gamification_campaign_templates
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());
CREATE POLICY "gamification_campaigns_service_all" ON public.gamification_campaigns
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());
CREATE POLICY "gamification_cooldowns_select" ON public.gamification_cooldowns FOR SELECT
  USING ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY "gamification_cooldowns_service" ON public.gamification_cooldowns
  USING ((auth.role() = 'service_role'::text))
  WITH CHECK ((auth.role() = 'service_role'::text));
CREATE POLICY "gamification_daily_earnings_admin_select" ON public.gamification_daily_earnings FOR SELECT
  USING ((public.is_system_admin() OR ((tenant_id IS NOT NULL) AND public.has_tenant_role(tenant_id, ARRAY['owner'::public.tenant_role_enum, 'admin'::public.tenant_role_enum]))));
CREATE POLICY "gamification_daily_earnings_select" ON public.gamification_daily_earnings FOR SELECT
  USING ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY "gamification_daily_earnings_service" ON public.gamification_daily_earnings
  USING ((auth.role() = 'service_role'::text))
  WITH CHECK ((auth.role() = 'service_role'::text));
CREATE POLICY "gamification_daily_summaries_service_all" ON public.gamification_daily_summaries
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());
CREATE POLICY "gamification_events_insert" ON public.gamification_events FOR INSERT
  WITH CHECK (public.is_system_admin());
CREATE POLICY "gamification_events_update" ON public.gamification_events FOR UPDATE
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());
CREATE POLICY "users_can_select_own_gamification_events" ON public.gamification_events FOR SELECT
  USING ((( SELECT auth.uid() AS uid) = actor_user_id));
CREATE POLICY "gamification_level_definitions_admin" ON public.gamification_level_definitions
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());
CREATE POLICY "users_can_select_level_definitions" ON public.gamification_level_definitions FOR SELECT
  USING (((tenant_id IS NULL) OR (tenant_id = ANY (public.get_user_tenant_ids()))));
CREATE POLICY "gamification_softcap_manage" ON public.gamification_softcap_config
  USING ((public.is_system_admin() OR ((tenant_id IS NOT NULL) AND public.has_tenant_role(tenant_id, ARRAY['owner'::public.tenant_role_enum, 'admin'::public.tenant_role_enum]))))
  WITH CHECK ((public.is_system_admin() OR ((tenant_id IS NOT NULL) AND public.has_tenant_role(tenant_id, ARRAY['owner'::public.tenant_role_enum, 'admin'::public.tenant_role_enum]))));
CREATE POLICY "gamification_softcap_select" ON public.gamification_softcap_config FOR SELECT
  USING ((public.is_system_admin() OR ((tenant_id IS NOT NULL) AND public.has_tenant_role(tenant_id, ARRAY['owner'::public.tenant_role_enum, 'admin'::public.tenant_role_enum]))));
CREATE POLICY "gamification_softcap_service" ON public.gamification_softcap_config
  USING ((auth.role() = 'service_role'::text))
  WITH CHECK ((auth.role() = 'service_role'::text));
CREATE POLICY "gdpr_requests_admin" ON public.gdpr_requests
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());
CREATE POLICY "gdpr_requests_owner" ON public.gdpr_requests
  USING ((user_id = ( SELECT auth.uid() AS uid)))
  WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "gift_purchases_admin_all" ON public.gift_purchases
  USING (public.is_system_admin());
CREATE POLICY "gift_purchases_select_own_purchased" ON public.gift_purchases FOR SELECT
  USING ((purchaser_user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "gift_purchases_select_own_redeemed" ON public.gift_purchases FOR SELECT
  USING ((redeemed_by_user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "interest_profiles_select" ON public.interest_profiles FOR SELECT
  USING ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "invoices_tenant_admin" ON public.invoices
  USING ((public.is_system_admin() OR public.has_tenant_role(tenant_id, 'admin'::public.tenant_role_enum) OR public.has_tenant_role(tenant_id, 'owner'::public.tenant_role_enum)))
  WITH CHECK ((public.is_system_admin() OR public.has_tenant_role(tenant_id, 'admin'::public.tenant_role_enum) OR public.has_tenant_role(tenant_id, 'owner'::public.tenant_role_enum)));
CREATE POLICY "leader_profile_manage" ON public.leader_profile
  USING ((user_id = ( SELECT auth.uid() AS uid)))
  WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "leader_profile_service_all" ON public.leader_profile
  USING ((auth.role() = 'service_role'::text))
  WITH CHECK ((auth.role() = 'service_role'::text));
CREATE POLICY "leaderboards_select" ON public.leaderboards FOR SELECT
  USING (true);
CREATE POLICY "leaderboards_write" ON public.leaderboards
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());
CREATE POLICY "learning_course_attempts_manage" ON public.learning_course_attempts
  USING ((user_id = ( SELECT auth.uid() AS uid)))
  WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "system_admins_full_access_learning_course_attempts" ON public.learning_course_attempts
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());
CREATE POLICY "learning_course_translations_admin_all" ON public.learning_course_translations
  USING ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = ( SELECT auth.uid() AS uid)) AND (u.global_role = 'system_admin'::public.global_role_enum)))));
CREATE POLICY "learning_course_translations_select" ON public.learning_course_translations FOR SELECT
  USING (true);
CREATE POLICY "system_admins_full_access_learning_courses" ON public.learning_courses
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());
CREATE POLICY "tenant_members_select_learning_courses" ON public.learning_courses FOR SELECT
  USING (((tenant_id IS NULL) OR (tenant_id = ANY (public.get_user_tenant_ids()))));
CREATE POLICY "system_admins_full_access_learning_path_edges" ON public.learning_path_edges
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());
CREATE POLICY "users_select_learning_path_edges" ON public.learning_path_edges FOR SELECT
  USING ((EXISTS ( SELECT 1
   FROM public.learning_paths lp
  WHERE ((lp.id = learning_path_edges.path_id) AND ((lp.tenant_id IS NULL) OR (lp.tenant_id = ANY (public.get_user_tenant_ids())))))));
CREATE POLICY "system_admins_full_access_learning_path_nodes" ON public.learning_path_nodes
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());
CREATE POLICY "users_select_learning_path_nodes" ON public.learning_path_nodes FOR SELECT
  USING ((EXISTS ( SELECT 1
   FROM public.learning_paths lp
  WHERE ((lp.id = learning_path_nodes.path_id) AND ((lp.tenant_id IS NULL) OR (lp.tenant_id = ANY (public.get_user_tenant_ids())))))));
CREATE POLICY "learning_path_translations_admin_all" ON public.learning_path_translations
  USING ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = ( SELECT auth.uid() AS uid)) AND (u.global_role = 'system_admin'::public.global_role_enum)))));
CREATE POLICY "learning_path_translations_select" ON public.learning_path_translations FOR SELECT
  USING (true);
CREATE POLICY "system_admins_full_access_learning_paths" ON public.learning_paths
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());
CREATE POLICY "tenant_members_select_learning_paths" ON public.learning_paths FOR SELECT
  USING (((tenant_id IS NULL) OR (tenant_id = ANY (public.get_user_tenant_ids()))));
CREATE POLICY "system_admins_full_access_learning_requirements" ON public.learning_requirements
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());
CREATE POLICY "users_select_learning_requirements" ON public.learning_requirements FOR SELECT
  USING (((tenant_id IS NULL) OR (tenant_id = ANY (public.get_user_tenant_ids()))));
CREATE POLICY "learning_user_progress_manage" ON public.learning_user_progress
  USING ((user_id = ( SELECT auth.uid() AS uid)))
  WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "system_admins_full_access_learning_user_progress" ON public.learning_user_progress
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());
CREATE POLICY "legal_audit_log_insert" ON public.legal_audit_log FOR INSERT
  WITH CHECK ((public.is_system_admin() OR ((tenant_id IS NOT NULL) AND public.has_tenant_role(tenant_id, ARRAY['owner'::public.tenant_role_enum, 'admin'::public.tenant_role_enum]))));
CREATE POLICY "legal_audit_log_system_admin_select" ON public.legal_audit_log FOR SELECT
  USING (public.is_system_admin());
CREATE POLICY "legal_audit_log_tenant_select" ON public.legal_audit_log FOR SELECT
  USING (((tenant_id IS NOT NULL) AND public.has_tenant_role(tenant_id, ARRAY['owner'::public.tenant_role_enum, 'admin'::public.tenant_role_enum])));
CREATE POLICY "legal_document_drafts_system_admin_all" ON public.legal_document_drafts
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());
CREATE POLICY "legal_document_drafts_tenant_admin_all" ON public.legal_document_drafts
  USING (((scope = 'tenant'::text) AND (tenant_id IS NOT NULL) AND public.has_tenant_role(tenant_id, ARRAY['owner'::public.tenant_role_enum, 'admin'::public.tenant_role_enum])))
  WITH CHECK (((scope = 'tenant'::text) AND (tenant_id IS NOT NULL) AND public.has_tenant_role(tenant_id, ARRAY['owner'::public.tenant_role_enum, 'admin'::public.tenant_role_enum])));
CREATE POLICY "legal_documents_public_select" ON public.legal_documents FOR SELECT
  USING (((is_active = true) AND (scope = 'global'::text)));
CREATE POLICY "legal_documents_system_admin_all" ON public.legal_documents
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());
CREATE POLICY "legal_documents_tenant_admin_insert" ON public.legal_documents FOR INSERT
  WITH CHECK (((scope = 'tenant'::text) AND (tenant_id IS NOT NULL) AND public.has_tenant_role(tenant_id, ARRAY['owner'::public.tenant_role_enum, 'admin'::public.tenant_role_enum])));
CREATE POLICY "legal_documents_tenant_admin_select" ON public.legal_documents FOR SELECT
  USING (((scope = 'tenant'::text) AND (tenant_id IS NOT NULL) AND public.has_tenant_role(tenant_id, ARRAY['owner'::public.tenant_role_enum, 'admin'::public.tenant_role_enum])));
CREATE POLICY "legal_documents_tenant_admin_update" ON public.legal_documents FOR UPDATE
  USING (((scope = 'tenant'::text) AND (tenant_id IS NOT NULL) AND public.has_tenant_role(tenant_id, ARRAY['owner'::public.tenant_role_enum, 'admin'::public.tenant_role_enum])))
  WITH CHECK (((scope = 'tenant'::text) AND (tenant_id IS NOT NULL) AND public.has_tenant_role(tenant_id, ARRAY['owner'::public.tenant_role_enum, 'admin'::public.tenant_role_enum])));
CREATE POLICY "limited_time_events_select" ON public.limited_time_events FOR SELECT
  USING (true);
CREATE POLICY "marketing_features_admin_all" ON public.marketing_features
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());
CREATE POLICY "marketing_features_public_select" ON public.marketing_features FOR SELECT
  USING ((status = 'published'::text));
CREATE POLICY "marketing_updates_admin_all" ON public.marketing_updates
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());
CREATE POLICY "marketing_updates_public_select" ON public.marketing_updates FOR SELECT
  USING ((status = 'published'::text));
CREATE POLICY "marketplace_analytics_insert" ON public.marketplace_analytics FOR INSERT
  WITH CHECK (public.is_system_admin());
CREATE POLICY "marketplace_analytics_select" ON public.marketplace_analytics FOR SELECT
  USING (public.is_system_admin());
CREATE POLICY "media_delete" ON public.media FOR DELETE
  USING (public.is_system_admin());
CREATE POLICY "media_insert" ON public.media FOR INSERT
  WITH CHECK (public.is_system_admin());
CREATE POLICY "media_update" ON public.media FOR UPDATE
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());
CREATE POLICY "select_media_enhanced" ON public.media FOR SELECT
  USING (((tenant_id IS NULL) OR (tenant_id = ANY (public.get_user_tenant_ids())) OR (EXISTS ( SELECT 1
   FROM (public.game_media gm
     JOIN public.games g ON ((g.id = gm.game_id)))
  WHERE ((gm.media_id = media.id) AND (((g.owner_tenant_id IS NULL) AND (g.status = 'published'::public.game_status_enum)) OR (g.owner_tenant_id = ANY (public.get_user_tenant_ids()))))))));
CREATE POLICY "media_ai_generations_insert" ON public.media_ai_generations FOR INSERT
  WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "media_ai_generations_select" ON public.media_ai_generations FOR SELECT
  USING (((user_id = ( SELECT auth.uid() AS uid)) OR public.is_system_admin()));
CREATE POLICY "media_ai_generations_update" ON public.media_ai_generations FOR UPDATE
  USING ((user_id = ( SELECT auth.uid() AS uid)))
  WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "media_templates_manage" ON public.media_templates
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());
CREATE POLICY "select_media_templates" ON public.media_templates FOR SELECT
  USING (true);
CREATE POLICY "mfa_audit_log_insert" ON public.mfa_audit_log FOR INSERT
  WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "mfa_audit_log_select" ON public.mfa_audit_log FOR SELECT
  USING (((user_id = ( SELECT auth.uid() AS uid)) OR public.is_system_admin() OR ((tenant_id IS NOT NULL) AND public.has_tenant_role(tenant_id, ARRAY['owner'::public.tenant_role_enum, 'admin'::public.tenant_role_enum]))));
CREATE POLICY "mfa_trusted_devices_owner" ON public.mfa_trusted_devices
  USING (((user_id = ( SELECT auth.uid() AS uid)) OR public.is_system_admin() OR public.has_tenant_role(tenant_id, ARRAY['owner'::public.tenant_role_enum, 'admin'::public.tenant_role_enum])))
  WITH CHECK (((user_id = ( SELECT auth.uid() AS uid)) OR public.is_system_admin()));
CREATE POLICY "migration_log_service_only" ON public.migration_log
  USING (true)
  WITH CHECK (true);
CREATE POLICY "moderation_actions_admin" ON public.moderation_actions
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());
CREATE POLICY "moderation_analytics_select" ON public.moderation_analytics FOR SELECT
  USING (public.is_system_admin());
CREATE POLICY "moderation_queue_admin" ON public.moderation_queue
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());
CREATE POLICY "Users can view session participants" ON public.multiplayer_participants FOR SELECT
  USING (true);
CREATE POLICY "multiplayer_participants_insert" ON public.multiplayer_participants FOR INSERT
  WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "multiplayer_participants_service_update" ON public.multiplayer_participants FOR UPDATE
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());
CREATE POLICY "Users can view multiplayer sessions" ON public.multiplayer_sessions FOR SELECT
  USING (true);
CREATE POLICY "multiplayer_sessions_insert" ON public.multiplayer_sessions FOR INSERT
  WITH CHECK ((created_by_user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "multiplayer_sessions_update" ON public.multiplayer_sessions FOR UPDATE
  USING ((created_by_user_id = ( SELECT auth.uid() AS uid)))
  WITH CHECK ((created_by_user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "notification_deliveries_delete" ON public.notification_deliveries FOR DELETE
  USING ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "notification_deliveries_insert" ON public.notification_deliveries FOR INSERT
  WITH CHECK ((user_id IS NOT NULL));
CREATE POLICY "notification_deliveries_insert_service" ON public.notification_deliveries FOR INSERT
  WITH CHECK ((( SELECT auth.uid() AS uid) IS NOT NULL));
CREATE POLICY "notification_deliveries_select" ON public.notification_deliveries FOR SELECT
  USING ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "notification_deliveries_update" ON public.notification_deliveries FOR UPDATE
  USING ((user_id = ( SELECT auth.uid() AS uid)))
  WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "notification_log_service_insert" ON public.notification_log FOR INSERT
  WITH CHECK (public.is_system_admin());
CREATE POLICY "notification_preferences_insert" ON public.notification_preferences FOR INSERT
  WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "notification_preferences_select" ON public.notification_preferences FOR SELECT
  USING ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "notification_preferences_update" ON public.notification_preferences FOR UPDATE
  USING ((user_id = ( SELECT auth.uid() AS uid)))
  WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "notification_template_translations_admin_all" ON public.notification_template_translations
  USING ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = ( SELECT auth.uid() AS uid)) AND (u.global_role = 'system_admin'::public.global_role_enum)))));
CREATE POLICY "notification_template_translations_select" ON public.notification_template_translations FOR SELECT
  USING (true);
CREATE POLICY "admins_can_manage_templates" ON public.notification_templates
  USING ((public.is_system_admin() OR ((tenant_id IS NOT NULL) AND public.has_tenant_role(tenant_id, ARRAY['admin'::public.tenant_role_enum, 'owner'::public.tenant_role_enum]))));
CREATE POLICY "anyone_can_read_active_templates" ON public.notification_templates FOR SELECT
  USING (((is_active = true) AND ((tenant_id IS NULL) OR (tenant_id = ANY (public.get_user_tenant_ids())))));
CREATE POLICY "notifications_delete" ON public.notifications FOR DELETE
  USING ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "notifications_select" ON public.notifications FOR SELECT
  USING (((user_id = ( SELECT auth.uid() AS uid)) OR ((user_id IS NULL) AND (tenant_id IN ( SELECT user_tenant_memberships.tenant_id
   FROM public.user_tenant_memberships
  WHERE (user_tenant_memberships.user_id = ( SELECT auth.uid() AS uid)))))));
CREATE POLICY "notifications_service_insert" ON public.notifications FOR INSERT
  WITH CHECK (public.is_system_admin());
CREATE POLICY "notifications_update" ON public.notifications FOR UPDATE
  USING (((user_id = ( SELECT auth.uid() AS uid)) OR ((user_id IS NULL) AND (tenant_id IN ( SELECT user_tenant_memberships.tenant_id
   FROM public.user_tenant_memberships
  WHERE (user_tenant_memberships.user_id = ( SELECT auth.uid() AS uid)))))))
  WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "org_legal_acceptances_insert" ON public.org_legal_acceptances FOR INSERT
  WITH CHECK ((public.is_system_admin() OR public.has_tenant_role(tenant_id, ARRAY['owner'::public.tenant_role_enum, 'admin'::public.tenant_role_enum])));
CREATE POLICY "org_legal_acceptances_select" ON public.org_legal_acceptances FOR SELECT
  USING ((public.is_system_admin() OR public.has_tenant_role(tenant_id, ARRAY['owner'::public.tenant_role_enum, 'admin'::public.tenant_role_enum])));
CREATE POLICY "page_views_insert" ON public.page_views FOR INSERT
  WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "participant_achievement_unlocks_select" ON public.participant_achievement_unlocks FOR SELECT
  USING (((EXISTS ( SELECT 1
   FROM public.participant_sessions ps
  WHERE ((ps.id = participant_achievement_unlocks.session_id) AND (ps.host_user_id = ( SELECT auth.uid() AS uid))))) OR public.is_system_admin()));
CREATE POLICY "system_can_insert_unlocks" ON public.participant_achievement_unlocks FOR INSERT
  WITH CHECK (public.is_system_admin());
CREATE POLICY "participant_activity_log_insert" ON public.participant_activity_log FOR INSERT
  WITH CHECK (public.is_system_admin());
CREATE POLICY "participant_activity_log_select" ON public.participant_activity_log FOR SELECT
  USING (((EXISTS ( SELECT 1
   FROM public.participant_sessions ps
  WHERE ((ps.id = participant_activity_log.session_id) AND (ps.host_user_id = ( SELECT auth.uid() AS uid))))) OR public.is_system_admin()));
CREATE POLICY "participant_game_progress_select" ON public.participant_game_progress FOR SELECT
  USING (((EXISTS ( SELECT 1
   FROM public.participant_sessions ps
  WHERE ((ps.id = participant_game_progress.session_id) AND (ps.host_user_id = ( SELECT auth.uid() AS uid))))) OR public.is_system_admin()));
CREATE POLICY "system_can_manage_game_progress" ON public.participant_game_progress
  USING (public.is_system_admin());
CREATE POLICY "participant_role_assignments_manage" ON public.participant_role_assignments
  USING (((EXISTS ( SELECT 1
   FROM public.participant_sessions ps
  WHERE ((ps.id = participant_role_assignments.session_id) AND (ps.host_user_id = ( SELECT auth.uid() AS uid))))) OR public.is_system_admin()))
  WITH CHECK (((EXISTS ( SELECT 1
   FROM public.participant_sessions ps
  WHERE ((ps.id = participant_role_assignments.session_id) AND (ps.host_user_id = ( SELECT auth.uid() AS uid))))) OR public.is_system_admin()));
CREATE POLICY "host_can_manage_participant_sessions" ON public.participant_sessions
  USING ((host_user_id = ( SELECT auth.uid() AS uid)))
  WITH CHECK ((host_user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "participant_sessions_delete" ON public.participant_sessions FOR DELETE
  USING ((host_user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "participant_sessions_insert" ON public.participant_sessions FOR INSERT
  WITH CHECK ((host_user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "participant_sessions_select" ON public.participant_sessions FOR SELECT
  USING (((host_user_id = ( SELECT auth.uid() AS uid)) OR public.is_system_admin() OR (status = 'active'::public.participant_session_status)));
CREATE POLICY "participant_sessions_select_anon" ON public.participant_sessions FOR SELECT
  USING ((status = 'active'::public.participant_session_status));
CREATE POLICY "participant_sessions_update" ON public.participant_sessions FOR UPDATE
  USING ((host_user_id = ( SELECT auth.uid() AS uid)))
  WITH CHECK ((host_user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "tenant_admin_view_sessions" ON public.participant_sessions FOR SELECT
  USING ((EXISTS ( SELECT 1
   FROM public.user_tenant_memberships m
  WHERE ((m.user_id = ( SELECT auth.uid() AS uid)) AND (m.tenant_id = participant_sessions.tenant_id) AND (m.role = ANY (ARRAY['owner'::public.tenant_role_enum, 'admin'::public.tenant_role_enum]))))));
CREATE POLICY "System admins can view all quotas" ON public.participant_token_quotas FOR SELECT
  USING (public.is_system_admin());
CREATE POLICY "host_can_manage_participants" ON public.participants
  USING ((EXISTS ( SELECT 1
   FROM public.participant_sessions ps
  WHERE ((ps.id = participants.session_id) AND (ps.host_user_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY "participants_select" ON public.participants FOR SELECT
  USING (((EXISTS ( SELECT 1
   FROM public.participant_sessions ps
  WHERE ((ps.id = participants.session_id) AND (ps.host_user_id = ( SELECT auth.uid() AS uid))))) OR public.is_system_admin()));
CREATE POLICY "participants_select_anon" ON public.participants FOR SELECT
  USING ((EXISTS ( SELECT 1
   FROM public.participant_sessions ps
  WHERE ((ps.id = participants.session_id) AND (ps.status = 'active'::public.participant_session_status)))));
CREATE POLICY "participants_service_insert" ON public.participants FOR INSERT
  WITH CHECK (public.is_system_admin());
CREATE POLICY "participants_update" ON public.participants FOR UPDATE
  USING (((EXISTS ( SELECT 1
   FROM public.participant_sessions ps
  WHERE ((ps.id = participants.session_id) AND (ps.host_user_id = ( SELECT auth.uid() AS uid))))) OR public.is_system_admin()));
CREATE POLICY "payment_failures_admin_all" ON public.payment_failures
  USING (public.is_system_admin());
CREATE POLICY "payment_failures_select_own" ON public.payment_failures FOR SELECT
  USING ((tenant_id IN ( SELECT utm.tenant_id
   FROM public.user_tenant_memberships utm
  WHERE ((utm.user_id = ( SELECT auth.uid() AS uid)) AND (utm.role = ANY (ARRAY['owner'::public.tenant_role_enum, 'admin'::public.tenant_role_enum])) AND (utm.status = 'active'::text)))));
CREATE POLICY "payment_methods_select" ON public.payment_methods FOR SELECT
  USING (((tenant_id = ANY (public.get_user_tenant_ids())) OR public.is_system_admin()));
CREATE POLICY "payments_tenant_admin" ON public.payments
  USING ((public.is_system_admin() OR (EXISTS ( SELECT 1
   FROM public.invoices i
  WHERE ((i.id = payments.invoice_id) AND (public.has_tenant_role(i.tenant_id, 'admin'::public.tenant_role_enum) OR public.has_tenant_role(i.tenant_id, 'owner'::public.tenant_role_enum)))))))
  WITH CHECK ((public.is_system_admin() OR (EXISTS ( SELECT 1
   FROM public.invoices i
  WHERE ((i.id = payments.invoice_id) AND (public.has_tenant_role(i.tenant_id, 'admin'::public.tenant_role_enum) OR public.has_tenant_role(i.tenant_id, 'owner'::public.tenant_role_enum)))))));
CREATE POLICY "personalization_events_insert" ON public.personalization_events FOR INSERT
  WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "personalization_events_select" ON public.personalization_events FOR SELECT
  USING (((user_id = ( SELECT auth.uid() AS uid)) OR public.is_system_admin()));
CREATE POLICY "plan_blocks_delete" ON public.plan_blocks FOR DELETE
  USING ((plan_id IN ( SELECT plans.id
   FROM public.plans
  WHERE ((plans.owner_user_id = ( SELECT auth.uid() AS uid)) OR public.is_system_admin()))));
CREATE POLICY "plan_blocks_insert" ON public.plan_blocks FOR INSERT
  WITH CHECK ((plan_id IN ( SELECT plans.id
   FROM public.plans
  WHERE ((plans.owner_user_id = ( SELECT auth.uid() AS uid)) OR public.is_system_admin()))));
CREATE POLICY "plan_blocks_select" ON public.plan_blocks FOR SELECT
  USING ((plan_id IN ( SELECT plans.id
   FROM public.plans)));
CREATE POLICY "plan_blocks_update" ON public.plan_blocks FOR UPDATE
  USING ((plan_id IN ( SELECT plans.id
   FROM public.plans
  WHERE ((plans.owner_user_id = ( SELECT auth.uid() AS uid)) OR public.is_system_admin()))));
CREATE POLICY "plan_notes_private_manage" ON public.plan_notes_private
  USING ((EXISTS ( SELECT 1
   FROM public.plans p
  WHERE ((p.id = plan_notes_private.plan_id) AND (p.owner_user_id = ( SELECT auth.uid() AS uid))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.plans p
  WHERE ((p.id = plan_notes_private.plan_id) AND (p.owner_user_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY "plan_notes_tenant_delete" ON public.plan_notes_tenant FOR DELETE
  USING ((public.has_tenant_role(tenant_id, 'admin'::public.tenant_role_enum) AND (plan_id IN ( SELECT plans.id
   FROM public.plans))));
CREATE POLICY "plan_notes_tenant_insert" ON public.plan_notes_tenant FOR INSERT
  WITH CHECK (((tenant_id = ANY (public.get_user_tenant_ids())) AND (plan_id IN ( SELECT plans.id
   FROM public.plans))));
CREATE POLICY "plan_notes_tenant_select" ON public.plan_notes_tenant FOR SELECT
  USING (((tenant_id = ANY (public.get_user_tenant_ids())) AND (plan_id IN ( SELECT plans.id
   FROM public.plans))));
CREATE POLICY "plan_notes_tenant_update" ON public.plan_notes_tenant FOR UPDATE
  USING (((tenant_id = ANY (public.get_user_tenant_ids())) AND (plan_id IN ( SELECT plans.id
   FROM public.plans))));
CREATE POLICY "plan_play_progress_manage" ON public.plan_play_progress
  USING ((user_id = ( SELECT auth.uid() AS uid)))
  WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "plan_version_blocks_insert" ON public.plan_version_blocks FOR INSERT
  WITH CHECK ((plan_version_id IN ( SELECT pv.id
   FROM (public.plan_versions pv
     JOIN public.plans p ON ((p.id = pv.plan_id)))
  WHERE ((p.owner_user_id = ( SELECT auth.uid() AS uid)) OR public.is_system_admin()))));
CREATE POLICY "plan_version_blocks_select" ON public.plan_version_blocks FOR SELECT
  USING ((plan_version_id IN ( SELECT plan_versions.id
   FROM public.plan_versions)));
CREATE POLICY "plan_versions_insert" ON public.plan_versions FOR INSERT
  WITH CHECK ((plan_id IN ( SELECT plans.id
   FROM public.plans
  WHERE ((plans.owner_user_id = ( SELECT auth.uid() AS uid)) OR public.is_system_admin()))));
CREATE POLICY "plan_versions_select" ON public.plan_versions FOR SELECT
  USING ((plan_id IN ( SELECT plans.id
   FROM public.plans)));
CREATE POLICY "plans_delete" ON public.plans FOR DELETE
  USING (((owner_user_id = ( SELECT auth.uid() AS uid)) OR public.is_system_admin()));
CREATE POLICY "plans_insert" ON public.plans FOR INSERT
  WITH CHECK (((owner_user_id = ( SELECT auth.uid() AS uid)) AND ((owner_tenant_id IS NULL) OR public.is_tenant_member(owner_tenant_id))));
CREATE POLICY "plans_select" ON public.plans FOR SELECT
  USING (((owner_user_id = ( SELECT auth.uid() AS uid)) OR ((visibility = 'tenant'::public.plan_visibility_enum) AND public.is_tenant_member(owner_tenant_id)) OR (visibility = 'public'::public.plan_visibility_enum) OR public.is_system_admin()));
CREATE POLICY "plans_update" ON public.plans FOR UPDATE
  USING (((owner_user_id = ( SELECT auth.uid() AS uid)) OR ((visibility = 'tenant'::public.plan_visibility_enum) AND public.has_tenant_role(owner_tenant_id, 'admin'::public.tenant_role_enum)) OR public.is_system_admin()))
  WITH CHECK (((owner_user_id = ( SELECT auth.uid() AS uid)) OR ((visibility = 'tenant'::public.plan_visibility_enum) AND public.has_tenant_role(owner_tenant_id, 'admin'::public.tenant_role_enum)) OR public.is_system_admin()));
CREATE POLICY "play_chat_messages_manage" ON public.play_chat_messages
  USING (((EXISTS ( SELECT 1
   FROM public.participant_sessions ps
  WHERE ((ps.id = play_chat_messages.session_id) AND (ps.host_user_id = ( SELECT auth.uid() AS uid))))) OR public.is_system_admin()))
  WITH CHECK (((EXISTS ( SELECT 1
   FROM public.participant_sessions ps
  WHERE ((ps.id = play_chat_messages.session_id) AND (ps.host_user_id = ( SELECT auth.uid() AS uid))))) OR public.is_system_admin()));
CREATE POLICY "play_chat_messages_select_participant" ON public.play_chat_messages FOR SELECT
  USING (((visibility = 'public'::text) OR ((visibility = 'host'::text) AND (sender_participant_id IS NOT NULL) AND (sender_participant_id = ( SELECT participants.id
   FROM public.participants
  WHERE ((participants.participant_token = ((current_setting('request.headers'::text, true))::json ->> 'x-participant-token'::text)) AND (participants.session_id = play_chat_messages.session_id))
 LIMIT 1))) OR ((visibility = 'host'::text) AND (recipient_participant_id IS NOT NULL) AND (recipient_participant_id = ( SELECT participants.id
   FROM public.participants
  WHERE ((participants.participant_token = ((current_setting('request.headers'::text, true))::json ->> 'x-participant-token'::text)) AND (participants.session_id = play_chat_messages.session_id))
 LIMIT 1)))));
CREATE POLICY "player_cosmetics_insert" ON public.player_cosmetics FOR INSERT
  WITH CHECK (((user_id = ( SELECT auth.uid() AS uid)) OR public.is_system_admin()));
CREATE POLICY "player_cosmetics_select" ON public.player_cosmetics FOR SELECT
  USING ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY "player_cosmetics_update" ON public.player_cosmetics FOR UPDATE
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY "private_subscriptions_manage" ON public.private_subscriptions
  USING (((user_id = ( SELECT auth.uid() AS uid)) OR public.is_system_admin()))
  WITH CHECK (((user_id = ( SELECT auth.uid() AS uid)) OR public.is_system_admin()));
CREATE POLICY "private_subscriptions_select" ON public.private_subscriptions FOR SELECT
  USING (((user_id = ( SELECT auth.uid() AS uid)) OR public.is_system_admin()));
CREATE POLICY "product_audit_log_system_admin_insert" ON public.product_audit_log FOR INSERT
  WITH CHECK (public.is_system_admin());
CREATE POLICY "product_audit_log_system_admin_select" ON public.product_audit_log FOR SELECT
  USING (public.is_system_admin());
CREATE POLICY "product_prices_admin_all" ON public.product_prices
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());
CREATE POLICY "product_prices_public_select" ON public.product_prices FOR SELECT
  USING (((active = true) AND (EXISTS ( SELECT 1
   FROM public.products p
  WHERE ((p.id = product_prices.product_id) AND (p.status = 'active'::text))))));
CREATE POLICY "product_prices_read_active" ON public.product_prices FOR SELECT
  USING ((active = true));
CREATE POLICY "product_purposes_select" ON public.product_purposes FOR SELECT
  USING (true);
CREATE POLICY "product_purposes_write_admin" ON public.product_purposes
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());
CREATE POLICY "product_usage_pricing_admin" ON public.product_usage_pricing
  USING (public.is_system_admin());
CREATE POLICY "product_usage_pricing_select" ON public.product_usage_pricing FOR SELECT
  USING (true);
CREATE POLICY "products_public_select" ON public.products FOR SELECT
  USING ((status = 'active'::text));
CREATE POLICY "products_select_all" ON public.products FOR SELECT
  USING (true);
CREATE POLICY "products_system_admin_manage" ON public.products
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());
CREATE POLICY "products_write_admin" ON public.products
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());
CREATE POLICY "promo_codes_select" ON public.promo_codes FOR SELECT
  USING (true);
CREATE POLICY "purchase_intents_manage" ON public.purchase_intents
  USING (((auth.role() = 'service_role'::text) OR ((( SELECT auth.uid() AS uid) IS NOT NULL) AND (( SELECT auth.uid() AS uid) = user_id))))
  WITH CHECK (((auth.role() = 'service_role'::text) OR ((( SELECT auth.uid() AS uid) IS NOT NULL) AND (( SELECT auth.uid() AS uid) = user_id))));
CREATE POLICY "purchase_intents_select" ON public.purchase_intents FOR SELECT
  USING (((auth.role() = 'service_role'::text) OR ((( SELECT auth.uid() AS uid) IS NOT NULL) AND (( SELECT auth.uid() AS uid) = user_id))));
CREATE POLICY "purposes_select_all" ON public.purposes FOR SELECT
  USING (true);
CREATE POLICY "purposes_write_admin" ON public.purposes
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());
CREATE POLICY "quote_activities_admin_all" ON public.quote_activities
  USING (public.is_system_admin());
CREATE POLICY "quote_line_items_admin_all" ON public.quote_line_items
  USING (public.is_system_admin());
CREATE POLICY "quotes_admin_all" ON public.quotes
  USING (public.is_system_admin());
CREATE POLICY "quotes_tenant_select" ON public.quotes FOR SELECT
  USING ((tenant_id IN ( SELECT user_tenant_memberships.tenant_id
   FROM public.user_tenant_memberships
  WHERE ((user_tenant_memberships.user_id = ( SELECT auth.uid() AS uid)) AND (user_tenant_memberships.role = ANY (ARRAY['owner'::public.tenant_role_enum, 'admin'::public.tenant_role_enum])) AND (user_tenant_memberships.status = 'active'::text)))));
CREATE POLICY "recommendation_history_select" ON public.recommendation_history FOR SELECT
  USING ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "recommendation_history_update" ON public.recommendation_history FOR UPDATE
  USING ((user_id = ( SELECT auth.uid() AS uid)))
  WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "role_permissions_admin_all" ON public.role_permissions
  USING (public.is_global_admin())
  WITH CHECK (public.is_global_admin());
CREATE POLICY "run_sessions_delete" ON public.run_sessions FOR DELETE
  USING (((run_id IN ( SELECT runs.id
   FROM public.runs
  WHERE (runs.user_id = ( SELECT auth.uid() AS uid)))) OR public.is_system_admin()));
CREATE POLICY "run_sessions_insert" ON public.run_sessions FOR INSERT
  WITH CHECK ((run_id IN ( SELECT runs.id
   FROM public.runs
  WHERE (runs.user_id = ( SELECT auth.uid() AS uid)))));
CREATE POLICY "run_sessions_select" ON public.run_sessions FOR SELECT
  USING (((run_id IN ( SELECT runs.id
   FROM public.runs
  WHERE (runs.user_id = ( SELECT auth.uid() AS uid)))) OR public.is_system_admin()));
CREATE POLICY "run_sessions_update" ON public.run_sessions FOR UPDATE
  USING ((run_id IN ( SELECT runs.id
   FROM public.runs
  WHERE (runs.user_id = ( SELECT auth.uid() AS uid)))))
  WITH CHECK ((run_id IN ( SELECT runs.id
   FROM public.runs
  WHERE (runs.user_id = ( SELECT auth.uid() AS uid)))));
CREATE POLICY "runs_insert" ON public.runs FOR INSERT
  WITH CHECK (((user_id = ( SELECT auth.uid() AS uid)) AND (plan_version_id IN ( SELECT plan_versions.id
   FROM public.plan_versions))));
CREATE POLICY "runs_select" ON public.runs FOR SELECT
  USING (((user_id = ( SELECT auth.uid() AS uid)) OR public.is_system_admin()));
CREATE POLICY "runs_update" ON public.runs FOR UPDATE
  USING ((user_id = ( SELECT auth.uid() AS uid)))
  WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "saved_items_manage" ON public.saved_items
  USING ((user_id = ( SELECT auth.uid() AS uid)))
  WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "saved_items_select" ON public.saved_items FOR SELECT
  USING ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "system_admin_select_job_runs" ON public.scheduled_job_runs FOR SELECT
  USING (public.is_system_admin());
CREATE POLICY "seasonal_achievements_select" ON public.seasonal_achievements FOR SELECT
  USING (true);
CREATE POLICY "seasonal_events_select" ON public.seasonal_events FOR SELECT
  USING (((EXISTS ( SELECT 1
   FROM public.user_tenant_memberships utm
  WHERE ((utm.user_id = ( SELECT auth.uid() AS uid)) AND (utm.tenant_id = seasonal_events.tenant_id)))) OR public.is_system_admin() OR (tenant_id IS NULL)));
CREATE POLICY "session_analytics_insert" ON public.session_analytics FOR INSERT
  WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "session_artifact_assignments_manage" ON public.session_artifact_assignments
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());
CREATE POLICY "session_artifact_state_host_all" ON public.session_artifact_state
  USING ((EXISTS ( SELECT 1
   FROM public.participant_sessions ps
  WHERE ((ps.id = session_artifact_state.session_id) AND (ps.host_user_id = ( SELECT auth.uid() AS uid))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.participant_sessions ps
  WHERE ((ps.id = session_artifact_state.session_id) AND (ps.host_user_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY "session_artifact_state_service" ON public.session_artifact_state
  USING ((auth.role() = 'service_role'::text))
  WITH CHECK ((auth.role() = 'service_role'::text));
CREATE POLICY "session_artifact_variant_assignments_v2_host" ON public.session_artifact_variant_assignments_v2
  USING ((EXISTS ( SELECT 1
   FROM public.participant_sessions ps
  WHERE ((ps.id = session_artifact_variant_assignments_v2.session_id) AND (ps.host_user_id = ( SELECT auth.uid() AS uid))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.participant_sessions ps
  WHERE ((ps.id = session_artifact_variant_assignments_v2.session_id) AND (ps.host_user_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY "session_artifact_variant_assignments_v2_host_all" ON public.session_artifact_variant_assignments_v2
  USING ((EXISTS ( SELECT 1
   FROM public.participant_sessions ps
  WHERE ((ps.id = session_artifact_variant_assignments_v2.session_id) AND (ps.host_user_id = auth.uid())))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.participant_sessions ps
  WHERE ((ps.id = session_artifact_variant_assignments_v2.session_id) AND (ps.host_user_id = auth.uid())))));
CREATE POLICY "session_artifact_variant_assignments_v2_service" ON public.session_artifact_variant_assignments_v2
  USING ((auth.role() = 'service_role'::text))
  WITH CHECK ((auth.role() = 'service_role'::text));
CREATE POLICY "session_artifact_variant_state_host_all" ON public.session_artifact_variant_state
  USING ((EXISTS ( SELECT 1
   FROM public.participant_sessions ps
  WHERE ((ps.id = session_artifact_variant_state.session_id) AND (ps.host_user_id = ( SELECT auth.uid() AS uid))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.participant_sessions ps
  WHERE ((ps.id = session_artifact_variant_state.session_id) AND (ps.host_user_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY "session_artifact_variant_state_service" ON public.session_artifact_variant_state
  USING ((auth.role() = 'service_role'::text))
  WITH CHECK ((auth.role() = 'service_role'::text));
CREATE POLICY "session_artifact_variants_manage" ON public.session_artifact_variants
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());
CREATE POLICY "host_can_manage_session_artifacts" ON public.session_artifacts
  USING ((EXISTS ( SELECT 1
   FROM public.participant_sessions ps
  WHERE ((ps.id = session_artifacts.session_id) AND (ps.host_user_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY "session_artifacts_manage" ON public.session_artifacts
  USING (((EXISTS ( SELECT 1
   FROM public.participant_sessions ps
  WHERE ((ps.id = session_artifacts.session_id) AND (ps.host_user_id = ( SELECT auth.uid() AS uid))))) OR public.is_system_admin()))
  WITH CHECK (((EXISTS ( SELECT 1
   FROM public.participant_sessions ps
  WHERE ((ps.id = session_artifacts.session_id) AND (ps.host_user_id = ( SELECT auth.uid() AS uid))))) OR public.is_system_admin()));
CREATE POLICY "session_commands_admin_select" ON public.session_commands FOR SELECT
  USING (((((auth.jwt() -> 'user_metadata'::text) ->> 'is_system_admin'::text))::boolean = true));
CREATE POLICY "session_commands_insert" ON public.session_commands FOR INSERT
  WITH CHECK (((issued_by = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.participant_sessions ps
  WHERE ((ps.id = session_commands.session_id) AND (ps.host_user_id = auth.uid()))))));
CREATE POLICY "session_commands_select" ON public.session_commands FOR SELECT
  USING ((EXISTS ( SELECT 1
   FROM public.participant_sessions ps
  WHERE ((ps.id = session_commands.session_id) AND (ps.host_user_id = auth.uid())))));
CREATE POLICY "session_decisions_manage" ON public.session_decisions
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());
CREATE POLICY "session_events_insert" ON public.session_events FOR INSERT
  WITH CHECK (((EXISTS ( SELECT 1
   FROM public.participant_sessions ps
  WHERE ((ps.id = session_events.session_id) AND (ps.host_user_id = ( SELECT auth.uid() AS uid))))) OR public.is_system_admin()));
CREATE POLICY "session_events_select" ON public.session_events FOR SELECT
  USING ((EXISTS ( SELECT 1
   FROM public.participant_sessions ps
  WHERE ((ps.id = session_events.session_id) AND ((ps.host_user_id = ( SELECT auth.uid() AS uid)) OR public.is_system_admin())))));
CREATE POLICY "session_outcomes_manage" ON public.session_outcomes
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());
CREATE POLICY "session_roles_manage" ON public.session_roles
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());
CREATE POLICY "session_roles_select" ON public.session_roles FOR SELECT
  USING ((EXISTS ( SELECT 1
   FROM public.participant_sessions ps
  WHERE ((ps.id = session_roles.session_id) AND (ps.host_user_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY "session_signals_manage" ON public.session_signals
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());
CREATE POLICY "session_statistics_select" ON public.session_statistics FOR SELECT
  USING (((EXISTS ( SELECT 1
   FROM public.participant_sessions ps
  WHERE ((ps.id = session_statistics.session_id) AND (ps.host_user_id = ( SELECT auth.uid() AS uid))))) OR public.is_system_admin()));
CREATE POLICY "system_can_manage_stats" ON public.session_statistics
  USING (public.is_system_admin());
CREATE POLICY "host_can_manage_time_bank" ON public.session_time_bank
  USING ((EXISTS ( SELECT 1
   FROM public.participant_sessions ps
  WHERE ((ps.id = session_time_bank.session_id) AND (ps.host_user_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY "session_time_bank_manage" ON public.session_time_bank
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());
CREATE POLICY "host_can_view_time_bank_ledger" ON public.session_time_bank_ledger FOR SELECT
  USING ((EXISTS ( SELECT 1
   FROM public.participant_sessions ps
  WHERE ((ps.id = session_time_bank_ledger.session_id) AND (ps.host_user_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY "session_time_bank_ledger_manage" ON public.session_time_bank_ledger
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());
CREATE POLICY "session_trigger_idempotency_service_policy" ON public.session_trigger_idempotency
  USING (true)
  WITH CHECK (true);
CREATE POLICY "session_trigger_state_host_all" ON public.session_trigger_state
  USING ((EXISTS ( SELECT 1
   FROM public.participant_sessions ps
  WHERE ((ps.id = session_trigger_state.session_id) AND (ps.host_user_id = ( SELECT auth.uid() AS uid))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.participant_sessions ps
  WHERE ((ps.id = session_trigger_state.session_id) AND (ps.host_user_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY "session_trigger_state_host_policy" ON public.session_trigger_state
  USING ((EXISTS ( SELECT 1
   FROM public.participant_sessions ps
  WHERE ((ps.id = session_trigger_state.session_id) AND (ps.host_user_id = auth.uid())))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.participant_sessions ps
  WHERE ((ps.id = session_trigger_state.session_id) AND (ps.host_user_id = auth.uid())))));
CREATE POLICY "session_trigger_state_service" ON public.session_trigger_state
  USING ((auth.role() = 'service_role'::text))
  WITH CHECK ((auth.role() = 'service_role'::text));
CREATE POLICY "session_trigger_state_service_policy" ON public.session_trigger_state
  USING (true)
  WITH CHECK (true);
CREATE POLICY "host_can_manage_session_triggers" ON public.session_triggers
  USING ((EXISTS ( SELECT 1
   FROM public.participant_sessions ps
  WHERE ((ps.id = session_triggers.session_id) AND (ps.host_user_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY "session_triggers_manage" ON public.session_triggers
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());
CREATE POLICY "session_votes_manage" ON public.session_votes
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());
CREATE POLICY "shop_item_translations_admin_all" ON public.shop_item_translations
  USING ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = ( SELECT auth.uid() AS uid)) AND (u.global_role = 'system_admin'::public.global_role_enum)))));
CREATE POLICY "shop_item_translations_select" ON public.shop_item_translations FOR SELECT
  USING (true);
CREATE POLICY "shop_items_select" ON public.shop_items FOR SELECT
  USING (true);
CREATE POLICY "service_role_insert_leaderboards" ON public.social_leaderboards FOR INSERT
  WITH CHECK ((auth.role() = 'service_role'::text));
CREATE POLICY "service_role_update_leaderboards" ON public.social_leaderboards FOR UPDATE
  USING ((auth.role() = 'service_role'::text));
CREATE POLICY "social_leaderboards_select" ON public.social_leaderboards FOR SELECT
  USING ((tenant_id = ANY (public.get_user_tenant_ids())));
CREATE POLICY "delete_artifact" ON public.spatial_artifacts FOR DELETE
  USING ((((tenant_id IS NOT NULL) AND (tenant_id = ANY (public.get_user_tenant_ids()))) OR ((tenant_id IS NULL) AND (visibility = 'private'::text) AND (created_by = ( SELECT auth.uid() AS uid)))));
CREATE POLICY "insert_artifact" ON public.spatial_artifacts FOR INSERT
  WITH CHECK ((((tenant_id IS NOT NULL) AND (tenant_id = ANY (public.get_user_tenant_ids()))) OR ((tenant_id IS NULL) AND (visibility = 'private'::text) AND (created_by = ( SELECT auth.uid() AS uid))) OR ((tenant_id IS NULL) AND (visibility = 'public'::text))));
CREATE POLICY "select_artifact" ON public.spatial_artifacts FOR SELECT
  USING ((((tenant_id IS NOT NULL) AND (tenant_id = ANY (public.get_user_tenant_ids()))) OR ((tenant_id IS NULL) AND (visibility = 'public'::text)) OR ((tenant_id IS NULL) AND (visibility = 'private'::text) AND (created_by = ( SELECT auth.uid() AS uid)))));
CREATE POLICY "update_artifact" ON public.spatial_artifacts FOR UPDATE
  USING ((((tenant_id IS NOT NULL) AND (tenant_id = ANY (public.get_user_tenant_ids()))) OR ((tenant_id IS NULL) AND (visibility = 'private'::text) AND (created_by = ( SELECT auth.uid() AS uid)))))
  WITH CHECK ((((tenant_id IS NOT NULL) AND (tenant_id = ANY (public.get_user_tenant_ids()))) OR ((tenant_id IS NULL) AND (visibility = 'private'::text) AND (created_by = ( SELECT auth.uid() AS uid)))));
CREATE POLICY "subscription_items_tenant_admin" ON public.subscription_items
  USING ((public.is_system_admin() OR (EXISTS ( SELECT 1
   FROM public.tenant_subscriptions ts
  WHERE ((ts.id = subscription_items.subscription_id) AND (public.has_tenant_role(ts.tenant_id, 'admin'::public.tenant_role_enum) OR public.has_tenant_role(ts.tenant_id, 'owner'::public.tenant_role_enum)))))))
  WITH CHECK ((public.is_system_admin() OR (EXISTS ( SELECT 1
   FROM public.tenant_subscriptions ts
  WHERE ((ts.id = subscription_items.subscription_id) AND (public.has_tenant_role(ts.tenant_id, 'admin'::public.tenant_role_enum) OR public.has_tenant_role(ts.tenant_id, 'owner'::public.tenant_role_enum)))))));
CREATE POLICY "subscriptions_select" ON public.subscriptions FOR SELECT
  USING (((tenant_id = ANY (public.get_user_tenant_ids())) OR public.is_system_admin()));
CREATE POLICY "subscriptions_service_insert" ON public.subscriptions FOR INSERT
  WITH CHECK (public.is_system_admin());
CREATE POLICY "admins_can_create_faqs" ON public.support_faq_entries FOR INSERT
  WITH CHECK ((((tenant_id IS NOT NULL) AND public.has_tenant_role(tenant_id, ARRAY['admin'::public.tenant_role_enum, 'owner'::public.tenant_role_enum])) OR ((tenant_id IS NULL) AND public.is_system_admin())));
CREATE POLICY "admins_can_delete_faqs" ON public.support_faq_entries FOR DELETE
  USING ((((tenant_id IS NOT NULL) AND public.has_tenant_role(tenant_id, ARRAY['admin'::public.tenant_role_enum, 'owner'::public.tenant_role_enum])) OR ((tenant_id IS NULL) AND public.is_system_admin())));
CREATE POLICY "admins_can_update_faqs" ON public.support_faq_entries FOR UPDATE
  USING ((((tenant_id IS NOT NULL) AND public.has_tenant_role(tenant_id, ARRAY['admin'::public.tenant_role_enum, 'owner'::public.tenant_role_enum])) OR ((tenant_id IS NULL) AND public.is_system_admin())));
CREATE POLICY "anyone_can_read_published_faqs" ON public.support_faq_entries FOR SELECT
  USING ((((is_published = true) AND (tenant_id IS NULL)) OR ((is_published = true) AND (tenant_id = ANY (public.get_user_tenant_ids()))) OR ((tenant_id = ANY (public.get_user_tenant_ids())) AND public.has_tenant_role(tenant_id, ARRAY['admin'::public.tenant_role_enum, 'owner'::public.tenant_role_enum]))));
CREATE POLICY "support_reports_select" ON public.support_reports FOR SELECT
  USING ((public.is_system_admin() OR public.has_tenant_role(tenant_id, 'admin'::public.tenant_role_enum) OR public.has_tenant_role(tenant_id, 'owner'::public.tenant_role_enum)));
CREATE POLICY "support_reports_write" ON public.support_reports
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());
CREATE POLICY "support_tickets_user_access" ON public.support_tickets
  USING (((user_id = ( SELECT auth.uid() AS uid)) OR public.is_system_admin()))
  WITH CHECK (((user_id = ( SELECT auth.uid() AS uid)) OR public.is_system_admin()));
CREATE POLICY "system_audit_logs_select" ON public.system_audit_logs FOR SELECT
  USING (public.is_system_admin());
CREATE POLICY "System admin can read system design config" ON public.system_design_config FOR SELECT
  USING (public.is_system_admin_jwt_only());
CREATE POLICY "System admin can update system design config" ON public.system_design_config FOR UPDATE
  USING (public.is_system_admin_jwt_only())
  WITH CHECK (public.is_system_admin_jwt_only());
CREATE POLICY "system_jobs_runs_select" ON public.system_jobs_runs FOR SELECT
  USING (public.is_system_admin());
CREATE POLICY "tenant_audit_logs_insert" ON public.tenant_audit_logs FOR INSERT
  WITH CHECK ((public.is_system_admin() OR public.has_tenant_role(tenant_id, 'admin'::public.tenant_role_enum) OR public.has_tenant_role(tenant_id, 'owner'::public.tenant_role_enum)));
CREATE POLICY "tenant_audit_logs_select" ON public.tenant_audit_logs FOR SELECT
  USING ((public.is_system_admin() OR public.has_tenant_role(tenant_id, 'admin'::public.tenant_role_enum) OR public.has_tenant_role(tenant_id, 'owner'::public.tenant_role_enum)));
CREATE POLICY "tenant_branding_mutate" ON public.tenant_branding
  USING ((public.is_system_admin() OR (tenant_id = ANY (public.get_user_tenant_ids()))))
  WITH CHECK ((public.is_system_admin() OR (tenant_id = ANY (public.get_user_tenant_ids()))));
CREATE POLICY "tenant_branding_select" ON public.tenant_branding FOR SELECT
  USING ((public.is_system_admin() OR (tenant_id = ANY (public.get_user_tenant_ids()))));
CREATE POLICY "System admin full access to tenant design config" ON public.tenant_design_config
  USING (public.is_system_admin_jwt_only())
  WITH CHECK (public.is_system_admin_jwt_only());
CREATE POLICY "Tenant admin can manage own design if enabled" ON public.tenant_design_config
  USING (((EXISTS ( SELECT 1
   FROM public.tenants t
  WHERE ((t.id = tenant_design_config.tenant_id) AND (t.tenant_branding_enabled = true)))) AND public.has_tenant_role(tenant_id, ARRAY['owner'::public.tenant_role_enum, 'admin'::public.tenant_role_enum])))
  WITH CHECK (((EXISTS ( SELECT 1
   FROM public.tenants t
  WHERE ((t.id = tenant_design_config.tenant_id) AND (t.tenant_branding_enabled = true)))) AND public.has_tenant_role(tenant_id, ARRAY['owner'::public.tenant_role_enum, 'admin'::public.tenant_role_enum])));
CREATE POLICY "Tenant admin can read own tenant design config" ON public.tenant_design_config FOR SELECT
  USING ((EXISTS ( SELECT 1
   FROM public.user_tenant_memberships m
  WHERE ((m.tenant_id = tenant_design_config.tenant_id) AND (m.user_id = ( SELECT auth.uid() AS uid)) AND (m.role = ANY (ARRAY['owner'::public.tenant_role_enum, 'admin'::public.tenant_role_enum]))))));
CREATE POLICY "Tenant admin can update own tenant design config" ON public.tenant_design_config FOR UPDATE
  USING ((EXISTS ( SELECT 1
   FROM public.user_tenant_memberships m
  WHERE ((m.tenant_id = tenant_design_config.tenant_id) AND (m.user_id = ( SELECT auth.uid() AS uid)) AND (m.role = ANY (ARRAY['owner'::public.tenant_role_enum, 'admin'::public.tenant_role_enum]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.user_tenant_memberships m
  WHERE ((m.tenant_id = tenant_design_config.tenant_id) AND (m.user_id = ( SELECT auth.uid() AS uid)) AND (m.role = ANY (ARRAY['owner'::public.tenant_role_enum, 'admin'::public.tenant_role_enum]))))));
CREATE POLICY "system_admin_manage_tenant_domains" ON public.tenant_domains
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());
CREATE POLICY "tenant_domains_select" ON public.tenant_domains FOR SELECT
  USING (((status = 'active'::text) OR ((tenant_id = ANY (public.get_user_tenant_ids())) AND (public.has_tenant_role(tenant_id, 'admin'::public.tenant_role_enum) OR public.has_tenant_role(tenant_id, 'owner'::public.tenant_role_enum))) OR public.is_system_admin()));
CREATE POLICY "tenant_entitlement_seat_assignments_manage" ON public.tenant_entitlement_seat_assignments
  USING (((auth.role() = 'service_role'::text) OR public.is_system_admin() OR public.has_tenant_role(tenant_id, ARRAY['owner'::public.tenant_role_enum, 'admin'::public.tenant_role_enum])))
  WITH CHECK (((auth.role() = 'service_role'::text) OR public.is_system_admin() OR public.has_tenant_role(tenant_id, ARRAY['owner'::public.tenant_role_enum, 'admin'::public.tenant_role_enum])));
CREATE POLICY "tenant_entitlement_seat_assignments_select" ON public.tenant_entitlement_seat_assignments FOR SELECT
  USING ((public.is_system_admin() OR public.has_tenant_role(tenant_id, ARRAY['owner'::public.tenant_role_enum, 'admin'::public.tenant_role_enum]) OR ((( SELECT auth.uid() AS uid) = user_id) AND public.has_tenant_role(tenant_id, ARRAY['owner'::public.tenant_role_enum, 'admin'::public.tenant_role_enum, 'member'::public.tenant_role_enum]))));
CREATE POLICY "tenant_features_mutate" ON public.tenant_features
  USING ((public.is_system_admin() OR (tenant_id = ANY (public.get_user_tenant_ids()))))
  WITH CHECK ((public.is_system_admin() OR (tenant_id = ANY (public.get_user_tenant_ids()))));
CREATE POLICY "tenant_features_select" ON public.tenant_features FOR SELECT
  USING ((public.is_system_admin() OR (tenant_id = ANY (public.get_user_tenant_ids()))));
CREATE POLICY "tenant_invitations_select" ON public.tenant_invitations FOR SELECT
  USING ((public.is_system_admin() OR (tenant_id = ANY (public.get_user_tenant_ids()))));
CREATE POLICY "tenant_mfa_policies_modify" ON public.tenant_mfa_policies
  USING ((public.is_system_admin() OR public.has_tenant_role(tenant_id, ARRAY['owner'::public.tenant_role_enum, 'admin'::public.tenant_role_enum])))
  WITH CHECK ((public.is_system_admin() OR public.has_tenant_role(tenant_id, ARRAY['owner'::public.tenant_role_enum, 'admin'::public.tenant_role_enum])));
CREATE POLICY "tenant_mfa_policies_select" ON public.tenant_mfa_policies FOR SELECT
  USING ((public.is_system_admin() OR (tenant_id = ANY (public.get_user_tenant_ids()))));
CREATE POLICY "tenant_product_entitlements_manage" ON public.tenant_product_entitlements
  USING (((auth.role() = 'service_role'::text) OR public.is_system_admin() OR public.has_tenant_role(tenant_id, ARRAY['owner'::public.tenant_role_enum, 'admin'::public.tenant_role_enum])))
  WITH CHECK (((auth.role() = 'service_role'::text) OR public.is_system_admin() OR public.has_tenant_role(tenant_id, ARRAY['owner'::public.tenant_role_enum, 'admin'::public.tenant_role_enum])));
CREATE POLICY "tenant_product_entitlements_select" ON public.tenant_product_entitlements FOR SELECT
  USING ((public.is_system_admin() OR public.has_tenant_role(tenant_id, ARRAY['owner'::public.tenant_role_enum, 'admin'::public.tenant_role_enum, 'member'::public.tenant_role_enum])));
CREATE POLICY "vault_system_admin_select" ON public.tenant_restore_vault FOR SELECT
  USING (public.is_system_admin());
CREATE POLICY "tenant_seat_assignments_admin" ON public.tenant_seat_assignments
  USING ((public.is_system_admin() OR public.has_tenant_role(tenant_id, 'admin'::public.tenant_role_enum) OR public.has_tenant_role(tenant_id, 'owner'::public.tenant_role_enum)))
  WITH CHECK ((public.is_system_admin() OR public.has_tenant_role(tenant_id, 'admin'::public.tenant_role_enum) OR public.has_tenant_role(tenant_id, 'owner'::public.tenant_role_enum)));
CREATE POLICY "tenant_settings_insert" ON public.tenant_settings FOR INSERT
  WITH CHECK ((public.is_system_admin() OR (tenant_id = ANY (public.get_user_tenant_ids()))));
CREATE POLICY "tenant_settings_select" ON public.tenant_settings FOR SELECT
  USING ((public.is_system_admin() OR (tenant_id = ANY (public.get_user_tenant_ids()))));
CREATE POLICY "tenant_settings_update" ON public.tenant_settings FOR UPDATE
  USING ((public.is_system_admin() OR (tenant_id = ANY (public.get_user_tenant_ids()))))
  WITH CHECK ((public.is_system_admin() OR (tenant_id = ANY (public.get_user_tenant_ids()))));
CREATE POLICY "tenant_subscriptions_admin" ON public.tenant_subscriptions
  USING ((public.is_system_admin() OR public.has_tenant_role(tenant_id, 'admin'::public.tenant_role_enum) OR public.has_tenant_role(tenant_id, 'owner'::public.tenant_role_enum)))
  WITH CHECK ((public.is_system_admin() OR public.has_tenant_role(tenant_id, 'admin'::public.tenant_role_enum) OR public.has_tenant_role(tenant_id, 'owner'::public.tenant_role_enum)));
CREATE POLICY "tenant_translation_overrides_delete" ON public.tenant_translation_overrides FOR DELETE
  USING (((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = ( SELECT auth.uid() AS uid)) AND (u.global_role = 'system_admin'::public.global_role_enum)))) OR (EXISTS ( SELECT 1
   FROM public.tenant_memberships tm
  WHERE ((tm.tenant_id = tenant_translation_overrides.tenant_id) AND (tm.user_id = ( SELECT auth.uid() AS uid)) AND (tm.role = ANY (ARRAY['owner'::public.tenant_role_enum, 'admin'::public.tenant_role_enum])))))));
CREATE POLICY "tenant_translation_overrides_insert" ON public.tenant_translation_overrides FOR INSERT
  WITH CHECK (((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = ( SELECT auth.uid() AS uid)) AND (u.global_role = 'system_admin'::public.global_role_enum)))) OR (EXISTS ( SELECT 1
   FROM public.tenant_memberships tm
  WHERE ((tm.tenant_id = tenant_translation_overrides.tenant_id) AND (tm.user_id = ( SELECT auth.uid() AS uid)) AND (tm.role = ANY (ARRAY['owner'::public.tenant_role_enum, 'admin'::public.tenant_role_enum])))))));
CREATE POLICY "tenant_translation_overrides_select" ON public.tenant_translation_overrides FOR SELECT
  USING (((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = ( SELECT auth.uid() AS uid)) AND (u.global_role = 'system_admin'::public.global_role_enum)))) OR (EXISTS ( SELECT 1
   FROM public.tenant_memberships tm
  WHERE ((tm.tenant_id = tenant_translation_overrides.tenant_id) AND (tm.user_id = ( SELECT auth.uid() AS uid)) AND (tm.role = ANY (ARRAY['owner'::public.tenant_role_enum, 'admin'::public.tenant_role_enum])))))));
CREATE POLICY "tenant_translation_overrides_update" ON public.tenant_translation_overrides FOR UPDATE
  USING (((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = ( SELECT auth.uid() AS uid)) AND (u.global_role = 'system_admin'::public.global_role_enum)))) OR (EXISTS ( SELECT 1
   FROM public.tenant_memberships tm
  WHERE ((tm.tenant_id = tenant_translation_overrides.tenant_id) AND (tm.user_id = ( SELECT auth.uid() AS uid)) AND (tm.role = ANY (ARRAY['owner'::public.tenant_role_enum, 'admin'::public.tenant_role_enum])))))));
CREATE POLICY "demo_tenant_delete_protection" ON public.tenants FOR DELETE
  USING (((demo_flag = false) OR (( SELECT users.global_role
   FROM public.users
  WHERE (users.id = ( SELECT auth.uid() AS uid))) = 'system_admin'::public.global_role_enum)));
CREATE POLICY "demo_tenant_write_protection" ON public.tenants FOR UPDATE
  USING (((demo_flag = false) OR (( SELECT users.global_role
   FROM public.users
  WHERE (users.id = ( SELECT auth.uid() AS uid))) = 'system_admin'::public.global_role_enum)));
CREATE POLICY "hide_anonymized_tenants" ON public.tenants AS RESTRICTIVE FOR SELECT
  USING (((status <> 'anonymized'::text) OR public.is_system_admin()));
CREATE POLICY "system_admin_can_manage_all_tenants" ON public.tenants
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());
CREATE POLICY "tenant_admins_can_delete" ON public.tenants FOR DELETE
  USING (public.is_global_admin());
CREATE POLICY "tenant_admins_can_update" ON public.tenants FOR UPDATE
  USING ((public.has_tenant_role(id, 'admin'::public.tenant_role_enum) OR public.has_tenant_role(id, 'owner'::public.tenant_role_enum)))
  WITH CHECK ((public.has_tenant_role(id, 'admin'::public.tenant_role_enum) OR public.has_tenant_role(id, 'owner'::public.tenant_role_enum)));
CREATE POLICY "tenants_insert_admin" ON public.tenants FOR INSERT
  WITH CHECK (public.is_system_admin());
CREATE POLICY "tenants_select_member" ON public.tenants FOR SELECT
  USING ((id = ANY (public.get_user_tenant_ids())));
CREATE POLICY "tenants_select_sysadmin" ON public.tenants FOR SELECT
  USING (public.is_system_admin());
CREATE POLICY "ticket_messages_insert" ON public.ticket_messages FOR INSERT
  WITH CHECK (((EXISTS ( SELECT 1
   FROM public.support_tickets st
  WHERE ((st.id = ticket_messages.ticket_id) AND (st.user_id = ( SELECT auth.uid() AS uid))))) OR public.is_system_admin()));
CREATE POLICY "admins_can_manage_routing_rules" ON public.ticket_routing_rules
  USING ((public.is_system_admin() OR ((tenant_id IS NOT NULL) AND public.has_tenant_role(tenant_id, ARRAY['admin'::public.tenant_role_enum, 'owner'::public.tenant_role_enum]))));
CREATE POLICY "translation_audit_log_select" ON public.translation_audit_log FOR SELECT
  USING ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = ( SELECT auth.uid() AS uid)) AND (u.global_role = 'system_admin'::public.global_role_enum)))));
CREATE POLICY "translation_missing_keys_insert" ON public.translation_missing_keys FOR INSERT
  WITH CHECK (((key IS NOT NULL) AND (length(key) > 0) AND (length(key) <= 500) AND (locale IS NOT NULL) AND ((occurrence_count IS NULL) OR (occurrence_count > 0))));
CREATE POLICY "translation_missing_keys_select" ON public.translation_missing_keys FOR SELECT
  USING ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = ( SELECT auth.uid() AS uid)) AND (u.global_role = 'system_admin'::public.global_role_enum)))));
CREATE POLICY "translation_missing_keys_update" ON public.translation_missing_keys FOR UPDATE
  USING ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = ( SELECT auth.uid() AS uid)) AND (u.global_role = 'system_admin'::public.global_role_enum)))));
CREATE POLICY "trial_usage_select" ON public.trial_usage FOR SELECT
  USING (((tenant_id = ANY (public.get_user_tenant_ids())) OR public.is_system_admin()));
CREATE POLICY "trial_usage_service_insert" ON public.trial_usage FOR INSERT
  WITH CHECK (public.is_system_admin());
CREATE POLICY "trial_usage_service_update" ON public.trial_usage FOR UPDATE
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());
CREATE POLICY "usage_meters_admin" ON public.usage_meters
  USING (public.is_system_admin());
CREATE POLICY "usage_meters_select" ON public.usage_meters FOR SELECT
  USING (true);
CREATE POLICY "usage_records_admin" ON public.usage_records
  USING (public.is_system_admin());
CREATE POLICY "usage_records_select_own" ON public.usage_records FOR SELECT
  USING ((tenant_id IN ( SELECT user_tenant_memberships.tenant_id
   FROM public.user_tenant_memberships
  WHERE ((user_tenant_memberships.user_id = ( SELECT auth.uid() AS uid)) AND (user_tenant_memberships.status = 'active'::text)))));
CREATE POLICY "usage_summaries_admin" ON public.usage_summaries
  USING (public.is_system_admin());
CREATE POLICY "usage_summaries_select_own" ON public.usage_summaries FOR SELECT
  USING ((tenant_id IN ( SELECT user_tenant_memberships.tenant_id
   FROM public.user_tenant_memberships
  WHERE ((user_tenant_memberships.user_id = ( SELECT auth.uid() AS uid)) AND (user_tenant_memberships.role = ANY (ARRAY['owner'::public.tenant_role_enum, 'admin'::public.tenant_role_enum])) AND (user_tenant_memberships.status = 'active'::text)))));
CREATE POLICY "Users can delete own showcase" ON public.user_achievement_showcase FOR DELETE
  USING ((auth.uid() = user_id));
CREATE POLICY "Users can insert own showcase" ON public.user_achievement_showcase FOR INSERT
  WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can read own showcase" ON public.user_achievement_showcase FOR SELECT
  USING ((auth.uid() = user_id));
CREATE POLICY "Users can update own showcase" ON public.user_achievement_showcase FOR UPDATE
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "user_achievements_insert" ON public.user_achievements FOR INSERT
  WITH CHECK (public.is_system_admin());
CREATE POLICY "users_can_select_own_achievements" ON public.user_achievements FOR SELECT
  USING ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY "user_audit_logs_insert" ON public.user_audit_logs FOR INSERT
  WITH CHECK (((user_id = ( SELECT auth.uid() AS uid)) OR (actor_user_id = ( SELECT auth.uid() AS uid)) OR public.is_system_admin()));
CREATE POLICY "user_audit_logs_select" ON public.user_audit_logs FOR SELECT
  USING (((user_id = ( SELECT auth.uid() AS uid)) OR (actor_user_id = ( SELECT auth.uid() AS uid)) OR public.is_system_admin()));
CREATE POLICY "service_can_modify_user_coins" ON public.user_coins
  USING ((auth.role() = 'service_role'::text))
  WITH CHECK ((auth.role() = 'service_role'::text));
CREATE POLICY "users_can_select_own_user_coins" ON public.user_coins FOR SELECT
  USING ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY "user_consents_admin" ON public.user_consents FOR SELECT
  USING (public.is_system_admin());
CREATE POLICY "user_consents_owner" ON public.user_consents
  USING ((user_id = ( SELECT auth.uid() AS uid)))
  WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "loadout_delete" ON public.user_cosmetic_loadout FOR DELETE
  USING ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "loadout_insert" ON public.user_cosmetic_loadout FOR INSERT
  WITH CHECK (((user_id = ( SELECT auth.uid() AS uid)) AND ((cosmetic_id IN ( SELECT uc.cosmetic_id
   FROM public.user_cosmetics uc
  WHERE (uc.user_id = ( SELECT auth.uid() AS uid)))) OR (cosmetic_id IN ( SELECT cur.cosmetic_id
   FROM public.cosmetic_unlock_rules cur
  WHERE ((cur.unlock_type = 'level'::text) AND (((cur.unlock_config ->> 'required_level'::text))::integer <= ( SELECT COALESCE(max(up.level), 0) AS "coalesce"
           FROM public.user_progress up
          WHERE (up.user_id = ( SELECT auth.uid() AS uid))))))))));
CREATE POLICY "loadout_select" ON public.user_cosmetic_loadout FOR SELECT
  USING ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "loadout_update" ON public.user_cosmetic_loadout FOR UPDATE
  USING ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "user_cosmetics_select" ON public.user_cosmetics FOR SELECT
  USING ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "user_currency_balances_insert" ON public.user_currency_balances FOR INSERT
  WITH CHECK (public.is_system_admin());
CREATE POLICY "user_currency_balances_select" ON public.user_currency_balances FOR SELECT
  USING (((user_id = ( SELECT auth.uid() AS uid)) OR public.is_system_admin()));
CREATE POLICY "user_currency_balances_update" ON public.user_currency_balances FOR UPDATE
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());
CREATE POLICY "user_devices_owner" ON public.user_devices
  USING ((user_id = ( SELECT auth.uid() AS uid)))
  WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "user_gamification_prefs_admin_select" ON public.user_gamification_preferences FOR SELECT
  USING ((public.is_system_admin() OR ((tenant_id IS NOT NULL) AND public.has_tenant_role(tenant_id, ARRAY['owner'::public.tenant_role_enum, 'admin'::public.tenant_role_enum]))));
CREATE POLICY "user_gamification_prefs_select" ON public.user_gamification_preferences FOR SELECT
  USING ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY "user_gamification_prefs_service" ON public.user_gamification_preferences
  USING ((auth.role() = 'service_role'::text))
  WITH CHECK ((auth.role() = 'service_role'::text));
CREATE POLICY "user_gamification_prefs_update" ON public.user_gamification_preferences FOR UPDATE
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY "Users can read own journey preferences" ON public.user_journey_preferences FOR SELECT
  USING ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY "Users can update own journey preferences" ON public.user_journey_preferences FOR UPDATE
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY "Users can upsert own journey preferences" ON public.user_journey_preferences FOR INSERT
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY "user_legal_acceptances_insert" ON public.user_legal_acceptances FOR INSERT
  WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "user_legal_acceptances_select" ON public.user_legal_acceptances FOR SELECT
  USING (((user_id = ( SELECT auth.uid() AS uid)) OR public.is_system_admin()));
CREATE POLICY "user_mfa_owner" ON public.user_mfa
  USING ((user_id = ( SELECT auth.uid() AS uid)))
  WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "user_powerup_consumptions_select" ON public.user_powerup_consumptions FOR SELECT
  USING ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY "user_powerup_effects_select" ON public.user_powerup_effects FOR SELECT
  USING ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY "user_powerup_inventory_select" ON public.user_powerup_inventory FOR SELECT
  USING ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY "user_preferences_admin_delete" ON public.user_preferences FOR DELETE
  USING (public.has_tenant_role(tenant_id, ARRAY['owner'::public.tenant_role_enum, 'admin'::public.tenant_role_enum]));
CREATE POLICY "user_preferences_admin_insert" ON public.user_preferences FOR INSERT
  WITH CHECK (public.has_tenant_role(tenant_id, ARRAY['owner'::public.tenant_role_enum, 'admin'::public.tenant_role_enum]));
CREATE POLICY "user_preferences_admin_update" ON public.user_preferences FOR UPDATE
  USING (public.has_tenant_role(tenant_id, ARRAY['owner'::public.tenant_role_enum, 'admin'::public.tenant_role_enum]))
  WITH CHECK (public.has_tenant_role(tenant_id, ARRAY['owner'::public.tenant_role_enum, 'admin'::public.tenant_role_enum]));
CREATE POLICY "user_preferences_select" ON public.user_preferences FOR SELECT
  USING ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "user_preferences_update" ON public.user_preferences FOR UPDATE
  USING ((user_id = ( SELECT auth.uid() AS uid)))
  WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "user_preferences_user_insert" ON public.user_preferences FOR INSERT
  WITH CHECK (((user_id = ( SELECT auth.uid() AS uid)) AND (tenant_id = ANY (public.get_user_tenant_ids()))));
CREATE POLICY "user_profiles_delete_admin" ON public.user_profiles FOR DELETE
  USING (public.is_system_admin());
CREATE POLICY "user_profiles_insert" ON public.user_profiles FOR INSERT
  WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "user_profiles_select" ON public.user_profiles FOR SELECT
  USING (((user_id = ( SELECT auth.uid() AS uid)) OR public.is_system_admin_jwt_only() OR true));
CREATE POLICY "user_profiles_select_own" ON public.user_profiles FOR SELECT
  USING ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "user_profiles_update" ON public.user_profiles FOR UPDATE
  USING (((user_id = ( SELECT auth.uid() AS uid)) OR public.is_system_admin_jwt_only()))
  WITH CHECK (((user_id = ( SELECT auth.uid() AS uid)) OR public.is_system_admin_jwt_only()));
CREATE POLICY "service_can_modify_user_progress" ON public.user_progress
  USING ((auth.role() = 'service_role'::text))
  WITH CHECK ((auth.role() = 'service_role'::text));
CREATE POLICY "users_can_select_own_user_progress" ON public.user_progress FOR SELECT
  USING ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY "user_purchases_insert" ON public.user_purchases FOR INSERT
  WITH CHECK (((user_id = ( SELECT auth.uid() AS uid)) OR public.is_system_admin()));
CREATE POLICY "user_purchases_select" ON public.user_purchases FOR SELECT
  USING ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY "Users can view own restrictions" ON public.user_restrictions FOR SELECT
  USING ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "user_sessions_owner" ON public.user_sessions
  USING ((user_id = ( SELECT auth.uid() AS uid)))
  WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "service_can_modify_user_streaks" ON public.user_streaks
  USING ((auth.role() = 'service_role'::text))
  WITH CHECK ((auth.role() = 'service_role'::text));
CREATE POLICY "users_can_select_own_user_streaks" ON public.user_streaks FOR SELECT
  USING ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY "membership_all_system_admin" ON public.user_tenant_memberships
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());
CREATE POLICY "utm_select_own" ON public.user_tenant_memberships FOR SELECT
  USING ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "utm_select_team" ON public.user_tenant_memberships FOR SELECT
  USING ((public.is_system_admin() OR (tenant_id = ANY (public.get_user_tenant_ids()))));
CREATE POLICY "system_admin_can_select_all_users" ON public.users FOR SELECT
  USING (public.is_system_admin_jwt_only());
CREATE POLICY "users_delete_admin" ON public.users FOR DELETE
  USING (public.is_system_admin_jwt_only());
CREATE POLICY "users_insert_admin" ON public.users FOR INSERT
  WITH CHECK (public.is_system_admin_jwt_only());
CREATE POLICY "users_insert_self" ON public.users FOR INSERT
  WITH CHECK ((id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "users_select_coworkers_safe" ON public.users FOR SELECT
  USING ((EXISTS ( SELECT 1
   FROM public.user_tenant_memberships utm
  WHERE ((utm.user_id = users.id) AND (utm.tenant_id IN ( SELECT user_tenant_memberships.tenant_id
           FROM public.user_tenant_memberships
          WHERE (user_tenant_memberships.user_id = ( SELECT auth.uid() AS uid))))))));
CREATE POLICY "users_select_self" ON public.users FOR SELECT
  USING ((id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "users_update_admin" ON public.users FOR UPDATE
  USING (public.is_system_admin_jwt_only())
  WITH CHECK (public.is_system_admin_jwt_only());
CREATE POLICY "users_update_self" ON public.users FOR UPDATE
  USING ((id = ( SELECT auth.uid() AS uid)))
  WITH CHECK ((id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "virtual_currencies_select" ON public.virtual_currencies FOR SELECT
  USING (true);

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- 10. GRANTS
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

GRANT ALL ON public.achievement_award_recipients TO service_role;
GRANT ALL ON public.achievement_awards TO service_role;
GRANT ALL ON public.achievement_leaderboards TO service_role;
GRANT ALL ON public.achievement_translations TO authenticated;
GRANT ALL ON public.achievement_translations TO service_role;
GRANT ALL ON public.achievements TO service_role;
GRANT ALL ON public.analytics_timeseries TO service_role;
GRANT ALL ON public.anonymous_cookie_consents TO authenticated;
GRANT ALL ON public.anonymous_cookie_consents TO service_role;
GRANT ALL ON public.award_builder_exports TO service_role;
GRANT ALL ON public.badge_presets TO service_role;
GRANT ALL ON public.billing_accounts TO service_role;
GRANT ALL ON public.billing_events TO service_role;
GRANT ALL ON public.billing_history TO service_role;
GRANT ALL ON public.billing_plans TO service_role;
GRANT ALL ON public.billing_product_features TO service_role;
GRANT ALL ON public.billing_products TO service_role;
GRANT ALL ON public.browse_search_logs TO service_role;
GRANT ALL ON public.bug_reports TO service_role;
GRANT ALL ON public.bundle_items TO service_role;
GRANT SELECT ON public.categories TO anon;
GRANT SELECT ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
GRANT ALL ON public.challenge_participation TO service_role;
GRANT ALL ON public.coach_diagram_exports TO service_role;
GRANT ALL ON public.coin_transactions TO service_role;
GRANT ALL ON public.collection_items TO service_role;
GRANT ALL ON public.community_challenges TO service_role;
GRANT ALL ON public.consent_policy_versions TO authenticated;
GRANT ALL ON public.consent_policy_versions TO service_role;
GRANT ALL ON public.content_analytics TO service_role;
GRANT ALL ON public.content_collections TO service_role;
GRANT ALL ON public.content_filter_rules TO service_role;
GRANT ALL ON public.content_items TO service_role;
GRANT ALL ON public.content_preferences TO service_role;
GRANT ALL ON public.content_reports TO service_role;
GRANT ALL ON public.content_schedules TO service_role;
GRANT DELETE, INSERT, SELECT ON public.conversation_card_collection_secondary_purposes TO authenticated;
GRANT ALL ON public.conversation_card_collection_secondary_purposes TO service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON public.conversation_card_collections TO authenticated;
GRANT ALL ON public.conversation_card_collections TO service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON public.conversation_cards TO authenticated;
GRANT ALL ON public.conversation_cards TO service_role;
GRANT ALL ON public.cookie_catalog TO service_role;
GRANT INSERT, SELECT ON public.cookie_consent_audit TO authenticated;
GRANT ALL ON public.cookie_consent_audit TO service_role;
GRANT SELECT ON public.cookie_consent_statistics TO authenticated;
GRANT ALL ON public.cookie_consent_statistics TO service_role;
GRANT ALL ON public.cookie_consents TO service_role;
GRANT SELECT ON public.cosmetic_unlock_rules TO authenticated;
GRANT ALL ON public.cosmetic_unlock_rules TO service_role;
GRANT SELECT ON public.cosmetics TO authenticated;
GRANT ALL ON public.cosmetics TO service_role;
GRANT ALL ON public.data_access_log TO service_role;
GRANT ALL ON public.data_breach_notifications TO service_role;
GRANT ALL ON public.data_retention_policies TO service_role;
GRANT ALL ON public.demo_sessions TO service_role;
GRANT ALL ON public.dunning_actions TO service_role;
GRANT ALL ON public.dunning_config TO service_role;
GRANT ALL ON public.error_tracking TO service_role;
GRANT ALL ON public.event_rewards TO service_role;
GRANT ALL ON public.feature_usage TO service_role;
GRANT ALL ON public.feedback TO service_role;
GRANT ALL ON public.friend_requests TO service_role;
GRANT ALL ON public.friends TO service_role;
GRANT ALL ON public.funnel_analytics TO service_role;
GRANT ALL ON public.game_artifact_variants TO service_role;
GRANT ALL ON public.game_artifacts TO service_role;
GRANT ALL ON public.game_board_config TO service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON public.game_materials TO authenticated;
GRANT ALL ON public.game_materials TO service_role;
GRANT ALL ON public.game_media TO service_role;
GRANT ALL ON public.game_phases TO service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON public.game_reactions TO authenticated;
GRANT ALL ON public.game_reactions TO service_role;
GRANT ALL ON public.game_roles TO service_role;
GRANT ALL ON public.game_scores TO service_role;
GRANT ALL ON public.game_secondary_purposes TO service_role;
GRANT ALL ON public.game_sessions TO service_role;
GRANT INSERT, SELECT ON public.game_snapshots TO authenticated;
GRANT ALL ON public.game_snapshots TO service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON public.game_steps TO authenticated;
GRANT ALL ON public.game_steps TO service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON public.game_tools TO authenticated;
GRANT ALL ON public.game_tools TO service_role;
GRANT ALL ON public.game_translations TO service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON public.game_triggers TO authenticated;
GRANT ALL ON public.game_triggers TO service_role;
GRANT SELECT ON public.games TO anon;
GRANT ALL ON public.games TO service_role;
GRANT ALL ON public.gamification_admin_award_recipients TO service_role;
GRANT ALL ON public.gamification_admin_award_request_recipients TO service_role;
GRANT ALL ON public.gamification_admin_award_requests TO service_role;
GRANT ALL ON public.gamification_admin_awards TO service_role;
GRANT ALL ON public.gamification_automation_rules TO service_role;
GRANT ALL ON public.gamification_burn_log TO service_role;
GRANT ALL ON public.gamification_burn_sinks TO service_role;
GRANT ALL ON public.gamification_campaign_templates TO service_role;
GRANT ALL ON public.gamification_campaigns TO service_role;
GRANT ALL ON public.gamification_cooldowns TO service_role;
GRANT ALL ON public.gamification_daily_earnings TO service_role;
GRANT ALL ON public.gamification_daily_summaries TO service_role;
GRANT ALL ON public.gamification_events TO service_role;
GRANT ALL ON public.gamification_level_definitions TO service_role;
GRANT ALL ON public.gamification_softcap_config TO service_role;
GRANT ALL ON public.gdpr_requests TO service_role;
GRANT ALL ON public.gift_purchases TO service_role;
GRANT ALL ON public.interest_profiles TO service_role;
GRANT ALL ON public.invoices TO service_role;
GRANT ALL ON public.leader_profile TO service_role;
GRANT ALL ON public.leaderboards TO service_role;
GRANT ALL ON public.learning_course_attempts TO service_role;
GRANT ALL ON public.learning_course_translations TO authenticated;
GRANT ALL ON public.learning_course_translations TO service_role;
GRANT ALL ON public.learning_courses TO service_role;
GRANT ALL ON public.learning_path_edges TO service_role;
GRANT ALL ON public.learning_path_nodes TO service_role;
GRANT ALL ON public.learning_path_translations TO authenticated;
GRANT ALL ON public.learning_path_translations TO service_role;
GRANT ALL ON public.learning_paths TO service_role;
GRANT ALL ON public.learning_requirements TO service_role;
GRANT ALL ON public.learning_user_progress TO service_role;
GRANT ALL ON public.legal_audit_log TO service_role;
GRANT ALL ON public.legal_document_drafts TO service_role;
GRANT ALL ON public.legal_documents TO service_role;
GRANT ALL ON public.limited_time_events TO service_role;
GRANT ALL ON public.marketing_features TO service_role;
GRANT ALL ON public.marketing_updates TO service_role;
GRANT ALL ON public.marketplace_analytics TO service_role;
GRANT ALL ON public.media TO service_role;
GRANT ALL ON public.media_ai_generations TO service_role;
GRANT ALL ON public.media_templates TO service_role;
GRANT INSERT, SELECT ON public.mfa_audit_log TO authenticated;
GRANT ALL ON public.mfa_audit_log TO service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON public.mfa_trusted_devices TO authenticated;
GRANT ALL ON public.mfa_trusted_devices TO service_role;
GRANT ALL ON public.migration_log TO service_role;
GRANT ALL ON public.moderation_actions TO service_role;
GRANT ALL ON public.moderation_analytics TO service_role;
GRANT ALL ON public.moderation_queue TO service_role;
GRANT ALL ON public.multiplayer_participants TO service_role;
GRANT ALL ON public.multiplayer_sessions TO service_role;
GRANT ALL ON public.notification_deliveries TO service_role;
GRANT ALL ON public.notification_log TO service_role;
GRANT ALL ON public.notification_preferences TO service_role;
GRANT ALL ON public.notification_template_translations TO authenticated;
GRANT ALL ON public.notification_template_translations TO service_role;
GRANT ALL ON public.notification_templates TO service_role;
GRANT ALL ON public.notifications TO service_role;
GRANT ALL ON public.org_legal_acceptances TO service_role;
GRANT ALL ON public.page_views TO service_role;
GRANT ALL ON public.participant_achievement_unlocks TO service_role;
GRANT ALL ON public.participant_activity_log TO service_role;
GRANT ALL ON public.participant_game_progress TO service_role;
GRANT ALL ON public.participant_role_assignments TO service_role;
GRANT ALL ON public.participant_sessions TO service_role;
GRANT ALL ON public.participant_token_quotas TO service_role;
GRANT ALL ON public.participants TO service_role;
GRANT ALL ON public.payment_failures TO service_role;
GRANT ALL ON public.payment_methods TO service_role;
GRANT ALL ON public.payments TO service_role;
GRANT ALL ON public.personalization_events TO service_role;
GRANT ALL ON public.plan_blocks TO service_role;
GRANT ALL ON public.plan_notes_private TO service_role;
GRANT ALL ON public.plan_notes_tenant TO service_role;
GRANT ALL ON public.plan_play_progress TO service_role;
GRANT ALL ON public.plan_version_blocks TO service_role;
GRANT ALL ON public.plan_versions TO service_role;
GRANT ALL ON public.plans TO service_role;
GRANT ALL ON public.play_chat_messages TO service_role;
GRANT ALL ON public.player_cosmetics TO service_role;
GRANT ALL ON public.private_subscriptions TO service_role;
GRANT INSERT, SELECT ON public.product_audit_log TO authenticated;
GRANT ALL ON public.product_audit_log TO service_role;
GRANT SELECT ON public.product_prices TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON public.product_prices TO authenticated;
GRANT ALL ON public.product_prices TO service_role;
GRANT ALL ON public.product_purposes TO service_role;
GRANT ALL ON public.product_usage_pricing TO service_role;
GRANT SELECT ON public.products TO anon;
GRANT SELECT ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
GRANT ALL ON public.promo_codes TO service_role;
GRANT ALL ON public.purchase_intents TO service_role;
GRANT ALL ON public.purposes TO service_role;
GRANT ALL ON public.quote_activities TO service_role;
GRANT ALL ON public.quote_line_items TO service_role;
GRANT ALL ON public.quotes TO service_role;
GRANT ALL ON public.recommendation_history TO service_role;
GRANT ALL ON public.role_permissions TO service_role;
GRANT ALL ON public.run_sessions TO service_role;
GRANT ALL ON public.runs TO service_role;
GRANT ALL ON public.saved_items TO service_role;
GRANT ALL ON public.scheduled_job_runs TO service_role;
GRANT ALL ON public.seasonal_achievements TO service_role;
GRANT ALL ON public.seasonal_events TO service_role;
GRANT ALL ON public.session_analytics TO service_role;
GRANT ALL ON public.session_artifact_assignments TO service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON public.session_artifact_state TO authenticated;
GRANT ALL ON public.session_artifact_state TO service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON public.session_artifact_variant_assignments_v2 TO authenticated;
GRANT ALL ON public.session_artifact_variant_assignments_v2 TO service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON public.session_artifact_variant_state TO authenticated;
GRANT ALL ON public.session_artifact_variant_state TO service_role;
GRANT ALL ON public.session_artifact_variants TO service_role;
GRANT ALL ON public.session_artifacts TO service_role;
GRANT ALL ON public.session_commands TO service_role;
GRANT ALL ON public.session_decisions TO service_role;
GRANT ALL ON public.session_events TO service_role;
GRANT ALL ON public.session_outcomes TO service_role;
GRANT ALL ON public.session_roles TO service_role;
GRANT ALL ON public.session_signals TO service_role;
GRANT ALL ON public.session_statistics TO service_role;
GRANT ALL ON public.session_time_bank TO service_role;
GRANT ALL ON public.session_time_bank_ledger TO service_role;
GRANT ALL ON public.session_trigger_idempotency TO service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON public.session_trigger_state TO authenticated;
GRANT ALL ON public.session_trigger_state TO service_role;
GRANT SELECT, UPDATE ON public.session_triggers TO authenticated;
GRANT ALL ON public.session_triggers TO service_role;
GRANT ALL ON public.session_votes TO service_role;
GRANT ALL ON public.shop_item_translations TO authenticated;
GRANT ALL ON public.shop_item_translations TO service_role;
GRANT ALL ON public.shop_items TO service_role;
GRANT ALL ON public.social_leaderboards TO service_role;
GRANT ALL ON public.spatial_artifacts TO service_role;
GRANT ALL ON public.subscription_items TO service_role;
GRANT ALL ON public.subscriptions TO service_role;
GRANT ALL ON public.support_faq_entries TO service_role;
GRANT ALL ON public.support_reports TO service_role;
GRANT ALL ON public.support_tickets TO service_role;
GRANT ALL ON public.system_audit_logs TO service_role;
GRANT ALL ON public.system_design_config TO service_role;
GRANT ALL ON public.system_jobs_runs TO service_role;
GRANT ALL ON public.tenant_audit_logs TO service_role;
GRANT ALL ON public.tenant_branding TO service_role;
GRANT ALL ON public.tenant_design_config TO service_role;
GRANT ALL ON public.tenant_domains TO service_role;
GRANT ALL ON public.tenant_entitlement_seat_assignments TO service_role;
GRANT ALL ON public.tenant_features TO service_role;
GRANT ALL ON public.tenant_invitations TO service_role;
GRANT SELECT ON public.tenant_memberships TO authenticated;
GRANT ALL ON public.tenant_memberships TO service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON public.tenant_mfa_policies TO authenticated;
GRANT ALL ON public.tenant_mfa_policies TO service_role;
GRANT ALL ON public.tenant_product_entitlements TO service_role;
GRANT ALL ON public.tenant_restore_vault TO service_role;
GRANT ALL ON public.tenant_seat_assignments TO service_role;
GRANT ALL ON public.tenant_settings TO service_role;
GRANT ALL ON public.tenant_subscriptions TO service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON public.tenant_translation_overrides TO authenticated;
GRANT ALL ON public.tenant_translation_overrides TO service_role;
GRANT ALL ON public.tenants TO service_role;
GRANT ALL ON public.ticket_messages TO service_role;
GRANT ALL ON public.ticket_routing_rules TO service_role;
GRANT SELECT ON public.translation_audit_log TO authenticated;
GRANT ALL ON public.translation_audit_log TO service_role;
GRANT INSERT, SELECT, UPDATE ON public.translation_missing_keys TO authenticated;
GRANT ALL ON public.translation_missing_keys TO service_role;
GRANT ALL ON public.trial_usage TO service_role;
GRANT ALL ON public.usage_meters TO service_role;
GRANT ALL ON public.usage_records TO service_role;
GRANT ALL ON public.usage_summaries TO service_role;
GRANT ALL ON public.user_achievement_showcase TO service_role;
GRANT ALL ON public.user_achievements TO service_role;
GRANT ALL ON public.user_audit_logs TO service_role;
GRANT ALL ON public.user_coins TO service_role;
GRANT ALL ON public.user_consents TO service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON public.user_cosmetic_loadout TO authenticated;
GRANT ALL ON public.user_cosmetic_loadout TO service_role;
GRANT SELECT ON public.user_cosmetics TO authenticated;
GRANT ALL ON public.user_cosmetics TO service_role;
GRANT ALL ON public.user_currency_balances TO service_role;
GRANT ALL ON public.user_devices TO service_role;
GRANT ALL ON public.user_gamification_preferences TO service_role;
GRANT ALL ON public.user_journey_preferences TO service_role;
GRANT ALL ON public.user_legal_acceptances TO service_role;
GRANT ALL ON public.user_mfa TO service_role;
GRANT ALL ON public.user_powerup_consumptions TO service_role;
GRANT ALL ON public.user_powerup_effects TO service_role;
GRANT ALL ON public.user_powerup_inventory TO service_role;
GRANT ALL ON public.user_preferences TO service_role;
GRANT ALL ON public.user_profiles TO service_role;
GRANT ALL ON public.user_progress TO service_role;
GRANT ALL ON public.user_purchases TO service_role;
GRANT ALL ON public.user_restrictions TO service_role;
GRANT ALL ON public.user_sessions TO service_role;
GRANT ALL ON public.user_streaks TO service_role;
GRANT ALL ON public.user_tenant_memberships TO service_role;
GRANT ALL ON public.users TO service_role;
GRANT ALL ON public.v_gamification_daily_economy TO service_role;
GRANT ALL ON public.v_gamification_leaderboard TO service_role;
GRANT ALL ON public.virtual_currencies TO service_role;
