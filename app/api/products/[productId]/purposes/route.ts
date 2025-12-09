import { NextRequest, NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import type { Database } from '@/types/supabase'

type ProductPurposeRow = Database['public']['Tables']['product_purposes']['Row']

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { productId } = await params
  const supabase = await createServerRlsClient()
  const body = (await request.json().catch(() => ({}))) as { purpose_id?: string }

  if (!productId || !body.purpose_id) {
    return NextResponse.json({ error: 'productId and purpose_id are required' }, { status: 400 })
  }

  const insertPayload: ProductPurposeRow = {
    product_id: productId,
    purpose_id: body.purpose_id,
  }

  const { data, error } = await supabase
    .from('product_purposes')
    .insert(insertPayload)
    .select('product_id,purpose_id')
    .single()

  if (error) {
    console.error('[api/products/:id/purposes] insert error', error)
    return NextResponse.json({ error: 'Failed to add purpose to product' }, { status: 500 })
  }

  return NextResponse.json({ mapping: data })
}
