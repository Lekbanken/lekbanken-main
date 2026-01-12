import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { createServerRlsClient } from '@/lib/supabase/server'
import {
  defaultLocale,
  fallbackLocales,
  type Locale,
} from '@/lib/i18n/config'
import type {
  LegalDatabase,
  LegalDocScope,
  LegalDocType,
  LegalDocumentRow,
} from './types'
import { REQUIRED_LEGAL_TYPES } from './constants'

type LegalDocumentResult = {
  doc: LegalDocumentRow | null
  localeUsed: Locale | null
}

function buildLocaleCandidates(locale: Locale): Locale[] {
  const candidates = [locale, ...(fallbackLocales[locale] ?? [])]
  if (!candidates.includes(defaultLocale)) {
    candidates.push(defaultLocale)
  }
  return Array.from(new Set(candidates))
}

async function getLegalClient(): Promise<SupabaseClient<LegalDatabase>> {
  const client = await createServerRlsClient()
  return client as unknown as SupabaseClient<LegalDatabase>
}

export async function getActiveLegalDocument({
  type,
  locale,
  scope = 'global',
  tenantId = null,
}: {
  type: LegalDocType
  locale: Locale
  scope?: LegalDocScope
  tenantId?: string | null
}): Promise<LegalDocumentResult> {
  if (scope === 'tenant' && !tenantId) {
    return { doc: null, localeUsed: null }
  }
  const supabase = await getLegalClient()
  const candidates = buildLocaleCandidates(locale)

  for (const candidate of candidates) {
    let query = supabase
      .from('legal_documents')
      .select('*')
      .eq('type', type as string)
      .eq('scope', scope as string)
      .eq('is_active', true)
      .eq('locale', candidate as string)

    query = scope === 'tenant'
      ? query.eq('tenant_id', tenantId!)
      : query.is('tenant_id', null)

    const { data, error } = await query.maybeSingle()
    if (error) {
      console.warn('[legal] Failed to load legal document', { type, candidate, error: error.message })
      continue
    }
    if (data) {
      return { doc: data as LegalDocumentRow, localeUsed: candidate }
    }
  }

  return { doc: null, localeUsed: null }
}

export async function getRequiredLegalDocuments(locale: Locale): Promise<LegalDocumentRow[]> {
  const results = await Promise.all(
    REQUIRED_LEGAL_TYPES.map((type) => getActiveLegalDocument({ type, locale }))
  )

  return results
    .map((result) => result.doc)
    .filter((doc): doc is LegalDocumentRow => Boolean(doc?.requires_acceptance))
}
