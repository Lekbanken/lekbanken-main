'use client'

import { useTranslations } from 'next-intl'
import { useAuth } from '@/lib/supabase/auth'
import { useTenant } from '@/lib/context/TenantContext'
import { useIsDemo } from '@/hooks/useIsDemo'
import { useAppNotifications } from '@/hooks/useAppNotifications'

type AuthDebugPanelProps = {
  serverSnapshot?: {
    userId: string | null
    activeTenantId: string | null
    activeTenantName: string | null
    effectiveGlobalRole: string | null
    membershipCount: number
    tenantCookieTenantId: string | null
    hasDemoSessionCookie: boolean
    isDemoMode: boolean
    demoTier: string | null
    demoTimeRemainingMs: number | null
  }
}

export default function AuthDebugPanel({ serverSnapshot }: AuthDebugPanelProps) {
  const t = useTranslations('sandbox')
  const { user, userProfile, effectiveGlobalRole, memberships, isLoading, isAuthenticated } = useAuth()
  const { currentTenant, tenantRole, isLoadingTenants } = useTenant()
  const { isDemoMode, tier, timeRemaining, showTimeoutWarning, isLoading: isDemoLoading } = useIsDemo()
  const notificationState = useAppNotifications(20, {
    enabled: !isLoading && isAuthenticated,
    enableLiveUpdates: false,
  })

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-foreground">{t('authDebug.title')}</h2>
      {(isLoading || isLoadingTenants) && (
        <p className="text-sm text-muted-foreground">{t('authDebug.loading')}</p>
      )}
      {!isLoading && (
        <div className="mt-3 space-y-3 text-sm">
          <div>
            <p className="font-medium text-foreground">Server snapshot</p>
            <pre className="overflow-auto rounded bg-muted p-2 text-xs text-muted-foreground">
              {JSON.stringify(serverSnapshot ?? null, null, 2)}
            </pre>
          </div>

          <div>
            <p className="font-medium text-foreground">Client runtime</p>
            <pre className="overflow-auto rounded bg-muted p-2 text-xs text-muted-foreground">
              {JSON.stringify(
                {
                  isAuthenticated,
                  authLoading: isLoading,
                  tenantLoading: isLoadingTenants,
                  demoLoading: isDemoLoading,
                  isDemoMode,
                  demoTier: tier ?? null,
                  demoTimeRemainingMs: timeRemaining ?? null,
                  showTimeoutWarning,
                  notificationUnreadCount: notificationState.unreadCount,
                  notificationLoading: notificationState.isLoading,
                  notificationNoSession: notificationState.noSession,
                  notificationCount: notificationState.notifications.length,
                },
                null,
                2
              )}
            </pre>
          </div>

          <div>
            <p className="font-medium text-foreground">User</p>
            <pre className="overflow-auto rounded bg-muted p-2 text-xs text-muted-foreground">
              {JSON.stringify(
                {
                  id: user?.id,
                  email: user?.email,
                  app_meta: user?.app_metadata,
                },
                null,
                2
              )}
            </pre>
          </div>

          <div>
            <p className="font-medium text-foreground">Profile</p>
            <pre className="overflow-auto rounded bg-muted p-2 text-xs text-muted-foreground">
              {JSON.stringify(
                {
                  id: userProfile?.id,
                  email: userProfile?.email,
                  global_role: userProfile?.global_role,
                  role: userProfile?.role,
                },
                null,
                2
              )}
            </pre>
          </div>

          <div>
            <p className="font-medium text-foreground">Effective global role</p>
            <p className="text-muted-foreground">{effectiveGlobalRole ?? 'null'}</p>
          </div>

          <div>
            <p className="font-medium text-foreground">Current tenant</p>
            <pre className="overflow-auto rounded bg-muted p-2 text-xs text-muted-foreground">
              {JSON.stringify(
                currentTenant
                  ? { id: currentTenant.id, name: currentTenant.name, role: tenantRole }
                  : null,
                null,
                2
              )}
            </pre>
          </div>

          <div>
            <p className="font-medium text-foreground">Memberships</p>
            <pre className="overflow-auto rounded bg-muted p-2 text-xs text-muted-foreground">
              {JSON.stringify(
                memberships.map((m) => ({
                  tenant_id: m.tenant_id,
                  role: m.role,
                  is_primary: m.is_primary,
                  tenant_name: m.tenant?.name,
                })),
                null,
                2
              )}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
