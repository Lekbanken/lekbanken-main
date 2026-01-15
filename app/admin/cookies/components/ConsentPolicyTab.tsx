'use client'

/**
 * Consent Policy Tab
 * Manage consent policy versions
 */

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { PlusIcon, CheckCircleIcon, DocumentTextIcon } from '@heroicons/react/24/outline'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { AdminEmptyState, AdminCard } from '@/components/admin/shared'

// ============================================================================
// Types
// ============================================================================

interface PolicyVersion {
  id: string
  version: string
  effective_date: string
  change_summary: string | null
  status: 'draft' | 'active' | 'archived'
  created_at: string
  created_by: string | null
}

// ============================================================================
// Component
// ============================================================================

export function ConsentPolicyTab() {
  const t = useTranslations('admin.cookies.policy')
  
  const [versions, setVersions] = useState<PolicyVersion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load policy versions from database
  const loadVersions = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any
      const { data, error: fetchError } = await db
        .from('consent_policy_versions')
        .select('*')
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      setVersions(data || [])
    } catch (err) {
      console.error('[ConsentPolicyTab] Error loading versions:', err)
      // Table might not exist yet if migration hasn't run
      setVersions([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadVersions()
  }, [loadVersions])

  // Find current active version
  const activeVersion = versions.find(v => v.status === 'active')

  // Status badge colors
  const statusColors: Record<string, string> = {
    draft: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    archived: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  }

  // Create new version
  const handleCreateVersion = async () => {
    const newVersion = prompt('Enter new version number (e.g., 1.1):')
    if (!newVersion) return

    const changeSummary = prompt('Describe what changed in this version:')
    
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any
      const { error: insertError } = await db
        .from('consent_policy_versions')
        .insert({
          version: newVersion,
          change_summary: changeSummary || null,
          status: 'draft',
          effective_date: new Date().toISOString(),
        })

      if (insertError) throw insertError
      await loadVersions()
    } catch (err) {
      console.error('[ConsentPolicyTab] Error creating version:', err)
      alert('Failed to create new version. Make sure the database migration has been applied.')
    }
  }

  // Activate a version (archives all others)
  const handleActivate = async (versionId: string) => {
    if (!confirm('Activating this version will prompt all users to re-consent. Continue?')) return

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any
      
      // Archive all current active versions
      await db
        .from('consent_policy_versions')
        .update({ status: 'archived' })
        .eq('status', 'active')

      // Activate the selected version
      const { error: activateError } = await db
        .from('consent_policy_versions')
        .update({ 
          status: 'active',
          effective_date: new Date().toISOString(),
        })
        .eq('id', versionId)

      if (activateError) throw activateError
      await loadVersions()
    } catch (err) {
      console.error('[ConsentPolicyTab] Error activating version:', err)
      alert('Failed to activate version')
    }
  }

  if (error) {
    return (
      <AdminCard>
        <div className="p-6 text-center text-red-600 dark:text-red-400">
          {error}
        </div>
      </AdminCard>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with current version info */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{t('title')}</h3>
          <p className="text-sm text-muted-foreground">{t('description')}</p>
        </div>
        <Button onClick={handleCreateVersion}>
          <PlusIcon className="mr-2 h-4 w-4" />
          {t('createVersion')}
        </Button>
      </div>

      {/* Current Active Version Card */}
      {activeVersion && (
        <AdminCard>
          <div className="p-6">
            <div className="flex items-center gap-3">
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">{t('currentVersion')}</p>
                <p className="text-2xl font-bold text-foreground">v{activeVersion.version}</p>
              </div>
            </div>
            {activeVersion.change_summary && (
              <p className="mt-4 text-sm text-muted-foreground">
                {activeVersion.change_summary}
              </p>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              Effective since: {new Date(activeVersion.effective_date).toLocaleDateString()}
            </p>
          </div>
        </AdminCard>
      )}

      {/* Version History */}
      {isLoading ? (
        <AdminCard>
          <div className="flex items-center justify-center p-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        </AdminCard>
      ) : versions.length === 0 ? (
        <AdminEmptyState
          icon={<DocumentTextIcon className="h-6 w-6" />}
          title="No policy versions"
          description="Create your first consent policy version to start tracking consent changes."
        />
      ) : (
        <AdminCard>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {t('fields.version')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {t('fields.effectiveDate')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {t('fields.changeSummary')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {t('fields.status')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {versions.map((version) => (
                  <tr key={version.id} className="hover:bg-muted/50 transition-colors">
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-foreground">
                      v{version.version}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
                      {new Date(version.effective_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground max-w-xs truncate">
                      {version.change_summary || '-'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[version.status]}`}>
                        {t(`status.${version.status}`)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      {version.status === 'draft' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleActivate(version.id)}
                        >
                          Activate
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminCard>
      )}
    </div>
  )
}
