-- Billing consolidation: missing tables, RLS hardening, invoice updated_at

-- 1) Ensure helper functions exist (added in accounts domain); used below:
--    public.is_system_admin(), public.get_user_tenant_ids(), public.has_tenant_role(uuid, public.tenant_role_enum[])

-- 2) New tables
CREATE TABLE IF NOT EXISTS public.billing_product_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  billing_product_id uuid NOT NULL REFERENCES public.billing_products(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  label text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (billing_product_id, feature_key)
);

CREATE TABLE IF NOT EXISTS public.subscription_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.tenant_subscriptions(id) ON DELETE CASCADE,
  billing_product_id uuid NOT NULL REFERENCES public.billing_products(id),
  quantity integer NOT NULL DEFAULT 1,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subscription_id, billing_product_id)
);

CREATE TABLE IF NOT EXISTS public.billing_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  provider_customer_id text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT billing_accounts_scope_chk CHECK (
    (tenant_id IS NOT NULL AND user_id IS NULL) OR (tenant_id IS NULL AND user_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS billing_accounts_provider_tenant_uidx
  ON public.billing_accounts(provider, tenant_id)
  WHERE tenant_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS billing_accounts_provider_user_uidx
  ON public.billing_accounts(provider, user_id)
  WHERE user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.billing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key text UNIQUE,
  event_type text NOT NULL,
  status text NOT NULL DEFAULT 'received',
  source text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  subscription_id uuid REFERENCES public.tenant_subscriptions(id) ON DELETE SET NULL,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3) Add missing updated_at on invoices
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- 4) Enable RLS on new tables
ALTER TABLE public.billing_product_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;

-- 5) Harden RLS for existing billing tables (add write policies)
-- billing_products: keep select for authenticated active; restrict writes to system_admin
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='billing_products' AND policyname='billing_products_write_admin'
  ) THEN
    CREATE POLICY billing_products_write_admin
      ON public.billing_products
      FOR ALL
      USING (public.is_system_admin())
      WITH CHECK (public.is_system_admin());
  END IF;
END $$;

-- tenant_subscriptions: allow tenant owner/admin or system_admin to write
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tenant_subscriptions' AND policyname='tenant_subscriptions_manage'
  ) THEN
    CREATE POLICY tenant_subscriptions_manage
      ON public.tenant_subscriptions
      FOR ALL
      USING (
        public.is_system_admin() OR public.has_tenant_role(tenant_id, ARRAY['owner','admin']::public.tenant_role_enum[])
      )
      WITH CHECK (
        public.is_system_admin() OR public.has_tenant_role(tenant_id, ARRAY['owner','admin']::public.tenant_role_enum[])
      );
  END IF;
END $$;

-- private_subscriptions: owner or system_admin writes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='private_subscriptions' AND policyname='private_subscriptions_manage'
  ) THEN
    CREATE POLICY private_subscriptions_manage
      ON public.private_subscriptions
      FOR ALL
      USING (user_id = auth.uid() OR public.is_system_admin())
      WITH CHECK (user_id = auth.uid() OR public.is_system_admin());
  END IF;
END $$;

-- tenant_seat_assignments: tenant owner/admin or system_admin writes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tenant_seat_assignments' AND policyname='tenant_seat_assignments_manage'
  ) THEN
    CREATE POLICY tenant_seat_assignments_manage
      ON public.tenant_seat_assignments
      FOR ALL
      USING (
        public.is_system_admin() OR public.has_tenant_role(tenant_id, ARRAY['owner','admin']::public.tenant_role_enum[])
      )
      WITH CHECK (
        public.is_system_admin() OR public.has_tenant_role(tenant_id, ARRAY['owner','admin']::public.tenant_role_enum[])
      );
  END IF;
END $$;

-- invoices: tenant owner/admin or system_admin writes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='invoices' AND policyname='invoices_manage'
  ) THEN
    CREATE POLICY invoices_manage
      ON public.invoices
      FOR ALL
      USING (
        public.is_system_admin() OR public.has_tenant_role(tenant_id, ARRAY['owner','admin']::public.tenant_role_enum[])
      )
      WITH CHECK (
        public.is_system_admin() OR public.has_tenant_role(tenant_id, ARRAY['owner','admin']::public.tenant_role_enum[])
      );
  END IF;
END $$;

-- payments: tenant owner/admin or system_admin writes (resolve tenant via invoice)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='payments' AND policyname='payments_manage'
  ) THEN
    CREATE POLICY payments_manage
      ON public.payments
      FOR ALL
      USING (
        public.is_system_admin() OR invoice_id IN (
          SELECT inv.id FROM public.invoices inv
          WHERE public.has_tenant_role(inv.tenant_id, ARRAY['owner','admin']::public.tenant_role_enum[]) OR public.is_system_admin()
        )
      )
      WITH CHECK (
        public.is_system_admin() OR invoice_id IN (
          SELECT inv.id FROM public.invoices inv
          WHERE public.has_tenant_role(inv.tenant_id, ARRAY['owner','admin']::public.tenant_role_enum[]) OR public.is_system_admin()
        )
      );
  END IF;
END $$;

-- subscription_items: write tied to parent subscription tenant owner/admin or system_admin
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='subscription_items' AND policyname='subscription_items_manage'
  ) THEN
    CREATE POLICY subscription_items_manage
      ON public.subscription_items
      FOR ALL
      USING (
        public.is_system_admin() OR subscription_id IN (
          SELECT ts.id FROM public.tenant_subscriptions ts
          WHERE public.has_tenant_role(ts.tenant_id, ARRAY['owner','admin']::public.tenant_role_enum[]) OR public.is_system_admin()
        )
      )
      WITH CHECK (
        public.is_system_admin() OR subscription_id IN (
          SELECT ts.id FROM public.tenant_subscriptions ts
          WHERE public.has_tenant_role(ts.tenant_id, ARRAY['owner','admin']::public.tenant_role_enum[]) OR public.is_system_admin()
        )
      );
  END IF;
END $$;

-- billing_product_features: select for authenticated, write for system_admin
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='billing_product_features' AND policyname='billing_product_features_select'
  ) THEN
    CREATE POLICY billing_product_features_select
      ON public.billing_product_features
      FOR SELECT
      USING (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='billing_product_features' AND policyname='billing_product_features_manage'
  ) THEN
    CREATE POLICY billing_product_features_manage
      ON public.billing_product_features
      FOR ALL
      USING (public.is_system_admin())
      WITH CHECK (public.is_system_admin());
  END IF;
END $$;

-- billing_accounts: tenant members select their tenant account; user selects own; writes by system_admin or tenant owner/admin/self for user scope
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='billing_accounts' AND policyname='billing_accounts_select_tenant'
  ) THEN
    CREATE POLICY billing_accounts_select_tenant
      ON public.billing_accounts
      FOR SELECT
      USING (
        (tenant_id IS NOT NULL AND tenant_id = ANY(public.get_user_tenant_ids())) OR public.is_system_admin()
      );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='billing_accounts' AND policyname='billing_accounts_select_user'
  ) THEN
    CREATE POLICY billing_accounts_select_user
      ON public.billing_accounts
      FOR SELECT
      USING (user_id IS NOT NULL AND user_id = auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='billing_accounts' AND policyname='billing_accounts_manage'
  ) THEN
    CREATE POLICY billing_accounts_manage
      ON public.billing_accounts
      FOR ALL
      USING (
        public.is_system_admin()
        OR (tenant_id IS NOT NULL AND public.has_tenant_role(tenant_id, ARRAY['owner','admin']::public.tenant_role_enum[]))
        OR (user_id IS NOT NULL AND user_id = auth.uid())
      )
      WITH CHECK (
        public.is_system_admin()
        OR (tenant_id IS NOT NULL AND public.has_tenant_role(tenant_id, ARRAY['owner','admin']::public.tenant_role_enum[]))
        OR (user_id IS NOT NULL AND user_id = auth.uid())
      );
  END IF;
END $$;

-- billing_events: only system_admin can read/write
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='billing_events' AND policyname='billing_events_manage'
  ) THEN
    CREATE POLICY billing_events_manage
      ON public.billing_events
      FOR ALL
      USING (public.is_system_admin())
      WITH CHECK (public.is_system_admin());
  END IF;
END $$;

-- 6) Optional: tighten billing_plans (plan model) to admin-only writes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='billing_plans' AND policyname='billing_plans_select_all'
  ) THEN
    CREATE POLICY billing_plans_select_all
      ON public.billing_plans
      FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='billing_plans' AND policyname='billing_plans_manage_admin'
  ) THEN
    CREATE POLICY billing_plans_manage_admin
      ON public.billing_plans
      FOR ALL
      USING (public.is_system_admin())
      WITH CHECK (public.is_system_admin());
  END IF;
END $$;

-- Keep existing policies intact; this migration only adds missing tables/columns and write guards.
