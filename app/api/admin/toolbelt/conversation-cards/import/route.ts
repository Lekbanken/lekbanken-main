import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

import { AuthError, requireAuth, requireTenantRole } from '@/lib/api/auth-guard'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { parseCSV } from '@/lib/utils/csv'
import { CONVERSATION_CARDS_CSV_HEADERS, type ConversationCardsCsvRow } from '@/features/conversation-cards/csv-format'

export const dynamic = 'force-dynamic'

const importSchema = z.object({
  csv: z.string().min(1),
  scope_type: z.enum(['global', 'tenant']),
  tenant_id: z.string().uuid().nullable(),
  dry_run: z.boolean().default(true),
})

type ImportIssue = { row: number; column?: string; message: string }

type DryRunResult = {
  valid: boolean
  collection_title: string
  cards_count: number
  will_create_collection: boolean
  existing_collection_id?: string
  errors: ImportIssue[]
  warnings: ImportIssue[]
}

function jsonError(status: number, message: string, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status })
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

async function resolvePurposeId(
  admin: ReturnType<typeof createServiceRoleClient>,
  value: string,
  expectedType: 'main' | 'sub'
): Promise<{ id: string; parent_id: string | null } | null> {
  const raw = value.trim()
  if (!raw) return null

  // Prefer exact purpose_key match
  const byKey = await admin
    .from('purposes')
    .select('id,parent_id,type')
    .eq('purpose_key', raw)
    .maybeSingle()

  const byKeyData = (byKey.data ?? null) as null | { id: string; parent_id?: string | null; type?: string }
  if (byKeyData && !byKey.error) {
    if (byKeyData.type !== expectedType) return null
    return { id: byKeyData.id, parent_id: byKeyData.parent_id ?? null }
  }

  // Fallback: case-insensitive name match
  const byName = await admin
    .from('purposes')
    .select('id,parent_id,type')
    .ilike('name', raw)
    .maybeSingle()

  const byNameData = (byName.data ?? null) as null | { id: string; parent_id?: string | null; type?: string }
  if (byNameData && !byName.error) {
    if (byNameData.type !== expectedType) return null
    return { id: byNameData.id, parent_id: byNameData.parent_id ?? null }
  }

  return null
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAuth()
    const isSystemAdmin = ctx.effectiveGlobalRole === 'system_admin'

    const body = await req.json().catch(() => ({}))
    const parsedBody = importSchema.safeParse(body)
    if (!parsedBody.success) {
      return jsonError(400, 'Invalid payload', parsedBody.error.flatten())
    }

    const { csv, scope_type, tenant_id, dry_run } = parsedBody.data

    // Authorization check
    if (scope_type === 'global') {
      if (!isSystemAdmin) {
        return jsonError(403, 'Endast system-admin kan importera globala samlingar')
      }
    } else {
      if (!tenant_id) {
        return jsonError(400, 'tenant_id krävs för tenant-scope')
      }
      await requireTenantRole(['owner', 'admin'], tenant_id)
    }

    const admin = createServiceRoleClient()

    // Parse CSV
    const parsed = parseCSV<ConversationCardsCsvRow>(csv, {
      delimiter: ',',
      hasHeaders: true,
      skipEmpty: true,
      trimValues: true,
    })

    const errors: ImportIssue[] = []
    const warnings: ImportIssue[] = []

    // Validate headers
    if (!parsed.headers.length) {
      errors.push({ row: 1, message: 'Saknar CSV-header' })
    } else {
      const expected = [...CONVERSATION_CARDS_CSV_HEADERS]
      const got = parsed.headers
      const exactMatch = expected.length === got.length && expected.every((h, i) => h === got[i])
      if (!exactMatch) {
        errors.push({
          row: 1,
          message: `Fel CSV-header. Förväntad: ${expected.join(',')}`,
        })
      }
    }

    if (parsed.errors.length) {
      return jsonError(400, 'CSV-parsningsfel', { errors: parsed.errors })
    }

    if (errors.length) {
      return jsonError(400, 'CSV-header matchar inte', { errors })
    }

    const rows = parsed.data
    if (rows.length === 0) {
      errors.push({ row: 2, message: 'Inga datarader hittades' })
      return jsonError(400, 'Validering misslyckades', { errors })
    }

    // Extract collection info from first row
    const collectionTitle = normalizeText(rows[0]?.collection_title)
    const collectionDescription = normalizeText(rows[0]?.collection_description)

    if (!collectionTitle) {
      errors.push({ row: 2, column: 'collection_title', message: 'collection_title krävs' })
    }

    // Check if collection already exists
    let existingCollectionId: string | undefined
    let willCreateCollection = true

    if (collectionTitle) {
      let query = admin
        .from('conversation_card_collections')
        .select('id')
        .eq('title', collectionTitle)
        .eq('scope_type', scope_type)

      if (scope_type === 'tenant' && tenant_id) {
        query = query.eq('tenant_id', tenant_id)
      } else {
        query = query.is('tenant_id', null)
      }

      const { data: existingCollection } = await query.maybeSingle()

      if (existingCollection) {
        existingCollectionId = existingCollection.id
        willCreateCollection = false
      }
    }

    // Validate main_purpose consistency
    const mainPurposeRaw = normalizeText(rows[0]?.main_purpose)
    let mainPurposeId: string | null = null

    if (mainPurposeRaw) {
      const resolvedMain = await resolvePurposeId(admin, mainPurposeRaw, 'main')
      if (!resolvedMain) {
        errors.push({ row: 2, column: 'main_purpose', message: `Okänt huvudsyfte: ${mainPurposeRaw}` })
      } else {
        mainPurposeId = resolvedMain.id
      }

      // All rows should have same main_purpose
      for (let i = 0; i < rows.length; i++) {
        const rowMain = normalizeText(rows[i].main_purpose)
        if (rowMain && rowMain !== mainPurposeRaw) {
          warnings.push({
            row: i + 2,
            column: 'main_purpose',
            message: 'main_purpose bör vara samma för alla rader',
          })
        }
      }
    }

    // Validate each row
    const subPurposeIds = new Set<string>()

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]

      const primaryPrompt = normalizeText(row.primary_prompt)
      if (!primaryPrompt) {
        errors.push({ row: i + 2, column: 'primary_prompt', message: 'primary_prompt krävs' })
      }

      const subRaw = normalizeText(row.sub_purpose)
      if (subRaw) {
        const resolvedSub = await resolvePurposeId(admin, subRaw, 'sub')
        if (!resolvedSub) {
          warnings.push({ row: i + 2, column: 'sub_purpose', message: `Okänt undersyfte: ${subRaw}` })
        } else {
          if (mainPurposeId && resolvedSub.parent_id !== mainPurposeId) {
            warnings.push({
              row: i + 2,
              column: 'sub_purpose',
              message: `Undersyfte "${subRaw}" hör inte till huvudsyftet "${mainPurposeRaw}"`,
            })
          }
          subPurposeIds.add(resolvedSub.id)
        }
      }
    }

    // Build result
    const result: DryRunResult = {
      valid: errors.length === 0,
      collection_title: collectionTitle,
      cards_count: rows.length,
      will_create_collection: willCreateCollection,
      existing_collection_id: existingCollectionId,
      errors,
      warnings,
    }

    if (dry_run) {
      return NextResponse.json(result)
    }

    // Actual import
    if (!result.valid) {
      return jsonError(400, 'Validering misslyckades', { errors })
    }

    // Create or get collection
    let collectionId: string

    if (willCreateCollection) {
      const { data: newCollection, error: createError } = await admin
        .from('conversation_card_collections')
        .insert({
          title: collectionTitle,
          description: collectionDescription || null,
          scope_type,
          tenant_id: scope_type === 'tenant' ? tenant_id : null,
          main_purpose_id: mainPurposeId,
          status: 'draft',
        })
        .select('id')
        .single()

      if (createError || !newCollection) {
        console.error('[conversation-cards/import] create collection error', createError)
        return jsonError(500, 'Kunde inte skapa samling')
      }

      collectionId = newCollection.id
    } else {
      collectionId = existingCollectionId!

      // Update main_purpose if provided
      if (mainPurposeId) {
        await admin
          .from('conversation_card_collections')
          .update({ main_purpose_id: mainPurposeId })
          .eq('id', collectionId)
      }
    }

    // Link secondary purposes
    if (subPurposeIds.size > 0) {
      const existingLinks = await admin
        .from('conversation_card_collection_secondary_purposes')
        .select('purpose_id')
        .eq('collection_id', collectionId)

      const existingPurposeIds = new Set((existingLinks.data ?? []).map((r) => r.purpose_id))

      const newLinks = Array.from(subPurposeIds)
        .filter((id) => !existingPurposeIds.has(id))
        .map((purpose_id) => ({ collection_id: collectionId, purpose_id }))

      if (newLinks.length > 0) {
        await admin.from('conversation_card_collection_secondary_purposes').insert(newLinks)
      }
    }

    // Get current max order
    const { data: maxOrderData } = await admin
      .from('conversation_cards')
      .select('sort_order')
      .eq('collection_id', collectionId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle()

    let nextOrder = ((maxOrderData as { sort_order?: number } | null)?.sort_order ?? 0) + 1

    // Insert cards
    const cardsToInsert = rows.map((row) => ({
      collection_id: collectionId,
      card_title: normalizeText(row.card_title) || null,
      primary_prompt: normalizeText(row.primary_prompt),
      followup_1: normalizeText(row.followup_1) || null,
      followup_2: normalizeText(row.followup_2) || null,
      followup_3: normalizeText(row.followup_3) || null,
      leader_tip: normalizeText(row.leader_tip) || null,
      sort_order: nextOrder++,
    }))

    const { error: insertError } = await admin.from('conversation_cards').insert(cardsToInsert)

    if (insertError) {
      console.error('[conversation-cards/import] insert cards error', insertError)
      return jsonError(500, 'Kunde inte importera kort')
    }

    return NextResponse.json({
      success: true,
      collection_id: collectionId,
      imported: cardsToInsert.length,
      created_collection: willCreateCollection,
    })
  } catch (e) {
    if (e instanceof AuthError) {
      return jsonError(e.status, e.message)
    }
    console.error('[conversation-cards/import] unexpected error', e)
    return jsonError(500, 'Ett oväntat fel uppstod')
  }
}
