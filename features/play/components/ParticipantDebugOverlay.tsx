/**
 * ParticipantDebugOverlay
 *
 * DEV-only state introspection panel.
 * Activated by `?debug=1` in the URL — stripped entirely from production builds.
 *
 * Displays live chips for: drawer, blockingOverlay, artifactsHighlight,
 * connection, lastRealtimeEvent.
 *
 * Usage: <ParticipantDebugOverlay {...props} />
 * Gated externally: process.env.NODE_ENV !== 'production' && searchParams.debug === '1'
 */

'use client';

import type { ActiveDrawer, OverlayState } from './ParticipantOverlayStack';

// =============================================================================
// Types
// =============================================================================

export interface DebugOverlayProps {
  /** Current active drawer name */
  activeDrawer: ActiveDrawer;
  /** Which blocking overlay (if any) is showing */
  blockingOverlay: 'decision' | 'story' | 'countdown' | null;
  /** Whether artifact callout is pulsing */
  artifactsHighlight: boolean;
  /** Realtime connection status */
  connected: boolean;
  /** Last realtime event type name (e.g. "step_change", "artifact_update") */
  lastRealtimeEvent: string | null;
  /** Overlay state bag (for extra context) */
  overlayState: OverlayState;
}

// =============================================================================
// Chip helper
// =============================================================================

function Chip({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: 'green' | 'red' | 'yellow' | 'blue' | 'gray';
}) {
  const colorMap = {
    green: 'bg-green-900/80 text-green-300 border-green-700/50',
    red: 'bg-red-900/80 text-red-300 border-red-700/50',
    yellow: 'bg-yellow-900/80 text-yellow-300 border-yellow-700/50',
    blue: 'bg-blue-900/80 text-blue-300 border-blue-700/50',
    gray: 'bg-gray-900/80 text-gray-300 border-gray-700/50',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-mono leading-none ${colorMap[color]}`}
    >
      <span className="opacity-60">{label}:</span>
      <span className="font-semibold">{value}</span>
    </span>
  );
}

// =============================================================================
// Component
// =============================================================================

export function ParticipantDebugOverlay({
  activeDrawer,
  blockingOverlay,
  artifactsHighlight,
  connected,
  lastRealtimeEvent,
  overlayState,
}: DebugOverlayProps) {
  return (
    <div
      data-testid="debug-overlay"
      className="fixed bottom-2 left-2 z-[200] flex max-w-[90vw] flex-wrap gap-1 rounded-lg border border-gray-700/60 bg-black/80 px-2 py-1.5 backdrop-blur-sm"
    >
      {/* Connection */}
      <Chip
        label="conn"
        value={connected ? 'ok' : 'offline'}
        color={connected ? 'green' : 'red'}
      />

      {/* Active drawer */}
      <Chip
        label="drawer"
        value={activeDrawer ?? 'none'}
        color={activeDrawer ? 'blue' : 'gray'}
      />

      {/* Blocking overlay */}
      <Chip
        label="overlay"
        value={blockingOverlay ?? 'none'}
        color={blockingOverlay ? 'yellow' : 'gray'}
      />

      {/* Artifacts highlight */}
      <Chip
        label="highlight"
        value={artifactsHighlight ? 'on' : 'off'}
        color={artifactsHighlight ? 'yellow' : 'gray'}
      />

      {/* Last realtime event */}
      <Chip
        label="event"
        value={lastRealtimeEvent ?? '—'}
        color={lastRealtimeEvent ? 'blue' : 'gray'}
      />

      {/* Signal toast info */}
      {overlayState.signalToast && (
        <Chip
          label="signal"
          value={overlayState.signalToast.channel}
          color="yellow"
        />
      )}
    </div>
  );
}
