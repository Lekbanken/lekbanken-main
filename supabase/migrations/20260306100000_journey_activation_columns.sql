-- Journey Activation: Add opt-in/opt-out columns to user_journey_preferences.
-- journey_enabled: whether the user wants Journey rendering (default false)
-- journey_decision_at: timestamp of the user's first decision (immutable after set)

ALTER TABLE public.user_journey_preferences
  ADD COLUMN IF NOT EXISTS journey_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS journey_decision_at timestamptz NULL;

COMMENT ON COLUMN public.user_journey_preferences.journey_enabled IS
  'Whether the user has opted in to Journey rendering on the gamification hub.';

COMMENT ON COLUMN public.user_journey_preferences.journey_decision_at IS
  'Timestamp of the user''s first opt-in/opt-out decision. Set once via COALESCE, never overwritten.';
