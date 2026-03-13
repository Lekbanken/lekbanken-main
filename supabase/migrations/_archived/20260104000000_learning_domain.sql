-- =========================================
-- LEARNING DOMAIN TABLES
-- Lekledarutbildning (Course Training) Module
-- Enterprise-grade: multi-tenant, RLS, audit-ready
-- =========================================

-- =========================================
-- 1. LEARNING COURSES TABLE
-- Central content storage for courses
-- =========================================

CREATE TABLE learning_courses (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid REFERENCES tenants (id) ON DELETE CASCADE,
  slug              text NOT NULL,
  title             text NOT NULL,
  description       text,
  status            text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  difficulty        text DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced', 'expert')),
  tags              jsonb DEFAULT '[]'::jsonb,
  -- Content: sections of markdown/rich text
  content_json      jsonb DEFAULT '[]'::jsonb,
  -- Quiz: multiple choice questions
  quiz_json         jsonb DEFAULT '[]'::jsonb,
  -- Pass threshold (percentage, e.g. 70 = 70%)
  pass_score        integer DEFAULT 70 CHECK (pass_score >= 0 AND pass_score <= 100),
  -- Rewards granted on completion
  rewards_json      jsonb DEFAULT '{}'::jsonb,
  -- Estimated duration in minutes
  duration_minutes  integer,
  -- Thumbnail/cover image
  cover_image_url   text,
  -- Versioning (light) for future invalidation
  version           integer DEFAULT 1,
  -- Audit
  created_by        uuid REFERENCES users (id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  -- Unique slug per tenant (or globally if tenant_id is null)
  UNIQUE (tenant_id, slug)
);

COMMENT ON TABLE learning_courses IS 'Courses for Lekledarutbildning - text + quiz format in v1';
COMMENT ON COLUMN learning_courses.content_json IS 'Array of content sections: [{id, title, body_markdown, media_url}]';
COMMENT ON COLUMN learning_courses.quiz_json IS 'Array of quiz questions: [{id, question, options: [{id, text, is_correct}], explanation}]';
COMMENT ON COLUMN learning_courses.rewards_json IS 'Rewards on completion: {dicecoin_amount, xp_amount, achievement_id}';

CREATE INDEX learning_courses_tenant_idx ON learning_courses (tenant_id);
CREATE INDEX learning_courses_status_idx ON learning_courses (status);
CREATE INDEX learning_courses_slug_idx ON learning_courses (slug);
CREATE INDEX learning_courses_created_at_idx ON learning_courses (created_at);

-- =========================================
-- 2. LEARNING PATHS TABLE
-- Container for course graphs (onboarding, themes, roles)
-- =========================================

CREATE TABLE learning_paths (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid REFERENCES tenants (id) ON DELETE CASCADE,
  slug              text NOT NULL,
  title             text NOT NULL,
  description       text,
  status            text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  kind              text NOT NULL DEFAULT 'theme' CHECK (kind IN ('onboarding', 'role', 'theme', 'compliance')),
  -- Visual settings for the path
  cover_image_url   text,
  -- Audit
  created_by        uuid REFERENCES users (id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, slug)
);

COMMENT ON TABLE learning_paths IS 'Learning paths - containers for course progression graphs';

CREATE INDEX learning_paths_tenant_idx ON learning_paths (tenant_id);
CREATE INDEX learning_paths_status_idx ON learning_paths (status);
CREATE INDEX learning_paths_kind_idx ON learning_paths (kind);

-- =========================================
-- 3. LEARNING PATH NODES TABLE
-- Course nodes within a path (position for graph layout)
-- =========================================

CREATE TABLE learning_path_nodes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path_id           uuid NOT NULL REFERENCES learning_paths (id) ON DELETE CASCADE,
  course_id         uuid NOT NULL REFERENCES learning_courses (id) ON DELETE CASCADE,
  -- Position for UI layout
  position_json     jsonb DEFAULT '{"x": 0, "y": 0}'::jsonb,
  -- Node-specific metadata (e.g., is_entry_point, is_milestone)
  metadata          jsonb DEFAULT '{}'::jsonb,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (path_id, course_id)
);

COMMENT ON TABLE learning_path_nodes IS 'Nodes linking courses to paths with position data';

CREATE INDEX learning_path_nodes_path_idx ON learning_path_nodes (path_id);
CREATE INDEX learning_path_nodes_course_idx ON learning_path_nodes (course_id);

-- =========================================
-- 4. LEARNING PATH EDGES TABLE
-- Prerequisite connections between courses
-- =========================================

CREATE TABLE learning_path_edges (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path_id           uuid NOT NULL REFERENCES learning_paths (id) ON DELETE CASCADE,
  from_course_id    uuid NOT NULL REFERENCES learning_courses (id) ON DELETE CASCADE,
  to_course_id      uuid NOT NULL REFERENCES learning_courses (id) ON DELETE CASCADE,
  -- Rule for unlock (v1: simple completed check; v2: AND/OR logic)
  rule_json         jsonb DEFAULT '{"type": "completed"}'::jsonb,
  metadata          jsonb DEFAULT '{}'::jsonb,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (path_id, from_course_id, to_course_id)
);

COMMENT ON TABLE learning_path_edges IS 'Edges defining prerequisites between courses in a path';
COMMENT ON COLUMN learning_path_edges.rule_json IS 'Unlock rule: {type: "completed"} means from_course must be completed to unlock to_course';

CREATE INDEX learning_path_edges_path_idx ON learning_path_edges (path_id);
CREATE INDEX learning_path_edges_from_idx ON learning_path_edges (from_course_id);
CREATE INDEX learning_path_edges_to_idx ON learning_path_edges (to_course_id);

-- =========================================
-- 5. LEARNING USER PROGRESS TABLE
-- Tracks user progress per course (tenant-scoped)
-- =========================================

CREATE TABLE learning_user_progress (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  tenant_id           uuid NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  course_id           uuid NOT NULL REFERENCES learning_courses (id) ON DELETE CASCADE,
  status              text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'failed')),
  best_score          integer,
  last_score          integer,
  attempts_count      integer DEFAULT 0,
  completed_at        timestamptz,
  last_attempt_at     timestamptz,
  -- Idempotency: track when rewards were granted
  rewards_granted_at  timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, tenant_id, course_id)
);

COMMENT ON TABLE learning_user_progress IS 'User progress per course - tracks completion, scores, and reward idempotency';

CREATE INDEX learning_user_progress_user_idx ON learning_user_progress (user_id);
CREATE INDEX learning_user_progress_tenant_idx ON learning_user_progress (tenant_id);
CREATE INDEX learning_user_progress_course_idx ON learning_user_progress (course_id);
CREATE INDEX learning_user_progress_status_idx ON learning_user_progress (status);
CREATE INDEX learning_user_progress_completed_idx ON learning_user_progress (completed_at);

-- =========================================
-- 6. LEARNING COURSE ATTEMPTS TABLE
-- Detailed log of each quiz attempt
-- =========================================

CREATE TABLE learning_course_attempts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  tenant_id         uuid NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  course_id         uuid NOT NULL REFERENCES learning_courses (id) ON DELETE CASCADE,
  started_at        timestamptz NOT NULL DEFAULT now(),
  submitted_at      timestamptz,
  score             integer,
  passed            boolean,
  -- Store answers for audit/review
  answers_json      jsonb DEFAULT '[]'::jsonb,
  -- Time spent in seconds
  time_spent_seconds integer,
  created_at        timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE learning_course_attempts IS 'Individual course attempt logs with answers and scores';
COMMENT ON COLUMN learning_course_attempts.answers_json IS 'User answers: [{question_id, selected_option_ids, is_correct}]';

CREATE INDEX learning_course_attempts_user_idx ON learning_course_attempts (user_id);
CREATE INDEX learning_course_attempts_tenant_idx ON learning_course_attempts (tenant_id);
CREATE INDEX learning_course_attempts_course_idx ON learning_course_attempts (course_id);
CREATE INDEX learning_course_attempts_submitted_idx ON learning_course_attempts (submitted_at);

-- =========================================
-- 7. LEARNING REQUIREMENTS TABLE
-- Gating rules: course completion required for actions
-- =========================================

CREATE TABLE learning_requirements (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid REFERENCES tenants (id) ON DELETE CASCADE,
  requirement_type    text NOT NULL CHECK (requirement_type IN ('role_unlock', 'activity_unlock', 'game_unlock', 'onboarding_required')),
  -- Target reference (what this requirement applies to)
  target_ref          jsonb NOT NULL,
  -- Required course to complete
  required_course_id  uuid NOT NULL REFERENCES learning_courses (id) ON DELETE CASCADE,
  -- Required status (typically 'completed')
  required_status     text NOT NULL DEFAULT 'completed' CHECK (required_status IN ('completed', 'in_progress')),
  -- Priority for ordering multiple requirements
  priority            integer DEFAULT 0,
  -- Active flag
  is_active           boolean DEFAULT true,
  metadata            jsonb DEFAULT '{}'::jsonb,
  created_by          uuid REFERENCES users (id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE learning_requirements IS 'Gating rules requiring course completion for activities/roles';
COMMENT ON COLUMN learning_requirements.target_ref IS 'Target: {kind: "game"|"role"|"feature", id: "uuid", name: "..."} - null tenant_id = global rule';

CREATE INDEX learning_requirements_tenant_idx ON learning_requirements (tenant_id);
CREATE INDEX learning_requirements_type_idx ON learning_requirements (requirement_type);
CREATE INDEX learning_requirements_course_idx ON learning_requirements (required_course_id);
CREATE INDEX learning_requirements_active_idx ON learning_requirements (is_active);

-- =========================================
-- 8. ENABLE ROW LEVEL SECURITY
-- =========================================

ALTER TABLE learning_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_path_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_path_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_course_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_requirements ENABLE ROW LEVEL SECURITY;

-- =========================================
-- 9. RLS POLICIES
-- =========================================

-- LEARNING_COURSES: System admins see all, tenant members see their tenant's courses
CREATE POLICY "system_admins_full_access_learning_courses"
ON learning_courses FOR ALL
USING (is_system_admin())
WITH CHECK (is_system_admin());

CREATE POLICY "tenant_members_select_learning_courses"
ON learning_courses FOR SELECT
USING (
  tenant_id IS NULL -- Global courses visible to all
  OR tenant_id = ANY(get_user_tenant_ids())
);

CREATE POLICY "tenant_admins_manage_learning_courses"
ON learning_courses FOR ALL
USING (
  tenant_id = ANY(get_user_tenant_ids())
  AND has_tenant_role(tenant_id, 'admin'::public.tenant_role_enum)
)
WITH CHECK (
  tenant_id = ANY(get_user_tenant_ids())
  AND has_tenant_role(tenant_id, 'admin'::public.tenant_role_enum)
);

-- LEARNING_PATHS: Similar pattern
CREATE POLICY "system_admins_full_access_learning_paths"
ON learning_paths FOR ALL
USING (is_system_admin())
WITH CHECK (is_system_admin());

CREATE POLICY "tenant_members_select_learning_paths"
ON learning_paths FOR SELECT
USING (
  tenant_id IS NULL
  OR tenant_id = ANY(get_user_tenant_ids())
);

CREATE POLICY "tenant_admins_manage_learning_paths"
ON learning_paths FOR ALL
USING (
  tenant_id = ANY(get_user_tenant_ids())
  AND has_tenant_role(tenant_id, 'admin'::public.tenant_role_enum)
)
WITH CHECK (
  tenant_id = ANY(get_user_tenant_ids())
  AND has_tenant_role(tenant_id, 'admin'::public.tenant_role_enum)
);

-- LEARNING_PATH_NODES: Follow path access
CREATE POLICY "system_admins_full_access_learning_path_nodes"
ON learning_path_nodes FOR ALL
USING (is_system_admin())
WITH CHECK (is_system_admin());

CREATE POLICY "users_select_learning_path_nodes"
ON learning_path_nodes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM learning_paths lp
    WHERE lp.id = learning_path_nodes.path_id
    AND (lp.tenant_id IS NULL OR lp.tenant_id = ANY(get_user_tenant_ids()))
  )
);

-- LEARNING_PATH_EDGES: Follow path access
CREATE POLICY "system_admins_full_access_learning_path_edges"
ON learning_path_edges FOR ALL
USING (is_system_admin())
WITH CHECK (is_system_admin());

CREATE POLICY "users_select_learning_path_edges"
ON learning_path_edges FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM learning_paths lp
    WHERE lp.id = learning_path_edges.path_id
    AND (lp.tenant_id IS NULL OR lp.tenant_id = ANY(get_user_tenant_ids()))
  )
);

-- LEARNING_USER_PROGRESS: Users see own, admins see tenant
CREATE POLICY "system_admins_full_access_learning_user_progress"
ON learning_user_progress FOR ALL
USING (is_system_admin())
WITH CHECK (is_system_admin());

CREATE POLICY "users_manage_own_progress"
ON learning_user_progress FOR ALL
USING (user_id = auth.uid() AND tenant_id = ANY(get_user_tenant_ids()))
WITH CHECK (user_id = auth.uid() AND tenant_id = ANY(get_user_tenant_ids()));

CREATE POLICY "tenant_admins_view_progress"
ON learning_user_progress FOR SELECT
USING (
  tenant_id = ANY(get_user_tenant_ids())
  AND has_tenant_role(tenant_id, 'admin'::public.tenant_role_enum)
);

-- LEARNING_COURSE_ATTEMPTS: Users see own, admins see tenant
CREATE POLICY "system_admins_full_access_learning_course_attempts"
ON learning_course_attempts FOR ALL
USING (is_system_admin())
WITH CHECK (is_system_admin());

CREATE POLICY "users_manage_own_attempts"
ON learning_course_attempts FOR ALL
USING (user_id = auth.uid() AND tenant_id = ANY(get_user_tenant_ids()))
WITH CHECK (user_id = auth.uid() AND tenant_id = ANY(get_user_tenant_ids()));

CREATE POLICY "tenant_admins_view_attempts"
ON learning_course_attempts FOR SELECT
USING (
  tenant_id = ANY(get_user_tenant_ids())
  AND has_tenant_role(tenant_id, 'admin'::public.tenant_role_enum)
);

-- LEARNING_REQUIREMENTS: Viewable by affected users, manageable by admins
CREATE POLICY "system_admins_full_access_learning_requirements"
ON learning_requirements FOR ALL
USING (is_system_admin())
WITH CHECK (is_system_admin());

CREATE POLICY "users_select_learning_requirements"
ON learning_requirements FOR SELECT
USING (
  tenant_id IS NULL
  OR tenant_id = ANY(get_user_tenant_ids())
);

CREATE POLICY "tenant_admins_manage_learning_requirements"
ON learning_requirements FOR ALL
USING (
  tenant_id = ANY(get_user_tenant_ids())
  AND has_tenant_role(tenant_id, 'admin'::public.tenant_role_enum)
)
WITH CHECK (
  tenant_id = ANY(get_user_tenant_ids())
  AND has_tenant_role(tenant_id, 'admin'::public.tenant_role_enum)
);

-- =========================================
-- 10. HELPER FUNCTIONS
-- =========================================

-- Check if a user has completed a specific course in a tenant
CREATE OR REPLACE FUNCTION learning_course_completed(
  p_user_id uuid,
  p_tenant_id uuid,
  p_course_id uuid
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM learning_user_progress
    WHERE user_id = p_user_id
    AND tenant_id = p_tenant_id
    AND course_id = p_course_id
    AND status = 'completed'
  );
$$;

-- Check if all prerequisites are met for a course in a path
CREATE OR REPLACE FUNCTION learning_prerequisites_met(
  p_user_id uuid,
  p_tenant_id uuid,
  p_path_id uuid,
  p_course_id uuid
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT NOT EXISTS (
    -- Find all edges where this course is the target
    SELECT 1 FROM learning_path_edges lpe
    WHERE lpe.path_id = p_path_id
    AND lpe.to_course_id = p_course_id
    -- And the prerequisite course is NOT completed
    AND NOT learning_course_completed(p_user_id, p_tenant_id, lpe.from_course_id)
  );
$$;

-- Check if a learning requirement is satisfied
CREATE OR REPLACE FUNCTION learning_requirement_satisfied(
  p_user_id uuid,
  p_tenant_id uuid,
  p_requirement_id uuid
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM learning_requirements lr
    WHERE lr.id = p_requirement_id
    AND lr.is_active = true
    AND learning_course_completed(p_user_id, p_tenant_id, lr.required_course_id)
  );
$$;

-- Get all unsatisfied requirements for a target
CREATE OR REPLACE FUNCTION learning_get_unsatisfied_requirements(
  p_user_id uuid,
  p_tenant_id uuid,
  p_target_kind text,
  p_target_id uuid
) RETURNS TABLE (
  requirement_id uuid,
  course_id uuid,
  course_title text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT 
    lr.id as requirement_id,
    lr.required_course_id as course_id,
    lc.title as course_title
  FROM learning_requirements lr
  JOIN learning_courses lc ON lc.id = lr.required_course_id
  WHERE lr.is_active = true
  AND (lr.tenant_id IS NULL OR lr.tenant_id = p_tenant_id)
  AND lr.target_ref->>'kind' = p_target_kind
  AND (lr.target_ref->>'id')::uuid = p_target_id
  AND NOT learning_course_completed(p_user_id, p_tenant_id, lr.required_course_id)
  ORDER BY lr.priority;
$$;

-- =========================================
-- 11. TRIGGERS FOR UPDATED_AT
-- =========================================

CREATE OR REPLACE FUNCTION update_learning_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER learning_courses_updated_at
  BEFORE UPDATE ON learning_courses
  FOR EACH ROW EXECUTE FUNCTION update_learning_updated_at();

CREATE TRIGGER learning_paths_updated_at
  BEFORE UPDATE ON learning_paths
  FOR EACH ROW EXECUTE FUNCTION update_learning_updated_at();

CREATE TRIGGER learning_user_progress_updated_at
  BEFORE UPDATE ON learning_user_progress
  FOR EACH ROW EXECUTE FUNCTION update_learning_updated_at();

CREATE TRIGGER learning_requirements_updated_at
  BEFORE UPDATE ON learning_requirements
  FOR EACH ROW EXECUTE FUNCTION update_learning_updated_at();

-- =========================================
-- 12. AUDIT LOG ENTRIES (if audit_logs table exists)
-- =========================================

-- Note: Audit logging will be handled via application layer
-- to integrate with existing audit infrastructure
