import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { toPlannerPlan, DEFAULT_LOCALE_ORDER } from '@/lib/services/planner.server'
import type { Tables } from '@/types/supabase'
import {
  buildCapabilityContextFromMemberships,
  derivePlanCapabilities,
  capabilitiesToObject,
} from '@/lib/auth/capabilities'
import { deriveEffectiveGlobalRole } from '@/lib/auth/role'

type PlanRow = Tables<'plans'>
type BlockRow = Tables<'plan_blocks'> & {
  game?: (Tables<'games'> & {
    translations?: Tables<'game_translations'>[] | null
    media?: (Tables<'game_media'> & { media?: Pick<Tables<'media'>, 'url'> | null })[] | null
  }) | null
}

type SearchBody = {
  search?: string
  tenantId?: string | null
  visibility?: 'private' | 'tenant' | 'public'
  status?: 'draft' | 'published' | 'modified' | 'archived'
  statuses?: Array<'draft' | 'published' | 'modified' | 'archived'>
  page?: number
  pageSize?: number
}

export async function POST(request: Request) {
  const supabase = await createServerRlsClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 })
  }

  const {
    search,
    tenantId = null,
    visibility,
    status,
    statuses,
    page = 1,
    pageSize = 20,
  } = (await request.json().catch(() => ({}))) as SearchBody

  // Clamp pageSize to reasonable limits
  const safePageSize = Math.min(Math.max(pageSize, 1), 100)
  const offset = (page - 1) * safePageSize

  let query = supabase
    .from('plans')
    .select(
      `
        *,
        blocks:plan_blocks(
          *,
          game:games(
            *,
            translations:game_translations(*),
            media:game_media(*, media:media(url))
          )
        )
      `,
      { count: 'exact' }
    )
    .order('updated_at', { ascending: false })

  if (search) {
    query = query.ilike('name', `%${search}%`)
  }

  if (visibility) {
    query = query.eq('visibility', visibility)
  } else if (tenantId) {
    query = query.or(`owner_tenant_id.eq.${tenantId},visibility.eq.public`)
  }

  // Status filter - support both single status and array of statuses
  if (statuses && statuses.length > 0) {
    query = query.in('status', statuses)
  } else if (status) {
    query = query.eq('status', status)
  }

  query = query.range(offset, offset + safePageSize - 1)

  const { data, error, count } = await query

  if (error) {
    console.error('[api/plans/search] error', error)
    return NextResponse.json({ error: { code: 'SEARCH_FAILED', message: 'Failed to search plans' } }, { status: 500 })
  }

  // Get user context for capabilities
  const [profileResult, membershipsResult] = await Promise.all([
    supabase.from('users').select('global_role').eq('id', user.id).single(),
    supabase.from('user_tenant_memberships').select('tenant_id, role').eq('user_id', user.id),
  ])

  const globalRole = deriveEffectiveGlobalRole(profileResult.data, user)
  const memberships = (membershipsResult.data ?? [])
    .filter((m) => Boolean(m.tenant_id) && Boolean(m.role))
    .map((m) => ({ tenant_id: m.tenant_id as string, role: m.role as string }))

  const capabilityCtx = buildCapabilityContextFromMemberships({
    userId: user.id,
    globalRole,
    memberships,
  })

  const plans = (data ?? []).map((row) => {
    const plan = toPlannerPlan(row as unknown as PlanRow & { blocks?: BlockRow[] | null }, DEFAULT_LOCALE_ORDER)
    const caps = derivePlanCapabilities(capabilityCtx, {
      ownerUserId: (row as unknown as PlanRow).owner_user_id,
      ownerTenantId: (row as unknown as PlanRow).owner_tenant_id,
      visibility: (row as unknown as PlanRow).visibility,
    })
    return {
      ...plan,
      _capabilities: capabilitiesToObject(caps),
    }
  })

  const total = count ?? plans.length
  const hasMore = offset + safePageSize < total

  return NextResponse.json({
    plans,
    pagination: {
      page,
      pageSize: safePageSize,
      total,
      hasMore,
    },
  })
}
