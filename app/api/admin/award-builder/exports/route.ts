import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createServerRlsClient, createServiceRoleClient } from '@/lib/supabase/server'
import { assertTenantAdminOrSystem, isSystemAdmin } from '@/lib/utils/tenantAuth'
import { awardBuilderExportSchemaV1 } from '@/lib/validation/awardBuilderExportSchemaV1'
import { 
  validateBadgeForPublish, 
  shouldValidateForPublish, 
  extractBadgeFromExport 
} from '@/lib/validation/badgeValidation'
import type { Database, Json } from '@/types/supabase'

export const dynamic = 'force-dynamic'

type AwardBuilderExportsTable = {
  Row: {
    id: string
    tenant_id: string | null
    scope_type: string
    schema_version: string
    exported_at: string
    exported_by_user_id: string | null
    exported_by_tool: string | null
    export: Json
    created_at: string
    updated_at: string
  }
  Insert: {
    id?: string
    tenant_id?: string | null
    scope_type: string
    schema_version: string
    exported_at: string
    exported_by_user_id: string | null
    exported_by_tool: string | null
    export: Json
    created_at?: string
    updated_at?: string
  }
  Update: {
    id?: string
    tenant_id?: string | null
    scope_type?: string
    schema_version?: string
    exported_at?: string
    exported_by_user_id?: string | null
    exported_by_tool?: string | null
    export?: Json
    created_at?: string
    updated_at?: string
  }
  Relationships: []
}

type DatabaseWithAwardBuilderExports = Database & {
  public: {
    Tables: Database['public']['Tables'] & {
      award_builder_exports: AwardBuilderExportsTable
    }
  }
}

type AwardBuilderExportListRow = {
  id: string
  tenant_id: string | null
  scope_type: 'global' | 'tenant' | string
  schema_version: string
  exported_at: string
  exported_by_user_id: string | null
  exported_by_tool: string | null
  export?: unknown
  created_at: string
  updated_at: string
}

const scopeSchema = z.object({
  scopeType: z.enum(['global', 'tenant']),
  tenantId: z.string().uuid().nullable().optional(),
})

const exportSchema = z.object({
  tenantId: z.string().uuid().nullable().optional(),
  scopeType: z.enum(['global', 'tenant']),
  schemaVersion: z.string().min(1),
  exportedAt: z.string().datetime().optional(),
  exportedByTool: z.string().min(1).max(64).optional(),
  export: z.unknown(),
})

/**
 * Update export JSON with server-generated ID
 * Replaces client-side export_id and badge item id with the real server ID
 */
function updateExportWithServerId(
  canonical: z.infer<typeof awardBuilderExportSchemaV1>,
  serverId: string
): z.infer<typeof awardBuilderExportSchemaV1> {
  // Update the achievement_key in achievements array to match server ID
  const updated = {
    ...canonical,
    achievements: canonical.achievements.map(achievement => {
      // Update achievement_key and the embedded badge ID in builder params
      const params = achievement.unlock?.unlock_criteria?.params
      let updatedParams = params
      
      if (params && typeof params === 'object' && 'builder' in params) {
        const builder = (params as Record<string, unknown>).builder
        if (builder && typeof builder === 'object' && 'badge' in builder) {
          const badge = (builder as Record<string, unknown>).badge
          if (badge && typeof badge === 'object') {
            updatedParams = {
              ...params,
              builder: {
                ...builder,
                badge: {
                  ...badge,
                  id: serverId,
                }
              }
            }
          }
        }
      }
      
      return {
        ...achievement,
        achievement_key: serverId,
        unlock: {
          ...achievement.unlock,
          unlock_criteria: {
            ...achievement.unlock.unlock_criteria,
            params: updatedParams,
          }
        }
      }
    })
  }

  return updated
}

async function requireAuth() {
  const supabase = await createServerRlsClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) return { user: null, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  return { user, response: null }
}

export async function GET(req: NextRequest) {
  const { user, response } = await requireAuth()
  if (response) return response

  const url = new URL(req.url)
  const scopeTypeRaw = url.searchParams.get('scopeType')
  const tenantIdRaw = url.searchParams.get('tenantId')

  const parsedScope = scopeSchema.safeParse({
    scopeType: scopeTypeRaw ?? 'tenant',
    tenantId: tenantIdRaw ? tenantIdRaw : null,
  })

  if (!parsedScope.success) {
    return NextResponse.json({ error: 'Invalid query', details: parsedScope.error.flatten() }, { status: 400 })
  }

  const { scopeType, tenantId } = parsedScope.data

  if (scopeType === 'global') {
    if (!isSystemAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  } else {
    if (!tenantId) {
      return NextResponse.json({ error: 'Invalid query', details: { tenantId: ['Required for tenant scope'] } }, { status: 400 })
    }
    const allowed = await assertTenantAdminOrSystem(tenantId, user)
    if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // This table is introduced via migration and may not yet exist in generated Database types.
  // Locally we augment the Database type to avoid `any` while keeping query typing usable.
  const admin = createServiceRoleClient() as unknown as SupabaseClient<DatabaseWithAwardBuilderExports>
  let query = admin
    .from('award_builder_exports')
    .select('id,tenant_id,scope_type,schema_version,exported_at,exported_by_user_id,exported_by_tool,export,created_at,updated_at')
    .order('created_at', { ascending: false })
    .limit(50)

  if (scopeType === 'global') {
    query = query.is('tenant_id', null)
  } else {
    // At this point tenantId has been validated as present for tenant scope.
    const tenantIdForQuery = tenantId ?? null
    if (!tenantIdForQuery) {
      return NextResponse.json({ error: 'Invalid query', details: { tenantId: ['Required for tenant scope'] } }, { status: 400 })
    }
    query = query.eq('tenant_id', tenantIdForQuery)
  }

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ error: 'Failed to list exports', details: error.message ?? 'Unknown error' }, { status: 500 })
  }

  return NextResponse.json({ exports: (data ?? []) as AwardBuilderExportListRow[] }, { status: 200 })
}

export async function POST(req: NextRequest) {
  const { user, response } = await requireAuth()
  if (response) return response

  const body = await req.json().catch(() => ({}))
  const parsed = exportSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 })
  }

  const { tenantId: tenantIdRaw, scopeType, schemaVersion, exportedAt, exportedByTool, export: exportJson } = parsed.data
  const tenantId = tenantIdRaw ?? null

  const exportParsed = awardBuilderExportSchemaV1.safeParse(exportJson)
  if (!exportParsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload', details: { export: exportParsed.error.flatten() } },
      { status: 400 },
    )
  }

  const canonical = exportParsed.data

  // Server-side validation for published badges
  if (shouldValidateForPublish(canonical)) {
    const badge = extractBadgeFromExport(canonical)
    const validationResult = validateBadgeForPublish(badge)
    if (!validationResult.valid) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: { 
            badge: validationResult.errors.map(e => e.message) 
          } 
        },
        { status: 400 },
      )
    }
  }

  // Prevent split-brain between request metadata and canonical export JSON.
  if (schemaVersion !== canonical.schema_version) {
    return NextResponse.json(
      { error: 'Invalid payload', details: { schemaVersion: ['Must match export.schema_version'] } },
      { status: 400 },
    )
  }
  if (exportedAt && exportedAt !== canonical.exported_at) {
    return NextResponse.json(
      { error: 'Invalid payload', details: { exportedAt: ['Must match export.exported_at'] } },
      { status: 400 },
    )
  }
  if (exportedByTool && exportedByTool !== canonical.exported_by.tool) {
    return NextResponse.json(
      { error: 'Invalid payload', details: { exportedByTool: ['Must match export.exported_by.tool'] } },
      { status: 400 },
    )
  }

  // Ensure the export claims match the authenticated actor.
  if (canonical.exported_by.user_id !== user.id) {
    return NextResponse.json(
      { error: 'Invalid payload', details: { export: { exported_by: { user_id: ['Must match authenticated user'] } } } },
      { status: 400 },
    )
  }

  // Enforce scope consistency between query-level shape and canonical export JSON.
  if (scopeType !== canonical.publish_scope.type) {
    return NextResponse.json(
      { error: 'Invalid payload', details: { scopeType: ['Must match export.publish_scope.type'] } },
      { status: 400 },
    )
  }
  if (scopeType === 'global') {
    if (tenantId !== null) {
      return NextResponse.json({ error: 'Invalid payload', details: { tenantId: ['Must be null for global scope'] } }, { status: 400 })
    }
    if (canonical.publish_scope.tenant_id !== null) {
      return NextResponse.json(
        { error: 'Invalid payload', details: { export: { publish_scope: { tenant_id: ['Must be null for global scope'] } } } },
        { status: 400 },
      )
    }
  } else {
    if (!tenantId) {
      return NextResponse.json({ error: 'Invalid payload', details: { tenantId: ['Required for tenant scope'] } }, { status: 400 })
    }
    if (canonical.publish_scope.tenant_id !== tenantId) {
      return NextResponse.json(
        { error: 'Invalid payload', details: { export: { publish_scope: { tenant_id: ['Must match tenantId'] } } } },
        { status: 400 },
      )
    }
  }

  if (scopeType === 'global') {
    if (tenantId !== null) {
      return NextResponse.json({ error: 'Invalid payload', details: { tenantId: ['Must be null for global scope'] } }, { status: 400 })
    }
    if (!isSystemAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  } else {
    if (!tenantId) {
      return NextResponse.json({ error: 'Invalid payload', details: { tenantId: ['Required for tenant scope'] } }, { status: 400 })
    }
    const allowed = await assertTenantAdminOrSystem(tenantId, user)
    if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // This table is introduced via migration and may not yet exist in generated Database types.
  const admin = createServiceRoleClient() as unknown as SupabaseClient<DatabaseWithAwardBuilderExports>
  const insertPayload = {
    tenant_id: tenantId,
    scope_type: scopeType,
    schema_version: canonical.schema_version,
    exported_at: canonical.exported_at,
    exported_by_user_id: canonical.exported_by.user_id,
    exported_by_tool: canonical.exported_by.tool,
    export: canonical as unknown as Json,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await admin
    .from('award_builder_exports')
    .insert(insertPayload)
    .select('id')
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: 'Failed to save export', details: error.message ?? 'Unknown error' }, { status: 500 })
  }

  const serverId = data?.id as string | undefined
  if (!serverId) {
    return NextResponse.json({ error: 'Failed to save export (no id returned)' }, { status: 500 })
  }

  // Update the export JSON to use the server-side ID as the canonical export_id and badge ID.
  // This eliminates the need for a follow-up PUT to fix the ID mismatch.
  const updatedExport = updateExportWithServerId(canonical, serverId)
  
  const { error: updateError } = await admin
    .from('award_builder_exports')
    .update({ export: updatedExport as unknown as Json, updated_at: new Date().toISOString() })
    .eq('id', serverId)

  if (updateError) {
    // Log but don't fail - the record was created, just with client ID in the export JSON
    console.error('Failed to update export with server ID:', updateError)
  }

  return NextResponse.json({ 
    id: serverId, 
    export: updatedExport 
  }, { status: 200 })
}
