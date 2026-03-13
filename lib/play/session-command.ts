/**
 * Session Command Pipeline — MS11
 *
 * Centralised helper that validates, persists, applies, and broadcasts
 * every host command for a participant session.
 *
 * Goals:
 *   1. Idempotency  — (client_id + client_seq) dedup
 *   2. Audit trail  — every command stored in `session_commands`
 *   3. Single code-path for all mutations — deterministic state transitions
 *   4. Broadcast after apply — never before
 */

import { ParticipantSessionService } from '@/lib/services/participants/session-service';
import type { ParticipantSessionWithRuntime } from '@/types/participant-session-extended';
import { broadcastPlayEvent } from '@/lib/realtime/play-broadcast-server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { logGamificationEventV1 } from '@/lib/services/gamification-events.server';
import type { Json } from '@/types/supabase';

// ─── Command types ─────────────────────────────────────────────

export const SESSION_COMMAND_TYPES = [
  // Status transitions
  'publish',        // draft → lobby
  'unpublish',      // lobby → draft
  'start',          // lobby → active
  'pause',          // active → paused
  'resume',         // paused → active
  'end',            // any → ended
  'lock',           // active → locked
  'unlock',         // locked → active
  // Runtime state
  'set_step',       // navigate to step
  'set_phase',      // navigate to phase
  'timer_start',    // start countdown
  'timer_pause',    // pause countdown
  'timer_resume',   // resume countdown
  'timer_reset',    // clear timer
  'set_board_message', // update board state
] as const;

export type SessionCommandType = (typeof SESSION_COMMAND_TYPES)[number];

export interface SessionCommand {
  sessionId: string;
  issuedBy: string;         // auth.uid()
  commandType: SessionCommandType;
  payload: Record<string, Json>;
  clientId: string;         // stable per-tab identifier
  clientSeq: number;        // monotonic per clientId
}

export interface CommandResult {
  success: boolean;
  commandId?: string;
  duplicate?: boolean;       // true if idempotency caught a retry
  error?: string;
  state?: {
    id: string;
    status: string;
    current_step_index: number;
    current_phase_index: number;
    timer_state: unknown;
    board_state: unknown;
  };
}

// ─── Status transition map (state-machine guard) ───────────────

type StatusAction = 'publish' | 'unpublish' | 'start' | 'pause' | 'resume' | 'end' | 'lock' | 'unlock';
type SessionStatus = 'draft' | 'lobby' | 'active' | 'paused' | 'locked' | 'ended' | 'archived' | 'cancelled';

const STATUS_TRANSITIONS: Record<StatusAction, { from: Set<SessionStatus>; to: SessionStatus }> = {
  publish:   { from: new Set(['draft']),   to: 'lobby'  },
  unpublish: { from: new Set(['lobby', 'active', 'paused']),   to: 'draft'  },
  start:     { from: new Set(['lobby']),   to: 'active' },
  pause:     { from: new Set(['active']),  to: 'paused' },
  resume:    { from: new Set(['paused']),  to: 'active' },
  end:       { from: new Set(['draft', 'lobby', 'active', 'paused', 'locked']), to: 'ended' },
  lock:      { from: new Set(['active']),  to: 'locked' },
  unlock:    { from: new Set(['locked']),  to: 'active' },
};

const STATUS_ACTIONS = new Set<string>(Object.keys(STATUS_TRANSITIONS));

// ─── Main entry point ──────────────────────────────────────────

export async function applySessionCommand(cmd: SessionCommand): Promise<CommandResult> {
  const supabase = createServiceRoleClient();

  // ── 1. Idempotency check ──────────────────────────────────────
  const { data: existing } = await supabase
    .from('session_commands')
    .select('id, applied')
    .eq('session_id', cmd.sessionId)
    .eq('client_id', cmd.clientId)
    .eq('client_seq', cmd.clientSeq)
    .maybeSingle();

  if (existing) {
    // Already processed — return success without re-applying
    return { success: true, commandId: existing.id, duplicate: true };
  }

  // ── 2. Insert command record ──────────────────────────────────
  const { data: inserted, error: insertError } = await supabase
    .from('session_commands')
    .insert({
      session_id: cmd.sessionId,
      issued_by: cmd.issuedBy,
      command_type: cmd.commandType,
      payload: cmd.payload,
      client_id: cmd.clientId,
      client_seq: cmd.clientSeq,
    })
    .select('id')
    .single();

  if (insertError) {
    // Unique constraint violation = concurrent retry (race between check + insert)
    if (insertError.code === '23505') {
      return { success: true, duplicate: true };
    }
    return { success: false, error: `Failed to record command: ${insertError.message}` };
  }

  const commandId = inserted.id;

  // ── 3. Apply the mutation ─────────────────────────────────────
  try {
    const broadcastEvent = await executeMutation(cmd, supabase);

    // Mark command as applied
    await supabase
      .from('session_commands')
      .update({ applied: true, applied_at: new Date().toISOString() })
      .eq('id', commandId);

    // ── 4. Broadcast (after successful apply) ─────────────────
    if (broadcastEvent) {
      await broadcastPlayEvent(cmd.sessionId, broadcastEvent);
    }

    // ── 5. Return updated state ───────────────────────────────
    const updated = await ParticipantSessionService.getSessionById(cmd.sessionId) as ParticipantSessionWithRuntime | null;

    return {
      success: true,
      commandId,
      state: updated ? {
        id: updated.id,
        status: updated.status,
        current_step_index: updated.current_step_index ?? 0,
        current_phase_index: updated.current_phase_index ?? 0,
        timer_state: updated.timer_state,
        board_state: updated.board_state,
      } : undefined,
    };
  } catch (err) {
    // Mark command as failed
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    await supabase
      .from('session_commands')
      .update({ applied: false, error: errorMessage })
      .eq('id', commandId);

    return { success: false, commandId, error: errorMessage };
  }
}

// ─── Mutation executor ─────────────────────────────────────────

type ServiceClient = ReturnType<typeof createServiceRoleClient>;

async function executeMutation(cmd: SessionCommand, supabase: ServiceClient): Promise<Record<string, unknown> | null> {
  const { sessionId, commandType, payload } = cmd;

  // ── Status transitions ────────────────────────────────────────
  if (STATUS_ACTIONS.has(commandType)) {
    const transition = STATUS_TRANSITIONS[commandType as StatusAction];

    // Atomic status transition — WHERE guards against concurrent races (TOCTOU fix)
    const now = new Date().toISOString();

    // Fetch session for started_at check and context for side effects
    const { data: session, error } = await supabase
      .from('participant_sessions')
      .select('id, status, started_at, tenant_id, game_id, plan_id, host_user_id')
      .eq('id', sessionId)
      .single();

    if (error || !session) throw new Error('Session not found');

    const currentStatus = session.status as SessionStatus;
    if (!transition.from.has(currentStatus)) {
      throw new Error(`Cannot ${commandType}: session is '${currentStatus}', expected one of [${[...transition.from].join(', ')}]`);
    }

    const shouldSetStartedAt = commandType === 'start' && !session.started_at;

    // Atomic update with status guard — prevents TOCTOU race
    const { data: updated, error: updateError } = await supabase
      .from('participant_sessions')
      .update({
        status: transition.to,
        started_at: shouldSetStartedAt ? now : session.started_at,
        paused_at: transition.to === 'paused' ? now : null,
        ended_at: transition.to === 'ended' ? now : null,
        updated_at: now,
      })
      .eq('id', sessionId)
      .in('status', [...transition.from])
      .select('id')
      .maybeSingle();

    if (updateError) throw new Error(`Status update failed: ${updateError.message}`);
    if (!updated) throw new Error(`Conflict: session status changed concurrently (expected one of [${[...transition.from].join(', ')}])`);

    // ── Side effects on 'end' ─────────────────────────────────
    if (commandType === 'end') {
      // Disconnect all active/idle participants
      await supabase
        .from('participants')
        .update({
          status: 'disconnected',
          disconnected_at: now,
        })
        .eq('session_id', sessionId)
        .in('status', ['active', 'idle']);

      // Log gamification event
      try {
        await logGamificationEventV1({
          tenantId: (session.tenant_id as string | null) ?? null,
          actorUserId: cmd.issuedBy,
          eventType: 'session_completed',
          source: 'play',
          idempotencyKey: `participant_session:${sessionId}:ended`,
          metadata: {
            participantSessionId: sessionId,
            gameId: (session.game_id as string | null) ?? null,
            planId: (session.plan_id as string | null) ?? null,
          },
        });
      } catch (e) {
        console.warn('[session-command] gamification event log failed', e);
      }
    }

    return {
      type: 'state_change',
      payload: { status: transition.to },
      timestamp: now,
    };
  }

  // ── Runtime state mutations ───────────────────────────────────
  switch (commandType) {
    case 'set_step': {
      const stepIndex = payload.step_index as number;
      if (typeof stepIndex !== 'number' || stepIndex < 0) throw new Error('Invalid step_index');
      await ParticipantSessionService.updateCurrentStep(sessionId, stepIndex);
      return {
        type: 'state_change',
        payload: { current_step_index: stepIndex },
        timestamp: new Date().toISOString(),
      };
    }

    case 'set_phase': {
      const phaseIndex = payload.phase_index as number;
      if (typeof phaseIndex !== 'number' || phaseIndex < 0) throw new Error('Invalid phase_index');
      await ParticipantSessionService.updateCurrentPhase(sessionId, phaseIndex);
      return {
        type: 'state_change',
        payload: { current_phase_index: phaseIndex },
        timestamp: new Date().toISOString(),
      };
    }

    case 'timer_start': {
      const duration = payload.duration_seconds as number;
      if (typeof duration !== 'number' || duration <= 0) throw new Error('Invalid duration_seconds');
      await ParticipantSessionService.startTimer(sessionId, duration);
      const updated = await ParticipantSessionService.getSessionById(sessionId) as ParticipantSessionWithRuntime | null;
      return {
        type: 'timer_update',
        payload: { action: 'start', timer_state: updated?.timer_state ?? null },
        timestamp: new Date().toISOString(),
      };
    }

    case 'timer_pause': {
      await ParticipantSessionService.pauseTimer(sessionId);
      const updated = await ParticipantSessionService.getSessionById(sessionId) as ParticipantSessionWithRuntime | null;
      return {
        type: 'timer_update',
        payload: { action: 'pause', timer_state: updated?.timer_state ?? null },
        timestamp: new Date().toISOString(),
      };
    }

    case 'timer_resume': {
      await ParticipantSessionService.resumeTimer(sessionId);
      const updated = await ParticipantSessionService.getSessionById(sessionId) as ParticipantSessionWithRuntime | null;
      return {
        type: 'timer_update',
        payload: { action: 'resume', timer_state: updated?.timer_state ?? null },
        timestamp: new Date().toISOString(),
      };
    }

    case 'timer_reset': {
      await ParticipantSessionService.resetTimer(sessionId);
      return {
        type: 'timer_update',
        payload: { action: 'reset', timer_state: null },
        timestamp: new Date().toISOString(),
      };
    }

    case 'set_board_message': {
      const message = payload.message as string | undefined;
      const overrides = payload.overrides as Record<string, boolean> | undefined;
      await ParticipantSessionService.updateBoardState(sessionId, {
        message: message ?? undefined,
        overrides,
      });
      return {
        type: 'board_update',
        payload: { message: message ?? undefined, overrides },
        timestamp: new Date().toISOString(),
      };
    }

    default:
      throw new Error(`Unknown command type: ${commandType}`);
  }
}
