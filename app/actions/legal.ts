'use server'

import type { SupabaseClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { createServerRlsClient } from '@/lib/supabase/server'
import { getServerAuthContext } from '@/lib/auth/server-context'
import {
  COOKIE_CONSENT_SCHEMA_VERSION,
  DEFAULT_COOKIE_CONSENT,
} from '@/lib/legal/constants'
import type { CookieConsentState } from '@/lib/legal/consent-types'
import type { LegalDatabase, LegalDocumentRow } from '@/lib/legal/types'

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

  return data ?? null
}
