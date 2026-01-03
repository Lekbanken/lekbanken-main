import { NextResponse, type NextRequest } from 'next/server'

import { createServerRlsClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status })
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const scopeType = url.searchParams.get('scopeType')

  const supabase = await createServerRlsClient()

  let query = supabase
    .from('conversation_card_collections')
    .select('id,scope_type,tenant_id,title,description,audience,language,main_purpose_id,status,updated_at')
    .eq('status', 'published')
    .order('updated_at', { ascending: false })
    .limit(200)

  if (scopeType === 'global') query = query.eq('scope_type', 'global').is('tenant_id', null)
  if (scopeType === 'tenant') query = query.eq('scope_type', 'tenant')

  const { data, error } = await query
  if (error) {
    console.error('[api/toolbelt/conversation-cards] list error', error)
    return jsonError(500, 'Failed to load collections')
  }

  return NextResponse.json({ collections: data ?? [] })
}
