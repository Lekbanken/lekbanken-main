-- =============================================================================
-- Migration: 20260123140000_play_chat_host_replies.sql
-- Description: Add recipient_participant_id to allow host to reply privately
-- =============================================================================

-- Add column for host replies to specific participants
ALTER TABLE public.play_chat_messages
  ADD COLUMN IF NOT EXISTS recipient_participant_id UUID REFERENCES public.participants(id) ON DELETE SET NULL;

-- Index for filtering messages by recipient
CREATE INDEX IF NOT EXISTS idx_play_chat_messages_recipient
  ON public.play_chat_messages(recipient_participant_id) 
  WHERE recipient_participant_id IS NOT NULL;

COMMENT ON COLUMN public.play_chat_messages.recipient_participant_id IS 
  'For host private replies: the participant this message is addressed to';

-- Update RLS policy to allow participants to see host messages addressed to them
-- Drop and recreate the participant select policy
DROP POLICY IF EXISTS "play_chat_messages_select_participant" ON public.play_chat_messages;
CREATE POLICY "play_chat_messages_select_participant" ON public.play_chat_messages
  FOR SELECT USING (
    -- Public messages: everyone can see
    visibility = 'public'
    OR
    -- Private messages sent by this participant
    (visibility = 'host' AND sender_participant_id IS NOT NULL AND sender_participant_id = (
      SELECT id FROM public.participants 
      WHERE participant_token = current_setting('request.headers', true)::json->>'x-participant-token'
      AND session_id = play_chat_messages.session_id
      LIMIT 1
    ))
    OR
    -- Private messages from host TO this participant
    (visibility = 'host' AND recipient_participant_id IS NOT NULL AND recipient_participant_id = (
      SELECT id FROM public.participants 
      WHERE participant_token = current_setting('request.headers', true)::json->>'x-participant-token'
      AND session_id = play_chat_messages.session_id
      LIMIT 1
    ))
  );
