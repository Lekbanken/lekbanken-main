import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import type { Json } from '@/types/supabase';

/**
 * POST /api/play/sessions/[id]/artifacts/[artifactId]/keypad
 * 
 * Server-side keypad code validation.
 * - Participant submits enteredCode
 * - Server validates against correctCode (never exposed to client)
 * - Server updates session_artifacts.metadata with keypad state
 * - Returns status + message + variant IDs to reveal
 * 
 * Security: correctCode is NEVER sent to participants.
 */

type KeypadState = {
  attemptCount: number;
  isUnlocked: boolean;
  isLockedOut: boolean;
  unlockedAt: string | null;
  unlockedByParticipantId: string | null;
};

type KeypadConfig = {
  correctCode?: string;
  codeLength?: number;
  maxAttempts?: number | null;
  lockOnFail?: boolean;
  successMessage?: string;
  failMessage?: string;
  lockedMessage?: string;
};

type KeypadAttemptResponse = {
  status: 'success' | 'fail' | 'locked' | 'already_unlocked';
  message: string;
  attemptsLeft?: number;
  revealVariantIds?: string[];
  keypadState: {
    isUnlocked: boolean;
    isLockedOut: boolean;
    attemptCount: number;
  };
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function parseKeypadConfig(metadata: Json | null): KeypadConfig {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return {};
  }
  const m = metadata as Record<string, unknown>;
  return {
    correctCode: typeof m.correctCode === 'string' ? m.correctCode : undefined,
    codeLength: typeof m.codeLength === 'number' ? m.codeLength : undefined,
    maxAttempts: typeof m.maxAttempts === 'number' ? m.maxAttempts : null,
    lockOnFail: typeof m.lockOnFail === 'boolean' ? m.lockOnFail : false,
    successMessage: typeof m.successMessage === 'string' ? m.successMessage : undefined,
    failMessage: typeof m.failMessage === 'string' ? m.failMessage : undefined,
    lockedMessage: typeof m.lockedMessage === 'string' ? m.lockedMessage : undefined,
  };
}

function parseKeypadState(metadata: Json | null): KeypadState {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return { attemptCount: 0, isUnlocked: false, isLockedOut: false, unlockedAt: null, unlockedByParticipantId: null };
  }
  const m = metadata as Record<string, unknown>;
  const state = m.keypadState as Record<string, unknown> | undefined;
  if (!state || typeof state !== 'object') {
    return { attemptCount: 0, isUnlocked: false, isLockedOut: false, unlockedAt: null, unlockedByParticipantId: null };
  }
  return {
    attemptCount: typeof state.attemptCount === 'number' ? state.attemptCount : 0,
    isUnlocked: typeof state.isUnlocked === 'boolean' ? state.isUnlocked : false,
    isLockedOut: typeof state.isLockedOut === 'boolean' ? state.isLockedOut : false,
    unlockedAt: typeof state.unlockedAt === 'string' ? state.unlockedAt : null,
    unlockedByParticipantId: typeof state.unlockedByParticipantId === 'string' ? state.unlockedByParticipantId : null,
  };
}

async function resolveParticipant(sessionId: string, request: Request) {
  const token = request.headers.get('x-participant-token');
  if (!token) return null;

  const supabase = await createServiceRoleClient();
  const { data: participant } = await supabase
    .from('participants')
    .select('id, display_name, token_expires_at')
    .eq('participant_token', token)
    .eq('session_id', sessionId)
    .single();

  if (!participant) return null;
  if (participant.token_expires_at && new Date(participant.token_expires_at) < new Date()) return null;

  return { participantId: participant.id, displayName: participant.display_name };
}

async function broadcastKeypadEvent(
  sessionId: string, 
  artifactId: string, 
  event: 'keypad_unlocked' | 'keypad_attempt_failed' | 'keypad_locked_out',
  payload: Record<string, unknown>
) {
  try {
    const supabase = await createServiceRoleClient();
    const channel = supabase.channel(`play:${sessionId}`);
    await channel.send({
      type: 'broadcast',
      event: 'play_event',
      payload: {
        type: event,
        artifactId,
        timestamp: new Date().toISOString(),
        ...payload,
      },
    });
  } catch (error) {
    console.warn('[keypad/route] Failed to broadcast event:', error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; artifactId: string }> }
) {
  const { id: sessionId, artifactId } = await params;

  // Parse request body
  let enteredCode: string;
  try {
    const body = await request.json();
    enteredCode = typeof body.enteredCode === 'string' ? body.enteredCode : '';
  } catch {
    return jsonError('Invalid request body', 400);
  }

  if (!enteredCode) {
    return jsonError('enteredCode is required', 400);
  }

  // Resolve participant (only participants can attempt keypad)
  const participant = await resolveParticipant(sessionId, request);
  if (!participant) {
    return jsonError('Unauthorized - participant token required', 401);
  }

  const supabase = await createServiceRoleClient();

  // Verify artifact belongs to this session first
  const { data: artifact, error: artifactErr } = await supabase
    .from('session_artifacts')
    .select('id, session_id, artifact_type, metadata')
    .eq('id', artifactId)
    .eq('session_id', sessionId)
    .single();

  if (artifactErr || !artifact) {
    return jsonError('Artifact not found', 404);
  }

  if (artifact.artifact_type !== 'keypad') {
    return jsonError('Artifact is not a keypad', 400);
  }

  // Use atomic RPC function to prevent race conditions
  // This uses FOR UPDATE lock to ensure only one attempt can succeed
  const { data: rpcResult, error: rpcError } = await supabase.rpc('attempt_keypad_unlock', {
    p_artifact_id: artifactId,
    p_entered_code: enteredCode,
    p_participant_id: participant.participantId,
    p_participant_name: participant.displayName,
  });

  if (rpcError) {
    console.error('[keypad/route] RPC error:', rpcError);
    return jsonError('Failed to process keypad attempt', 500);
  }

  const result = rpcResult as {
    status: string;
    message: string;
    is_unlocked: boolean;
    is_locked_out: boolean;
    attempt_count: number;
    attempts_left?: number | null;
    unlocked_by?: string;
  };

  // Parse config for messages (RPC returns default messages)
  const config = parseKeypadConfig(artifact.metadata);

  // Build response
  const response: KeypadAttemptResponse = {
    status: result.status as 'success' | 'fail' | 'locked' | 'already_unlocked',
    message: result.message,
    attemptsLeft: result.attempts_left ?? undefined,
    keypadState: {
      isUnlocked: result.is_unlocked,
      isLockedOut: result.is_locked_out,
      attemptCount: result.attempt_count,
    },
  };

  // Handle post-unlock actions (reveal variants, broadcast)
  if (result.status === 'success') {
    // Find public variants to reveal
    const { data: variants } = await supabase
      .from('session_artifact_variants')
      .select('id, visibility, revealed_at')
      .eq('session_artifact_id', artifactId);

    const variantsToReveal = (variants ?? [])
      .filter((v) => v.visibility === 'public' && !v.revealed_at)
      .map((v) => v.id as string);

    // Auto-reveal public variants
    if (variantsToReveal.length > 0) {
      await supabase
        .from('session_artifact_variants')
        .update({ revealed_at: new Date().toISOString() })
        .in('id', variantsToReveal);
    }

    response.revealVariantIds = variantsToReveal;

    // Broadcast unlock event (no enteredCode or correctCode!)
    await broadcastKeypadEvent(sessionId, artifactId, 'keypad_unlocked', {
      unlockedBy: participant.displayName,
      participantId: participant.participantId,
      revealedVariants: variantsToReveal.length,
    });

  } else if (result.status === 'locked') {
    // Broadcast lockout event
    await broadcastKeypadEvent(sessionId, artifactId, 'keypad_locked_out', {
      lockedBy: participant.displayName,
      participantId: participant.participantId,
      totalAttempts: result.attempt_count,
    });

  } else if (result.status === 'fail') {
    // Broadcast failed attempt (no enteredCode!)
    await broadcastKeypadEvent(sessionId, artifactId, 'keypad_attempt_failed', {
      attemptBy: participant.displayName,
      participantId: participant.participantId,
      attemptCount: result.attempt_count,
      attemptsLeft: result.attempts_left,
    });
  }

  return NextResponse.json(response, { status: 200 });
}

/**
 * GET /api/play/sessions/[id]/artifacts/[artifactId]/keypad
 * 
 * Returns the current keypad state (without correctCode).
 * Useful for syncing state on page load.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; artifactId: string }> }
) {
  const { id: sessionId, artifactId } = await params;

  const participant = await resolveParticipant(sessionId, request);
  if (!participant) {
    return jsonError('Unauthorized - participant token required', 401);
  }

  const supabase = await createServiceRoleClient();

  const { data: artifact, error } = await supabase
    .from('session_artifacts')
    .select('id, title, artifact_type, metadata')
    .eq('id', artifactId)
    .eq('session_id', sessionId)
    .single();

  if (error || !artifact) {
    return jsonError('Artifact not found', 404);
  }

  if (artifact.artifact_type !== 'keypad') {
    return jsonError('Artifact is not a keypad', 400);
  }

  const config = parseKeypadConfig(artifact.metadata);
  const state = parseKeypadState(artifact.metadata);

  // Calculate attempts left (without exposing correctCode)
  const attemptsLeft = config.maxAttempts 
    ? Math.max(0, config.maxAttempts - state.attemptCount) 
    : null;

  return NextResponse.json({
    artifactId: artifact.id,
    title: artifact.title,
    codeLength: config.codeLength || 4,
    maxAttempts: config.maxAttempts,
    attemptsLeft,
    successMessage: config.successMessage,
    failMessage: config.failMessage,
    lockedMessage: config.lockedMessage,
    keypadState: {
      isUnlocked: state.isUnlocked,
      isLockedOut: state.isLockedOut,
      attemptCount: state.attemptCount,
      unlockedAt: state.unlockedAt,
    },
  }, { status: 200 });
}
