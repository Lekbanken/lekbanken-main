'use client'

import { useAuth } from '@/lib/supabase/auth'
import { useTenant } from '@/lib/context/TenantContext'

export default function AuthDebugPanel() {
  const { user, userProfile, effectiveGlobalRole, memberships, isLoading } = useAuth()
  const { currentTenant, tenantRole, isLoadingTenants } = useTenant()

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-foreground">Auth Debug</h2>
      {(isLoading || isLoadingTenants) && (
        <p className="text-sm text-muted-foreground">Laddar auth/tenant-data...</p>
      )}
      {!isLoading && (
        <div className="mt-3 space-y-3 text-sm">
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
