import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { ParticipantSessionService } from '@/lib/services/participants/session-service';
import { resolveParticipant } from '@/lib/api/play-auth';
import type { Json } from '@/types/supabase';

/**
 * POST /api/play/sessions/[id]/artifacts/[artifactId]/keypad
 * 
 * Artifacts V2: Server-side keypad code validation.
 * - artifactId now refers to game_artifacts.id
 * - Config (correctCode, maxAttempts) read from game_artifacts.metadata
 * - State (attemptCount, isUnlocked) stored in session_artifact_state
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

function parseKeypadStateFromState(stateJson: Json | null): KeypadState {
  if (!stateJson || typeof stateJson !== 'object' || Array.isArray(stateJson)) {
    return { attemptCount: 0, isUnlocked: false, isLockedOut: false, unlockedAt: null, unlockedByParticipantId: null };
  }
  const state = (stateJson as Record<string, unknown>).keypadState as Record<string, unknown> | undefined;
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
  const { id: sessionId, artifactId: gameArtifactId } = await params;

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
  const participant = await resolveParticipant(request, sessionId);
  if (!participant) {
    return jsonError('Unauthorized - participant token required', 401);
  }

  // V2: Verify session and that artifact belongs to session's game
  const session = await ParticipantSessionService.getSessionById(sessionId);
  if (!session) return jsonError('Session not found', 404);
  if (!session.game_id) return jsonError('Session has no associated game', 400);

  const supabase = await createServiceRoleClient();

  // V2: Check game_artifacts instead of session_artifacts
  const { data: artifact, error: artifactErr } = await supabase
    .from('game_artifacts')
    .select('id, game_id, artifact_type, metadata')
    .eq('id', gameArtifactId)
    .single();

  if (artifactErr || !artifact) {
    return jsonError('Artifact not found', 404);
  }

  if (artifact.game_id !== session.game_id) {
    return jsonError('Artifact does not belong to session game', 400);
  }

  if (artifact.artifact_type !== 'keypad') {
    return jsonError('Artifact is not a keypad', 400);
  }

  // V2: Use the new RPC function that works with game_artifacts + session_artifact_state
  const { data: rpcResult, error: rpcError } = await supabase.rpc('attempt_keypad_unlock_v2', {
    p_session_id: sessionId,
    p_game_artifact_id: gameArtifactId,
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
    // V2: Find public game_artifact_variants to reveal
    const { data: variants } = await supabase
      .from('game_artifact_variants')
      .select('id, visibility')
      .eq('artifact_id', gameArtifactId);

    // Check which are not yet revealed
    const variantIds = (variants ?? []).filter(v => v.visibility === 'public').map(v => v.id as string);
    
    const { data: existingStates } = variantIds.length ? await supabase
      .from('session_artifact_variant_state')
      .select('game_artifact_variant_id, revealed_at')
      .eq('session_id', sessionId)
      .in('game_artifact_variant_id', variantIds)
    : { data: [] };

    const revealedSet = new Set(
      (existingStates ?? [])
        .filter(s => s.revealed_at)
        .map(s => s.game_artifact_variant_id as string)
    );

    const variantsToReveal = variantIds.filter(id => !revealedSet.has(id));

    // V2: Auto-reveal public variants via session_artifact_variant_state
    if (variantsToReveal.length > 0) {
      const inserts = variantsToReveal.map(variantId => ({
        session_id: sessionId,
        game_artifact_variant_id: variantId,
        revealed_at: new Date().toISOString(),
      }));

      await supabase
        .from('session_artifact_variant_state')
        .upsert(inserts, { onConflict: 'session_id,game_artifact_variant_id' });
    }

    response.revealVariantIds = variantsToReveal;

    // Broadcast unlock event (no enteredCode or correctCode!)
    await broadcastKeypadEvent(sessionId, gameArtifactId, 'keypad_unlocked', {
      unlockedBy: participant.displayName,
      participantId: participant.participantId,
      revealedVariants: variantsToReveal.length,
    });

  } else if (result.status === 'locked') {
    // Broadcast lockout event
    await broadcastKeypadEvent(sessionId, gameArtifactId, 'keypad_locked_out', {
      lockedBy: participant.displayName,
      participantId: participant.participantId,
      totalAttempts: result.attempt_count,
    });

  } else if (result.status === 'fail') {
    // Broadcast failed attempt (no enteredCode!)
    await broadcastKeypadEvent(sessionId, gameArtifactId, 'keypad_attempt_failed', {
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
 * V2: Returns current keypad state (without correctCode).
 * Reads config from game_artifacts, state from session_artifact_state.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; artifactId: string }> }
) {
  const { id: sessionId, artifactId: gameArtifactId } = await params;

  const participant = await resolveParticipant(request, sessionId);
  if (!participant) {
    return jsonError('Unauthorized - participant token required', 401);
  }

  // V2: Verify session and artifact belong together
  const session = await ParticipantSessionService.getSessionById(sessionId);
  if (!session) return jsonError('Session not found', 404);
  if (!session.game_id) return jsonError('Session has no associated game', 400);

  const supabase = await createServiceRoleClient();

  // V2: Get config from game_artifacts
  const { data: artifact, error } = await supabase
    .from('game_artifacts')
    .select('id, title, game_id, artifact_type, metadata')
    .eq('id', gameArtifactId)
    .single();

  if (error || !artifact) {
    return jsonError('Artifact not found', 404);
  }

  if (artifact.game_id !== session.game_id) {
    return jsonError('Artifact does not belong to session game', 400);
  }

  if (artifact.artifact_type !== 'keypad') {
    return jsonError('Artifact is not a keypad', 400);
  }

  // V2: Get state from session_artifact_state
  const { data: stateRow } = await supabase
    .from('session_artifact_state')
    .select('state')
    .eq('session_id', sessionId)
    .eq('game_artifact_id', gameArtifactId)
    .single();

  const config = parseKeypadConfig(artifact.metadata);
  const state = parseKeypadStateFromState(stateRow?.state as Json | null);

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
