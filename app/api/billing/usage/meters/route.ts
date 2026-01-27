import { NextResponse } from 'next/server'
import { supabaseAdmin, getAuthUser } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET: Get active usage meters
export async function GET() {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  try {
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
  } catch (error) {
    console.error('[usage meters API] Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// POST: Create a new usage meter (admin only)
export async function POST(request: Request) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Check if system admin using RPC function
  const { data: isAdmin } = await supabaseAdmin.rpc('is_system_admin')

  if (!isAdmin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { name, slug, description, unitName, aggregationType, defaultTieredPricing } = body as {
    name?: string
    slug?: string
    description?: string
    unitName?: string
    aggregationType?: string
    defaultTieredPricing?: unknown
  }

  if (!name || !slug || !unitName) {
    return NextResponse.json({ error: 'name, slug, and unitName required' }, { status: 400 })
  }

  // Validate slug format
  if (!/^[a-z0-9_]+$/.test(slug)) {
    return NextResponse.json({ error: 'slug must be lowercase alphanumeric with underscores' }, { status: 400 })
  }

  try {
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
  } catch (error) {
    console.error('[usage meters API] Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
