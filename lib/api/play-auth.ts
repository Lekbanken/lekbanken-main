/**
 * Shared auth helpers for play / participant routes.
 *
 * Two patterns:
 *   1. resolveSessionViewer  — dual: participant-token OR host-cookie
 *   2. resolveParticipant    — participant-token only (header)
 *
 * Both enforce status (blocked/kicked → reject) AND token_expires_at.
 * This replaces ~18 inline lookups scattered across play routes.
 */

import { createServerRlsClient, createServiceRoleClient } from '@/lib/supabase/server'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Participant statuses that block all API access.
 * Keep this in sync with any new status values added to the DB enum.
 * Used by isParticipantValid() and can be imported by routes that do
 * inline checks (me/role, heartbeat, etc.).
 */
export const REJECTED_PARTICIPANT_STATUSES: ReadonlySet<string> = new Set([
  'blocked',
  'kicked',
])

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Viewer =
  | { type: 'host'; userId: string }
  | { type: 'participant'; participantId: string; participantName: string }

export interface ResolvedParticipant {
  participantId: string
  displayName: string
  sessionId: string
  role: string
  status: string
}

// ---------------------------------------------------------------------------
// Internal: validate a participant row (status + expiry)
// ---------------------------------------------------------------------------

interface ParticipantRow {
  id: string
  display_name: string
  session_id: string
  status: string
  role: string
  token_expires_at: string | null
}

function isParticipantValid(p: ParticipantRow): boolean {
  if (REJECTED_PARTICIPANT_STATUSES.has(p.status)) return false
  if (p.token_expires_at && new Date(p.token_expires_at) < new Date()) return false
  return true
}

// ---------------------------------------------------------------------------
// resolveSessionViewer — dual: participant-token OR host cookie auth
// ---------------------------------------------------------------------------

/**
 * Resolve the caller as either a participant (via `x-participant-token` header)
 * or the session host (via cookie-based auth).
 *
 * Returns `null` when neither path succeeds — the caller should return 401.
 */
export async function resolveSessionViewer(
  sessionId: string,
  request: Request,
): Promise<Viewer | null> {
  // Path 1: participant token
  const token = request.headers.get('x-participant-token')
  if (token) {
    const supabase = await createServiceRoleClient()
    const { data: participant } = await supabase
      .from('participants')
      .select('id, display_name, session_id, status, role, token_expires_at')
      .eq('participant_token', token)
      .eq('session_id', sessionId)
      .single()

    if (!participant || !isParticipantValid(participant as ParticipantRow)) return null

    return {
      type: 'participant',
      participantId: participant.id,
      participantName: participant.display_name,
    }
  }

  // Path 2: logged-in host
  const supabase = await createServerRlsClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const service = await createServiceRoleClient()
  const { data: session } = await service
    .from('participant_sessions')
    .select('host_user_id')
    .eq('id', sessionId)
    .single()

  if (!session || session.host_user_id !== user.id) return null

  return { type: 'host', userId: user.id }
}

// ---------------------------------------------------------------------------
// resolveParticipant — participant-token only (from header)
// ---------------------------------------------------------------------------

/**
 * Resolve a participant from the `x-participant-token` header.
 * Validates status (blocked/kicked) and token expiry.
 *
 * @param sessionId — when provided, also verifies the participant belongs to
 *   this session. Omit when the route doesn't have sessionId in the URL
 *   (e.g. `/api/play/me`).
 */
export async function resolveParticipant(
  request: Request,
  sessionId?: string,
): Promise<ResolvedParticipant | null> {
  const token = request.headers.get('x-participant-token')
  if (!token) return null

  const supabase = await createServiceRoleClient()

  let query = supabase
    .from('participants')
    .select('id, display_name, session_id, status, role, token_expires_at')
    .eq('participant_token', token)

  if (sessionId) {
    query = query.eq('session_id', sessionId)
  }

  const { data: participant } = await query.single()

  if (!participant || !isParticipantValid(participant as ParticipantRow)) return null

  return {
    participantId: participant.id,
    displayName: participant.display_name,
    sessionId: participant.session_id,
    role: participant.role ?? 'player',
    status: participant.status ?? 'active',
  }
}
