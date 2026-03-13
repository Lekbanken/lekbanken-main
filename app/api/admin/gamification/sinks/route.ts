import { NextResponse } from 'next/server'
import { createBurnSink, updateBurnSink, type CreateSinkInput, type UpdateSinkInput, type SinkType } from '@/lib/services/gamification-burn.server'
import { apiHandler } from '@/lib/api/route-handler'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/gamification/sinks
 * 
 * Create a new burn sink (shop item, boost, cosmetic, etc.)
 * Admin only.
 */
export const POST = apiHandler({
  auth: 'system_admin',
  handler: async ({ req }) => {
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
  },
})

/**
 * PATCH /api/admin/gamification/sinks
 * 
 * Update an existing burn sink.
 * Admin only.
 */
export const PATCH = apiHandler({
  auth: 'system_admin',
  handler: async ({ req }) => {
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
  },
})
