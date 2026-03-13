import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { apiHandler } from '@/lib/api/route-handler'
import { AuthError, requireTenantRole } from '@/lib/api/auth-guard'
import { awardBuilderExportSchemaV1 } from '@/lib/validation/awardBuilderExportSchemaV1'
import { 
  validateBadgeForPublish, 
  shouldValidateForPublish, 
  extractBadgeFromExport 
} from '@/lib/validation/badgeValidation'
import type { Database, Json } from '@/types/supabase'
import type { AuthContext } from '@/types/auth'

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

type AwardBuilderExportRow = {
  id: string
  tenant_id: string | null
  scope_type: 'global' | 'tenant' | string
  schema_version: string
  exported_at: string
  exported_by_user_id: string | null
  exported_by_tool: string | null
  export: unknown
  created_at: string
  updated_at: string
}

const updateSchema = z.object({
  schemaVersion: z.string().min(1).optional(),
  exportedAt: z.string().datetime().optional(),
  exportedByTool: z.string().min(1).max(64).optional(),
  export: z.unknown().optional(),
})

async function getExportOr404(exportId: string) {
  // This table is introduced via migration and may not yet exist in generated Database types.
  const admin = createServiceRoleClient() as unknown as SupabaseClient<DatabaseWithAwardBuilderExports>
  const { data, error } = await admin
    .from('award_builder_exports')
    .select('id,tenant_id,scope_type,schema_version,exported_at,exported_by_user_id,exported_by_tool,export,created_at,updated_at')
    .eq('id', exportId)
    .maybeSingle()

  if (error) return { row: null, response: NextResponse.json({ error: 'Lookup failed', details: error.message ?? 'Unknown error' }, { status: 500 }) }
  if (!data) return { row: null, response: NextResponse.json({ error: 'Not found' }, { status: 404 }) }
  return { row: data as AwardBuilderExportRow, response: null }
}

async function authorizeScope(
  auth: AuthContext,
  row: { tenant_id: string | null; scope_type: string },
) {
  if (row.scope_type === 'global' || row.tenant_id === null) {
    if (auth.effectiveGlobalRole !== 'system_admin') {
      throw new AuthError('Forbidden', 403)
    }
  } else {
    await requireTenantRole(['admin', 'owner'], row.tenant_id)
  }
}

export const GET = apiHandler({
  auth: 'user',
  handler: async ({ auth, params }) => {
    const { row, response } = await getExportOr404(params.exportId)
    if (response) return response

    await authorizeScope(auth!, row)

    return NextResponse.json({ export: row }, { status: 200 })
  },
})

export const PUT = apiHandler({
  auth: 'user',
  input: updateSchema,
  handler: async ({ auth, params, body: patch }) => {
    const { row, response } = await getExportOr404(params.exportId)
    if (response) return response

    await authorizeScope(auth!, row)

    const userId = auth!.user!.id
  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  // If export JSON is being updated, it must be canonical and consistent with request metadata + row scope.
  if (Object.prototype.hasOwnProperty.call(patch, 'export')) {
    const exportParsed = awardBuilderExportSchemaV1.safeParse(patch.export)
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

    if (canonical.exported_by.user_id !== userId) {
      return NextResponse.json(
        { error: 'Invalid payload', details: { export: { exported_by: { user_id: ['Must match authenticated user'] } } } },
        { status: 400 },
      )
    }

    // Scope constraints must match the stored row scope.
    if (row.scope_type === 'global' || row.tenant_id === null) {
      if (canonical.publish_scope.type !== 'global' || canonical.publish_scope.tenant_id !== null) {
        return NextResponse.json(
          { error: 'Invalid payload', details: { export: { publish_scope: ['Must be global with tenant_id=null for this row'] } } },
          { status: 400 },
        )
      }
    } else {
      if (canonical.publish_scope.type !== 'tenant' || canonical.publish_scope.tenant_id !== row.tenant_id) {
        return NextResponse.json(
          { error: 'Invalid payload', details: { export: { publish_scope: ['Must be tenant scope for this row tenant_id'] } } },
          { status: 400 },
        )
      }
    }

    // Prevent split-brain: if metadata fields are provided, they must match the canonical JSON.
    if (typeof patch.schemaVersion === 'string' && patch.schemaVersion !== canonical.schema_version) {
      return NextResponse.json(
        { error: 'Invalid payload', details: { schemaVersion: ['Must match export.schema_version'] } },
        { status: 400 },
      )
    }
    if (typeof patch.exportedAt === 'string' && patch.exportedAt !== canonical.exported_at) {
      return NextResponse.json(
        { error: 'Invalid payload', details: { exportedAt: ['Must match export.exported_at'] } },
        { status: 400 },
      )
    }
    if (typeof patch.exportedByTool === 'string' && patch.exportedByTool !== canonical.exported_by.tool) {
      return NextResponse.json(
        { error: 'Invalid payload', details: { exportedByTool: ['Must match export.exported_by.tool'] } },
        { status: 400 },
      )
    }

    updatePayload.schema_version = canonical.schema_version
    updatePayload.exported_at = canonical.exported_at
    updatePayload.exported_by_user_id = canonical.exported_by.user_id
    updatePayload.exported_by_tool = canonical.exported_by.tool
    updatePayload.export = canonical as unknown as Json
  }

  // If the caller is not updating `export`, allow metadata-only updates.
  if (!Object.prototype.hasOwnProperty.call(patch, 'export')) {
    if (typeof patch.schemaVersion === 'string') updatePayload.schema_version = patch.schemaVersion
    if (typeof patch.exportedAt === 'string') updatePayload.exported_at = patch.exportedAt
    if (typeof patch.exportedByTool === 'string') updatePayload.exported_by_tool = patch.exportedByTool
  }

    // This table is introduced via migration and may not yet exist in generated Database types.
    const admin = createServiceRoleClient() as unknown as SupabaseClient<DatabaseWithAwardBuilderExports>
    const { data, error } = await admin
      .from('award_builder_exports')
      .update(updatePayload)
      .eq('id', params.exportId)
      .select('id')
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: 'Failed to update export', details: error.message ?? 'Unknown error' }, { status: 500 })
    }

    return NextResponse.json({ id: (data?.id as string | undefined) ?? params.exportId }, { status: 200 })
  },
})

export const DELETE = apiHandler({
  auth: 'user',
  handler: async ({ auth, params }) => {
    const { row, response } = await getExportOr404(params.exportId)
    if (response) return response

    await authorizeScope(auth!, row)

    // This table is introduced via migration and may not yet exist in generated Database types.
    const admin = createServiceRoleClient() as unknown as SupabaseClient<DatabaseWithAwardBuilderExports>
    const { error } = await admin.from('award_builder_exports').delete().eq('id', params.exportId)

    if (error) {
      return NextResponse.json({ error: 'Failed to delete export', details: error.message ?? 'Unknown error' }, { status: 500 })
    }

    return NextResponse.json({ ok: true }, { status: 200 })
  },
})
