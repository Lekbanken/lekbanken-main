-- =============================================================================
-- Migration: 20251219113000_legendary_play_primitives_v1.sql
-- Description: Legendary Play Primitives v1 (Artifacts + Decisions/Votes + Outcomes)
-- =============================================================================

-- =============================================================================
-- 1) Author-time primitives (Game Builder)
-- =============================================================================

-- Artifacts authored on a game (optionally localized)
CREATE TABLE IF NOT EXISTS public.game_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  locale TEXT,

  title TEXT NOT NULL,
  description TEXT,
  artifact_type TEXT NOT NULL DEFAULT 'card',
  artifact_order INTEGER NOT NULL DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_game_artifacts_game_order
  ON public.game_artifacts(game_id, artifact_order);

CREATE INDEX IF NOT EXISTS idx_game_artifacts_game_locale
  ON public.game_artifacts(game_id, locale);

DROP TRIGGER IF EXISTS trg_game_artifacts_updated ON public.game_artifacts;
CREATE TRIGGER trg_game_artifacts_updated
  BEFORE UPDATE ON public.game_artifacts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


-- Variants under an artifact (e.g. cards/handouts that share a category)
CREATE TABLE IF NOT EXISTS public.game_artifact_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id UUID NOT NULL REFERENCES public.game_artifacts(id) ON DELETE CASCADE,

  -- Visibility rules for how this variant is used at runtime
  -- public: can be revealed to everyone
  -- leader_only: only visible to host/leader
  -- role_private: only visible to participants with a specific role
  visibility TEXT NOT NULL DEFAULT 'public',
  visible_to_role_id UUID REFERENCES public.game_roles(id) ON DELETE SET NULL,

  title TEXT,
  body TEXT,
  media_ref UUID REFERENCES public.game_media(id) ON DELETE SET NULL,
  variant_order INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_game_artifact_variants_artifact_order
  ON public.game_artifact_variants(artifact_id, variant_order);

ALTER TABLE public.game_artifact_variants
  DROP CONSTRAINT IF EXISTS game_artifact_variants_visibility_check;

ALTER TABLE public.game_artifact_variants
  ADD CONSTRAINT game_artifact_variants_visibility_check
  CHECK (visibility IN ('public', 'leader_only', 'role_private'));

DROP TRIGGER IF EXISTS trg_game_artifact_variants_updated ON public.game_artifact_variants;
CREATE TRIGGER trg_game_artifact_variants_updated
  BEFORE UPDATE ON public.game_artifact_variants
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


-- =============================================================================
-- 2) Runtime primitives (Session snapshots + state)
-- =============================================================================

-- Snapshot of artifacts at session start
CREATE TABLE IF NOT EXISTS public.session_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.participant_sessions(id) ON DELETE CASCADE,

  source_artifact_id UUID REFERENCES public.game_artifacts(id) ON DELETE SET NULL,

  title TEXT NOT NULL,
  description TEXT,
  artifact_type TEXT NOT NULL DEFAULT 'card',
  artifact_order INTEGER NOT NULL DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_session_artifacts_session_order
  ON public.session_artifacts(session_id, artifact_order);


-- Snapshot of artifact variants + runtime reveal/highlight
CREATE TABLE IF NOT EXISTS public.session_artifact_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_artifact_id UUID NOT NULL REFERENCES public.session_artifacts(id) ON DELETE CASCADE,

  source_variant_id UUID REFERENCES public.game_artifact_variants(id) ON DELETE SET NULL,

  visibility TEXT NOT NULL DEFAULT 'public',
  visible_to_session_role_id UUID REFERENCES public.session_roles(id) ON DELETE SET NULL,

  title TEXT,
  body TEXT,
  media_ref UUID REFERENCES public.game_media(id) ON DELETE SET NULL,
  variant_order INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}',

  revealed_at TIMESTAMPTZ,
  highlighted_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_session_artifact_variants_artifact_order
  ON public.session_artifact_variants(session_artifact_id, variant_order);

ALTER TABLE public.session_artifact_variants
  DROP CONSTRAINT IF EXISTS session_artifact_variants_visibility_check;

ALTER TABLE public.session_artifact_variants
  ADD CONSTRAINT session_artifact_variants_visibility_check
  CHECK (visibility IN ('public', 'leader_only', 'role_private'));

ALTER TABLE public.session_artifact_variants
  DROP CONSTRAINT IF EXISTS session_artifact_variants_role_private_requires_role;

ALTER TABLE public.session_artifact_variants
  ADD CONSTRAINT session_artifact_variants_role_private_requires_role
  CHECK (
    (visibility <> 'role_private')
    OR (visible_to_session_role_id IS NOT NULL)
  );


-- Assignment of a variant to a participant ("My Artifacts")
CREATE TABLE IF NOT EXISTS public.session_artifact_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.participant_sessions(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  session_artifact_variant_id UUID NOT NULL REFERENCES public.session_artifact_variants(id) ON DELETE CASCADE,

  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by UUID REFERENCES auth.users(id),

  UNIQUE(session_id, participant_id, session_artifact_variant_id)
);

CREATE INDEX IF NOT EXISTS idx_session_artifact_assignments_session
  ON public.session_artifact_assignments(session_id);

CREATE INDEX IF NOT EXISTS idx_session_artifact_assignments_participant
  ON public.session_artifact_assignments(participant_id);


-- =============================================================================
-- 3) Decisions / Votes
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.session_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.participant_sessions(id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  prompt TEXT,

  decision_type TEXT NOT NULL DEFAULT 'single_choice',
  options JSONB NOT NULL DEFAULT '[]',

  max_choices INTEGER NOT NULL DEFAULT 1,

  status TEXT NOT NULL DEFAULT 'draft',
  allow_anonymous BOOLEAN NOT NULL DEFAULT false,
  allow_multiple BOOLEAN NOT NULL DEFAULT false,

  opened_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  revealed_at TIMESTAMPTZ,

  step_index INTEGER,
  phase_index INTEGER,

  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT session_decisions_status_check
    CHECK (status IN ('draft', 'open', 'closed', 'revealed'))
);

ALTER TABLE public.session_decisions
  DROP CONSTRAINT IF EXISTS session_decisions_max_choices_check;

ALTER TABLE public.session_decisions
  ADD CONSTRAINT session_decisions_max_choices_check
  CHECK (max_choices >= 1);

CREATE INDEX IF NOT EXISTS idx_session_decisions_session_status
  ON public.session_decisions(session_id, status);

DROP TRIGGER IF EXISTS trg_session_decisions_updated ON public.session_decisions;
CREATE TRIGGER trg_session_decisions_updated
  BEFORE UPDATE ON public.session_decisions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


CREATE TABLE IF NOT EXISTS public.session_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID NOT NULL REFERENCES public.session_decisions(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,

  option_key TEXT NOT NULL,
  value JSONB NOT NULL DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(decision_id, participant_id, option_key)
);

CREATE INDEX IF NOT EXISTS idx_session_votes_decision
  ON public.session_votes(decision_id);

CREATE INDEX IF NOT EXISTS idx_session_votes_participant
  ON public.session_votes(participant_id);


-- =============================================================================
-- 4) Outcomes
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.session_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.participant_sessions(id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  body TEXT,
  outcome_type TEXT NOT NULL DEFAULT 'text',

  related_decision_id UUID REFERENCES public.session_decisions(id) ON DELETE SET NULL,

  revealed_at TIMESTAMPTZ,
  step_index INTEGER,
  phase_index INTEGER,

  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_session_outcomes_session
  ON public.session_outcomes(session_id);

DROP TRIGGER IF EXISTS trg_session_outcomes_updated ON public.session_outcomes;
CREATE TRIGGER trg_session_outcomes_updated
  BEFORE UPDATE ON public.session_outcomes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


-- =============================================================================
-- 5) RLS Policies
-- =============================================================================

-- -----------------------
-- game_artifacts
-- -----------------------
ALTER TABLE public.game_artifacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "game_artifacts_select" ON public.game_artifacts;
CREATE POLICY "game_artifacts_select" ON public.game_artifacts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.games g
      WHERE g.id = game_artifacts.game_id
      AND (
        g.status = 'published'
        OR g.owner_tenant_id IN (
          SELECT tenant_id FROM public.user_tenant_memberships WHERE user_id = auth.uid()
        )
      )
    )
    OR public.is_global_admin()
  );

DROP POLICY IF EXISTS "game_artifacts_insert" ON public.game_artifacts;
CREATE POLICY "game_artifacts_insert" ON public.game_artifacts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.games g
      JOIN public.user_tenant_memberships m ON m.tenant_id = g.owner_tenant_id
      WHERE g.id = game_artifacts.game_id
      AND m.user_id = auth.uid()
      AND m.role IN ('admin', 'editor')
    )
    OR public.is_global_admin()
  );

DROP POLICY IF EXISTS "game_artifacts_update" ON public.game_artifacts;
CREATE POLICY "game_artifacts_update" ON public.game_artifacts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.games g
      JOIN public.user_tenant_memberships m ON m.tenant_id = g.owner_tenant_id
      WHERE g.id = game_artifacts.game_id
      AND m.user_id = auth.uid()
      AND m.role IN ('admin', 'editor')
    )
    OR public.is_global_admin()
  );

DROP POLICY IF EXISTS "game_artifacts_delete" ON public.game_artifacts;
CREATE POLICY "game_artifacts_delete" ON public.game_artifacts
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.games g
      JOIN public.user_tenant_memberships m ON m.tenant_id = g.owner_tenant_id
      WHERE g.id = game_artifacts.game_id
      AND m.user_id = auth.uid()
      AND m.role IN ('admin', 'editor')
    )
    OR public.is_global_admin()
  );


-- -----------------------
-- game_artifact_variants
-- -----------------------
ALTER TABLE public.game_artifact_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "game_artifact_variants_select" ON public.game_artifact_variants;
CREATE POLICY "game_artifact_variants_select" ON public.game_artifact_variants
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.game_artifacts a
      JOIN public.games g ON g.id = a.game_id
      WHERE a.id = game_artifact_variants.artifact_id
      AND (
        g.status = 'published'
        OR g.owner_tenant_id IN (
          SELECT tenant_id FROM public.user_tenant_memberships WHERE user_id = auth.uid()
        )
      )
    )
    OR public.is_global_admin()
  );

DROP POLICY IF EXISTS "game_artifact_variants_insert" ON public.game_artifact_variants;
CREATE POLICY "game_artifact_variants_insert" ON public.game_artifact_variants
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.game_artifacts a
      JOIN public.games g ON g.id = a.game_id
      JOIN public.user_tenant_memberships m ON m.tenant_id = g.owner_tenant_id
      WHERE a.id = game_artifact_variants.artifact_id
      AND m.user_id = auth.uid()
      AND m.role IN ('admin', 'editor')
    )
    OR public.is_global_admin()
  );

DROP POLICY IF EXISTS "game_artifact_variants_update" ON public.game_artifact_variants;
CREATE POLICY "game_artifact_variants_update" ON public.game_artifact_variants
  FOR UPDATE USING (
    EXISTS (
      SELECT 1
      FROM public.game_artifacts a
      JOIN public.games g ON g.id = a.game_id
      JOIN public.user_tenant_memberships m ON m.tenant_id = g.owner_tenant_id
      WHERE a.id = game_artifact_variants.artifact_id
      AND m.user_id = auth.uid()
      AND m.role IN ('admin', 'editor')
    )
    OR public.is_global_admin()
  );

DROP POLICY IF EXISTS "game_artifact_variants_delete" ON public.game_artifact_variants;
CREATE POLICY "game_artifact_variants_delete" ON public.game_artifact_variants
  FOR DELETE USING (
    EXISTS (
      SELECT 1
      FROM public.game_artifacts a
      JOIN public.games g ON g.id = a.game_id
      JOIN public.user_tenant_memberships m ON m.tenant_id = g.owner_tenant_id
      WHERE a.id = game_artifact_variants.artifact_id
      AND m.user_id = auth.uid()
      AND m.role IN ('admin', 'editor')
    )
    OR public.is_global_admin()
  );


-- -----------------------
-- Session runtime tables
-- -----------------------
ALTER TABLE public.session_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_artifact_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_artifact_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_outcomes ENABLE ROW LEVEL SECURITY;

-- Host-only access (participants are served via token-gated API routes)

-- session_artifacts
DROP POLICY IF EXISTS "session_artifacts_select" ON public.session_artifacts;
CREATE POLICY "session_artifacts_select" ON public.session_artifacts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_artifacts.session_id
      AND ps.host_user_id = auth.uid()
    )
    OR public.is_global_admin()
  );

DROP POLICY IF EXISTS "session_artifacts_insert" ON public.session_artifacts;
CREATE POLICY "session_artifacts_insert" ON public.session_artifacts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_artifacts.session_id
      AND ps.host_user_id = auth.uid()
    )
    OR public.is_global_admin()
  );

DROP POLICY IF EXISTS "session_artifacts_update" ON public.session_artifacts;
CREATE POLICY "session_artifacts_update" ON public.session_artifacts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_artifacts.session_id
      AND ps.host_user_id = auth.uid()
    )
    OR public.is_global_admin()
  );

DROP POLICY IF EXISTS "session_artifacts_delete" ON public.session_artifacts;
CREATE POLICY "session_artifacts_delete" ON public.session_artifacts
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_artifacts.session_id
      AND ps.host_user_id = auth.uid()
    )
    OR public.is_global_admin()
  );


-- session_artifact_variants (join through session_artifacts)
DROP POLICY IF EXISTS "session_artifact_variants_select" ON public.session_artifact_variants;
CREATE POLICY "session_artifact_variants_select" ON public.session_artifact_variants
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.session_artifacts sa
      JOIN public.participant_sessions ps ON ps.id = sa.session_id
      WHERE sa.id = session_artifact_variants.session_artifact_id
      AND ps.host_user_id = auth.uid()
    )
    OR public.is_global_admin()
  );

DROP POLICY IF EXISTS "session_artifact_variants_insert" ON public.session_artifact_variants;
CREATE POLICY "session_artifact_variants_insert" ON public.session_artifact_variants
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.session_artifacts sa
      JOIN public.participant_sessions ps ON ps.id = sa.session_id
      WHERE sa.id = session_artifact_variants.session_artifact_id
      AND ps.host_user_id = auth.uid()
    )
    OR public.is_global_admin()
  );

DROP POLICY IF EXISTS "session_artifact_variants_update" ON public.session_artifact_variants;
CREATE POLICY "session_artifact_variants_update" ON public.session_artifact_variants
  FOR UPDATE USING (
    EXISTS (
      SELECT 1
      FROM public.session_artifacts sa
      JOIN public.participant_sessions ps ON ps.id = sa.session_id
      WHERE sa.id = session_artifact_variants.session_artifact_id
      AND ps.host_user_id = auth.uid()
    )
    OR public.is_global_admin()
  );

DROP POLICY IF EXISTS "session_artifact_variants_delete" ON public.session_artifact_variants;
CREATE POLICY "session_artifact_variants_delete" ON public.session_artifact_variants
  FOR DELETE USING (
    EXISTS (
      SELECT 1
      FROM public.session_artifacts sa
      JOIN public.participant_sessions ps ON ps.id = sa.session_id
      WHERE sa.id = session_artifact_variants.session_artifact_id
      AND ps.host_user_id = auth.uid()
    )
    OR public.is_global_admin()
  );


-- session_artifact_assignments
DROP POLICY IF EXISTS "session_artifact_assignments_select" ON public.session_artifact_assignments;
CREATE POLICY "session_artifact_assignments_select" ON public.session_artifact_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_artifact_assignments.session_id
      AND ps.host_user_id = auth.uid()
    )
    OR public.is_global_admin()
  );

DROP POLICY IF EXISTS "session_artifact_assignments_insert" ON public.session_artifact_assignments;
CREATE POLICY "session_artifact_assignments_insert" ON public.session_artifact_assignments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_artifact_assignments.session_id
      AND ps.host_user_id = auth.uid()
    )
    OR public.is_global_admin()
  );

DROP POLICY IF EXISTS "session_artifact_assignments_update" ON public.session_artifact_assignments;
CREATE POLICY "session_artifact_assignments_update" ON public.session_artifact_assignments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_artifact_assignments.session_id
      AND ps.host_user_id = auth.uid()
    )
    OR public.is_global_admin()
  );

DROP POLICY IF EXISTS "session_artifact_assignments_delete" ON public.session_artifact_assignments;
CREATE POLICY "session_artifact_assignments_delete" ON public.session_artifact_assignments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_artifact_assignments.session_id
      AND ps.host_user_id = auth.uid()
    )
    OR public.is_global_admin()
  );


-- session_decisions
DROP POLICY IF EXISTS "session_decisions_select" ON public.session_decisions;
CREATE POLICY "session_decisions_select" ON public.session_decisions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_decisions.session_id
      AND ps.host_user_id = auth.uid()
    )
    OR public.is_global_admin()
  );

DROP POLICY IF EXISTS "session_decisions_insert" ON public.session_decisions;
CREATE POLICY "session_decisions_insert" ON public.session_decisions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_decisions.session_id
      AND ps.host_user_id = auth.uid()
    )
    OR public.is_global_admin()
  );

DROP POLICY IF EXISTS "session_decisions_update" ON public.session_decisions;
CREATE POLICY "session_decisions_update" ON public.session_decisions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_decisions.session_id
      AND ps.host_user_id = auth.uid()
    )
    OR public.is_global_admin()
  );

DROP POLICY IF EXISTS "session_decisions_delete" ON public.session_decisions;
CREATE POLICY "session_decisions_delete" ON public.session_decisions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_decisions.session_id
      AND ps.host_user_id = auth.uid()
    )
    OR public.is_global_admin()
  );


-- session_votes (join through session_decisions)
DROP POLICY IF EXISTS "session_votes_select" ON public.session_votes;
CREATE POLICY "session_votes_select" ON public.session_votes
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.session_decisions d
      JOIN public.participant_sessions ps ON ps.id = d.session_id
      WHERE d.id = session_votes.decision_id
      AND ps.host_user_id = auth.uid()
    )
    OR public.is_global_admin()
  );

DROP POLICY IF EXISTS "session_votes_insert" ON public.session_votes;
CREATE POLICY "session_votes_insert" ON public.session_votes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.session_decisions d
      JOIN public.participant_sessions ps ON ps.id = d.session_id
      WHERE d.id = session_votes.decision_id
      AND ps.host_user_id = auth.uid()
    )
    OR public.is_global_admin()
  );

DROP POLICY IF EXISTS "session_votes_update" ON public.session_votes;
CREATE POLICY "session_votes_update" ON public.session_votes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1
      FROM public.session_decisions d
      JOIN public.participant_sessions ps ON ps.id = d.session_id
      WHERE d.id = session_votes.decision_id
      AND ps.host_user_id = auth.uid()
    )
    OR public.is_global_admin()
  );

DROP POLICY IF EXISTS "session_votes_delete" ON public.session_votes;
CREATE POLICY "session_votes_delete" ON public.session_votes
  FOR DELETE USING (
    EXISTS (
      SELECT 1
      FROM public.session_decisions d
      JOIN public.participant_sessions ps ON ps.id = d.session_id
      WHERE d.id = session_votes.decision_id
      AND ps.host_user_id = auth.uid()
    )
    OR public.is_global_admin()
  );


-- session_outcomes
DROP POLICY IF EXISTS "session_outcomes_select" ON public.session_outcomes;
CREATE POLICY "session_outcomes_select" ON public.session_outcomes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_outcomes.session_id
      AND ps.host_user_id = auth.uid()
    )
    OR public.is_global_admin()
  );

DROP POLICY IF EXISTS "session_outcomes_insert" ON public.session_outcomes;
CREATE POLICY "session_outcomes_insert" ON public.session_outcomes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_outcomes.session_id
      AND ps.host_user_id = auth.uid()
    )
    OR public.is_global_admin()
  );

DROP POLICY IF EXISTS "session_outcomes_update" ON public.session_outcomes;
CREATE POLICY "session_outcomes_update" ON public.session_outcomes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_outcomes.session_id
      AND ps.host_user_id = auth.uid()
    )
    OR public.is_global_admin()
  );

DROP POLICY IF EXISTS "session_outcomes_delete" ON public.session_outcomes;
CREATE POLICY "session_outcomes_delete" ON public.session_outcomes
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_outcomes.session_id
      AND ps.host_user_id = auth.uid()
    )
    OR public.is_global_admin()
  );

COMMENT ON TABLE public.game_artifacts IS 'Authored artifacts for participant/facilitated play (builder)';
COMMENT ON TABLE public.game_artifact_variants IS 'Variants under a game artifact (e.g. cards/handouts)';
COMMENT ON TABLE public.session_artifacts IS 'Snapshot of artifacts at session start';
COMMENT ON TABLE public.session_artifact_variants IS 'Snapshot variants + runtime reveal/highlight';
COMMENT ON TABLE public.session_artifact_assignments IS 'Assignment of artifacts to participants (My Artifacts)';
COMMENT ON TABLE public.session_decisions IS 'Decisions that participants can vote on during a session';
COMMENT ON TABLE public.session_votes IS 'Votes on decisions (recorded per participant, privacy handled by API)';
COMMENT ON TABLE public.session_outcomes IS 'Outcomes agreed/declared during a session';
