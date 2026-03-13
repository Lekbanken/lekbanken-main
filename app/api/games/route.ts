import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { validateGamePayload } from '@/lib/validation/games'
import { apiHandler } from '@/lib/api/route-handler'
import { requireTenantRole } from '@/lib/api/auth-guard'
import type { Database } from '@/types/supabase'

type GameInsert = Database['public']['Tables']['games']['Insert']

export const POST = apiHandler({
  auth: 'user',
  handler: async ({ req, auth }) => {
    const supabase = await createServerRlsClient()

    const body = (await req.json().catch(() => ({}))) as Partial<GameInsert> & {
      hasCoverImage?: boolean
    }

    // If creating a tenant-scoped game, verify user has tenant admin access
    if (body.owner_tenant_id) {
      await requireTenantRole(['admin', 'owner'], body.owner_tenant_id)
    } else {
      // Global games require system_admin
      if (auth!.effectiveGlobalRole !== 'system_admin') {
        return NextResponse.json({ error: 'Forbidden - system_admin required for global games' }, { status: 403 })
      }
    }

  const validation = validateGamePayload(body, { mode: 'create' })
  if (!validation.ok) {
    return NextResponse.json({ errors: validation.errors }, { status: 400 })
  }

  const insertPayload: GameInsert = {
    name: body.name?.trim() || '',
    short_description: body.short_description?.trim() || '',
    description: body.description || null,
    main_purpose_id: body.main_purpose_id || null,
    product_id: body.product_id || null,
    energy_level: body.energy_level || null,
    location_type: body.location_type || null,
    time_estimate_min: body.time_estimate_min ?? null,
    min_players: body.min_players ?? null,
    max_players: body.max_players ?? null,
    age_min: body.age_min ?? null,
    age_max: body.age_max ?? null,
    category: body.category ?? null,
    owner_tenant_id: body.owner_tenant_id ?? null,
    status: body.status || 'draft',
  }

  const { data, error } = await supabase
    .from('games')
    .insert(insertPayload)
    .select()
    .single()

  if (error) {
    console.error('[api/games] insert error', error)
    return NextResponse.json({ error: 'Failed to create game' }, { status: 500 })
  }

  return NextResponse.json({ game: data }, { status: 201 })
  },
})
