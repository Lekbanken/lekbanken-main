'use server'

import type { SupabaseClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { createServerRlsClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getServerAuthContext } from '@/lib/auth/server-context'
import {
  COOKIE_CONSENT_SCHEMA_VERSION,
  DEFAULT_COOKIE_CONSENT,
} from '@/lib/legal/constants'
import type { CookieConsentState } from '@/lib/legal/consent-types'
import type {
  CookieCatalogRow,
  CookieConsentRow,
  LegalDatabase,
  LegalDocScope,
  LegalDocType,
  LegalDocumentRow,
  LegalLocale,
} from '@/lib/legal/types'

type AcceptResult = {
  success: boolean
  error?: string
}

export async function acceptLegalDocuments(formData: FormData): Promise<void> {
  const authContext = await getServerAuthContext()
  const user = authContext.user

  if (!user) {
    redirect('/auth/login?redirect=/legal/accept')
  }

  const redirectParam = String(formData.get('redirectTo') || '')
  const redirectTo = redirectParam.startsWith('/') ? redirectParam : '/app'
  const documentIds = formData.getAll('documentId').map(String).filter(Boolean)

  if (!documentIds.length) {
    redirect(redirectTo)
  }

  for (const docId of documentIds) {
    const accepted = formData.get(`accept_${docId}`)
    if (!accepted) {
      redirect('/legal/accept?error=missing')
    }
  }

  const supabase = (await createServerRlsClient()) as unknown as SupabaseClient<LegalDatabase>

  const { data: docs, error: docsError } = await supabase
    .from('legal_documents')
    .select('id, locale, requires_acceptance, is_active')
    .in('id', documentIds)

  if (docsError) {
    throw new Error(docsError.message)
  }

  const activeDocs = (docs ?? []).filter((doc) => doc.is_active && doc.requires_acceptance)
  if (activeDocs.length !== documentIds.length) {
    redirect('/legal/accept?error=invalid')
  }

  const acceptedAt = new Date().toISOString()
  const rows = activeDocs.map((doc) => ({
    user_id: user.id,
    document_id: doc.id,
    accepted_locale: doc.locale,
    accepted_at: acceptedAt,
    tenant_id_snapshot: authContext.activeTenant?.id ?? null,
  }))

  const { error } = await supabase
    .from('user_legal_acceptances')
    .upsert(rows, { onConflict: 'user_id,document_id' })

  if (error) {
    throw new Error(error.message)
  }

  redirect(redirectTo)
}

export async function saveCookieConsent(
  consent: CookieConsentState,
  source: 'banner' | 'settings' = 'banner'
): Promise<AcceptResult> {
  const authContext = await getServerAuthContext()
  const user = authContext.user

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const normalized: CookieConsentState = {
    ...DEFAULT_COOKIE_CONSENT,
    ...consent,
    necessary: true,
  }

  const supabase = (await createServerRlsClient()) as unknown as SupabaseClient<LegalDatabase>

  const rows = Object.entries(normalized).map(([cookie_key, value]) => ({
    user_id: user.id,
    cookie_key,
    consent: Boolean(value),
    schema_version: COOKIE_CONSENT_SCHEMA_VERSION,
    source,
    tenant_id_snapshot: authContext.activeTenant?.id ?? null,
  }))

  const { error } = await supabase
    .from('cookie_consents')
    .upsert(rows, { onConflict: 'user_id,cookie_key,schema_version' })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function getLegalDocumentById(
  id: string
): Promise<LegalDocumentRow | null> {
  const supabase = (await createServerRlsClient()) as unknown as SupabaseClient<LegalDatabase>

  const { data, error } = await supabase
    .from('legal_documents')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.warn('[legal] Failed to load document', error.message)
    return null
  }

  return (data ?? null) as LegalDocumentRow | null
}

type CookieCatalogResult = {
  success: boolean
  data?: CookieCatalogRow[]
  error?: string
}

type CookieConsentStateResult = {
  success: boolean
  data?: {
    schemaVersion: number
    updatedAt: string | null
    source: 'banner' | 'settings' | null
    categories: CookieConsentState
  }
  error?: string
}

type CookieConsentReceiptResult = {
  success: boolean
  data?: {
    schemaVersion: number
    updatedAt: string | null
    categories: CookieConsentState
    entries: CookieConsentRow[]
  }
  error?: string
}

export type LegalDocumentSummary = {
  id: string
  type: LegalDocType
  locale: LegalLocale
  version: number
  title: string
  scope: LegalDocScope
  tenantId: string | null
  publishedAt: string | null
  isActive: boolean
}

export type LegalAcceptanceReceiptEntry = {
  documentId: string
  acceptedAt: string
  acceptedLocale: LegalLocale
  tenantIdSnapshot: string | null
  document: LegalDocumentSummary | null
}

export type LegalAcceptanceReceipt = {
  updatedAt: string | null
  entries: LegalAcceptanceReceiptEntry[]
  missingDocuments: string[]
}

type LegalAcceptanceReceiptResult = {
  success: boolean
  data?: LegalAcceptanceReceipt
  error?: string
}

export async function getCookieCatalog(): Promise<CookieCatalogResult> {
  const supabase = (await createServerRlsClient()) as unknown as SupabaseClient<LegalDatabase>
  const { data, error } = await supabase
    .from('cookie_catalog')
    .select('*')
    .order('key', { ascending: true })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data: (data ?? []) as CookieCatalogRow[] }
}

export async function getCookieConsentState(): Promise<CookieConsentStateResult> {
  const authContext = await getServerAuthContext()
  const user = authContext.user

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const supabase = (await createServerRlsClient()) as unknown as SupabaseClient<LegalDatabase>
  const { data, error } = await supabase
    .from('cookie_consents')
    .select('cookie_key, consent, given_at, source')
    .eq('user_id', user.id)
    .eq('schema_version', COOKIE_CONSENT_SCHEMA_VERSION)

  if (error) {
    return { success: false, error: error.message }
  }

  const categories: CookieConsentState = {
    ...DEFAULT_COOKIE_CONSENT,
  }
  let updatedAt: string | null = null
  let source: 'banner' | 'settings' | null = null

  for (const row of data ?? []) {
    const key = row.cookie_key as keyof CookieConsentState
    if (key in categories) {
      categories[key] = Boolean(row.consent)
    }
    if (!updatedAt || row.given_at > updatedAt) {
      updatedAt = row.given_at
      source = row.source as 'banner' | 'settings'
    }
  }

  return {
    success: true,
    data: {
      schemaVersion: COOKIE_CONSENT_SCHEMA_VERSION,
      updatedAt,
      source,
      categories,
    },
  }
}

export async function getCookieConsentReceipt(): Promise<CookieConsentReceiptResult> {
  const authContext = await getServerAuthContext()
  const user = authContext.user

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const supabase = (await createServerRlsClient()) as unknown as SupabaseClient<LegalDatabase>
  const { data, error } = await supabase
    .from('cookie_consents')
    .select('*')
    .eq('user_id', user.id)
    .eq('schema_version', COOKIE_CONSENT_SCHEMA_VERSION)
    .order('given_at', { ascending: false })

  if (error) {
    return { success: false, error: error.message }
  }

  const categories: CookieConsentState = {
    ...DEFAULT_COOKIE_CONSENT,
  }
  let updatedAt: string | null = null

  for (const row of data ?? []) {
    const key = row.cookie_key as keyof CookieConsentState
    if (key in categories) {
      categories[key] = Boolean(row.consent)
    }
    if (!updatedAt || row.given_at > updatedAt) {
      updatedAt = row.given_at
    }
  }

  return {
    success: true,
    data: {
      schemaVersion: COOKIE_CONSENT_SCHEMA_VERSION,
      updatedAt,
      categories,
      entries: (data ?? []) as CookieConsentRow[],
    },
  }
}

export async function deleteCookieConsentHistory(): Promise<{ success: boolean; error?: string }> {
  const authContext = await getServerAuthContext()
  const user = authContext.user

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const supabase = (await createServerRlsClient()) as unknown as SupabaseClient<LegalDatabase>
  const rows = Object.entries(DEFAULT_COOKIE_CONSENT).map(([cookie_key, value]) => ({
    user_id: user.id,
    cookie_key,
    consent: Boolean(value),
    schema_version: COOKIE_CONSENT_SCHEMA_VERSION,
    source: 'settings' as const,
    tenant_id_snapshot: authContext.activeTenant?.id ?? null,
  }))

  const { error } = await supabase
    .from('cookie_consents')
    .upsert(rows, { onConflict: 'user_id,cookie_key,schema_version' })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function getLegalAcceptanceReceipt(): Promise<LegalAcceptanceReceiptResult> {
  const authContext = await getServerAuthContext()
  const user = authContext.user

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const supabase = (await createServerRlsClient()) as unknown as SupabaseClient<LegalDatabase>
  const { data: acceptances, error } = await supabase
    .from('user_legal_acceptances')
    .select('document_id, accepted_at, accepted_locale, tenant_id_snapshot')
    .eq('user_id', user.id)
    .order('accepted_at', { ascending: false })

  if (error) {
    return { success: false, error: error.message }
  }

  const rows = acceptances ?? []
  const documentIds = Array.from(new Set(rows.map((row) => row.document_id)))

  if (!documentIds.length) {
    return { success: true, data: { updatedAt: null, entries: [], missingDocuments: [] } }
  }

  const adminClient = createServiceRoleClient() as SupabaseClient<LegalDatabase>
  const { data: docs, error: docsError } = await adminClient
    .from('legal_documents')
    .select('id, type, locale, version_int, title, scope, tenant_id, published_at, is_active')
    .in('id', documentIds)

  if (docsError) {
    return { success: false, error: docsError.message }
  }

  const docMap = new Map((docs ?? []).map((doc) => [doc.id, doc]))
  const missingDocuments = documentIds.filter((id) => !docMap.has(id))

  const entries: LegalAcceptanceReceiptEntry[] = rows.map((row) => {
    const doc = docMap.get(row.document_id)
    return {
      documentId: row.document_id,
      acceptedAt: row.accepted_at,
      acceptedLocale: row.accepted_locale as LegalLocale,
      tenantIdSnapshot: row.tenant_id_snapshot,
      document: doc
        ? {
            id: doc.id,
            type: doc.type as LegalDocType,
            locale: doc.locale as LegalLocale,
            version: doc.version_int,
            title: doc.title,
            scope: doc.scope as LegalDocScope,
            tenantId: doc.tenant_id,
            publishedAt: doc.published_at,
            isActive: doc.is_active,
          }
        : null,
    }
  })

  return {
    success: true,
    data: {
      updatedAt: entries[0]?.acceptedAt ?? null,
      entries,
      missingDocuments,
    },
  }
}
