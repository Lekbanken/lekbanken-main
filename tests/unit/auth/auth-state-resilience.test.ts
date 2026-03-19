/**
 * Auth State Resilience Tests
 *
 * Regression tests for the "page disconnection" bug:
 * The `onAuthStateChange` handler must NEVER clear auth state
 * when a transient failure (timeout, network error) occurs.
 *
 * Root cause (commit 6afa474): `getUser()` called on TOKEN_REFRESHED
 * could timeout → return { user: null } → handler wiped auth state →
 * user appeared "logged out" and had to hard-refresh.
 *
 * These tests verify the contract at the logic level
 * (no React rendering, no real Supabase).
 */

import { describe, it, expect } from 'vitest'

/**
 * Simulate the auth state change handler's decision logic.
 * Extracted from lib/supabase/auth.tsx onAuthStateChange.
 *
 * Returns what action the handler should take:
 * - 'keep'  = keep existing auth state (no change)
 * - 'clear' = clear user/profile/memberships (genuine logout)
 * - 'update-from-session' = update user from session.user
 * - 'refresh-from-user'   = call refreshAuthData with the resolved user
 */
type HandlerAction =
  | { type: 'keep'; reason: string }
  | { type: 'clear'; reason: string }
  | { type: 'update-from-session'; user: { id: string } }
  | { type: 'refresh-from-user'; user: { id: string }; triggerRouterRefresh: boolean }

function simulateAuthHandler(
  event: string,
  session: { user: { id: string } } | null,
  getUserResult: { user: { id: string } | null; error: { message: string } | null } | 'throw',
): HandlerAction {
  // 1. INITIAL_SESSION → skip
  if (event === 'INITIAL_SESSION') {
    return { type: 'keep', reason: 'INITIAL_SESSION ignored' }
  }

  // 2. SIGNED_OUT → clear
  if (event === 'SIGNED_OUT') {
    return { type: 'clear', reason: 'SIGNED_OUT' }
  }

  // 3. No session → clear
  if (!session) {
    return { type: 'clear', reason: 'no session' }
  }

  // 4. TOKEN_REFRESHED → use session.user, never call getUser
  if (event === 'TOKEN_REFRESHED') {
    return { type: 'update-from-session', user: session.user }
  }

  // 5. Other events: try session.user first
  const sessionUser = session.user
  if (sessionUser) {
    return { type: 'refresh-from-user', user: sessionUser, triggerRouterRefresh: event === 'USER_UPDATED' }
  }

  // 6. Fallback: getUser()
  if (getUserResult === 'throw') {
    return { type: 'keep', reason: 'getUser() threw — keeping existing state' }
  }

  if (!getUserResult.user) {
    if (getUserResult.error) {
      return { type: 'keep', reason: 'getUser() error — keeping existing state' }
    }
    return { type: 'clear', reason: 'genuine no user (no error)' }
  }

  return { type: 'refresh-from-user', user: getUserResult.user, triggerRouterRefresh: event === 'USER_UPDATED' }
}

function shouldBootstrapFromClient(params: {
  initialUser: { id: string } | null | undefined
  initialAuthDegraded?: boolean
}) {
  return params.initialUser === undefined || (params.initialUser === null && params.initialAuthDegraded === true)
}

describe('Auth state change handler resilience', () => {
  const mockUser = { id: 'user-123' }
  const mockSession = { user: mockUser }

  describe('TOKEN_REFRESHED (most frequent event)', () => {
    it('should use session.user directly — never call getUser()', () => {
      const result = simulateAuthHandler('TOKEN_REFRESHED', mockSession, { user: null, error: null })
      expect(result.type).toBe('update-from-session')
    })

    it('should never clear state on TOKEN_REFRESHED with valid session', () => {
      const result = simulateAuthHandler('TOKEN_REFRESHED', mockSession, { user: null, error: null })
      expect(result.type).not.toBe('clear')
    })

    it('should clear state if session is null on TOKEN_REFRESHED', () => {
      const result = simulateAuthHandler('TOKEN_REFRESHED', null, { user: null, error: null })
      expect(result.type).toBe('clear')
    })
  })

  describe('SIGNED_OUT', () => {
    it('should always clear state', () => {
      const result = simulateAuthHandler('SIGNED_OUT', null, { user: null, error: null })
      expect(result.type).toBe('clear')
    })

    it('should clear state even if session is somehow present', () => {
      const result = simulateAuthHandler('SIGNED_OUT', mockSession, { user: null, error: null })
      expect(result.type).toBe('clear')
    })
  })

  describe('SIGNED_IN', () => {
    it('should refresh from session.user', () => {
      const result = simulateAuthHandler('SIGNED_IN', mockSession, { user: mockUser, error: null })
      expect(result.type).toBe('refresh-from-user')
    })

    it('should NOT trigger router.refresh()', () => {
      const result = simulateAuthHandler('SIGNED_IN', mockSession, { user: mockUser, error: null })
      if (result.type === 'refresh-from-user') {
        expect(result.triggerRouterRefresh).toBe(false)
      }
    })
  })

  describe('USER_UPDATED', () => {
    it('should refresh from session.user and trigger router.refresh()', () => {
      const result = simulateAuthHandler('USER_UPDATED', mockSession, { user: mockUser, error: null })
      expect(result.type).toBe('refresh-from-user')
      if (result.type === 'refresh-from-user') {
        expect(result.triggerRouterRefresh).toBe(true)
      }
    })
  })

  describe('Transient failure resilience (the disconnection bug)', () => {
    it('should keep state when getUser() throws (timeout/network)', () => {
      // session.user is null (edge case), getUser() throws
      const result = simulateAuthHandler('SIGNED_IN', { user: null as unknown as { id: string } }, 'throw')
      // With session.user being falsy, falls to getUser() path
      // Since getUser() threw, should keep state
      expect(result.type).toBe('keep')
    })

    it('should keep state when getUser() returns error + null user', () => {
      const result = simulateAuthHandler(
        'SIGNED_IN',
        { user: null as unknown as { id: string } },
        { user: null, error: { message: 'Request timeout' } },
      )
      expect(result.type).toBe('keep')
    })

    it('should clear state only when getUser() returns null user WITHOUT error', () => {
      const result = simulateAuthHandler(
        'SIGNED_IN',
        { user: null as unknown as { id: string } },
        { user: null, error: null },
      )
      expect(result.type).toBe('clear')
      if (result.type === 'clear') {
        expect(result.reason).toContain('genuine no user')
      }
    })
  })

  describe('INITIAL_SESSION', () => {
    it('should be ignored (keep state)', () => {
      const result = simulateAuthHandler('INITIAL_SESSION', null, { user: null, error: null })
      expect(result.type).toBe('keep')
    })
  })

  describe('bootstrap recovery after degraded server auth', () => {
    it('should bootstrap on the client when the server returned no user under degraded auth', () => {
      expect(
        shouldBootstrapFromClient({
          initialUser: null,
          initialAuthDegraded: true,
        })
      ).toBe(true)
    })

    it('should not bootstrap on the client for a normal guest page render', () => {
      expect(
        shouldBootstrapFromClient({
          initialUser: null,
          initialAuthDegraded: false,
        })
      ).toBe(false)
    })

    it('should not bootstrap on the client when the server already provided a user', () => {
      expect(
        shouldBootstrapFromClient({
          initialUser: { id: 'user-123' },
          initialAuthDegraded: true,
        })
      ).toBe(false)
    })
  })
})
