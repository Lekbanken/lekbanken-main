-- =========================================
-- LEKBANKEN INITIAL SCHEMA
-- Version 1.1
-- Date: 2025-11-29
-- =========================================
-- This migration creates the complete Lekbanken database schema
-- including all tables, indexes, enums, RLS policies and auth triggers.
-- =========================================

-- =========================================
-- 1. ENUM TYPES
-- =========================================

CREATE TYPE language_code_enum AS ENUM ('NO', 'SE', 'EN');

CREATE TYPE subscription_status_enum AS ENUM (
  'active',
  'paused',
  'canceled',
  'trial'
);

CREATE TYPE seat_assignment_status_enum AS ENUM (
  'active',
  'released',
  'pending',
  'revoked'
);

CREATE TYPE invoice_status_enum AS ENUM (
  'draft',
  'issued',
  'sent',
  'paid',
  'overdue',
  'canceled'
);

CREATE TYPE payment_status_enum AS ENUM (
  'pending',
  'confirmed',
  'failed',
  'refunded'
);

CREATE TYPE game_status_enum AS ENUM (
  'draft',
  'published'
);

CREATE TYPE plan_visibility_enum AS ENUM (
  'private',
  'tenant',
  'public'
);

CREATE TYPE purpose_type_enum AS ENUM (
  'main',
  'sub'
);

CREATE TYPE media_type_enum AS ENUM (
  'template',
  'upload',
  'ai'
);

-- =========================================
-- 2. CORE TABLES: TENANTS & USERS
-- =========================================

CREATE TABLE tenants (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_key      text UNIQUE,
  name            text NOT NULL,
  type            text NOT NULL,
  status          text NOT NULL DEFAULT 'active',
  main_language   language_code_enum NOT NULL DEFAULT 'NO',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX tenants_tenant_key_idx ON tenants (tenant_key);
CREATE INDEX tenants_status_idx ON tenants (status);

-- Users table (synced with Supabase auth.users via trigger)
CREATE TABLE users (
  id                uuid PRIMARY KEY,
  email             text NOT NULL UNIQUE,
  full_name         text,
  role              text NOT NULL DEFAULT 'member',
  language          language_code_enum NOT NULL DEFAULT 'NO',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX users_email_idx ON users (email);
CREATE INDEX users_role_idx ON users (role);

-- =========================================
-- 3. USER ↔ TENANT MEMBERSHIPS (M:M)
-- =========================================

CREATE TABLE user_tenant_memberships (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  tenant_id       uuid NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  role            text NOT NULL DEFAULT 'member',
  is_primary      boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, tenant_id)
);

CREATE INDEX user_tenant_memberships_user_idx ON user_tenant_memberships (user_id);
CREATE INDEX user_tenant_memberships_tenant_idx ON user_tenant_memberships (tenant_id);
CREATE INDEX user_tenant_memberships_role_idx ON user_tenant_memberships (role);

-- =========================================
-- 4. PRODUCT & PURPOSE LAYER
-- =========================================

CREATE TABLE products (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_key     text UNIQUE,
  name            text NOT NULL,
  category        text NOT NULL,
  description     text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX products_product_key_idx ON products (product_key);
CREATE INDEX products_category_idx ON products (category);

CREATE TABLE purposes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purpose_key     text UNIQUE,
  name            text NOT NULL,
  type            purpose_type_enum NOT NULL,
  parent_id       uuid REFERENCES purposes (id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX purposes_purpose_key_idx ON purposes (purpose_key);
CREATE INDEX purposes_type_idx ON purposes (type);
CREATE INDEX purposes_parent_idx ON purposes (parent_id);

-- PRODUCTS ↔ PURPOSES (M:M)
CREATE TABLE product_purposes (
  product_id  uuid NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  purpose_id  uuid NOT NULL REFERENCES purposes (id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, purpose_id)
);

CREATE INDEX product_purposes_product_idx ON product_purposes (product_id);
CREATE INDEX product_purposes_purpose_idx ON product_purposes (purpose_id);

-- =========================================
-- 5. GAMES & MEDIA (Games Domain)
-- =========================================

CREATE TABLE games (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_key          text UNIQUE,
  name              text NOT NULL,
  description       text,
  instructions      text,
  product_id        uuid REFERENCES products (id) ON DELETE SET NULL,
  main_purpose_id   uuid REFERENCES purposes (id) ON DELETE SET NULL,
  owner_tenant_id   uuid REFERENCES tenants (id) ON DELETE SET NULL,
  status            game_status_enum NOT NULL DEFAULT 'draft',
  energy_level      text,
  time_estimate_min integer,
  min_players       integer,
  max_players       integer,
  age_min           integer,
  age_max           integer,
  location_type     text,
  materials         text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX games_game_key_idx ON games (game_key);
CREATE INDEX games_product_idx ON games (product_id);
CREATE INDEX games_main_purpose_idx ON games (main_purpose_id);
CREATE INDEX games_owner_tenant_idx ON games (owner_tenant_id);
CREATE INDEX games_status_idx ON games (status);

-- GAMES ↔ SECONDARY PURPOSES (M:M)
CREATE TABLE game_secondary_purposes (
  game_id    uuid NOT NULL REFERENCES games (id) ON DELETE CASCADE,
  purpose_id uuid NOT NULL REFERENCES purposes (id) ON DELETE CASCADE,
  PRIMARY KEY (game_id, purpose_id)
);

CREATE INDEX game_secondary_purposes_game_idx ON game_secondary_purposes (game_id);
CREATE INDEX game_secondary_purposes_purpose_idx ON game_secondary_purposes (purpose_id);

-- Media table
CREATE TABLE media (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  media_key       text UNIQUE,
  name            text NOT NULL,
  type            media_type_enum NOT NULL,
  product_id      uuid REFERENCES products (id) ON DELETE SET NULL,
  purpose_id      uuid REFERENCES purposes (id) ON DELETE SET NULL,
  game_id         uuid REFERENCES games (id) ON DELETE CASCADE,
  url             text NOT NULL,
  alt_text        text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX media_media_key_idx ON media (media_key);
CREATE INDEX media_product_idx ON media (product_id);
CREATE INDEX media_purpose_idx ON media (purpose_id);
CREATE INDEX media_game_idx ON media (game_id);
CREATE INDEX media_type_idx ON media (type);

-- =========================================
-- 6. PLANS (Planner Domain)
-- =========================================

CREATE TABLE plans (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_key            text UNIQUE,
  name                text NOT NULL,
  description         text,
  owner_user_id       uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  owner_tenant_id     uuid REFERENCES tenants (id) ON DELETE CASCADE,
  visibility          plan_visibility_enum NOT NULL DEFAULT 'private',
  total_time_minutes  integer,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX plans_plan_key_idx ON plans (plan_key);
CREATE INDEX plans_owner_user_idx ON plans (owner_user_id);
CREATE INDEX plans_owner_tenant_idx ON plans (owner_tenant_id);
CREATE INDEX plans_visibility_idx ON plans (visibility);

-- PLANS ↔ GAMES (M:M + order)
CREATE TABLE plan_games (
  plan_id     uuid NOT NULL REFERENCES plans (id) ON DELETE CASCADE,
  game_id     uuid NOT NULL REFERENCES games (id) ON DELETE CASCADE,
  position    integer NOT NULL,
  PRIMARY KEY (plan_id, game_id),
  UNIQUE (plan_id, position)
);

CREATE INDEX plan_games_plan_idx ON plan_games (plan_id);
CREATE INDEX plan_games_game_idx ON plan_games (game_id);
CREATE INDEX plan_games_position_idx ON plan_games (plan_id, position);

-- Plan blocks (for future: pauses, custom notes)
CREATE TABLE plan_blocks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id         uuid NOT NULL REFERENCES plans (id) ON DELETE CASCADE,
  position        integer NOT NULL,
  block_type      text NOT NULL,
  game_id         uuid REFERENCES games (id) ON DELETE SET NULL,
  duration_minutes integer,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id, position)
);

CREATE INDEX plan_blocks_plan_idx ON plan_blocks (plan_id);
CREATE INDEX plan_blocks_position_idx ON plan_blocks (plan_id, position);

-- =========================================
-- 7. BILLING & SUBSCRIPTIONS
-- =========================================

CREATE TABLE billing_products (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  billing_product_key text UNIQUE,
  name                text NOT NULL,
  type                text NOT NULL,
  price_per_seat      numeric(10,2) NOT NULL,
  currency            text NOT NULL DEFAULT 'NOK',
  seats_included      integer NOT NULL DEFAULT 1,
  is_active           boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX billing_products_type_idx ON billing_products (type);
CREATE INDEX billing_products_active_idx ON billing_products (is_active);

-- Tenant subscriptions
CREATE TABLE tenant_subscriptions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_key    text UNIQUE,
  tenant_id           uuid NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  billing_product_id  uuid NOT NULL REFERENCES billing_products (id),
  status              subscription_status_enum NOT NULL DEFAULT 'trial',
  seats_purchased     integer NOT NULL DEFAULT 1,
  start_date          date NOT NULL,
  renewal_date        date,
  cancelled_at        timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX tenant_subscriptions_tenant_idx ON tenant_subscriptions (tenant_id);
CREATE INDEX tenant_subscriptions_billing_product_idx ON tenant_subscriptions (billing_product_id);
CREATE INDEX tenant_subscriptions_status_idx ON tenant_subscriptions (status);

-- Private subscriptions
CREATE TABLE private_subscriptions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_key    text UNIQUE,
  user_id             uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  billing_product_id  uuid NOT NULL REFERENCES billing_products (id),
  status              subscription_status_enum NOT NULL DEFAULT 'trial',
  start_date          date NOT NULL,
  renewal_date        date,
  cancelled_at        timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX private_subscriptions_user_idx ON private_subscriptions (user_id);
CREATE INDEX private_subscriptions_billing_product_idx ON private_subscriptions (billing_product_id);
CREATE INDEX private_subscriptions_status_idx ON private_subscriptions (status);

-- Tenant seat assignments
CREATE TABLE tenant_seat_assignments (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seat_assignment_key   text UNIQUE,
  name                  text,
  tenant_id             uuid NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  user_id               uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  subscription_id       uuid NOT NULL REFERENCES tenant_subscriptions (id) ON DELETE CASCADE,
  billing_product_id    uuid NOT NULL REFERENCES billing_products (id),
  status                seat_assignment_status_enum NOT NULL DEFAULT 'pending',
  assigned_at           timestamptz NOT NULL DEFAULT now(),
  assigned_by_user_id   uuid REFERENCES users (id),
  released_at           timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id, subscription_id)
);

CREATE INDEX tenant_seat_assignments_tenant_idx ON tenant_seat_assignments (tenant_id);
CREATE INDEX tenant_seat_assignments_user_idx ON tenant_seat_assignments (user_id);
CREATE INDEX tenant_seat_assignments_subscription_idx ON tenant_seat_assignments (subscription_id);
CREATE INDEX tenant_seat_assignments_status_idx ON tenant_seat_assignments (status);

-- Invoices
CREATE TABLE invoices (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_key         text UNIQUE,
  name                text NOT NULL,
  tenant_id           uuid NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  subscription_id     uuid REFERENCES tenant_subscriptions (id),
  billing_product_id  uuid REFERENCES billing_products (id),
  amount              numeric(10,2) NOT NULL,
  currency            text NOT NULL DEFAULT 'NOK',
  status              invoice_status_enum NOT NULL DEFAULT 'draft',
  due_date            date NOT NULL,
  issued_at           timestamptz,
  paid_at             timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX invoices_tenant_idx ON invoices (tenant_id);
CREATE INDEX invoices_subscription_idx ON invoices (subscription_id);
CREATE INDEX invoices_status_idx ON invoices (status);
CREATE INDEX invoices_due_date_idx ON invoices (due_date);

-- Payments
CREATE TABLE payments (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_key           text UNIQUE,
  name                  text NOT NULL,
  invoice_id            uuid NOT NULL REFERENCES invoices (id) ON DELETE CASCADE,
  amount                numeric(10,2) NOT NULL,
  currency              text NOT NULL DEFAULT 'NOK',
  status                payment_status_enum NOT NULL DEFAULT 'pending',
  provider              text,
  transaction_reference text,
  paid_at               timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX payments_invoice_idx ON payments (invoice_id);
CREATE INDEX payments_status_idx ON payments (status);
CREATE INDEX payments_provider_idx ON payments (provider);
CREATE INDEX payments_transaction_reference_idx ON payments (transaction_reference);

-- =========================================
-- 8. SEARCH & BROWSE LOGGING
-- =========================================

CREATE TABLE browse_search_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES users (id) ON DELETE SET NULL,
  tenant_id       uuid REFERENCES tenants (id) ON DELETE SET NULL,
  search_term     text,
  filters_applied jsonb,
  results_count   integer,
  result_ids      uuid[],
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX browse_search_logs_user_idx ON browse_search_logs (user_id);
CREATE INDEX browse_search_logs_tenant_idx ON browse_search_logs (tenant_id);
CREATE INDEX browse_search_logs_created_idx ON browse_search_logs (created_at);

-- =========================================
-- 9. ENABLE ROW LEVEL SECURITY
-- =========================================

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tenant_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE purposes ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_purposes ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_secondary_purposes ENABLE ROW LEVEL SECURITY;
ALTER TABLE media ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE private_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_seat_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE browse_search_logs ENABLE ROW LEVEL SECURITY;

-- =========================================
-- 10. RLS HELPER FUNCTIONS
-- =========================================

-- Check if user is member of a tenant
CREATE OR REPLACE FUNCTION is_tenant_member(tenant_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_tenant_memberships
    WHERE user_id = auth.uid()
      AND tenant_id = tenant_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get all tenant IDs user is member of
CREATE OR REPLACE FUNCTION get_user_tenant_ids()
RETURNS uuid[] AS $$
  SELECT array_agg(tenant_id)
  FROM user_tenant_memberships
  WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Check if user has specific role in tenant
CREATE OR REPLACE FUNCTION has_tenant_role(tenant_uuid uuid, required_role text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_tenant_memberships
    WHERE user_id = auth.uid()
      AND tenant_id = tenant_uuid
      AND role = required_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================
-- 11. RLS POLICIES
-- =========================================

-- TENANTS: Users can select tenants they are members of
CREATE POLICY "tenant_members_can_select"
ON tenants FOR SELECT
USING (
  id = ANY(get_user_tenant_ids())
);

-- USERS: Users can select users in their tenants
CREATE POLICY "tenant_members_can_select_users"
ON users FOR SELECT
USING (
  id = auth.uid()
  OR id IN (
    SELECT user_id FROM user_tenant_memberships
    WHERE tenant_id = ANY(get_user_tenant_ids())
  )
);

-- USERS: Users can update their own profile
CREATE POLICY "users_can_update_own_profile"
ON users FOR UPDATE
USING (id = auth.uid());

-- USER_TENANT_MEMBERSHIPS: Users can see their own memberships
CREATE POLICY "users_can_select_own_memberships"
ON user_tenant_memberships FOR SELECT
USING (user_id = auth.uid());

-- USER_TENANT_MEMBERSHIPS: Tenant admins can see all memberships in their tenant
CREATE POLICY "tenant_admins_can_select_memberships"
ON user_tenant_memberships FOR SELECT
USING (
  has_tenant_role(tenant_id, 'admin') OR has_tenant_role(tenant_id, 'owner')
);

-- PRODUCTS & PURPOSES: All authenticated users can read
CREATE POLICY "authenticated_can_select_products"
ON products FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_can_select_purposes"
ON purposes FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_can_select_product_purposes"
ON product_purposes FOR SELECT
USING (auth.role() = 'authenticated');

-- GAMES: Users can select games owned by their tenants or published global games
CREATE POLICY "users_can_select_games"
ON games FOR SELECT
USING (
  owner_tenant_id = ANY(get_user_tenant_ids())
  OR (owner_tenant_id IS NULL AND status = 'published')
  OR (owner_tenant_id IS NULL)
);

-- GAMES: Tenant members can insert games for their tenant
CREATE POLICY "tenant_members_can_insert_games"
ON games FOR INSERT
WITH CHECK (
  owner_tenant_id = ANY(get_user_tenant_ids())
);

-- GAMES: Tenant members can update games owned by their tenant
CREATE POLICY "tenant_members_can_update_games"
ON games FOR UPDATE
USING (
  owner_tenant_id = ANY(get_user_tenant_ids())
);

-- GAMES: Tenant admins can delete games owned by their tenant
CREATE POLICY "tenant_admins_can_delete_games"
ON games FOR DELETE
USING (
  owner_tenant_id = ANY(get_user_tenant_ids())
  AND (has_tenant_role(owner_tenant_id, 'admin') OR has_tenant_role(owner_tenant_id, 'owner'))
);

-- GAME_SECONDARY_PURPOSES
CREATE POLICY "users_can_select_game_secondary_purposes"
ON game_secondary_purposes FOR SELECT
USING (
  game_id IN (
    SELECT id FROM games
    WHERE owner_tenant_id = ANY(get_user_tenant_ids())
       OR (owner_tenant_id IS NULL)
  )
);

-- MEDIA: Users can select media linked to games they have access to
CREATE POLICY "users_can_select_media"
ON media FOR SELECT
USING (
  game_id IN (
    SELECT id FROM games
    WHERE owner_tenant_id = ANY(get_user_tenant_ids())
       OR owner_tenant_id IS NULL
  )
  OR game_id IS NULL
);

-- MEDIA: Tenant members can insert media
CREATE POLICY "tenant_members_can_insert_media"
ON media FOR INSERT
WITH CHECK (
  game_id IN (
    SELECT id FROM games
    WHERE owner_tenant_id = ANY(get_user_tenant_ids())
  )
  OR game_id IS NULL
);

-- PLANS: Users can select their own plans, tenant plans, or public plans
CREATE POLICY "users_can_select_plans"
ON plans FOR SELECT
USING (
  owner_user_id = auth.uid()
  OR (visibility = 'tenant' AND owner_tenant_id = ANY(get_user_tenant_ids()))
  OR visibility = 'public'
);

-- PLANS: Users can insert their own plans
CREATE POLICY "users_can_insert_plans"
ON plans FOR INSERT
WITH CHECK (
  owner_user_id = auth.uid()
  AND (
    owner_tenant_id IS NULL
    OR owner_tenant_id = ANY(get_user_tenant_ids())
  )
);

-- PLANS: Users can update their own plans
CREATE POLICY "users_can_update_own_plans"
ON plans FOR UPDATE
USING (owner_user_id = auth.uid());

-- PLANS: Users can delete their own plans
CREATE POLICY "users_can_delete_own_plans"
ON plans FOR DELETE
USING (owner_user_id = auth.uid());

-- PLAN_GAMES
CREATE POLICY "users_can_select_plan_games"
ON plan_games FOR SELECT
USING (
  plan_id IN (
    SELECT id FROM plans
    WHERE owner_user_id = auth.uid()
       OR (visibility = 'tenant' AND owner_tenant_id = ANY(get_user_tenant_ids()))
       OR visibility = 'public'
  )
);

CREATE POLICY "users_can_manage_own_plan_games"
ON plan_games FOR INSERT
WITH CHECK (
  plan_id IN (
    SELECT id FROM plans
    WHERE owner_user_id = auth.uid()
  )
);

-- PLAN_BLOCKS
CREATE POLICY "users_can_select_plan_blocks"
ON plan_blocks FOR SELECT
USING (
  plan_id IN (
    SELECT id FROM plans
    WHERE owner_user_id = auth.uid()
       OR (visibility = 'tenant' AND owner_tenant_id = ANY(get_user_tenant_ids()))
       OR visibility = 'public'
  )
);

-- BILLING_PRODUCTS: All authenticated users can read active products
CREATE POLICY "authenticated_can_select_active_billing_products"
ON billing_products FOR SELECT
USING (auth.role() = 'authenticated' AND is_active = true);

-- TENANT_SUBSCRIPTIONS: Tenant members can select
CREATE POLICY "tenant_members_can_select_subscriptions"
ON tenant_subscriptions FOR SELECT
USING (
  tenant_id = ANY(get_user_tenant_ids())
);

-- PRIVATE_SUBSCRIPTIONS: Users can select their own
CREATE POLICY "users_can_select_own_private_subscriptions"
ON private_subscriptions FOR SELECT
USING (user_id = auth.uid());

-- TENANT_SEAT_ASSIGNMENTS
CREATE POLICY "tenant_members_can_select_seat_assignments"
ON tenant_seat_assignments FOR SELECT
USING (
  tenant_id = ANY(get_user_tenant_ids())
  OR user_id = auth.uid()
);

-- INVOICES: Tenant members can select
CREATE POLICY "tenant_members_can_select_invoices"
ON invoices FOR SELECT
USING (
  tenant_id = ANY(get_user_tenant_ids())
);

-- PAYMENTS: Tenant members can select
CREATE POLICY "tenant_members_can_select_payments"
ON payments FOR SELECT
USING (
  invoice_id IN (
    SELECT id FROM invoices
    WHERE tenant_id = ANY(get_user_tenant_ids())
  )
);

-- BROWSE_SEARCH_LOGS: Users can see their own logs
CREATE POLICY "users_can_select_own_search_logs"
ON browse_search_logs FOR SELECT
USING (
  user_id = auth.uid()
  OR tenant_id = ANY(get_user_tenant_ids())
);

-- =========================================
-- 12. AUTH TRIGGER FOR USER SYNC
-- =========================================

-- Function to sync auth.users to public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role, language)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    'member',
    COALESCE((new.raw_user_meta_data->>'language')::language_code_enum, 'NO')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = new.email,
    full_name = COALESCE(new.raw_user_meta_data->>'full_name', '');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger the function every time a user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================
-- 13. SEED DATA (Optional - for testing)
-- =========================================

-- Insert default products
INSERT INTO products (product_key, name, category, description) VALUES
  ('trainer', 'Tränare', 'Sports', 'För träning och sport'),
  ('pedagog', 'Pedagog', 'Education', 'För pedagoger och lärare'),
  ('parent', 'Förälder', 'Family', 'För föräldrar och hemmet')
ON CONFLICT (product_key) DO NOTHING;

-- Insert default purposes (main)
INSERT INTO purposes (purpose_key, name, type) VALUES
  ('coordination', 'Samordning', 'main'),
  ('strength', 'Styrka', 'main'),
  ('creativity', 'Kreativitet', 'main'),
  ('social', 'Social', 'main'),
  ('focus', 'Fokus', 'main')
ON CONFLICT (purpose_key) DO NOTHING;

-- Insert default purposes (sub)
INSERT INTO purposes (purpose_key, name, type, parent_id) 
SELECT
  'hand-eye-coord',
  'Hand-öga-koordination',
  'sub',
  (SELECT id FROM purposes WHERE purpose_key = 'coordination')
ON CONFLICT (purpose_key) DO NOTHING;

-- Insert default billing products
INSERT INTO billing_products (billing_product_key, name, type, price_per_seat, currency) VALUES
  ('trainer-monthly', 'Tränare - Månad', 'subscription', 199, 'NOK'),
  ('pedagog-monthly', 'Pedagog - Månad', 'subscription', 299, 'NOK'),
  ('private-yearly', 'Privat - År', 'subscription', 1990, 'NOK')
ON CONFLICT (billing_product_key) DO NOTHING;

-- =========================================
-- 14. END OF MIGRATION
-- =========================================

COMMENT ON TABLE tenants IS 'Organizations/teams in Lekbanken';
COMMENT ON TABLE users IS 'Users synced from Supabase Auth';
COMMENT ON TABLE user_tenant_memberships IS 'Many-to-many relationship between users and tenants with roles';
COMMENT ON TABLE games IS 'Core game/activity database';
COMMENT ON TABLE plans IS 'User-created plans combining multiple games';
COMMENT ON TABLE browse_search_logs IS 'Logs for search analytics and recommendations';

