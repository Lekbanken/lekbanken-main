/**
 * Translation Enterprise Server API
 * 
 * Server-side functions for enterprise translation features:
 * - Missing key tracking and reporting
 * - Audit log queries
 * - Tenant override management
 */

import { createServerRlsClient } from '@/lib/supabase/server';
import type { ContentLocale } from './content-types';
import type {
  TranslationMissingKey,
  MissingKeyReport,
  MissingKeySummary,
  TranslationAuditLogEntry,
  AuditLogFilter,
  TenantTranslationOverride,
  TenantTranslationOverrideInsert,
  TenantTranslationOverrideUpdate,
  TranslationHealthMetrics,
} from './enterprise-types';
import { CONTENT_LOCALES } from './content-types';

// ============================================================================
// Missing Key Tracking
// ============================================================================

/**
 * Report a missing translation key (upsert - increment count if exists)
 */
export async function reportMissingKey(report: MissingKeyReport): Promise<{ success: boolean; isNew: boolean }> {
  const supabase = await createServerRlsClient();
  
  // Try to update existing
  const { data: existing } = await supabase
    .from('translation_missing_keys')
    .select('id, occurrence_count, source_urls')
    .eq('key', report.key)
    .eq('locale', report.locale)
    .single();
  
  if (existing) {
    // Update existing entry
    const newUrls = existing.source_urls ?? [];
    if (report.sourceUrl && !newUrls.includes(report.sourceUrl)) {
      newUrls.push(report.sourceUrl);
      // Keep only last 10 URLs
      if (newUrls.length > 10) newUrls.shift();
    }
    
    await supabase
      .from('translation_missing_keys')
      .update({
        last_seen: new Date().toISOString(),
        occurrence_count: existing.occurrence_count + 1,
        source_urls: newUrls,
      })
      .eq('id', existing.id);
    
    return { success: true, isNew: false };
  }
  
  // Insert new entry
  const { error } = await supabase
    .from('translation_missing_keys')
    .insert({
      key: report.key,
      locale: report.locale,
      namespace: report.namespace ?? null,
      source_urls: report.sourceUrl ? [report.sourceUrl] : [],
    });
  
  if (error) {
    // Handle race condition - another request might have inserted
    if (error.code === '23505') { // Unique violation
      return { success: true, isNew: false };
    }
    throw error;
  }
  
  return { success: true, isNew: true };
}

/**
 * Get all unresolved missing keys
 */
export async function getMissingKeys(
  locale?: ContentLocale,
  limit = 100
): Promise<TranslationMissingKey[]> {
  const supabase = await createServerRlsClient();
  
  let query = supabase
    .from('translation_missing_keys')
    .select('*')
    .is('resolved_at', null)
    .order('occurrence_count', { ascending: false })
    .limit(limit);
  
  if (locale) {
    query = query.eq('locale', locale);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  
  return (data ?? []) as TranslationMissingKey[];
}

/**
 * Get missing key summary per locale
 */
export async function getMissingKeySummary(): Promise<MissingKeySummary[]> {
  const supabase = await createServerRlsClient();
  const summaries: MissingKeySummary[] = [];
  
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  
  for (const locale of CONTENT_LOCALES) {
    // Get total missing
    const { count: totalMissing } = await supabase
      .from('translation_missing_keys')
      .select('*', { count: 'exact', head: true })
      .eq('locale', locale)
      .is('resolved_at', null);
    
    // Get recently reported
    const { count: recentlyReported } = await supabase
      .from('translation_missing_keys')
      .select('*', { count: 'exact', head: true })
      .eq('locale', locale)
      .is('resolved_at', null)
      .gte('last_seen', oneDayAgo);
    
    // Get top namespaces
    const { data: namespaceData } = await supabase
      .from('translation_missing_keys')
      .select('namespace')
      .eq('locale', locale)
      .is('resolved_at', null)
      .not('namespace', 'is', null);
    
    const namespaceCounts = new Map<string, number>();
    for (const row of namespaceData ?? []) {
      if (row.namespace) {
        namespaceCounts.set(row.namespace, (namespaceCounts.get(row.namespace) ?? 0) + 1);
      }
    }
    
    const topNamespaces = Array.from(namespaceCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([namespace, count]) => ({ namespace, count }));
    
    summaries.push({
      locale,
      totalMissing: totalMissing ?? 0,
      recentlyReported: recentlyReported ?? 0,
      topNamespaces,
    });
  }
  
  return summaries;
}

/**
 * Mark a missing key as resolved
 */
export async function resolveMissingKey(keyId: string): Promise<void> {
  const supabase = await createServerRlsClient();
  const { data: user } = await supabase.auth.getUser();
  
  const { error } = await supabase
    .from('translation_missing_keys')
    .update({
      resolved_at: new Date().toISOString(),
      resolved_by: user?.user?.id,
    })
    .eq('id', keyId);
  
  if (error) throw error;
}

/**
 * Bulk resolve missing keys
 */
export async function resolveMissingKeys(keyIds: string[]): Promise<void> {
  const supabase = await createServerRlsClient();
  const { data: user } = await supabase.auth.getUser();
  
  const { error } = await supabase
    .from('translation_missing_keys')
    .update({
      resolved_at: new Date().toISOString(),
      resolved_by: user?.user?.id,
    })
    .in('id', keyIds);
  
  if (error) throw error;
}

// ============================================================================
// Audit Log
// ============================================================================

/**
 * Get translation audit log entries
 */
export async function getAuditLog(
  filter: AuditLogFilter = {},
  limit = 50,
  offset = 0
): Promise<{ entries: TranslationAuditLogEntry[]; total: number }> {
  const supabase = await createServerRlsClient();
  
  let query = supabase
    .from('translation_audit_log')
    .select(`
      *,
      users:user_id (
        full_name,
        email
      )
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  
  if (filter.tableName) {
    query = query.eq('table_name', filter.tableName);
  }
  if (filter.recordId) {
    query = query.eq('record_id', filter.recordId);
  }
  if (filter.parentId) {
    query = query.eq('parent_id', filter.parentId);
  }
  if (filter.userId) {
    query = query.eq('user_id', filter.userId);
  }
  if (filter.tenantId) {
    query = query.eq('tenant_id', filter.tenantId);
  }
  if (filter.action) {
    query = query.eq('action', filter.action);
  }
  if (filter.locale) {
    query = query.eq('locale', filter.locale);
  }
  if (filter.fromDate) {
    query = query.gte('created_at', filter.fromDate);
  }
  if (filter.toDate) {
    query = query.lte('created_at', filter.toDate);
  }
  
  const { data, error, count } = await query;
  if (error) throw error;
  
  // Map to typed entries with user info
  const entries: TranslationAuditLogEntry[] = (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    action: row.action as 'create' | 'update' | 'delete',
    table_name: row.table_name as string,
    record_id: row.record_id as string,
    locale: row.locale as string | null,
    parent_id: row.parent_id as string | null,
    old_value: row.old_value as Record<string, unknown> | null,
    new_value: row.new_value as Record<string, unknown> | null,
    changed_fields: row.changed_fields as string[] | null,
    user_id: row.user_id as string | null,
    tenant_id: row.tenant_id as string | null,
    created_at: row.created_at as string,
    user_name: (row.users as Record<string, unknown> | null)?.full_name as string | undefined,
    user_email: (row.users as Record<string, unknown> | null)?.email as string | undefined,
  }));
  
  return { entries, total: count ?? 0 };
}

/**
 * Get recent audit log entries for a specific translation
 */
export async function getTranslationHistory(
  tableName: string,
  recordId: string,
  limit = 20
): Promise<TranslationAuditLogEntry[]> {
  const { entries } = await getAuditLog(
    { tableName, recordId },
    limit,
    0
  );
  return entries;
}

// ============================================================================
// Tenant Overrides
// ============================================================================

/**
 * Get all tenant translation overrides
 */
export async function getTenantOverrides(
  tenantId: string,
  locale?: ContentLocale
): Promise<TenantTranslationOverride[]> {
  const supabase = await createServerRlsClient();
  
  let query = supabase
    .from('tenant_translation_overrides')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('key');
  
  if (locale) {
    query = query.eq('locale', locale);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  
  return (data ?? []) as TenantTranslationOverride[];
}

/**
 * Get active tenant overrides for runtime use
 */
export async function getActiveTenantOverrides(
  tenantId: string,
  locale: ContentLocale
): Promise<Map<string, string>> {
  const supabase = await createServerRlsClient();
  
  const { data, error } = await supabase
    .from('tenant_translation_overrides')
    .select('key, override_value')
    .eq('tenant_id', tenantId)
    .eq('locale', locale)
    .eq('is_active', true);
  
  if (error) throw error;
  
  const overrides = new Map<string, string>();
  for (const row of data ?? []) {
    overrides.set(row.key, row.override_value);
  }
  
  return overrides;
}

/**
 * Create or update a tenant override
 */
export async function upsertTenantOverride(
  input: TenantTranslationOverrideInsert
): Promise<TenantTranslationOverride> {
  const supabase = await createServerRlsClient();
  const { data: user } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from('tenant_translation_overrides')
    .upsert({
      ...input,
      updated_by: user?.user?.id,
    }, {
      onConflict: 'tenant_id,key,locale',
    })
    .select()
    .single();
  
  if (error) throw error;
  return data as TenantTranslationOverride;
}

/**
 * Update a tenant override
 */
export async function updateTenantOverride(
  overrideId: string,
  update: TenantTranslationOverrideUpdate
): Promise<TenantTranslationOverride> {
  const supabase = await createServerRlsClient();
  const { data: user } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from('tenant_translation_overrides')
    .update({
      ...update,
      updated_by: user?.user?.id,
    })
    .eq('id', overrideId)
    .select()
    .single();
  
  if (error) throw error;
  return data as TenantTranslationOverride;
}

/**
 * Delete a tenant override
 */
export async function deleteTenantOverride(overrideId: string): Promise<void> {
  const supabase = await createServerRlsClient();
  
  const { error } = await supabase
    .from('tenant_translation_overrides')
    .delete()
    .eq('id', overrideId);
  
  if (error) throw error;
}

// ============================================================================
// Health Metrics
// ============================================================================

/**
 * Get translation health metrics for dashboard
 */
export async function getTranslationHealthMetrics(): Promise<TranslationHealthMetrics> {
  const supabase = await createServerRlsClient();
  
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  
  // Missing keys by locale
  const missingByLocale: Record<ContentLocale, number> = { sv: 0, en: 0, no: 0 };
  let totalMissing = 0;
  
  for (const locale of CONTENT_LOCALES) {
    const { count } = await supabase
      .from('translation_missing_keys')
      .select('*', { count: 'exact', head: true })
      .eq('locale', locale)
      .is('resolved_at', null);
    
    missingByLocale[locale] = count ?? 0;
    totalMissing += count ?? 0;
  }
  
  // Recent changes
  const { count: last24h } = await supabase
    .from('translation_audit_log')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', oneDayAgo);
  
  const { count: last7d } = await supabase
    .from('translation_audit_log')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', oneWeekAgo);
  
  // Trend calculation (compare last 7d to previous 7d)
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const { count: previousWeek } = await supabase
    .from('translation_missing_keys')
    .select('*', { count: 'exact', head: true })
    .gte('first_seen', twoWeeksAgo)
    .lt('first_seen', oneWeekAgo);
  
  const { count: thisWeek } = await supabase
    .from('translation_missing_keys')
    .select('*', { count: 'exact', head: true })
    .gte('first_seen', oneWeekAgo);
  
  const prevCount = previousWeek ?? 0;
  const currCount = thisWeek ?? 0;
  let trend: 'increasing' | 'stable' | 'decreasing' = 'stable';
  if (currCount > prevCount * 1.1) trend = 'increasing';
  if (currCount < prevCount * 0.9) trend = 'decreasing';
  
  return {
    missingKeys: {
      total: totalMissing,
      byLocale: missingByLocale,
      trend,
    },
    recentChanges: {
      last24h: last24h ?? 0,
      last7d: last7d ?? 0,
    },
    coverage: {
      // These would need actual coverage calculation from Phase 4
      system: { sv: 100, en: 45, no: 30 },
      content: { sv: 100, en: 40, no: 25 },
    },
  };
}
