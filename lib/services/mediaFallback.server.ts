import 'server-only'

import { createServerRlsClient } from '@/lib/supabase/server'

type FallbackSource = 'sub_purpose' | 'purpose_product' | 'purpose' | 'product' | 'global' | 'none'

export type FallbackResult = {
  url: string | null
  mediaId: string | null
  source: FallbackSource
}

/**
 * Get fallback image for a game based on product and purpose hierarchy
 */
export async function getGameFallbackImage(params: {
  productId?: string | null
  mainPurposeId?: string | null
  subPurposeId?: string | null
}): Promise<FallbackResult> {
  const supabase = await createServerRlsClient()
  const { productId, mainPurposeId, subPurposeId } = params

  // Try sub-purpose specific image first
  if (subPurposeId) {
    const { data: subPurposeTemplate } = await supabase
      .from('media_templates')
      .select('media_id, media:media(url)')
      .eq('sub_purpose_id', subPurposeId)
      .order('priority', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (subPurposeTemplate?.media) {
      return {
        url: (subPurposeTemplate.media as { url?: string })?.url ?? null,
        mediaId: subPurposeTemplate.media_id,
        source: 'sub_purpose',
      }
    }
  }

  // Try main purpose + product combination
  if (mainPurposeId && productId) {
    const { data: purposeProductTemplate } = await supabase
      .from('media_templates')
      .select('media_id, media:media(url)')
      .eq('main_purpose_id', mainPurposeId)
      .eq('product_id', productId)
      .is('sub_purpose_id', null)
      .order('priority', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (purposeProductTemplate?.media) {
      return {
        url: (purposeProductTemplate.media as { url?: string })?.url ?? null,
        mediaId: purposeProductTemplate.media_id,
        source: 'purpose_product',
      }
    }
  }

  // Try main purpose only
  if (mainPurposeId) {
    const { data: purposeTemplate } = await supabase
      .from('media_templates')
      .select('media_id, media:media(url)')
      .eq('main_purpose_id', mainPurposeId)
      .is('product_id', null)
      .is('sub_purpose_id', null)
      .order('priority', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (purposeTemplate?.media) {
      return {
        url: (purposeTemplate.media as { url?: string })?.url ?? null,
        mediaId: purposeTemplate.media_id,
        source: 'purpose',
      }
    }
  }

  // Try product only
  if (productId) {
    const { data: productTemplate } = await supabase
      .from('media_templates')
      .select('media_id, media:media(url)')
      .eq('product_id', productId)
      .is('main_purpose_id', null)
      .is('sub_purpose_id', null)
      .order('priority', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (productTemplate?.media) {
      return {
        url: (productTemplate.media as { url?: string })?.url ?? null,
        mediaId: productTemplate.media_id,
        source: 'product',
      }
    }
  }

  // Global fallback - marked as default
  const { data: globalTemplate } = await supabase
    .from('media_templates')
    .select('media_id, media:media(url)')
    .eq('is_default', true)
    .is('product_id', null)
    .is('main_purpose_id', null)
    .is('sub_purpose_id', null)
    .order('priority', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (globalTemplate?.media) {
    return {
      url: (globalTemplate.media as { url?: string })?.url ?? null,
      mediaId: globalTemplate.media_id,
      source: 'global',
    }
  }

  // No fallback found
  return {
    url: null,
    mediaId: null,
    source: 'none',
  }
}

/**
 * Get cover URL for a game with fallback support
 */
export async function getGameCoverWithFallback(params: {
  gameId: string
  productId?: string | null
  mainPurposeId?: string | null
  subPurposeId?: string | null
}): Promise<FallbackResult> {
  const supabase = await createServerRlsClient()
  const { gameId, productId, mainPurposeId, subPurposeId } = params

  // Try to get game's explicit cover
  const { data: gameMedia } = await supabase
    .from('game_media')
    .select('media:media(id, url)')
    .eq('game_id', gameId)
    .eq('kind', 'cover')
    .order('position', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (gameMedia?.media) {
    return {
      url: (gameMedia.media as { url?: string })?.url ?? null,
      mediaId: (gameMedia.media as { id?: string })?.id ?? null,
      source: 'sub_purpose', // Using sub_purpose as indicator for explicit game media
    }
  }

  // Fallback to purpose/product hierarchy
  return getGameFallbackImage({ productId, mainPurposeId, subPurposeId })
}
