-- Planner Domain Modernization
-- Aligns Planner with GAMES domain patterns (visibility, metadata, notes, play integration)

-- 1) Enums for planner blocks and play runs
DO $$ BEGIN
  CREATE TYPE plan_block_type_enum AS ENUM ('game', 'pause', 'preparation', 'custom');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE plan_run_status_enum AS ENUM ('not_started', 'in_progress', 'completed', 'abandoned');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Extend plans with authorship + metadata
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES public.users(id);

CREATE INDEX IF NOT EXISTS idx_plans_created_by ON public.plans(created_by);
CREATE INDEX IF NOT EXISTS idx_plans_updated_by ON public.plans(updated_by);

-- 3) Harden plan_blocks with enum type + metadata
ALTER TABLE public.plan_blocks
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_optional boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES public.users(id);

ALTER TABLE public.plan_blocks
  ALTER COLUMN block_type TYPE plan_block_type_enum USING (
    CASE
      WHEN block_type IN ('game','pause','preparation','custom') THEN block_type::plan_block_type_enum
      ELSE 'custom'::plan_block_type_enum
    END
  );

CREATE INDEX IF NOT EXISTS idx_plan_blocks_created_by ON public.plan_blocks(created_by);
CREATE INDEX IF NOT EXISTS idx_plan_blocks_updated_by ON public.plan_blocks(updated_by);

-- 4) Notes: private (owner-only) and tenant shared
CREATE TABLE IF NOT EXISTS public.plan_notes_private (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_by uuid NOT NULL REFERENCES public.users(id),
  updated_by uuid NOT NULL REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id, created_by)
);

CREATE TABLE IF NOT EXISTS public.plan_notes_tenant (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_by uuid NOT NULL REFERENCES public.users(id),
  updated_by uuid NOT NULL REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_plan_notes_private_plan ON public.plan_notes_private(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_notes_private_author ON public.plan_notes_private(created_by);
CREATE INDEX IF NOT EXISTS idx_plan_notes_tenant_plan ON public.plan_notes_tenant(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_notes_tenant_tenant ON public.plan_notes_tenant(tenant_id);

-- 5) Play progress tracking (for Play domain consumption)
CREATE TABLE IF NOT EXISTS public.plan_play_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  current_block_id uuid REFERENCES public.plan_blocks(id) ON DELETE SET NULL,
  current_position integer,
  status plan_run_status_enum NOT NULL DEFAULT 'not_started',
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_plan_play_progress_plan ON public.plan_play_progress(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_play_progress_user ON public.plan_play_progress(user_id);

-- 6) RLS for new tables
ALTER TABLE public.plan_notes_private ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_notes_tenant ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_play_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_blocks ENABLE ROW LEVEL SECURITY;

-- plan_blocks write access: only plan owners
DROP POLICY IF EXISTS "manage_plan_blocks" ON public.plan_blocks;
CREATE POLICY "manage_plan_blocks" ON public.plan_blocks FOR ALL USING (
  plan_id IN (
    SELECT id FROM public.plans WHERE owner_user_id = auth.uid()
  )
) WITH CHECK (
  plan_id IN (
    SELECT id FROM public.plans WHERE owner_user_id = auth.uid()
  )
);

-- Private notes: only plan owner can read/write
DROP POLICY IF EXISTS "manage_private_plan_notes" ON public.plan_notes_private;
CREATE POLICY "manage_private_plan_notes" ON public.plan_notes_private FOR ALL USING (
  plan_id IN (
    SELECT id FROM public.plans WHERE owner_user_id = auth.uid()
  )
) WITH CHECK (
  plan_id IN (
    SELECT id FROM public.plans WHERE owner_user_id = auth.uid()
  )
);

-- Tenant notes: tenant members of the owning tenant (or owner) can read/write when plan visibility >= tenant
DROP POLICY IF EXISTS "manage_tenant_plan_notes" ON public.plan_notes_tenant;
CREATE POLICY "manage_tenant_plan_notes" ON public.plan_notes_tenant FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.plans p
    WHERE p.id = plan_notes_tenant.plan_id
      AND (
        p.owner_user_id = auth.uid()
        OR (p.owner_tenant_id = ANY(get_user_tenant_ids()) AND p.visibility IN ('tenant','public'))
      )
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.plans p
    WHERE p.id = plan_notes_tenant.plan_id
      AND p.owner_tenant_id = ANY(get_user_tenant_ids())
      AND p.visibility IN ('tenant','public')
  )
);

-- Play progress: user-scoped, restricted to accessible plans
DROP POLICY IF EXISTS "manage_plan_play_progress" ON public.plan_play_progress;
CREATE POLICY "manage_plan_play_progress" ON public.plan_play_progress FOR ALL USING (
  user_id = auth.uid()
  AND plan_id IN (
    SELECT id FROM public.plans
    WHERE owner_user_id = auth.uid()
       OR (visibility = 'tenant' AND owner_tenant_id = ANY(get_user_tenant_ids()))
       OR visibility = 'public'
  )
) WITH CHECK (
  user_id = auth.uid()
  AND plan_id IN (
    SELECT id FROM public.plans
    WHERE owner_user_id = auth.uid()
       OR (visibility = 'tenant' AND owner_tenant_id = ANY(get_user_tenant_ids()))
       OR visibility = 'public'
  )
);

-- Ensure plan_blocks still readable for tenant/public plans (keep existing select policy)
DROP POLICY IF EXISTS "users_can_select_plan_blocks" ON public.plan_blocks;
CREATE POLICY "users_can_select_plan_blocks" ON public.plan_blocks FOR SELECT USING (
  plan_id IN (
    SELECT id FROM public.plans
    WHERE owner_user_id = auth.uid()
       OR (visibility = 'tenant' AND owner_tenant_id = ANY(get_user_tenant_ids()))
       OR visibility = 'public'
  )
);

