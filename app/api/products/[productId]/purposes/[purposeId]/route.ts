import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { apiHandler } from '@/lib/api/route-handler'

export const DELETE = apiHandler({
  auth: 'user',
  handler: async ({ params }) => {
    const { productId, purposeId } = params
    const supabase = await createServerRlsClient()

    if (!productId || !purposeId) {
      return NextResponse.json({ error: 'productId and purposeId are required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('product_purposes')
      .delete()
      .eq('product_id', productId)
      .eq('purpose_id', purposeId)

    if (error) {
      console.error('[api/products/:id/purposes/:purposeId] delete error', error)
      return NextResponse.json({ error: 'Failed to remove purpose from product' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  },
})
