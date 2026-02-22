/**
 * Haptic feedback utility — premium micro-interactions.
 *
 * Best-effort: does nothing on unsupported browsers / desktop.
 * Only used for **participant actions** (drawer open, vote confirm, expand).
 * Never used for passive events (TriggerLane chips, timer ticks).
 *
 * Patterns are intentionally minimal (10–20 ms) to feel "tap-tight"
 * rather than "phone vibrate". Think Apple Taptic Engine, not Android buzz.
 */

const isBrowser = typeof window !== 'undefined';

/**
 * Fire a single best-effort vibrate.
 * @param ms Duration in milliseconds (default 10)
 */
export function hapticTap(ms = 10): void {
  try {
    if (isBrowser && 'vibrate' in navigator) {
      navigator.vibrate(ms);
    }
  } catch {
    // Silent — not supported or blocked by permissions policy
  }
}

// =============================================================================
// Named presets — each maps to a specific interaction class
// =============================================================================

/** Drawer open / close, artifact expand / collapse */
export const HAPTIC_LIGHT = 10;

/** Decision confirm (slightly heavier — "you committed to something") */
export const HAPTIC_MEDIUM = 20;
