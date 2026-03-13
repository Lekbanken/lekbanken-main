-- Journey Activation: Migrate existing users who already chose a faction.
-- Users with faction_id → auto-enable Journey (skip onboarding).
-- Users without faction_id → leave as "never asked" (will see onboarding).
--
-- MUST run AFTER 20260306100000_journey_activation_columns.sql

UPDATE public.user_journey_preferences
SET
  journey_enabled = true,
  journey_decision_at = updated_at
WHERE faction_id IS NOT NULL
  AND journey_decision_at IS NULL;
