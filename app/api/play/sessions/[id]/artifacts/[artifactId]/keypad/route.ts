import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { ParticipantSessionService } from '@/lib/services/participants/session-service';
import type { Json } from '@/types/supabase';
import { assertSessionStatus } from '@/lib/play/session-guards';
import { apiHandler } from '@/lib/api/route-handler';
import { requireActiveParticipant } from '@/lib/api/play-auth';

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

export const POST = apiHandler({
  auth: 'participant',
  handler: async ({ req, participant: p, params }) => {
    const sessionId = params.id;
    const gameArtifactId = params.artifactId;

    // Verify participant belongs to this session
    if (p!.sessionId !== sessionId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // BUG-083 FIX: idle participants must not submit keypad codes
    const activeGuard = requireActiveParticipant(p!.status);
    if (activeGuard) return activeGuard;

    // Parse request body
    let enteredCode: string;
    try {
      const body = await req.json();
      enteredCode = typeof body.enteredCode === 'string' ? body.enteredCode : '';
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    if (!enteredCode) {
      return NextResponse.json({ error: 'enteredCode is required' }, { status: 400 });
    }

    // V2: Verify session and that artifact belongs to session's game
    const session = await ParticipantSessionService.getSessionById(sessionId);
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    const statusError = assertSessionStatus(session.status, 'keypad');
    if (statusError) return statusError;

    if (!session.game_id) return NextResponse.json({ error: 'Session has no associated game' }, { status: 400 });

    const supabase = await createServiceRoleClient();

  // V2: Check game_artifacts instead of session_artifacts
  const { data: artifact, error: artifactErr } = await supabase
    .from('game_artifacts')
    .select('id, game_id, artifact_type, metadata')
    .eq('id', gameArtifactId)
    .single();

  if (artifactErr || !artifact) {
    return NextResponse.json({ error: 'Artifact not found' }, { status: 404 });
  }

  if (artifact.game_id !== session.game_id) {
    return NextResponse.json({ error: 'Artifact does not belong to session game' }, { status: 400 });
  }

  if (artifact.artifact_type !== 'keypad') {
    return NextResponse.json({ error: 'Artifact is not a keypad' }, { status: 400 });
  }

  // V2: Use the new RPC function that works with game_artifacts + session_artifact_state
  const { data: rpcResult, error: rpcError } = await supabase.rpc('attempt_keypad_unlock_v2', {
    p_session_id: sessionId,
    p_game_artifact_id: gameArtifactId,
    p_entered_code: enteredCode,
    p_participant_id: p!.participantId,
    p_participant_name: p!.displayName,
  });

  if (rpcError) {
    console.error('[keypad/route] RPC error:', rpcError);
    return NextResponse.json({ error: 'Failed to process keypad attempt' }, { status: 500 });
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
      unlockedBy: p!.displayName,
      participantId: p!.participantId,
      revealedVariants: variantsToReveal.length,
    });

  } else if (result.status === 'locked') {
    // Broadcast lockout event
    await broadcastKeypadEvent(sessionId, gameArtifactId, 'keypad_locked_out', {
      lockedBy: p!.displayName,
      participantId: p!.participantId,
      totalAttempts: result.attempt_count,
    });

  } else if (result.status === 'fail') {
    // Broadcast failed attempt (no enteredCode!)
    await broadcastKeypadEvent(sessionId, gameArtifactId, 'keypad_attempt_failed', {
      attemptBy: p!.displayName,
      participantId: p!.participantId,
      attemptCount: result.attempt_count,
      attemptsLeft: result.attempts_left,
    });
  }

  return NextResponse.json(response, { status: 200 });
  },
});

/**
 * GET /api/play/sessions/[id]/artifacts/[artifactId]/keypad
 * 
 * V2: Returns current keypad state (without correctCode).
 * Reads config from game_artifacts, state from session_artifact_state.
 */
export const GET = apiHandler({
  auth: 'participant',
  handler: async ({ params, participant: p }) => {
    const sessionId = params.id;
    const gameArtifactId = params.artifactId;

    // Verify participant belongs to this session
    if (p!.sessionId !== sessionId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // V2: Verify session and artifact belong together
    const session = await ParticipantSessionService.getSessionById(sessionId);
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    if (!session.game_id) return NextResponse.json({ error: 'Session has no associated game' }, { status: 400 });

    const supabase = await createServiceRoleClient();

    // V2: Get config from game_artifacts
    const { data: artifact, error } = await supabase
      .from('game_artifacts')
      .select('id, title, game_id, artifact_type, metadata')
      .eq('id', gameArtifactId)
      .single();

    if (error || !artifact) {
      return NextResponse.json({ error: 'Artifact not found' }, { status: 404 });
    }

    if (artifact.game_id !== session.game_id) {
      return NextResponse.json({ error: 'Artifact does not belong to session game' }, { status: 400 });
    }

    if (artifact.artifact_type !== 'keypad') {
      return NextResponse.json({ error: 'Artifact is not a keypad' }, { status: 400 });
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
  },
});
