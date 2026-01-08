import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createBurnSink, updateBurnSink, type CreateSinkInput, type UpdateSinkInput, type SinkType } from '@/lib/services/gamification-burn.server'
import { createServerRlsClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/gamification/sinks
 * 
 * Create a new burn sink (shop item, boost, cosmetic, etc.)
 * Admin only.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Verify admin authorization
    const supabase = await createServerRlsClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin role (simplified - should use proper RLS check)
    const { data: isAdmin } = await supabase.rpc('is_system_admin')
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await req.json()

    // Validate required fields
    if (!body.sinkType || !body.name || body.costCoins === undefined) {
      return NextResponse.json(
        { error: 'sinkType, name, and costCoins are required' },
        { status: 400 }
      )
    }

    const validSinkTypes: SinkType[] = ['shop_item', 'boost', 'cosmetic', 'donation', 'custom']
    if (!validSinkTypes.includes(body.sinkType)) {
      return NextResponse.json(
        { error: `Invalid sinkType. Must be one of: ${validSinkTypes.join(', ')}` },
        { status: 400 }
      )
    }

    const input: CreateSinkInput = {
      tenantId: body.tenantId,
      sinkType: body.sinkType,
      name: body.name,
      description: body.description,
      costCoins: body.costCoins,
      isAvailable: body.isAvailable,
      availableFrom: body.availableFrom,
      availableUntil: body.availableUntil,
      totalStock: body.totalStock,
      perUserLimit: body.perUserLimit,
      metadata: body.metadata,
    }

    const result = await createBurnSink(input)

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ id: result.id }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/admin/gamification/sinks] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/gamification/sinks
 * 
 * Update an existing burn sink.
 * Admin only.
 */
export async function PATCH(req: NextRequest): Promise<NextResponse> {
  try {
    // Verify admin authorization
    const supabase = await createServerRlsClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: isAdmin } = await supabase.rpc('is_system_admin')
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await req.json()

    if (!body.id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const input: UpdateSinkInput = {
      id: body.id,
      name: body.name,
      description: body.description,
      costCoins: body.costCoins,
      isAvailable: body.isAvailable,
      availableFrom: body.availableFrom,
      availableUntil: body.availableUntil,
      remainingStock: body.remainingStock,
      perUserLimit: body.perUserLimit,
      metadata: body.metadata,
    }

    const result = await updateBurnSink(input)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[PATCH /api/admin/gamification/sinks] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
