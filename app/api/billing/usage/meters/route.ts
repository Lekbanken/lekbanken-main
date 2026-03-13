import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { apiHandler } from '@/lib/api/route-handler'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET: Get active usage meters
export const GET = apiHandler({
  auth: 'user',
  handler: async () => {
    const { data: meters, error } = await supabaseAdmin
      .from('usage_meters')
      .select('*')
      .eq('status', 'active')
      .order('name', { ascending: true })

    if (error) {
      console.error('[usage meters API] Error:', error)
      return NextResponse.json({ error: 'Failed to fetch meters' }, { status: 500 })
    }

    return NextResponse.json({ meters })
  },
})

// POST: Create a new usage meter (admin only)
export const POST = apiHandler({
  auth: 'system_admin',
  handler: async ({ req }) => {
    const body = await req.json() as {
      name?: string
      slug?: string
      description?: string
      unitName?: string
      aggregationType?: string
      defaultTieredPricing?: unknown
    }

    const { name, slug, description, unitName, aggregationType, defaultTieredPricing } = body

    if (!name || !slug || !unitName) {
      return NextResponse.json({ error: 'name, slug, and unitName required' }, { status: 400 })
    }

    // Validate slug format
    if (!/^[a-z0-9_]+$/.test(slug)) {
      return NextResponse.json({ error: 'slug must be lowercase alphanumeric with underscores' }, { status: 400 })
    }

    const { data: meter, error } = await supabaseAdmin
      .from('usage_meters')
      .insert({
        name,
        slug,
        description: description || null,
        unit_name: unitName,
        aggregation_type: aggregationType || 'sum',
        default_tiered_pricing: defaultTieredPricing || null,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Meter with this slug already exists' }, { status: 409 })
      }
      console.error('[usage meters API] Create error:', error)
      return NextResponse.json({ error: 'Failed to create meter' }, { status: 500 })
    }

    return NextResponse.json({ meter }, { status: 201 })
  },
})
