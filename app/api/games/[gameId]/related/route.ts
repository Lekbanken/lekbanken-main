import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerRlsClient } from '@/lib/supabase/server'
import { getAllowedProductIds } from '@/app/api/games/utils'
import type { Database } from '@/types/supabase'

type GameRow = Pick<Database['public']['Tables']['games']['Row'], 'id' | 'product_id' | 'main_purpose_id' | 'owner_tenant_id' | 'status'> & {
  secondary_purposes?: Array<{ purpose_id: string | null }>
}

type RelatedGame = Database['public']['Tables']['games']['Row'] & {
  secondary_purposes?: Array<{ purpose?: { id?: string | null } | null }>
}

const querySchema = z.object({
  tenantId: z.string().uuid().optional().nullable(),
  limit: z.coerce.number().int().min(1).max(24).default(6),
})

function scoreGame(
  game: RelatedGame,
  base: GameRow,
  baseSecondaryIds: Set<string>
) {
  let score = 0
  if (game.product_id && base.product_id && game.product_id === base.product_id) score += 3
  if (game.main_purpose_id && base.main_purpose_id && game.main_purpose_id === base.main_purpose_id) score += 2

  const secondaryIds = (game.secondary_purposes || [])
    .map((p) => p?.purpose?.id)
    .filter((id): id is string => Boolean(id))

  if (secondaryIds.some((id) => baseSecondaryIds.has(id))) score += 1
  return score
}

export async function GET(request: Request, { params }: { params: { gameId: string } }) {
  const supabase = await createServerRlsClient()
  const { searchParams } = new URL(request.url)
  const parsed = querySchema.safeParse({
    tenantId: searchParams.get('tenantId'),
    limit: searchParams.get('limit'),
  })

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid parameters', details: parsed.error.flatten() }, { status: 400 })
  }

  const { tenantId = null, limit } = parsed.data

  const { data: baseGame, error: baseError } = await supabase
    .from('games')
    .select('id, product_id, main_purpose_id, owner_tenant_id, status, secondary_purposes:game_secondary_purposes(purpose_id)')
    .eq('id', params.gameId)
    .single()

  if (baseError || !baseGame) {
    console.error('[api/games/:id/related] base game fetch error', baseError)
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (baseGame.status !== 'published') {
    return NextResponse.json({ games: [] })
  }

  if (tenantId && baseGame.owner_tenant_id && baseGame.owner_tenant_id !== tenantId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { allowedProductIds } = await getAllowedProductIds(supabase, tenantId)

  if (tenantId && allowedProductIds.length === 0) {
    return NextResponse.json({ games: [], metadata: { allowedProducts: allowedProductIds } })
  }

  if (allowedProductIds.length > 0 && baseGame.product_id && !allowedProductIds.includes(baseGame.product_id)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const baseSecondaryIds = new Set(
    (baseGame.secondary_purposes || [])
      .map((p) => p?.purpose_id)
      .filter((id): id is string => Boolean(id))
  )

  let query = supabase
    .from('games')
    .select(
      `
        *,
        media:game_media(*, media:media(*)),
        product:products(*),
        main_purpose:purposes!main_purpose_id(*),
        secondary_purposes:game_secondary_purposes(purpose:purposes(*))
      `
    )
    .eq('status', 'published')
    .neq('id', params.gameId)

  if (tenantId) {
    query = query.or(`owner_tenant_id.eq.${tenantId},owner_tenant_id.is.null`)
  } else {
    query = query.is('owner_tenant_id', null)
  }

  if (allowedProductIds.length > 0) {
    query = query.in('product_id', allowedProductIds)
  }

  const orFilters: string[] = []
  if (baseGame.product_id) orFilters.push(`product_id.eq.${baseGame.product_id}`)
  if (baseGame.main_purpose_id) orFilters.push(`main_purpose_id.eq.${baseGame.main_purpose_id}`)
  if (orFilters.length > 0) {
    query = query.or(orFilters.join(','))
  }

  const fetchLimit = Math.min(limit * 3, 60)
  const { data, error } = await query.order('created_at', { ascending: false }).limit(fetchLimit)

  if (error) {
    console.error('[api/games/:id/related] fetch error', error)
    return NextResponse.json({ error: 'Failed to load related games' }, { status: 500 })
  }

  const ranked = (data as RelatedGame[] | null)?.map((game) => ({
    game,
    score: scoreGame(game, baseGame as GameRow, baseSecondaryIds),
  }))

  const games = (ranked || [])
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      const aCreated = new Date(a.game.created_at ?? 0).getTime()
      const bCreated = new Date(b.game.created_at ?? 0).getTime()
      return bCreated - aCreated
    })
    .slice(0, limit)
    .map((item) => item.game)

  return NextResponse.json({
    games,
    metadata: {
      allowedProducts: allowedProductIds,
      baseGameId: baseGame.id,
    },
  })
}
