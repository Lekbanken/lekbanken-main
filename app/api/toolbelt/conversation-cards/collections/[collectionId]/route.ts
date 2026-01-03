import { NextResponse, type NextRequest } from 'next/server'

import { createServerRlsClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status })
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ collectionId: string }> }) {
  const collectionId = (await params).collectionId
  const supabase = await createServerRlsClient()

  const { data: collection, error: colError } = await supabase
    .from('conversation_card_collections')
    .select('id,scope_type,tenant_id,title,description,audience,language,main_purpose_id,status')
    .eq('id', collectionId)
    .maybeSingle()

  if (colError) {
    console.error('[api/toolbelt/conversation-cards] load collection error', colError)
    return jsonError(500, 'Failed to load collection')
  }

  if (!collection) return jsonError(404, 'Not found')
  if (collection.status !== 'published') return jsonError(403, 'Forbidden')

  const { data: cards, error: cardsError } = await supabase
    .from('conversation_cards')
    .select('id,sort_order,card_title,primary_prompt,followup_1,followup_2,followup_3,leader_tip,metadata')
    .eq('collection_id', collectionId)
    .order('sort_order', { ascending: true })

  if (cardsError) {
    console.error('[api/toolbelt/conversation-cards] load cards error', cardsError)
    return jsonError(500, 'Failed to load cards')
  }

  return NextResponse.json({ collection, cards: cards ?? [] })
}
