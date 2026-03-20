import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase/server'
import { apiHandler } from '@/lib/api/route-handler'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST: Aggregate usage for a billing period (typically called by a cron job)
export const POST = apiHandler({
  auth: 'public',
  handler: async ({ req }) => {
    // Only allow internal API calls
    const apiKey = req.headers.get('x-api-key')
    const internalSecret = process.env.INTERNAL_API_SECRET

    const keyValid = apiKey && internalSecret &&
      apiKey.length === internalSecret.length &&
      timingSafeEqual(Buffer.from(apiKey), Buffer.from(internalSecret))
    if (!keyValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: { tenantId?: string; periodStart?: string; periodEnd?: string } = {}
    try {
      body = await req.json()
    } catch {
      // Allow empty body for aggregate all
    }

    const { tenantId, periodStart, periodEnd } = body

    if (tenantId) {
      return NextResponse.json(
        { error: 'Tenant-scoped aggregation is not supported by the canonical billing aggregator' },
        { status: 400 },
      )
    }

    const now = new Date()
    const defaultEnd = new Date(now.getFullYear(), now.getMonth(), 0)
    const defaultStart = new Date(defaultEnd.getFullYear(), defaultEnd.getMonth(), 1)

    const start = periodStart || defaultStart.toISOString().split('T')[0]
    const end = periodEnd || defaultEnd.toISOString().split('T')[0]

    const { data: processedCount, error } = await supabaseAdmin.rpc('aggregate_usage_for_period', {
      p_period_start: start,
      p_period_end: end,
    })

    if (error) {
      console.error('[usage aggregate API] Aggregate error:', error)
      return NextResponse.json({ error: 'Failed to aggregate usage' }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Aggregation complete',
      period: { start, end },
      summary: {
        processed: processedCount ?? 0,
      },
    })
  },
})

// GET: Get usage summaries for admin
export const GET = apiHandler({
  auth: 'system_admin',
  handler: async ({ req }) => {
    const url = new URL(req.url)
    const meterSlug = url.searchParams.get('meter')
    const period = url.searchParams.get('period') || 'current'

    // Calculate period dates
    const now = new Date()
    let periodStart: Date
    let periodEnd: Date

    if (period === 'current') {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
      periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    } else if (period === 'previous') {
      periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      periodEnd = new Date(now.getFullYear(), now.getMonth(), 0)
    } else {
      // Default to last 30 days
      periodEnd = now
      periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }

    // Get usage summaries grouped by tenant
    let query = supabaseAdmin
      .from('usage_summaries')
      .select(`
        *,
        meter:usage_meters(id, name, slug, unit_name),
        tenant:tenants(id, name)
      `)
      .gte('period_start', periodStart.toISOString().split('T')[0])
      .lte('period_end', periodEnd.toISOString().split('T')[0])
      .order('total_quantity', { ascending: false })

    if (meterSlug) {
      const { data: meter } = await supabaseAdmin
        .from('usage_meters')
        .select('id')
        .eq('slug', meterSlug)
        .single()
      
      if (meter) {
        query = query.eq('meter_id', meter.id)
      }
    }

    const { data: summaries, error } = await query.limit(100)

    if (error) {
      console.error('[usage summary API] Query error:', error)
      return NextResponse.json({ error: 'Failed to fetch summaries' }, { status: 500 })
    }

    // Get total usage stats
    const { data: meters } = await supabaseAdmin
      .from('usage_meters')
      .select('*')
      .eq('status', 'active')

    // Calculate totals per meter
    const totalsByMeter: Record<string, { meter: { name: string; slug: string; unit_name: string }; total: number; tenantCount: number }> = {}
    
    for (const summary of summaries || []) {
      const meterId = summary.meter_id
      if (!totalsByMeter[meterId]) {
        totalsByMeter[meterId] = {
          meter: summary.meter as { name: string; slug: string; unit_name: string },
          total: 0,
          tenantCount: 0,
        }
      }
      totalsByMeter[meterId].total += Number(summary.total_quantity)
      totalsByMeter[meterId].tenantCount += 1
    }

    return NextResponse.json({
      period: {
        start: periodStart.toISOString().split('T')[0],
        end: periodEnd.toISOString().split('T')[0],
      },
      meters: meters || [],
      summaries: summaries || [],
      totals: Object.values(totalsByMeter),
    })
  },
})
