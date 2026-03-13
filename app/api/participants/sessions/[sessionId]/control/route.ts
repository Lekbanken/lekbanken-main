/**
 * Session Control API
 * 
 * PATCH /api/participants/sessions/[sessionId]/control
 * 
 * Host controls for managing session state:
 * - pause: Temporarily pause session (no new activity)
 * - resume: Resume paused session
 * - lock: Prevent new participants from joining
 * - unlock: Allow new participants again
 * - end: End session gracefully
 * 
 * Delegates status mutation to the command pipeline (session-command.ts)
 * and adds control-specific side effects: activity log + legacy broadcast.
 */

import { NextResponse } from 'next/server';
import { createServerRlsClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { apiHandler } from '@/lib/api/route-handler';
import type { Database } from '@/types/supabase';
import { applySessionCommand, type SessionCommandType } from '@/lib/play/session-command';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface ControlRequest {
  action: 'pause' | 'resume' | 'lock' | 'unlock' | 'end';
  reason?: string;
}

const ACTION_TO_BROADCAST: Record<string, string> = {
  pause: 'session_paused',
  resume: 'session_resumed',
  lock: 'session_locked',
  unlock: 'session_unlocked',
  end: 'session_ended',
};

export const PATCH = apiHandler({
  auth: 'user',
  handler: async ({ auth, req, params }) => {
  const { sessionId } = params;
  const userId = auth!.user!.id;
  const supabase = await createServerRlsClient();

  const body = await req.json() as ControlRequest;
  const { action, reason } = body;

  // Validate action
  const validActions = ['pause', 'resume', 'lock', 'unlock', 'end'];
  if (!validActions.includes(action)) {
    return NextResponse.json(
      { error: 'Invalid action. Must be: pause, resume, lock, unlock, or end' },
      { status: 400 }
    );
  }

  // Verify session exists and user is the host (for response shape + activity log)
  const { data: session, error: sessionError } = await supabase
    .from('participant_sessions')
    .select('id, host_user_id, status, session_code, display_name, participant_count')
    .eq('id', sessionId)
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }
  if (session.host_user_id !== userId) {
    return NextResponse.json(
      { error: 'Only the session host can control this session' },
      { status: 403 }
    );
  }

  const oldStatus = session.status;

  // Delegate to command pipeline (state machine + TOCTOU guard + disconnect + gamification)
  const result = await applySessionCommand({
    sessionId,
    issuedBy: userId,
    commandType: action as SessionCommandType,
    payload: {},
    clientId: 'control',
    clientSeq: Date.now(),
  });

  if (!result.success) {
    if (result.error?.startsWith('Cannot ') || result.error?.startsWith('Conflict:')) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }
    return NextResponse.json({ error: result.error || 'Failed to update session' }, { status: 500 });
  }

  const newStatus = result.state?.status ?? action;

  // Activity log (control-route-specific)
  await supabase
    .from('participant_activity_log')
    .insert({
      session_id: sessionId,
      participant_id: null,
      event_type: `session_${action}`,
      event_data: {
        performed_by: userId,
        reason: reason || null,
        old_status: oldStatus,
        new_status: newStatus,
      },
    });

  // Legacy broadcast on session: channel (for participant UI)
  const broadcastEventType = ACTION_TO_BROADCAST[action];
  if (broadcastEventType) {
    const supabaseService = createClient<Database>(supabaseUrl, supabaseServiceKey);
    const channel = supabaseService.channel(`session:${sessionId}`);
    await channel.send({
      type: 'broadcast',
      event: 'participant_event',
      payload: {
        type: broadcastEventType,
        payload: {
          sessionId,
          action,
          reason: reason || null,
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      },
    });
  }

  return NextResponse.json({
    success: true,
    session: {
      id: session.id,
      status: newStatus,
      sessionCode: session.session_code,
      displayName: session.display_name,
      participantCount: session.participant_count,
    },
    message: `Session ${action}d successfully`,
  });
  },
})
