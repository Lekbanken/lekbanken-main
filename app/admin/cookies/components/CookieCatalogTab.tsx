'use client'

/**
 * Cookie Catalog Tab
 * CRUD management for cookies in the cookie_catalog table
 */

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { PlusIcon, PencilIcon, TrashIcon, TableCellsIcon } from '@heroicons/react/24/outline'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AdminEmptyState, AdminCard } from '@/components/admin/shared'
import { CookieFormDialog } from './CookieFormDialog'

// ============================================================================
// Types (matching existing database schema)
// ============================================================================

export interface CookieCatalogItem {
  key: string
  category: 'necessary' | 'functional' | 'analytics' | 'marketing'
  purpose: string
  provider: string | null
  ttl_days: number | null
  default_on: boolean
  created_at: string
  updated_at: string
}

// ============================================================================
// Component
// ============================================================================

export function CookieCatalogTab() {
  const t = useTranslations('admin.cookies.catalog')
  
  const [cookies, setCookies] = useState<CookieCatalogItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCookie, setEditingCookie] = useState<CookieCatalogItem | null>(null)
  const [deletingKey, setDeletingKey] = useState<string | null>(null)

  // Load cookies from database
  const loadCookies = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const { data, error: fetchError } = await supabase
        .from('cookie_catalog')
        .select('*')
        .order('category', { ascending: true })
        .order('key', { ascending: true })

      if (fetchError) throw fetchError
      // Cast category from string to the expected union type
      setCookies((data || []) as CookieCatalogItem[])
    } catch (err) {
      console.error('[CookieCatalogTab] Error loading cookies:', err)
      setError('Failed to load cookie catalog')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCookies()
  }, [loadCookies])

  // Handle add/edit
  const handleOpenDialog = (cookie?: CookieCatalogItem) => {
    setEditingCookie(cookie || null)
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingCookie(null)
  }

  const handleSave = async () => {
    handleCloseDialog()
    await loadCookies()
  }

  // Handle delete
  const handleDelete = async (key: string) => {
    if (!confirm(t('confirmDelete'))) return
    
    setDeletingKey(key)
    try {
      const { error: deleteError } = await supabase
        .from('cookie_catalog')
        .delete()
        .eq('key', key)

      if (deleteError) throw deleteError
      await loadCookies()
    } catch (err) {
      console.error('[CookieCatalogTab] Error deleting cookie:', err)
      alert('Failed to delete cookie')
    } finally {
      setDeletingKey(null)
    }
  }

  // Format TTL for display
  const formatTtl = (ttlDays: number | null): string => {
    if (ttlDays === null || ttlDays === 0) return 'Session'
    if (ttlDays === 1) return '1 day'
    if (ttlDays < 30) return `${ttlDays} days`
    if (ttlDays < 365) return `${Math.round(ttlDays / 30)} months`
    return `${Math.round(ttlDays / 365)} year${ttlDays >= 730 ? 's' : ''}`
  }

  // Category badge colors
  const categoryColors: Record<string, string> = {
    necessary: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    functional: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    analytics: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    marketing: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
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
      {/* Header with Add button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{t('title')}</h3>
          <p className="text-sm text-muted-foreground">{t('description')}</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <PlusIcon className="mr-2 h-4 w-4" />
          {t('addCookie')}
        </Button>
      </div>

      {/* Cookie List */}
      {isLoading ? (
        <AdminCard>
          <div className="flex items-center justify-center p-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        </AdminCard>
      ) : cookies.length === 0 ? (
        <AdminEmptyState
          icon={<TableCellsIcon className="h-6 w-6" />}
          title={t('emptyTitle')}
          description={t('emptyDescription')}
        />
      ) : (
        <AdminCard>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {t('fields.name')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {t('fields.provider')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {t('fields.category')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {t('fields.duration')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {t('fields.isActive')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {cookies.map((cookie) => (
                  <tr key={cookie.key} className="hover:bg-muted/50 transition-colors">
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-foreground font-mono">
                      {cookie.key}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
                      {cookie.provider || '-'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${categoryColors[cookie.category]}`}>
                        {t(`categories.${cookie.category}`)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
                      {formatTtl(cookie.ttl_days)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <Badge variant={cookie.default_on ? 'default' : 'secondary'}>
                        {cookie.default_on ? 'Default On' : 'Default Off'}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(cookie)}
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(cookie.key)}
                          disabled={deletingKey === cookie.key}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminCard>
      )}

      {/* Add/Edit Dialog */}
      <CookieFormDialog
        open={isDialogOpen}
        onClose={handleCloseDialog}
        onSave={handleSave}
        cookie={editingCookie}
      />
    </div>
  )
}
