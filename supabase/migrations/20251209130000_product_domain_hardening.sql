-- Product Domain hardening: writes, schema alignment, and clean seed data

-- 1) Columns for status/capabilities (persist admin UI fields)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS capabilities jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS products_status_idx ON public.products(status);

-- 2) RLS write policies (keep existing authenticated select)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='products' AND policyname='products_write_admin'
  ) THEN
    CREATE POLICY products_write_admin
      ON public.products
      FOR ALL
      USING (public.is_system_admin())
      WITH CHECK (public.is_system_admin());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='purposes' AND policyname='purposes_write_admin'
  ) THEN
    CREATE POLICY purposes_write_admin
      ON public.purposes
      FOR ALL
      USING (public.is_system_admin())
      WITH CHECK (public.is_system_admin());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_purposes' AND policyname='product_purposes_write_admin'
  ) THEN
    CREATE POLICY product_purposes_write_admin
      ON public.product_purposes
      FOR ALL
      USING (public.is_system_admin())
      WITH CHECK (public.is_system_admin());
  END IF;
END $$;

-- 3) Clean seed/update for products and purposes
INSERT INTO public.products (product_key, name, category, description, status, capabilities)
VALUES
  (
    'trainer',
    'Tränare',
    'sports',
    'För träning och sport',
    'active',
    '[
      {"id":"cap-browse-view","key":"browse.view","label":"Browse library","group":"Browse"},
      {"id":"cap-play-run","key":"play.run","label":"Run activities","group":"Play"},
      {"id":"cap-planner-create","key":"planner.create","label":"Create plans","group":"Planner"}
    ]'::jsonb
  ),
  (
    'pedagog',
    'Pedagog',
    'education',
    'För pedagoger och lärare',
    'active',
    '[
      {"id":"cap-browse-filter","key":"browse.filter","label":"Advanced filters","group":"Browse"},
      {"id":"cap-play-host","key":"play.host","label":"Host live sessions","group":"Play"},
      {"id":"cap-analytics-view","key":"analytics.view","label":"Analytics dashboard","group":"Analytics"}
    ]'::jsonb
  ),
  (
    'parent',
    'Förälder',
    'family',
    'För föräldrar och hemmet',
    'active',
    '[
      {"id":"cap-browse-view","key":"browse.view","label":"Browse library","group":"Browse"},
      {"id":"cap-gamification-earn","key":"gamification.earn","label":"Earn achievements","group":"Gamification"}
    ]'::jsonb
  )
ON CONFLICT (product_key) DO UPDATE
SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  status = EXCLUDED.status,
  capabilities = EXCLUDED.capabilities,
  updated_at = now();

WITH main_purposes AS (
  INSERT INTO public.purposes (purpose_key, name, type, parent_id)
  VALUES
    ('coordination', 'Koordination', 'main', NULL),
    ('strength', 'Styrka', 'main', NULL),
    ('creativity', 'Kreativitet', 'main', NULL),
    ('social', 'Social', 'main', NULL),
    ('focus', 'Fokus', 'main', NULL)
  ON CONFLICT (purpose_key) DO UPDATE
  SET name = EXCLUDED.name, type = EXCLUDED.type
  RETURNING purpose_key, id
),
sub_purposes AS (
  INSERT INTO public.purposes (purpose_key, name, type, parent_id)
  VALUES
    (
      'hand-eye-coord',
      'Hand-öga-koordination',
      'sub',
      (SELECT id FROM public.purposes WHERE purpose_key = 'coordination')
    )
  ON CONFLICT (purpose_key) DO UPDATE
  SET name = EXCLUDED.name, type = EXCLUDED.type, parent_id = EXCLUDED.parent_id
  RETURNING purpose_key, id
)
SELECT 1;

-- Map products to representative purposes
INSERT INTO public.product_purposes (product_id, purpose_id)
SELECT p.id, pu.id
FROM public.products p
JOIN public.purposes pu ON pu.purpose_key IN (
  CASE p.product_key WHEN 'trainer' THEN 'coordination' END,
  CASE p.product_key WHEN 'trainer' THEN 'strength' END,
  CASE p.product_key WHEN 'pedagog' THEN 'creativity' END,
  CASE p.product_key WHEN 'pedagog' THEN 'social' END,
  CASE p.product_key WHEN 'parent' THEN 'social' END,
  CASE p.product_key WHEN 'parent' THEN 'focus' END
)
WHERE p.product_key IN ('trainer', 'pedagog', 'parent')
ON CONFLICT DO NOTHING;
