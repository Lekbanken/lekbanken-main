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
    }
  }
}
