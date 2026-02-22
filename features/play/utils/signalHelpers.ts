/**
 * Signal Helpers — Shared signal-event utilities
 *
 * Single source of truth for signal-event filtering, sorting, and selection.
 * Used by both DirectorModePanel (SignalStrip, SignalInbox, badge count)
 * and regression tests.
 *
 * Design rules:
 * - Sort by timestamp desc (deterministic across reconnects)
 * - Filter by type.includes('signal') (matches signal_sent, signal_received, etc.)
 * - handledSignalIds is a Set<string> of event IDs (not signal IDs)
 */

/**
 * Minimal signal event shape — works with both SessionEvent from
 * session-cockpit.ts and test fixtures.
 */
export interface SignalEventLike {
  id: string;
  type: string;
  timestamp: string;
  payload?: Record<string, unknown>;
}

/**
 * Filter and sort signal events deterministically by timestamp desc.
 * Ensures stable ordering even if the events array is reordered on reconnect.
 */
export function sortedSignalEvents<T extends SignalEventLike>(events: T[]): T[] {
  return events
    .filter((e) => e.type.includes('signal'))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

/**
 * Select the latest unhandled signal event (newest-first, deterministic).
 * Returns undefined if all signals are handled or no signal events exist.
 */
export function selectLatestUnhandledSignal<T extends SignalEventLike>(
  events: T[],
  handledSignalIds: Set<string>,
): T | undefined {
  return sortedSignalEvents(events).find((e) => !handledSignalIds.has(e.id));
}

/**
 * Count the number of unhandled signal events.
 */
export function countUnhandledSignals<T extends SignalEventLike>(
  events: T[],
  handledSignalIds: Set<string>,
): number {
  return sortedSignalEvents(events).filter((e) => !handledSignalIds.has(e.id)).length;
}

/**
 * Extract display metadata from a signal event's payload.
 */
export function extractSignalMeta(evt: SignalEventLike): {
  channel: string;
  sender: string | undefined;
  message: string | undefined;
} {
  return {
    channel: (evt.payload?.channel as string) ?? evt.type,
    sender: (evt.payload?.participant_name as string) ?? (evt.payload?.sender as string),
    message: evt.payload?.message as string | undefined,
  };
}
