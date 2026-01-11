'use server'

import type { SupabaseClient } from '@supabase/supabase-js'
import { createServerRlsClient, createServiceRoleClient } from '@/lib/supabase/server'
import { isSystemAdmin, isTenantAdmin } from '@/lib/utils/tenantAuth'
import type {
  LegalAuditLogRow,
  LegalDatabase,
  LegalDocScope,
  LegalDocType,
  LegalDocumentDraftRow,
  LegalDocumentRow,
  LegalLocale,
  OrgLegalAcceptanceRow,
} from '@/lib/legal/types'

type ActionResult<T> = { success: true; data: T } | { success: false; error: string }

type LegalListParams = {
  scope: LegalDocScope
  tenantId?: string | null
  type?: LegalDocType
  locale?: LegalLocale
  activeOnly?: boolean
  limit?: number
}

type LegalDraftInput = {
  scope: LegalDocScope
  tenantId?: string | null
  type: LegalDocType
  locale: LegalLocale
  title: string
  contentMarkdown: string
  requiresAcceptance: boolean
  changeSummary?: string
}

type PublishInput = LegalDraftInput & {
  changeSummary: string
}

type AcceptanceImpact = {
  totalUsers: number
  documentStats: Record<string, { acceptedCount: number; pendingCount: number }>
}

async function getLegalClient(): Promise<SupabaseClient<LegalDatabase>> {
  const client = await createServerRlsClient()
  return client as unknown as SupabaseClient<LegalDatabase>
}

function getLegalServiceClient(): SupabaseClient<LegalDatabase> {
  return createServiceRoleClient() as SupabaseClient<LegalDatabase>
}

async function assertScopeAccess(scope: LegalDocScope, tenantId?: string | null) {
  const supabase = await createServerRlsClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return { ok: false, error: 'Not authenticated' }
  }

  const isSystem = isSystemAdmin(user)
  if (scope === 'global' && !isSystem) {
    return { ok: false, error: 'System admin access required' }
  }

  if (scope === 'tenant') {
    if (!tenantId) {
      return { ok: false, error: 'Tenant is required' }
    }
    if (!isSystem) {
      const hasAccess = await isTenantAdmin(tenantId, user.id)
      if (!hasAccess) {
        return { ok: false, error: 'Tenant admin access required' }
      }
    }
  }

  return { ok: true, user, isSystem }
}

async function logLegalEvent(params: {
  scope: LegalDocScope
  tenantId?: string | null
  documentId?: string | null
  eventType: string
  payload?: Record<string, unknown>
}) {
  const supabase = await getLegalClient()
  const { scope, tenantId, documentId, eventType, payload } = params

  await supabase
    .from('legal_audit_log')
    .insert({
      scope,
      tenant_id: scope === 'tenant' ? tenantId ?? null : null,
      document_id: documentId ?? null,
      event_type: eventType,
      payload: payload ?? {},
    })
}

export async function listLegalDocuments(
  params: LegalListParams
): Promise<ActionResult<LegalDocumentRow[]>> {
  const access = await assertScopeAccess(params.scope, params.tenantId ?? null)
  if (!access.ok) return { success: false, error: access.error }

  const supabase = await getLegalClient()
  let query = supabase
    .from('legal_documents')
    .select('*')
    .eq('scope', params.scope)

  if (params.type) query = query.eq('type', params.type)
  if (params.locale) query = query.eq('locale', params.locale)
  if (params.activeOnly) query = query.eq('is_active', true)

  if (params.scope === 'tenant') {
    query = query.eq('tenant_id', params.tenantId ?? null)
  } else {
    query = query.is('tenant_id', null)
  }

  query = query.order('type', { ascending: true }).order('locale', { ascending: true })
  if (params.limit) query = query.limit(params.limit)

  const { data, error } = await query

  if (error) {
    console.error('[legal] listLegalDocuments failed', error)
    return { success: false, error: 'Failed to load legal documents' }
  }

  return { success: true, data: data ?? [] }
}

export async function listLegalDrafts(
  params: LegalListParams
): Promise<ActionResult<LegalDocumentDraftRow[]>> {
  const access = await assertScopeAccess(params.scope, params.tenantId ?? null)
  if (!access.ok) return { success: false, error: access.error }

  const supabase = await getLegalClient()
  let query = supabase
    .from('legal_document_drafts')
    .select('*')
    .eq('scope', params.scope)

  if (params.type) query = query.eq('type', params.type)
  if (params.locale) query = query.eq('locale', params.locale)

  if (params.scope === 'tenant') {
    query = query.eq('tenant_id', params.tenantId ?? null)
  } else {
    query = query.is('tenant_id', null)
  }

  query = query.order('updated_at', { ascending: false })
  if (params.limit) query = query.limit(params.limit)

  const { data, error } = await query

  if (error) {
    console.error('[legal] listLegalDrafts failed', error)
    return { success: false, error: 'Failed to load legal drafts' }
  }

  return { success: true, data: data ?? [] }
}

export async function getLegalEditorSnapshot(params: {
  scope: LegalDocScope
  tenantId?: string | null
  type: LegalDocType
}): Promise<ActionResult<{ activeDocs: LegalDocumentRow[]; drafts: LegalDocumentDraftRow[] }>> {
  const [activeDocs, drafts] = await Promise.all([
    listLegalDocuments({ scope: params.scope, tenantId: params.tenantId ?? null, type: params.type, activeOnly: true }),
    listLegalDrafts({ scope: params.scope, tenantId: params.tenantId ?? null, type: params.type }),
  ])

  if (!activeDocs.success) return activeDocs
  if (!drafts.success) return drafts

  return { success: true, data: { activeDocs: activeDocs.data, drafts: drafts.data } }
}

export async function saveLegalDraft(input: LegalDraftInput): Promise<ActionResult<LegalDocumentDraftRow>> {
  const access = await assertScopeAccess(input.scope, input.tenantId ?? null)
  if (!access.ok) return { success: false, error: access.error }

  const title = input.title.trim()
  const content = input.contentMarkdown.trim()
  if (!title || !content) {
    return { success: false, error: 'Title and content are required' }
  }

  const supabase = await getLegalClient()
  const { data, error } = await supabase
    .from('legal_document_drafts')
    .upsert({
      scope: input.scope,
      tenant_id: input.scope === 'tenant' ? input.tenantId ?? null : null,
      type: input.type,
      locale: input.locale,
      title,
      content_markdown: content,
      requires_acceptance: input.requiresAcceptance,
      change_summary: input.changeSummary?.trim() ?? '',
      updated_at: new Date().toISOString(),
      updated_by: access.user.id,
    }, { onConflict: 'type,locale,scope,tenant_id' })
    .select('*')
    .single()

  if (error) {
    console.error('[legal] saveLegalDraft failed', error)
    return { success: false, error: 'Failed to save draft' }
  }

  await logLegalEvent({
    scope: input.scope,
    tenantId: input.tenantId ?? null,
    documentId: null,
    eventType: 'draft_saved',
    payload: { type: input.type, locale: input.locale },
  })

  return { success: true, data }
}

export async function deleteLegalDraft(params: {
  scope: LegalDocScope
  tenantId?: string | null
  type: LegalDocType
  locale: LegalLocale
}): Promise<ActionResult<null>> {
  const access = await assertScopeAccess(params.scope, params.tenantId ?? null)
  if (!access.ok) return { success: false, error: access.error }

  const supabase = await getLegalClient()
  const { error } = await supabase
    .from('legal_document_drafts')
    .delete()
    .eq('scope', params.scope)
    .eq('type', params.type)
    .eq('locale', params.locale)
    .eq('tenant_id', params.scope === 'tenant' ? params.tenantId ?? null : null)

  if (error) {
    console.error('[legal] deleteLegalDraft failed', error)
    return { success: false, error: 'Failed to delete draft' }
  }

  await logLegalEvent({
    scope: params.scope,
    tenantId: params.tenantId ?? null,
    documentId: null,
    eventType: 'draft_deleted',
    payload: { type: params.type, locale: params.locale },
  })

  return { success: true, data: null }
}

export async function publishLegalDocument(input: PublishInput): Promise<ActionResult<LegalDocumentRow>> {
  const access = await assertScopeAccess(input.scope, input.tenantId ?? null)
  if (!access.ok) return { success: false, error: access.error }

  const title = input.title.trim()
  const content = input.contentMarkdown.trim()
  const changeSummary = input.changeSummary.trim()
  if (!title || !content) {
    return { success: false, error: 'Title and content are required' }
  }
  if (!changeSummary) {
    return { success: false, error: 'Change summary is required' }
  }

  const supabase = await getLegalClient()
  const { data: newDocId, error } = await supabase.rpc('publish_legal_document_v1', {
    p_scope: input.scope,
    p_tenant_id: input.scope === 'tenant' ? input.tenantId ?? null : null,
    p_type: input.type,
    p_locale: input.locale,
    p_title: title,
    p_content_markdown: content,
    p_requires_acceptance: input.requiresAcceptance,
    p_change_summary: changeSummary,
  })

  if (error || !newDocId) {
    console.error('[legal] publishLegalDocument failed', error)
    return { success: false, error: 'Failed to publish document' }
  }

  await supabase
    .from('legal_document_drafts')
    .delete()
    .eq('scope', input.scope)
    .eq('type', input.type)
    .eq('locale', input.locale)
    .eq('tenant_id', input.scope === 'tenant' ? input.tenantId ?? null : null)

  const { data: doc, error: docError } = await supabase
    .from('legal_documents')
    .select('*')
    .eq('id', newDocId)
    .single()

  if (docError) {
    console.error('[legal] publishLegalDocument fetch failed', docError)
    return { success: false, error: 'Published, but failed to load document' }
  }

  return { success: true, data: doc }
}

export async function listLegalAuditEvents(params: {
  scope: LegalDocScope
  tenantId?: string | null
  limit?: number
}): Promise<ActionResult<LegalAuditLogRow[]>> {
  const access = await assertScopeAccess(params.scope, params.tenantId ?? null)
  if (!access.ok) return { success: false, error: access.error }

  const supabase = await getLegalClient()
  let query = supabase
    .from('legal_audit_log')
    .select('*')
    .eq('scope', params.scope)

  if (params.scope === 'tenant') {
    query = query.eq('tenant_id', params.tenantId ?? null)
  } else {
    query = query.is('tenant_id', null)
  }

  query = query.order('created_at', { ascending: false })
  if (params.limit) query = query.limit(params.limit)

  const { data, error } = await query
  if (error) {
    console.error('[legal] listLegalAuditEvents failed', error)
    return { success: false, error: 'Failed to load audit log' }
  }

  return { success: true, data: data ?? [] }
}

export async function getLegalAcceptanceImpact(documentIds: string[]): Promise<ActionResult<AcceptanceImpact>> {
  const supabase = await createServerRlsClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isSystemAdmin(user)) {
    return { success: false, error: 'System admin access required' }
  }

  const adminClient = getLegalServiceClient()
  const { count: totalUsers, error: userError } = await adminClient
    .from('users')
    .select('id', { count: 'exact', head: true })

  if (userError) {
    console.error('[legal] getLegalAcceptanceImpact users failed', userError)
    return { success: false, error: 'Failed to load user counts' }
  }

  const total = totalUsers ?? 0
  const documentStats: Record<string, { acceptedCount: number; pendingCount: number }> = {}

  await Promise.all(documentIds.map(async (docId) => {
    const { count, error } = await adminClient
      .from('user_legal_acceptances')
      .select('id', { count: 'exact', head: true })
      .eq('document_id', docId)

    if (error) {
      console.error('[legal] getLegalAcceptanceImpact acceptances failed', error)
      documentStats[docId] = { acceptedCount: 0, pendingCount: total }
      return
    }

    const accepted = count ?? 0
    documentStats[docId] = { acceptedCount: accepted, pendingCount: Math.max(total - accepted, 0) }
  }))

  return { success: true, data: { totalUsers: total, documentStats } }
}

export async function getOrgLegalAcceptanceMap(params: {
  tenantId: string
  documentIds: string[]
}): Promise<ActionResult<Record<string, OrgLegalAcceptanceRow>>> {
  const access = await assertScopeAccess('tenant', params.tenantId)
  if (!access.ok) return { success: false, error: access.error }

  if (params.documentIds.length === 0) {
    return { success: true, data: {} }
  }

  const supabase = await getLegalClient()
  const { data, error } = await supabase
    .from('org_legal_acceptances')
    .select('*')
    .eq('tenant_id', params.tenantId)
    .in('document_id', params.documentIds)

  if (error) {
    console.error('[legal] getOrgLegalAcceptanceMap failed', error)
    return { success: false, error: 'Failed to load org acceptances' }
  }

  const map: Record<string, OrgLegalAcceptanceRow> = {}
  for (const row of data ?? []) {
    map[row.document_id] = row
  }

  return { success: true, data: map }
}

export async function recordOrgLegalAcceptance(params: {
  tenantId: string
  documentId: string
}): Promise<ActionResult<OrgLegalAcceptanceRow>> {
  const access = await assertScopeAccess('tenant', params.tenantId)
  if (!access.ok) return { success: false, error: access.error }

  const supabase = await getLegalClient()
  const { data: doc, error: docError } = await supabase
    .from('legal_documents')
    .select('id, tenant_id, scope')
    .eq('id', params.documentId)
    .maybeSingle()

  if (docError || !doc || doc.scope !== 'tenant' || doc.tenant_id !== params.tenantId) {
    return { success: false, error: 'Document not found for tenant' }
  }

  const { data, error } = await supabase
    .from('org_legal_acceptances')
    .upsert({
      tenant_id: params.tenantId,
      document_id: params.documentId,
      accepted_by: access.user.id,
    }, { onConflict: 'tenant_id,document_id' })
    .select('*')
    .single()

  if (error) {
    console.error('[legal] recordOrgLegalAcceptance failed', error)
    return { success: false, error: 'Failed to record acceptance' }
  }

  await logLegalEvent({
    scope: 'tenant',
    tenantId: params.tenantId,
    documentId: params.documentId,
    eventType: 'org_accepted',
    payload: { documentId: params.documentId },
  })

  return { success: true, data }
}
