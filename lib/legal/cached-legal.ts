import 'server-only'

import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createServerRlsClient } from '@/lib/supabase/server'
import {
  defaultLocale,
  fallbackLocales,
  type Locale,
} from '@/lib/i18n/config'
import type {
  LegalDatabase,
  LegalDocType,
  LegalDocumentRow,
} from './types'
import { REQUIRED_LEGAL_TYPES } from './constants'

// =============================================================================
// CACHING STRATEGY
// =============================================================================
// 
// Legal documents rarely change, so we use Next.js unstable_cache with TTL.
// User acceptances are per-request cached (they depend on user and can change).
//
// This eliminates the "N queries per navigation" pattern.
// =============================================================================

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

// =============================================================================
// CACHED: Get all required legal documents for a locale (TTL 5 minutes)
// =============================================================================

async function fetchRequiredLegalDocsUncached(locale: Locale): Promise<LegalDocumentRow[]> {
  const supabase = await getLegalClient()
  const candidates = buildLocaleCandidates(locale)

  // Fetch all required types in a SINGLE query with OR conditions
  // This avoids N+1 queries per type
  const { data, error } = await supabase
    .from('legal_documents')
    .select('*')
    .in('type', REQUIRED_LEGAL_TYPES as unknown as string[])
    .eq('scope', 'global')
    .eq('is_active', true)
    .in('locale', candidates)
    .is('tenant_id', null)
    .order('type')
    .order('locale')

  if (error) {
    console.warn('[legal] Failed to fetch required legal docs:', error.message)
    return []
  }

  // Pick the best locale match for each type
  const docsByType = new Map<string, LegalDocumentRow>()
  for (const doc of data ?? []) {
    const existing = docsByType.get(doc.type)
    if (!existing) {
      docsByType.set(doc.type, doc as LegalDocumentRow)
    } else {
      // Prefer earlier locale in candidates list
      const existingIndex = candidates.indexOf(existing.locale as Locale)
      const newIndex = candidates.indexOf(doc.locale as Locale)
      if (newIndex >= 0 && (existingIndex < 0 || newIndex < existingIndex)) {
        docsByType.set(doc.type, doc as LegalDocumentRow)
      }
    }
  }

  return Array.from(docsByType.values()).filter((doc) => doc.requires_acceptance)
}

// Wrap with unstable_cache for cross-request TTL caching
const getRequiredLegalDocumentsCached = unstable_cache(
  fetchRequiredLegalDocsUncached,
  ['required-legal-docs'],
  {
    revalidate: 300, // 5 minutes TTL
    tags: ['legal-docs'],
  }
)

/**
 * Get required legal documents for a locale.
 * Results are cached for 5 minutes across requests.
 */
export async function getRequiredLegalDocuments(locale: Locale): Promise<LegalDocumentRow[]> {
  return getRequiredLegalDocumentsCached(locale)
}

// =============================================================================
// PER-REQUEST CACHED: Get user's accepted document types
// =============================================================================

/**
 * Get accepted document types for a user (any language version).
 * Cached per-request to avoid duplicate queries within one render.
 */
export const getUserAcceptedDocTypes = cache(async (userId: string): Promise<Set<LegalDocType>> => {
  const supabase = await getLegalClient()

  const { data, error } = await supabase
    .from('user_legal_acceptances')
    .select('document_id, legal_documents!inner(type)')
    .eq('user_id', userId)

  if (error) {
    console.warn('[legal] Failed to load accepted doc types:', error.message)
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
})

// =============================================================================
// COMBINED: Get pending legal documents for user
// =============================================================================

/**
 * Get legal documents the user has not yet accepted.
 * Uses cached legal docs + per-request user acceptance check.
 */
export async function getPendingLegalDocuments(
  userId: string,
  locale: Locale
): Promise<LegalDocumentRow[]> {
  const [requiredDocs, acceptedTypes] = await Promise.all([
    getRequiredLegalDocuments(locale),
    getUserAcceptedDocTypes(userId),
  ])

  if (!requiredDocs.length) return []

  return requiredDocs.filter((doc) => !acceptedTypes.has(doc.type as LegalDocType))
}
