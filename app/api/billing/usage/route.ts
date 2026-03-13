import { NextResponse } from 'next/server'
import { z } from 'zod'
import { timingSafeEqual } from 'crypto'
import { supabaseAdmin, createServerRlsClient } from '@/lib/supabase/server'
import { apiHandler } from '@/lib/api/route-handler'
import { requireAuth } from '@/lib/api/auth-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const recordUsageSchema = z.object({
  tenantId: z.string().uuid(),
  meterSlug: z.string().min(1).max(50),
  quantity: z.number().min(0),
  idempotencyKey: z.string().max(200).optional(),
  metadata: z.record(z.unknown()).optional(),
})

// POST: Record usage
export const POST = apiHandler({
  auth: 'public',
  input: recordUsageSchema,
  handler: async ({ req, body }) => {
    // Dual auth: API key (internal services) OR system_admin (UI)
    const apiKey = req.headers.get('x-api-key')
    const internalSecret = process.env.INTERNAL_API_SECRET

    const keyValid = apiKey && internalSecret &&
      apiKey.length === internalSecret.length &&
      timingSafeEqual(Buffer.from(apiKey), Buffer.from(internalSecret))
    if (!keyValid) {
      const ctx = await requireAuth()
      if (ctx.effectiveGlobalRole !== 'system_admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const { tenantId, meterSlug, quantity, idempotencyKey, metadata } = body

    // Call record_usage RPC (using type assertion since function may not be in generated types yet)
    const { data, error } = await supabaseAdmin.rpc('record_usage' as never, {
      p_tenant_id: tenantId,
      p_meter_slug: meterSlug,
      p_quantity: quantity,
      p_idempotency_key: idempotencyKey ?? undefined,
      p_metadata: metadata ?? undefined,
    } as never)

    if (error) {
      console.error('[usage API] Record error:', error)
      return NextResponse.json({ error: error.message || 'Failed to record usage' }, { status: 500 })
    }

    return NextResponse.json({ record_id: data })
  },
})

// GET: Get usage summary for a tenant
export const GET = apiHandler({
  auth: 'user',
  handler: async ({ auth, req }) => {
    const url = new URL(req.url)
    const tenantId = url.searchParams.get('tenantId')
    const meterSlug = url.searchParams.get('meter')
    const periodStart = url.searchParams.get('periodStart')
    const periodEnd = url.searchParams.get('periodEnd')

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId required' }, { status: 400 })
    }

    const supabase = await createServerRlsClient()

    // Check user has access to tenant
    const { data: membership } = await supabase
      .from('user_tenant_memberships')
      .select('role')
      .eq('tenant_id', tenantId)
      .eq('user_id', auth!.user!.id)
      .eq('status', 'active')
      .single()

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get meters
    const { data: meters } = await supabase
      .from('usage_meters')
      .select('*')
      .eq('status', 'active')

    // Get usage summaries
    let summaryQuery = supabase
      .from('usage_summaries')
      .select(`
        *,
        meter:usage_meters(id, name, slug, unit_name)
      `)
      .eq('tenant_id', tenantId)
      .order('period_start', { ascending: false })

    if (meterSlug) {
      const meter = meters?.find(m => m.slug === meterSlug)
      if (meter) {
        summaryQuery = summaryQuery.eq('meter_id', meter.id)
      }
    }

    if (periodStart) {
      summaryQuery = summaryQuery.gte('period_start', periodStart)
    }

    if (periodEnd) {
      summaryQuery = summaryQuery.lte('period_end', periodEnd)
    }

    const { data: summaries, error } = await summaryQuery.limit(100)

    if (error) {
      console.error('[usage API] Query error:', error)
      return NextResponse.json({ error: 'Failed to fetch usage' }, { status: 500 })
    }

    // Get current period records for real-time view
    const currentPeriodStart = new Date()
    currentPeriodStart.setDate(1)
    currentPeriodStart.setHours(0, 0, 0, 0)

    const { data: currentRecords } = await supabase
      .from('usage_records')
      .select(`
        meter_id,
        quantity,
        timestamp
      `)
      .eq('tenant_id', tenantId)
      .gte('period_start', currentPeriodStart.toISOString().split('T')[0])
      .order('timestamp', { ascending: false })
      .limit(100)

    // Aggregate current usage by meter
    const currentUsage: Record<string, number> = {}
    for (const record of currentRecords || []) {
      currentUsage[record.meter_id] = (currentUsage[record.meter_id] || 0) + Number(record.quantity)
    }

    return NextResponse.json({
      meters: meters || [],
      summaries: summaries || [],
      currentUsage,
    })
  },
})
