import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerRlsClient } from '@/lib/supabase/server'
import { apiHandler } from '@/lib/api/route-handler'
import type { Json } from '@/types/supabase'

export const dynamic = 'force-dynamic'

const iconConfigSchema = z.object({
  themeId: z.string().optional(),
  base: z.object({ id: z.string(), color: z.string().optional() }).nullable().optional(),
  symbol: z.object({ id: z.string(), color: z.string().optional() }).nullable().optional(),
  backgrounds: z.array(z.unknown()).optional(),
  foregrounds: z.array(z.unknown()).optional(),
}).passthrough()

const updatePresetSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  iconConfig: iconConfigSchema.optional(),
  category: z.enum(['custom', 'system', 'template']).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
})

type BadgePresetRow = {
  id: string
  tenant_id: string | null
  name: string
  description: string | null
  icon_config: unknown
  category: string
  tags: string[]
  usage_count: number
  created_by_user_id: string | null
  created_at: string
  updated_at: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClientAny = any

async function getPresetOr404(supabase: SupabaseClientAny, presetId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('badge_presets')
    .select('*')
    .eq('id', presetId)
    .maybeSingle()

  if (error) {
    return { preset: null, response: NextResponse.json({ error: 'Lookup failed', details: error.message }, { status: 500 }) }
  }
  if (!data) {
    return { preset: null, response: NextResponse.json({ error: 'Not found' }, { status: 404 }) }
  }
  return { preset: data as BadgePresetRow, response: null }
}

/**
 * GET /api/admin/award-builder/presets/[presetId]
 * Get a single preset by ID
 */
export const GET = apiHandler({
  auth: 'user',
  handler: async ({ params }) => {
    const supabase = await createServerRlsClient() as SupabaseClientAny
    const { preset, response } = await getPresetOr404(supabase, params.presetId)
    if (response) return response

    return NextResponse.json({ preset }, { status: 200 })
  },
})

/**
 * PUT /api/admin/award-builder/presets/[presetId]
 * Update a preset
 */
export const PUT = apiHandler({
  auth: 'user',
  input: updatePresetSchema,
  handler: async ({ auth, params, body }) => {
    const supabase = await createServerRlsClient() as SupabaseClientAny
    const { preset, response } = await getPresetOr404(supabase, params.presetId)
    if (response) return response

    // Authorization is handled by RLS, but we can add extra checks
    // RLS allows: system admin, creator, or tenant admin for tenant presets
    const canEdit = 
      auth!.effectiveGlobalRole === 'system_admin' ||
      preset.created_by_user_id === auth!.user!.id

    if (!canEdit) {
      // Let RLS handle the actual enforcement, but provide better error message
      // If RLS blocks, it will return 0 rows affected
    }

    const updates: Record<string, unknown> = {}
    if (body.name !== undefined) updates.name = body.name
    if (body.description !== undefined) updates.description = body.description
    if (body.iconConfig !== undefined) updates.icon_config = body.iconConfig as unknown as Json
    if (body.category !== undefined) updates.category = body.category
    if (body.tags !== undefined) updates.tags = body.tags

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('badge_presets')
      .update(updates)
      .eq('id', params.presetId)

    if (error) {
      return NextResponse.json({ error: 'Failed to update preset', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ id: params.presetId }, { status: 200 })
  },
})

/**
 * DELETE /api/admin/award-builder/presets/[presetId]
 * Delete a preset
 */
export const DELETE = apiHandler({
  auth: 'user',
  handler: async ({ params }) => {
    const supabase = await createServerRlsClient() as SupabaseClientAny
    const { response } = await getPresetOr404(supabase, params.presetId)
    if (response) return response

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('badge_presets')
      .delete()
      .eq('id', params.presetId)

    if (error) {
      return NextResponse.json({ error: 'Failed to delete preset', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true }, { status: 200 })
  },
})

/**
 * POST /api/admin/award-builder/presets/[presetId]
 * Increment usage count when a preset is loaded
 */
export const POST = apiHandler({
  auth: 'user',
  handler: async ({ params }) => {
    const supabase = await createServerRlsClient() as SupabaseClientAny
    const { response } = await getPresetOr404(supabase, params.presetId)
    if (response) return response

    // Call the RPC function to increment usage
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).rpc('badge_preset_increment_usage', { preset_id: params.presetId })

    if (error) {
      // Non-critical - log but don't fail
      console.error('Failed to increment preset usage:', error)
    }

    return NextResponse.json({ ok: true }, { status: 200 })
  },
})
