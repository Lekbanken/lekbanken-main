import { NextResponse } from 'next/server';

/**
 * Session status guard — M2 implementation.
 *
 * Central policy table that declares which session statuses each play mutation
 * type is allowed in. Routes reference this table instead of maintaining ad-hoc
 * status lists.
 */

export type SessionStatus =
  | 'draft'
  | 'lobby'
  | 'active'
  | 'paused'
  | 'locked'
  | 'ended'
  | 'archived'
  | 'cancelled';

export const PLAY_MUTATION_STATUS_POLICY = {
  'time-bank':       ['active', 'paused'],
  'signals':         ['lobby', 'active', 'paused'],
  'outcome':         ['active', 'paused'],
  'decisions':       ['lobby', 'active', 'paused'],
  'decision-update': ['active', 'paused'],
  'assignments':     ['lobby', 'active', 'paused'],
  'artifacts-state': ['active', 'paused'],
  'triggers':        ['active', 'paused'],
  'kick-block':      ['lobby', 'active', 'paused'],
  'vote':            ['active', 'paused'],
  'puzzle':          ['active', 'paused'],
  'keypad':          ['active', 'paused'],
  'chat':            ['lobby', 'active', 'paused'],
  'ready':           ['lobby', 'active'],
  'roles':           ['lobby', 'active', 'paused'],
  'secrets':         ['lobby', 'active', 'paused'],
  'state':           ['active', 'paused'],
  'role-reveal':     ['lobby', 'active', 'paused'],
  'progress-update': ['active', 'paused'],
} as const satisfies Record<string, readonly SessionStatus[]>;

export type PlayMutationType = keyof typeof PLAY_MUTATION_STATUS_POLICY;

/**
 * Check if a mutation is allowed for the current session status.
 * Returns null if allowed, or a 409 NextResponse with diagnostic info if not.
 */
export function assertSessionStatus(
  currentStatus: string,
  mutationType: PlayMutationType,
): NextResponse | null {
  const allowed = PLAY_MUTATION_STATUS_POLICY[mutationType];
  if ((allowed as readonly string[]).includes(currentStatus)) {
    return null;
  }
  return NextResponse.json(
    {
      error: 'Operation not allowed in current session status',
      currentStatus,
      allowedStatuses: allowed,
    },
    { status: 409 },
  );
}
