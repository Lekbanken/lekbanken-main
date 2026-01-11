import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { createServerRlsClient } from '@/lib/supabase/server'
import type { Locale } from '@/lib/i18n/config'
import type { LegalDatabase, LegalDocumentRow } from './types'
import { getRequiredLegalDocuments } from './legal-docs'

async function getLegalClient(): Promise<SupabaseClient<LegalDatabase>> {
  const client = await createServerRlsClient()
  return client as unknown as SupabaseClient<LegalDatabase>
}

export async function getUserAcceptedDocumentIds(
  userId: string,
  documentIds: string[]
): Promise<Set<string>> {
  if (!documentIds.length) return new Set()
  const supabase = await getLegalClient()

  const { data, error } = await supabase
    .from('user_legal_acceptances')
    .select('document_id')
    .eq('user_id', userId)
    .in('document_id', documentIds)

  if (error) {
    console.warn('[legal] Failed to load acceptances', error.message)
    return new Set()
  }

  return new Set((data ?? []).map((row) => row.document_id))
}

export async function getPendingLegalDocuments(
  userId: string,
  locale: Locale
): Promise<LegalDocumentRow[]> {
  const requiredDocs = await getRequiredLegalDocuments(locale)
  if (!requiredDocs.length) return []

  const acceptedIds = await getUserAcceptedDocumentIds(
    userId,
    requiredDocs.map((doc) => doc.id)
  )

  return requiredDocs.filter((doc) => !acceptedIds.has(doc.id))
}
