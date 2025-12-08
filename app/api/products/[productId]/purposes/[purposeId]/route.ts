import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'

export async function DELETE(
  _request: Request,
  { params }: { params: { productId: string; purposeId: string } }
) {
  const supabase = await createServerRlsClient()

  if (!params.productId || !params.purposeId) {
    return NextResponse.json({ error: 'productId and purposeId are required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('product_purposes')
    .delete()
    .eq('product_id', params.productId)
    .eq('purpose_id', params.purposeId)

  if (error) {
    console.error('[api/products/:id/purposes/:purposeId] delete error', error)
    return NextResponse.json({ error: 'Failed to remove purpose from product' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
