import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getGameTriggers, getGameStatus } from '@/lib/services/games.server'
import { mapTriggers } from '@/lib/game-display/mappers'
import { requireGameAuth, canViewGame } from '@/lib/game-display/access'

/**
 * GET /api/games/[gameId]/triggers
 *
 * Lazy-load triggers for a game.
 * Requires authenticated session. Enforces published-status access.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const ctx = await requireGameAuth()
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { gameId } = await params

    if (!gameId) {
      return NextResponse.json({ error: 'Missing gameId' }, { status: 400 })
    }

    const gameStatus = await getGameStatus(gameId)
    const access = await canViewGame(gameStatus)
    if (!access.allowed) {
      const status = access.reason === 'not-found' ? 404 : 403
      return NextResponse.json({ error: access.reason === 'not-found' ? 'Game not found' : 'Forbidden' }, { status })
    }

    const dbTriggers = await getGameTriggers(gameId)

    // SECURITY (F7): Strip content strings from triggers for library/preview context.
    // Keep structural fields (type, IDs, numbers, booleans) so trigger design is visible,
    // but remove content that could reveal puzzle solutions or facilitator instructions.
    const STRIP_ACTION_KEYS = new Set(['message', 'customScript', 'reason', 'label'])
    const sanitizedTriggers = dbTriggers.map((t) => {
      // Strip 'outcome' from decision_resolved conditions
      const condition =
        t.condition &&
        typeof t.condition === 'object' &&
        'type' in t.condition &&
        (t.condition as { type: string }).type === 'decision_resolved'
          ? (() => {
              const { outcome: _outcome, ...safe } = t.condition as Record<string, unknown>
              return safe
            })()
          : t.condition

      // Strip content strings from actions, keep structure
      const actions = Array.isArray(t.actions)
        ? t.actions.map((action) => {
            if (typeof action !== 'object' || action === null) return action
            const cleaned: Record<string, unknown> = {}
            for (const [k, v] of Object.entries(action)) {
              if (!STRIP_ACTION_KEYS.has(k)) cleaned[k] = v
            }
            return cleaned
          })
        : t.actions

      return { ...t, condition, actions }
    })

    // Map to canonical GameTrigger format
    const triggers = mapTriggers(
      sanitizedTriggers.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        enabled: t.enabled,
        condition: t.condition,
        actions: t.actions,
        execute_once: t.execute_once,
        delay_seconds: t.delay_seconds,
        sort_order: t.sort_order,
      }))
    )

    return NextResponse.json({ triggers }, {
      headers: {
        'Cache-Control': 'private, max-age=60',
      },
    })
  } catch (error) {
    console.error('[api/games/:id/triggers] error', error)
    return NextResponse.json(
      { error: 'Failed to fetch triggers' },
      { status: 500 }
    )
  }
}
