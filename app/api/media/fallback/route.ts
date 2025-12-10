import { type NextRequest, NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { z } from 'zod'

const fallbackSchema = z.object({
  productId: z.string().uuid().optional(),
  mainPurposeId: z.string().uuid().optional(),
  subPurposeId: z.string().uuid().optional(),
})

export async function GET(request: NextRequest) {
  const supabase = await createServerRlsClient()
  const { searchParams } = new URL(request.url)

  const parsed = fallbackSchema.safeParse({
    productId: searchParams.get('productId'),
    mainPurposeId: searchParams.get('mainPurposeId'),
    subPurposeId: searchParams.get('subPurposeId'),
  })

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid parameters', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { productId, mainPurposeId, subPurposeId } = parsed.data

  // Try sub-purpose specific image first
  if (subPurposeId) {
    const { data: subPurposeTemplate } = await supabase
      .from('media_templates')
      .select('media:media(*)')
      .eq('sub_purpose_id', subPurposeId)
      .order('priority', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (subPurposeTemplate?.media) {
      return NextResponse.json({ media: subPurposeTemplate.media, source: 'sub_purpose' })
    }
  }

  // Try main purpose + product combination
  if (mainPurposeId && productId) {
    const { data: purposeProductTemplate } = await supabase
      .from('media_templates')
      .select('media:media(*)')
      .eq('main_purpose_id', mainPurposeId)
      .eq('product_id', productId)
      .is('sub_purpose_id', null)
      .order('priority', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (purposeProductTemplate?.media) {
      return NextResponse.json({ media: purposeProductTemplate.media, source: 'purpose_product' })
    }
  }

  // Try main purpose only
  if (mainPurposeId) {
    const { data: purposeTemplate } = await supabase
      .from('media_templates')
      .select('media:media(*)')
      .eq('main_purpose_id', mainPurposeId)
      .is('product_id', null)
      .is('sub_purpose_id', null)
      .order('priority', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (purposeTemplate?.media) {
      return NextResponse.json({ media: purposeTemplate.media, source: 'purpose' })
    }
  }

  // Try product only
  if (productId) {
    const { data: productTemplate } = await supabase
      .from('media_templates')
      .select('media:media(*)')
      .eq('product_id', productId)
      .is('main_purpose_id', null)
      .is('sub_purpose_id', null)
      .order('priority', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (productTemplate?.media) {
      return NextResponse.json({ media: productTemplate.media, source: 'product' })
    }
  }

  // Global fallback - marked as default
  const { data: globalTemplate } = await supabase
    .from('media_templates')
    .select('media:media(*)')
    .eq('is_default', true)
    .is('product_id', null)
    .is('main_purpose_id', null)
    .is('sub_purpose_id', null)
    .order('priority', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (globalTemplate?.media) {
    return NextResponse.json({ media: globalTemplate.media, source: 'global' })
  }

  // No fallback found
  return NextResponse.json({ media: null, source: 'none' }, { status: 404 })
}
