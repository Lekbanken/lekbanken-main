import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { getAllowedProductIds } from '@/app/api/games/utils'
import { buildGroupSizeOr, computeHasMore, normalizeEnvironment, searchSchema } from './helpers'
import { DEMO_TENANT_ID } from '@/lib/auth/ephemeral-users'

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
    showLiked,
    sort = 'relevance',
    page,
    pageSize,
    status = 'published',
  } = parsed.data

  const role = (user?.app_metadata as { role?: string } | undefined)?.role ?? null
  const isElevated = role === 'system_admin' || role === 'superadmin' || role === 'admin' || role === 'owner'
  
  // Detect demo mode: either demo tenant or demo user metadata
  const isDemoMode = tenantId === DEMO_TENANT_ID || user?.user_metadata?.is_demo_user === true

  // For demo users: skip product access checks, show only is_demo_content games
  if (isDemoMode) {
    const offset = (page - 1) * pageSize
    
    let demoQuery = supabase
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
      .eq('status', 'published')
      .eq('is_demo_content', true)
    
    // Apply search filter
    if (search) {
      demoQuery = demoQuery.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    }
    
    // Apply other filters that make sense for demo
    if (energyLevelsFilter.length > 0) {
      demoQuery = demoQuery.in('energy_level', energyLevelsFilter)
    }
    
    const normalizedEnv = normalizeEnvironment(environment)
    if (normalizedEnv !== undefined) {
      demoQuery = normalizedEnv === null 
        ? demoQuery.is('location_type', null) 
        : demoQuery.eq('location_type', normalizedEnv)
    }
    
    if (minPlayers !== undefined) demoQuery = demoQuery.gte('min_players', minPlayers)
    if (maxPlayers !== undefined) demoQuery = demoQuery.lte('max_players', maxPlayers)
    if (minTime !== undefined) demoQuery = demoQuery.gte('time_estimate_min', minTime)
    if (maxTime !== undefined) demoQuery = demoQuery.lte('time_estimate_min', maxTime)
    
    const groupSizeOr = buildGroupSizeOr(parsed.data.groupSizes ?? [])
    if (groupSizeOr) {
      demoQuery = demoQuery.or(groupSizeOr)
    }
    
    // Sort demo games
    switch (sort) {
      case 'name':
        demoQuery = demoQuery.order('name', { ascending: true })
        break
      case 'duration':
        demoQuery = demoQuery.order('time_estimate_min', { ascending: true, nullsFirst: true })
        break
      default:
        demoQuery = demoQuery.order('created_at', { ascending: false })
        break
    }
    
    demoQuery = demoQuery.range(offset, offset + pageSize - 1)
    
    const { data: demoGames, error: demoError, count: demoCount } = await demoQuery
    
    if (demoError) {
      console.error('[api/games/search] demo query error', demoError)
      return NextResponse.json({ error: 'Failed to load demo games' }, { status: 500 })
    }
    
    const games = demoGames ?? []
    const total = demoCount ?? games.length
    const hasMore = computeHasMore(total, page, pageSize)
    
    return NextResponse.json({
      games,
      total,
      page,
      pageSize,
      hasMore,
      metadata: { allowedProducts: [], isDemoMode: true },
    })
  }

  const { allowedProductIds } = await getAllowedProductIds(supabase, tenantId, user?.id ?? null)
  if (tenantId && allowedProductIds.length === 0 && !isElevated) {
    return NextResponse.json({ games: [], total: 0, page, pageSize, hasMore: false, metadata: { allowedProducts: allowedProductIds } })
  }

  const effectiveProductFilter = (products.length ? products : allowedProductIds).filter(Boolean)

  const subPurposeGameIds = subPurposes.length > 0 ? await getSubPurposeGameIds(supabase, subPurposes) : []
  if (subPurposes.length > 0 && subPurposeGameIds.length === 0) {
    return NextResponse.json({ games: [], total: 0, page, pageSize, hasMore: false, metadata: { allowedProducts: allowedProductIds } })
  }

  // Get liked game IDs if showLiked filter is enabled
  let likedGameIds: string[] = []
  if (showLiked && user?.id) {
    const { data: likedData, error: likedError } = await supabase.rpc('get_liked_game_ids')
    if (likedError) {
      console.error('[api/games/search] liked games lookup error', likedError)
    } else {
      likedGameIds = (likedData ?? []) as string[]
    }
    // If no liked games, return empty result
    if (likedGameIds.length === 0) {
      return NextResponse.json({ 
        games: [], 
        total: 0, 
        page, 
        pageSize, 
        hasMore: false, 
        metadata: { allowedProducts: allowedProductIds } 
      })
    }
  } else if (showLiked && !user?.id) {
    // Not logged in but trying to filter by liked - return empty
    return NextResponse.json({ 
      games: [], 
      total: 0, 
      page, 
      pageSize, 
      hasMore: false, 
      metadata: { allowedProducts: allowedProductIds } 
    })
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
  if (!isElevated) {
    if (tenantId) {
      query = query.or(`owner_tenant_id.eq.${tenantId},owner_tenant_id.is.null`)
    } else {
      query = query.is('owner_tenant_id', null)
    }
  } else {
    if (tenantId) {
      query = query.or(`owner_tenant_id.eq.${tenantId},owner_tenant_id.is.null`)
    }
    // if elevated and no tenantId provided: no owner filter => all games
  }

  if (effectiveProductFilter.length > 0) {
    query = query.in('product_id', effectiveProductFilter)
  }

  if (subPurposeGameIds.length > 0) {
    query = query.in('id', subPurposeGameIds)
  }

  // Filter by liked game IDs
  // TODO: Performance - large IN-lists can be slow. Consider using a JOIN or
  // RPC that returns games directly, or an EXISTS subquery for better performance
  // at scale. Current approach is fine for MVP with small datasets.
  if (likedGameIds.length > 0) {
    query = query.in('id', likedGameIds)
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
        result_ids: (games as Array<{ id: string }>).slice(0, pageSize).map((g) => g.id),
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
