-- Purchase Intent Unique Pending Index
-- Prevents duplicate pending purchase intents for the same user+product combination
-- This ensures users cannot accidentally create multiple checkout sessions

-- Create partial unique index for pending intents
CREATE UNIQUE INDEX IF NOT EXISTS purchase_intents_pending_unique 
ON purchase_intents(user_id, product_id) 
WHERE status IN ('draft', 'awaiting_payment');

COMMENT ON INDEX purchase_intents_pending_unique IS 
'Ensures user can only have one pending (draft or awaiting_payment) purchase per product. Prevents duplicate checkout sessions.';
