CREATE TABLE IF NOT EXISTS public.plan_schedules (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  plan_id uuid NOT NULL,
  scheduled_date date NOT NULL,
  scheduled_time time without time zone,
  recurrence_rule text,
  status text DEFAULT 'scheduled'::text,
  notes text,
  created_by uuid,
  group_id uuid,
  group_name text,
  location text,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT plan_schedules_pkey PRIMARY KEY (id)
);

ALTER TABLE public.plan_schedules
  ADD COLUMN IF NOT EXISTS plan_id uuid,
  ADD COLUMN IF NOT EXISTS scheduled_date date,
  ADD COLUMN IF NOT EXISTS scheduled_time time without time zone,
  ADD COLUMN IF NOT EXISTS recurrence_rule text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'scheduled'::text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS group_id uuid,
  ADD COLUMN IF NOT EXISTS group_name text,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.plan_schedules
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now(),
  ALTER COLUMN status SET DEFAULT 'scheduled'::text;

UPDATE public.plan_schedules
SET created_at = COALESCE(created_at, now()),
    updated_at = COALESCE(updated_at, now()),
    status = COALESCE(status, 'scheduled')
WHERE created_at IS NULL
   OR updated_at IS NULL
   OR status IS NULL;

ALTER TABLE public.plan_schedules
  ALTER COLUMN plan_id SET NOT NULL,
  ALTER COLUMN scheduled_date SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'plan_schedules_plan_id_fkey'
      AND conrelid = 'public.plan_schedules'::regclass
  ) THEN
    ALTER TABLE public.plan_schedules
      ADD CONSTRAINT plan_schedules_plan_id_fkey
      FOREIGN KEY (plan_id) REFERENCES public.plans(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'plan_schedules_created_by_fkey'
      AND conrelid = 'public.plan_schedules'::regclass
  ) THEN
    ALTER TABLE public.plan_schedules
      ADD CONSTRAINT plan_schedules_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_plan_schedules_plan_id ON public.plan_schedules(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_schedules_scheduled_date ON public.plan_schedules(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_plan_schedules_status ON public.plan_schedules(status);

ALTER TABLE public.plan_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plan_schedules_access" ON public.plan_schedules;
DROP POLICY IF EXISTS "plan_schedules_select" ON public.plan_schedules;
DROP POLICY IF EXISTS "plan_schedules_insert" ON public.plan_schedules;
DROP POLICY IF EXISTS "plan_schedules_update" ON public.plan_schedules;
DROP POLICY IF EXISTS "plan_schedules_delete" ON public.plan_schedules;

CREATE POLICY "plan_schedules_select" ON public.plan_schedules FOR SELECT TO authenticated
  USING (
    plan_id IN (SELECT id FROM public.plans)
    OR created_by = (SELECT auth.uid())
  );

CREATE POLICY "plan_schedules_insert" ON public.plan_schedules FOR INSERT TO authenticated
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND plan_id IN (SELECT id FROM public.plans)
  );

CREATE POLICY "plan_schedules_update" ON public.plan_schedules FOR UPDATE TO authenticated
  USING (created_by = (SELECT auth.uid()) OR public.is_system_admin())
  WITH CHECK (created_by = (SELECT auth.uid()) OR public.is_system_admin());

CREATE POLICY "plan_schedules_delete" ON public.plan_schedules FOR DELETE TO authenticated
  USING (created_by = (SELECT auth.uid()) OR public.is_system_admin());