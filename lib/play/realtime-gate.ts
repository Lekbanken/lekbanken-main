/**
 * Realtime Gate — Single Source of Truth (SSoT)
 *
 * Centralised predicate that answers: "Should realtime features
 * (WS subscriptions, broadcast channels, presence, polling) be
 * enabled for this session?"
 *
 * Architecture rule (Johan L QA 2026-02-21):
 *   Realtime MUST only be active when the session has been
 *   explicitly started by the host. Draft sessions and
 *   ended sessions MUST NOT open channels.
 *
 * Usage:
 *   import { shouldEnableRealtime } from '@/lib/play/realtime-gate';
 *
 *   const enabled = shouldEnableRealtime({ status, sessionId });
 *   useLiveSession({ sessionId, enabled });
 *
 * Status mapping:
 *   draft   → false  (no participants, no realtime)
 *   lobby   → true   (participants joining, need realtime)
 *   active  → true   (live gameplay)
 *   paused  → true   (still connected, awaiting resume)
 *   locked  → true   (connected but locked)
 *   ended   → false  (session over, teardown channels)
 *
 * ─── Push-vs-Poll Ownership Contract (2026-03-13) ───────────────────
 *
 * This contract defines which data is authoritative via broadcast (push)
 * and which requires polling. The goal: no UI element should be updated
 * by both push AND poll for the same data.
 *
 * PUSH (authoritative via Supabase broadcast on `play:{sessionId}`):
 *   - Session status transitions   → state_change event
 *   - Step/phase navigation        → state_change event
 *   - Timer start/pause/resume     → timer_update event
 *   - Board message changes        → board_update event
 *   - Artifact reveal/highlight    → artifact_update event
 *   - Decision lifecycle           → decision_update event
 *   - Outcome lifecycle            → outcome_update event
 *   - Trigger fire/disable/rearm   → trigger_update event
 *   - Signal send                  → signal_received event
 *   - Time bank changes            → time_bank_changed event
 *   - Kick/block/approve           → participants_changed event
 *   - Readiness toggle             → participants_changed event
 *   - Role assignments             → assignments_changed event
 *   - Puzzle state (client-side)   → puzzle_update event
 *
 * POLL (authoritative, no push equivalent):
 *   - Participant list (full data) → useSessionState every 3s
 *   - Participant presence/online  → derived from last_seen_at via poll
 *   - Chat messages                → useSessionChat (no realtime channel)
 *   - Artifact state (external)    → useSessionState every 15s
 *
 * POLL AS FALLBACK (push is primary, poll catches missed events):
 *   - Session runtime state        → useSessionState polls as reconciliation
 *     (step, phase, status, timer)   after realtime reconnect only
 *
 * NOT POLLED, NOT PUSHED (loaded once or on-demand):
 *   - Game definition / snapshot   → loaded at session start
 *   - Role definitions             → loaded at session start
 *   - Session metadata             → loaded at session start
 *
 * Scaling note: When consolidating host polling (scaling-analysis.md §90-day),
 * keep push items push-only and remove redundant poll-reads for pushed data.
 * Chat is the candidate for push migration (currently poll-only).
 * ─────────────────────────────────────────────────────────────────────
 */

import type { SessionCockpitStatus } from '@/types/session-cockpit';

// Statuses where realtime channels should be enabled
const REALTIME_STATUSES: ReadonlySet<SessionCockpitStatus> = new Set([
  'lobby',
  'active',
  'paused',
  'locked',
]);

export interface RealtimeGateInput {
  /** Current session status */
  status: SessionCockpitStatus;
  /** Session ID — must be present for any realtime */
  sessionId?: string | null;
}

/**
 * Determines whether realtime features should be enabled.
 *
 * Returns `true` only when:
 * - `sessionId` is a non-empty string
 * - `status` is one of: lobby, active, paused, locked
 *
 * Returns `false` for:
 * - draft (no server resources)
 * - ended (teardown)
 * - missing sessionId
 */
export function shouldEnableRealtime({ status, sessionId }: RealtimeGateInput): boolean {
  if (!sessionId) return false;
  return REALTIME_STATUSES.has(status);
}

/**
 * Determines whether polling should be enabled, and at what rate.
 *
 * - draft:  polling at 5× slower interval, participant polling skipped
 * - ended:  no polling
 * - other:  full polling
 */
export function getPollingConfig({
  status,
  sessionId,
  basePollInterval = 3000,
}: RealtimeGateInput & { basePollInterval?: number }): {
  enabled: boolean;
  interval: number;
  skipParticipants: boolean;
} {
  if (!sessionId) return { enabled: false, interval: basePollInterval, skipParticipants: true };

  switch (status) {
    case 'draft':
      return { enabled: true, interval: basePollInterval * 5, skipParticipants: true };
    case 'ended':
      return { enabled: false, interval: basePollInterval, skipParticipants: true };
    default:
      return { enabled: true, interval: basePollInterval, skipParticipants: false };
  }
}
