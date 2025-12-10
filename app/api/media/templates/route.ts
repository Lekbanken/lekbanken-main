import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/media/templates
 * List all media template mappings
 */
export async function GET(_request: NextRequest) {
  const supabase = await createServerRlsClient()

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: templates, error } = await supabase.from('media_templates').select(`
        id,
        template_key,
        name,
        description,
        product_id,
        main_purpose_id,
        sub_purpose_id,
        media_id,
        priority,
        is_default,
        created_at,
        updated_at,
        media:media_id (
          id,
          name,
          url,
          alt_text
        ),
        main_purpose:main_purpose_id (
          id,
          name
        ),
        sub_purpose:sub_purpose_id (
          id,
          name
        ),
        product:product_id (
          id,
          name
        )
      `).order('priority', { ascending: false }).order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch templates:', error)
      return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 })
    }

    return NextResponse.json({ templates })
  } catch (error) {
    console.error('Error in GET /api/media/templates:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/media/templates
 * Create a new media template mapping
 */
export async function POST(request: NextRequest) {
  const supabase = await createServerRlsClient()

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { productId, mainPurposeId, subPurposeId, mediaId, templateKey, name, description, priority, isDefault } = body

    if (!mainPurposeId || !mediaId || !templateKey || !name) {
      return NextResponse.json(
        { error: 'mainPurposeId, mediaId, templateKey, and name are required' },
        { status: 400 }
      )
    }

    // Check if template_key already exists
    const { data: existing } = await supabase.from('media_templates')
      .select('id')
      .eq('template_key', templateKey)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'A template with this template_key already exists' },
        { status: 409 }
      )
    }

    const { data: template, error } = await supabase.from('media_templates').insert({
        template_key: templateKey,
        name,
        description: description || null,
        product_id: productId || null,
        main_purpose_id: mainPurposeId,
        sub_purpose_id: subPurposeId || null,
        media_id: mediaId,
        priority: priority || 0,
        is_default: isDefault || false,
      }).select().single()

    if (error) {
      console.error('Failed to create template:', error)
      return NextResponse.json({ error: 'Failed to create template' }, { status: 500 })
    }

    return NextResponse.json({ template }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/media/templates:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
