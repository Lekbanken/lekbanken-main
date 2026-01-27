import { NextResponse } from 'next/server'
import { supabaseAdmin, getAuthUser } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST: Aggregate usage for a billing period (typically called by a cron job)
export async function POST(request: Request) {
  // Only allow internal API calls
  const apiKey = request.headers.get('x-api-key')
  const internalSecret = process.env.INTERNAL_API_SECRET

  if (!apiKey || !internalSecret || apiKey !== internalSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { tenantId?: string; periodStart?: string; periodEnd?: string } = {}
  try {
    body = await request.json()
  } catch {
    // Allow empty body for aggregate all
  }

  const { tenantId, periodStart, periodEnd } = body

  // Default to previous month if not specified
  const now = new Date()
  const defaultEnd = new Date(now.getFullYear(), now.getMonth(), 0) // Last day of previous month
  const defaultStart = new Date(defaultEnd.getFullYear(), defaultEnd.getMonth(), 1) // First day of previous month

  const start = periodStart || defaultStart.toISOString().split('T')[0]
  const end = periodEnd || defaultEnd.toISOString().split('T')[0]

  try {
    // Get active meters
    const { data: meters } = await supabaseAdmin
      .from('usage_meters')
      .select('id, slug')
      .eq('status', 'active')

    if (!meters || meters.length === 0) {
      return NextResponse.json({ message: 'No active meters' })
    }

    // Get tenants to aggregate
    let tenantsQuery = supabaseAdmin
      .from('tenants')
      .select('id')
      .eq('status', 'active')

    if (tenantId) {
      tenantsQuery = tenantsQuery.eq('id', tenantId)
    }

    const { data: tenants } = await tenantsQuery

    if (!tenants || tenants.length === 0) {
      return NextResponse.json({ message: 'No tenants to aggregate' })
    }

    const results: { tenantId: string; meterId: string; success: boolean; error?: string }[] = []

    // Aggregate for each tenant and meter
    for (const tenant of tenants) {
      for (const meter of meters) {
        const { error } = await supabaseAdmin.rpc('aggregate_usage_for_period' as never, {
          p_tenant_id: tenant.id,
          p_meter_id: meter.id,
          p_period_start: start,
          p_period_end: end,
        } as never)

        if (error) {
          results.push({
            tenantId: tenant.id,
            meterId: meter.id,
            success: false,
            error: error.message,
          })
        } else {
          results.push({
            tenantId: tenant.id,
            meterId: meter.id,
            success: true,
          })
        }
      }
    }

    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length

    return NextResponse.json({
      message: `Aggregation complete`,
      period: { start, end },
      summary: {
        total: results.length,
        success: successCount,
        failed: failCount,
      },
      errors: results.filter(r => !r.success),
    })
  } catch (error) {
    console.error('[usage aggregate API] Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// GET: Get usage summaries for admin
export async function GET(request: Request) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Check if system admin using RPC function
  const { data: isAdmin } = await supabaseAdmin.rpc('is_system_admin')

  if (!isAdmin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const url = new URL(request.url)
  const meterSlug = url.searchParams.get('meter')
  const period = url.searchParams.get('period') || 'current'

  try {
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
  } catch (error) {
    console.error('[usage summary API] Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
