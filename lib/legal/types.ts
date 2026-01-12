import type { Database as BaseDatabase } from '@/types/supabase'

export type LegalDocType = 'terms' | 'privacy' | 'org_terms' | 'dpa' | 'cookie_policy'
export type LegalDocScope = 'global' | 'tenant'
export type LegalLocale = 'sv' | 'no' | 'en'

export interface LegalDocumentRow {
  id: string
  scope: LegalDocScope
  tenant_id: string | null
  type: LegalDocType
  locale: LegalLocale
  title: string
  content_markdown: string
  version_int: number
  is_active: boolean
  requires_acceptance: boolean
  change_summary: string
  previous_version_id: string | null
  created_by: string | null
  created_at: string
  published_at: string | null
}

export interface LegalDocumentInsert {
  id?: string
  scope: LegalDocScope
  tenant_id?: string | null
  type: LegalDocType
  locale: LegalLocale
  title: string
  content_markdown: string
  version_int: number
  is_active?: boolean
  requires_acceptance?: boolean
  change_summary: string
  previous_version_id?: string | null
  created_by?: string | null
  created_at?: string
  published_at?: string | null
}

export interface LegalDocumentUpdate {
  scope?: LegalDocScope
  tenant_id?: string | null
  type?: LegalDocType
  locale?: LegalLocale
  title?: string
  content_markdown?: string
  version_int?: number
  is_active?: boolean
  requires_acceptance?: boolean
  change_summary?: string
  previous_version_id?: string | null
  created_by?: string | null
  created_at?: string
  published_at?: string | null
}

export interface LegalDocumentDraftRow {
  id: string
  scope: LegalDocScope
  tenant_id: string | null
  type: LegalDocType
  locale: LegalLocale
  title: string
  content_markdown: string
  requires_acceptance: boolean
  change_summary: string
  created_at: string
  updated_at: string
  updated_by: string | null
}

export interface LegalDocumentDraftInsert {
  id?: string
  scope: LegalDocScope
  tenant_id?: string | null
  type: LegalDocType
  locale: LegalLocale
  title: string
  content_markdown: string
  requires_acceptance?: boolean
  change_summary?: string
  created_at?: string
  updated_at?: string
  updated_by?: string | null
}

export interface LegalDocumentDraftUpdate {
  scope?: LegalDocScope
  tenant_id?: string | null
  type?: LegalDocType
  locale?: LegalLocale
  title?: string
  content_markdown?: string
  requires_acceptance?: boolean
  change_summary?: string
  created_at?: string
  updated_at?: string
  updated_by?: string | null
}

export interface UserLegalAcceptanceRow {
  id: string
  user_id: string
  document_id: string
  tenant_id_snapshot: string | null
  accepted_locale: LegalLocale
  accepted_at: string
  ip_hash: string | null
  user_agent: string | null
}

export interface UserLegalAcceptanceInsert {
  id?: string
  user_id: string
  document_id: string
  tenant_id_snapshot?: string | null
  accepted_locale: LegalLocale
  accepted_at?: string
  ip_hash?: string | null
  user_agent?: string | null
}

export interface UserLegalAcceptanceUpdate {
  user_id?: string
  document_id?: string
  tenant_id_snapshot?: string | null
  accepted_locale?: LegalLocale
  accepted_at?: string
  ip_hash?: string | null
  user_agent?: string | null
}

export interface OrgLegalAcceptanceRow {
  id: string
  tenant_id: string
  document_id: string
  accepted_by: string
  accepted_at: string
}

export interface OrgLegalAcceptanceInsert {
  id?: string
  tenant_id: string
  document_id: string
  accepted_by: string
  accepted_at?: string
}

export interface OrgLegalAcceptanceUpdate {
  tenant_id?: string
  document_id?: string
  accepted_by?: string
  accepted_at?: string
}

export interface LegalAuditLogRow {
  id: string
  scope: LegalDocScope
  tenant_id: string | null
  document_id: string | null
  actor_user_id: string | null
  event_type: string
  payload: Record<string, unknown>
  created_at: string
}

export interface LegalAuditLogInsert {
  id?: string
  scope: LegalDocScope
  tenant_id?: string | null
  document_id?: string | null
  actor_user_id?: string | null
  event_type: string
  payload?: Record<string, unknown>
  created_at?: string
}

export interface LegalAuditLogUpdate {
  scope?: LegalDocScope
  tenant_id?: string | null
  document_id?: string | null
  actor_user_id?: string | null
  event_type?: string
  payload?: Record<string, unknown>
  created_at?: string
}

export interface CookieCatalogRow {
  key: string
  category: 'necessary' | 'functional' | 'analytics' | 'marketing'
  purpose: string
  provider: string | null
  ttl_days: number | null
  default_on: boolean
  created_at: string
  updated_at: string
}

export interface CookieCatalogInsert {
  key: string
  category: 'necessary' | 'functional' | 'analytics' | 'marketing'
  purpose: string
  provider?: string | null
  ttl_days?: number | null
  default_on?: boolean
  created_at?: string
  updated_at?: string
}

export interface CookieCatalogUpdate {
  category?: 'necessary' | 'functional' | 'analytics' | 'marketing'
  purpose?: string
  provider?: string | null
  ttl_days?: number | null
  default_on?: boolean
  created_at?: string
  updated_at?: string
}

export interface CookieConsentRow {
  id: string
  user_id: string
  cookie_key: string
  consent: boolean
  given_at: string
  schema_version: number
  source: 'banner' | 'settings'
  tenant_id_snapshot: string | null
}

export interface CookieConsentInsert {
  id?: string
  user_id: string
  cookie_key: string
  consent: boolean
  given_at?: string
  schema_version: number
  source: 'banner' | 'settings'
  tenant_id_snapshot?: string | null
}

export interface CookieConsentUpdate {
  cookie_key?: string
  consent?: boolean
  given_at?: string
  schema_version?: number
  source?: 'banner' | 'settings'
  tenant_id_snapshot?: string | null
}

// Tables we override with stricter enum types
type LegalTableNames =
  | 'legal_documents'
  | 'user_legal_acceptances'
  | 'cookie_catalog'
  | 'cookie_consents'
  | 'legal_document_drafts'
  | 'org_legal_acceptances'
  | 'legal_audit_log'

// Use the base Database type directly to avoid intersection conflicts with stricter enum types.
// Cast query results to our stricter Row types (e.g., LegalDocumentRow) when needed.
export type LegalDatabase = BaseDatabase
