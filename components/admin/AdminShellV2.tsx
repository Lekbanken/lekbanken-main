'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { AdminSidebarV2 } from './AdminSidebarV2'
import { AdminTopbarV2 } from './AdminTopbarV2'
import { AdminCommandPalette, useCommandPalette } from './AdminCommandPalette'
import { useAuth } from '@/lib/supabase/auth'
import { useTenant } from '@/lib/context/TenantContext'
import { resetAuth } from '@/lib/supabase/resetAuth'
import { useRbac } from '@/features/admin/shared/hooks/useRbac'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AdminShellV2Props {
  children: ReactNode
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AdminShellV2({ children }: AdminShellV2Props) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [loadingTimedOut, setLoadingTimedOut] = useState(false)
  const { open: commandPaletteOpen, setOpen: setCommandPaletteOpen } = useCommandPalette()
  const router = useRouter()
  const { user, effectiveGlobalRole, isLoading } = useAuth()
  const { hasTenants, isLoadingTenants } = useTenant()
  const { canAccessAdmin } = useRbac()
  const isRoleResolved = effectiveGlobalRole !== null

  // Loading timeout for better UX
  useEffect(() => {
    if (!isLoading) {
      const frame = requestAnimationFrame(() => setLoadingTimedOut(false))
      return () => cancelAnimationFrame(frame)
    }
    const timer = setTimeout(() => setLoadingTimedOut(true), 4000)
    return () => clearTimeout(timer)
  }, [isLoading])

  // Debug logging (development only)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.info('[AdminShellV2] state', {
        isLoadingAuth: isLoading,
        hasUser: !!user,
        effectiveGlobalRole,
        hasTenants,
        isLoadingTenants,
      })
    }
  }, [isLoading, user, effectiveGlobalRole, hasTenants, isLoadingTenants])

  const handleLogin = () => router.replace('/auth/login?redirect=/admin')
  const handleReset = async () => {
    await resetAuth()
    handleLogin()
  }

  const isGlobalAdmin = effectiveGlobalRole === 'system_admin'
  const stillLoading = isLoading || (!isGlobalAdmin && isLoadingTenants)

  // Loading state
  if (stillLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
          <p className="text-sm">Laddar adminpanelen...</p>
          {loadingTimedOut && (
            <div className="space-y-3 pt-2">
              <p className="text-xs text-muted-foreground">
                Det tar ovanligt lång tid. Testa att ladda om eller logga in igen.
              </p>
              <div className="flex justify-center gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-muted transition-colors"
                  onClick={handleLogin}
                >
                  Gå till login
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-muted transition-colors"
                  onClick={handleReset}
                >
                  Rensa session
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  const needsTenant = !isGlobalAdmin && !hasTenants && !isLoadingTenants
  const noAdminRole = isRoleResolved && !canAccessAdmin

  // No access state
  if (!user || noAdminRole || needsTenant) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="space-y-4 rounded-xl border border-border bg-card p-8 text-center max-w-sm">
          <div className="flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          <div>
            <p className="text-base font-semibold text-foreground">Ingen admin-åtkomst</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {user
                ? `Din roll (${effectiveGlobalRole || 'ingen'}) saknar åtkomst till adminpanelen.`
                : 'Du är inte inloggad.'}
            </p>
          </div>
          <div className="flex justify-center gap-2 pt-2">
            <button
              type="button"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
              onClick={handleLogin}
            >
              Logga in
            </button>
            <button
              type="button"
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
              onClick={handleReset}
            >
              Rensa session
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Command palette */}
      <AdminCommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />

      <div className="flex min-h-screen">
        {/* Desktop sidebar */}
        <AdminSidebarV2
          collapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        {/* Mobile sidebar */}
        <AdminSidebarV2
          variant="mobile"
          open={isMobileNavOpen}
          onClose={() => setIsMobileNavOpen(false)}
        />

        {/* Main content area */}
        <div className="flex min-h-screen flex-1 flex-col">
          <AdminTopbarV2 onToggleSidebar={() => setIsMobileNavOpen(true)} />
          
          <main className="flex-1 bg-muted/30">
            <div className="p-4 lg:p-6 xl:p-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
