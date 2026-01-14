import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { createServerRlsClient } from '@/lib/supabase/server'
import type { Locale } from '@/lib/i18n/config'
import type { LegalDatabase, LegalDocType, LegalDocumentRow } from './types'
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

/**
 * Get the document types the user has already accepted (any language version).
 * This allows users to accept terms in one language and not be prompted again
 * when they switch languages.
 */
export async function getUserAcceptedDocTypes(
  userId: string
): Promise<Set<LegalDocType>> {
  const supabase = await getLegalClient()

  // Join user_legal_acceptances with legal_documents to get the type
  const { data, error } = await supabase
    .from('user_legal_acceptances')
    .select('document_id, legal_documents!inner(type)')
    .eq('user_id', userId)

  if (error) {
    console.warn('[legal] Failed to load accepted doc types', error.message)
    return new Set()
  }

  const types = new Set<LegalDocType>()
  for (const row of data ?? []) {
    const docType = (row.legal_documents as unknown as { type: string })?.type
    if (docType) {
      types.add(docType as LegalDocType)
    }
  }
  return types
}

export async function getPendingLegalDocuments(
  userId: string,
  locale: Locale
): Promise<LegalDocumentRow[]> {
  const requiredDocs = await getRequiredLegalDocuments(locale)
  if (!requiredDocs.length) return []

  // Get accepted document types (language-independent)
  const acceptedTypes = await getUserAcceptedDocTypes(userId)

  // Filter out documents where user has accepted ANY language version of that type
  return requiredDocs.filter((doc) => !acceptedTypes.has(doc.type as LegalDocType))
}
