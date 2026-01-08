import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createServerRlsClient } from '@/lib/supabase/server'
import { isSystemAdmin } from '@/lib/utils/tenantAuth'
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

async function requireAuth() {
  const supabase = await createServerRlsClient() as SupabaseClientAny
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) return { user: null, supabase: null, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  return { user, supabase, response: null }
}

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
export async function GET(_req: NextRequest, context: { params: Promise<{ presetId: string }> }) {
  const { supabase, response } = await requireAuth()
  if (response) return response

  const { presetId } = await context.params
  const { preset, response: presetResp } = await getPresetOr404(supabase, presetId)
  if (presetResp) return presetResp

  return NextResponse.json({ preset }, { status: 200 })
}

/**
 * PUT /api/admin/award-builder/presets/[presetId]
 * Update a preset
 */
export async function PUT(req: NextRequest, context: { params: Promise<{ presetId: string }> }) {
  const { user, supabase, response } = await requireAuth()
  if (response) return response

  const { presetId } = await context.params
  const { preset, response: presetResp } = await getPresetOr404(supabase, presetId)
  if (presetResp) return presetResp

  // Authorization is handled by RLS, but we can add extra checks
  // RLS allows: system admin, creator, or tenant admin for tenant presets
  const canEdit = 
    isSystemAdmin(user) ||
    preset.created_by_user_id === user.id

  if (!canEdit) {
    // Let RLS handle the actual enforcement, but provide better error message
    // If RLS blocks, it will return 0 rows affected
  }

  const body = await req.json().catch(() => ({}))
  const parsed = updatePresetSchema.safeParse(body)
  
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  if (parsed.data.name !== undefined) updates.name = parsed.data.name
  if (parsed.data.description !== undefined) updates.description = parsed.data.description
  if (parsed.data.iconConfig !== undefined) updates.icon_config = parsed.data.iconConfig as unknown as Json
  if (parsed.data.category !== undefined) updates.category = parsed.data.category
  if (parsed.data.tags !== undefined) updates.tags = parsed.data.tags

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No updates provided' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('badge_presets')
    .update(updates)
    .eq('id', presetId)

  if (error) {
    return NextResponse.json({ error: 'Failed to update preset', details: error.message }, { status: 500 })
  }

  return NextResponse.json({ id: presetId }, { status: 200 })
}

/**
 * DELETE /api/admin/award-builder/presets/[presetId]
 * Delete a preset
 */
export async function DELETE(_req: NextRequest, context: { params: Promise<{ presetId: string }> }) {
  const { supabase, response } = await requireAuth()
  if (response) return response

  const { presetId } = await context.params
  const { response: presetResp } = await getPresetOr404(supabase, presetId)
  if (presetResp) return presetResp

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('badge_presets')
    .delete()
    .eq('id', presetId)

  if (error) {
    return NextResponse.json({ error: 'Failed to delete preset', details: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true }, { status: 200 })
}

/**
 * POST /api/admin/award-builder/presets/[presetId]
 * Increment usage count when a preset is loaded
 */
export async function POST(_req: NextRequest, context: { params: Promise<{ presetId: string }> }) {
  const { supabase, response } = await requireAuth()
  if (response) return response

  const { presetId } = await context.params
  const { response: presetResp } = await getPresetOr404(supabase, presetId)
  if (presetResp) return presetResp

  // Call the RPC function to increment usage
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).rpc('badge_preset_increment_usage', { preset_id: presetId })

  if (error) {
    // Non-critical - log but don't fail
    console.error('Failed to increment preset usage:', error)
  }

  return NextResponse.json({ ok: true }, { status: 200 })
}
