-- Journey v2.0 Steg 1: Rename faction 'sky' → 'desert'
-- Idempotent: WHERE clause ensures only 'sky' rows are updated.

UPDATE user_journey_preferences
SET faction_id = 'desert',
    updated_at = NOW()
WHERE faction_id = 'sky';
