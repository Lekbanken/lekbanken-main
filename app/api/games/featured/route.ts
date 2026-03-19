import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerRlsClient } from '@/lib/supabase/server'
import { getAllowedProductIds } from '@/app/api/games/utils'
import { apiHandler } from '@/lib/api/route-handler'

const querySchema = z.object({
  tenantId: z.string().uuid().optional().nullable(),
  limit: z.coerce.number().int().min(1).max(50).default(8),
})

export const GET = apiHandler({
  auth: 'public',
  handler: async ({ req }) => {
  const supabase = await createServerRlsClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { searchParams } = new URL(req.url)
  const parsed = querySchema.safeParse({
    tenantId: searchParams.get('tenantId'),
    limit: searchParams.get('limit'),
  })

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid parameters', details: parsed.error.flatten() }, { status: 400 })
  }

  const { tenantId = null, limit } = parsed.data
  const { allowedProductIds } = await getAllowedProductIds(supabase, tenantId, user?.id ?? null)

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

  if (tenantId) {
    query = query.or(`owner_tenant_id.eq.${tenantId},owner_tenant_id.is.null`)
  } else {
    query = query.is('owner_tenant_id', null)
  }

  // BUG-026(B): Free games (product_id IS NULL) are always visible.
  // Entitlement gating applies only to games with a product_id.
  if (allowedProductIds.length > 0) {
    query = query.or(`product_id.is.null,product_id.in.(${allowedProductIds.join(',')})`)
  } else if (tenantId) {
    // Tenant has no entitlements — show only free games
    query = query.is('product_id', null)
  }

  const { data, error } = await query
    .order('popularity_score', { ascending: false })
    .order('rating_count', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[api/games/featured] fetch error', error)
    return NextResponse.json({ error: 'Failed to load featured games' }, { status: 500 })
  }

  return NextResponse.json({
    games: data ?? [],
    metadata: {
      allowedProducts: allowedProductIds,
    },
  })
},
})
