'use client'

/**
 * Consent Audit Tab
 * View and export consent audit log for GDPR compliance
 */

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { 
  ArrowDownTrayIcon, 
  ClipboardDocumentListIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AdminEmptyState, AdminCard } from '@/components/admin/shared'

// ============================================================================
// Types
// ============================================================================

interface AuditLogEntry {
  id: string
  consent_id: string
  user_id: string | null
  event_type: 'granted' | 'denied' | 'updated' | 'withdrawn'
  previous_state: Record<string, boolean> | null
  new_state: Record<string, boolean>
  consent_version: string
  ip_address: string | null
  locale: string | null
  dnt_enabled: boolean
  gpc_enabled: boolean
  created_at: string
}

// ============================================================================
// Component
// ============================================================================

export function ConsentAuditTab() {
  const t = useTranslations('admin.cookies.audit')
  
  const [entries, setEntries] = useState<AuditLogEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  // Load audit log entries
  const loadEntries = useCallback(async () => {
    setIsLoading(true)
    
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any
      
      let query = db
        .from('cookie_consent_audit')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (filter !== 'all') {
        query = query.eq('event_type', filter)
      }

      const { data, error } = await query

      if (error) {
        console.error('[ConsentAuditTab] Error loading audit log:', error)
        // Table might not exist yet
        setEntries([])
      } else {
        setEntries(data || [])
      }
    } catch (err) {
      console.error('[ConsentAuditTab] Error:', err)
      setEntries([])
    } finally {
      setIsLoading(false)
    }
  }, [filter])

  useEffect(() => {
    loadEntries()
  }, [loadEntries])

  // Export to CSV
  const handleExport = () => {
    if (entries.length === 0) return

    const headers = [
      'Timestamp',
      'User ID',
      'Consent ID',
      'Event Type',
      'New State',
      'Version',
      'Locale',
      'IP Address',
      'DNT',
      'GPC',
    ]

    const rows = entries.map((entry) => [
      entry.created_at,
      entry.user_id || 'anonymous',
      entry.consent_id,
      entry.event_type,
      JSON.stringify(entry.new_state),
      entry.consent_version,
      entry.locale || '',
      entry.ip_address || '',
      entry.dnt_enabled ? 'Yes' : 'No',
      entry.gpc_enabled ? 'Yes' : 'No',
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `consent_audit_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  // Event type badge colors
  const eventColors: Record<string, string> = {
    granted: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    denied: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    updated: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    withdrawn: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  }

  // Format consent state for display
  const formatState = (state: Record<string, boolean>) => {
    const enabled = Object.entries(state)
      .filter(([, v]) => v)
      .map(([k]) => k.charAt(0).toUpperCase())
    return enabled.join(', ') || 'None'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{t('title')}</h3>
          <p className="text-sm text-muted-foreground">{t('description')}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Filter */}
          <div className="flex items-center gap-2">
            <FunnelIcon className="h-4 w-4 text-muted-foreground" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
            >
              <option value="all">All Events</option>
              <option value="granted">{t('eventTypes.granted')}</option>
              <option value="denied">{t('eventTypes.denied')}</option>
              <option value="updated">{t('eventTypes.updated')}</option>
              <option value="withdrawn">{t('eventTypes.withdrawn')}</option>
            </select>
          </div>
          
          {/* Export */}
          <Button variant="outline" onClick={handleExport} disabled={entries.length === 0}>
            <ArrowDownTrayIcon className="mr-2 h-4 w-4" />
            {t('export')}
          </Button>
        </div>
      </div>

      {/* Audit Log Table */}
      {isLoading ? (
        <AdminCard>
          <div className="flex items-center justify-center p-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        </AdminCard>
      ) : entries.length === 0 ? (
        <AdminEmptyState
          icon={<ClipboardDocumentListIcon className="h-6 w-6" />}
          title="No audit entries"
          description="Consent events will appear here as users interact with the cookie banner. Make sure the database migration has been applied."
        />
      ) : (
        <AdminCard>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {t('fields.timestamp')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {t('fields.userId')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {t('fields.eventType')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {t('fields.consentState')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {t('fields.locale')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Signals
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-muted/50 transition-colors">
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
                      {new Date(entry.created_at).toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-mono text-foreground">
                      {entry.user_id ? entry.user_id.substring(0, 8) + '...' : 'Anonymous'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${eventColors[entry.event_type]}`}>
                        {t(`eventTypes.${entry.event_type}`)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground font-mono">
                      {formatState(entry.new_state)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground uppercase">
                      {entry.locale || '-'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex items-center gap-1">
                        {entry.gpc_enabled && (
                          <Badge variant="secondary" className="text-xs">GPC</Badge>
                        )}
                        {entry.dnt_enabled && (
                          <Badge variant="secondary" className="text-xs">DNT</Badge>
                        )}
                        {!entry.gpc_enabled && !entry.dnt_enabled && (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Note about pagination */}
          <div className="border-t border-border px-4 py-3 text-center text-xs text-muted-foreground">
            {t('paginationNote', { count: 100 })}
          </div>
        </AdminCard>
      )}
    </div>
  )
}
