/**
 * Signal Catalog — Single Source of Truth for signal type metadata
 *
 * Every known signal channel is defined here ONCE.
 * UI components (SignalInbox, SignalStrip, ParticipantToast, DirectorPresets,
 * TriggerUI) should resolve visual properties through this catalog instead
 * of scattering magic strings.
 *
 * Fields:
 *   id          – canonical lower-case key (matches CHANNEL_KEY_MAP)
 *   i18nKey     – suffix under `play.directorDrawer.signalInbox.channels.*`
 *   icon        – Heroicon component name (resolved by consumer)
 *   severity    – info | warn | urgent → drives colour & haptic weight
 *   origin      – who typically sends this signal (director or participant)
 *   defaultDurationMs – how long the participant toast/overlay should show
 *   presentation – how participants should experience the signal
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SignalSeverity = 'info' | 'warn' | 'urgent';
export type SignalOrigin = 'director' | 'participant' | 'both';
export type SignalPresentation = 'toast' | 'overlay' | 'sound' | 'haptic';
export type SignalDirection = 'incoming' | 'outgoing' | 'system';

export interface SignalCatalogEntry {
  /** Canonical lower-case id — matches `CHANNEL_KEY_MAP` keys */
  id: string;
  /** i18n suffix under `signalInbox.channels.*` */
  i18nKey: string;
  /** Heroicon name hint (consumer resolves actual component) */
  icon: string;
  /** Colour / urgency tier */
  severity: SignalSeverity;
  /** Typical sender role */
  origin: SignalOrigin;
  /** Default toast duration for participants (ms) */
  defaultDurationMs: number;
  /** How participants should see this signal */
  presentation: SignalPresentation[];
}

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

export const SIGNAL_CATALOG: readonly SignalCatalogEntry[] = [
  // Director → Participants
  {
    id: 'pause',
    i18nKey: 'pause',
    icon: 'PauseIcon',
    severity: 'warn',
    origin: 'director',
    defaultDurationMs: 0, // persistent until resumed
    presentation: ['overlay'],
  },
  {
    id: 'hint',
    i18nKey: 'hint',
    icon: 'LightBulbIcon',
    severity: 'info',
    origin: 'director',
    defaultDurationMs: 8000,
    presentation: ['toast'],
  },
  {
    id: 'attention',
    i18nKey: 'attention',
    icon: 'BellAlertIcon',
    severity: 'warn',
    origin: 'director',
    defaultDurationMs: 6000,
    presentation: ['toast', 'haptic'],
  },
  {
    id: 'flash',
    i18nKey: 'flash',
    icon: 'BoltIcon',
    severity: 'urgent',
    origin: 'director',
    defaultDurationMs: 3000,
    presentation: ['overlay', 'haptic'],
  },

  // Participant → Director
  {
    id: 'ready',
    i18nKey: 'ready',
    icon: 'CheckCircleIcon',
    severity: 'info',
    origin: 'participant',
    defaultDurationMs: 4000,
    presentation: ['toast'],
  },
  {
    id: 'found',
    i18nKey: 'found',
    icon: 'MagnifyingGlassIcon',
    severity: 'info',
    origin: 'participant',
    defaultDurationMs: 5000,
    presentation: ['toast'],
  },
  {
    id: 'sos',
    i18nKey: 'sos',
    icon: 'ExclamationTriangleIcon',
    severity: 'urgent',
    origin: 'participant',
    defaultDurationMs: 0, // must be acknowledged
    presentation: ['toast', 'haptic', 'sound'],
  },
] as const;

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

const catalogByIdMap = new Map<string, SignalCatalogEntry>(
  SIGNAL_CATALOG.map((entry) => [entry.id, entry]),
);

/**
 * Look up a catalog entry by channel id (case-insensitive).
 * Returns `undefined` for unknown / custom channels.
 */
export function lookupSignal(channel: string): SignalCatalogEntry | undefined {
  return catalogByIdMap.get(channel.toLowerCase());
}

/**
 * Get the severity for a channel. Defaults to 'info' for unknown channels.
 */
export function getSignalSeverity(channel: string): SignalSeverity {
  return lookupSignal(channel)?.severity ?? 'info';
}

/**
 * Determine signal direction from the perspective of the Director.
 *
 * Resolution priority (avoids false attribution for trigger/system signals):
 *   1. actorType on the event (host / participant / trigger / system)
 *   2. payload sender fields (sender_user_id → host, sender_participant_id → participant)
 *   3. catalog origin hint (last resort)
 */
export function resolveSignalDirection(
  channel: string,
  actorType?: string,
  payload?: Record<string, unknown>,
): SignalDirection {
  // Priority 1: explicit actorType
  if (actorType === 'host') return 'outgoing';
  if (actorType === 'participant') return 'incoming';
  if (actorType === 'trigger' || actorType === 'system') return 'system';

  // Priority 2: payload sender fields (from broadcast / DB row)
  if (payload) {
    if (payload.sender_user_id) return 'outgoing';
    if (payload.sender_participant_id) return 'incoming';
  }

  // Priority 3: catalog origin (may mis-attribute trigger-generated signals)
  const entry = lookupSignal(channel);
  if (entry) {
    if (entry.origin === 'director') return 'outgoing';
    if (entry.origin === 'participant') return 'incoming';
  }
  return 'system';
}
