import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createServerRlsClient } from '@/lib/supabase/server'
import { assertTenantAdminOrSystem, isSystemAdmin } from '@/lib/utils/tenantAuth'
import type { Json } from '@/types/supabase'

export const dynamic = 'force-dynamic'

// Type for Supabase client with badge_presets table (not yet in generated types)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClientWithPresets = any

// Schema for icon config validation (matches AchievementIconConfig)
const iconConfigSchema = z.object({
  themeId: z.string().optional(),
  base: z.object({ id: z.string(), color: z.string().optional() }).nullable().optional(),
  symbol: z.object({ id: z.string(), color: z.string().optional() }).nullable().optional(),
  backgrounds: z.array(z.unknown()).optional(),
  foregrounds: z.array(z.unknown()).optional(),
}).passthrough()

const createPresetSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  iconConfig: iconConfigSchema,
  category: z.enum(['custom', 'system', 'template']).optional().default('custom'),
  tags: z.array(z.string().max(50)).max(10).optional().default([]),
  tenantId: z.string().uuid().nullable().optional(),
})

const listQuerySchema = z.object({
  tenantId: z.string().uuid().nullable().optional(),
  category: z.enum(['custom', 'system', 'template']).optional(),
  includeGlobal: z.coerce.boolean().optional().default(true),
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

async function requireAuth() {
  const supabase = await createServerRlsClient() as SupabaseClientWithPresets
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) return { user: null, supabase: null, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  return { user, supabase, response: null }
}

/**
 * GET /api/admin/award-builder/presets
 * List presets for a tenant (+ optional global presets)
 */
export async function GET(req: NextRequest) {
  const { user, supabase, response } = await requireAuth()
  if (response) return response

  const url = new URL(req.url)
  const parsed = listQuerySchema.safeParse({
    tenantId: url.searchParams.get('tenantId'),
    category: url.searchParams.get('category') || undefined,
    includeGlobal: url.searchParams.get('includeGlobal') ?? 'true',
  })

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query', details: parsed.error.flatten() }, { status: 400 })
  }

  const { tenantId, category, includeGlobal } = parsed.data

  // Tenant-scoped queries require membership check
  if (tenantId) {
    const allowed = await assertTenantAdminOrSystem(tenantId, user)
    if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  
  // Build query - RLS will handle visibility
  // Table may not exist in generated types until migration runs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('badge_presets')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  // Apply filters
  if (tenantId && includeGlobal) {
    // Get tenant presets + global presets
    query = query.or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
  } else if (tenantId) {
    // Only tenant presets
    query = query.eq('tenant_id', tenantId)
  } else if (includeGlobal) {
    // Only global presets
    query = query.is('tenant_id', null)
  }

  if (category) {
    query = query.eq('category', category)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: 'Failed to list presets', details: error.message }, { status: 500 })
  }

  return NextResponse.json({ presets: (data ?? []) as BadgePresetRow[] }, { status: 200 })
}

/**
 * POST /api/admin/award-builder/presets
 * Create a new preset
 */
export async function POST(req: NextRequest) {
  const { user, supabase, response } = await requireAuth()
  if (response) return response

  const body = await req.json().catch(() => ({}))
  const parsed = createPresetSchema.safeParse(body)
  
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 })
  }

  const { name, description, iconConfig, category, tags, tenantId } = parsed.data

  // Authorization
  if (tenantId === null) {
    // Global preset - system admin only
    if (!isSystemAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden: System admin required for global presets' }, { status: 403 })
    }
  } else if (tenantId) {
    // Tenant preset - tenant admin or system admin
    const allowed = await assertTenantAdminOrSystem(tenantId, user)
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('badge_presets')
    .insert({
      tenant_id: tenantId ?? null,
      name,
      description: description ?? null,
      icon_config: iconConfig as unknown as Json,
      category,
      tags,
      created_by_user_id: user.id,
    })
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to create preset', details: error.message }, { status: 500 })
  }

  return NextResponse.json({ id: data?.id }, { status: 201 })
}
