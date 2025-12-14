import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { getAllowedProductIds } from '@/app/api/games/utils'
import { buildGroupSizeOr, computeHasMore, normalizeEnvironment, searchSchema } from './helpers'

async function getSubPurposeGameIds(
  supabase: Awaited<ReturnType<typeof createServerRlsClient>>,
  subPurposeIds: string[]
) {
  const { data, error } = await supabase
    .from('game_secondary_purposes')
    .select('game_id')
    .in('purpose_id', subPurposeIds)

  if (error) {
    console.error('[api/games/search] sub-purpose lookup error', error)
    return [] as string[]
  }

  const ids = new Set<string>()
  for (const row of data ?? []) {
    if ((row as { game_id?: string | null }).game_id) {
      ids.add((row as { game_id: string }).game_id)
    }
  }
  return Array.from(ids)
}

export async function POST(request: Request) {
  const supabase = await createServerRlsClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const body = await request.json().catch(() => ({}))
  const parsed = searchSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 })
  }

  const {
    search,
    tenantId = null,
    products = [],
    mainPurposes = [],
    subPurposes = [],
    energyLevels: energyLevelsFilter = [],
    environment,
    minPlayers,
    maxPlayers,
    minTime,
    maxTime,
    minAge,
    maxAge,
    sort = 'relevance',
    page,
    pageSize,
    status = 'published',
  } = parsed.data

  const role = (user?.app_metadata as { role?: string } | undefined)?.role ?? null
  const isElevated = role === 'system_admin' || role === 'superadmin' || role === 'admin' || role === 'owner'

  const { allowedProductIds } = await getAllowedProductIds(supabase, tenantId)
  if (tenantId && allowedProductIds.length === 0) {
    return NextResponse.json({ games: [], total: 0, page, pageSize, hasMore: false, metadata: { allowedProducts: allowedProductIds } })
  }

  const effectiveProductFilter = (products.length ? products : allowedProductIds).filter(Boolean)

  const subPurposeGameIds = subPurposes.length > 0 ? await getSubPurposeGameIds(supabase, subPurposes) : []
  if (subPurposes.length > 0 && subPurposeGameIds.length === 0) {
    return NextResponse.json({ games: [], total: 0, page, pageSize, hasMore: false, metadata: { allowedProducts: allowedProductIds } })
  }

  const offset = (page - 1) * pageSize

  let query = supabase
    .from('games')
    .select(
      `
        *,
        owner:tenants(id,name),
        media:game_media(*, media:media(*)),
        product:products(*),
        main_purpose:purposes!main_purpose_id(*),
        secondary_purposes:game_secondary_purposes(purpose:purposes(*))
      `,
      { count: 'exact' }
    )

  if (!isElevated) {
    query = query.eq('status', 'published')
  } else if (status !== 'all') {
    query = query.eq('status', status)
  }
  if (tenantId) {
    query = query.or(`owner_tenant_id.eq.${tenantId},owner_tenant_id.is.null`)
  } else {
    query = query.is('owner_tenant_id', null)
  }

  if (effectiveProductFilter.length > 0) {
    query = query.in('product_id', effectiveProductFilter)
  }

  if (subPurposeGameIds.length > 0) {
    query = query.in('id', subPurposeGameIds)
  }

  if (mainPurposes.length > 0) {
    query = query.in('main_purpose_id', mainPurposes)
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
  }

  if (energyLevelsFilter.length > 0) {
    query = query.in('energy_level', energyLevelsFilter)
  }

  const normalizedEnvironment = normalizeEnvironment(environment)
  if (normalizedEnvironment !== undefined) {
    query = normalizedEnvironment === null ? query.is('location_type', null) : query.eq('location_type', normalizedEnvironment)
  }

  if (minPlayers !== undefined) {
    query = query.gte('min_players', minPlayers)
  }
  if (maxPlayers !== undefined) {
    query = query.lte('max_players', maxPlayers)
  }
  if (minTime !== undefined) {
    query = query.gte('time_estimate_min', minTime)
  }
  if (maxTime !== undefined) {
    query = query.lte('time_estimate_min', maxTime)
  }
  if (minAge !== undefined) {
    query = query.gte('age_min', minAge)
  }
  if (maxAge !== undefined) {
    query = query.lte('age_max', maxAge)
  }

  const groupSizeOr = buildGroupSizeOr(parsed.data.groupSizes ?? [])
  if (groupSizeOr) {
    query = query.or(groupSizeOr)
  }

  // Sorting (server-side best effort)
  switch (sort) {
    case 'name':
      query = query.order('name', { ascending: true })
      break
    case 'duration':
      query = query.order('time_estimate_min', { ascending: true, nullsFirst: true })
      break
    case 'popular':
      query = query
        .order('popularity_score', { ascending: false })
        .order('rating_count', { ascending: false })
      break
    case 'rating':
      query = query
        .order('rating_average', { ascending: false })
        .order('rating_count', { ascending: false })
      break
    case 'relevance':
      query = query
        .order('popularity_score', { ascending: false })
        .order('created_at', { ascending: false })
      break
    case 'newest':
    default:
      query = query.order('created_at', { ascending: false })
      break
  }

  query = query.range(offset, offset + pageSize - 1)

  const { data, error, count } = await query

  if (error) {
    console.error('[api/games/search] error', error)
    return NextResponse.json({ error: 'Failed to load games' }, { status: 500 })
  }

  const games = data ?? []
  const total = count ?? games.length
  const hasMore = computeHasMore(total, page, pageSize)

  // Log search (best effort)
  if (search || products.length || mainPurposes.length || subPurposes.length) {
    const { data: user } = await supabase.auth.getUser()
    const userId = user.user?.id || null
    try {
      await supabase.from('browse_search_logs').insert({
        search_term: search || null,
        filters_applied: {
          products,
          mainPurposes,
          subPurposes,
          energyLevels: energyLevelsFilter,
          environment,
          minPlayers,
          maxPlayers,
          minTime,
          maxTime,
          minAge,
          maxAge,
          sort,
          page,
          pageSize,
        },
        results_count: games.length,
        result_ids: (games || []).slice(0, pageSize).map((g) => (g as any).id),
        user_id: userId,
        tenant_id: tenantId,
      })
    } catch (logErr) {
      console.warn('[api/games/search] search log failed', logErr)
    }
  }

  return NextResponse.json({
    games,
    total,
    page,
    pageSize,
    hasMore,
    metadata: {
      allowedProducts: allowedProductIds,
    },
  })
}
