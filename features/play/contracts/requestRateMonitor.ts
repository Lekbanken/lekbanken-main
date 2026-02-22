/**
 * Dev-only Request Rate Monitor
 *
 * Lightweight per-endpoint counter that warns when request rate
 * exceeds a threshold (storm regression guard).
 *
 * Usage:
 *   import { trackRequest } from './requestRateMonitor';
 *   trackRequest('/api/play/sessions/123/artifacts');
 *
 * Only active in development — zero overhead in production.
 *
 * Thresholds (per endpoint, per minute):
 * - > 120 req/min → console.warn (storm risk)
 * - > 300 req/min → console.error (self-DDoS zone)
 *
 * Previous threshold of 60 caused false alarms in lobby (multi-tab,
 * reconnect, backoff reset). 120 gives signal without noise; 300 is
 * the "something is definitely wrong" level.
 */

const IS_DEV = process.env.NODE_ENV !== 'production';

/** Per-endpoint timestamps within the current window */
const buckets = new Map<string, number[]>();

/** Window size in milliseconds (1 minute) */
const WINDOW_MS = 60_000;

/** Requests per window before soft warning */
const WARN_THRESHOLD = 120;

/** Requests per window before hard warning (self-DDoS) */
const HARD_THRESHOLD = 300;

/** How often to trim stale entries (ms) */
const TRIM_INTERVAL_MS = 30_000;

/** Normalise URLs: strip UUIDs and query params so we bucket by pattern */
function normaliseEndpoint(url: string): string {
  try {
    const u = new URL(url, 'http://localhost');
    // Replace UUIDs with :id
    return u.pathname.replace(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
      ':id',
    );
  } catch {
    return url;
  }
}

/**
 * Track a request to the given URL.
 * Warns immediately if the per-endpoint rate exceeds the threshold.
 * No-op in production.
 */
export function trackRequest(url: string): void {
  if (!IS_DEV) return;

  const endpoint = normaliseEndpoint(url);
  const now = Date.now();
  const cutoff = now - WINDOW_MS;

  let timestamps = buckets.get(endpoint);
  if (!timestamps) {
    timestamps = [];
    buckets.set(endpoint, timestamps);
  }

  timestamps.push(now);

  // Count entries within the window (lazy trim)
  const inWindow = timestamps.filter((t) => t > cutoff);
  if (inWindow.length !== timestamps.length) {
    buckets.set(endpoint, inWindow);
  }

  if (inWindow.length > HARD_THRESHOLD) {
    console.error(
      `[NETWORK] ⚠️ SELF-DDOS — ${endpoint}: ${inWindow.length} requests in last 60s (threshold: ${HARD_THRESHOLD})`,
    );
  } else if (inWindow.length > WARN_THRESHOLD) {
    console.warn(
      `[NETWORK] Storm risk — ${endpoint}: ${inWindow.length} requests in last 60s (threshold: ${WARN_THRESHOLD})`,
    );
  }
}

// Periodic trim to prevent memory leaks on long-lived sessions (dev only)
if (IS_DEV && typeof window !== 'undefined') {
  setInterval(() => {
    const cutoff = Date.now() - WINDOW_MS;
    for (const [endpoint, timestamps] of buckets.entries()) {
      const filtered = timestamps.filter((t) => t > cutoff);
      if (filtered.length === 0) {
        buckets.delete(endpoint);
      } else {
        buckets.set(endpoint, filtered);
      }
    }
  }, TRIM_INTERVAL_MS);
}
