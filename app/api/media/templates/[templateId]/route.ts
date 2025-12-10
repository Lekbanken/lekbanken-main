import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type RouteParams = {
  params: Promise<{
    templateId: string
  }>
}

/**
 * DELETE /api/media/templates/[templateId]
 * Delete a media template mapping
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const supabase = await createServerRlsClient()
  const { templateId } = await params

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await supabase
      .from('media_templates')
      .delete()
      .eq('id', templateId)

    if (error) {
      console.error('Failed to delete template:', error)
      return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/media/templates/[templateId]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
