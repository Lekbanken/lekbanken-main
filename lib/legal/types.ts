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

export type LegalDatabase = BaseDatabase & {
  public: BaseDatabase['public'] & {
    Tables: BaseDatabase['public']['Tables'] & {
      legal_documents: {
        Row: LegalDocumentRow
        Insert: LegalDocumentInsert
        Update: LegalDocumentUpdate
        Relationships: []
      }
      user_legal_acceptances: {
        Row: UserLegalAcceptanceRow
        Insert: UserLegalAcceptanceInsert
        Update: UserLegalAcceptanceUpdate
        Relationships: []
      }
      cookie_catalog: {
        Row: CookieCatalogRow
        Insert: CookieCatalogInsert
        Update: CookieCatalogUpdate
        Relationships: []
      }
      cookie_consents: {
        Row: CookieConsentRow
        Insert: CookieConsentInsert
        Update: CookieConsentUpdate
        Relationships: []
      }
      legal_document_drafts: {
        Row: LegalDocumentDraftRow
        Insert: LegalDocumentDraftInsert
        Update: LegalDocumentDraftUpdate
        Relationships: []
      }
      org_legal_acceptances: {
        Row: OrgLegalAcceptanceRow
        Insert: OrgLegalAcceptanceInsert
        Update: OrgLegalAcceptanceUpdate
        Relationships: []
      }
      legal_audit_log: {
        Row: LegalAuditLogRow
        Insert: LegalAuditLogInsert
        Update: LegalAuditLogUpdate
        Relationships: []
      }
    }
  }
}
