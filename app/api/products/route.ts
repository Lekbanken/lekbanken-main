import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { validateProductPayload } from '@/lib/validation/products'
import type { Database } from '@/types/supabase'

type ProductRow = Database['public']['Tables']['products']['Row']

export async function GET() {
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
}

export async function POST(request: Request) {
  const supabase = await createServerRlsClient()
  const body = (await request.json().catch(() => ({}))) as Partial<ProductRow>

  const validation = validateProductPayload(body as any, { mode: 'create' })
  if (!validation.ok) {
    return NextResponse.json({ errors: validation.errors }, { status: 400 })
  }

  const payload: Partial<ProductRow> = {
    name: body.name?.trim() || '',
    category: body.category?.trim() || '',
    description: body.description?.trim() || null,
    status: body.status || 'active',
    capabilities: Array.isArray(body.capabilities) ? body.capabilities : [],
    product_key: body.product_key?.trim() || null,
  }

  const { data, error } = await supabase
    .from('products')
    .insert(payload as any)
    .select('*,purposes:product_purposes(purpose:purposes(*))')
    .single()

  if (error) {
    console.error('[api/products] insert error', error)
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
  }

  return NextResponse.json({ product: data }, { status: 201 })
}
