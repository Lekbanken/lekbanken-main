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

import { type SignalDirection, type SignalSeverity, resolveSignalDirection, getSignalSeverity } from './signalCatalog';

/**
 * Minimal signal event shape — works with both SessionEvent from
 * session-cockpit.ts and test fixtures.
 *
 * `actorType` / `actorId` / `actorName` are optional so test fixtures
 * and legacy events still match.
 */
export interface SignalEventLike {
  id: string;
  type: string;
  timestamp: string;
  payload?: Record<string, unknown>;
  /** Who emitted this event (host | participant | system | trigger) */
  actorType?: string;
  /** User-id or participant-id of the actor */
  actorId?: string;
  /** Display name of the actor (e.g. "Erik") */
  actorName?: string;
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
 *
 * Fallback chain for channel:
 * 1. payload.channel (server audit events & fixed client emitter)
 * 2. payload.targetName (legacy client events via SessionCockpit mapping)
 * 3. evt.type (absolute fallback)
 *
 * Direction is resolved from actorType on the event (host → outgoing,
 * participant → incoming, trigger/system → system).  Falls back to the
 * signal catalog's `origin` hint when actorType is unavailable.
 *
 * Sender name resolution chain:
 * 1. evt.actorName (V2 session_events row)
 * 2. payload.participant_name (broadcast payload)
 * 3. payload.sender (legacy mapping)
 * 4. undefined (consumer should fall back to i18n generic label)
 */
export function extractSignalMeta(evt: SignalEventLike): {
  channel: string;
  sender: string | undefined;
  message: string | undefined;
  direction: SignalDirection;
  severity: SignalSeverity;
  actorType: string | undefined;
} {
  const channel =
    (evt.payload?.channel as string) ??
    (evt.payload?.targetName as string) ??
    evt.type;

  return {
    channel,
    sender:
      evt.actorName ??
      (evt.payload?.participant_name as string) ??
      (evt.payload?.sender as string),
    message: evt.payload?.message as string | undefined,
    direction: resolveSignalDirection(channel, evt.actorType),
    severity: getSignalSeverity(channel),
    actorType: evt.actorType,
  };
}

// ---------------------------------------------------------------------------
// Signal channel → human-readable label
// ---------------------------------------------------------------------------

/**
 * Canonical lookup table mapping known signal channel names (lower-case)
 * to i18n key suffixes under `play.directorDrawer.signalInbox.channels.*`.
 *
 * Both DirectorModePanel presets (pause / hint / attention / flash) and
 * SignalPanel presets (READY / HINT / ATTENTION / PAUSE / FOUND / SOS) are
 * covered.  Unknown/custom channels fall back to the raw name.
 */
const CHANNEL_KEY_MAP: Record<string, string> = {
  pause: 'pause',
  hint: 'hint',
  attention: 'attention',
  flash: 'flash',
  ready: 'ready',
  found: 'found',
  sos: 'sos',
};

/**
 * Return a human-readable label for a signal channel.
 *
 * @param channel  Raw channel string from the event (e.g. "pause", "HINT")
 * @param tInbox   Translation function scoped to `play.directorDrawer.signalInbox`
 *                 — expects keys like `channels.pause`, `channels.hint`, etc.
 *                 If omitted, returns a capitalised fallback.
 */
export function getSignalChannelLabel(
  channel: string,
  tInbox?: (key: string) => string,
): string {
  const key = CHANNEL_KEY_MAP[channel.toLowerCase()];
  if (key && tInbox) {
    return tInbox(`channels.${key}`);
  }
  // Fallback: capitalise first letter, rest lower-case
  return channel.charAt(0).toUpperCase() + channel.slice(1).toLowerCase();
}

// ---------------------------------------------------------------------------
// Direction-aware label (for SignalInbox / SignalStrip)
// ---------------------------------------------------------------------------

/**
 * Build a direction-aware display string for a signal event.
 *
 * Examples:
 *  - incoming  → "SOS från Erik"  /  "SOS från deltagare"
 *  - outgoing  → "Du skickade Paus"
 *  - system    → "Paus (system)"
 *
 * @param channelLabel  Already-translated channel label (e.g. "Paus")
 * @param direction     resolved direction from extractSignalMeta
 * @param sender        actor display name (may be undefined)
 * @param tInbox        Translation fn scoped to signalInbox
 * @param participantCount  Optional — if present and direction=outgoing, shows "→ N deltagare"
 */
export function getSignalDirectionLabel(
  channelLabel: string,
  direction: SignalDirection,
  sender: string | undefined,
  tInbox: (key: string, values?: Record<string, string | number>) => string,
  participantCount?: number,
): string {
  switch (direction) {
    case 'incoming':
      return sender
        ? tInbox('direction.incoming', { channel: channelLabel, sender })
        : tInbox('direction.incomingUnknown', { channel: channelLabel });
    case 'outgoing':
      if (participantCount != null && participantCount > 0) {
        return tInbox('direction.outgoingCount', { channel: channelLabel, count: participantCount });
      }
      return tInbox('direction.outgoing', { channel: channelLabel });
    case 'system':
    default:
      return tInbox('direction.system', { channel: channelLabel });
  }
}
