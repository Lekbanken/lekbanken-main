/**
 * play-types.ts — Canonical play runtime types + shared status config
 *
 * SSoT for ConnectionState, SessionStatus, and the mapping function that
 * turns them into visual config (tint class, dot class, label key, etc.).
 *
 * Rule: every component that needs these types imports from HERE.
 * No component file should re-declare these unions.
 */

// =============================================================================
// Types
// =============================================================================

/** Network connection quality tier */
export type ConnectionState = 'connected' | 'degraded' | 'offline';

/**
 * Session lifecycle status.
 *
 * Matches SessionCockpitStatus in types/session-cockpit.ts (kept in sync
 * by the regression test in group 38).
 */
export type SessionStatus =
  | 'draft'
  | 'lobby'
  | 'active'
  | 'paused'
  | 'locked'
  | 'ended';

// =============================================================================
// Status config mapping — SSoT for colour / tint / animation
// =============================================================================

export interface SessionStatusConfig {
  /** CSS class for header background tint (e.g. 'bg-green-500/10') */
  bgTintClass: string;
  /** CSS class for text colour */
  textClass: string;
  /** CSS class for indicator dot */
  dotClass: string;
  /** Whether the dot should pulse-animate */
  animate: boolean;
}

const STATUS_CONFIG: Record<SessionStatus, SessionStatusConfig> = {
  draft: {
    bgTintClass: 'bg-slate-500/5',
    textClass: 'text-slate-500 dark:text-slate-400',
    dotClass: 'bg-slate-400',
    animate: false,
  },
  lobby: {
    bgTintClass: 'bg-blue-500/5',
    textClass: 'text-blue-600 dark:text-blue-400',
    dotClass: 'bg-blue-500',
    animate: false,
  },
  active: {
    bgTintClass: 'bg-green-500/10',
    textClass: 'text-green-600 dark:text-green-400',
    dotClass: 'bg-green-500',
    animate: true,
  },
  paused: {
    bgTintClass: 'bg-amber-500/10',
    textClass: 'text-amber-600 dark:text-amber-400',
    dotClass: 'bg-amber-500',
    animate: false,
  },
  locked: {
    bgTintClass: 'bg-red-500/5',
    textClass: 'text-red-500 dark:text-red-400',
    dotClass: 'bg-red-500',
    animate: false,
  },
  ended: {
    bgTintClass: 'bg-gray-500/10',
    textClass: 'text-gray-500 dark:text-gray-400',
    dotClass: 'bg-gray-500',
    animate: false,
  },
};

/**
 * Pure function — returns visual config for a given session status.
 * No i18n dependency; callers resolve labels themselves.
 */
export function getSessionStatusConfig(status: SessionStatus): SessionStatusConfig {
  return STATUS_CONFIG[status];
}
