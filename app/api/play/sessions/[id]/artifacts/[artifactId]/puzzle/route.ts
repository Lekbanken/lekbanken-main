import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import type { Json } from '@/types/supabase';
import {
  normalizeRiddleAnswer,
  checkRiddleAnswer,
  type RiddleNormalizeMode,
} from '@/types/puzzle-modules';

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

async function resolveParticipant(
  sessionId: string,
  request: Request
): Promise<{ participantId: string; participantName: string } | null> {
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
  if (participant.token_expires_at && new Date(participant.token_expires_at) < new Date()) {
    return null;
  }

  return {
    participantId: participant.id,
    participantName: participant.display_name,
  };
}

// =============================================================================
// Riddle Logic
// =============================================================================

async function handleRiddleSubmit(
  supabase: Awaited<ReturnType<typeof createServiceRoleClient>>,
  sessionId: string,
  artifactId: string,
  answer: string,
  participantId: string
): Promise<PuzzleSubmitResponse> {
  // Get session artifact with metadata
  const { data: artifact, error: artifactError } = await supabase
    .from('session_artifacts')
    .select('id, metadata')
    .eq('id', artifactId)
    .eq('session_id', sessionId)
    .single();

  if (artifactError || !artifact) {
    return { status: 'error', message: 'Artefakt hittades inte' };
  }

  const metadata = (artifact.metadata || {}) as Record<string, unknown>;
  const correctAnswers = (metadata.correctAnswers || []) as string[];
  const normalizeMode = (metadata.normalizeMode || 'fuzzy') as RiddleNormalizeMode;
  const maxAttempts = typeof metadata.maxAttempts === 'number' ? metadata.maxAttempts : null;

  // Get or initialize puzzle state
  const puzzleState = (metadata.puzzleState || {
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

    // Update artifact metadata
    await supabase
      .from('session_artifacts')
      .update({
        metadata: { ...metadata, puzzleState } as unknown as Json,
      })
      .eq('id', artifactId);

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

  // Update artifact metadata
  await supabase
    .from('session_artifacts')
    .update({
      metadata: { ...metadata, puzzleState } as unknown as Json,
    })
    .eq('id', artifactId);

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

async function handleCounterAction(
  supabase: Awaited<ReturnType<typeof createServiceRoleClient>>,
  sessionId: string,
  artifactId: string,
  action: 'increment' | 'decrement',
  participantId: string
): Promise<PuzzleSubmitResponse> {
  const { data: artifact, error: artifactError } = await supabase
    .from('session_artifacts')
    .select('id, metadata')
    .eq('id', artifactId)
    .eq('session_id', sessionId)
    .single();

  if (artifactError || !artifact) {
    return { status: 'error', message: 'Artefakt hittades inte' };
  }

  const metadata = (artifact.metadata || {}) as Record<string, unknown>;
  const target = typeof metadata.target === 'number' ? metadata.target : null;
  const step = typeof metadata.step === 'number' ? metadata.step : 1;
  const initialValue = typeof metadata.initialValue === 'number' ? metadata.initialValue : 0;

  // Get or initialize state
  const puzzleState = (metadata.puzzleState || {
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

  // Update artifact
  await supabase
    .from('session_artifacts')
    .update({
      metadata: { ...metadata, puzzleState } as unknown as Json,
    })
    .eq('id', artifactId);

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
// Multi-Answer Logic
// =============================================================================

async function handleMultiAnswerCheck(
  supabase: Awaited<ReturnType<typeof createServiceRoleClient>>,
  sessionId: string,
  artifactId: string,
  itemId: string,
  _participantId: string
): Promise<PuzzleSubmitResponse> {
  const { data: artifact, error: artifactError } = await supabase
    .from('session_artifacts')
    .select('id, metadata')
    .eq('id', artifactId)
    .eq('session_id', sessionId)
    .single();

  if (artifactError || !artifact) {
    return { status: 'error', message: 'Artefakt hittades inte' };
  }

  const metadata = (artifact.metadata || {}) as Record<string, unknown>;
  const items = (metadata.items || []) as string[];
  const requiredCount = typeof metadata.requiredCount === 'number' ? metadata.requiredCount : items.length;

  // Get or initialize state
  const puzzleState = (metadata.puzzleState || {
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

  // Update artifact
  await supabase
    .from('session_artifacts')
    .update({
      metadata: { ...metadata, puzzleState } as unknown as Json,
    })
    .eq('id', artifactId);

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
// QR Gate Logic
// =============================================================================

async function handleQRVerify(
  supabase: Awaited<ReturnType<typeof createServiceRoleClient>>,
  sessionId: string,
  artifactId: string,
  scannedValue: string,
  _participantId: string
): Promise<PuzzleSubmitResponse> {
  const { data: artifact, error: artifactError } = await supabase
    .from('session_artifacts')
    .select('id, metadata')
    .eq('id', artifactId)
    .eq('session_id', sessionId)
    .single();

  if (artifactError || !artifact) {
    return { status: 'error', message: 'Artefakt hittades inte' };
  }

  const metadata = (artifact.metadata || {}) as Record<string, unknown>;
  const expectedValue = (metadata.expectedValue || '') as string;

  const puzzleState = (metadata.puzzleState || {
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

    await supabase
      .from('session_artifacts')
      .update({
        metadata: { ...metadata, puzzleState } as unknown as Json,
      })
      .eq('id', artifactId);

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
// POST Handler
// =============================================================================

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; artifactId: string }> }
) {
  try {
    const { id: sessionId, artifactId } = await params;

    // Resolve participant
    const participant = await resolveParticipant(sessionId, request);
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
          artifactId,
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
          artifactId,
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
          artifactId,
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
          artifactId,
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
// GET Handler - Get puzzle state
// =============================================================================

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; artifactId: string }> }
) {
  try {
    const { id: sessionId, artifactId } = await params;

    const participant = await resolveParticipant(sessionId, request);
    if (!participant) {
      return jsonError('Unauthorized', 401);
    }

    const supabase = await createServiceRoleClient();

    const { data: artifact, error } = await supabase
      .from('session_artifacts')
      .select('id, artifact_type, metadata')
      .eq('id', artifactId)
      .eq('session_id', sessionId)
      .single();

    if (error || !artifact) {
      return jsonError('Artifact not found', 404);
    }

    const metadata = (artifact.metadata || {}) as Record<string, unknown>;
    const puzzleState = metadata.puzzleState || null;

    // Return sanitized state (no answers/solutions)
    return NextResponse.json({
      artifactId: artifact.id,
      artifactType: artifact.artifact_type,
      state: puzzleState,
    });
  } catch (error) {
    console.error('[Puzzle State] Error:', error);
    return jsonError('Internal server error', 500);
  }
}
