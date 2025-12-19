import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { validateProductPayload } from '@/lib/validation/products'
import type { Database } from '@/types/supabase'

type ProductRow = Database['public']['Tables']['products']['Row']

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { productId } = await params
  const supabase = await createServerRlsClient()
  const { data, error } = await supabase
    .from('products')
    .select('*,purposes:product_purposes(purpose:purposes(*))')
    .eq('id', productId)
    .single()

  if (error) {
    console.error('[api/products/:id] fetch error', error)
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ product: data })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { productId } = await params
  const supabase = await createServerRlsClient()
  const body = (await request.json().catch(() => ({}))) as Partial<ProductRow>

  const validation = validateProductPayload(body, { mode: 'update' })
  if (!validation.ok) {
    return NextResponse.json({ errors: validation.errors }, { status: 400 })
  }

  const updates: Partial<ProductRow> = {
    updated_at: new Date().toISOString(),
  }

  if (body.name !== undefined) updates.name = body.name.trim()
  if (body.category !== undefined) updates.category = body.category.trim()
  if (body.description !== undefined) updates.description = body.description?.trim() || null
  if (body.status !== undefined) updates.status = body.status
  if (body.capabilities !== undefined) {
    updates.capabilities = Array.isArray(body.capabilities) ? body.capabilities : []
  }
  if (body.product_key !== undefined) {
    updates.product_key = body.product_key?.trim() || null
  }

  const { data, error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', productId)
    .select('*,purposes:product_purposes(purpose:purposes(*))')
    .single()

  if (error) {
    console.error('[api/products/:id] update error', error)
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 })
  }

  return NextResponse.json({ product: data })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { productId } = await params
  const supabase = await createServerRlsClient()
  const { error } = await supabase.from('products').delete().eq('id', productId)

  if (error) {
    console.error('[api/products/:id] delete error', error)
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
