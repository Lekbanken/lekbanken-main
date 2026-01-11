/**
 * Translation Enterprise Types
 * 
 * Type definitions for Phase 5 enterprise features:
 * - Missing key tracking
 * - Audit logging  
 * - Tenant overrides
 */

import type { ContentLocale } from './content-types';

// ============================================================================
// Missing Key Tracking
// ============================================================================

export interface TranslationMissingKey {
  id: string;
  key: string;
  locale: ContentLocale;
  namespace: string | null;
  first_seen: string;
  last_seen: string;
  occurrence_count: number;
  source_urls: string[] | null;
  resolved_at: string | null;
  resolved_by: string | null;
}

export interface TranslationMissingKeyInsert {
  key: string;
  locale: ContentLocale;
  namespace?: string | null;
  source_urls?: string[];
}

export interface MissingKeyReport {
  key: string;
  locale: ContentLocale;
  namespace?: string;
  sourceUrl?: string;
}

export interface MissingKeySummary {
  locale: ContentLocale;
  totalMissing: number;
  recentlyReported: number;  // Last 24h
  topNamespaces: { namespace: string; count: number }[];
}

// ============================================================================
// Audit Log
// ============================================================================

export type AuditAction = 'create' | 'update' | 'delete';

export interface TranslationAuditLogEntry {
  id: string;
  action: AuditAction;
  table_name: string;
  record_id: string;
  locale: string | null;
  parent_id: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  changed_fields: string[] | null;
  user_id: string | null;
  tenant_id: string | null;
  created_at: string;
  // Joined fields
  user_name?: string;
  user_email?: string;
}

export interface AuditLogFilter {
  tableName?: string;
  recordId?: string;
  parentId?: string;
  userId?: string;
  tenantId?: string;
  action?: AuditAction;
  locale?: ContentLocale;
  fromDate?: string;
  toDate?: string;
}

// ============================================================================
// Tenant Overrides
// ============================================================================

export interface TenantTranslationOverride {
  id: string;
  tenant_id: string;
  key: string;
  namespace: string | null;
  locale: ContentLocale;
  original_value: string | null;
  override_value: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface TenantTranslationOverrideInsert {
  tenant_id: string;
  key: string;
  namespace?: string;
  locale: ContentLocale;
  original_value?: string;
  override_value: string;
}

export interface TenantTranslationOverrideUpdate {
  override_value?: string;
  is_active?: boolean;
}

// ============================================================================
// Dashboard / Analytics
// ============================================================================

export interface TranslationHealthMetrics {
  missingKeys: {
    total: number;
    byLocale: Record<ContentLocale, number>;
    trend: 'increasing' | 'stable' | 'decreasing';
  };
  recentChanges: {
    last24h: number;
    last7d: number;
  };
  coverage: {
    system: Record<ContentLocale, number>;  // Percentage
    content: Record<ContentLocale, number>; // Percentage
  };
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ReportMissingKeyResponse {
  success: boolean;
  isNew: boolean;  // True if this was a new key
}

export interface AuditLogResponse {
  entries: TranslationAuditLogEntry[];
  total: number;
  hasMore: boolean;
}
