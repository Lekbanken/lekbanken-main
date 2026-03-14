-- Normalize tenant roles and add role permissions table

-- 1) Tenant role enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tenant_role_enum') THEN
    CREATE TYPE public.tenant_role_enum AS ENUM ('owner', 'admin', 'editor', 'member');
  END IF;
END $$;

-- 2) Migrate user_tenant_memberships.role to enum and normalize values
-- If role column is already tenant_role_enum (baseline dumped post-migration),
-- skip the entire column migration + function/policy recreation.
DO $$
DECLARE
  col_type text;
BEGIN
  SELECT udt_name INTO col_type
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name = 'user_tenant_memberships'
     AND column_name = 'role';

  IF col_type = 'tenant_role_enum' THEN
    RAISE NOTICE 'Column role is already tenant_role_enum — skipping sections 2-4';
    RETURN;
  END IF;

  -- Drop dependent policies that reference user_tenant_memberships.role
  DROP POLICY IF EXISTS "Admins can update subscriptions" ON public.subscriptions;
  DROP POLICY IF EXISTS "Admins can manage payment methods" ON public.payment_methods;
  DROP POLICY IF EXISTS "content_items_insert" ON public.content_items;
  DROP POLICY IF EXISTS "content_items_update" ON public.content_items;
  DROP POLICY IF EXISTS "content_items_delete" ON public.content_items;
  DROP POLICY IF EXISTS "content_schedules_insert" ON public.content_schedules;
  DROP POLICY IF EXISTS "content_schedules_update" ON public.content_schedules;
  DROP POLICY IF EXISTS "content_schedules_delete" ON public.content_schedules;
  DROP POLICY IF EXISTS "content_collections_insert" ON public.content_collections;
  DROP POLICY IF EXISTS "content_collections_update" ON public.content_collections;
  DROP POLICY IF EXISTS "collection_items_insert" ON public.collection_items;
  DROP POLICY IF EXISTS "collection_items_delete" ON public.collection_items;
  DROP POLICY IF EXISTS "shop_items_insert" ON public.shop_items;
  DROP POLICY IF EXISTS "shop_items_update" ON public.shop_items;
  DROP POLICY IF EXISTS "shop_items_delete" ON public.shop_items;
  DROP POLICY IF EXISTS "seasonal_events_insert" ON public.seasonal_events;
  DROP POLICY IF EXISTS "seasonal_events_update" ON public.seasonal_events;
  DROP POLICY IF EXISTS "virtual_currencies_insert" ON public.virtual_currencies;
  DROP POLICY IF EXISTS "virtual_currencies_update" ON public.virtual_currencies;
  DROP POLICY IF EXISTS "virtual_currencies_delete" ON public.virtual_currencies;
  DROP POLICY IF EXISTS "promo_codes_insert" ON public.promo_codes;
  DROP POLICY IF EXISTS "promo_codes_update" ON public.promo_codes;
  DROP POLICY IF EXISTS "promo_codes_delete" ON public.promo_codes;
  DROP POLICY IF EXISTS "Admins can manage filter rules" ON public.content_filter_rules;
  DROP POLICY IF EXISTS "Admins can manage challenges" ON public.community_challenges;
  DROP POLICY IF EXISTS "Admins can manage events" ON public.limited_time_events;
  DROP POLICY IF EXISTS "interest_profiles_admin_all" ON public.interest_profiles;
  DROP POLICY IF EXISTS "personalization_events_admin_all" ON public.personalization_events;
  DROP POLICY IF EXISTS "recommendation_history_admin_all" ON public.recommendation_history;
  DROP POLICY IF EXISTS "user_preferences_admin_all" ON public.user_preferences;
  DROP POLICY IF EXISTS tenant_admins_can_insert ON public.tenants;
  DROP POLICY IF EXISTS "tenant_admins_can_update" ON public.tenants;
  DROP POLICY IF EXISTS tenant_admins_can_delete ON public.tenants;
  DROP POLICY IF EXISTS "Moderators can view all reports" ON public.content_reports;
  DROP POLICY IF EXISTS "Moderators can update reports" ON public.content_reports;
  DROP POLICY IF EXISTS "Moderators can manage actions" ON public.moderation_actions;
  DROP POLICY IF EXISTS "Moderators can manage restrictions" ON public.user_restrictions;
  DROP POLICY IF EXISTS "Moderators can manage queue" ON public.moderation_queue;
  DROP POLICY IF EXISTS "Moderators can view analytics" ON public.moderation_analytics;

  -- Drop dependent view
  DROP VIEW IF EXISTS public.tenant_memberships CASCADE;

  ALTER TABLE public.user_tenant_memberships ALTER COLUMN role DROP DEFAULT;

  -- Normalize casing and map legacy values
  UPDATE public.user_tenant_memberships
  SET role = (
    CASE LOWER(role::text)
      WHEN 'owner' THEN 'owner'
      WHEN 'admin' THEN 'admin'
      WHEN 'editor' THEN 'editor'
      WHEN 'teacher' THEN 'editor'
      WHEN 'moderator' THEN 'admin'
      WHEN 'member' THEN 'member'
      ELSE 'member'
    END
  )::public.tenant_role_enum;

  ALTER TABLE public.user_tenant_memberships
    ALTER COLUMN role TYPE public.tenant_role_enum
    USING role::public.tenant_role_enum;

  ALTER TABLE public.user_tenant_memberships
    ALTER COLUMN role SET DEFAULT 'member';

  -- Recreate view
  CREATE VIEW public.tenant_memberships
  WITH (security_invoker = on)
  AS SELECT id, user_id, tenant_id, role, is_primary, created_at, updated_at, status, seat_assignment_id
     FROM public.user_tenant_memberships;
END $$;

-- 3) Consolidate helper functions with admin bypass
-- Only drop text-based overloads (safe — they don't exist in baseline)
DROP FUNCTION IF EXISTS public.has_tenant_role(uuid, text);
DROP FUNCTION IF EXISTS public.has_tenant_role(uuid, text[]);

-- CREATE OR REPLACE with same param names as baseline to avoid conflicts
CREATE OR REPLACE FUNCTION public.is_tenant_member(p_tenant_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF is_global_admin() THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM user_tenant_memberships
    WHERE user_id = auth.uid()
      AND tenant_id = p_tenant_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_tenant_ids()
RETURNS uuid[]
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN is_global_admin() THEN ARRAY(SELECT id FROM tenants)
    ELSE COALESCE(array_agg(tenant_id), ARRAY[]::uuid[])
  END
  FROM user_tenant_memberships
  WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.has_tenant_role(p_tenant_id uuid, required_roles public.tenant_role_enum[])
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF is_global_admin() THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM user_tenant_memberships
    WHERE user_id = auth.uid()
      AND tenant_id = p_tenant_id
      AND role = ANY(required_roles)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.has_tenant_role(p_tenant_id uuid, required_role public.tenant_role_enum)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.has_tenant_role(p_tenant_id, ARRAY[required_role]);
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_tenant_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_tenant_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_tenant_role(uuid, public.tenant_role_enum[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_tenant_role(uuid, public.tenant_role_enum) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_tenant_member(uuid) FROM public;
REVOKE EXECUTE ON FUNCTION public.get_user_tenant_ids() FROM public;
REVOKE EXECUTE ON FUNCTION public.has_tenant_role(uuid, public.tenant_role_enum[]) FROM public;
REVOKE EXECUTE ON FUNCTION public.has_tenant_role(uuid, public.tenant_role_enum) FROM public;

-- Re-create billing/payment policies using enum-aware helper
DROP POLICY IF EXISTS "Admins can update subscriptions" ON public.subscriptions;
CREATE POLICY "Admins can update subscriptions"
  ON public.subscriptions FOR UPDATE
  USING (has_tenant_role(subscriptions.tenant_id, ARRAY['owner','admin']::public.tenant_role_enum[]));

DROP POLICY IF EXISTS "Admins can manage payment methods" ON public.payment_methods;
CREATE POLICY "Admins can manage payment methods"
  ON public.payment_methods FOR ALL
  USING (has_tenant_role(payment_methods.tenant_id, ARRAY['owner','admin']::public.tenant_role_enum[]));

-- Re-create tenant update policy using enum-aware helper
DROP POLICY IF EXISTS "tenant_admins_can_update" ON public.tenants;
CREATE POLICY tenant_admins_can_update
  ON public.tenants FOR UPDATE
  USING (is_global_admin() OR has_tenant_role(id, ARRAY['owner','admin']::public.tenant_role_enum[]))
  WITH CHECK (is_global_admin() OR has_tenant_role(id, ARRAY['owner','admin']::public.tenant_role_enum[]));

-- Tenant insert/delete policies
DROP POLICY IF EXISTS "tenant_admins_can_insert" ON public.tenants;
CREATE POLICY tenant_admins_can_insert
  ON public.tenants FOR INSERT
  WITH CHECK (is_global_admin());

DROP POLICY IF EXISTS "tenant_admins_can_delete" ON public.tenants;
CREATE POLICY tenant_admins_can_delete
  ON public.tenants FOR DELETE
  USING (is_global_admin());

-- Re-create content planner policies using enum-aware helper
DROP POLICY IF EXISTS "content_items_insert" ON public.content_items;
CREATE POLICY "content_items_insert" ON public.content_items
  FOR INSERT WITH CHECK (has_tenant_role(content_items.tenant_id, ARRAY['admin','editor']::public.tenant_role_enum[]));

DROP POLICY IF EXISTS "content_items_update" ON public.content_items;
CREATE POLICY "content_items_update" ON public.content_items
  FOR UPDATE USING (has_tenant_role(content_items.tenant_id, ARRAY['admin','editor']::public.tenant_role_enum[]))
  WITH CHECK (has_tenant_role(content_items.tenant_id, ARRAY['admin','editor']::public.tenant_role_enum[]));

DROP POLICY IF EXISTS "content_items_delete" ON public.content_items;
CREATE POLICY "content_items_delete" ON public.content_items
  FOR DELETE USING (has_tenant_role(content_items.tenant_id, ARRAY['admin']::public.tenant_role_enum[]));

DROP POLICY IF EXISTS "content_schedules_insert" ON public.content_schedules;
CREATE POLICY "content_schedules_insert" ON public.content_schedules
  FOR INSERT WITH CHECK (has_tenant_role(content_schedules.tenant_id, ARRAY['admin','editor']::public.tenant_role_enum[]));

DROP POLICY IF EXISTS "content_schedules_update" ON public.content_schedules;
CREATE POLICY "content_schedules_update" ON public.content_schedules
  FOR UPDATE USING (has_tenant_role(content_schedules.tenant_id, ARRAY['admin','editor']::public.tenant_role_enum[]))
  WITH CHECK (has_tenant_role(content_schedules.tenant_id, ARRAY['admin','editor']::public.tenant_role_enum[]));

DROP POLICY IF EXISTS "content_schedules_delete" ON public.content_schedules;
CREATE POLICY "content_schedules_delete" ON public.content_schedules
  FOR DELETE USING (has_tenant_role(content_schedules.tenant_id, ARRAY['admin']::public.tenant_role_enum[]));

DROP POLICY IF EXISTS "content_collections_insert" ON public.content_collections;
CREATE POLICY "content_collections_insert" ON public.content_collections
  FOR INSERT WITH CHECK (has_tenant_role(content_collections.tenant_id, ARRAY['admin','editor']::public.tenant_role_enum[]));

DROP POLICY IF EXISTS "content_collections_update" ON public.content_collections;
CREATE POLICY "content_collections_update" ON public.content_collections
  FOR UPDATE USING (has_tenant_role(content_collections.tenant_id, ARRAY['admin','editor']::public.tenant_role_enum[]))
  WITH CHECK (has_tenant_role(content_collections.tenant_id, ARRAY['admin','editor']::public.tenant_role_enum[]));

DROP POLICY IF EXISTS "collection_items_insert" ON public.collection_items;
CREATE POLICY "collection_items_insert" ON public.collection_items
  FOR INSERT WITH CHECK (has_tenant_role((SELECT tenant_id FROM public.content_collections cc WHERE cc.id = collection_items.collection_id), ARRAY['admin','editor']::public.tenant_role_enum[]));

DROP POLICY IF EXISTS "collection_items_delete" ON public.collection_items;
CREATE POLICY "collection_items_delete" ON public.collection_items
  FOR DELETE USING (has_tenant_role((SELECT tenant_id FROM public.content_collections cc WHERE cc.id = collection_items.collection_id), ARRAY['admin','editor']::public.tenant_role_enum[]));

-- Re-create marketplace policies using enum-aware helper
DROP POLICY IF EXISTS "shop_items_insert" ON public.shop_items;
CREATE POLICY "shop_items_insert" ON public.shop_items
  FOR INSERT WITH CHECK (has_tenant_role(shop_items.tenant_id, ARRAY['admin','editor']::public.tenant_role_enum[]));

DROP POLICY IF EXISTS "shop_items_update" ON public.shop_items;
CREATE POLICY "shop_items_update" ON public.shop_items
  FOR UPDATE USING (has_tenant_role(shop_items.tenant_id, ARRAY['admin','editor']::public.tenant_role_enum[]));

DROP POLICY IF EXISTS "shop_items_delete" ON public.shop_items;
CREATE POLICY "shop_items_delete" ON public.shop_items
  FOR DELETE USING (has_tenant_role(shop_items.tenant_id, ARRAY['admin','editor']::public.tenant_role_enum[]));

-- Re-create seasonal events policies using enum-aware helper
DROP POLICY IF EXISTS "seasonal_events_insert" ON public.seasonal_events;
CREATE POLICY "seasonal_events_insert" ON public.seasonal_events
  FOR INSERT WITH CHECK (has_tenant_role(seasonal_events.tenant_id, ARRAY['admin']::public.tenant_role_enum[]));

DROP POLICY IF EXISTS "seasonal_events_update" ON public.seasonal_events;
CREATE POLICY "seasonal_events_update" ON public.seasonal_events
  FOR UPDATE USING (has_tenant_role(seasonal_events.tenant_id, ARRAY['admin']::public.tenant_role_enum[]))
  WITH CHECK (has_tenant_role(seasonal_events.tenant_id, ARRAY['admin']::public.tenant_role_enum[]));

-- Re-create virtual currencies policies using enum-aware helper
DROP POLICY IF EXISTS "virtual_currencies_insert" ON public.virtual_currencies;
CREATE POLICY "virtual_currencies_insert" ON public.virtual_currencies
  FOR INSERT WITH CHECK (has_tenant_role(virtual_currencies.tenant_id, ARRAY['admin']::public.tenant_role_enum[]));

DROP POLICY IF EXISTS "virtual_currencies_update" ON public.virtual_currencies;
CREATE POLICY "virtual_currencies_update" ON public.virtual_currencies
  FOR UPDATE USING (has_tenant_role(virtual_currencies.tenant_id, ARRAY['admin']::public.tenant_role_enum[]));

DROP POLICY IF EXISTS "virtual_currencies_delete" ON public.virtual_currencies;
CREATE POLICY "virtual_currencies_delete" ON public.virtual_currencies
  FOR DELETE USING (has_tenant_role(virtual_currencies.tenant_id, ARRAY['admin']::public.tenant_role_enum[]));

-- Re-create promo codes policies using enum-aware helper
DROP POLICY IF EXISTS "promo_codes_insert" ON public.promo_codes;
CREATE POLICY "promo_codes_insert" ON public.promo_codes
  FOR INSERT WITH CHECK (has_tenant_role(promo_codes.tenant_id, ARRAY['admin']::public.tenant_role_enum[]));

DROP POLICY IF EXISTS "promo_codes_update" ON public.promo_codes;
CREATE POLICY "promo_codes_update" ON public.promo_codes
  FOR UPDATE USING (has_tenant_role(promo_codes.tenant_id, ARRAY['admin']::public.tenant_role_enum[]));

DROP POLICY IF EXISTS "promo_codes_delete" ON public.promo_codes;
CREATE POLICY "promo_codes_delete" ON public.promo_codes
  FOR DELETE USING (has_tenant_role(promo_codes.tenant_id, ARRAY['admin']::public.tenant_role_enum[]));

-- Re-create content filter rules policy using enum-aware helper
DROP POLICY IF EXISTS "Admins can manage filter rules" ON public.content_filter_rules;
CREATE POLICY "Admins can manage filter rules"
  ON public.content_filter_rules FOR ALL
  USING (has_tenant_role(content_filter_rules.tenant_id, ARRAY['admin']::public.tenant_role_enum[]));

-- Re-create community challenges policy using enum-aware helper
DROP POLICY IF EXISTS "Admins can manage challenges" ON public.community_challenges;
CREATE POLICY "Admins can manage challenges"
  ON public.community_challenges FOR ALL
  USING (has_tenant_role(community_challenges.tenant_id, ARRAY['admin']::public.tenant_role_enum[]));

-- Re-create limited time events policy using enum-aware helper
DROP POLICY IF EXISTS "Admins can manage events" ON public.limited_time_events;
CREATE POLICY "Admins can manage events"
  ON public.limited_time_events FOR ALL
  USING (has_tenant_role(limited_time_events.tenant_id, ARRAY['admin']::public.tenant_role_enum[]));

-- Re-create personalization/interest policies using enum-aware helper
DROP POLICY IF EXISTS "interest_profiles_admin_all" ON public.interest_profiles;
CREATE POLICY "interest_profiles_admin_all" ON public.interest_profiles
  FOR ALL USING (has_tenant_role(interest_profiles.tenant_id, ARRAY['owner','admin']::public.tenant_role_enum[]));

DROP POLICY IF EXISTS "personalization_events_admin_all" ON public.personalization_events;
CREATE POLICY "personalization_events_admin_all" ON public.personalization_events
  FOR ALL USING (has_tenant_role(personalization_events.tenant_id, ARRAY['owner','admin']::public.tenant_role_enum[]));

DROP POLICY IF EXISTS "recommendation_history_admin_all" ON public.recommendation_history;
CREATE POLICY "recommendation_history_admin_all" ON public.recommendation_history
  FOR ALL USING (has_tenant_role(recommendation_history.tenant_id, ARRAY['owner','admin']::public.tenant_role_enum[]));

DROP POLICY IF EXISTS "user_preferences_admin_all" ON public.user_preferences;
CREATE POLICY "user_preferences_admin_all" ON public.user_preferences
  FOR ALL USING (has_tenant_role(user_preferences.tenant_id, ARRAY['owner','admin']::public.tenant_role_enum[]));

-- 4) Update moderation policies (remove moderator role, align to enum)
DO $$ BEGIN
  DROP POLICY IF EXISTS "Moderators can view all reports" ON public.content_reports;
  DROP POLICY IF EXISTS "Moderators can update reports" ON public.content_reports;
  DROP POLICY IF EXISTS "Moderators can manage actions" ON public.moderation_actions;
  DROP POLICY IF EXISTS "Moderators can manage restrictions" ON public.user_restrictions;
  DROP POLICY IF EXISTS "Moderators can manage queue" ON public.moderation_queue;
  DROP POLICY IF EXISTS "Moderators can view analytics" ON public.moderation_analytics;
END $$;

DROP POLICY IF EXISTS "Moderation admins can view all reports" ON public.content_reports;
CREATE POLICY "Moderation admins can view all reports"
  ON public.content_reports FOR SELECT
  USING (has_tenant_role(content_reports.tenant_id, ARRAY['owner','admin']::public.tenant_role_enum[]));

DROP POLICY IF EXISTS "Moderation admins can update reports" ON public.content_reports;
CREATE POLICY "Moderation admins can update reports"
  ON public.content_reports FOR UPDATE
  USING (has_tenant_role(content_reports.tenant_id, ARRAY['owner','admin']::public.tenant_role_enum[]));

DROP POLICY IF EXISTS "Moderation admins can manage actions" ON public.moderation_actions;
CREATE POLICY "Moderation admins can manage actions"
  ON public.moderation_actions FOR ALL
  USING (has_tenant_role(moderation_actions.tenant_id, ARRAY['owner','admin']::public.tenant_role_enum[]));

DROP POLICY IF EXISTS "Moderation admins can manage restrictions" ON public.user_restrictions;
CREATE POLICY "Moderation admins can manage restrictions"
  ON public.user_restrictions FOR ALL
  USING (has_tenant_role(user_restrictions.tenant_id, ARRAY['owner','admin']::public.tenant_role_enum[]));

DROP POLICY IF EXISTS "Moderation admins can manage queue" ON public.moderation_queue;
CREATE POLICY "Moderation admins can manage queue"
  ON public.moderation_queue FOR ALL
  USING (has_tenant_role(moderation_queue.tenant_id, ARRAY['owner','admin']::public.tenant_role_enum[]));

DROP POLICY IF EXISTS "Moderation admins can view analytics" ON public.moderation_analytics;
CREATE POLICY "Moderation admins can view analytics"
  ON public.moderation_analytics FOR SELECT
  USING (has_tenant_role(moderation_analytics.tenant_id, ARRAY['owner','admin']::public.tenant_role_enum[]));

-- 5) Role permissions registry (for UI management)
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.tenant_role_enum NOT NULL,
  scope text NOT NULL, -- e.g. 'admin' | 'app' | 'marketing'
  resource text NOT NULL,
  action text NOT NULL,
  allowed boolean NOT NULL DEFAULT true,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS role_permissions_unique_idx
  ON public.role_permissions (role, scope, resource, action);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS role_permissions_admin_all ON public.role_permissions;
CREATE POLICY role_permissions_admin_all
  ON public.role_permissions FOR ALL
  USING (is_global_admin())
  WITH CHECK (is_global_admin());

-- Seed baseline permissions (idempotent)
INSERT INTO public.role_permissions (role, scope, resource, action, allowed)
VALUES
  ('owner', 'admin', 'tenant', 'manage', true),
  ('admin', 'admin', 'tenant', 'manage', true),
  ('editor', 'admin', 'content', 'manage', true),
  ('member', 'admin', 'content', 'view', true),
  ('owner', 'app', 'content', 'manage', true),
  ('admin', 'app', 'content', 'manage', true),
  ('editor', 'app', 'content', 'edit', true),
  ('member', 'app', 'content', 'view', true),
  ('owner', 'marketing', 'leads', 'view', true),
  ('admin', 'marketing', 'leads', 'view', true)
ON CONFLICT (role, scope, resource, action) DO NOTHING;
