import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

import { AuthError, requireAuth, requireTenantRole } from '@/lib/api/auth-guard'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { parseCSV } from '@/lib/utils/csv'
import { CONVERSATION_CARDS_CSV_HEADERS, type ConversationCardsCsvRow } from '@/features/conversation-cards/csv-format'

export const dynamic = 'force-dynamic'

const importSchema = z.object({
  csv: z.string().min(1),
})

type ImportIssue = { row: number; column?: string; message: string }

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

export async function POST(req: NextRequest, { params }: { params: Promise<{ collectionId: string }> }) {
  try {
    const ctx = await requireAuth()
    const collectionId = (await params).collectionId
    const isSystemAdmin = ctx.effectiveGlobalRole === 'system_admin'

    const body = await req.json().catch(() => ({}))
    const parsedBody = importSchema.safeParse(body)
    if (!parsedBody.success) {
      return jsonError(400, 'Invalid payload', parsedBody.error.flatten())
    }

    const admin = createServiceRoleClient()

    const { data: collection, error: colError } = await admin
      .from('conversation_card_collections')
      .select('id,scope_type,tenant_id,title,description,main_purpose_id')
      .eq('id', collectionId)
      .maybeSingle()

    if (colError) {
      console.error('[admin/conversation-cards] import load collection error', colError)
      return jsonError(500, 'Failed to load collection')
    }

    if (!collection) return jsonError(404, 'Not found')

    if (collection.scope_type === 'global') {
      if (!isSystemAdmin) return jsonError(403, 'Forbidden')
    } else {
      if (!collection.tenant_id) return jsonError(500, 'Invalid collection scope')
      await requireTenantRole(['owner', 'admin'], collection.tenant_id)
    }

    const csv = parsedBody.data.csv

    const parsed = parseCSV<ConversationCardsCsvRow>(csv, { delimiter: ',', hasHeaders: true, skipEmpty: true, trimValues: true })

    const headerIssues: ImportIssue[] = []
    if (!parsed.headers.length) {
      headerIssues.push({ row: 1, message: 'Missing CSV headers' })
    } else {
      const expected = [...CONVERSATION_CARDS_CSV_HEADERS]
      const got = parsed.headers

      const exactMatch = expected.length === got.length && expected.every((h, i) => h === got[i])
      if (!exactMatch) {
        headerIssues.push({
          row: 1,
          message: 'Invalid CSV header. Expected exact header order: ' + expected.join(','),
        })
      }
    }

    if (parsed.errors.length) {
      return jsonError(400, 'CSV parse error', { errors: parsed.errors })
    }

    if (headerIssues.length) {
      return jsonError(400, 'CSV header mismatch', { errors: headerIssues })
    }

    const rows = parsed.data

    const issues: ImportIssue[] = []
    if (rows.length === 0) {
      issues.push({ row: 2, message: 'No data rows found' })
      return jsonError(400, 'Validation failed', { errors: issues })
    }

    // Validate collection title/description consistency (if provided)
    const firstTitle = normalizeText(rows[0]?.collection_title)
    const firstDesc = normalizeText(rows[0]?.collection_description)

    if (firstTitle && firstTitle !== collection.title) {
      issues.push({ row: 2, column: 'collection_title', message: `CSV collection_title does not match this collection (expected "${collection.title}")` })
    }

    if (firstDesc && (collection.description ?? '') !== firstDesc) {
      issues.push({ row: 2, column: 'collection_description', message: 'CSV collection_description does not match this collection' })
    }

    // Resolve main/sub purposes from CSV
    const mainPurposeRaw = normalizeText(rows[0]?.main_purpose)
    let mainPurposeId: string | null = null

    if (mainPurposeRaw) {
      const resolvedMain = await resolvePurposeId(admin, mainPurposeRaw, 'main')
      if (!resolvedMain) {
        issues.push({ row: 2, column: 'main_purpose', message: `Unknown main purpose: ${mainPurposeRaw}` })
      } else {
        mainPurposeId = resolvedMain.id
      }

      // Ensure all rows use the same main_purpose if provided
      for (let i = 0; i < rows.length; i++) {
        const rowMain = normalizeText(rows[i].main_purpose)
        if (rowMain && rowMain !== mainPurposeRaw) {
          issues.push({ row: i + 2, column: 'main_purpose', message: 'main_purpose must be consistent for all rows in this import' })
        }
      }
    }

    const subPurposeIds = new Set<string>()

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]

      const primary = normalizeText(row.primary_prompt)
      if (!primary) {
        issues.push({ row: i + 2, column: 'primary_prompt', message: 'primary_prompt is required' })
      }

      const subRaw = normalizeText(row.sub_purpose)
      if (subRaw) {
        const resolvedSub = await resolvePurposeId(admin, subRaw, 'sub')
        if (!resolvedSub) {
          issues.push({ row: i + 2, column: 'sub_purpose', message: `Unknown sub purpose: ${subRaw}` })
        } else {
          if (mainPurposeId && resolvedSub.parent_id !== mainPurposeId) {
            issues.push({ row: i + 2, column: 'sub_purpose', message: `sub_purpose "${subRaw}" is not a child of main_purpose "${mainPurposeRaw}"` })
          }
          subPurposeIds.add(resolvedSub.id)
        }
      }
    }

    if (issues.length) {
      return jsonError(400, 'Validation failed', { errors: issues })
    }

    // Apply purpose links (no auto-publish)
    if (mainPurposeId) {
      const { error: updateError } = await admin
        .from('conversation_card_collections')
        .update({ main_purpose_id: mainPurposeId })
        .eq('id', collectionId)

      if (updateError) {
        console.error('[admin/conversation-cards] import update main purpose error', updateError)
        return jsonError(500, 'Failed to update collection purposes')
      }
    }

    // Replace secondary purposes if any were provided
    if (subPurposeIds.size > 0) {
      const desired = Array.from(subPurposeIds)
      const { error: delError } = await admin
        .from('conversation_card_collection_secondary_purposes')
        .delete()
        .eq('collection_id', collectionId)

      if (delError) {
        console.error('[admin/conversation-cards] import clear secondary purposes error', delError)
        return jsonError(500, 'Failed to update collection purposes')
      }

      const { error: insError } = await admin
        .from('conversation_card_collection_secondary_purposes')
        .insert(desired.map((purpose_id) => ({ collection_id: collectionId, purpose_id })))

      if (insError) {
        console.error('[admin/conversation-cards] import insert secondary purposes error', insError)
        return jsonError(500, 'Failed to update collection purposes')
      }
    }

    // Insert cards (single statement => all-or-nothing)
    const cardsToInsert = rows.map((row, index) => ({
      collection_id: collectionId,
      sort_order: index,
      card_title: normalizeText(row.card_title) || null,
      primary_prompt: normalizeText(row.primary_prompt),
      followup_1: normalizeText(row.followup_1) || null,
      followup_2: normalizeText(row.followup_2) || null,
      followup_3: normalizeText(row.followup_3) || null,
      leader_tip: normalizeText(row.leader_tip) || null,
      metadata: {},
    }))

    const { error: insertError } = await admin.from('conversation_cards').insert(cardsToInsert)

    if (insertError) {
      console.error('[admin/conversation-cards] import insert cards error', insertError)
      return jsonError(500, 'Failed to import cards')
    }

    return NextResponse.json({
      ok: true,
      imported: rows.length,
    })
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.status, e.message)
    console.error('[admin/conversation-cards] import unexpected error', e)
    return jsonError(500, 'Unexpected error')
  }
}
