/**
 * Play Domain API Client
 * 
 * Functions for interacting with the Play domain endpoints.
 * Separated from Planner API to maintain domain boundaries.
 */

import type { Run, RunProgress, StartRunResponse, FetchRunResponse, DashboardRunRow } from './types'
import type { TimerState, BoardState } from '@/types/play-runtime'
import type { SessionCommandType } from '@/lib/play/session-command'

type ApiError = {
  code: string
  message: string
}

type ApiResult<T> = 
  | { success: true; data: T }
  | { success: false; error: ApiError }

/**
 * Start a new run from a plan's published version.
 * Server generates steps from version blocks.
 */
export async function startRun(planId: string): Promise<ApiResult<StartRunResponse>> {
  try {
    const res = await fetch(`/api/play/${planId}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })

    const json = await res.json()

    if (!res.ok) {
      return {
        success: false,
        error: json.error || { code: 'UNKNOWN', message: 'Failed to start run' },
      }
    }

    return { success: true, data: json }
  } catch (err) {
    console.error('[play/api] startRun error', err)
    return {
      success: false,
      error: { code: 'NETWORK_ERROR', message: 'Network error' },
    }
  }
}

/**
 * Fetch an existing run by ID.
 */
export async function fetchRun(runId: string): Promise<ApiResult<FetchRunResponse>> {
  try {
    const res = await fetch(`/api/play/runs/${runId}`)
    const json = await res.json()

    if (!res.ok) {
      return {
        success: false,
        error: json.error || { code: 'NOT_FOUND', message: 'Run not found' },
      }
    }

    return { success: true, data: json }
  } catch (err) {
    console.error('[play/api] fetchRun error', err)
    return {
      success: false,
      error: { code: 'NETWORK_ERROR', message: 'Network error' },
    }
  }
}

/**
 * Update run progress (current step, timer state).
 * Debounced on client side.
 */
export async function updateRunProgress(
  runId: string,
  progress: Partial<RunProgress>
): Promise<ApiResult<{ progress: RunProgress }>> {
  try {
    const res = await fetch(`/api/play/runs/${runId}/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(progress),
    })

    const json = await res.json()

    if (!res.ok) {
      return {
        success: false,
        error: json.error || { code: 'UPDATE_FAILED', message: 'Failed to update progress' },
      }
    }

    return { success: true, data: json }
  } catch (err) {
    console.error('[play/api] updateRunProgress error', err)
    return {
      success: false,
      error: { code: 'NETWORK_ERROR', message: 'Network error' },
    }
  }
}

/**
 * Complete a run (mark as finished).
 */
export async function completeRun(runId: string): Promise<ApiResult<{ run: Run }>> {
  try {
    const res = await fetch(`/api/play/runs/${runId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })

    const json = await res.json()

    if (!res.ok) {
      return {
        success: false,
        error: json.error || { code: 'COMPLETE_FAILED', message: 'Failed to complete run' },
      }
    }

    return { success: true, data: json }
  } catch (err) {
    console.error('[play/api] completeRun error', err)
    return {
      success: false,
      error: { code: 'NETWORK_ERROR', message: 'Network error' },
    }
  }
}

/**
 * Abandon a run (mark as abandoned, can resume later).
 */
export async function abandonRun(runId: string): Promise<ApiResult<{ run: Run }>> {
  try {
    const res = await fetch(`/api/play/runs/${runId}/abandon`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })

    const json = await res.json()

    if (!res.ok) {
      return {
        success: false,
        error: json.error || { code: 'ABANDON_FAILED', message: 'Failed to abandon run' },
      }
    }

    return { success: true, data: json }
  } catch (err) {
    console.error('[play/api] abandonRun error', err)
    return {
      success: false,
      error: { code: 'NETWORK_ERROR', message: 'Network error' },
    }
  }
}

// ============================================
// Legacy API compatibility (for gradual migration)
// ============================================

type LegacyPlayView = {
  planId: string
  name: string
  totalDurationMinutes?: number | null
  blocks: Array<{
    id: string
    type: string
    title: string
    durationMinutes?: number | null
    notes?: string | null
    game?: {
      id: string
      title: string
      summary?: string | null
      materials?: string[] | null
      steps: Array<{
        title: string
        description?: string | null
        durationMinutes?: number | null
      }>
    } | null
  }>
}

/**
 * Fetch legacy play view (for backward compatibility).
 * @deprecated Use startRun() instead for new code.
 */
export async function fetchLegacyPlayView(planId: string): Promise<ApiResult<{ play: LegacyPlayView }>> {
  try {
    const res = await fetch(`/api/plans/${planId}/play`)
    const json = await res.json()

    if (!res.ok) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: json.error || 'Not found' },
      }
    }

    return { success: true, data: json }
  } catch (err) {
    console.error('[play/api] fetchLegacyPlayView error', err)
    return {
      success: false,
      error: { code: 'NETWORK_ERROR', message: 'Network error' },
    }
  }
}

// ============================================
// Participant primitives (re-export for legacy imports)
// ============================================

export {
  getParticipantArtifacts,
  getParticipantDecisions,
  castParticipantVote,
  getParticipantDecisionResults,
  submitKeypadCode,
} from './api/primitives-api'

export type {
  ParticipantSessionArtifact,
  ParticipantSessionArtifactVariant,
  ParticipantDecision,
  DecisionOption,
  DecisionResultsResponse,
  KeypadState,
  SanitizedKeypadMetadata,
  KeypadAttemptResponse,
} from './api/primitives-api'

// ============================================
// Session API (host/participant play sessions)
// ============================================

export {
  getHostPlaySession,
  getParticipantPlaySession,
  updatePlaySessionState,
} from './api/session-api'

export type { PlaySessionData, ParticipantPlayData } from './api/session-api'

// ============================================
// Active Runs (for Resume feature)
// ============================================

export type ActiveRun = {
  id: string
  planId: string
  planVersionId: string
  status: 'not_started' | 'in_progress' | 'completed' | 'abandoned'
  currentStepIndex: number
  totalSteps: number
  startedAt: string
}

/**
 * Fetch the current user's active (in_progress) runs.
 * Used by Plan list / Calendar to show "Fortsätt" button.
 */
export async function fetchActiveRuns(): Promise<ActiveRun[]> {
  try {
    const res = await fetch('/api/play/runs/active')
    if (!res.ok) return []
    const json = await res.json() as { runs: ActiveRun[] }
    return json.runs ?? []
  } catch {
    return []
  }
}

/**
 * Send a heartbeat for an active run (MS4.8 Run Safety).
 * Updates `last_heartbeat_at` to prevent the run from being marked as stale.
 */
export async function sendRunHeartbeat(runId: string): Promise<void> {
  try {
    await fetch(`/api/play/runs/${runId}/heartbeat`, { method: 'POST' })
  } catch {
    // Heartbeat failures are non-critical — silently swallow
  }
}

// ============================================
// Run Session API (MS6)
// ============================================

export type RunSessionData = {
  id: string
  runId: string
  stepIndex: number
  sessionId: string | null
  status: string
  participantSession: {
    id: string
    sessionCode: string
    displayName: string
    status: string
    participantCount: number
    gameId: string | null
  } | null
}

/**
 * Fetch the run_session for a specific step (if any).
 */
export async function fetchRunSession(
  runId: string,
  stepIndex: number
): Promise<RunSessionData | null> {
  try {
    const res = await fetch(`/api/play/runs/${runId}/sessions?stepIndex=${stepIndex}`)
    if (!res.ok) return null
    const json = await res.json() as { runSession: RunSessionData | null }
    return json.runSession ?? null
  } catch {
    return null
  }
}

/**
 * Create a participant session for a run step (session_game block).
 * Creates participant_session + links via run_sessions.
 */
export async function createRunSession(
  runId: string,
  stepIndex: number,
  gameId: string,
  displayName?: string
): Promise<ApiResult<{ runSession: RunSessionData; alreadyExists?: boolean }>> {
  try {
    const res = await fetch(`/api/play/runs/${runId}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stepIndex, gameId, displayName }),
    })
    const json = await res.json()
    if (!res.ok) {
      return {
        success: false,
        error: json.error || { code: 'UNKNOWN', message: 'Failed to create session' },
      }
    }
    return { success: true, data: json }
  } catch (err) {
    console.error('[play/api] createRunSession error', err)
    return {
      success: false,
      error: { code: 'NETWORK_ERROR', message: 'Network error' },
    }
  }
}

// ============================================
// Session State Polling API (MS8)
// ============================================

/** Lightweight session state returned by GET /api/play/sessions/[id]/state */
export type SessionStateData = {
  id: string
  status: string
  started_at: string | null
  current_step_index: number
  current_phase_index: number
  timer_state: TimerState | null
  board_state: BoardState | null
  participant_count: number
}

/**
 * Fetch lightweight session state for polling (no auth required).
 * Used by RunSessionCockpit to poll participant count + status.
 */
export async function fetchSessionState(
  sessionId: string
): Promise<SessionStateData | null> {
  try {
    const res = await fetch(`/api/play/sessions/${sessionId}/state`)
    if (!res.ok) return null
    const json = await res.json() as { session: SessionStateData }
    return json.session ?? null
  } catch {
    return null
  }
}

// ============================================
// Dashboard API (MS7)
// ============================================

/**
 * Fetch dashboard rows — runs enriched with session data.
 * @param scope 'active' (default) = only in_progress, non-stale. 'all' = everything.
 */
export async function fetchRunsDashboard(
  scope: 'active' | 'all' = 'active'
): Promise<DashboardRunRow[]> {
  try {
    const res = await fetch(`/api/play/runs/dashboard?scope=${scope}`)
    if (!res.ok) return []
    const json = (await res.json()) as { rows: DashboardRunRow[] }
    return json.rows ?? []
  } catch {
    return []
  }
}

/**
 * End a run session (participant_session + run_sessions status).
 * Used by the dashboard "Avsluta" button.
 */
export async function endRunSession(
  runId: string,
  stepIndex: number
): Promise<ApiResult<{ runSessionStatus: string; participantSessionStatus: string | null }>> {
  try {
    const res = await fetch(`/api/play/runs/${runId}/sessions/end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stepIndex }),
    })

    const json = await res.json()

    if (!res.ok) {
      return {
        success: false,
        error: json.error || { code: 'END_FAILED', message: 'Failed to end session' },
      }
    }

    return { success: true, data: json }
  } catch (err) {
    console.error('[play/api] endRunSession error', err)
    return {
      success: false,
      error: { code: 'NETWORK_ERROR', message: 'Network error' },
    }
  }
}

// =============================================================================
// Session Command Pipeline (MS11)
// =============================================================================

/**
 * Stable per-tab client ID for idempotent commands.
 * Survives re-renders but not page reloads.
 */
const CLIENT_ID =
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

/** Per-tab monotonic sequence counter */
let clientSeq = 0;

export interface CommandResponse {
  ok: boolean;
  commandId?: string;
  duplicate?: boolean;
  state?: {
    id: string;
    status: string;
    current_step_index: number;
    current_phase_index: number;
    timer_state: unknown;
    board_state: unknown;
  } | null;
  error?: string;
}

/**
 * Send an idempotent command through the unified command pipeline.
 *
 * Every call auto-increments the client_seq so that retries on the same
 * command instance are deduplicated server-side.
 */
export async function sendSessionCommand(
  sessionId: string,
  commandType: SessionCommandType,
  payload: Record<string, unknown> = {},
): Promise<CommandResponse> {
  const seq = ++clientSeq;

  try {
    const res = await fetch(`/api/play/sessions/${sessionId}/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        command_type: commandType,
        payload,
        client_id: CLIENT_ID,
        client_seq: seq,
      }),
    });

    const json = await res.json();

    if (!res.ok) {
      return { ok: false, error: json.error ?? 'Command failed' };
    }

    return {
      ok: true,
      commandId: json.commandId,
      duplicate: json.duplicate ?? false,
      state: json.state ?? null,
    };
  } catch (err) {
    console.error('[play/api] sendSessionCommand error', err);
    return { ok: false, error: 'Network error' };
  }
}
