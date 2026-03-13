-- Add 'section' value to the plan_block_type_enum
-- Sections are structural headings within a plan (duration = 0, no game_id)

ALTER TYPE plan_block_type_enum ADD VALUE IF NOT EXISTS 'section';
