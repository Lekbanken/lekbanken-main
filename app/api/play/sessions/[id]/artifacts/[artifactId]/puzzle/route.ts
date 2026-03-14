import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { apiHandler } from '@/lib/api/route-handler';
import { ParticipantSessionService } from '@/lib/services/participants/session-service';
import { assertSessionStatus } from '@/lib/play/session-guards';
import {
  normalizeRiddleAnswer,
  checkRiddleAnswer,
  type RiddleNormalizeMode,
} from '@/types/puzzle-modules';

// =============================================================================
// V2 Architecture Notes:
// =============================================================================
// This route now uses the V2 artifacts pattern:
// - Config (correctAnswers, target, etc.) is read from game_artifacts.metadata
// - Runtime state (puzzleState) is stored in session_artifact_state.state
// - The artifactId parameter is the game_artifact_id (NOT session_artifact_id)
// =============================================================================

// =============================================================================
// Types
// =============================================================================

type PuzzleSubmitRequest = {
  puzzleType: 'riddle' | 'counter' | 'multi_answer' | 'cipher' | 'qr_gate';
  answer?: string;
  action?: 'increment' | 'decrement' | 'check_item' | 'verify';
  itemId?: string;
};

type PuzzleSubmitResponse = {
  status: 'success' | 'fail' | 'locked' | 'already_solved' | 'error';
  message: string;
  solved?: boolean;
  attemptsLeft?: number | null;
  state?: Record<string, unknown>;
};

// =============================================================================
// Helpers
// =============================================================================

// Puzzle RPCs are defined in migration 20260311000001_atomic_puzzle_rpcs.sql.
// Until the migration is deployed and `supabase gen types` regenerates the TS
// types, we call `.rpc()` through this typed wrapper to avoid TS2345 errors.
// Remove this wrapper once the generated types include the new RPCs.
const callRpc = async (supabase: Awaited<ReturnType<typeof createServiceRoleClient>>, fn: string, params: Record<string, unknown>) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase.rpc as any)(fn, params) as Promise<{ data: unknown; error: { message: string } | null }>;
};

// =============================================================================
// V2 State Helpers
// =============================================================================

async function getArtifactConfig(
  supabase: Awaited<ReturnType<typeof createServiceRoleClient>>,
  gameArtifactId: string
): Promise<{ metadata: Record<string, unknown>; artifact_type: string } | null> {
  const { data } = await supabase
    .from('game_artifacts')
    .select('metadata, artifact_type')
    .eq('id', gameArtifactId)
    .single();
  
  if (!data) return null;
  return {
    metadata: (data.metadata || {}) as Record<string, unknown>,
    artifact_type: data.artifact_type,
  };
}

async function getPuzzleState(
  supabase: Awaited<ReturnType<typeof createServiceRoleClient>>,
  sessionId: string,
  gameArtifactId: string
): Promise<Record<string, unknown>> {
  const { data } = await supabase
    .from('session_artifact_state')
    .select('state')
    .eq('session_id', sessionId)
    .eq('game_artifact_id', gameArtifactId)
    .single();
  
  if (!data?.state) return {};
  return (data.state as Record<string, unknown>) || {};
}

// =============================================================================
// RPC Result Type
// =============================================================================

type PuzzleRpcResult = {
  status: string;
  message: string;
  solved?: boolean;
  locked?: boolean;
  attempts_left?: number | null;
  state?: Record<string, unknown>;
};

function mapRpcResult(result: PuzzleRpcResult): PuzzleSubmitResponse {
  return {
    status: result.status as PuzzleSubmitResponse['status'],
    message: result.message,
    solved: result.solved,
    attemptsLeft: result.attempts_left,
    state: result.state,
  };
}

// =============================================================================
// POST Handler (V2 — Atomic RPCs)
// =============================================================================
// All state mutations now use atomic Postgres RPCs with FOR UPDATE row locking.
// This eliminates the JSONB read-modify-write race condition (PLAY-002 P0).
// Answer validation for riddle stays in TypeScript (fuzzy normalization).

export const POST = apiHandler({
  auth: 'participant',
  handler: async ({ params, participant: p, req }) => {
    const sessionId = params.id;
    const gameArtifactId = params.artifactId;

    // Verify participant belongs to this session
    if (p!.sessionId !== sessionId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify session status allows puzzle submissions
    const session = await ParticipantSessionService.getSessionById(sessionId);
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    const statusError = assertSessionStatus(session.status, 'puzzle');
    if (statusError) return statusError;

    const body = (await req.json()) as PuzzleSubmitRequest;
    const { puzzleType, answer, action, itemId } = body;

    const supabase = await createServiceRoleClient();

    switch (puzzleType) {
      case 'riddle': {
        if (!answer) {
          return NextResponse.json({ error: 'answer required for riddle' }, { status: 400 });
        }

        // Validate answer in TypeScript (complex normalization stays here)
        const config = await getArtifactConfig(supabase, gameArtifactId);
        if (!config) return NextResponse.json({ error: 'Artefakt hittades inte' }, { status: 404 });

        const correctAnswers = (config.metadata.correctAnswers || []) as string[];
        const normalizeMode = (config.metadata.normalizeMode || 'fuzzy') as RiddleNormalizeMode;
        const maxAttempts = typeof config.metadata.maxAttempts === 'number' ? config.metadata.maxAttempts : null;
        const { isCorrect } = checkRiddleAnswer(answer, correctAnswers, normalizeMode);

        // Atomic RPC — state mutation with FOR UPDATE row lock
        const { data, error } = await callRpc(supabase, 'attempt_puzzle_riddle_v2', {
          p_session_id: sessionId,
          p_game_artifact_id: gameArtifactId,
          p_normalized_answer: normalizeRiddleAnswer(answer, normalizeMode),
          p_is_correct: isCorrect,
          p_participant_id: p!.participantId,
        });

        if (error) {
          console.error('[Puzzle Riddle RPC] Error:', error);
          return NextResponse.json({ error: 'Failed to process puzzle attempt' }, { status: 500 });
        }

        // Override message with config messages (RPC uses defaults, but config
        // may have been updated since migration — TypeScript has latest config)
        const result = data as PuzzleRpcResult;
        if (result.status === 'success') {
          result.message = (config.metadata.successMessage as string) || result.message;
        } else if (result.status === 'locked') {
          result.message = (config.metadata.lockedMessage as string) || result.message;
        } else if (result.status === 'fail') {
          result.message = (config.metadata.failMessage as string) || result.message;
        }

        // Ensure attemptsLeft uses TypeScript-computed maxAttempts for consistency
        if (maxAttempts !== null && result.state) {
          const attempts = (result.state as Record<string, unknown>).attempts;
          const attemptCount = Array.isArray(attempts) ? attempts.length : 0;
          result.attempts_left = Math.max(0, maxAttempts - attemptCount);
        }

        return NextResponse.json(mapRpcResult(result));
      }

      case 'counter': {
        if (!action || !['increment', 'decrement'].includes(action)) {
          return NextResponse.json({ error: 'action must be increment or decrement' }, { status: 400 });
        }

        // Atomic RPC — state mutation with FOR UPDATE row lock
        const { data, error } = await callRpc(supabase, 'attempt_puzzle_counter_v2', {
          p_session_id: sessionId,
          p_game_artifact_id: gameArtifactId,
          p_action: action,
          p_participant_id: p!.participantId,
        });

        if (error) {
          console.error('[Puzzle Counter RPC] Error:', error);
          return NextResponse.json({ error: 'Failed to process puzzle attempt' }, { status: 500 });
        }

        return NextResponse.json(mapRpcResult(data as PuzzleRpcResult));
      }

      case 'multi_answer': {
        if (!itemId) {
          return NextResponse.json({ error: 'itemId required for multi_answer' }, { status: 400 });
        }

        // Atomic RPC — state mutation with FOR UPDATE row lock
        const { data, error } = await callRpc(supabase, 'attempt_puzzle_multi_answer_v2', {
          p_session_id: sessionId,
          p_game_artifact_id: gameArtifactId,
          p_item_id: itemId,
          p_participant_id: p!.participantId,
        });

        if (error) {
          console.error('[Puzzle MultiAnswer RPC] Error:', error);
          return NextResponse.json({ error: 'Failed to process puzzle attempt' }, { status: 500 });
        }

        return NextResponse.json(mapRpcResult(data as PuzzleRpcResult));
      }

      case 'qr_gate': {
        if (!answer) {
          return NextResponse.json({ error: 'answer (scanned value) required for qr_gate' }, { status: 400 });
        }

        // Atomic RPC — state mutation with FOR UPDATE row lock
        const { data, error } = await callRpc(supabase, 'attempt_puzzle_qr_gate_v2', {
          p_session_id: sessionId,
          p_game_artifact_id: gameArtifactId,
          p_scanned_value: answer,
          p_participant_id: p!.participantId,
        });

        if (error) {
          console.error('[Puzzle QR Gate RPC] Error:', error);
          return NextResponse.json({ error: 'Failed to process puzzle attempt' }, { status: 500 });
        }

        return NextResponse.json(mapRpcResult(data as PuzzleRpcResult));
      }

      default:
        return NextResponse.json({ error: `Unsupported puzzle type: ${puzzleType}` }, { status: 400 });
    }
  },
});

// =============================================================================
// GET Handler - Get puzzle state (V2)
// =============================================================================
// NOTE: artifactId is now game_artifact_id (not session_artifact_id)

export const GET = apiHandler({
  auth: 'participant',
  handler: async ({ params, participant: p }) => {
    const sessionId = params.id;
    const gameArtifactId = params.artifactId;

    // Verify participant belongs to this session
    if (p!.sessionId !== sessionId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = await createServiceRoleClient();

    // V2: Get config from game_artifacts
    const config = await getArtifactConfig(supabase, gameArtifactId);
    if (!config) {
      return NextResponse.json({ error: 'Artifact not found' }, { status: 404 });
    }

    // V2: Get runtime state from session_artifact_state
    const stateData = await getPuzzleState(supabase, sessionId, gameArtifactId);
    const puzzleState = stateData.puzzleState || null;

    // Return sanitized state (no answers/solutions)
    return NextResponse.json({
      artifactId: gameArtifactId,
      artifactType: config.artifact_type,
      state: puzzleState,
    });
  },
});
