import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { apiHandler } from '@/lib/api/route-handler'

export const dynamic = 'force-dynamic'

/**
 * DELETE /api/media/templates/[templateId]
 * Delete a media template mapping
 */
export const DELETE = apiHandler({
  auth: 'user',
  handler: async ({ params }) => {
  const { templateId } = params
  const supabase = await createServerRlsClient()

  try {
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
  },
})
