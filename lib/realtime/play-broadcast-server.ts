/**
 * Server-side broadcast helper for play runtime events.
 *
 * Centralises the Supabase Realtime `channel.send()` call that was previously
 * duplicated across ~13 API route files.  Every broadcast gets a monotonic
 * `seq` field so that the client-side sequence guard in `useLiveSession` can
 * reject duplicates and stale events.
 *
 * `seq` is derived from `Date.now()` — monotonic within a single server
 * process and good-enough for ordering.  If two broadcasts from different
 * request handlers happen in the same millisecond they get the same `seq`,
 * which is harmless (the guard is `<=`, so the second is dropped as a dupe).
 *
 * @module lib/realtime/play-broadcast-server
 */

import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * Broadcast a play event to all subscribers on the `play:{sessionId}` channel.
 *
 * Best-effort: if the broadcast fails the error is logged but never thrown,
 * so the calling API route can still return a successful response.
 */
export async function broadcastPlayEvent(
  sessionId: string,
  event: Record<string, unknown>
): Promise<void> {
  try {
    const supabase = await createServiceRoleClient();
    const channel = supabase.channel(`play:${sessionId}`);
    await channel.send({
      type: 'broadcast',
      event: 'play_event',
      payload: {
        ...event,
        seq: Date.now(),
      },
    });
  } catch (error) {
    // Best-effort: do not fail the request if realtime broadcast fails.
    console.warn('[broadcastPlayEvent] Failed to broadcast play event:', error);
  }
}
