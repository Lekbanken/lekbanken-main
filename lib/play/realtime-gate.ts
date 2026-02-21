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
