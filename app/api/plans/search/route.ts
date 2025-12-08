import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { toPlannerPlan, DEFAULT_LOCALE_ORDER } from '@/lib/services/planner.server'
import type { Tables } from '@/types/supabase'
import type { PlannerPlan } from '@/types/planner'

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
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const {
    search,
    tenantId = null,
    visibility,
    page = 1,
    pageSize = 20,
  } = (await request.json().catch(() => ({}))) as SearchBody

  const offset = (page - 1) * pageSize

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

  query = query.range(offset, offset + pageSize - 1)

  const { data, error, count } = await query

  if (error) {
    console.error('[api/plans/search] error', error)
    return NextResponse.json({ error: 'Failed to search plans' }, { status: 500 })
  }

  const plans: PlannerPlan[] =
    data?.map((row: PlanRow & { blocks?: BlockRow[] | null }) =>
      toPlannerPlan(row, DEFAULT_LOCALE_ORDER)
    ) ?? []

  const total = count ?? plans.length
  const hasMore = offset + pageSize < total

  return NextResponse.json({ plans, total, page, pageSize, hasMore })
}
