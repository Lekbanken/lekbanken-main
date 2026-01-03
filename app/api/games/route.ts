import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { validateGamePayload } from '@/lib/validation/games'
import { isSystemAdmin } from '@/lib/utils/tenantAuth'
import { assertTenantAdminOrSystem } from '@/lib/utils/tenantAuth'
import type { Database } from '@/types/supabase'

type GameInsert = Database['public']['Tables']['games']['Insert']

export async function POST(request: Request) {
  const supabase = await createServerRlsClient()

  // Authentication: require system_admin or tenant_admin for the target tenant
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json().catch(() => ({}))) as Partial<GameInsert> & {
    hasCoverImage?: boolean
  }

  // If creating a tenant-scoped game, verify user has tenant admin access
  if (body.owner_tenant_id) {
    const hasAccess = await assertTenantAdminOrSystem(body.owner_tenant_id, user)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden - tenant admin required' }, { status: 403 })
    }
  } else {
    // Global games require system_admin
    if (!isSystemAdmin(user)) {
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
}
