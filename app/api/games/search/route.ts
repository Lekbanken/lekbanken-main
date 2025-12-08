import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'

type SearchBody = {
  search?: string
  energyLevel?: 'low' | 'medium' | 'high'
  page?: number
  pageSize?: number
  tenantId?: string | null
}

export async function POST(request: Request) {
  const supabase = await createServerRlsClient()

  const {
    search,
    energyLevel,
    page = 1,
    pageSize = 50,
    tenantId = null,
  } = (await request.json().catch(() => ({}))) as SearchBody

  const offset = (page - 1) * pageSize

  let query = supabase
    .from('games')
    .select(
      `
        *,
        media:game_media(
          *,
          media:media(*)
        ),
        product:products(*),
        main_purpose:purposes!main_purpose_id(*),
        translations:game_translations(*)
      `,
      { count: 'exact' }
    )
    .eq('status', 'published')
    .order('name', { ascending: true })

  if (tenantId) {
    query = query.or(`owner_tenant_id.eq.${tenantId},owner_tenant_id.is.null`)
  } else {
    query = query.is('owner_tenant_id', null)
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
  }

  if (energyLevel) {
    query = query.eq('energy_level', energyLevel)
  }

  query = query.range(offset, offset + pageSize - 1)

  const { data, error, count } = await query

  if (error) {
    console.error('[api/games/search] error', error)
    return NextResponse.json(
      { error: 'Failed to load games' },
      { status: 500 }
    )
  }

  const total = count ?? 0
  const hasMore = offset + pageSize < total

  return NextResponse.json({
    games: data ?? [],
    total,
    page,
    pageSize,
    hasMore,
  })
}
