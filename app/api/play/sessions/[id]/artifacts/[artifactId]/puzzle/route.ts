import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { resolveParticipant } from '@/lib/api/play-auth';
import type { Json } from '@/types/supabase';
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

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

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

async function updatePuzzleState(
  supabase: Awaited<ReturnType<typeof createServiceRoleClient>>,
  sessionId: string,
  gameArtifactId: string,
  puzzleState: Record<string, unknown>
): Promise<void> {
  // Upsert state record
  await supabase
    .from('session_artifact_state')
    .upsert(
      {
        session_id: sessionId,
        game_artifact_id: gameArtifactId,
        state: { puzzleState } as unknown as Json,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'session_id,game_artifact_id' }
    );
}

// =============================================================================
// Riddle Logic (V2)
// =============================================================================

async function handleRiddleSubmit(
  supabase: Awaited<ReturnType<typeof createServiceRoleClient>>,
  sessionId: string,
  gameArtifactId: string,
  answer: string,
  participantId: string
): Promise<PuzzleSubmitResponse> {
  // V2: Get config from game_artifacts
  const config = await getArtifactConfig(supabase, gameArtifactId);
  if (!config) {
    return { status: 'error', message: 'Artefakt hittades inte' };
  }

  const { metadata } = config;
  const correctAnswers = (metadata.correctAnswers || []) as string[];
  const normalizeMode = (metadata.normalizeMode || 'fuzzy') as RiddleNormalizeMode;
  const maxAttempts = typeof metadata.maxAttempts === 'number' ? metadata.maxAttempts : null;

  // V2: Get runtime state from session_artifact_state
  const stateData = await getPuzzleState(supabase, sessionId, gameArtifactId);
  const puzzleState = (stateData.puzzleState || {
    solved: false,
    locked: false,
    attempts: [],
  }) as {
    solved: boolean;
    locked: boolean;
    attempts: Array<{ answer: string; timestamp: string; participantId: string }>;
  };

  // Already solved?
  if (puzzleState.solved) {
    return { status: 'already_solved', message: 'Redan löst!', solved: true };
  }

  // Locked?
  if (puzzleState.locked) {
    return { status: 'locked', message: 'Låst - för många försök' };
  }

  // Check answer
  const isCorrect = checkRiddleAnswer(answer, correctAnswers, normalizeMode);

  // Record attempt
  puzzleState.attempts.push({
    answer: normalizeRiddleAnswer(answer, normalizeMode),
    timestamp: new Date().toISOString(),
    participantId,
  });

  const attemptsLeft = maxAttempts !== null ? maxAttempts - puzzleState.attempts.length : null;

  if (isCorrect) {
    puzzleState.solved = true;

    // V2: Update state in session_artifact_state
    await updatePuzzleState(supabase, sessionId, gameArtifactId, puzzleState);

    return {
      status: 'success',
      message: (metadata.successMessage as string) || '✅ Rätt svar!',
      solved: true,
      state: puzzleState,
    };
  }

  // Wrong answer
  if (attemptsLeft !== null && attemptsLeft <= 0) {
    puzzleState.locked = true;
  }

  // V2: Update state in session_artifact_state
  await updatePuzzleState(supabase, sessionId, gameArtifactId, puzzleState);

  return {
    status: puzzleState.locked ? 'locked' : 'fail',
    message: puzzleState.locked
      ? (metadata.lockedMessage as string) || '🚫 Låst - för många försök'
      : (metadata.failMessage as string) || '❌ Fel svar. Försök igen!',
    solved: false,
    attemptsLeft,
    state: puzzleState,
  };
}

// =============================================================================
// Counter Logic
// =============================================================================
// Counter Logic (V2)
// =============================================================================

async function handleCounterAction(
  supabase: Awaited<ReturnType<typeof createServiceRoleClient>>,
  sessionId: string,
  gameArtifactId: string,
  action: 'increment' | 'decrement',
  participantId: string
): Promise<PuzzleSubmitResponse> {
  // V2: Get config from game_artifacts
  const config = await getArtifactConfig(supabase, gameArtifactId);
  if (!config) {
    return { status: 'error', message: 'Artefakt hittades inte' };
  }

  const { metadata } = config;
  const target = typeof metadata.target === 'number' ? metadata.target : null;
  const step = typeof metadata.step === 'number' ? metadata.step : 1;
  const initialValue = typeof metadata.initialValue === 'number' ? metadata.initialValue : 0;

  // V2: Get runtime state from session_artifact_state
  const stateData = await getPuzzleState(supabase, sessionId, gameArtifactId);
  const puzzleState = (stateData.puzzleState || {
    currentValue: initialValue,
    completed: false,
    history: [],
  }) as {
    currentValue: number;
    completed: boolean;
    history: Array<{ action: string; timestamp: string; participantId: string }>;
  };

  if (puzzleState.completed) {
    return { status: 'already_solved', message: 'Räknaren är redan klar!', solved: true };
  }

  // Apply action
  if (action === 'increment') {
    puzzleState.currentValue += step;
  } else {
    puzzleState.currentValue = Math.max(0, puzzleState.currentValue - step);
  }

  puzzleState.history.push({
    action,
    timestamp: new Date().toISOString(),
    participantId,
  });

  // Check if target reached
  if (target !== null && puzzleState.currentValue >= target) {
    puzzleState.completed = true;
  }

  // V2: Update state in session_artifact_state
  await updatePuzzleState(supabase, sessionId, gameArtifactId, puzzleState);

  return {
    status: puzzleState.completed ? 'success' : 'fail',
    message: puzzleState.completed
      ? `🎉 Klart! ${puzzleState.currentValue}/${target}`
      : `${puzzleState.currentValue}${target ? `/${target}` : ''}`,
    solved: puzzleState.completed,
    state: puzzleState,
  };
}

// =============================================================================
// Multi-Answer Logic (V2)
// =============================================================================

async function handleMultiAnswerCheck(
  supabase: Awaited<ReturnType<typeof createServiceRoleClient>>,
  sessionId: string,
  gameArtifactId: string,
  itemId: string,
  _participantId: string
): Promise<PuzzleSubmitResponse> {
  // V2: Get config from game_artifacts
  const config = await getArtifactConfig(supabase, gameArtifactId);
  if (!config) {
    return { status: 'error', message: 'Artefakt hittades inte' };
  }

  const { metadata } = config;
  const items = (metadata.items || []) as string[];
  const requiredCount = typeof metadata.requiredCount === 'number' ? metadata.requiredCount : items.length;

  // V2: Get runtime state from session_artifact_state
  const stateData = await getPuzzleState(supabase, sessionId, gameArtifactId);
  const puzzleState = (stateData.puzzleState || {
    checked: [] as string[],
    completed: false,
  }) as {
    checked: string[];
    completed: boolean;
  };

  if (puzzleState.completed) {
    return { status: 'already_solved', message: 'Redan klart!', solved: true };
  }

  // Toggle item
  const itemIndex = puzzleState.checked.indexOf(itemId);
  if (itemIndex >= 0) {
    puzzleState.checked.splice(itemIndex, 1);
  } else {
    puzzleState.checked.push(itemId);
  }

  // Check completion
  if (puzzleState.checked.length >= requiredCount) {
    puzzleState.completed = true;
  }

  // V2: Update state in session_artifact_state
  await updatePuzzleState(supabase, sessionId, gameArtifactId, puzzleState);

  return {
    status: puzzleState.completed ? 'success' : 'fail',
    message: puzzleState.completed
      ? '✅ Alla klara!'
      : `${puzzleState.checked.length}/${requiredCount} klara`,
    solved: puzzleState.completed,
    state: puzzleState,
  };
}

// =============================================================================
// QR Gate Logic (V2)
// =============================================================================

async function handleQRVerify(
  supabase: Awaited<ReturnType<typeof createServiceRoleClient>>,
  sessionId: string,
  gameArtifactId: string,
  scannedValue: string,
  _participantId: string
): Promise<PuzzleSubmitResponse> {
  // V2: Get config from game_artifacts
  const config = await getArtifactConfig(supabase, gameArtifactId);
  if (!config) {
    return { status: 'error', message: 'Artefakt hittades inte' };
  }

  const { metadata } = config;
  const expectedValue = (metadata.expectedValue || '') as string;

  // V2: Get runtime state from session_artifact_state
  const stateData = await getPuzzleState(supabase, sessionId, gameArtifactId);
  const puzzleState = (stateData.puzzleState || {
    verified: false,
    scannedAt: null,
  }) as {
    verified: boolean;
    scannedAt: string | null;
  };

  if (puzzleState.verified) {
    return { status: 'already_solved', message: 'Redan verifierad!', solved: true };
  }

  const isMatch = scannedValue.trim().toLowerCase() === expectedValue.trim().toLowerCase();

  if (isMatch) {
    puzzleState.verified = true;
    puzzleState.scannedAt = new Date().toISOString();

    // V2: Update state in session_artifact_state
    await updatePuzzleState(supabase, sessionId, gameArtifactId, puzzleState);

    return {
      status: 'success',
      message: (metadata.successMessage as string) || '✅ Verifierad!',
      solved: true,
      state: puzzleState,
    };
  }

  return {
    status: 'fail',
    message: '❌ Fel QR-kod. Sök efter rätt kod.',
    solved: false,
    state: puzzleState,
  };
}

// =============================================================================
// POST Handler (V2)
// =============================================================================
// NOTE: artifactId is now game_artifact_id (not session_artifact_id)

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; artifactId: string }> }
) {
  try {
    const { id: sessionId, artifactId: gameArtifactId } = await params;

    // Resolve participant
    const participant = await resolveParticipant(request, sessionId);
    if (!participant) {
      return jsonError('Unauthorized', 401);
    }

    const body = (await request.json()) as PuzzleSubmitRequest;
    const { puzzleType, answer, action, itemId } = body;

    const supabase = await createServiceRoleClient();

    let response: PuzzleSubmitResponse;

    switch (puzzleType) {
      case 'riddle':
        if (!answer) {
          return jsonError('answer required for riddle', 400);
        }
        response = await handleRiddleSubmit(
          supabase,
          sessionId,
          gameArtifactId,
          answer,
          participant.participantId
        );
        break;

      case 'counter':
        if (!action || !['increment', 'decrement'].includes(action)) {
          return jsonError('action must be increment or decrement', 400);
        }
        response = await handleCounterAction(
          supabase,
          sessionId,
          gameArtifactId,
          action as 'increment' | 'decrement',
          participant.participantId
        );
        break;

      case 'multi_answer':
        if (!itemId) {
          return jsonError('itemId required for multi_answer', 400);
        }
        response = await handleMultiAnswerCheck(
          supabase,
          sessionId,
          gameArtifactId,
          itemId,
          participant.participantId
        );
        break;

      case 'qr_gate':
        if (!answer) {
          return jsonError('answer (scanned value) required for qr_gate', 400);
        }
        response = await handleQRVerify(
          supabase,
          sessionId,
          gameArtifactId,
          answer,
          participant.participantId
        );
        break;

      default:
        return jsonError(`Unsupported puzzle type: ${puzzleType}`, 400);
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Puzzle Submit] Error:', error);
    return jsonError('Internal server error', 500);
  }
}

// =============================================================================
// GET Handler - Get puzzle state (V2)
// =============================================================================
// NOTE: artifactId is now game_artifact_id (not session_artifact_id)

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; artifactId: string }> }
) {
  try {
    const { id: sessionId, artifactId: gameArtifactId } = await params;

    const participant = await resolveParticipant(request, sessionId);
    if (!participant) {
      return jsonError('Unauthorized', 401);
    }

    const supabase = await createServiceRoleClient();

    // V2: Get config from game_artifacts
    const config = await getArtifactConfig(supabase, gameArtifactId);
    if (!config) {
      return jsonError('Artifact not found', 404);
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
  } catch (error) {
    console.error('[Puzzle State] Error:', error);
    return jsonError('Internal server error', 500);
  }
}
