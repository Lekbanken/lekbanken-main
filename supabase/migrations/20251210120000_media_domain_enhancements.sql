-- Media Domain Enhancements
-- Adds tenant isolation, metadata, removes redundant game_id, improves RLS

-- 1) Add tenant_id and metadata to media table
ALTER TABLE public.media
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- 2) Create index for tenant isolation
CREATE INDEX IF NOT EXISTS idx_media_tenant_id ON public.media(tenant_id);

-- 3) Media templates table for standard product+purpose images
CREATE TABLE IF NOT EXISTS public.media_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  main_purpose_id uuid REFERENCES public.purposes(id) ON DELETE CASCADE,
  sub_purpose_id uuid REFERENCES public.purposes(id) ON DELETE SET NULL,
  media_id uuid NOT NULL REFERENCES public.media(id) ON DELETE CASCADE,
  priority integer NOT NULL DEFAULT 0,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_media_templates_product ON public.media_templates(product_id);
CREATE INDEX IF NOT EXISTS idx_media_templates_main_purpose ON public.media_templates(main_purpose_id);
CREATE INDEX IF NOT EXISTS idx_media_templates_sub_purpose ON public.media_templates(sub_purpose_id);
CREATE INDEX IF NOT EXISTS idx_media_templates_priority ON public.media_templates(priority DESC);

-- 4) Media AI generations table for future AI content
CREATE TABLE IF NOT EXISTS public.media_ai_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id uuid NOT NULL REFERENCES public.media(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  prompt text NOT NULL,
  model text NOT NULL,
  model_version text,
  seed integer,
  parameters jsonb DEFAULT '{}'::jsonb,
  revision integer NOT NULL DEFAULT 1,
  generation_time_ms integer,
  cost_credits integer,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_media_ai_tenant ON public.media_ai_generations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_media_ai_user ON public.media_ai_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_media_ai_status ON public.media_ai_generations(status);
CREATE INDEX IF NOT EXISTS idx_media_ai_created ON public.media_ai_generations(created_at DESC);

-- 5) Enable RLS on new tables
ALTER TABLE public.media_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_ai_generations ENABLE ROW LEVEL SECURITY;

-- 6) Drop old media RLS policies
DROP POLICY IF EXISTS "users_can_select_media" ON public.media;
DROP POLICY IF EXISTS "tenant_members_can_insert_media" ON public.media;

-- 7) New media RLS policies with tenant isolation
-- SELECT: Global media (tenant_id IS NULL) OR tenant member can see tenant media OR linked to accessible game
CREATE POLICY "select_media_enhanced" ON public.media FOR SELECT USING (
  tenant_id IS NULL
  OR tenant_id = ANY(get_user_tenant_ids())
  OR EXISTS (
    SELECT 1 FROM public.game_media gm
    INNER JOIN public.games g ON g.id = gm.game_id
    WHERE gm.media_id = media.id
      AND (
        (g.owner_tenant_id IS NULL AND g.status = 'published')
        OR g.owner_tenant_id = ANY(get_user_tenant_ids())
      )
  )
);

-- INSERT: Authenticated users can insert global media OR tenant media if they're a member
CREATE POLICY "insert_media_enhanced" ON public.media FOR INSERT WITH CHECK (
  auth.role() = 'authenticated'
  AND (
    tenant_id IS NULL
    OR tenant_id = ANY(get_user_tenant_ids())
  )
);

-- UPDATE: Can update own tenant media OR global media if system_admin
CREATE POLICY "update_media_enhanced" ON public.media FOR UPDATE USING (
  auth.role() = 'authenticated'
  AND (
    tenant_id = ANY(get_user_tenant_ids())
    OR (tenant_id IS NULL AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'system_admin'
    ))
  )
);

-- DELETE: Same as UPDATE
CREATE POLICY "delete_media_enhanced" ON public.media FOR DELETE USING (
  auth.role() = 'authenticated'
  AND (
    tenant_id = ANY(get_user_tenant_ids())
    OR (tenant_id IS NULL AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'system_admin'
    ))
  )
);

-- 8) Media templates RLS
CREATE POLICY "select_media_templates" ON public.media_templates FOR SELECT USING (true);

CREATE POLICY "manage_media_templates" ON public.media_templates FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'system_admin'
  )
);

-- 9) Media AI generations RLS
CREATE POLICY "select_own_ai_generations" ON public.media_ai_generations FOR SELECT USING (
  tenant_id = ANY(get_user_tenant_ids())
  OR user_id = auth.uid()
);

CREATE POLICY "insert_own_ai_generations" ON public.media_ai_generations FOR INSERT WITH CHECK (
  user_id = auth.uid()
  AND (tenant_id IS NULL OR tenant_id = ANY(get_user_tenant_ids()))
);

CREATE POLICY "update_own_ai_generations" ON public.media_ai_generations FOR UPDATE USING (
  user_id = auth.uid()
);

-- 10) Migration: Set tenant_id for existing game_media
UPDATE public.media m
SET tenant_id = gm.tenant_id
FROM public.game_media gm
WHERE gm.media_id = m.id
  AND m.tenant_id IS NULL
  AND gm.tenant_id IS NOT NULL;

-- 11) Comment about game_id deprecation (manual cleanup required)
COMMENT ON COLUMN public.media.game_id IS 'DEPRECATED: Use game_media junction table instead. Will be removed in future migration.';
