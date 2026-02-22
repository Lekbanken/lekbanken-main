/**
 * Server-side broadcast helper for play runtime events.
 *
 * Centralises the Supabase Realtime `channel.send()` call that was previously
 * duplicated across ~13 API route files.  Every broadcast gets a monotonic
 * `seq` field so that the client-side sequence guard in `useLiveSession` can
 * reject duplicates and stale events.
 *
 * `seq` is obtained via an atomic `broadcast_seq = broadcast_seq + 1` update
 * on the `participant_sessions` row (Postgres function `increment_broadcast_seq`).
 * This guarantees strict monotonicity per session regardless of which server
 * instance handles the request (serverless/edge/multi-region all get a
 * consistent ordering from Postgres).
 *
 * If the DB increment fails (e.g. migration not yet applied, session row
 * missing), we fall back to `Date.now()` so the broadcast still goes out.
 *
 * @module lib/realtime/play-broadcast-server
 */

import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * Atomically increment `broadcast_seq` on the session row and return the new
 * value.  Falls back to `Date.now()` if the RPC call fails for any reason.
 */
async function nextSeq(sessionId: string): Promise<number> {
  try {
    const supabase = await createServiceRoleClient();
    const { data, error } = await supabase.rpc('increment_broadcast_seq', {
      p_session_id: sessionId,
    });
    if (!error && typeof data === 'number') {
      return data;
    }
    if (error) {
      // Expected when migration hasn't been applied yet — warn once
      console.warn('[broadcastPlayEvent] increment_broadcast_seq RPC failed, falling back to Date.now():', error.message);
    }
  } catch {
    // swallow — fall through to Date.now()
  }
  return Date.now();
}

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
    const seq = await nextSeq(sessionId);
    const supabase = await createServiceRoleClient();
    const channel = supabase.channel(`play:${sessionId}`);
    await channel.send({
      type: 'broadcast',
      event: 'play_event',
      payload: {
        ...event,
        seq,
      },
    });
  } catch (error) {
    // Best-effort: do not fail the request if realtime broadcast fails.
    console.warn('[broadcastPlayEvent] Failed to broadcast play event:', error);
  }
}
