import type { User } from '@supabase/supabase-js'

/**
 * Determines whether the client-side AuthProvider should re-bootstrap
 * auth state from the Supabase browser client.
 *
 * Bootstrap is needed when:
 * 1. No SSR context was provided (initialUser === undefined) — e.g. a pure
 *    client render where ServerProviders didn't run.
 * 2. The server returned no user AND auth was degraded (timeout/network
 *    error in middleware or server-context) — the session cookie may still
 *    be valid and the browser client can resolve the real state.
 *
 * We do NOT bootstrap when the server returned an authoritative null
 * (initialUser === null, initialAuthDegraded === false), because that means
 * the user is genuinely unauthenticated on this request.
 */
export function shouldBootstrapFromClient(params: {
  initialUser: User | null | undefined
  initialAuthDegraded?: boolean
}): boolean {
  return (
    params.initialUser === undefined ||
    (params.initialUser === null && params.initialAuthDegraded === true)
  )
}
