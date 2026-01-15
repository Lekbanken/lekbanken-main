'use client'

/**
 * Consent Statistics Tab
 * Dashboard showing consent metrics and trends
 */

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  AdjustmentsHorizontalIcon,
  UsersIcon,
  ShieldExclamationIcon,
} from '@heroicons/react/24/outline'
import { supabase } from '@/lib/supabase/client'
import { AdminCard, AdminStatCard, AdminStatGrid } from '@/components/admin/shared'

// ============================================================================
// Types
// ============================================================================

interface ConsentStats {
  total: number
  acceptAll: number
  denyAll: number
  customized: number
  byCategory: {
    necessary: number
    functional: number
    analytics: number
    marketing: number
  }
  byLocale: Record<string, number>
  gpcEnabled: number
  dntEnabled: number
}

const defaultStats: ConsentStats = {
  total: 0,
  acceptAll: 0,
  denyAll: 0,
  customized: 0,
  byCategory: {
    necessary: 0,
    functional: 0,
    analytics: 0,
    marketing: 0,
  },
  byLocale: {},
  gpcEnabled: 0,
  dntEnabled: 0,
}

// ============================================================================
// Component
// ============================================================================

export function ConsentStatisticsTab() {
  const t = useTranslations('admin.cookies.statistics')
  
  const [stats, setStats] = useState<ConsentStats>(defaultStats)
  const [isLoading, setIsLoading] = useState(true)

  // Load consent statistics
  const loadStats = useCallback(async () => {
    setIsLoading(true)
    
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any
      
      // Get consent counts from cookie_consents table (authenticated users)
      const { data: consents, error: consentsError } = await db
        .from('cookie_consents')
        .select('necessary, functional, analytics, marketing, locale')

      if (consentsError) {
        console.error('[ConsentStatisticsTab] Error loading consents:', consentsError)
      }

      // Get anonymous consent stats
      const { data: anonConsents, error: anonError } = await db
        .from('anonymous_cookie_consents')
        .select('necessary, functional, analytics, marketing, locale, gpc_enabled, dnt_enabled')

      if (anonError) {
        console.error('[ConsentStatisticsTab] Error loading anonymous consents:', anonError)
      }

      // Combine authenticated and anonymous consents
      const allConsents = [...(consents || []), ...(anonConsents || [])]
      
      // Calculate statistics
      let acceptAll = 0
      let denyAll = 0
      let customized = 0
      const byCategory = { necessary: 0, functional: 0, analytics: 0, marketing: 0 }
      const byLocale: Record<string, number> = {}
      let gpcEnabled = 0
      let dntEnabled = 0

      allConsents.forEach((consent) => {
        // Count by category
        if (consent.necessary) byCategory.necessary++
        if (consent.functional) byCategory.functional++
        if (consent.analytics) byCategory.analytics++
        if (consent.marketing) byCategory.marketing++

        // Determine consent type
        if (consent.functional && consent.analytics && consent.marketing) {
          acceptAll++
        } else if (!consent.functional && !consent.analytics && !consent.marketing) {
          denyAll++
        } else {
          customized++
        }

        // Count by locale
        const locale = consent.locale || 'unknown'
        byLocale[locale] = (byLocale[locale] || 0) + 1

        // Count privacy signals (only in anonymous consents)
        if (consent.gpc_enabled) gpcEnabled++
        if (consent.dnt_enabled) dntEnabled++
      })

      setStats({
        total: allConsents.length,
        acceptAll,
        denyAll,
        customized,
        byCategory,
        byLocale,
        gpcEnabled,
        dntEnabled,
      })
    } catch (err) {
      console.error('[ConsentStatisticsTab] Error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  // Calculate percentages
  const getPercentage = (value: number) => {
    if (stats.total === 0) return 0
    return Math.round((value / stats.total) * 100)
  }

  if (isLoading) {
    return (
      <AdminCard>
        <div className="flex items-center justify-center p-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </AdminCard>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-foreground">{t('title')}</h3>
        <p className="text-sm text-muted-foreground">{t('description')}</p>
      </div>

      {/* Overview Cards */}
      <AdminStatGrid>
        <AdminStatCard
          label={t('cards.totalConsents')}
          value={stats.total.toLocaleString()}
          icon={<UsersIcon className="h-5 w-5" />}
        />
        <AdminStatCard
          label={t('cards.acceptAll')}
          value={`${getPercentage(stats.acceptAll)}%`}
          subtitle={`${stats.acceptAll} users`}
          icon={<CheckCircleIcon className="h-5 w-5 text-green-600" />}
          iconColor="green"
        />
        <AdminStatCard
          label={t('cards.denyAll')}
          value={`${getPercentage(stats.denyAll)}%`}
          subtitle={`${stats.denyAll} users`}
          icon={<XCircleIcon className="h-5 w-5 text-red-600" />}
          iconColor="red"
        />
        <AdminStatCard
          label={t('cards.customized')}
          value={`${getPercentage(stats.customized)}%`}
          subtitle={`${stats.customized} users`}
          icon={<AdjustmentsHorizontalIcon className="h-5 w-5 text-blue-600" />}
          iconColor="blue"
        />
      </AdminStatGrid>

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* By Category */}
        <AdminCard>
          <div className="p-6">
            <h4 className="text-sm font-semibold text-foreground mb-4">{t('byCategory')}</h4>
            <div className="space-y-4">
              {Object.entries(stats.byCategory).map(([category, count]) => (
                <div key={category}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="capitalize text-foreground">{category}</span>
                    <span className="text-muted-foreground">
                      {getPercentage(count)}% ({count})
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${
                        category === 'necessary' ? 'bg-green-500' :
                        category === 'functional' ? 'bg-blue-500' :
                        category === 'analytics' ? 'bg-purple-500' :
                        'bg-orange-500'
                      }`}
                      style={{ width: `${getPercentage(count)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </AdminCard>

        {/* By Locale */}
        <AdminCard>
          <div className="p-6">
            <h4 className="text-sm font-semibold text-foreground mb-4">{t('byLocale')}</h4>
            {Object.keys(stats.byLocale).length === 0 ? (
              <p className="text-sm text-muted-foreground">No data available</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(stats.byLocale)
                  .sort(([, a], [, b]) => b - a)
                  .map(([locale, count]) => (
                    <div key={locale} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground uppercase">
                        {locale}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {count} ({getPercentage(count)}%)
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </AdminCard>
      </div>

      {/* Privacy Signals */}
      <AdminCard>
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <ShieldExclamationIcon className="h-5 w-5 text-amber-600" />
            <h4 className="text-sm font-semibold text-foreground">{t('gpcDnt')}</h4>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.gpcEnabled}</p>
              <p className="text-sm text-muted-foreground">Global Privacy Control (GPC)</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.dntEnabled}</p>
              <p className="text-sm text-muted-foreground">Do Not Track (DNT)</p>
            </div>
          </div>
        </div>
      </AdminCard>
    </div>
  )
}
