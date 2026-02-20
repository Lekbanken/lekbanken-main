import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { requireAuth, AuthError } from '@/lib/api/auth-guard'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ productId: string; purposeId: string }> }
) {
  try {
  await requireAuth()
  const { productId, purposeId } = await params
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
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    throw err
  }
}
