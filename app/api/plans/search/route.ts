import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { toPlannerPlan, DEFAULT_LOCALE_ORDER } from '@/lib/services/planner.server'
import type { Tables } from '@/types/supabase'
import type { PlannerPlan } from '@/types/planner'
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
    media?: Tables<'game_media'>[] | null
  }) | null
}

type SearchBody = {
  search?: string
  tenantId?: string | null
  visibility?: 'private' | 'tenant' | 'public'
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
            media:game_media(*)
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
  const memberships = membershipsResult.data ?? []

  const capabilityCtx = buildCapabilityContextFromMemberships({
    userId: user.id,
    globalRole,
    memberships,
  })

  const plans = (data ?? []).map((row: PlanRow & { blocks?: BlockRow[] | null }) => {
    const plan = toPlannerPlan(row, DEFAULT_LOCALE_ORDER)
    const caps = derivePlanCapabilities(capabilityCtx, {
      ownerUserId: row.owner_user_id,
      ownerTenantId: row.owner_tenant_id,
      visibility: row.visibility,
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
