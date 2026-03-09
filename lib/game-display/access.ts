import 'server-only'

import { getServerAuthContext } from '@/lib/auth/server-context'
import type { AuthContext } from '@/types/auth'

type GameWithStatus = {
  id: string
  status: string
  tenant_id?: string | null
}

type AccessResult =
  | { allowed: true; isAdmin: boolean }
  | { allowed: false; reason: 'not-found' | 'not-published' | 'unauthorized' }

/**
 * Central access policy for GameDetails.
 *
 * Determines whether the current user may view a game.
 * - Published games: visible to all authenticated users
 * - Draft games: visible only to system_admin
 * - Missing games: returns not-found
 *
 * Used by page.tsx and all 3 lazy API routes to enforce consistent access.
 */
export async function canViewGame(
  game: GameWithStatus | null
): Promise<AccessResult> {
  if (!game) {
    return { allowed: false, reason: 'not-found' }
  }

  const ctx = await getServerAuthContext()
  const isAdmin = ctx.effectiveGlobalRole === 'system_admin'

  if (game.status === 'published') {
    return { allowed: true, isAdmin }
  }

  // Draft game — only system_admin may view
  if (isAdmin) {
    return { allowed: true, isAdmin: true }
  }

  return { allowed: false, reason: 'not-published' }
}

/**
 * Require an authenticated user for API routes.
 * Returns the auth context or null if not authenticated.
 */
export async function requireGameAuth(): Promise<AuthContext | null> {
  const ctx = await getServerAuthContext()
  return ctx.user ? ctx : null
}
