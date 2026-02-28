import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { validateProductPayload } from '@/lib/validation/products'
import { isSystemAdmin } from '@/lib/utils/tenantAuth'
import type { Database } from '@/types/supabase'
import { TimeoutError } from '@/lib/utils/withTimeout'

type ProductRow = Database['public']['Tables']['products']['Row']

export async function GET() {
  try {
    const supabase = await createServerRlsClient()

    const { data, error } = await supabase
      .from('products')
      .select('*,purposes:product_purposes(purpose:purposes(*))')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[api/products] fetch error', error)
      return NextResponse.json({ error: 'Failed to load products' }, { status: 500 })
    }

    return NextResponse.json({ products: data ?? [] })
  } catch (err) {
    const status = err instanceof TimeoutError ? 504 : 500
    const message = err instanceof Error ? err.message : String(err)
    console.error('[api/products] unhandled error', err)
    return NextResponse.json({ error: 'Failed to load products', details: message }, { status })
  }
}

export async function POST(request: Request) {
  const supabase = await createServerRlsClient()

  // Authentication: only system_admin can create products
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isSystemAdmin(user)) {
    return NextResponse.json({ error: 'Forbidden - system_admin required' }, { status: 403 })
  }

  const body = (await request.json().catch(() => ({}))) as Partial<ProductRow>

  const validation = validateProductPayload(body, { mode: 'create' })
  if (!validation.ok) {
    return NextResponse.json({ errors: validation.errors }, { status: 400 })
  }

  const payload = {
    name: body.name?.trim() || '',
    category: body.category?.trim() || 'general',
    description: body.description?.trim() || null,
    status: body.status || 'active',
    capabilities: Array.isArray(body.capabilities) ? body.capabilities : [],
    product_key: body.product_key!.trim(),
  } as const

  const { data, error } = await supabase
    .from('products')
    .insert(payload)
    .select('*,purposes:product_purposes(purpose:purposes(*))')
    .single()

  if (error) {
    // 23505 = unique_violation (product_key already exists)
    if (error.code === '23505') {
      return NextResponse.json(
        { error: `product_key "${payload.product_key}" already exists` },
        { status: 409 },
      )
    }
    console.error('[api/products] insert error', error)
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
  }

  return NextResponse.json({ product: data }, { status: 201 })
}
