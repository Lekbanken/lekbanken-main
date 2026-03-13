import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { validateProductPayload } from '@/lib/validation/products'
import { apiHandler } from '@/lib/api/route-handler'
import type { Database } from '@/types/supabase'

type ProductRow = Database['public']['Tables']['products']['Row']

export const GET = apiHandler({
  auth: 'public',
  handler: async ({ params }) => {
  const { productId } = params
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
  },
})

export const PATCH = apiHandler({
  auth: 'system_admin',
  handler: async ({ req, params }) => {
  const { productId } = params
  const supabase = await createServerRlsClient()

  const body = (await req.json().catch(() => ({}))) as Partial<ProductRow>

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
    updates.product_key = body.product_key!.trim().toLowerCase()
  }

  const { data, error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', productId)
    .select('*,purposes:product_purposes(purpose:purposes(*))')
    .single()

  if (error) {
    // 23505 = unique_violation (product_key already exists)
    if (error.code === '23505') {
      return NextResponse.json(
        { error: `product_key "${updates.product_key}" already exists` },
        { status: 409 },
      )
    }
    console.error('[api/products/:id] update error', error)
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 })
  }

  return NextResponse.json({ product: data })
  },
})

export const DELETE = apiHandler({
  auth: 'system_admin',
  handler: async ({ params }) => {
  const { productId } = params
  const supabase = await createServerRlsClient()

  const { error } = await supabase.from('products').delete().eq('id', productId)

  if (error) {
    console.error('[api/products/:id] delete error', error)
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
  },
})
