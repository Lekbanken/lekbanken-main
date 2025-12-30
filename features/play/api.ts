/**
 * Play Domain API Client
 * 
 * Functions for interacting with the Play domain endpoints.
 * Separated from Planner API to maintain domain boundaries.
 */

import type { Run, RunProgress, StartRunResponse, FetchRunResponse } from './types'

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
